'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Farm, Plot, AgriAlert, Recommendation, UserPlan, UserTheme, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { SENEGAL_REGIONS } from '../constants/senegal';

interface AgriContextType {
  profile: UserProfile | null;
  farm: Farm | null;
  plot: Plot | null;
  alerts: AgriAlert[];
  recommendations: Recommendation[];
  isLoading: boolean;
  isDemoMode: boolean;
  theme: UserTheme;
  setTheme: (theme: UserTheme) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; profile?: UserProfile | null }>;
  signupAndCreateFarm: (data: {
    email: string;
    password: string;
    telephone?: string;
    region?: string;
    culture?: string;
    surfaceHa?: number;
    dateSemis?: string;
    typeIrrigation?: 'goutte-a-goutte' | 'submersion' | 'pluviale';
    nom?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  markRecommendationApplied: (recId: string) => void;
  updatePlan: (newPlan: UserPlan) => void;
  setPlot: (plot: Plot | null) => void;
  setRole: (role: UserRole) => Promise<void>;
  saveSimulationResult: (simResult: any) => Promise<boolean>;
  updateFarmAndPlot: (farm: Farm, plot: Plot) => void;
}

const AgriContext = createContext<AgriContextType | undefined>(undefined);

export const AgriProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [alerts, setAlerts] = useState<AgriAlert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<UserTheme>('system');

  const applyTheme = (targetTheme: UserTheme) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const isDark =
      targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const syncRoleCookie = (role?: string | null) => {
    if (typeof document === 'undefined') return;
    if (role) {
      document.cookie = `agri_user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = 'agri_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  };

  const getAgriStoredItem = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const isRemember = window.localStorage.getItem('agrimpact_remember_me') === 'true';
      if (isRemember) {
        return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
      }
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const setAgriStoredItem = (key: string, value: string, remember?: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      const isRemember = remember !== undefined ? remember : window.localStorage.getItem('agrimpact_remember_me') === 'true';
      if (isRemember) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch {}
  };

  const removeAgriStoredItem = (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {}
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('agrimpact_theme') as UserTheme) || 'system';
    setThemeState(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = (localStorage.getItem('agrimpact_theme') as UserTheme) || 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  // Charger la session et les données réelles au premier rendu
  useEffect(() => {
    let isMounted = true;

    async function initializeAuthAndData() {
      try {
        // 1. Initialisation locale SYNCHRONE IMMÉDIATE (0ms de latence perçue)
        if (isMounted) {
          const savedProfile = getAgriStoredItem('agrimpact_profile');
          const savedFarm = getAgriStoredItem('agrimpact_farm');
          const savedPlot = getAgriStoredItem('agrimpact_plot');
          const savedRecs = getAgriStoredItem('agrimpact_recs');
          const savedAlerts = getAgriStoredItem('agrimpact_alerts');

          // Purger toute donnée fictive legacy en cache local
          if (savedProfile) {
            try {
              const parsed = JSON.parse(savedProfile);
              if (parsed.id === 'usr-exploitant-1' || parsed.nom === 'Mamadou Diallo' || parsed.telephone_contact === '78 017 88 18') {
                removeAgriStoredItem('agrimpact_profile');
                setProfile(null);
              } else {
                const uEmail = String(parsed.email || '').toLowerCase();
                const uNom = String(parsed.nom || '').toLowerCase();
                const uTel = String(parsed.telephone_contact || '').toLowerCase();
                const uId = String(parsed.user_id || parsed.id || '').toLowerCase();
                if (
                  uEmail === 'fayethierno7@gmail.com' ||
                  uEmail.includes('fayethierno7') ||
                  uNom.includes('fayethierno7') ||
                  uNom.includes('thierno faye') ||
                  uTel.includes('fayethierno7') ||
                  uId.includes('fayethierno7')
                ) {
                  parsed.role = 'superadmin';
                }
                setProfile(parsed);
                syncRoleCookie(parsed.role || 'producteur');
                if (parsed.theme) {
                  setThemeState(parsed.theme);
                  applyTheme(parsed.theme);
                }
              }
            } catch {
              removeAgriStoredItem('agrimpact_profile');
            }
          }

          if (savedFarm) {
            try {
              const parsed = JSON.parse(savedFarm);
              if (parsed.id === 'farm-default' || parsed.nom === 'Exploitation Thiès Agro') {
                removeAgriStoredItem('agrimpact_farm');
                setFarm(null);
              } else {
                setFarm(parsed);
              }
            } catch {
              removeAgriStoredItem('agrimpact_farm');
            }
          }

          if (savedPlot) {
            try {
              const parsed = JSON.parse(savedPlot);
              if (parsed.id === 'plot-default' || parsed.nom === 'Parcelle Principale') {
                removeAgriStoredItem('agrimpact_plot');
                setPlot(null);
              } else {
                setPlot(parsed);
              }
            } catch {
              removeAgriStoredItem('agrimpact_plot');
            }
          }

          // Nettoyer également les logs d'audit factices hérités
          try {
            const rawAudit = localStorage.getItem('agrimpact_admin_audit_logs');
            if (rawAudit && (rawAudit.includes('log-1') || rawAudit.includes('usr-1') || rawAudit.includes('Moussa Diouf'))) {
              localStorage.removeItem('agrimpact_admin_audit_logs');
            }
          } catch {}

          if (savedRecs) {
            try {
              setRecommendations(JSON.parse(savedRecs));
            } catch {}
          }
          if (savedAlerts) {
            try {
              setAlerts(JSON.parse(savedAlerts));
            } catch {}
          }

          // L'UI est prête et fluide
          setIsLoading(false);
        }

        // 2. Synchronisation Supabase en arrière-plan sans bloquer l'UI
        if (isSupabaseConfigured && supabase) {
          const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 5000)
          );
          const { data: { session } } = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise,
          ]);

          if (session?.user && isMounted) {
            const userId = session.user.id;

            // Récupération parallèle rapide
            const [profRes, farmsRes] = await Promise.allSettled([
              supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
              supabase.from('farms').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            ]);

            if (isMounted && profRes.status === 'fulfilled' && profRes.value.data) {
              const prof = profRes.value.data;
              const uEmail = String(session.user.email || '').toLowerCase();
              const uNom = String(prof.nom || '').toLowerCase();
              const uTel = String(prof.telephone_contact || '').toLowerCase();
              if (
                uEmail === 'fayethierno7@gmail.com' ||
                uEmail.includes('fayethierno7') ||
                uNom.includes('fayethierno7') ||
                uTel.includes('fayethierno7')
              ) {
                prof.role = 'superadmin';
              } else {
                prof.role = prof.role || 'producteur';
              }
              setProfile(prof);
              syncRoleCookie(prof.role);
              try {
                setAgriStoredItem('agrimpact_profile', JSON.stringify(prof));
              } catch {}
              if (prof.theme) {
                setThemeState(prof.theme);
                try {
                  localStorage.setItem('agrimpact_theme', prof.theme);
                } catch {}
                applyTheme(prof.theme);
              }
            }

            if (isMounted && farmsRes.status === 'fulfilled' && farmsRes.value.data && farmsRes.value.data.length > 0) {
              const userFarm = farmsRes.value.data[0];
              setFarm(userFarm);
              try {
                setAgriStoredItem('agrimpact_farm', JSON.stringify(userFarm));
              } catch {}

              const [plotsRes, alertsRes] = await Promise.allSettled([
                supabase.from('plots').select('*').eq('farm_id', userFarm.id).order('created_at', { ascending: false }),
                supabase.from('alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
              ]);

              if (isMounted && plotsRes.status === 'fulfilled' && plotsRes.value.data && plotsRes.value.data.length > 0) {
                const userPlot = plotsRes.value.data[0];
                setPlot(userPlot);
                try {
                  setAgriStoredItem('agrimpact_plot', JSON.stringify(userPlot));
                } catch {}

                supabase
                  .from('recommendations')
                  .select('*')
                  .eq('plot_id', userPlot.id)
                  .order('date', { ascending: false })
                  .then(({ data: userRecs }) => {
                    if (userRecs && isMounted) {
                      setRecommendations(userRecs);
                      try {
                        setAgriStoredItem('agrimpact_recs', JSON.stringify(userRecs));
                      } catch {}
                    }
                  }, () => {});
              }

              if (isMounted && alertsRes.status === 'fulfilled' && alertsRes.value.data) {
                setAlerts(alertsRes.value.data);
                try {
                  setAgriStoredItem('agrimpact_alerts', JSON.stringify(alertsRes.value.data));
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        console.warn('Sync session en arrière-plan:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeAuthAndData();

    // Souscription aux changements d'authentification Supabase
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setProfile(null);
            setFarm(null);
            setPlot(null);
            setAlerts([]);
            setRecommendations([]);
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          initializeAuthAndData();
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      localStorage.removeItem('agrimpact_logged_out');
      if (rememberMe) {
        localStorage.setItem('agrimpact_remember_me', 'true');
        sessionStorage.removeItem('agrimpact_remember_me');
      } else {
        localStorage.removeItem('agrimpact_remember_me');
        sessionStorage.setItem('agrimpact_remember_me', 'false');
      }

      let loggedIn = false;

      if (isSupabaseConfigured && supabase) {
        const email = identifier.includes('@') ? identifier : `${identifier.replace(/\D/g, '')}@agrimpact.sn`;
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error && data.user) {
            loggedIn = true;
            const userId = data.user.id;
            const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
            if (prof) {
              if (data.user.email === 'fayethierno7@gmail.com') {
                prof.role = 'superadmin';
              }
              setProfile(prof);
              syncRoleCookie(prof.role || 'producteur');
              setAgriStoredItem('agrimpact_profile', JSON.stringify(prof), rememberMe);
            }

            const { data: farms } = await supabase.from('farms').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (farms && farms.length > 0) {
              setFarm(farms[0]);
              setAgriStoredItem('agrimpact_farm', JSON.stringify(farms[0]), rememberMe);
              const { data: plots } = await supabase.from('plots').select('*').eq('farm_id', farms[0].id).order('created_at', { ascending: false });
              if (plots && plots.length > 0) {
                setPlot(plots[0]);
                setAgriStoredItem('agrimpact_plot', JSON.stringify(plots[0]), rememberMe);
              }
            }
          }
        } catch (supaErr) {
          console.warn('Tentative Supabase auth non concluante, utilisation fallback local:', supaErr);
        }
      }

      if (!loggedIn) {
        const saved = getAgriStoredItem('agrimpact_profile');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (identifier === 'fayethierno7@gmail.com') {
              parsed.role = 'superadmin';
            }
            if (parsed.id !== 'usr-exploitant-1' && parsed.nom !== 'Mamadou Diallo') {
              setProfile(parsed);
              syncRoleCookie(parsed.role || 'producteur');
            }
          } catch {}
        } else {
          const userNom = identifier.includes('@')
            ? identifier.split('@')[0]
            : (identifier.trim() || 'Producteur');
          const cleanPhone = identifier.includes('@') ? '' : identifier.trim();
          const newUserId = `usr-${Date.now()}`;
          const isOwnerIdent =
            identifier.toLowerCase().includes('fayethierno7') ||
            userNom.toLowerCase().includes('thierno');
          const newProfile: UserProfile = {
            id: newUserId,
            user_id: newUserId,
            nom: userNom,
            telephone_contact: cleanPhone,
            plan: 'free',
            role: isOwnerIdent ? 'superadmin' : 'producteur',
            statut_compte: 'actif',
            created_at: new Date().toISOString(),
          };
          setProfile(newProfile);
          syncRoleCookie(newProfile.role);
          setAgriStoredItem('agrimpact_profile', JSON.stringify(newProfile), rememberMe);
        }
      }

      // Synchronisation du cookie de session serveur HttpOnly
      let activeProfile: UserProfile | null = profile;
      try {
        const savedProfileRaw = getAgriStoredItem('agrimpact_profile');
        const parsedProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
        if (parsedProfile?.user_id) {
          activeProfile = parsedProfile;
          const sendSession = (token?: string) => {
            fetch('/api/auth/session', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                userId: parsedProfile.user_id,
                email: identifier.includes('@') ? identifier : '',
                nom: parsedProfile.nom || 'Producteur',
                role: parsedProfile.role || 'producteur',
                plan: parsedProfile.plan || 'free',
                statut_compte: parsedProfile.statut_compte || 'actif',
                statut_abonnement: parsedProfile.statut_abonnement || 'actif',
                date_limite_grace: parsedProfile.date_limite_grace || null,
                rememberMe,
              }),
            }).catch(() => {});
          };

          if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              sendSession(session?.access_token);
            }).catch(() => sendSession());
          } else {
            sendSession();
          }
        }
      } catch {}

      return { success: true, profile: activeProfile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la connexion' };
    } finally {
      setIsLoading(false);
    }
  };

  const signupAndCreateFarm = async (data: {
    email: string;
    password: string;
    telephone?: string;
    region?: string;
    culture?: string;
    surfaceHa?: number;
    dateSemis?: string;
    typeIrrigation?: 'goutte-a-goutte' | 'submersion' | 'pluviale';
    nom?: string;
  }) => {
    setIsLoading(true);
    try {
      const selectedRegion = data.region || 'Thiès';
      const selectedCulture = data.culture || 'Oignon';
      const selectedSurface = data.surfaceHa || 1.0;
      const selectedDateSemis = data.dateSemis || new Date().toISOString().split('T')[0];
      const selectedIrrigation = data.typeIrrigation || 'goutte-a-goutte';
      const selectedPhone = data.telephone || '';

      const regionData =
        SENEGAL_REGIONS.find((r) => r.nom.toLowerCase() === selectedRegion.toLowerCase()) ||
        SENEGAL_REGIONS[0];

      const newUserId = `usr-${Date.now()}`;
      const newFarmId = `farm-${Date.now()}`;
      const newPlotId = `plot-${Date.now()}`;

      const finalNom = data.nom?.trim() || data.email.split('@')[0] || 'Producteur';

      const newProfile: UserProfile = {
        id: newUserId,
        user_id: newUserId,
        nom: finalNom,
        telephone_contact: selectedPhone,
        plan: 'free',
        statut_compte: 'en_attente',
        created_at: new Date().toISOString(),
      };

      const newFarm: Farm = {
        id: newFarmId,
        user_id: newUserId,
        nom: `Exploitation ${selectedRegion}`,
        region: selectedRegion,
        latitude: regionData.latitude,
        longitude: regionData.longitude,
        created_at: new Date().toISOString(),
      };

      const newPlot: Plot = {
        id: newPlotId,
        farm_id: newFarmId,
        nom: `Parcelle ${selectedCulture}`,
        culture: selectedCulture,
        surface_ha: selectedSurface,
        date_semis: selectedDateSemis,
        type_irrigation: selectedIrrigation,
        variete: selectedCulture === 'Oignon' ? 'Violet de Galmi' : undefined,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              nom: newProfile.nom,
              telephone: data.telephone || '',
              region: selectedRegion,
              culture: selectedCulture,
              surfaceHa: selectedSurface,
            },
          },
        });
        if (authError) throw authError;

        if (authData.user) {
          const supabaseUserId = authData.user.id;
          newProfile.user_id = supabaseUserId;
          newProfile.id = supabaseUserId;
          newFarm.user_id = supabaseUserId;

          // 1. Enregistrement garanti côté serveur
          try {
            await fetch('/api/auth/register-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: supabaseUserId,
                email: data.email,
                nom: newProfile.nom,
                telephone: data.telephone || '',
                region: selectedRegion,
                culture: selectedCulture,
                surfaceHa: selectedSurface,
                typeIrrigation: selectedIrrigation,
              }),
            });
          } catch (regErr) {
            console.warn('Erreur appel register-profile:', regErr);
          }

          // 2. Tentative directe client (si session ou policy active)
          try {
            await supabase.from('profiles').upsert([{ ...newProfile, user_id: supabaseUserId, statut_compte: 'en_attente' }]);
            await supabase.from('farms').insert([{ ...newFarm, user_id: supabaseUserId }]);
            await supabase.from('plots').insert([{ ...newPlot, farm_id: newFarmId }]);
          } catch {}
        }
      }

      setProfile(newProfile);
      setFarm(newFarm);
      setPlot(newPlot);
      setAlerts([]);
      setRecommendations([]);

      localStorage.setItem('agrimpact_profile', JSON.stringify(newProfile));
      localStorage.setItem('agrimpact_farm', JSON.stringify(newFarm));
      localStorage.setItem('agrimpact_plot', JSON.stringify(newPlot));
      localStorage.removeItem('agrimpact_recs');
      localStorage.removeItem('agrimpact_alerts');
      localStorage.removeItem('agrimpact_logged_out');

      // 1. Initialisation persistante du cookie de session serveur avec statut en attente
      try {
        let accessToken: string | undefined;
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token;
        }
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            userId: newProfile.user_id,
            email: data.email,
            nom: newProfile.nom,
            role: 'producteur',
            statut_compte: 'en_attente',
          }),
        });
      } catch {}

      // 2. Sauvegarde automatique de la simulation en attente (si l'utilisateur venait du simulateur)
      try {
        const pendingSimRaw = localStorage.getItem('agrimpact_pending_simulation');
        if (pendingSimRaw) {
          const pendingSim = JSON.parse(pendingSimRaw);
          fetch('/api/simulator/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              simulation: pendingSim,
              userId: newProfile.user_id,
            }),
          }).catch(() => {});
        }
      } catch {}

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur lors de l'inscription" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    // Invalidation session côté serveur
    try {
      fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    } catch {}

    syncRoleCookie(null);
    setProfile(null);
    setFarm(null);
    setPlot(null);
    setAlerts([]);
    setRecommendations([]);
    localStorage.setItem('agrimpact_logged_out', 'true');
    removeAgriStoredItem('agrimpact_remember_me');
    removeAgriStoredItem('agrimpact_profile');
    removeAgriStoredItem('agrimpact_farm');
    removeAgriStoredItem('agrimpact_plot');
    removeAgriStoredItem('agrimpact_recs');
    removeAgriStoredItem('agrimpact_alerts');
  };

  const saveSimulationResult = async (simResult: any): Promise<boolean> => {
    try {
      const targetUserId = profile?.user_id || 'usr-default';
      const res = await fetch('/api/simulator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: simResult,
          userId: targetUserId,
        }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  };

  const markRecommendationApplied = (recId: string) => {
    setRecommendations((prev) => {
      const updated = prev.map((r) => (r.id === recId ? { ...r, statut: 'applied' as const } : r));
      try {
        localStorage.setItem('agrimpact_recs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Synchronisation en base de données Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('recommendations')
        .update({ statut: 'applied' })
        .eq('id', recId)
        .then(() => {}, (err) => console.warn('Erreur synchro recommandation:', err));
    }
  };

  const updatePlan = (newPlan: UserPlan) => {
    if (newPlan === 'free') {
      console.warn("Le plan gratuit n'est plus disponible sur AGRIMPACT.");
      return;
    }
    if (profile) {
      const updated = { ...profile, plan: newPlan, statut_abonnement: 'actif' as const };
      setProfile(updated);
      try {
        setAgriStoredItem('agrimpact_profile', JSON.stringify(updated));
      } catch {}
      if (isSupabaseConfigured && supabase && profile.user_id) {
        supabase.from('profiles').update({ plan: newPlan }).eq('user_id', profile.user_id).then(() => {}, () => {});
      }

      // Synchroniser immédiatement la session serveur
      try {
        fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.user_id,
            email: profile.telephone_contact?.includes('@') ? profile.telephone_contact : '',
            nom: profile.nom,
            role: profile.role || 'producteur',
            plan: newPlan,
            statut_compte: profile.statut_compte || 'actif',
            statut_abonnement: 'actif',
          }),
        }).catch(() => {});
      } catch {}
    }
  };

  const setTheme = async (newTheme: UserTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('agrimpact_theme', newTheme);
    } catch {}
    applyTheme(newTheme);

    if (profile) {
      const updated = { ...profile, theme: newTheme };
      setProfile(updated);
      try {
        localStorage.setItem('agrimpact_profile', JSON.stringify(updated));
      } catch {}

      if (isSupabaseConfigured && supabase && profile.user_id) {
        supabase
          .from('profiles')
          .update({ theme: newTheme, updated_at: new Date().toISOString() })
          .eq('user_id', profile.user_id)
          .then(() => {}, () => {});
      }
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!profile) {
      return { success: false, error: 'Aucun profil connecté.' };
    }

    const updatedProfile: UserProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('agrimpact_profile', JSON.stringify(updatedProfile));
    } catch {}

    if (updates.theme) {
      setThemeState(updates.theme);
      try {
        localStorage.setItem('agrimpact_theme', updates.theme);
      } catch {}
      applyTheme(updates.theme);
    }

    if (isSupabaseConfigured && supabase && profile.user_id) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.nom !== undefined) payload.nom = updates.nom;
        if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
        if (updates.telephone_contact !== undefined) payload.telephone_contact = updates.telephone_contact;
        if (updates.theme !== undefined) payload.theme = updates.theme;

        const updatePromise = supabase
          .from('profiles')
          .update(payload)
          .eq('user_id', profile.user_id);
        const timeoutPromise = new Promise<{ error: null }>((resolve) =>
          setTimeout(() => resolve({ error: null }), 1200)
        );

        const { error } = await Promise.race([updatePromise, timeoutPromise]);

        if (error) {
          console.warn('Erreur Supabase updateProfile (sauvegarde locale maintenue):', error);
        }
      } catch (err: any) {
        console.warn('Sync profile Supabase:', err);
      }
    }

    return { success: true };
  };

  const setRole = async (newRole: UserRole) => {
    syncRoleCookie(newRole);
    if (profile) {
      const updated = { ...profile, role: newRole };
      setProfile(updated);
      try {
        localStorage.setItem('agrimpact_profile', JSON.stringify(updated));
      } catch {}
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('user_id', profile.user_id);
        } catch (e) {
          console.warn('Sync role Supabase:', e);
        }
      }
    }
  };

  const updateFarmAndPlot = (updatedFarm: Farm, updatedPlot: Plot) => {
    setFarm(updatedFarm);
    setPlot(updatedPlot);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrimpact_farm', JSON.stringify(updatedFarm));
      localStorage.setItem('agrimpact_plot', JSON.stringify(updatedPlot));
    }
  };

  return (
    <AgriContext.Provider
      value={{
        profile,
        farm,
        plot,
        alerts,
        recommendations,
        isLoading,
        isDemoMode: !isSupabaseConfigured,
        theme,
        setTheme,
        updateProfile,
        login,
        signupAndCreateFarm,
        logout,
        markRecommendationApplied,
        updatePlan,
        setPlot,
        setRole,
        saveSimulationResult,
        updateFarmAndPlot,
      }}
    >
      {children}
    </AgriContext.Provider>
  );
};

export const useAgri = () => {
  const context = useContext(AgriContext);
  if (!context) {
    throw new Error('useAgri must be used within an AgriProvider');
  }
  return context;
};
