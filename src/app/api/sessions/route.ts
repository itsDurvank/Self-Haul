import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface SessionEntry {
  id: string;
  question: string;
  rephrasedText: string | null;
  answer: string | null;
  skipped: boolean;
  createdAt: string;
}

interface SessionGroup {
  sessionId: string;
  dateLabel: string;
  dateIso: string;
  timestamp: number;
  entryCount: number;
  entries: SessionEntry[];
}

function formatDateLabel(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * GET /api/sessions
 * Retrieves all previous ritual sessions for the authenticated user,
 * isolated by user_id via Supabase RLS and server authentication.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User authentication required' }, { status: 401 });
    }

    const effectiveUserId = user.id;

    // 1. Fetch all questions for this user
    const { data: questionsData, error: qErr } = await supabase
      .from('questions')
      .select('id, raw_text, rephrased_text, session_id, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (qErr) {
      console.warn('Failed to query questions for sessions:', qErr.message);
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    if (!questionsData || questionsData.length === 0) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    // 2. Fetch all answers for these questions
    const questionIds = questionsData.map((q) => q.id);
    const { data: answersData } = await supabase
      .from('answers')
      .select('question_id, raw_text, created_at')
      .in('question_id', questionIds);

    const answersMap: Record<string, { text: string; createdAt: string }> = {};
    if (answersData) {
      answersData.forEach((a) => {
        answersMap[a.question_id] = {
          text: a.raw_text,
          createdAt: a.created_at,
        };
      });
    }

    // 3. Group questions into sessions
    // If questions have an explicit session_id, group by that.
    // If session_id is null, cluster questions created within 45 minutes of each other.
    const sessionMap = new Map<string, SessionGroup>();
    let fallbackClusterIdx = 0;
    let lastClusterTime = 0;
    let currentClusterId = '';

    // Sort ascending for natural grouping if clustering, but we want sessions listed descending
    const sortedQuestions = [...questionsData].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const q of sortedQuestions) {
      const qTime = new Date(q.created_at).getTime();
      let sId = q.session_id;

      if (!sId) {
        // Cluster questions created within 45 minutes of each other
        if (!currentClusterId || Math.abs(lastClusterTime - qTime) > 45 * 60 * 1000) {
          fallbackClusterIdx += 1;
          currentClusterId = `cluster-${fallbackClusterIdx}-${q.created_at.slice(0, 10)}`;
        }
        sId = currentClusterId;
        lastClusterTime = qTime;
      }

      const ansObj = answersMap[q.id];
      const entry: SessionEntry = {
        id: q.id,
        question: q.raw_text,
        rephrasedText: q.rephrased_text || null,
        answer: ansObj ? ansObj.text : null,
        skipped: !ansObj || ansObj.text === '[Skipped]',
        createdAt: q.created_at,
      };

      if (!sessionMap.has(sId)) {
        const dateObj = new Date(q.created_at);
        sessionMap.set(sId, {
          sessionId: sId,
          dateLabel: formatDateLabel(dateObj),
          dateIso: q.created_at,
          timestamp: dateObj.getTime(),
          entryCount: 0,
          entries: [],
        });
      }

      const grp = sessionMap.get(sId)!;
      grp.entries.push(entry);
      grp.entryCount = grp.entries.length;
    }

    const sessions = Array.from(sessionMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ success: true, sessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving sessions';
    console.error('API /api/sessions GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sessions
 * Syncs / archives a completed ritual session and all its questions + answers to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, questions } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User authentication required' }, { status: 401 });
    }

    const effectiveUserId = user.id;
    const finalSessionId = sessionId || crypto.randomUUID();

    // 1. Ensure the session record exists in public.sessions
    await supabase
      .from('sessions')
      .upsert([{ id: finalSessionId, user_id: effectiveUserId }], { onConflict: 'id' });

    // 2. Upsert each question and its rephrased text
    for (const q of questions) {
      if (!q.id || !q.text) continue;

      await supabase
        .from('questions')
        .upsert(
          [
            {
              id: q.id,
              user_id: effectiveUserId,
              session_id: finalSessionId,
              raw_text: q.text,
              rephrased_text: q.rephrasedText || null,
            },
          ],
          { onConflict: 'id' }
        );

      // 3. If an answer exists, ensure it is recorded in public.answers
      if (q.answer) {
        await supabase
          .from('answers')
          .upsert(
            [
              {
                question_id: q.id,
                user_id: effectiveUserId,
                raw_text: q.answer,
              },
            ],
            { onConflict: 'question_id' }
          );
      }
    }

    return NextResponse.json({ success: true, sessionId: finalSessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error syncing session';
    console.error('API /api/sessions POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
