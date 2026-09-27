import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { extractQuestionAnalysis, generateTextEmbedding } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { questionId, rawText, userId } = await req.json();

    if (!rawText || !userId) {
      return NextResponse.json({ error: 'Missing required parameters: rawText and userId' }, { status: 400 });
    }

    // 1. Run Gemini Structured JSON extraction
    const analysisJson = await extractQuestionAnalysis(rawText, questionId);

    // 2. Generate 768-dim vector embedding
    const embedding = await generateTextEmbedding(rawText);

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const effectiveUserId = authUser?.id || userId;

    if (!rawText || !effectiveUserId) {
      return NextResponse.json({ error: 'Missing required parameters: rawText and userId' }, { status: 400 });
    }

    // Verify if questionId exists in questions table to prevent FK constraint error
    let targetQuestionId: string | null = null;
    if (questionId) {
      const { data: qMatch } = await supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .maybeSingle();

      if (qMatch?.id) {
        targetQuestionId = qMatch.id;
      } else if (effectiveUserId && effectiveUserId !== 'guest') {
        // Create question row if missing
        const { data: newQ } = await supabase
          .from('questions')
          .insert([{ id: questionId, user_id: effectiveUserId, raw_text: rawText }])
          .select('id')
          .maybeSingle();
        targetQuestionId = newQ?.id || null;
      }
    }

    const { data, error } = await supabase.from('question_analysis').insert([
      {
        question_id: targetQuestionId,
        user_id: effectiveUserId,
        analysis_json: analysisJson,
        embedding: embedding,
      },
    ]).select('id').single();

    if (error) {
      console.warn('Failed to insert question_analysis:', error.message);
      return NextResponse.json({ error: error.message, analysisJson }, { status: 500 });
    }

    return NextResponse.json({ success: true, analysisId: data?.id, analysisJson });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction route error';
    console.error('API /api/extract error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
