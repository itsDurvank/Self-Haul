export type AppStage = 'landing' | 'login' | 'onboarding' | 'dump' | 'ready' | 'portal' | 'answer' | 'reflection';

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  moniker?: string;
  intent?: string;
}

export interface Question {
  id: string;
  text: string;
  createdAt: number;
  answer?: string;
  answeredAt?: number;
  skipped?: boolean;
  rephrasedText?: string;
}

export interface AppState {
  stage: AppStage;
  sessionId?: string;
  questions: Question[];
  queue: string[]; // Shuffled question IDs
  currentIndex: number;
  soundOn: boolean;
  user: UserSession | null;
}

export interface ExtractedQuestionAnalysis {
  input?: {
    raw_text: string;
    entry_id?: string;
    timestamp?: string;
  };
  life_domain?: string;
  stated_concern?: string;
  core_concern?: string | null;
  primary_emotion?: string;
  emotion_intensity?: number;
  trigger_type?: string | null;
  trigger_description?: string | null;
  trigger_confidence?: number | null;
  cognitive_distortions?: string[];
  agency_score?: number | null;
  locus_of_control?: 'internal' | 'mixed' | 'external' | null;
  action_orientation?: 'action-taken' | 'intention-stated' | 'rumination-only' | null;
  ownership_score?: number | null;
  overall_intensity?: number;
  self_talk_valence?: 'compassionate' | 'neutral' | 'critical' | null;
  resolution_status?: 'unresolved' | 'in-progress' | 'resolved' | null;
  coping_response?: 'problem-focused' | 'emotion-focused' | 'avoidant' | null;
  clinical_pattern_flags?: {
    repetitive_intrusive_thought?: boolean | null;
    compulsive_behavior_described?: boolean | null;
    ego_dystonic_marker?: boolean | null;
    reassurance_seeking_pattern?: boolean | null;
    flag_confidence?: number;
    recommend_professional_review?: boolean;
  };
  hopelessness_or_self_harm_language?: boolean;
  evidence_explicit?: string[];
  overall_confidence?: number;
}

export interface ExtractedAnswerAnalysis {
  agency_score: number | null;
  locus_of_control: -1 | 0 | 1 | null;
  action_orientation: 0 | 1 | 2;
  action_specificity: 0 | 1 | 2;
  ownership_score: number | null;
  emotional_intensity: number;
  self_talk_valence: -1 | 0 | 1;
  resolution_status: 0 | 1 | 2;
  coping_orientation: -1 | 0 | 1;
  engaged_with_prompt: boolean;
  answer_summary: string;
  evidence_explicit: string[];
}

export interface AnswerDeltas {
  agency_delta: number | null;
  locus_delta: number | null;
  action_delta: number | null;
  ownership_delta: number | null;
  intensity_delta: number | null;
  self_talk_delta: number | null;
  resolution_delta: number | null;
  coping_delta: number | null;
  action_specificity: number;
  engaged_with_prompt: boolean;
}
