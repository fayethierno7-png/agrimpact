import { UserPlan } from '../types';

export interface PlanFeatureLimits {
  maxFarms: number;
  maxPlots: number;
  fullHistoryAccess: boolean;
  advancedAlerts: boolean;
  smsAlerts: boolean;
  multiUsers: boolean;
  exportReports: boolean;
  offlineSync: boolean;
  name: string;
  priceMonthlyCFA: number;
}

export const PLAN_LIMITS: Record<UserPlan, PlanFeatureLimits> = {
  solo: {
    maxFarms: 1,
    maxPlots: 3,
    fullHistoryAccess: false,
    advancedAlerts: false,
    smsAlerts: true,
    multiUsers: false,
    exportReports: false,
    offlineSync: true,
    name: 'Solo',
    priceMonthlyCFA: 1490, // 1 490 FCFA / mois
  },
  pro: {
    maxFarms: 1,
    maxPlots: 10,
    fullHistoryAccess: true,
    advancedAlerts: true,
    smsAlerts: true,
    multiUsers: false,
    exportReports: true,
    offlineSync: true,
    name: 'Pro Producteur',
    priceMonthlyCFA: 5900, // 5 900 FCFA / mois
  },
  cooperative: {
    maxFarms: 15,
    maxPlots: 100,
    fullHistoryAccess: true,
    advancedAlerts: true,
    smsAlerts: true,
    multiUsers: true,
    exportReports: true,
    offlineSync: true,
    name: 'Coopérative & GIE',
    priceMonthlyCFA: 49900, // 49 900 FCFA / mois
  },
  business: {
    maxFarms: 15,
    maxPlots: 100,
    fullHistoryAccess: true,
    advancedAlerts: true,
    smsAlerts: true,
    multiUsers: true,
    exportReports: true,
    offlineSync: true,
    name: 'Coopérative & GIE',
    priceMonthlyCFA: 49900, // Alias pour rétrocompatibilité
  },
  free: {
    maxFarms: 0,
    maxPlots: 0,
    fullHistoryAccess: false,
    advancedAlerts: false,
    smsAlerts: false,
    multiUsers: false,
    exportReports: false,
    offlineSync: false,
    name: 'Aucun forfait actif',
    priceMonthlyCFA: 0,
  },
};

export type FeatureKey =
  | 'multiple_plots'
  | 'multiple_farms'
  | 'full_history'
  | 'advanced_alerts'
  | 'sms_alerts'
  | 'multi_users'
  | 'export_reports';

/**
 * Fonction centrale de contrôle d'accès aux fonctionnalités par plan
 * Utilisable côté serveur (API / Actions) et côté client (UI Badging / Modals)
 */
export function checkPlanAccess(
  userPlan: UserPlan = 'free',
  feature: FeatureKey,
  currentCount?: { farmsCount?: number; plotsCount?: number }
): { allowed: boolean; reason?: string; upgradeRequired?: UserPlan } {
  // Le plan gratuit est supprimé : tout accès aux fonctionnalités requiert un forfait payant
  if (userPlan === 'free') {
    return {
      allowed: false,
      reason: "Aucun forfait actif. Veuillez souscrire à un forfait payant (Solo, Pro ou Coopérative) pour débloquer les fonctionnalités.",
      upgradeRequired: 'solo',
    };
  }

  const limits = PLAN_LIMITS[userPlan];

  switch (feature) {
    case 'multiple_plots':
      if (currentCount && currentCount.plotsCount !== undefined) {
        if (currentCount.plotsCount >= limits.maxPlots) {
          return {
            allowed: false,
            reason: `Votre forfait ${limits.name} est limité à ${limits.maxPlots} parcelle(s).`,
            upgradeRequired: 'pro',
          };
        }
      }
      return { allowed: limits.maxPlots > 1, upgradeRequired: 'pro' };

    case 'multiple_farms':
      if (currentCount && currentCount.farmsCount !== undefined) {
        if (currentCount.farmsCount >= limits.maxFarms) {
          return {
            allowed: false,
            reason: `Votre forfait ${limits.name} est limité à ${limits.maxFarms} exploitation(s).`,
            upgradeRequired: 'business',
          };
        }
      }
      return { allowed: limits.maxFarms > 1, upgradeRequired: 'business' };

    case 'full_history':
      return {
        allowed: limits.fullHistoryAccess,
        reason: limits.fullHistoryAccess ? undefined : 'L\'historique complet est réservé aux membres PRO.',
        upgradeRequired: 'pro',
      };

    case 'advanced_alerts':
      return {
        allowed: limits.advancedAlerts,
        reason: limits.advancedAlerts ? undefined : 'Les alertes phytosanitaires et vigilances avancées sont réservées aux membres PRO.',
        upgradeRequired: 'pro',
      };

    case 'sms_alerts':
      return {
        allowed: limits.smsAlerts,
        reason: limits.smsAlerts ? undefined : 'Les notifications SMS d\'urgence nécessitent un abonnement PRO.',
        upgradeRequired: 'pro',
      };

    case 'multi_users':
      return {
        allowed: limits.multiUsers,
        reason: limits.multiUsers ? undefined : 'L\'accès multi-comptes est réservé au forfait Business.',
        upgradeRequired: 'business',
      };

    case 'export_reports':
      return {
        allowed: limits.exportReports,
        reason: limits.exportReports ? undefined : 'L\'export de rapports agronomiques est réservé aux forfaits Pro & Business.',
        upgradeRequired: 'pro',
      };

    default:
      return { allowed: true };
  }
}
