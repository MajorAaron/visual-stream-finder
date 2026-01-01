import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // No dependencies - only run once

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    // Use BASE_URL to handle GitHub Pages subpath (/visual-stream-finder/)
    const baseUrl = import.meta.env.BASE_URL || '/';
    const redirectUrl = `${window.location.origin}${baseUrl}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      console.error('OAuth sign in error:', error.message);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const redirectUrl = `${window.location.origin}${baseUrl}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('Sign up error:', error.message);
      return { error };
    }
    
    // If user is immediately confirmed (email verification disabled)
    if (data?.user && data?.session) {
      console.log('Account created successfully');
    } else {
      // Fallback for when email verification is enabled
      console.log('Check your email for confirmation link');
    }
    
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error.message);
      return { error };
    }
    
    return { error: null };
  };

  return {
    user,
    session,
    loading,
    signOut,
    signInWithOAuth,
    signUpWithEmail,
    signInWithEmail,
  };
};