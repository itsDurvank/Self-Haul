import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateInsightGapAnalysis, generateTextEmbedding } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { userId: bodyUserId, questionIds } = await req.json();

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const effectiveUserId = authUser?.id || bodyUserId;

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user authentication' }, { status: 401 });
    }

    if (authUser && bodyUserId && authUser.id !== bodyUserId) {
      return NextResponse.json({ error: 'Forbidden: Cannot request insights for another user' }, { status: 403 });
    }

    // 1. Read moving watermark boundary from user_ai_state
    const { data: aiState } = await supabase
      .from('user_ai_state')
      .select('last_insight_generated_at')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    const lastInsightAt = aiState?.last_insight_generated_at;

    // 2. Fetch extractions created since last insight (or explicitly passed questionIds)
    let query = supabase.from('question_analysis').select('question_id, analysis_json, created_at').eq('user_id', effectiveUserId);
    
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in('question_id', questionIds);
    } else if (lastInsightAt) {
      query = query.gt('created_at', lastInsightAt);
    }

    let { data: analysisRows } = await query.order('created_at', { ascending: false }).limit(15);
    
    // If no new entries since last insight, grab most recent entries as fallback context
    if (!analysisRows || analysisRows.length === 0) {
      const { data: fallbackRows } = await supabase
        .from('question_analysis')
        .select('question_id, analysis_json, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(10);
      analysisRows = fallbackRows || [];
    }

    // Fetch user answers & computed deltas corresponding to these question_ids
    const questionIdList = (analysisRows || []).map((r: any) => r.question_id).filter(Boolean);
    const answersMap: Record<string, { raw_text?: string; answer_analysis?: any; deltas?: any }> = {};
    if (questionIdList.length > 0) {
      const { data: userAnswers } = await supabase
        .from('answers')
        .select('question_id, raw_text, answer_analysis, deltas')
        .in('question_id', questionIdList);

      if (userAnswers) {
        userAnswers.forEach((ans: any) => {
          answersMap[ans.question_id] = ans;
        });
      }
    }

    // Combine extracted JSON with actual user response answer, answer analysis, and deltas
    const sessionExtractions = (analysisRows || []).map((r: any) => {
      const baseJson = r.analysis_json || {};
      const ansObj = answersMap[r.question_id];
      return {
        ...baseJson,
        user_response_answer: ansObj?.raw_text || '[No written response recorded / skipped]',
        answer_analysis: ansObj?.answer_analysis || null,
        deltas: ansObj?.deltas || null,
      };
    });

    // 3. Fetch life-area snapshots from user_area_snapshots table
    const lifeDomains = Array.from(
      new Set(sessionExtractions.map((e: any) => e.life_domain || e.situation?.life_domain).filter(Boolean))
    );

    let areaSnapshots: Record<string, string> = {};
    if (lifeDomains.length > 0) {
      try {
        const { data: snapshotRows } = await supabase
          .from('user_area_snapshots')
          .select('life_domain, snapshot_text')
          .eq('user_id', effectiveUserId)
          .in('life_domain', lifeDomains);

        if (snapshotRows) {
          snapshotRows.forEach((row: any) => {
            areaSnapshots[row.life_domain] = row.snapshot_text;
          });
        }
      } catch (err) {
        console.warn('Notice on user_area_snapshots query:', err);
      }
    }

    // Also fetch general summary snapshot as fallback memory context
    const { data: snapshotRow } = await supabase
      .from('user_summary_snapshots')
      .select('summary_text')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    const profileSummary = snapshotRow?.summary_text || '';

    // 4. Vector RAG Retrieval: Search past entries relevant to current session concerns
    let vectorMatches: any[] = [];
    try {
      const topConcern = sessionExtractions[0]?.stated_concern || sessionExtractions[0]?.concern?.stated_concern || sessionExtractions[0]?.input?.raw_text;
      if (topConcern) {
        const queryEmbedding = await generateTextEmbedding(topConcern);
        const { data: rpcMatches, error: rpcErr } = await supabase.rpc('match_question_analysis', {
          query_embedding: queryEmbedding,
          match_threshold: 0.3,
          match_count: 5,
        });
        if (rpcErr) {
          console.warn('[RAG INSIGHT RETRIEVAL] RPC error:', rpcErr.message);
        } else if (Array.isArray(rpcMatches)) {
          vectorMatches = rpcMatches.map((m: any) => m.analysis_json).filter(Boolean);
          console.log(`\n🧠 [RAG INSIGHT RETRIEVAL] Query concern: "${topConcern}"`);
          console.log(`   Fetched ${vectorMatches.length} semantically relevant past matches:`);
          rpcMatches.forEach((m: any, idx: number) => {
            const raw = m.analysis_json?.input?.raw_text || m.analysis_json?.stated_concern || m.analysis_json?.concern?.stated_concern;
            const sim = (m.similarity * 100).toFixed(1);
            console.log(`   Match #${idx + 1} [${sim}% match]: "${raw}"`);
          });
          console.log('\n');
        }
      }
    } catch (e) {
      console.warn('Vector RAG search for insight warning:', e);
    }

    // 5. Generate on-demand consultant gap analysis combining session (Q, A, Deltas), area snapshots, & RAG vector matches
    const insightText = await generateInsightGapAnalysis(sessionExtractions, profileSummary, vectorMatches, areaSnapshots);

    // 5. Update user_ai_state moving watermark boundary
    await supabase.from('user_ai_state').upsert([
      {
        user_id: effectiveUserId,
        insight_ever_requested: true,
        last_insight_generated_at: new Date().toISOString(),
      },
    ]);

    // 6. Update user_summary_snapshots profile snapshot
    if (insightText && insightText.length > 20) {
      await supabase.from('user_summary_snapshots').upsert([
        {
          user_id: effectiveUserId,
          summary_text: insightText,
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    return NextResponse.json({ success: true, insightText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Insight generation error';
    console.error('API /api/insight error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

