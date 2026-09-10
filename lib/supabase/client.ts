import { createClient, SupabaseClient, SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

/**
 * Adaptateur de stockage hybride pour Supabase Auth :
 * - Si "Rester connecté" est activé (agrimpact_remember_me === 'true'), utilise localStorage (persistant plusieurs semaines).
 * - Si "Rester connecté" n'est pas coché, utilise sessionStorage (détruit à la fermeture du navigateur).
 */
const dynamicAuthStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const isRemember = window.localStorage.getItem('agrimpact_remember_me') === 'true';
      if (isRemember) {
        return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      }
      return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const isRemember = window.localStorage.getItem('agrimpact_remember_me') === 'true';
      if (isRemember) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: dynamicAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Crée un client Supabase serveur avec le header d'authentification de la requête
 */
export function getSupabaseServerClient(authHeader?: string | null): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cleanHeader = authHeader?.trim();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: cleanHeader ? { Authorization: cleanHeader } : {},
    },
  });
}
