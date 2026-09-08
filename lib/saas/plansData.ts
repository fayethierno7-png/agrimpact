import { Plan, TokenPack, PlanSlug, FeatureLimitKey } from './types';

// Taux d'équivalence : ~500 tokens par interaction moyenne (contexte agronomique + diagnostic + météo)
export const TOKENS_PER_MESSAGE_ESTIMATE = 500;

export function calculateEstimatedMessages(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.max(1, Math.round(tokens / TOKENS_PER_MESSAGE_ESTIMATE));
}

export const DEFAULT_PLANS: Plan[] = [
  {
    nom: 'Solo',
    slug: 'solo',
    description: 'Le socle agronomique essentiel pour le producteur individuel autonome.',
    prix_mensuel_fcfa: 1490,
    prix_annuel_fcfa: 14300, // Réduction ~20%
    isPopular: false,
    limites: {
      max_exploitations: 1,
      max_parcelles: 3,
      historique_meteo_jours: 7,
      projection_jours: 0, // Observation temps réel
      fenetres_pulverisation_mois: 5,
      max_users: 1,
      alertes_sms_mois: 10,
      tokens_ia_mois: 8000, // ~15 messages
    },
    actif: true,
  },
  {
    nom: 'Pro Producteur',
    slug: 'pro',
    badge: 'Recommandé Producteurs',
    description: 'Le copilote agrométéo et prédictif complet pour sécuriser ses rendements.',
    prix_mensuel_fcfa: 5900,
    prix_annuel_fcfa: 56700, // Réduction ~20%
    isPopular: true,
    limites: {
      max_exploitations: 1,
      max_parcelles: 10,
      historique_meteo_jours: 30,
      projection_jours: 14, // 14 jours de projection
      fenetres_pulverisation_mois: 28,
      max_users: 2,
      alertes_sms_mois: 50,
      tokens_ia_mois: 60000, // ~120 messages
    },
    actif: true,
  },
  {
    nom: 'Coopérative & GIE',
    slug: 'cooperative',
    description: 'La plateforme de pilotage mutualisée pour groupements et unions paysannes.',
    prix_mensuel_fcfa: 49900,
    prix_annuel_fcfa: 479000, // Réduction ~20%
    isPopular: false,
    limites: {
      max_exploitations: 15,
      max_parcelles: 100,
      historique_meteo_jours: 90,
      projection_jours: 21, // 21 jours de projection
      fenetres_pulverisation_mois: 60,
      max_users: 15,
      alertes_sms_mois: 200,
      tokens_ia_mois: 300000, // ~600 messages
    },
    actif: true,
  },
];

export const DEFAULT_TOKEN_PACKS: TokenPack[] = [
  {
    nom: 'Pack Éclair',
    slug: 'eclair',
    prix_fcfa: 490,
    nb_tokens: 5000,
    description: '~10 diagnostics ou conseils instantanés.',
    isPopular: false,
    actif: true,
  },
  {
    nom: 'Pack Récolte',
    slug: 'recolte',
    prix_fcfa: 1990,
    nb_tokens: 25000,
    description: '~50 messages d’analyse agronomique pointue.',
    isPopular: true,
    actif: true,
  },
  {
    nom: 'Pack Saison',
    slug: 'saison',
    prix_fcfa: 4900,
    nb_tokens: 75000,
    description: '~150 consultations complètes sur tout le cycle.',
    isPopular: false,
    actif: true,
  },
];

export const FEATURE_METADATA: Record<
  FeatureLimitKey,
  {
    label: string;
    unit: string;
    formatValue: (val: number) => string;
    getGainMessage: (fromPlan: PlanSlug, toPlan: PlanSlug, plans: Plan[]) => string;
  }
> = {
  parcelles: {
    label: 'Parcelles agricoles',
    unit: 'parcelles',
    formatValue: (v) => `${v} parcelle${v > 1 ? 's' : ''}`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour gérer jusqu'à ${target.limites.max_parcelles} parcelles`;
    },
  },
  exploitations: {
    label: 'Exploitations',
    unit: 'exploitations',
    formatValue: (v) => `${v} exploitation${v > 1 ? 's' : ''}`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[2];
      return `Passez à ${target.nom} pour piloter jusqu'à ${target.limites.max_exploitations} exploitations distinctes`;
    },
  },
  sms: {
    label: 'Alertes météo & ravageurs par SMS',
    unit: 'SMS / mois',
    formatValue: (v) => `${v} alertes SMS / mois`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour recevoir jusqu'à ${target.limites.alertes_sms_mois} alertes SMS par mois`;
    },
  },
  pulverisations: {
    label: 'Fenêtres de pulvérisation',
    unit: 'calculs / mois',
    formatValue: (v) => `${v} fenêtres / mois`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour bénéficier de ${target.limites.fenetres_pulverisation_mois} fenêtres de traitement optimales`;
    },
  },
  utilisateurs: {
    label: 'Comptes collaborateurs',
    unit: 'accès',
    formatValue: (v) => `${v} compte${v > 1 ? 's' : ''}`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour partager l'accès avec ${target.limites.max_users} collaborateurs`;
    },
  },
  projections: {
    label: 'Projection prédictive',
    unit: 'jours',
    formatValue: (v) => (v === 0 ? 'Observation temps réel (0j)' : `${v} jours`),
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour anticiper sur ${target.limites.projection_jours} jours de projection épidémique`;
    },
  },
  historique: {
    label: 'Historique agrométéo',
    unit: 'jours',
    formatValue: (v) => `${v} jours`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      return `Passez à ${target.nom} pour consulter jusqu'à ${target.limites.historique_meteo_jours} jours d'historique`;
    },
  },
  tokens_ia: {
    label: 'Quota assistant agronomique IA',
    unit: 'tokens / mois',
    formatValue: (v) => `${v.toLocaleString('fr-FR')} tokens / mois`,
    getGainMessage: (_from, to, plans) => {
      const target = plans.find((p) => p.slug === to) || plans[1];
      const msgs = calculateEstimatedMessages(target.limites.tokens_ia_mois);
      return `Passez à ${target.nom} pour obtenir ${target.limites.tokens_ia_mois.toLocaleString('fr-FR')} tokens (~${msgs} messages/mois)`;
    },
  },
};

export function getNextPlanSlug(currentPlanNameOrSlug: string): PlanSlug {
  const norm = (currentPlanNameOrSlug || '').toLowerCase();
  if (norm.includes('solo')) return 'pro';
  if (norm.includes('pro')) return 'cooperative';
  return 'cooperative';
}

export function formatPriceFCFA(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
