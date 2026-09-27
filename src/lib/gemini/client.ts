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
  "emotional_state": {
    "primary_emotions": [
      { "emotion": "fear|shame|anger|sadness|guilt|confusion|hope|disgust|envy", "intensity": 0.8, "confidence": 0.9 }
    ],
    "overall_intensity": 0.75,
    "valence": -0.6,
    "vulnerability": 0.8
  },
  "situation": {
    "life_domain": "career|relationship|self-worth|family|health|money|identity|other",
    "sub_domain": "short text or null",
    "time_orientation": "past|present|future",
    "uncertainty_level": 0.7,
    "perceived_threat": 0.6
  },
  "trigger": {
    "trigger_type": "social_comparison|rejection_or_criticism|conflict|failure_or_mistake|uncertainty|financial_pressure|health_concern|memory_or_anniversary|isolation|other|null",
    "trigger_source": "self|specific_person|social_media|past_event|anticipated_event|environment|null",
    "trigger_description": "short text or null",
    "confidence": 0.8
  },
  "concern": {
    "stated_concern": "short paraphrase of raw thought",
    "feared_outcome": "short text or null",
    "feared_consequence": "short text or null",
    "underlying_need": "security|acceptance|competence|autonomy|connection|fairness|null",
    "core_concern": "short synthesis"
  },
  "cognitive_state": {
    "certainty": 0.3,
    "perceived_control": 0.4,
    "locus_of_control": "internal|external|mixed|null",
    "self_efficacy": 0.5,
    "rumination": 0.8,
    "catastrophizing": 0.6,
    "cognitive_distortions": ["catastrophizing", "mind-reading", "all-or-nothing"],
    "distortion_confidence": 0.8
  },
  "behavioral_state": {
    "action_orientation": "action-taken|intention-stated|rumination-only|null",
    "avoidance": 0.8,
    "reassurance_seeking": 0.2,
    "coping_response": "problem-focused|emotion-focused|avoidant|none_identified",
    "resolution_status": "unresolved|in-progress|resolved"
  },
  "self_relation": {
    "self_criticism": 0.7,
    "self_blame": 0.6,
    "self_worth_threat": 0.8,
    "comparison": 0.5,
    "self_talk_valence": "compassionate|neutral|critical"
  },
  "gap_indicators": {
    "insight_vs_action_gap": 0.85,
    "responsibility_gap": 0.3,
    "stated_vs_demonstrated_agency": "matches|mismatch|null",
    "victim_framing_flag": false,
    "notes": "short synthesis or null"
  },
  "clinical_pattern_flags": {
    "repetitive_intrusive_thought": false,
    "compulsive_behavior_described": false,
    "ego_dystonic_marker": false,
    "reassurance_seeking_pattern": false,
    "flag_confidence": 0.9,
    "flag_basis": null,
    "recommend_professional_review": false
  },
  "expression": {
    "rawness": 0.8,
    "directness": 0.85,
    "urgency": 0.7,
    "formality": 0.1
  },
  "recurrence": {
    "signal": "new|echoes_past_entry|repeated_unresolved",
    "matched_entry_ids": []
  },
  "evidence": {
    "explicit": ["direct quotes from original input"],
    "inferred": ["reasoned conclusions"]
  },
  "overall_confidence": 0.85
}

DO NOT invent facts; use null or 0 if evidence is lacking. Output ONLY the valid JSON object.`;

/**
 * Extract structured psychological analysis JSON from raw text using Gemini Flash models with fallbacks
 */
export async function extractQuestionAnalysis(rawText: string, entryId?: string): Promise<ExtractedAnalysis> {
  const prompt = `Analyze the following user raw thought/doubt: "${rawText}"`;
  const EXTRACTION_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];

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
      if (parsed && typeof parsed === 'object' && parsed.emotional_state) {
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
    emotional_state: {
      primary_emotions: [{ emotion: isCareer ? 'fear' : 'sadness', intensity: 0.65, confidence: 0.7 }],
      overall_intensity: 0.65,
      valence: -0.4,
      vulnerability: 0.7,
    },
    situation: {
      life_domain: isCareer ? 'career' : isRelationship ? 'relationship' : 'self-worth',
      sub_domain: 'self-inquiry',
      time_orientation: 'present',
      uncertainty_level: 0.7,
      perceived_threat: 0.5,
    },
    trigger: {
      trigger_type: 'uncertainty',
      trigger_source: 'self',
      trigger_description: rawText,
      confidence: 0.7,
    },
    concern: {
      stated_concern: rawText,
      feared_outcome: 'Uncertain future or lack of clarity',
      feared_consequence: 'Continued distress',
      underlying_need: 'security',
      core_concern: 'Seeking clarity and agency',
    },
    cognitive_state: {
      certainty: 0.3,
      perceived_control: 0.4,
      locus_of_control: 'mixed',
      self_efficacy: 0.5,
      rumination: 0.7,
      catastrophizing: 0.4,
      cognitive_distortions: ['catastrophizing'],
      distortion_confidence: 0.6,
    },
    behavioral_state: {
      action_orientation: 'intention-stated',
      avoidance: 0.6,
      reassurance_seeking: 0.3,
      coping_response: 'emotion-focused',
      resolution_status: 'unresolved',
    },
    self_relation: {
      self_criticism: 0.6,
      self_blame: 0.5,
      self_worth_threat: 0.6,
      comparison: 0.4,
      self_talk_valence: 'critical',
    },
    gap_indicators: {
      insight_vs_action_gap: 0.7,
      responsibility_gap: 0.3,
      stated_vs_demonstrated_agency: 'mismatch',
      victim_framing_flag: false,
      notes: 'Dynamic fallback extraction used due to API failure.',
    },
    clinical_pattern_flags: {
      repetitive_intrusive_thought: false,
      compulsive_behavior_described: false,
      ego_dystonic_marker: false,
      reassurance_seeking_pattern: false,
      flag_confidence: 0.7,
      flag_basis: null,
      recommend_professional_review: false,
    },
    expression: {
      rawness: 0.7,
      directness: 0.7,
      urgency: 0.6,
      formality: 0.1,
    },
    recurrence: {
      signal: 'new',
      matched_entry_ids: [],
    },
    evidence: {
      explicit: [rawText],
      inferred: ['User expresses self-doubt and seeks clarity.'],
    },
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

function fallbackThirdPersonRephrase(rawText: string): string {
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

  cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  if (!cleanText.endsWith('.')) cleanText += '.';

  return `Someone is processing a quiet burden: ${cleanText.toLowerCase().replace(/^they /, 'they ')}`;
}

/**
 * Rephrase a raw question into a third-person doubt ("someone/they")
 */
export async function rephraseDoubtToThirdPerson(
  rawText: string,
  profileSummary: string = '',
  similarPastEntries: string[] = []
): Promise<string> {
  const systemInstruction = `You are the Rephrasing Engine for a private self-inquiry app called Self-Haul.

TASK
Rewrite the user's personal question or worry as a short third-person narration, as if describing a stranger who just confessed this exact doubt to you. This is NOT a question. It is a statement, told from the outside, about someone else's experience.

RULES
1. Never use "I" or "you." Use "someone," "a person," "they," or "them."
2. Do not phrase the output as a question. It must be a statement or confession, not an inquiry.
3. Preserve the exact emotional intensity of the original. Do not soften, reassure, or add hope that wasn't there. Do not minimize the feeling.
4. If the original contains specific, concrete details (a job, a person, a decision, a comparison), preserve and reflect those specifics — do not strip them out or generalize them away.
5. If the original is short, vague, or general (e.g. "I'm not feeling well emotionally"), do NOT simply restate it in the same words with the pronouns swapped. Instead, gently elaborate the underlying felt experience in plain, human language — what it might mean to be struggling to process emotions, searching for steadiness, or wanting peace — without inventing concrete facts (no fake job, no fake person, no fake event) that were never stated or implied.
6. The rephrase should feel like it says MORE than the original in emotional depth, never LESS. A rephrase that is just as thin as the input has failed, even if it's technically accurate.
7. Keep it to 2-3 sentences maximum.
8. Match the register of the input — raw and blunt stays raw and blunt; it should not become clinical or overly poetic unless the original was.
9. If PROFILE CONTEXT or SIMILAR PAST ENTRIES are provided, use them only to calibrate tone and phrasing style. Never reference past entries directly inside the output, and never imply continuity ("again," "still," "as before").
10. Output ONLY the rephrased narration. No preamble, no explanation, no quotation marks, no labels, no prefix like "Someone is carrying this doubt:" — return the narration text alone.

EXAMPLES

Original: "I am not feeling very well emotionally"
Failed rephrase (too thin, just restates): "Someone is not feeling very well emotionally."
Correct rephrase: "Someone is going through a hard stretch emotionally, struggling to steady themselves, and isn't quite sure what would actually bring them back to a sense of peace."

Original: "I am very afraid of my career I don't know where to go will I ever get a job or not I have a plan but I am very afraid to follow it due to uncertainty of it because I compare path of others and I wonder if mine is right"
Correct rephrase: "Someone is afraid of where their career is heading. They have a plan, but they can't bring themselves to follow it, because they keep measuring it against everyone else's path and wondering if theirs was ever the right one."`;

  const similarEntriesFormatted = similarPastEntries.length > 0
    ? similarPastEntries.map((e) => `- ${e}`).join('\n')
    : '';

  const prompt = `ORIGINAL:
${rawText}

PROFILE CONTEXT:
${profileSummary}

SIMILAR PAST ENTRIES:
${similarEntriesFormatted}`;

  const FLASH_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];

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
  sessionExtractions: ExtractedAnalysis[],
  profileSummary?: string
): Promise<string> {
  const prompt = `Generate an 'AI Insight' consultant-style gap analysis (under 150 words) based on the current session's structured extractions.

Profile Memory So Far:
"${profileSummary || 'Cold start - no previous summary profile.'}"

Current Session Extractions (JSON):
${JSON.stringify(sessionExtractions, null, 2)}

Rules:
1. Identify the SINGLE highest-leverage gap (e.g. insight without action, external blame despite available agency, repeated unresolved concern).
2. State the gap plainly without therapeutic softening or clinical/diagnostic jargon.
3. End with ONE direct reframe or targeted question.
4. If emotional distress/hopelessness signals are high across entries, adopt a supportive tone instead of confrontation.`;

  const INSIGHT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest'];

  for (const modelName of INSIGHT_MODELS) {
    try {
      const response = await getAi().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.4,
          systemInstruction: `You are a direct, insightful self-inquiry consultant. Output concise, impactful gap analysis.`,
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

