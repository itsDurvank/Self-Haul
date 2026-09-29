/**
 * EMOTIONAL INTELLIGENCE SPECTRUM TEST
 * Tests all 5 tone levels: 🔴 Confrontational, 🟠 Firm, 🟡 Cross-domain, 🟢 Empathetic, 🔵 Growth
 * 
 * Each scenario provides realistic question_analysis + answer_analysis + deltas + RAG data
 * and sends a user message to the Socratic Chat to see how Gemini responds.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load API key from .env ──────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
const API_KEY = apiKeyMatch?.[1]?.trim().replace(/^["']|["']$/g, '');

if (!API_KEY) { console.error('❌ No GEMINI_API_KEY found in .env'); process.exit(1); }

const { GoogleGenAI } = await import('@google/genai');
const ai = new GoogleGenAI({ apiKey: API_KEY });

// ── Gemini call helper ──────────────────────────────────────
async function callGemini(systemInstruction, prompt) {
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0.35, systemInstruction },
      });
      return response.text?.trim() || '[empty response]';
    } catch (err) {
      console.warn(`  ⚠ ${model} failed, trying next...`);
    }
  }
  return '[all models failed]';
}

// ═══════════════════════════════════════════════════════════════
// 5 TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════

const scenarios = [
  {
    label: '🔴 HYPOCRISY / PROCRASTINATION (Career)',
    userMessage: "I know I should be coding but I keep watching tutorials and tweaking my resume instead. I feel like I'm not ready yet.",
    sessionExtractions: [{
      life_domain: 'career',
      stated_concern: 'Keeps watching tutorials instead of actually building projects',
      primary_emotion: 'fear',
      emotion_intensity: 0.7,
      trigger_type: 'uncertainty',
      agency_score: 3,
      ownership_score: 3,
      action_orientation: 'rumination-only',
      locus_of_control: 'external',
      coping_response: 'avoidant',
      cognitive_distortions: ['catastrophizing', 'all-or-nothing'],
      self_talk_valence: 'critical',
      resolution_status: 'unresolved',
      user_response_answer: "They should just start building something small, even if it's ugly. Stop waiting for perfection.",
      answer_analysis: {
        agency_score: 8, ownership_score: 8, action_orientation: 2,
        action_specificity: 2, coping_orientation: 1, resolution_status: 1,
        answer_summary: "Start building something small, stop waiting for perfection."
      },
      deltas: {
        agency_delta: 5, ownership_delta: 5, action_delta: 2,
        intensity_delta: -3, self_talk_delta: 1, coping_delta: 2
      }
    }],
    vectorMatches: [
      { life_domain: 'career', stated_concern: 'I keep putting off coding', agency_score: 3, ownership_score: 2, similarity_score: 0.88, historical_answer_summary: 'Just start with anything, even one function.' },
      { life_domain: 'career', stated_concern: 'Afraid my skills are not enough', agency_score: 4, ownership_score: 3, similarity_score: 0.82, historical_answer_summary: 'Skills grow by doing, not watching.' },
      { life_domain: 'career', stated_concern: 'Will I ever get a job', agency_score: 3, ownership_score: 3, similarity_score: 0.79, historical_answer_summary: 'Apply first, perfect later.' },
    ],
    areaSnapshots: { career: 'career (5 entries): Repeated pattern of tutorial-watching and resume-tweaking. Low agency across all entries.' },
  },

  {
    label: '🟠 ANGER / ENVY (Externalized blame)',
    userMessage: "This guy at work got the promotion I deserved. He's not even that good, he just knows how to suck up to the manager. The whole system is rigged.",
    sessionExtractions: [{
      life_domain: 'career',
      stated_concern: 'Colleague got promotion, feels unfair',
      primary_emotion: 'anger',
      emotion_intensity: 0.8,
      trigger_type: 'social_comparison',
      agency_score: 4,
      ownership_score: 3,
      action_orientation: 'rumination-only',
      locus_of_control: 'external',
      coping_response: 'emotion-focused',
      cognitive_distortions: ['personalization', 'mind-reading'],
      self_talk_valence: 'critical',
      resolution_status: 'unresolved',
      user_response_answer: "They should talk to their manager about what they need to do to get promoted next time.",
      answer_analysis: {
        agency_score: 6, ownership_score: 5, action_orientation: 1,
        action_specificity: 1, coping_orientation: 0, resolution_status: 1,
        answer_summary: "Talk to manager about promotion criteria."
      },
      deltas: {
        agency_delta: 2, ownership_delta: 2, action_delta: 1,
        intensity_delta: -2, self_talk_delta: 1, coping_delta: 1
      }
    }],
    vectorMatches: [],
    areaSnapshots: {},
  },

  {
    label: '🟡 CROSS-DOMAIN SPILLOVER (Breakup → Can\'t work)',
    userMessage: "I just went through a breakup 3 days ago and I can't focus on my work at all. I have deadlines but my mind keeps going back to her. I feel useless for not being able to function.",
    sessionExtractions: [{
      life_domain: 'relationship',
      stated_concern: 'Recent breakup making it impossible to focus on work',
      primary_emotion: 'sadness',
      emotion_intensity: 0.9,
      trigger_type: 'rejection_or_criticism',
      agency_score: 2,
      ownership_score: 2,
      action_orientation: 'rumination-only',
      locus_of_control: 'mixed',
      coping_response: 'emotion-focused',
      cognitive_distortions: ['personalization'],
      self_talk_valence: 'critical',
      resolution_status: 'unresolved',
      user_response_answer: "They need to give themselves time. Three days is nothing. But they should still try to do minimum work to not fall behind completely.",
      answer_analysis: {
        agency_score: 4, ownership_score: 3, action_orientation: 1,
        action_specificity: 1, coping_orientation: 0, resolution_status: 0,
        answer_summary: "Give yourself time. Three days is nothing. Do minimum to not fall behind."
      },
      deltas: {
        agency_delta: 2, ownership_delta: 1, action_delta: 1,
        intensity_delta: -1, self_talk_delta: 1, coping_delta: 1
      }
    }],
    vectorMatches: [],
    areaSnapshots: {},
  },

  {
    label: '🟢 GENUINE GRIEF / LOSS',
    userMessage: "My grandmother passed away last week. She raised me. I feel like a piece of me is gone. I can't eat, I can't sleep. Everything feels pointless.",
    sessionExtractions: [{
      life_domain: 'family',
      stated_concern: 'Grandmother who raised them passed away',
      primary_emotion: 'sadness',
      emotion_intensity: 0.95,
      trigger_type: 'memory_or_anniversary',
      agency_score: 1,
      ownership_score: 1,
      action_orientation: 'rumination-only',
      locus_of_control: 'external',
      coping_response: 'emotion-focused',
      cognitive_distortions: [],
      self_talk_valence: 'critical',
      resolution_status: 'unresolved',
      user_response_answer: "There's nothing to advise. Some pain you just have to sit with. Let them grieve.",
      answer_analysis: {
        agency_score: 1, ownership_score: 1, action_orientation: 0,
        action_specificity: 0, coping_orientation: 0, resolution_status: 0,
        answer_summary: "Some pain you just have to sit with. Let them grieve."
      },
      deltas: {
        agency_delta: 0, ownership_delta: 0, action_delta: 0,
        intensity_delta: 0, self_talk_delta: 0, coping_delta: 0
      }
    }],
    vectorMatches: [],
    areaSnapshots: {},
  },

  {
    label: '🔵 GROWTH (User is improving vs past patterns)',
    userMessage: "I actually applied to 3 jobs this week. I still feel scared but I did it anyway. My resume isn't perfect but I sent it.",
    sessionExtractions: [{
      life_domain: 'career',
      stated_concern: 'Applied to jobs despite fear',
      primary_emotion: 'fear',
      emotion_intensity: 0.5,
      trigger_type: 'uncertainty',
      agency_score: 7,
      ownership_score: 7,
      action_orientation: 'action-taken',
      locus_of_control: 'internal',
      coping_response: 'problem-focused',
      cognitive_distortions: [],
      self_talk_valence: 'neutral',
      resolution_status: 'in-progress',
      user_response_answer: "Good for them. Keep applying. The fear doesn't go away, you just learn to act despite it.",
      answer_analysis: {
        agency_score: 8, ownership_score: 8, action_orientation: 2,
        action_specificity: 2, coping_orientation: 1, resolution_status: 1,
        answer_summary: "Keep applying. Fear doesn't go away, you act despite it."
      },
      deltas: {
        agency_delta: 1, ownership_delta: 1, action_delta: 0,
        intensity_delta: -1, self_talk_delta: 0, coping_delta: 0
      }
    }],
    vectorMatches: [
      { life_domain: 'career', stated_concern: 'I keep putting off coding', agency_score: 3, ownership_score: 2, similarity_score: 0.85, historical_answer_summary: 'Just start with anything.' },
      { life_domain: 'career', stated_concern: 'Afraid my skills are not enough', agency_score: 4, ownership_score: 3, similarity_score: 0.80, historical_answer_summary: 'Skills grow by doing.' },
      { life_domain: 'career', stated_concern: 'Will I ever get a job', agency_score: 3, ownership_score: 3, similarity_score: 0.75, historical_answer_summary: 'Apply first, perfect later.' },
    ],
    areaSnapshots: { career: 'career (5 entries): Repeated pattern of tutorial-watching. Low agency across all entries. Past advice always says just start.' },
  },
];

// ═══════════════════════════════════════════════════════════════
// BUILD THE SYSTEM INSTRUCTION (same as generateSocraticChatReply)
// ═══════════════════════════════════════════════════════════════

function buildSystemInstruction(scenario) {
  return `You are the Psychological Consultant for Self-Haul.
You have access to the user's longitudinal psychological profile, past vector memory patterns, recent session extractions, answer analysis, computed deltas, and defense mechanisms.

═══════════════════════════════════════════════════════════════
DYNAMIC EMOTIONAL INTELLIGENCE FRAMEWORK
═══════════════════════════════════════════════════════════════

BEFORE you respond, silently run through ALL steps below.

────────────────────────────────────────────
STEP 1 — READ THE DATA + LIVE CONVERSATION
────────────────────────────────────────────
For each session entry:
  • QUESTION ANALYSIS: primary_emotion, trigger_type, life_domain, agency_score, ownership_score, action_orientation, cognitive_distortions, self_talk_valence, emotion_intensity
  • ANSWER ANALYSIS: agency_score, ownership_score, action_orientation, action_specificity, coping_orientation, resolution_status
  • DELTAS: agency_delta, ownership_delta, action_delta, intensity_delta, self_talk_delta, coping_delta

ALSO consider what the user is saying RIGHT NOW — their live messages may reveal new emotional context that overrides extracted data.

Key math:
  • Large POSITIVE deltas (3+) → user can advise others but won't act → potential hypocrisy
  • SMALL (0 to +2) or NEGATIVE deltas → equally stuck when advising → genuine struggle
  • Answer also low scores → they truly lack clarity, not dodging

────────────────────────────────────────────
STEP 2 — DETERMINE YOUR TONE ON THE SPECTRUM
────────────────────────────────────────────

🔴 CONFRONTATIONAL (Strictness 9-10)
For: HYPOCRISY, PROCRASTINATION, AVOIDANCE, EXCUSE-MAKING, INTELLECTUALIZATION
  • Fear + avoidant coping + career/self-worth/identity/money domain
  • Question agency LOW but answer agency HIGH (delta 3+)
  • Rumination-only + zero action specificity → all talk no walk
  STYLE: Razor-sharp. Corner them with their own data. No sugarcoating.

🟠 FIRM BUT WARM (Strictness 6-8)
For: CONFUSION, ENVY, ANGER (externalized blame), IDENTITY CRISIS
  • User misdirecting energy — blaming world instead of examining self
  • Moderate deltas — partial self-awareness exists
  • Anger/envy masking internal insecurity
  STYLE: Direct, honest, but not cruel. Name the deflection. Redirect their energy.

🟡 GENUINE CONFRONTATION WITH CARE (Strictness 4-6)
For: CROSS-DOMAIN SPILLOVER (breakup → can't work, health → career anxiety)
  • Pain is REAL in one domain but bleeding into another
  • User punishing themselves for being affected
  • NOT procrastination — nervous system overwhelm
  STYLE: Acknowledge the pain. Confront the toxic self-demand. Don't coddle but don't punish.

🟢 STABILIZING & EMPATHETIC (Strictness 1-3)
For: GENUINE GRIEF, SHAME, GUILT, TRAUMA, LOSS, HEARTBREAK, ISOLATION, HEALTH CRISIS
  • Sadness/shame/guilt with real-world triggers + high intensity
  • Answer also low agency/ownership → couldn't advise themselves either
  • Deltas small/negative → no hypocrisy gap, just suffering
  • Critical self-talk + self-blame → punishing themselves for being human
  STYLE: Grounded, stabilizing, psychologically clarifying. Validate pain. Expose self-punishment.

🔵 ACKNOWLEDGING & MOTIVATING (Strictness 0-2)
For: GROWTH DETECTED — user is IMPROVING vs. their past patterns
  • Action-taken with concrete specificity
  • RAG history shows worse scores in same domain → trajectory UP
  STYLE: Name the growth. Don't over-praise. Ask what's next.

────────────────────────────────────────────
STEP 3 — RAG TRAJECTORY ANALYSIS
────────────────────────────────────────────

🔄 CHRONIC LOOP: RAG shows 3+ entries, same domain, same low scores, same emotion → escalate strictness by +2. Name the repetition explicitly.
📈 GROWTH: RAG shows past entries worse than current → acknowledge improvement, push to next level. Do NOT treat them like they're still stuck.
📉 REGRESSION: User WAS better but current is worse → name it without shaming. Find what pulled them back.

────────────────────────────────────────────
STEP 4 — ABSOLUTE RULES
────────────────────────────────────────────
  • NEVER diagnose grief/loss/shame/guilt as "procrastination" or "work avoidance"
  • NEVER hallucinate cross-domain connections (breakup ≠ scheme to avoid coding)
  • NEVER use chatbot filler ("I understand", "That must be tough")
  • NEVER ignore delta math
  • When in genuine doubt → default to empathetic tone first, probe for avoidance gently after

TONE & FORMAT:
- Concise, penetrative, conversational (60–110 words).
- End with a Socratic question calibrated to the spectrum position:
  🔴 → corner them into admitting the gap
  🟠 → redirect their energy toward the real issue
  🟡 → challenge the toxic self-demand with warmth
  🟢 → redirect from self-punishment toward self-understanding
  🔵 → push toward the next growth milestone

PSYCHOLOGICAL KNOWLEDGE BASE:
Previous Life-Area Snapshots:
${JSON.stringify(scenario.areaSnapshots || {}, null, 2)}

Recent Session Context (Doubts, Answers, Extractions & Deltas):
${JSON.stringify(scenario.sessionExtractions, null, 2)}

Relevant Past Vector Matches (Historical Patterns):
${JSON.stringify(scenario.vectorMatches || [], null, 2)}

Initial Session Diagnosis:
None`;
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL 5 TESTS
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log('  EMOTIONAL INTELLIGENCE SPECTRUM TEST');
console.log('  Testing 5 scenarios across the full tone spectrum');
console.log('═'.repeat(70) + '\n');

for (const scenario of scenarios) {
  console.log('─'.repeat(70));
  console.log(`  ${scenario.label}`);
  console.log('─'.repeat(70));
  console.log(`  USER: "${scenario.userMessage}"`);
  console.log(`  Deltas: agency=${scenario.sessionExtractions[0].deltas.agency_delta}, ownership=${scenario.sessionExtractions[0].deltas.ownership_delta}`);
  console.log(`  RAG matches: ${scenario.vectorMatches.length}`);
  console.log('');

  const systemInstr = buildSystemInstruction(scenario);
  const prompt = `CONVERSATION SO FAR:
USER: ${scenario.userMessage}

Generate the next response as the SOCRATIC INQUIRER:`;

  try {
    const reply = await callGemini(systemInstr, prompt);
    console.log(`  GEMINI RESPONSE:\n`);
    // Word-wrap the response for readability
    const words = reply.split(' ');
    let line = '  ';
    for (const word of words) {
      if (line.length + word.length > 90) {
        console.log(line);
        line = '  ' + word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) console.log(line);
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }

  console.log('\n');
  // Small delay between calls to avoid rate limiting
  await new Promise(r => setTimeout(r, 2000));
}

console.log('═'.repeat(70));
console.log('  TEST COMPLETE — Compare the tones across all 5 scenarios');
console.log('═'.repeat(70));
