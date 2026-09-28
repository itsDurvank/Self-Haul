-- ==========================================================
-- SELF-HAUL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) SETUP
-- Paste this script into your Supabase Dashboard SQL Editor & Run
-- ==========================================================

-- 1. Enable pgvector extension for AI embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    moniker TEXT,
    intent TEXT,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    rephrased_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Answers Table
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    answer_analysis JSONB,
    deltas JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Question Analysis (Extracted JSON & pgvector Embeddings)
-- Note: vector(768) matches Gemini text-embedding-004 dimension
CREATE TABLE IF NOT EXISTS public.question_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_json JSONB NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. User Theme Rollups
CREATE TABLE IF NOT EXISTS public.user_theme_rollups (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    count INT DEFAULT 1 NOT NULL,
    avg_agency_score FLOAT DEFAULT 0.0,
    avg_intensity FLOAT DEFAULT 0.0,
    action_taken_count INT DEFAULT 0,
    last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, theme)
);

-- 7. User Trigger Rollups
CREATE TABLE IF NOT EXISTS public.user_trigger_rollups (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    count INT DEFAULT 1 NOT NULL,
    avg_intensity FLOAT DEFAULT 0.0,
    themes_involved TEXT[],
    last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, trigger_type)
);

-- 8. User Summary Snapshots (Long-term profile memory)
CREATE TABLE IF NOT EXISTS public.user_summary_snapshots (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    period_covered TEXT
);

-- 9. User Area Snapshots (Per-life-area snapshots)
CREATE TABLE IF NOT EXISTS public.user_area_snapshots (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    life_domain TEXT NOT NULL,
    snapshot_text TEXT NOT NULL,
    entry_count INT DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, life_domain)
);

-- 10. User AI State (Tracking AI Insight usage)
CREATE TABLE IF NOT EXISTS public.user_ai_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_ever_requested BOOLEAN DEFAULT false NOT NULL,
    last_insight_generated_at TIMESTAMPTZ
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures user data is 100% private & isolated
-- ==========================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_theme_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trigger_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_summary_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_state ENABLE ROW LEVEL SECURITY;

-- Automated User Profile Creation Trigger (Runs as SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, moniker, intent)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'moniker', NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'intent', 'Deep Self-Reflection')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    moniker = EXCLUDED.moniker,
    intent = EXCLUDED.intent,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper RLS Policies for authenticated users (Idempotent with DROP IF EXISTS)
DROP POLICY IF EXISTS "Users access own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users select own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;

CREATE POLICY "Users select own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users access own sessions" ON public.sessions;
CREATE POLICY "Users access own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own questions" ON public.questions;
CREATE POLICY "Users access own questions" ON public.questions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own answers" ON public.answers;
CREATE POLICY "Users access own answers" ON public.answers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own analysis" ON public.question_analysis;
CREATE POLICY "Users access own analysis" ON public.question_analysis FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own theme rollups" ON public.user_theme_rollups;
CREATE POLICY "Users access own theme rollups" ON public.user_theme_rollups FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own trigger rollups" ON public.user_trigger_rollups;
CREATE POLICY "Users access own trigger rollups" ON public.user_trigger_rollups FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own summary" ON public.user_summary_snapshots;
CREATE POLICY "Users access own summary" ON public.user_summary_snapshots FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own ai state" ON public.user_ai_state;
CREATE POLICY "Users access own ai state" ON public.user_ai_state FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- VECTOR SIMILARITY SEARCH FUNCTION (RAG RETRIEVAL)
-- ==========================================================

CREATE OR REPLACE FUNCTION match_question_analysis (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  question_id uuid,
  analysis_json jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Never trust p_user_id as a source of identity. Only auth.uid() counts.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  RETURN QUERY
  SELECT
    qa.id,
    qa.question_id,
    qa.analysis_json,
    1 - (qa.embedding <=> query_embedding) AS similarity
  FROM public.question_analysis qa
  WHERE qa.user_id = auth.uid()
    AND 1 - (qa.embedding <=> query_embedding) > match_threshold
  ORDER BY qa.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
