import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateInsightGapAnalysis, generateTextEmbedding, isGibberishOrShortNoise } from '@/lib/gemini/client';

function hasMeaningfulText(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 3) return false;
  if (t.toLowerCase() === 'incoherent text input' || t.toLowerCase() === 'none') return false;
  return !isGibberishOrShortNoise(t);
}

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

    // 2. Fetch extractions for the CURRENT ritual
    let analysisRows: any[] = [];
    const hasSpecificQuestions = Array.isArray(questionIds) && questionIds.length > 0;

    if (hasSpecificQuestions) {
      // Fetch only the questions from THIS current ritual
      const { data: qaData } = await supabase
        .from('question_analysis')
        .select('question_id, analysis_json, created_at')
        .eq('user_id', effectiveUserId)
        .in('question_id', questionIds)
        .order('created_at', { ascending: false });
      analysisRows = qaData || [];

      // Check if questions in this ritual have any meaningful text
      const { data: qRows } = await supabase
        .from('questions')
        .select('id, raw_text')
        .in('id', questionIds);

      const hasAnyValidQuestion = (qRows || []).some((q: any) => hasMeaningfulText(q.raw_text));
      if (!hasAnyValidQuestion && qRows && qRows.length > 0) {
        return NextResponse.json({
          success: true,
          insightText: "This ritual did not contain an authentic question or reflection to analyze. An insight can only be formed when you explore a real situation and your self-advice. When you're ready, bring a genuine doubt to the ritual."
        });
      }
    } else if (lastInsightAt) {
      // General view: fetch only entries generated since the last insight (no random historical dumps)
      const { data: recentRows } = await supabase
        .from('question_analysis')
        .select('question_id, analysis_json, created_at')
        .eq('user_id', effectiveUserId)
        .gt('created_at', lastInsightAt)
        .order('created_at', { ascending: false })
        .limit(10);
      analysisRows = recentRows || [];
    }

    if (!analysisRows || analysisRows.length === 0) {
      return NextResponse.json({
        success: true,
        insightText: "No recent self-inquiry entries were found for this ritual. Complete a session with a genuine doubt to generate an insight."
      });
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
      if (topConcern && hasMeaningfulText(topConcern)) {
        const queryEmbedding = await generateTextEmbedding(topConcern);
        const { data: rpcMatches, error: rpcErr } = await supabase.rpc('match_question_analysis', {
          query_embedding: queryEmbedding,
          match_threshold: 0.52, // Strict semantic relevance threshold
          match_count: 5,
        });
        if (rpcErr) {
          console.warn('[RAG INSIGHT RETRIEVAL] RPC error:', rpcErr.message);
        } else if (Array.isArray(rpcMatches)) {
          // Exclude questions belonging to the current session from past matches
          const pastRpcMatches = rpcMatches.filter((m: any) => !questionIdList.includes(m.question_id));
          const matchQuestionIds = pastRpcMatches.map((m: any) => m.question_id).filter(Boolean);
          const pastAnswersMap: Record<string, { raw_text?: string; answer_summary?: string }> = {};

          if (matchQuestionIds.length > 0) {
            const { data: pastAnsData } = await supabase
              .from('answers')
              .select('question_id, raw_text, answer_analysis')
              .in('question_id', matchQuestionIds);

            if (pastAnsData) {
              pastAnsData.forEach((pa: any) => {
                pastAnswersMap[pa.question_id] = {
                  raw_text: pa.raw_text,
                  answer_summary: pa.answer_analysis?.answer_summary,
                };
              });
            }
          }

          vectorMatches = pastRpcMatches.map((m: any) => {
            const baseJson = m.analysis_json || {};
            const paObj = pastAnswersMap[m.question_id];
            return {
              ...baseJson,
              past_answer_advice: paObj?.raw_text || paObj?.answer_summary || '[No past advice recorded]',
            };
          });

          console.log(`\n🧠 [RAG INSIGHT RETRIEVAL] Query concern: "${topConcern}"`);
          console.log(`   Fetched ${vectorMatches.length} semantically relevant past matches with advice:`);
          pastRpcMatches.forEach((m: any, idx: number) => {
            const raw = m.analysis_json?.input?.raw_text || m.analysis_json?.stated_concern || m.analysis_json?.concern?.stated_concern;
            const sim = (m.similarity * 100).toFixed(1);
            const paObj = pastAnswersMap[m.question_id];
            console.log(`   Match #${idx + 1} [${sim}% match]: "${raw}" | Past Advice: "${paObj?.answer_summary || paObj?.raw_text || 'None'}"`);
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

    // 6. Update user_summary_snapshots profile snapshot only for real diagnostic insights
    const isRealInsight = insightText && insightText.length > 20 && !insightText.startsWith('This ritual did not contain') && !insightText.startsWith('No recent self-inquiry');
    if (isRealInsight) {
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

