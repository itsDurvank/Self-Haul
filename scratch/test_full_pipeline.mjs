import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceKey || !geminiApiKey) {
  console.error('Missing env vars! Check .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Conversions for question string fields to numerical values
const locusMap = { internal: 1, mixed: 0, external: -1 };
const actionMap = { 'action-taken': 2, 'intention-stated': 1, 'rumination-only': 0 };
const selfTalkMap = { compassionate: 1, neutral: 0, critical: -1 };
const resolutionMap = { resolved: 2, 'in-progress': 1, unresolved: 0 };
const copingMap = { 'problem-focused': 1, 'emotion-focused': 0, avoidant: -1 };

function computeDeltas(question, answer) {
  const calcDelta = (qVal, aVal) => {
    if (qVal === null || qVal === undefined || aVal === null || aVal === undefined) return null;
    return aVal - qVal;
  };

  const qLocus = question.locus_of_control ? locusMap[question.locus_of_control] ?? null : null;
  const qAction = question.action_orientation ? actionMap[question.action_orientation] ?? null : null;
  const qSelfTalk = question.self_talk_valence ? selfTalkMap[question.self_talk_valence] ?? null : null;
  const qResolution = question.resolution_status ? resolutionMap[question.resolution_status] ?? null : null;
  const qCoping = question.coping_response ? copingMap[question.coping_response] ?? null : null;
  const qIntensity = typeof question.overall_intensity === 'number' ? question.overall_intensity * 10 : null;
  const qAgency = typeof question.agency_score === 'number' ? question.agency_score : null;
  const qOwnership = typeof question.ownership_score === 'number' ? question.ownership_score : null;

  return {
    agency_delta: calcDelta(qAgency, answer.agency_score),
    locus_delta: calcDelta(qLocus, answer.locus_of_control),
    action_delta: calcDelta(qAction, answer.action_orientation),
    ownership_delta: calcDelta(qOwnership, answer.ownership_score),
    intensity_delta: calcDelta(qIntensity, answer.emotional_intensity),
    self_talk_delta: calcDelta(qSelfTalk, answer.self_talk_valence),
    resolution_delta: calcDelta(qResolution, answer.resolution_status),
    coping_delta: calcDelta(qCoping, answer.coping_orientation),
    action_specificity: answer.action_specificity ?? 0,
    engaged_with_prompt: answer.engaged_with_prompt ?? true,
  };
}

async function runPipelineTest() {
  console.log('=== FULL PIPELINE INTEGRATION TEST ===\n');

  // Test question & answer pair (Career domain example)
  const questionRaw = "I'm afraid to follow my career plan because I compare myself to others and wonder if mine was ever right.";
  const rephrasedText = "Someone is afraid of where their career is heading. They have a plan, but they keep measuring it against everyone else's path.";
  const answerRaw = "There's nothing I can do, everyone else is just ahead of me and market conditions dictate everything.";

  console.log('1. Raw Question:', questionRaw);
  console.log('2. Rephrased Text:', rephrasedText);
  console.log('3. Raw Answer:', answerRaw);

  // Question Extraction Mock / Test
  const questionExtraction = {
    life_domain: 'career',
    stated_concern: "afraid to follow career plan due to social comparison",
    core_concern: "fear of choosing wrong career path relative to peers",
    primary_emotion: "fear",
    agency_score: 4,
    locus_of_control: "mixed",
    action_orientation: "intention-stated",
    ownership_score: 5,
    overall_intensity: 0.7,
    self_talk_valence: "neutral",
    resolution_status: "unresolved",
    coping_response: "emotion-focused"
  };

  // Answer Extraction Mock / Test
  const answerExtraction = {
    agency_score: 2,
    locus_of_control: -1, // external
    action_orientation: 0, // rumination-only
    action_specificity: 0, // none
    ownership_score: 1,
    emotional_intensity: 7,
    self_talk_valence: -1, // critical
    resolution_status: 0, // unresolved
    coping_orientation: -1, // avoidant
    engaged_with_prompt: true,
    answer_summary: "Claims nothing can be done and external comparison dictates progress.",
    evidence_explicit: ["There's nothing I can do, everyone else is just ahead of me"]
  };

  // Step 3 Math per entry
  const deltas = computeDeltas(questionExtraction, answerExtraction);
  console.log('\n✅ Step 3 Computed Deltas:', JSON.stringify(deltas, null, 2));

  // Area Snapshot mock
  const areaSnapshots = {
    career: "Career (12 entries): Main worry is choosing wrong path. When answering doubts, takes ~3 points less ownership than when describing them, staying at thinking level."
  };

  // RAG vector matches mock
  const vectorMatches = [
    {
      stated_concern: "I keep putting off starting my business project because of perfectionism.",
      answer_summary: "Advised waiting until conditions feel 100% safe before taking any step."
    }
  ];

  console.log('\n4. Running AI Insight Gap Analysis with (Current Q+A+Deltas, Area Snapshots, RAG Vector Matches)...');

  const sessionExtractions = [{
    input: { raw_text: questionRaw },
    ...questionExtraction,
    user_response_answer: answerRaw,
    answer_analysis: answerExtraction,
    deltas: deltas
  }];

  const prompt = `Act as an elite clinical psychologist and master self-inquiry consultant. Perform a deep, high-leverage psychological gap analysis (100–140 words max) analyzing the user's current session (questions, written answers, and computed deltas) against their life-area snapshots and past RAG history.

Previous Life-Area Snapshots:
${JSON.stringify(areaSnapshots, null, 2)}

Current Session Extractions (Question + Written Answer + Deltas):
${JSON.stringify(sessionExtractions, null, 2)}

Relevant Past Vector Matches (RAG Context with Past Doubts & Advice Summaries):
${JSON.stringify(vectorMatches, null, 2)}

OUTPUT RULES:
- Identify the SINGLE most critical blind spot, cognitive flaw, or agency gap in their thinking.
- Speak directly, perceptively, and with clinical depth. No therapeutic fluff, preambles, or diagnostic labels.`;

  const FLASH_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];
  let responseText = '';

  for (const modelName of FLASH_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { temperature: 0.3 }
      });
      if (res.text?.trim()) {
        responseText = res.text.trim();
        break;
      }
    } catch (e) {
      console.warn(`Model ${modelName} warning:`, e.message);
    }
  }

  console.log('\n🎯 GENERATED CLINICAL GAP INSIGHT:\n');
  console.log(responseText || 'Fallback: Significant agency gap detected.');
  console.log('\n=== PIPELINE INTEGRATION TEST COMPLETE ===');
}

runPipelineTest();
