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

  const rawLocus = question?.locus_of_control || question?.cognitive_state?.locus_of_control;
  const rawAction = question?.action_orientation || question?.behavioral_state?.action_orientation;
  const rawSelfTalk = question?.self_talk_valence || question?.self_relation?.self_talk_valence;
  const rawResolution = question?.resolution_status || question?.behavioral_state?.resolution_status;
  const rawCoping = question?.coping_response || question?.behavioral_state?.coping_response;

  const qLocus = rawLocus ? locusMap[rawLocus] ?? null : null;
  const qAction = rawAction ? actionMap[rawAction] ?? null : null;
  const qSelfTalk = rawSelfTalk ? selfTalkMap[rawSelfTalk] ?? null : null;
  const qResolution = rawResolution ? resolutionMap[rawResolution] ?? null : null;
  const qCoping = rawCoping ? copingMap[rawCoping] ?? null : null;

  const rawIntensity = typeof question?.overall_intensity === 'number'
    ? question.overall_intensity
    : (typeof question?.emotional_state?.overall_intensity === 'number' ? question.emotional_state.overall_intensity : null);
  const qIntensity = typeof rawIntensity === 'number' ? Math.round(rawIntensity * 10) : null;

  const qAgency = typeof question?.agency_score === 'number'
    ? question.agency_score
    : (typeof question?.cognitive_state?.self_efficacy === 'number' ? Math.round(question.cognitive_state.self_efficacy * 10) : null);

  const qOwnership = typeof question?.ownership_score === 'number'
    ? question.ownership_score
    : (typeof question?.gap_indicators?.responsibility_gap === 'number' ? Math.round((1 - question.gap_indicators.responsibility_gap) * 10) : null);

  return {
    agency_delta: calcDelta(qAgency, answer?.agency_score),
    locus_delta: calcDelta(qLocus, answer?.locus_of_control),
    action_delta: calcDelta(qAction, answer?.action_orientation),
    ownership_delta: calcDelta(qOwnership, answer?.ownership_score),
    intensity_delta: calcDelta(qIntensity, answer?.emotional_intensity),
    self_talk_delta: calcDelta(qSelfTalk, answer?.self_talk_valence),
    resolution_delta: calcDelta(qResolution, answer?.resolution_status),
    coping_delta: calcDelta(qCoping, answer?.coping_orientation),
    action_specificity: typeof answer?.action_specificity === 'number' ? answer.action_specificity : 0,
    engaged_with_prompt: answer?.engaged_with_prompt !== false,
  };
}

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING END-TO-END QUESTION & ANSWER DELTA TEST');
  console.log('====================================================\n');

  const questionRaw = "I am very afraid of my career I don't know where to go will I ever get a job or not. I have a plan but I am very afraid to follow it due to uncertainty of it because I compare path of others.";
  const rephrasedText = "Someone is afraid of where their career is heading. They have a plan, but they keep measuring it against everyone else's path.";
  const answerRaw = "I should stop comparing myself to others, stick to my daily study schedule, and take action on my application portfolio step by step.";

  console.log('1. Raw Question:', questionRaw);

  const promptQ = `Analyze the following user raw thought/doubt: "${questionRaw}"`;
  const systemQ = `You are a precise clinical extraction engine for a self-inquiry app.
Analyze the user's raw thought and extract psychological indicators strictly matching this JSON schema structure:

{
  "life_domain": "career|relationship|self-worth|family|health|money|identity|other",
  "stated_concern": "short paraphrase of raw thought",
  "core_concern": "short synthesis or null",
  "primary_emotion": "fear|shame|anger|sadness|guilt|confusion|hope|disgust|envy",
  "emotion_intensity": 0.8,
  "trigger_type": "social_comparison|rejection_or_criticism|conflict|failure_or_mistake|uncertainty|financial_pressure|health_concern|memory_or_anniversary|isolation|other|null",
  "trigger_description": "short text naming actual cause, or null",
  "trigger_confidence": 0.8,
  "cognitive_distortions": ["catastrophizing", "all-or-nothing", "mind-reading", "overgeneralization", "personalization", "discounting-positive"],
  "agency_score": 4,
  "locus_of_control": "internal|mixed|external|null",
  "action_orientation": "action-taken|intention-stated|rumination-only|null",
  "ownership_score": 5,
  "overall_intensity": 0.7,
  "self_talk_valence": "compassionate|neutral|critical|null",
  "resolution_status": "unresolved|in-progress|resolved|null",
  "coping_response": "problem-focused|emotion-focused|avoidant|null"
}`;

  const FLASH_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];

  console.log('\n2. Extracting Question Analysis via Gemini...');
  let resQText = '{}';
  for (const m of FLASH_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: promptQ,
        config: { responseMimeType: 'application/json', temperature: 0.2, systemInstruction: systemQ }
      });
      if (res.text) { resQText = res.text; break; }
    } catch (e) {
      console.warn(`Model ${m} warning:`, e.message);
    }
  }
  const questionExtraction = JSON.parse(resQText || '{}');
  console.log('✅ Question Extraction Result:', JSON.stringify(questionExtraction, null, 2));

  const promptA = `CONTEXT (the question this answer responds to):
${JSON.stringify(questionExtraction, null, 2)}

ORIGINAL DOUBT SHOWN TO THE USER:
${rephrasedText}

USER'S ANSWER:
${answerRaw}`;

  const systemA = `You are the Answer Analysis Engine for Self-Haul. The user was shown a third-person narration of their own doubt, and asked to respond as if advising a stranger. You will extract a small, comparable set of signals from their answer, using the ORIGINAL QUESTION's extracted data as context so your scores are calibrated against the same situation.

SCHEMA:
{
  "agency_score": 8,
  "locus_of_control": 1,
  "action_orientation": 2,
  "action_specificity": 2,
  "ownership_score": 8,
  "emotional_intensity": 4,
  "self_talk_valence": 1,
  "resolution_status": 1,
  "coping_orientation": 1,
  "engaged_with_prompt": true,
  "answer_summary": "Recommends stopping comparison and taking daily concrete steps on portfolio."
}`;

  console.log('\n3. Extracting Answer Analysis via Gemini...');
  let resAText = '{}';
  for (const m of FLASH_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: promptA,
        config: { responseMimeType: 'application/json', temperature: 0.2, systemInstruction: systemA }
      });
      if (res.text) { resAText = res.text; break; }
    } catch (e) {
      console.warn(`Model ${m} warning:`, e.message);
    }
  }
  const answerExtraction = JSON.parse(resAText || '{}');
  console.log('✅ Answer Extraction Result:', JSON.stringify(answerExtraction, null, 2));

  console.log('\n4. Computing Deltas in Application Code...');
  const deltas = computeDeltas(questionExtraction, answerExtraction);
  console.log('📊 Computed Deltas:', JSON.stringify(deltas, null, 2));

  const coreDeltas = [
    deltas.agency_delta,
    deltas.locus_delta,
    deltas.action_delta,
    deltas.ownership_delta,
    deltas.intensity_delta,
    deltas.self_talk_delta,
    deltas.resolution_delta,
    deltas.coping_delta,
  ];

  const nonNullCount = coreDeltas.filter((d) => d !== null && d !== undefined).length;
  console.log(`\n🔍 Non-null deltas count: ${nonNullCount} / 8`);

  if (nonNullCount >= 6) {
    console.log(`\n🎉 TEST PASSED! ${nonNullCount} of 8 deltas are non-null!`);
  } else {
    console.error(`\n❌ TEST FAILED! Only ${nonNullCount} of 8 deltas were non-null (expected >= 6).`);
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
