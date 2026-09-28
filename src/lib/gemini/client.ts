import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export function getAi() {
  let apiKey = process.env.GEMINI_API_KEY || '';

  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]) {
        const fileKey = match[1].trim().replace(/^["']|["']$/g, '');
        if (fileKey) {
          apiKey = fileKey;
        }
      }
    }
  } catch (e) {
    // Fall back to process.env
  }

  return new GoogleGenAI({ apiKey });
}

export interface ExtractedAnalysis {
  input: {
    raw_text: string;
    entry_id?: string;
    timestamp: string;
  };
  emotional_state: {
    primary_emotions: Array<{
      emotion: string;
      intensity: number;
      confidence: number;
    }>;
    overall_intensity: number;
    valence: number;
    vulnerability: number;
  };
  situation: {
    life_domain: string;
    sub_domain?: string | null;
    time_orientation: string;
    uncertainty_level: number;
    perceived_threat: number;
  };
  trigger: {
    trigger_type?: string | null;
    trigger_source?: string | null;
    trigger_description?: string | null;
    confidence?: number | null;
  };
  concern: {
    stated_concern: string;
    feared_outcome?: string | null;
    feared_consequence?: string | null;
    underlying_need?: string | null;
    core_concern?: string | null;
  };
  cognitive_state: {
    certainty?: number | null;
    perceived_control?: number | null;
    locus_of_control?: string | null;
    self_efficacy?: number | null;
    rumination?: number | null;
    catastrophizing?: number | null;
    cognitive_distortions?: string[];
    distortion_confidence?: number;
  };
  behavioral_state: {
    action_orientation?: string | null;
    avoidance?: number | null;
    reassurance_seeking?: number | null;
    coping_response?: string | null;
    resolution_status?: string | null;
  };
  self_relation: {
    self_criticism?: number | null;
    self_blame?: number | null;
    self_worth_threat?: number | null;
    comparison?: number | null;
    self_talk_valence?: string | null;
  };
  gap_indicators: {
    insight_vs_action_gap?: number | null;
    responsibility_gap?: number | null;
    stated_vs_demonstrated_agency?: string | null;
    victim_framing_flag?: boolean | null;
    notes?: string | null;
  };
  clinical_pattern_flags: {
    repetitive_intrusive_thought?: boolean | null;
    compulsive_behavior_described?: boolean | null;
    ego_dystonic_marker?: boolean | null;
    reassurance_seeking_pattern?: boolean | null;
    flag_confidence?: number;
    flag_basis?: string | null;
    recommend_professional_review?: boolean;
  };
  expression: {
    rawness: number;
    directness: number;
    urgency: number;
    formality: number;
  };
  recurrence: {
    signal?: string | null;
    matched_entry_ids?: string[];
  };
  evidence: {
    explicit: string[];
    inferred: string[];
  };
  overall_confidence: number;
}

const EXTRACTION_SYSTEM_INSTRUCTION = `You are a precise clinical extraction engine for a self-inquiry app.
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
  "coping_response": "problem-focused|emotion-focused|avoidant|null",
  "clinical_pattern_flags": {
    "repetitive_intrusive_thought": false,
    "compulsive_behavior_described": false,
    "ego_dystonic_marker": false,
    "reassurance_seeking_pattern": false,
    "flag_confidence": 0.9,
    "recommend_professional_review": false
  },
  "hopelessness_or_self_harm_language": false,
  "evidence_explicit": ["direct paraphrases of what was actually written"],
  "overall_confidence": 0.85
}

CRITICAL PROMPT RULES:
1. Return null for any field with no direct or strongly implied evidence. Never fill a 'safe middle' number as a substitute for null.
2. Do not infer blame, responsibility, or traits the text does not support. A physical symptom is not evidence of locus of control or ownership.
3. ownership_score and locus_of_control must be null for physiological or acute-distress reports with no decision or responsibility content.
4. cognitive_distortions list and distortion scores must agree.
5. trigger_description must name an actual cause, not restate the feeling. If no cause is stated, trigger fields are null.
6. Output ONLY the valid JSON object.`;

const ANSWER_EXTRACTION_SYSTEM_INSTRUCTION = `You are the Answer Analysis Engine for Self-Haul. The user was shown a third-person narration of their own doubt, and asked to respond as if advising a stranger. You will extract a small, comparable set of signals from their answer, using the ORIGINAL QUESTION's extracted data as context so your scores are calibrated against the same situation.

CRITICAL RULES
1. Every field must be directly comparable to its counterpart in the question's extraction. Use the same scales.
2. If a field does not apply to this answer (e.g. locus_of_control or ownership_score when the situation is a physiological symptom with no decision or responsibility content), return null. Do not force a value.
3. Do not reward vague reassurance as "resolution." "It'll be fine" is not resolved, in-progress, or a concrete action, it's avoidance dressed as comfort — score it accordingly.
4. Base every field only on what the answer actually says, not on what you assume a "good" answer would say.

SCHEMA
{
  "agency_score": "0-10 or null",
  "locus_of_control": "-1 (external) | 0 (mixed) | 1 (internal) | null",
  "action_orientation": "0 (rumination-only) | 1 (intention-stated) | 2 (action-taken)",
  "action_specificity": "0 (none) | 1 (vague) | 2 (concrete)",
  "ownership_score": "0-10 or null",
  "emotional_intensity": "0-10",
  "self_talk_valence": "-1 (critical) | 0 (neutral) | 1 (compassionate)",
  "resolution_status": "0 (unresolved) | 1 (in-progress) | 2 (resolved)",
  "coping_orientation": "-1 (avoidant) | 0 (emotion-focused) | 1 (problem-focused)",
  "engaged_with_prompt": "true | false",
  "answer_summary": "one-line summary of what the person advised",
  "evidence_explicit": ["direct paraphrase of what was actually written in the answer"]
}`;

/**
 * Extract structured answer analysis JSON from raw answer text using Gemini
 */
export async function extractAnswerAnalysis(
  questionExtractionJson: any,
  rephrasedText: string,
  answerRawText: string
): Promise<any> {
  const prompt = `CONTEXT (the question this answer responds to):
${JSON.stringify(questionExtractionJson, null, 2)}

ORIGINAL DOUBT SHOWN TO THE USER:
${rephrasedText}

USER'S ANSWER:
${answerRawText}

Now extract from the answer above.`;

  const EXTRACTION_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  const numOrNull = (val: any): number | null => (typeof val === 'number' && !isNaN(val) ? val : null);

  for (const modelName of EXTRACTION_MODELS) {
    try {
      const response = await getAi().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          systemInstruction: ANSWER_EXTRACTION_SYSTEM_INSTRUCTION,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return {
          agency_score: numOrNull(parsed.agency_score),
          locus_of_control: numOrNull(parsed.locus_of_control),
          action_orientation: numOrNull(parsed.action_orientation),
          action_specificity: numOrNull(parsed.action_specificity),
          ownership_score: numOrNull(parsed.ownership_score),
          emotional_intensity: numOrNull(parsed.emotional_intensity),
          self_talk_valence: numOrNull(parsed.self_talk_valence),
          resolution_status: numOrNull(parsed.resolution_status),
          coping_orientation: numOrNull(parsed.coping_orientation),
          engaged_with_prompt: typeof parsed.engaged_with_prompt === 'boolean' ? parsed.engaged_with_prompt : true,
          answer_summary: parsed.answer_summary || answerRawText,
          evidence_explicit: Array.isArray(parsed.evidence?.explicit)
            ? parsed.evidence.explicit
            : (Array.isArray(parsed.evidence_explicit) ? parsed.evidence_explicit : [answerRawText]),
        };
      }
    } catch (err) {
      console.warn(`Gemini answer extraction model ${modelName} call failed, trying next:`, err);
    }
  }

  return {
    agency_score: null,
    locus_of_control: null,
    action_orientation: null,
    action_specificity: null,
    ownership_score: null,
    emotional_intensity: null,
    self_talk_valence: null,
    resolution_status: null,
    coping_orientation: null,
    engaged_with_prompt: true,
    answer_summary: answerRawText,
    evidence_explicit: [answerRawText],
  };
}

import type { ExtractedQuestionAnalysis } from '@/types/selfhaul';

/**
 * Extract structured psychological analysis JSON from raw text using Gemini Flash models with fallbacks
 */
export async function extractQuestionAnalysis(rawText: string, entryId?: string): Promise<ExtractedQuestionAnalysis> {
  const prompt = `Analyze the following user raw thought/doubt: "${rawText}"`;
  const EXTRACTION_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  for (const modelName of EXTRACTION_MODELS) {
    try {
      const response = await getAi().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed.life_domain || parsed.stated_concern || parsed.primary_emotion || parsed.agency_score !== undefined)
      ) {
        return {
          input: {
            raw_text: rawText,
            entry_id: entryId,
            timestamp: new Date().toISOString(),
          },
          ...parsed,
        };
      }
    } catch (err) {
      console.warn(`Gemini extraction model ${modelName} call failed, trying next:`, err);
    }
  }

  console.error('CRITICAL: All Gemini extraction models failed. Generating dynamic structural fallback for:', rawText);
  
  const lowerText = rawText.toLowerCase();
  const isCareer = lowerText.includes('job') || lowerText.includes('career') || lowerText.includes('work') || lowerText.includes('future') || lowerText.includes('path');
  const isRelationship = lowerText.includes('friend') || lowerText.includes('family') || lowerText.includes('lonely') || lowerText.includes('love') || lowerText.includes('person');

  return {
    input: {
      raw_text: rawText,
      entry_id: entryId,
      timestamp: new Date().toISOString(),
    },
    life_domain: isCareer ? 'career' : isRelationship ? 'relationship' : 'self-worth',
    stated_concern: rawText,
    core_concern: 'Seeking clarity and agency',
    primary_emotion: isCareer ? 'fear' : 'sadness',
    emotion_intensity: 0.65,
    trigger_type: 'uncertainty',
    trigger_description: rawText,
    trigger_confidence: 0.7,
    cognitive_distortions: ['catastrophizing'],
    agency_score: 4,
    locus_of_control: 'mixed',
    action_orientation: 'intention-stated',
    ownership_score: 5,
    overall_intensity: 0.65,
    self_talk_valence: 'critical',
    resolution_status: 'unresolved',
    coping_response: 'emotion-focused',
    clinical_pattern_flags: {
      repetitive_intrusive_thought: false,
      compulsive_behavior_described: false,
      ego_dystonic_marker: false,
      reassurance_seeking_pattern: false,
      flag_confidence: 0.7,
      recommend_professional_review: false,
    },
    hopelessness_or_self_harm_language: false,
    evidence_explicit: [rawText],
    overall_confidence: 0.7,
  };
}

/**
 * Generate 768-dimension vector embedding for text using gemini-embedding-001 (or fallback)
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const EMBEDDING_MODELS = ['gemini-embedding-001', 'gemini-embedding-2'];

  for (const modelName of EMBEDDING_MODELS) {
    try {
      const response = await getAi().models.embedContent({
        model: modelName,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

      const resAny = response as any;
      const vals = resAny.embedding?.values || resAny.embeddings?.[0]?.values;
      if (Array.isArray(vals) && vals.length === 768) {
        return vals;
      }
    } catch (err) {
      console.warn(`Gemini embedding model ${modelName} call warning:`, err);
    }
  }

  console.error('CRITICAL: Gemini embedding API failed on all models. Generating fallback normalized hash vector for:', text);
  // Deterministic pseudo-random normalized 768-dim float vector based on text hash
  const vec: number[] = new Array(768);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let sumSq = 0;
  for (let i = 0; i < 768; i++) {
    const val = Math.sin(hash + i * 997);
    vec[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

export function isGibberishOrShortNoise(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;

  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length < 3) return true;

  // Single word / token without spaces
  const isSingleWord = !/\s/.test(trimmed);
  if (isSingleWord) {
    const lower = lettersOnly.toLowerCase();

    // 1. Repeating character 3+ times in a row
    if (/(.)\1{2,}/.test(lower)) return true;

    // 2. Common keyboard smash patterns
    const smashPatterns = [
      /asdf|sdfg|dfgh|fghj|ghjk|hjkl|jkl;/,
      /lkjh|kjhg|hgfd|gfda|fdas|dasf|asfs|fsda/,
      /qwer|wert|erty|rtyu|tyui|yuio|uiop/,
      /poiu|oiuy|iuyt|uytr|ytre|trew|rewq/,
      /zxcv|xcvb|cvbn|vbnm|mnbv|nbvc|bvcx|vcxz/,
      /1234|2345|3456|4567|5678|6789|0987|9876|8765|7654|6543|5432|4321/
    ];
    if (smashPatterns.some((pattern) => pattern.test(lower))) return true;

    // 3. 4 or more consecutive consonants (e.g. "sfsd", "fdsf")
    if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(lower)) return true;

    // 4. Low vowel count for single words (length >= 5 and < 25% vowels)
    const vowels = lower.match(/[aeiouy]/g);
    const vowelCount = vowels ? vowels.length : 0;
    if (vowelCount === 0) return true;
    if (lower.length >= 5 && vowelCount / lower.length < 0.25) return true;
  }

  // General check for entire text having no vowels if short
  const allVowels = trimmed.match(/[aeiouyAEIOUY]/g);
  if (!allVowels && trimmed.length < 8) return true;

  return false;
}

function fallbackThirdPersonRephrase(rawText: string): string {
  if (isGibberishOrShortNoise(rawText)) {
    return `"This one didnt make sense🥲:${rawText}"`;
  }

  let cleanText = rawText
    .replace(/\b(hey there|hey|hi)\b/gi, '')
    .replace(/\b(i am|i'm)\b/gi, 'they feel')
    .replace(/\b(i have|i've)\b/gi, 'they hold')
    .replace(/\b(i feel|i felt)\b/gi, 'they feel')
    .replace(/\b(my)\b/gi, 'their')
    .replace(/\b(myself)\b/gi, 'themselves')
    .replace(/\b(me)\b/gi, 'them')
    .replace(/\b(i)\b/gi, 'they')
    .trim();

  cleanText = cleanText.charAt(0).toLowerCase() + cleanText.slice(1);
  if (!cleanText.endsWith('.')) cleanText += '.';

  const prefixes = [
    'They find themselves facing a quiet burden: ',
    'There is an underlying friction: ',
    'A persistent doubt weighs on their mind: ',
    'They are working through an unresolved tension: ',
    'Looking at their current situation, ',
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${cleanText}`;
}

/**
 * Rephrase a raw question into a third-person doubt ("someone/they")
 */
export async function rephraseDoubtToThirdPerson(
  rawText: string,
  profileSummary: string = '',
  similarPastEntries: string[] = []
): Promise<string> {
  if (isGibberishOrShortNoise(rawText)) {
    return `"This one didnt make sense🥲:${rawText}"`;
  }

  const systemInstruction = `You are the Rephrasing Engine for a private self-inquiry app called Self-Haul.

TASK
Rewrite the user's personal question or worry as a short third-person narration, as if describing a stranger who just confessed this exact doubt to you. This is NOT a question. It is a statement, told from the outside, about someone else's experience.

RULES
1. Never use "I" or "you." Use third-person perspectives ("they", "a person", "an individual", "their mind", or direct descriptive phrasing).
2. DIVERSIFY OPENINGS (CRITICAL): DO NOT constantly start with the word "Someone". Vary your sentence starters naturally and dynamically. Use varied grammatical constructs such as:
   - "They find themselves caught..."
   - "There is an underlying dread..."
   - "A persistent doubt lingers around..."
   - "They know what needs to be done, yet..."
   - "A person caught between..."
   - "Watching others advance creates a quiet sting..."
   - "Behind the daily routine lies..."
   - "A heavy friction exists between..."
3. Do not phrase the output as a question. It must be a statement or confession, not an inquiry.
4. Preserve the exact emotional intensity of the original. Do not soften, reassure, or add hope that wasn't there. Do not minimize the feeling.
5. If the original contains specific, concrete details (a job, a person, a decision, a comparison), preserve and reflect those specifics — do not strip them out or generalize them away.
6. If the original is short, vague, or general (e.g. "I'm not feeling well emotionally"), do NOT simply restate it in the same words with the pronouns swapped. Instead, gently elaborate the underlying felt experience in plain, human language without inventing concrete fake events.
7. The rephrase should feel like it says MORE than the original in emotional depth, never LESS.
8. Keep it to 1-3 sentences maximum.
9. Match the register of the input — raw and blunt stays raw and blunt.
10. If PROFILE CONTEXT or SIMILAR PAST ENTRIES are provided, use them only to calibrate tone and phrasing style. Never reference past entries directly inside the output, and never imply continuity ("again," "still," "as before").
11. Output ONLY the rephrased narration. No preamble, no explanation, no quotation marks, no labels, no prefix like "Someone is carrying this doubt:" — return the narration text alone.
12. CRITICAL GIBBERISH RULE: If the original input is random letters, keyboard smash, gibberish, symbols, or non-dictionary noise (e.g. 'df', 'asdf', 'fdasfsda', '123', '???', 'hjkl'), output strictly: "This one didnt make sense🥲:<original_text>"

EXAMPLES

Original: "I am not feeling very well emotionally"
Correct rephrase: "They are going through an unsteadied stretch emotionally, struggling to regain their footing without quite knowing what would actually restore their inner quiet."

Original: "I am very afraid of my career I don't know where to go will I ever get a job or not I have a plan but I am very afraid to follow it due to uncertainty of it because I compare path of others and I wonder if mine is right"
Correct rephrase: "A heavy uncertainty hangs over where their work is heading. They hold a plan in their hands, but paralysis sets in because they constantly measure their trajectory against other people's milestones."

Original: "I keep putting off studying and I feel like a failure"
Correct rephrase: "Every attempt to begin studying collides with immediate procrastination, leaving behind a sharp, self-inflicted sense of falling behind."

Original: "df"
Correct rephrase: "This one didnt make sense🥲:df"`;

  const similarEntriesFormatted = similarPastEntries.length > 0
    ? similarPastEntries.map((e) => `- ${e}`).join('\n')
    : '';

  const prompt = `ORIGINAL:
${rawText}

PROFILE CONTEXT:
${profileSummary}

SIMILAR PAST ENTRIES:
${similarEntriesFormatted}`;

  const FLASH_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  for (const modelName of FLASH_MODELS) {
    try {
      const response = await getAi().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.3,
          systemInstruction,
        },
      });

      const result = response.text?.trim();
      if (result && !result.includes('API key not valid')) {
        return result.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} call warning:`, err);
    }
  }

  return fallbackThirdPersonRephrase(rawText);
}

/**
 * Generate consultant-style gap analysis AI Insight (On-Demand only)
 */
export async function generateInsightGapAnalysis(
  sessionExtractions: any[],
  profileSummary?: string,
  vectorMatches?: any[],
  areaSnapshots?: Record<string, string>
): Promise<string> {
  const prompt = `Act as an elite clinical psychologist and master self-inquiry consultant. Perform a deep, high-leverage psychological gap analysis (100–140 words max) analyzing the user's current session (questions, written answers, and computed deltas) against their life-area snapshots and past RAG history.

Previous Life-Area Snapshots:
${areaSnapshots && Object.keys(areaSnapshots).length > 0 ? JSON.stringify(areaSnapshots, null, 2) : `"${profileSummary || 'Cold start - no previous area snapshots.'}"`}

Current Session Extractions (Question + Written Answer + Deltas):
${JSON.stringify(sessionExtractions, null, 2)}

Relevant Past Vector Matches (RAG Context with Past Doubts & Advice Summaries):
${JSON.stringify(vectorMatches || [], null, 2)}

DIAGNOSTIC SCOPE (Evaluate across all psychological & behavioral dimensions):
- Agency & Locus of Control: External blame, victim framing, or relinquishing choices vs taking personal ownership.
- Insight vs. Action Disconnect: High intellectual understanding or rumination with zero concrete behavioral action steps.
- Defense Mechanisms & Blind Spots: Intellectualization, rationalization, projection, displacement, or subtle emotional avoidance.
- Cognitive Distortions: Catastrophizing, all-or-nothing framing, mind-reading, or mistaking feelings for objective reality.
- Hidden Contradictions: Direct mismatches between what the user claims to want vs the choices/behaviors they describe in their answers.
- Recurring Behavioral Loops: Unaddressed patterns or evasive cycles appearing across past RAG vector matches and current answers.

OUTPUT RULES:
- Identify the SINGLE most critical blind spot, cognitive flaw, or agency gap in their thinking.
- Speak directly, perceptively, and with clinical depth. No therapeutic fluff, preambles, or diagnostic labels (e.g. do not label as "OCD" or "depression").
- Conclude with ONE transformative, high-leverage reframe or targeted self-inquiry question that compels self-reflection and action.
- If overall emotional distress signals are severe, adopt a supportive, stabilizing tone while maintaining psychological honesty.`;

  const INSIGHT_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  for (const modelName of INSIGHT_MODELS) {
    try {
      const response = await getAi().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.3,
          systemInstruction: `You are an elite clinical psychologist and master self-inquiry consultant. You diagnose psychological blind spots, cognitive distortions, agency gaps, and behavioral contradictions with surgical clarity.`,
        },
      });

      if (response.text?.trim()) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn(`Gemini insight model ${modelName} warning:`, err);
    }
  }

  return 'No clear gap pattern identified in this session.';
}

