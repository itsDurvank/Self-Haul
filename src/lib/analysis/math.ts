import { AnswerDeltas } from '../../types/selfhaul.js';

/**
 * Step 3: Math Per Entry (Application Code, No LLM)
 * Formula: delta = answer_value - question_value
 * Null rule: If either side is null, the delta is null. Never convert null to 0.
 */
export function computeDeltas(
  question: any,
  answer: any
): AnswerDeltas {
  const locusMap: Record<string, number> = { internal: 1, mixed: 0, external: -1 };
  const actionMap: Record<string, number> = { 'action-taken': 2, 'intention-stated': 1, 'rumination-only': 0 };
  const selfTalkMap: Record<string, number> = { compassionate: 1, neutral: 0, critical: -1 };
  const resolutionMap: Record<string, number> = { resolved: 2, 'in-progress': 1, unresolved: 0 };
  const copingMap: Record<string, number> = { 'problem-focused': 1, 'emotion-focused': 0, avoidant: -1 };

  const calcDelta = (qVal: number | null | undefined, aVal: number | null | undefined): number | null => {
    if (qVal === null || qVal === undefined || aVal === null || aVal === undefined) {
      return null;
    }
    return aVal - qVal;
  };

  // Extract Question string fields (Flat first, fallback to legacy nested)
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

  // Convert overall_intensity (0-1) to 0-10 scale
  const rawIntensity = typeof question?.overall_intensity === 'number'
    ? question.overall_intensity
    : (typeof question?.emotional_state?.overall_intensity === 'number' ? question.emotional_state.overall_intensity : null);
  const qIntensity = typeof rawIntensity === 'number' ? Math.round(rawIntensity * 10) : null;

  // Agency & Ownership (0-10)
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
