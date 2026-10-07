import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { rawText, questionId, userId: inputUserId, sessionId } = await req.json();
    if (!rawText) {
      return NextResponse.json({ error: 'Missing rawText parameter' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = user?.id || inputUserId;

    if (!effectiveUserId || effectiveUserId === 'guest') {
      return NextResponse.json({ success: true, questionId: questionId || crypto.randomUUID(), guest: true });
    }

    if (sessionId) {
      await supabase
        .from('sessions')
        .upsert([{ id: sessionId, user_id: effectiveUserId }], { onConflict: 'id' });
    }

    const { data, error } = await supabase
      .from('questions')
      .insert([
        {
          id: questionId || undefined,
          user_id: effectiveUserId,
          session_id: sessionId || undefined,
          raw_text: rawText,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to insert question via API route:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, questionId: data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Questions API route error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
