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
  questions: Question[];
  queue: string[]; // Shuffled question IDs
  currentIndex: number;
  soundOn: boolean;
  user: UserSession | null;
}
