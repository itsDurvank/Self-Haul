import { createClient } from './client';

export interface UserProfileData {
  fullName: string;
  moniker?: string;
  intent?: string;
}

export async function saveUserProfileToSupabase(userId: string, profile: UserProfileData) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('user_profiles').upsert(
      [
        {
          user_id: userId,
          full_name: profile.fullName,
          moniker: profile.moniker || profile.fullName,
          intent: profile.intent || 'Self-Reflection',
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('Failed to save user profile to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Supabase profile upsert error:', err);
  }
}

export async function getUserProfileFromSupabase(userId: string): Promise<UserProfileData | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name, moniker, intent')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      fullName: data.full_name,
      moniker: data.moniker || data.full_name,
      intent: data.intent,
    };
  } catch (err) {
    console.warn('Supabase get profile error:', err);
    return null;
  }
}

export async function saveQuestionToSupabase(userId: string, rawText: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('questions')
      .insert([
        {
          user_id: userId,
          raw_text: rawText,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to save question to Supabase:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn('Supabase insert question error:', err);
    return null;
  }
}

export async function saveAnswerToSupabase(userId: string, questionId: string, answerText: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('answers').upsert(
      [
        {
          user_id: userId,
          question_id: questionId,
          raw_text: answerText,
        },
      ],
      { onConflict: 'question_id' }
    );

    if (error) {
      console.warn('Failed to save answer to Supabase:', error.message);
    }

    // Trigger asynchronous answer analysis & vector embedding update
    fetch('/api/answer-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answerText, userId }),
    }).catch((e) => console.warn('Answer analysis trigger warning:', e));
  } catch (err) {
    console.warn('Supabase insert answer error:', err);
  }
}
