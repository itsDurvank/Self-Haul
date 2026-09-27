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
    let query = supabase.from('question_analysis').select('analysis_json, created_at').eq('user_id', effectiveUserId);
    
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in('question_id', questionIds);
    } else if (lastInsightAt) {
      query = query.gt('created_at', lastInsightAt);
    }

    const { data: analysisRows } = await query.order('created_at', { ascending: false }).limit(15);
    
    // If no new entries since last insight, grab most recent entries as fallback context
    let sessionExtractions = (analysisRows || []).map((r: any) => r.analysis_json);
    if (sessionExtractions.length === 0) {
      const { data: fallbackRows } = await supabase
        .from('question_analysis')
        .select('analysis_json')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(10);
      sessionExtractions = (fallbackRows || []).map((r: any) => r.analysis_json);
    }

    // 3. Fetch existing long-term summary profile snapshot
    const { data: snapshotRow } = await supabase
      .from('user_summary_snapshots')
      .select('summary_text')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    const profileSummary = snapshotRow?.summary_text || '';

    // 4. Vector RAG Retrieval: Search past entries relevant to current session concerns
    let vectorMatches: any[] = [];
    try {
      const topConcern = sessionExtractions[0]?.concern?.stated_concern || sessionExtractions[0]?.input?.raw_text;
      if (topConcern) {
        const queryEmbedding = await generateTextEmbedding(topConcern);
        const { data: rpcMatches } = await supabase.rpc('match_question_analysis', {
          query_embedding: queryEmbedding,
          match_threshold: 0.4,
          match_count: 5,
        });
        if (Array.isArray(rpcMatches)) {
          vectorMatches = rpcMatches.map((m: any) => m.analysis_json).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn('Vector RAG search for insight warning:', e);
    }

    // 5. Generate on-demand consultant gap analysis combining session, RAG vector matches, & memory
    const insightText = await generateInsightGapAnalysis(sessionExtractions, profileSummary, vectorMatches);

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

