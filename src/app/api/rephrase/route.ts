import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateTextEmbedding, rephraseDoubtToThirdPerson } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { questionId, rawText, userId: bodyUserId } = await req.json();

    if (!rawText) {
      return NextResponse.json({ error: 'Missing required parameter: rawText' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: sign in required' }, { status: 401 });
    }

    if (bodyUserId && bodyUserId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden: cannot rephrase for another user' }, { status: 403 });
    }

    const userId = authUser.id;

    // 0a. Check if this questionId already has a rephrased_text saved in Supabase
    if (questionId) {
      const { data: existingQ } = await supabase
        .from('questions')
        .select('rephrased_text')
        .eq('id', questionId)
        .single();

      if (existingQ?.rephrased_text) {
        return NextResponse.json({ success: true, rephrasedText: existingQ.rephrased_text, cached: true });
      }
    }

    // 0b. Check if this exact raw_text was previously rephrased for this user in Supabase
    const { data: pastMatch } = await supabase
      .from('questions')
      .select('rephrased_text')
      .eq('user_id', userId)
      .eq('raw_text', rawText)
      .not('rephrased_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pastMatch?.rephrased_text) {
      if (questionId) {
        await supabase
          .from('questions')
          .update({ rephrased_text: pastMatch.rephrased_text })
          .eq('id', questionId);
      }
      return NextResponse.json({ success: true, rephrasedText: pastMatch.rephrased_text, cached: true });
    }

    // 1. Generate query embedding for RAG search
    const queryEmbedding = await generateTextEmbedding(rawText);

    // 2. Perform vector RAG search via match_question_analysis RPC
    // No p_user_id needed anymore — the function uses auth.uid() internally
    let similarPastTexts: string[] = [];
    try {
      const { data: matches, error: matchErr } = await supabase.rpc('match_question_analysis', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3,
      });

      if (!matchErr && Array.isArray(matches)) {
        similarPastTexts = matches
          .map((m: any) => m.analysis_json?.concern?.stated_concern || m.analysis_json?.input?.raw_text)
          .filter(Boolean);
      }
    } catch (e) {
      console.warn('Vector match RPC warning:', e);
    }

    // 3. Fetch profile context summary
    const { data: snapshotRow } = await supabase
      .from('user_summary_snapshots')
      .select('summary_text')
      .eq('user_id', userId)
      .maybeSingle();

    const profileSummary = snapshotRow?.summary_text || '';

    // 4. Rephrase doubt into third-person using exact specification prompt
    const rephrasedText = await rephraseDoubtToThirdPerson(rawText, profileSummary, similarPastTexts);

    // 5. Update questions table in Supabase if questionId provided
    if (questionId) {
      await supabase
        .from('questions')
        .update({ rephrased_text: rephrasedText })
        .eq('id', questionId);
    }

    return NextResponse.json({ success: true, rephrasedText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rephrasing route error';
    console.error('API /api/rephrase error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
