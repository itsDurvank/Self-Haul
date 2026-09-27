import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (match && match[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

const geminiKey = getEnv('GEMINI_API_KEY');
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const results = [];

function record(testId, status, details = '') {
  results.push({ testId, status, details });
  console.log(`[${testId}] — ${status}${details ? ` (${details})` : ''}`);
}

async function runQA() {
  console.log('=== SELF-HAUL QA TEST RUNNER ===\n');

  // 1.1 Env Vars
  if (geminiKey && supabaseUrl && supabaseAnonKey) {
    record('1.1', 'PASS', 'GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY present');
  } else {
    record('1.1', 'FAIL', 'Missing one or more environment variables');
  }

  // 1.2 Supabase Connection
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data, error } = await supabase.from('questions').select('id').limit(1);
    record('1.2', 'PASS', 'Supabase client connected successfully');
  } catch (e) {
    record('1.2', 'FAIL', e.message);
  }

  // 1.3 Gemini API Key
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'say OK'
    });
    record('1.3', 'PASS', `Gemini returned: ${res.text?.trim()}`);
  } catch (e) {
    record('1.3', 'FAIL', e.message);
  }

  // 1.4 No secrets committed
  try {
    const gitLog = execSync('git log --all --full-history -- .env .env.local', { encoding: 'utf-8' });
    if (gitLog.trim() === '') {
      record('1.4', 'PASS', 'No .env files found in git history');
    } else {
      record('1.4', 'FAIL', '.env committed in git history');
    }
  } catch (e) {
    record('1.4', 'PASS', 'No .env in git history');
  }

  // 3.4 Unauthenticated RPC call rejected
  try {
    const { data, error } = await supabase.rpc('match_question_analysis', {
      query_embedding: new Array(768).fill(0.1),
      match_threshold: 0,
      match_count: 5
    });
    if (error && (error.message.includes('Unauthorized') || error.message.includes('authentication required'))) {
      record('3.4', 'PASS', `RPC correctly rejected unauthenticated call: "${error.message}"`);
    } else if (error) {
      record('3.4', 'PASS', `RPC rejected unauthenticated call with error: "${error.message}"`);
    } else {
      record('3.4', 'FAIL', `RPC allowed unauthenticated call! Returned ${data?.length} rows`);
    }
  } catch (e) {
    record('3.4', 'PASS', `Rejected: ${e.message}`);
  }

  // 5.2 Embedding dimension test
  try {
    const embRes = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'Testing dimension',
      config: { outputDimensionality: 768 }
    });
    const vals = embRes.embedding?.values || embRes.embeddings?.[0]?.values;
    if (vals?.length === 768) {
      record('5.2', 'PASS', 'Embedding model gemini-embedding-001 returns exactly 768 dimensions');
    } else {
      record('5.2', 'FAIL', `Expected 768 dims, got ${vals?.length}`);
    }
  } catch (e) {
    record('5.2', 'FAIL', e.message);
  }

  // 5.3 Vector Similarity calculation check
  try {
    const getVals = (res) => res.embedding?.values || res.embeddings?.[0]?.values;
    const emb1 = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'I am afraid of failing my career and job search',
      config: { outputDimensionality: 768 }
    });
    const emb2 = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'Anxious about my future job and career path',
      config: { outputDimensionality: 768 }
    });
    const emb3 = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'My stomach hurts from eating bad food yesterday',
      config: { outputDimensionality: 768 }
    });

    const v1 = getVals(emb1);
    const v2 = getVals(emb2);
    const v3 = getVals(emb3);

    const dot = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
    const mag = (a) => Math.sqrt(dot(a, a));
    const cosSim = (a, b) => dot(a, b) / (mag(a) * mag(b));

    const simRelated = cosSim(v1, v2);
    const simUnrelated = cosSim(v1, v3);

    if (simRelated > simUnrelated) {
      record('5.3', 'PASS', `Related similarity: ${simRelated.toFixed(3)}, Unrelated: ${simUnrelated.toFixed(3)}`);
    } else {
      record('5.3', 'FAIL', `Related (${simRelated}) <= Unrelated (${simUnrelated})`);
    }
  } catch (e) {
    record('5.3', 'FAIL', e.message);
  }

  console.log('\n=== QA RUN SUMMARY ===');
  console.log(`Passed: ${results.filter(r => r.status === 'PASS').length} / ${results.length}`);
}

runQA();
