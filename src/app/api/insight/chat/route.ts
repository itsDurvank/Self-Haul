import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateSocraticChatReply, generateTextEmbedding } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { messages, questionIds, initialInsight, userId: bodyUserId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const effectiveUserId = authUser?.id || bodyUserId;

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user authentication' }, { status: 401 });
    }

    // 1. Fetch recent extractions & answers
    let query = supabase
      .from('question_analysis')
      .select('question_id, analysis_json, created_at')
      .eq('user_id', effectiveUserId);

    if (Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in('question_id', questionIds);
    }

    let { data: analysisRows } = await query.order('created_at', { ascending: false }).limit(10);
    if (!analysisRows || analysisRows.length === 0) {
      const { data: fallbackRows } = await supabase
        .from('question_analysis')
        .select('question_id, analysis_json, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(8);
      analysisRows = fallbackRows || [];
    }

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

    const sessionExtractions = (analysisRows || []).map((r: any) => {
      const baseJson = r.analysis_json || {};
      const ansObj = answersMap[r.question_id];
      return {
        ...baseJson,
        user_response_answer: ansObj?.raw_text || '[No written response]',
        answer_analysis: ansObj?.answer_analysis || null,
        deltas: ansObj?.deltas || null,
      };
    });

    // 2. Fetch area snapshots & profile summary
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
      } catch (e) {}
    }

    const { data: summaryRow } = await supabase
      .from('user_summary_snapshots')
      .select('summary_text')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    const profileSummary = summaryRow?.summary_text || '';

    // 3. Vector RAG Retrieval based on latest user message
    const latestUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    let vectorMatches: any[] = [];
    if (latestUserMsg) {
      try {
        const queryEmbedding = await generateTextEmbedding(latestUserMsg);
        const { data: rpcMatches } = await supabase.rpc('match_question_analysis', {
          query_embedding: queryEmbedding,
          match_threshold: 0.28,
          match_count: 5,
        });

        if (Array.isArray(rpcMatches)) {
          const matchQuestionIds = rpcMatches.map((m: any) => m.question_id).filter(Boolean);
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

          vectorMatches = rpcMatches.map((m: any) => {
            const baseJson = m.analysis_json || {};
            const paObj = pastAnswersMap[m.question_id];
            return {
              ...baseJson,
              historical_user_answer: paObj?.raw_text,
              historical_answer_summary: paObj?.answer_summary,
              similarity_score: m.similarity,
            };
          });
        }
      } catch (err) {
        console.warn('Vector match warning in chat:', err);
      }
    }

    // 4. Generate Socratic Dialogue reply
    const reply = await generateSocraticChatReply(
      messages,
      sessionExtractions,
      profileSummary,
      vectorMatches,
      areaSnapshots,
      initialInsight
    );

    return NextResponse.json({ success: true, reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Insight chat error';
    console.error('API /api/insight/chat error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
