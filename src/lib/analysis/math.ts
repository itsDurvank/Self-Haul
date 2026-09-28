import { ExtractedQuestionAnalysis, ExtractedAnswerAnalysis, AnswerDeltas } from '@/types/selfhaul';

/**
 * Step 3: Math Per Entry (Application Code, No LLM)
 * Formula: delta = answer_value - question_value
 * Null rule: If either side is null, the delta is null. Never convert null to 0.
 */
export function computeDeltas(
  question: ExtractedQuestionAnalysis,
  answer: ExtractedAnswerAnalysis
): AnswerDeltas {
  // Conversions for question string fields to numerical values
  const locusMap: Record<string, number> = { internal: 1, mixed: 0, external: -1 };
  const actionMap: Record<string, number> = { 'action-taken': 2, 'intention-stated': 1, 'rumination-only': 0 };
  const selfTalkMap: Record<string, number> = { compassionate: 1, neutral: 0, critical: -1 };
  const resolutionMap: Record<string, number> = { resolved: 2, 'in-progress': 1, unresolved: 0 };
  const copingMap: Record<string, number> = { 'problem-focused': 1, 'emotion-focused': 0, avoidant: -1 };

  // Helper for computing delta safely
  const calcDelta = (qVal: number | null | undefined, aVal: number | null | undefined): number | null => {
    if (qVal === null || qVal === undefined || aVal === null || aVal === undefined) {
      return null;
    }
    return aVal - qVal;
  };

  // Convert question string fields
  const qLocus = question.locus_of_control ? locusMap[question.locus_of_control] ?? null : null;
  const qAction = question.action_orientation ? actionMap[question.action_orientation] ?? null : null;
  const qSelfTalk = question.self_talk_valence ? selfTalkMap[question.self_talk_valence] ?? null : null;
  const qResolution = question.resolution_status ? resolutionMap[question.resolution_status] ?? null : null;
  const qCoping = question.coping_response ? copingMap[question.coping_response] ?? null : null;

  // Convert overall_intensity (0-1) to 0-10 scale
  const qIntensity = typeof question.overall_intensity === 'number'
    ? question.overall_intensity * 10
    : (typeof (question as any).emotional_state?.overall_intensity === 'number'
      ? (question as any).emotional_state.overall_intensity * 10
      : null);

  // Agency & Ownership (already 0-10)
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
