import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  displayName: string | null;
  onboardingCompletedAt: string | null;
  interestAreas: string[];
}

interface AuthState {
  session: Session | null;
  initialized: boolean;
  profile: Profile | null;
  profileLoaded: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns whether Supabase requires email confirmation before the session is created. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  resendVerificationEmail: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (interestAreas: string[]) => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, onboarding_completed_at, interest_areas')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    displayName: (data.display_name as string | null) ?? null,
    onboardingCompletedAt: (data.onboarding_completed_at as string | null) ?? null,
    interestAreas: (data.interest_areas as string[] | null) ?? [],
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  initialized: false,
  profile: null,
  profileLoaded: false,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;

    let profile: Profile | null = null;
    if (currentSession) {
      profile = await fetchProfile(currentSession.user.id);
    }

    set({
      session: currentSession,
      initialized: true,
      profile,
      profileLoaded: true,
    });

    // Listen for subsequent auth changes (sign in, sign out — not the initial session).
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return;

      set({ session: newSession, profileLoaded: false });

      if (newSession) {
        const p = await fetchProfile(newSession.user.id);
        set({ profile: p, profileLoaded: true });
      } else {
        set({ profile: null, profileLoaded: true });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    // When email confirmation is enabled, Supabase returns a user but no session.
    // The session arrives later via onAuthStateChange once the user confirms.
    return { needsConfirmation: !data.session };
  },

  resendVerificationEmail: async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
  },

  verifyEmailOtp: async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) throw new Error(error.message);
    // On success, onAuthStateChange fires SIGNED_IN → _layout.tsx routes to onboarding.
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  completeOnboarding: async (interestAreas) => {
    const { session } = get();
    if (!session) return;

    const now = new Date().toISOString();

    await supabase
      .from('profiles')
      .update({
        onboarding_completed_at: now,
        interest_areas: interestAreas,
      })
      .eq('id', session.user.id);

    set(state => ({
      profile: state.profile
        ? { ...state.profile, onboardingCompletedAt: now, interestAreas }
        : null,
    }));
  },
}));
