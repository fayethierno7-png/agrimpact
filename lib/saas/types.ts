export interface PlanLimits {
  max_exploitations: number;
  max_parcelles: number;
  historique_meteo_jours: number;
  projection_jours: number;
  fenetres_pulverisation_mois: number;
  max_users: number;
  alertes_sms_mois: number;
  tokens_ia_mois: number;
}

export type PlanSlug = 'solo' | 'pro' | 'cooperative';

export interface Plan {
  id?: string;
  nom: string;
  slug: PlanSlug;
  badge?: string;
  isPopular?: boolean;
  description: string;
  prix_mensuel_fcfa: number;
  prix_annuel_fcfa: number;
  limites: PlanLimits;
  actif?: boolean;
}

export interface TokenPack {
  id?: string;
  nom: string;
  slug: 'eclair' | 'recolte' | 'saison';
  prix_fcfa: number;
  nb_tokens: number;
  description?: string;
  isPopular?: boolean;
  actif?: boolean;
}

export interface TokenWalletData {
  quota_mensuel_initial: number;
  tokens_quota_restants: number;
  tokens_achetes_permanents: number;
  tokens_total_disponibles: number;
  date_renouvellement_quota?: string; // ISO string
}

export type FeatureLimitKey =
  | 'parcelles'
  | 'exploitations'
  | 'sms'
  | 'pulverisations'
  | 'utilisateurs'
  | 'projections'
  | 'historique'
  | 'tokens_ia';
