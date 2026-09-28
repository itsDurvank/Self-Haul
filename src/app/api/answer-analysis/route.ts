import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { extractAnswerAnalysis, generateTextEmbedding } from '@/lib/gemini/client';
import { computeDeltas } from '@/lib/analysis/math';

export async function POST(req: NextRequest) {
  try {
    const { questionId, answerText, userId: bodyUserId } = await req.json();

    if (!questionId || !answerText) {
      return NextResponse.json({ error: 'Missing required parameters: questionId, answerText' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const effectiveUserId = authUser?.id || bodyUserId;
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user authentication' }, { status: 401 });
    }

    if (authUser && bodyUserId && authUser.id !== bodyUserId) {
      return NextResponse.json({ error: 'Forbidden: Cannot record answer for another user' }, { status: 403 });
    }

    // 1. Fetch Question row & rephrased_text
    const { data: qRow } = await supabase
      .from('questions')
      .select('id, raw_text, rephrased_text')
      .eq('id', questionId)
      .maybeSingle();

    // 2. Fetch question_analysis row
    const { data: qaRow } = await supabase
      .from('question_analysis')
      .select('id, analysis_json')
      .eq('question_id', questionId)
      .maybeSingle();

    const questionExtraction = qaRow?.analysis_json || {};
    const rephrasedText = qRow?.rephrased_text || qRow?.raw_text || '';

    // 3. Run Gemini Answer Analysis extraction
    const answerAnalysis = await extractAnswerAnalysis(questionExtraction, rephrasedText, answerText);

    // 4. Compute Question vs Answer Deltas in application code
    const deltas = computeDeltas(questionExtraction, answerAnalysis);

    // 5. Insert / Upsert Answer row in answers table
    const { data: answerRow, error: ansErr } = await supabase
      .from('answers')
      .upsert(
        [
          {
            question_id: questionId,
            user_id: effectiveUserId,
            raw_text: answerText,
            answer_analysis: answerAnalysis,
            deltas: deltas,
          },
        ],
        { onConflict: 'question_id' }
      )
      .select('id')
      .maybeSingle();

    if (ansErr) {
      console.warn('Upsert answer analysis warning:', ansErr.message);
    }

    // 6. Update vector embedding for question_analysis combining concern + answer_summary
    const statedConcern = questionExtraction.stated_concern || qRow?.raw_text || '';
    const coreConcern = questionExtraction.core_concern || '';
    const combinedText = `${statedConcern} ${coreConcern} Answer advice: ${answerAnalysis.answer_summary}`.trim();

    try {
      const updatedEmbedding = await generateTextEmbedding(combinedText);
      await supabase
        .from('question_analysis')
        .update({ embedding: updatedEmbedding })
        .eq('question_id', questionId);
      console.log(`✅ [RAG VECTOR UPDATE] Updated vector for question ${questionId} with answer summary: "${answerAnalysis.answer_summary}"`);
    } catch (e) {
      console.warn('Failed to update vector embedding with answer summary:', e);
    }

    // 7. Update per-life-area snapshot in user_area_snapshots table
    const lifeDomain = questionExtraction.life_domain || 'other';
    try {
      const { data: domainRows } = await supabase
        .from('question_analysis')
        .select('id, question_id, analysis_json')
        .eq('user_id', effectiveUserId);

      const domainFiltered = (domainRows || []).filter((r: any) => {
        const dom = r.analysis_json?.life_domain || r.analysis_json?.situation?.life_domain;
        return dom === lifeDomain || (!dom && lifeDomain === 'other');
      });

      const entryCount = domainFiltered.length || 1;
      const snapshotText = `${lifeDomain} (${entryCount} entries): Stated concern "${statedConcern}". Advised: "${answerAnalysis.answer_summary}". Deltas: agency ${deltas.agency_delta ?? 'N/A'}, ownership ${deltas.ownership_delta ?? 'N/A'}, action ${deltas.action_delta ?? 'N/A'}.`;

      await supabase
        .from('user_area_snapshots')
        .upsert(
          [
            {
              user_id: effectiveUserId,
              life_domain: lifeDomain,
              snapshot_text: snapshotText,
              entry_count: entryCount,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'user_id, life_domain' }
        );
      console.log(`✅ [AREA SNAPSHOT UPDATED] ${lifeDomain}: "${snapshotText}"`);
    } catch (e) {
      console.warn('Failed to update user_area_snapshots:', e);
    }

    return NextResponse.json({
      success: true,
      answerAnalysis,
      deltas,
    });
  } catch (err: any) {
    console.error('Error in /api/answer-analysis:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
