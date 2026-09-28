import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceKey || !geminiApiKey) {
  console.error('Missing env vars! Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function generateEmbedding(text) {
  const res = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
    config: { outputDimensionality: 768 }
  });
  let vals = res.embedding?.values || res.embeddings?.[0]?.values;
  if (!vals) {
    // fallback if model name differs
    const res2 = await ai.models.embedContent({
      model: 'models/text-embedding-004',
      contents: text,
      config: { outputDimensionality: 768 }
    });
    vals = res2.embedding?.values || res2.embeddings?.[0]?.values;
  }
  // normalize L2
  let sumSq = 0;
  for (let i = 0; i < vals.length; i++) sumSq += vals[i] * vals[i];
  const norm = Math.sqrt(sumSq) || 1;
  return vals.map(v => v / norm);
}

async function runTest() {
  console.log('--- TESTING RAG IN AI INSIGHTS ---');

  // 1. Get or create a test user session
  // Let's query existing question_analysis rows to see current data in DB
  const { data: existingRows, error: fetchErr } = await supabase
    .from('question_analysis')
    .select('id, user_id, question_id, analysis_json, created_at')
    .limit(10);

  if (fetchErr) {
    console.error('Error fetching question_analysis:', fetchErr);
    return;
  }

  console.log(`Found ${existingRows?.length || 0} existing analysis entries in DB.`);

  if (existingRows && existingRows.length > 0) {
    const sampleUserId = existingRows[0].user_id;
    console.log(`Using sample user ID from DB: ${sampleUserId}`);

    // Pick a query concern to search against past vector entries
    const testConcern = "I keep procrastinating on my career goals and overthinking my future.";
    console.log(`\nGenerating query embedding for test concern: "${testConcern}"...`);
    
    const queryEmb = await generateEmbedding(testConcern);
    console.log(`Embedding generated successfully! Vector length: ${queryEmb.length}`);

    // Call match_question_analysis RPC
    console.log('\nInvoking RPC function match_question_analysis...');
    // Note: match_question_analysis checks auth.uid(), so using service role bypass or RPC
    const { data: rpcMatches, error: rpcErr } = await supabase.rpc('match_question_analysis', {
      query_embedding: queryEmb,
      match_threshold: 0.1, // low threshold to inspect cosine similarities
      match_count: 5
    });

    if (rpcErr) {
      console.log('RPC Call notice (auth.uid check may require authenticated user context):', rpcErr.message);
    } else {
      console.log(`RPC returned ${rpcMatches?.length || 0} vector matches:`);
      rpcMatches?.forEach((m, idx) => {
        console.log(`  Match #${idx + 1} (Similarity: ${(m.similarity * 100).toFixed(1)}%):`);
        console.log(`    Concern: "${m.analysis_json?.concern?.stated_concern || m.analysis_json?.input?.raw_text}"`);
      });
    }
  }

  console.log('\n--- RAG PIPELINE EXPLANATION ---');
  console.log('1. User inputs doubts in Portal -> `/api/extract` creates 768-dim embeddings in `question_analysis`.');
  console.log('2. User clicks "AI INSIGHT" button -> `/api/insight` fires.');
  console.log('3. `/api/insight` embeds the current active concern via `gemini-embedding-001`.');
  console.log('4. Calls `match_question_analysis` RPC to find top 5 semantically similar past doubts.');
  console.log('5. Passes these vector matches into `generateInsightGapAnalysis` so Gemini detects recurring patterns/evasive loops.');
  console.log('--- TEST COMPLETE ---');
}

runTest();
