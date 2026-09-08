import { supabase, isSupabaseConfigured } from '../supabase/client';
import { UserReport, ReportType } from '../types';

export const REPORT_TYPE_LABELS: Record<ReportType, { label: string; icon: string; desc: string }> = {
  recommandation_incorrecte: {
    label: 'Recommandation incorrecte',
    icon: '🌾',
    desc: 'Un conseil d\'irrigation, traitement ou fertilisation inadapté à votre culture.',
  },
  donnee_meteo_incorrecte: {
    label: 'Donnée météo incorrecte',
    icon: '🌦️',
    desc: 'Pluie constatée non annoncée, température ou vent très différents de la réalité.',
  },
  bug_technique: {
    label: 'Bug technique / Affichage',
    icon: '⚙️',
    desc: 'Bouton inactif, problème d\'affichage ou lenteur inhabituelle.',
  },
  autre: {
    label: 'Autre remarque',
    icon: '💬',
    desc: 'Suggestion d\'amélioration, question générale ou retour d\'expérience.',
  },
};

export const REPORT_STATUS_LABELS = {
  nouveau: {
    label: 'Nouveau',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Signalement reçu, en attente de prise en charge par un agronome.',
  },
  en_cours: {
    label: 'En cours d\'analyse',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Signalement en cours de vérification par notre équipe technique ou ANACIM.',
  },
  resolu: {
    label: 'Résolu',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Analyse terminée, correctif appliqué ou réponse apportée.',
  },
};

// Helper timeout rapide (1200ms) pour ne pas bloquer l'UI
async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs = 1200): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout signalements')), timeoutMs)
    ),
  ]);
}

/**
 * Créer un nouveau signalement
 */
export async function createReport(params: {
  userId: string;
  type: ReportType;
  description: string;
}): Promise<{ success: boolean; report?: UserReport; error?: string }> {
  const trimmed = params.description.trim();
  if (!trimmed || trimmed.length < 10) {
    return { success: false, error: 'La description doit comporter au moins 10 caractères.' };
  }

  const newReport: UserReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: params.userId,
    type: params.type,
    description: trimmed,
    statut: 'nouveau',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await withTimeout<any>(
        supabase
          .from('reports')
          .insert([
            {
              user_id: params.userId,
              type: params.type,
              description: trimmed,
              statut: 'nouveau',
            },
          ])
          .select()
          .single(),
        1500
      );

      if (!error && data) {
        saveReportLocally(data);
        return { success: true, report: data };
      }
    } catch (err: any) {
      console.warn('Erreur insertion Supabase report (sauvegarde locale appliquée):', err);
    }
  }

  // Mode local fallback
  saveReportLocally(newReport);
  return { success: true, report: newReport };
}

/**
 * Récupérer tous les signalements de l'utilisateur (instantané avec cache local)
 */
export async function getUserReports(userId: string): Promise<{
  success: boolean;
  reports: UserReport[];
  error?: string;
}> {
  const localReports = getLocalReports(userId);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await withTimeout<any>(
        supabase
          .from('reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        1200
      );

      if (!error && data) {
        try {
          localStorage.setItem(`agrimpact_reports_${userId}`, JSON.stringify(data));
        } catch {}
        return { success: true, reports: data };
      }
    } catch (err: any) {
      console.warn('Sync Supabase getUserReports (utilisation cache local):', err);
    }
  }

  return { success: true, reports: localReports };
}

function saveReportLocally(report: UserReport) {
  try {
    const key = `agrimpact_reports_${report.user_id}`;
    const existing = getLocalReports(report.user_id);
    const updated = [report, ...existing.filter((r) => r.id !== report.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

function getLocalReports(userId: string): UserReport[] {
  try {
    const raw = localStorage.getItem(`agrimpact_reports_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
