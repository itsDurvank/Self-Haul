import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateInsightGapAnalysis } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { userId, questionIds } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch current session question extractions
    let query = supabase.from('question_analysis').select('analysis_json').eq('user_id', userId);
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in('question_id', questionIds);
    }
    const { data: analysisRows } = await query.order('created_at', { ascending: false }).limit(10);
    const sessionExtractions = (analysisRows || []).map((r: any) => r.analysis_json);

    // 2. Fetch existing long-term summary profile snapshot
    const { data: snapshotRow } = await supabase
      .from('user_summary_snapshots')
      .select('summary_text')
      .eq('user_id', userId)
      .single();

    const profileSummary = snapshotRow?.summary_text || '';

    // 3. Generate on-demand consultant gap analysis
    const insightText = await generateInsightGapAnalysis(sessionExtractions, profileSummary);

    // 4. Update user_ai_state tracking
    await supabase.from('user_ai_state').upsert([
      {
        user_id: userId,
        insight_ever_requested: true,
        last_insight_generated_at: new Date().toISOString(),
      },
    ]);

    // 5. Update user_summary_snapshots profile snapshot
    if (insightText && insightText.length > 20) {
      await supabase.from('user_summary_snapshots').upsert([
        {
          user_id: userId,
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
