export type UserPlan = 'solo' | 'pro' | 'cooperative' | 'business' | 'free';
export type UserTheme = 'light' | 'dark' | 'system';
export type UserRole = 'producteur' | 'admin' | 'superadmin';
export type AccountStatus = 'actif' | 'suspendu' | 'en_attente';

export interface UserProfile {
  id: string;
  user_id: string;
  nom: string;
  telephone_contact: string;
  plan: UserPlan;
  avatar_url?: string | null;
  theme?: UserTheme;
  role?: UserRole;
  statut_compte?: AccountStatus;
  created_at: string;
}

export interface Farm {
  id: string;
  user_id: string;
  nom: string;
  region: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export type IrrigationType = 'goutte-a-goutte' | 'submersion' | 'pluviale';

export interface Plot {
  id: string;
  farm_id: string;
  nom: string;
  culture: string;
  surface_ha: number;
  date_semis: string; // YYYY-MM-DD
  type_irrigation: IrrigationType;
  variete?: string;
  created_at: string;
}

export interface WeatherCache {
  id: string;
  plot_id: string;
  temperature: number;
  pluie_pct: number;
  humidite: number;
  vent: number;
  date: string;
  raw_json?: any;
  created_at: string;
}

export type RecommendationType = 'irrigation' | 'traitement' | 'fertilisation' | 'alerte_chaleur' | 'sanitaire';
export type RecommendationPriority = 'basse' | 'normale' | 'haute' | 'urgente';
export type RecommendationStatus = 'pending' | 'applied' | 'dismissed';

export interface Recommendation {
  id: string;
  plot_id: string;
  titre: string;
  message: string;
  type: RecommendationType;
  priorite: RecommendationPriority;
  statut: RecommendationStatus;
  date: string;
  temp_c?: number;
  created_at?: string;
}

export type AlertType = 'meteo_extreme' | 'ravageur' | 'secheresse' | 'inondation';
export type VigilanceLevel = 'verte' | 'jaune' | 'orange' | 'rouge';
export type AlertStatus = 'active' | 'resolved' | 'past';

export interface AgriAlert {
  id: string;
  user_id: string;
  plot_id?: string;
  titre: string;
  message: string;
  type: AlertType;
  vigilance: VigilanceLevel;
  statut: AlertStatus;
  impact_direct?: string;
  consignes?: string;
  date: string;
  time_slot?: string;
  is_imminent?: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: UserPlan;
  statut: 'active' | 'canceled' | 'expired' | 'past_due';
  provider: 'wave' | 'orange_money' | 'manual';
  provider_subscription_id?: string;
  montant_cfa: number;
  expires_at?: string;
  created_at: string;
}

export type ReportType =
  | 'recommandation_incorrecte'
  | 'bug_technique'
  | 'donnee_meteo_incorrecte'
  | 'autre';

export type ReportStatus = 'nouveau' | 'en_cours' | 'resolu';

export interface UserReport {
  id: string;
  user_id: string;
  type: ReportType;
  description: string;
  statut: ReportStatus;
  admin_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
  user_nom?: string;
}

// Console Admin & Finances
export type PeriodType = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

export interface PeriodFilterValue {
  period: PeriodType;
  startDate: string; // ISO String
  endDate: string; // ISO String
  label: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan: UserPlan;
  statut: 'active' | 'annule' | 'expire';
  montant: number;
  devise: string;
  date_debut: string;
  date_fin?: string | null;
  created_at: string;
  user_nom?: string;
  user_phone?: string;
}

export interface PaymentData {
  id: string;
  subscription_id?: string | null;
  user_id?: string | null;
  montant: number;
  statut: 'reussi' | 'echoue' | 'rembourse';
  methode: 'wave' | 'orange_money' | 'carte' | 'autre';
  created_at: string;
  remboursement_montant?: number | null;
  remboursement_date?: string | null;
  user_nom?: string;
  user_phone?: string;
  plan?: UserPlan;
}

export interface AuditLogEntry {
  id: string;
  admin_id?: string | null;
  admin_nom: string;
  action: string;
  cible_type: 'user' | 'payment' | 'report' | 'subscription' | 'autre';
  cible_id: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export type ConversionEventType =
  | 'inscription'
  | 'exploitation_creee'
  | 'premier_conseil_vu'
  | 'abonnement_souscrit';

export interface ConversionEvent {
  id: string;
  user_id?: string | null;
  type_event: ConversionEventType;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue (MRR * 12)
  churnRate: number; // Churn %
  ltv: number; // Lifetime Value (ARPU * average lifetime)
  activeSubscriptionsCount: number;
  totalRevenuePeriod: number;
  chartData: { date: string; amount: number; count: number }[];
}

export interface FunnelStep {
  key: ConversionEventType;
  title: string;
  description: string;
  count: number;
  conversionFromPrevious: number; // %
  conversionFromFirst: number; // %
  dropoffRate: number; // %
}

// ==========================================================
// Moteur de Prédiction Agrométéorologique (Mildiou 14j & Rendement)
// ==========================================================

export interface CropDiseaseParameter {
  id: string;
  culture: string;
  maladie_principale: string;
  pathogene_scientifique: string;
  temp_min: number;
  temp_opt_basse: number;
  temp_opt_haute: number;
  temp_max: number;
  humidite_seuil_infection: number;
  humidite_optimale: number;
  pluie_declenchement_mm: number;
  sensibilite_culture: number;
  rendement_nominal_kg_ha: number;
  prix_indicatif_cfa_kg: number;
  description_symptomes?: string;
  methodes_lutte?: string;
}

export type IncubationStage =
  | 'dormant'
  | 'germination'
  | 'incubation_active'
  | 'sporulation_imminente'
  | 'invasion';

export interface DailyDiseaseRisk {
  id?: string;
  prediction_id?: string;
  plot_id: string;
  jour_horizon: number; // 1 to 14
  date_jour: string; // YYYY-MM-DD
  temp_min: number;
  temp_max: number;
  temp_moyenne: number;
  humidite_moyenne: number;
  humidite_max: number;
  pluie_somme_mm: number;
  pluie_probabilite_pct: number;
  vent_vitesse_max_kmh: number;
  facteur_thermique: number;
  facteur_hygrometrique: number;
  facteur_pluie: number;
  indice_infection_journalier: number; // 0 to 100
  jours_favorables_consecutifs: number;
  stade_incubation: IncubationStage;
  niveau_vigilance: VigilanceLevel;
  alerte_active: boolean;
  recommandation_courte: string;
}

export type InterventionSlotType = 'matin_06h_10h' | 'apres_midi_16h_19h';
export type InterventionStatus = 'optimale' | 'favorable' | 'delicate' | 'interdite';

export interface InterventionWindow {
  id?: string;
  prediction_id?: string;
  plot_id: string;
  date_jour: string; // YYYY-MM-DD
  creneau: InterventionSlotType;
  temperature_creneau: number;
  humidite_creneau: number;
  vitesse_vent_kmh: number;
  pluie_prevue_mm: number;
  pluie_probabilite_pct: number;
  aptitude_vent: 'optimale' | 'limite' | 'trop_fort_interdit';
  aptitude_lessivage: 'sec_optimal' | 'risque_moyen' | 'lessivage_imminent_interdit';
  aptitude_temperature: 'optimale' | 'trop_frais' | 'trop_chaud_brulure_interdit';
  score_aptitude_global: number; // 0 to 100
  statut_fenetre: InterventionStatus;
  justification_technique: string;
}

export interface YieldImpactSimulation {
  culture: string;
  surface_ha: number;
  jours_apres_semis: number;
  stade_phenologique: string;
  facteur_sensibilite_ks: number;
  perte_rendement_pct: number;
  perte_rendement_kg: number;
  perte_financiere_cfa: number;
  gain_potentiel_cfa: number;
}

export interface AgrometeoPrediction14d {
  id?: string;
  plot_id: string;
  date_calcul: string;
  date_debut_horizon: string;
  date_fin_horizon: string;
  score_risque_global: number;
  niveau_vigilance: VigilanceLevel;
  jours_a_risque_eleve: number;
  pic_risque_date?: string;
  pic_risque_valeur?: number;
  yield_simulation: YieldImpactSimulation;
  nb_fenetres_optimales: number;
  nb_fenetres_favorables: number;
  nb_fenetres_interdites: number;
  prochaine_fenetre_optimale?: string;
  conseil_strategique: string;
  daily_risks: DailyDiseaseRisk[];
  intervention_windows: InterventionWindow[];
}

export interface PlotPredictionSummary {
  plot_id: string;
  nom: string;
  culture: string;
  surface_ha: number;
  date_semis: string;
  variete?: string;
  type_irrigation: IrrigationType;
  stade_phenologique: string;
  jours_apres_semis: number;
  facteur_sensibilite_ks: number;
  score_risque_global: number;
  niveau_vigilance: VigilanceLevel;
  perte_rendement_pct: number;
  perte_rendement_kg: number;
  perte_financiere_cfa: number;
  gain_potentiel_cfa: number;
  rendement_nominal_kg_ha: number;
  prix_indicatif_cfa_kg: number;
  nb_fenetres_optimales: number;
  nb_fenetres_favorables: number;
  nb_fenetres_interdites: number;
  prochaine_fenetre_optimale?: string;
  conseil_strategique: string;
}

export interface FarmAgrometeoSummary {
  farm_id: string;
  farm_nom: string;
  region: string;
  latitude: number;
  longitude: number;
  campagne: string; // "Campagne Agricole 2026"
  date_analyse: string;
  total_parcelles: number;
  total_surface_ha: number;
  score_sante_global: number; // 0-100 (100 = sain, 0 = sévèrement menacé)
  score_risque_moyen: number; // 0-100 (risque épidémique moyen)
  niveau_vigilance_global: VigilanceLevel;
  perte_rendement_globale_kg: number;
  exposition_financiere_totale_cfa: number;
  gain_evitable_total_cfa: number;
  parcelles_a_risque_critique: number;
  recommandation_prioritaire: string;
  prochaine_fenetre_favorable?: {
    date_jour: string;
    creneau: InterventionSlotType;
    statut: InterventionStatus;
    score: number;
  } | null;
  plots: PlotPredictionSummary[];
}

export interface SimulatorInput {
  region: string;
  culture: string;
  stadeNom: string;
  surfaceHa?: number;
  typeIrrigation?: IrrigationType;
}

export interface SimulatorResult {
  situation: {
    region: string;
    culture: string;
    stadeNom: string;
    stadeDescription: string;
    meteo: {
      temperature: number;
      precipitationProbability: number;
      precipitationSum: number;
      humidity: number;
      windSpeed: number;
      conditionText: string;
    };
  };
  analyse: {
    besoinEau: 'faible' | 'moyen' | 'eleve';
    stressHydriqueRisque: 'faible' | 'modere' | 'critique';
    risqueFongique: 'faible' | 'modere' | 'eleve';
    economieEauEstimeeM3: number;
  };
  recommandation: {
    actionTitre: string;
    actionMessage: string;
    creneauConseille: string;
    priorite: 'normale' | 'haute' | 'urgente';
  };
  explication: {
    facteursCles: string[];
    justification: string;
  };
  disclaimer: string;
  timestamp: string;
}

export interface SimulationRecord {
  id: string;
  user_id?: string;
  region: string;
  culture: string;
  surface_ha: number;
  type_irrigation: IrrigationType;
  stade_nom: string;
  result_data: SimulatorResult;
  created_at: string;
}
