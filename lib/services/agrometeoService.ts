/**
 * AGRIMPACT — Service Agrométéorologique (Interface Base de Données Supabase & Moteur)
 * 
 * Permet de :
 * 1. Récupérer les paramètres épidémiologiques certifiés (agrometeo_disease_parameters).
 * 2. Exécuter le moteur biophysique sur 14 jours réels (Open-Meteo + formules).
 * 3. Enregistrer et requêter les prédictions, risques journaliers et fenêtres de traitement
 *    dans la base Supabase avec RLS sur les parcelles de l'utilisateur.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  Plot,
  Farm,
  AgrometeoPrediction14d,
  CropDiseaseParameter,
  DailyDiseaseRisk,
  InterventionWindow,
  PlotPredictionSummary,
  FarmAgrometeoSummary,
  VigilanceLevel,
} from '../types';
import { get14DayAgroForecast } from '../weather/openMeteo';
import {
  runAgrometeo14dEngine,
  DEFAULT_DISEASE_PARAMETERS,
} from '../engine/agrometeoPredictionEngine';

const LOCAL_STORAGE_PRED_KEY = 'agrimpact_latest_agrometeo_prediction_';

/**
 * Récupère les paramètres de maladie pour une culture donnée (Supabase ou paramètres par défaut certifiés)
 */
export async function getCropDiseaseParameter(culture: string, customClient?: any): Promise<CropDiseaseParameter> {
  const fallback = DEFAULT_DISEASE_PARAMETERS[culture] || DEFAULT_DISEASE_PARAMETERS.Oignon;
  const db = customClient || supabase;

  if (db) {
    try {
      const { data, error } = await db
        .from('agrometeo_disease_parameters')
        .select('*')
        .eq('culture', culture)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          culture: data.culture,
          maladie_principale: data.maladie_principale,
          pathogene_scientifique: data.pathogene_scientifique,
          temp_min: Number(data.temp_min),
          temp_opt_basse: Number(data.temp_opt_basse),
          temp_opt_haute: Number(data.temp_opt_haute),
          temp_max: Number(data.temp_max),
          humidite_seuil_infection: Number(data.humidite_seuil_infection),
          humidite_optimale: Number(data.humidite_optimale),
          pluie_declenchement_mm: Number(data.pluie_declenchement_mm),
          sensibilite_culture: Number(data.sensibilite_culture),
          rendement_nominal_kg_ha: Number(data.rendement_nominal_kg_ha),
          prix_indicatif_cfa_kg: Number(data.prix_indicatif_cfa_kg),
          description_symptomes: data.description_symptomes,
          methodes_lutte: data.methodes_lutte,
        };
      }
    } catch (err) {
      console.warn('Erreur lecture agrometeo_disease_parameters dans Supabase:', err);
    }
  }

  return fallback;
}

/**
 * Enregistre une prédiction complète à 14 jours dans Supabase
 */
export async function saveAgrometeoPrediction(
  prediction: AgrometeoPrediction14d,
  customClient?: any
): Promise<{ success: boolean; predictionId?: string; error?: string }> {
  // Sauvegarde locale de secours
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_PRED_KEY}${prediction.plot_id}`,
        JSON.stringify(prediction)
      );
    } catch {}
  }

  const db = customClient || supabase;
  if (!db) {
    return { success: true, predictionId: 'local-' + Date.now() };
  }

  try {
    // 1. Insertion de l'en-tête de prédiction
    const { data: headerData, error: headerError } = await db
      .from('agrometeo_14d_predictions')
      .insert({
        plot_id: prediction.plot_id,
        date_debut_horizon: prediction.date_debut_horizon,
        date_fin_horizon: prediction.date_fin_horizon,
        score_risque_global: prediction.score_risque_global,
        niveau_vigilance: prediction.niveau_vigilance,
        jours_a_risque_eleve: prediction.jours_a_risque_eleve,
        pic_risque_date: prediction.pic_risque_date,
        pic_risque_valeur: prediction.pic_risque_valeur,
        stade_phenologique_nom: prediction.yield_simulation.stade_phenologique,
        jours_apres_semis: prediction.yield_simulation.jours_apres_semis,
        facteur_sensibilite_stade: prediction.yield_simulation.facteur_sensibilite_ks,
        perte_rendement_pct: prediction.yield_simulation.perte_rendement_pct,
        perte_rendement_kg: prediction.yield_simulation.perte_rendement_kg,
        perte_financiere_cfa: prediction.yield_simulation.perte_financiere_cfa,
        gain_potentiel_traitement_cfa: prediction.yield_simulation.gain_potentiel_cfa,
        nb_fenetres_optimales: prediction.nb_fenetres_optimales,
        nb_fenetres_favorables: prediction.nb_fenetres_favorables,
        nb_fenetres_interdites: prediction.nb_fenetres_interdites,
        prochaine_fenetre_optimale: prediction.prochaine_fenetre_optimale
          ? new Date().toISOString()
          : null,
        conseil_strategique: prediction.conseil_strategique,
      })
      .select('id')
      .single();

    if (headerError || !headerData) {
      console.warn('Erreur insertion agrometeo_14d_predictions:', headerError);
      return { success: false, error: headerError?.message };
    }

    const predictionId = headerData.id;

    // 2. Insertion des 14 jours détaillés de risque
    const dailyRows = prediction.daily_risks.map((d) => ({
      prediction_id: predictionId,
      plot_id: prediction.plot_id,
      jour_horizon: d.jour_horizon,
      date_jour: d.date_jour,
      temp_min: d.temp_min,
      temp_max: d.temp_max,
      temp_moyenne: d.temp_moyenne,
      humidite_moyenne: d.humidite_moyenne,
      humidite_max: d.humidite_max,
      pluie_somme_mm: d.pluie_somme_mm,
      pluie_probabilite_pct: d.pluie_probabilite_pct,
      vent_vitesse_max_kmh: d.vent_vitesse_max_kmh,
      facteur_thermique: d.facteur_thermique,
      facteur_hygrometrique: d.facteur_hygrometrique,
      facteur_pluie: d.facteur_pluie,
      indice_infection_journalier: d.indice_infection_journalier,
      jours_favorables_consecutifs: d.jours_favorables_consecutifs,
      stade_incubation: d.stade_incubation,
      niveau_vigilance: d.niveau_vigilance,
      alerte_active: d.alerte_active,
      recommandation_courte: d.recommandation_courte,
    }));

    const { error: dailyError } = await db
      .from('agrometeo_daily_disease_risk')
      .insert(dailyRows);

    if (dailyError) {
      console.warn('Erreur insertion agrometeo_daily_disease_risk:', dailyError);
    }

    // 3. Insertion des fenêtres de pulvérisation
    const windowRows = prediction.intervention_windows.map((w) => ({
      prediction_id: predictionId,
      plot_id: prediction.plot_id,
      date_jour: w.date_jour,
      creneau: w.creneau,
      temperature_creneau: w.temperature_creneau,
      humidite_creneau: w.humidite_creneau,
      vitesse_vent_kmh: w.vitesse_vent_kmh,
      pluie_prevue_mm: w.pluie_prevue_mm,
      pluie_probabilite_pct: w.pluie_probabilite_pct,
      aptitude_vent: w.aptitude_vent,
      aptitude_lessivage: w.aptitude_lessivage,
      aptitude_temperature: w.aptitude_temperature,
      score_aptitude_global: w.score_aptitude_global,
      statut_fenetre: w.statut_fenetre,
      justification_technique: w.justification_technique,
    }));

    const { error: windowError } = await db
      .from('agrometeo_intervention_windows')
      .insert(windowRows);

    if (windowError) {
      console.warn('Erreur insertion agrometeo_intervention_windows:', windowError);
    }

    return { success: true, predictionId };
  } catch (err: any) {
    console.error('Erreur sauvegarde prédiction agrométéo:', err);
    return { success: false, error: err?.message || 'Erreur inattendue' };
  }
}

/**
 * Récupère la dernière prédiction agrométéorologique enregistrée pour une parcelle
 */
export async function getLatestAgrometeoPrediction(
  plotId: string,
  customClient?: any
): Promise<AgrometeoPrediction14d | null> {
  const db = customClient || supabase;
  // 1. Tenter la lecture Supabase
  if (db) {
    try {
      const { data: header, error: headerError } = await db
        .from('agrometeo_14d_predictions')
        .select('*')
        .eq('plot_id', plotId)
        .order('date_calcul', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!headerError && header) {
        // Récupérer les détails journaliers
        const { data: dailyRisks } = await db
          .from('agrometeo_daily_disease_risk')
          .select('*')
          .eq('prediction_id', header.id)
          .order('jour_horizon', { ascending: true });

        // Récupérer les fenêtres
        const { data: windows } = await db
          .from('agrometeo_intervention_windows')
          .select('*')
          .eq('prediction_id', header.id)
          .order('date_jour', { ascending: true });

        return {
          id: header.id,
          plot_id: header.plot_id,
          date_calcul: header.date_calcul,
          date_debut_horizon: header.date_debut_horizon,
          date_fin_horizon: header.date_fin_horizon,
          score_risque_global: Number(header.score_risque_global),
          niveau_vigilance: header.niveau_vigilance,
          jours_a_risque_eleve: header.jours_a_risque_eleve,
          pic_risque_date: header.pic_risque_date,
          pic_risque_valeur: header.pic_risque_valeur ? Number(header.pic_risque_valeur) : undefined,
          yield_simulation: {
            culture: '',
            surface_ha: 1.0,
            jours_apres_semis: header.jours_apres_semis,
            stade_phenologique: header.stade_phenologique_nom,
            facteur_sensibilite_ks: Number(header.facteur_sensibilite_stade),
            perte_rendement_pct: Number(header.perte_rendement_pct),
            perte_rendement_kg: Number(header.perte_rendement_kg),
            perte_financiere_cfa: Number(header.perte_financiere_cfa),
            gain_potentiel_cfa: Number(header.gain_potentiel_traitement_cfa),
          },
          nb_fenetres_optimales: header.nb_fenetres_optimales,
          nb_fenetres_favorables: header.nb_fenetres_favorables,
          nb_fenetres_interdites: header.nb_fenetres_interdites,
          prochaine_fenetre_optimale: header.prochaine_fenetre_optimale,
          conseil_strategique: header.conseil_strategique,
          daily_risks: (dailyRisks || []).map((d: any) => ({
            id: d.id,
            prediction_id: d.prediction_id,
            plot_id: d.plot_id,
            jour_horizon: d.jour_horizon,
            date_jour: d.date_jour,
            temp_min: Number(d.temp_min),
            temp_max: Number(d.temp_max),
            temp_moyenne: Number(d.temp_moyenne),
            humidite_moyenne: Number(d.humidite_moyenne),
            humidite_max: Number(d.humidite_max),
            pluie_somme_mm: Number(d.pluie_somme_mm),
            pluie_probabilite_pct: Number(d.pluie_probabilite_pct),
            vent_vitesse_max_kmh: Number(d.vent_vitesse_max_kmh),
            facteur_thermique: Number(d.facteur_thermique),
            facteur_hygrometrique: Number(d.facteur_hygrometrique),
            facteur_pluie: Number(d.facteur_pluie),
            indice_infection_journalier: Number(d.indice_infection_journalier),
            jours_favorables_consecutifs: d.jours_favorables_consecutifs,
            stade_incubation: d.stade_incubation,
            niveau_vigilance: d.niveau_vigilance,
            alerte_active: Boolean(d.alerte_active),
            recommandation_courte: d.recommandation_courte,
          })),
          intervention_windows: (windows || []).map((w: any) => ({
            id: w.id,
            prediction_id: w.prediction_id,
            plot_id: w.plot_id,
            date_jour: w.date_jour,
            creneau: w.creneau,
            temperature_creneau: Number(w.temperature_creneau),
            humidite_creneau: Number(w.humidite_creneau),
            vitesse_vent_kmh: Number(w.vitesse_vent_kmh),
            pluie_prevue_mm: Number(w.pluie_prevue_mm),
            pluie_probabilite_pct: Number(w.pluie_probabilite_pct),
            aptitude_vent: w.aptitude_vent,
            aptitude_lessivage: w.aptitude_lessivage,
            aptitude_temperature: w.aptitude_temperature,
            score_aptitude_global: Number(w.score_aptitude_global),
            statut_fenetre: w.statut_fenetre,
            justification_technique: w.justification_technique,
          })),
        };
      }
    } catch (err) {
      console.warn('Erreur lecture dernière prédiction agrométéo:', err);
    }
  }

  // 2. Repli localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PRED_KEY}${plotId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
  }

  return null;
}

/**
 * Calcule et enregistre une nouvelle prédiction agrométéorologique complète à 14 jours
 * pour une parcelle réelle à partir des coordonnées de sa ferme et de ses caractéristiques culturales.
 */
export async function generateAndSavePlotAgrometeoPrediction(
  plot: Plot,
  latitude: number = 14.7910,
  longitude: number = -16.9256,
  customClient?: any
): Promise<AgrometeoPrediction14d> {
  const db = customClient || supabase;

  // 1. Récupération des paramètres de la culture
  const cropParam = await getCropDiseaseParameter(plot.culture, db);

  // 2. Récupération des prévisions météo réelles sur 14 jours (Open-Meteo)
  const forecast14d = await get14DayAgroForecast(latitude, longitude, plot.id);

  // 3. Exécution du moteur biophysique déterministe
  const prediction = runAgrometeo14dEngine(plot, forecast14d, cropParam);

  // 4. Sauvegarde asynchrone dans Supabase
  await saveAgrometeoPrediction(prediction, db);

  return prediction;
}

/**
 * Récupère une prédiction existante (si fraîche < 6h) ou en calcule dynamiquement une nouvelle
 */
export async function getOrGeneratePlotAgrometeoPrediction(
  plot: Plot,
  latitude: number = 14.7910,
  longitude: number = -16.9256,
  forceRefresh: boolean = false,
  customClient?: any
): Promise<AgrometeoPrediction14d> {
  if (!forceRefresh) {
    const cached = await getLatestAgrometeoPrediction(plot.id, customClient);
    if (cached && cached.date_calcul) {
      const ageHours = (Date.now() - new Date(cached.date_calcul).getTime()) / (1000 * 3600);
      if (ageHours < 6) {
        return cached;
      }
    }
  }

  return generateAndSavePlotAgrometeoPrediction(plot, latitude, longitude, customClient);
}

/**
 * Construit un résumé synthétique de prédiction pour une parcelle
 */
export function buildPlotPredictionSummary(
  plot: Plot,
  prediction: AgrometeoPrediction14d,
  cropParam?: CropDiseaseParameter
): PlotPredictionSummary {
  const yieldSim = prediction.yield_simulation;
  const nominalYield =
    cropParam?.rendement_nominal_kg_ha ||
    (yieldSim.perte_rendement_pct > 0
      ? Math.round(yieldSim.perte_rendement_kg / ((plot.surface_ha || 1) * (yieldSim.perte_rendement_pct / 100)))
      : 25000);
  const indicPrice =
    cropParam?.prix_indicatif_cfa_kg ||
    (yieldSim.perte_rendement_kg > 0
      ? Math.round(yieldSim.perte_financiere_cfa / yieldSim.perte_rendement_kg)
      : 350);

  return {
    plot_id: plot.id,
    nom: plot.nom || 'Parcelle',
    culture: plot.culture,
    surface_ha: Number(plot.surface_ha) || 1.0,
    date_semis: plot.date_semis,
    variete: plot.variete,
    type_irrigation: plot.type_irrigation,
    stade_phenologique: yieldSim.stade_phenologique,
    jours_apres_semis: yieldSim.jours_apres_semis,
    facteur_sensibilite_ks: yieldSim.facteur_sensibilite_ks,
    score_risque_global: prediction.score_risque_global,
    niveau_vigilance: prediction.niveau_vigilance,
    perte_rendement_pct: yieldSim.perte_rendement_pct,
    perte_rendement_kg: yieldSim.perte_rendement_kg,
    perte_financiere_cfa: yieldSim.perte_financiere_cfa,
    gain_potentiel_cfa: yieldSim.gain_potentiel_cfa,
    rendement_nominal_kg_ha: nominalYield,
    prix_indicatif_cfa_kg: indicPrice,
    nb_fenetres_optimales: prediction.nb_fenetres_optimales,
    nb_fenetres_favorables: prediction.nb_fenetres_favorables,
    nb_fenetres_interdites: prediction.nb_fenetres_interdites,
    prochaine_fenetre_optimale: prediction.prochaine_fenetre_optimale,
    conseil_strategique: prediction.conseil_strategique,
  };
}

/**
 * Agrège les prédictions individuelles de parcelles pour former le bilan global de l'exploitation
 * pour la Campagne Agricole 2026.
 */
export function aggregateFarmPredictions(
  farm: Farm,
  plotSummaries: { plot: Plot; prediction: AgrometeoPrediction14d; summary: PlotPredictionSummary }[]
): FarmAgrometeoSummary {
  const totalParcelles = plotSummaries.length;
  const totalSurface = plotSummaries.reduce((sum, item) => sum + (Number(item.plot.surface_ha) || 1.0), 0);

  if (totalParcelles === 0) {
    return {
      farm_id: farm.id,
      farm_nom: farm.nom,
      region: farm.region,
      latitude: farm.latitude,
      longitude: farm.longitude,
      campagne: 'Campagne Agricole 2026',
      date_analyse: new Date().toISOString(),
      total_parcelles: 0,
      total_surface_ha: 0,
      score_sante_global: 100,
      score_risque_moyen: 0,
      niveau_vigilance_global: 'verte',
      perte_rendement_globale_kg: 0,
      exposition_financiere_totale_cfa: 0,
      gain_evitable_total_cfa: 0,
      parcelles_a_risque_critique: 0,
      recommandation_prioritaire:
        "Aucune parcelle enregistrée pour cette exploitation lors de la Campagne Agricole 2026.",
      prochaine_fenetre_favorable: null,
      plots: [],
    };
  }

  // Risque moyen pondéré par la surface de chaque parcelle
  const totalWeightedRisk = plotSummaries.reduce(
    (sum, item) => sum + item.prediction.score_risque_global * (Number(item.plot.surface_ha) || 1.0),
    0
  );
  const scoreRisqueMoyen = Math.round((totalWeightedRisk / (totalSurface || 1)) * 10) / 10;
  const scoreSanteGlobal = Math.max(0, Math.min(100, Math.round(100 - scoreRisqueMoyen)));

  const perteKgTotal = plotSummaries.reduce((sum, item) => sum + item.summary.perte_rendement_kg, 0);
  const perteCfaTotal = plotSummaries.reduce((sum, item) => sum + item.summary.perte_financiere_cfa, 0);
  const gainCfaTotal = plotSummaries.reduce((sum, item) => sum + item.summary.gain_potentiel_cfa, 0);

  // Parcelles en alerte
  const parcellesCritiques = plotSummaries.filter(
    (item) => item.prediction.niveau_vigilance === 'rouge' || item.prediction.niveau_vigilance === 'orange'
  ).length;

  // Niveau de vigilance global
  let globalVigilance: VigilanceLevel = 'verte';
  if (plotSummaries.some((item) => item.prediction.niveau_vigilance === 'rouge')) {
    globalVigilance = 'rouge';
  } else if (plotSummaries.some((item) => item.prediction.niveau_vigilance === 'orange')) {
    globalVigilance = 'orange';
  } else if (plotSummaries.some((item) => item.prediction.niveau_vigilance === 'jaune')) {
    globalVigilance = 'jaune';
  }

  // Recherche de la prochaine fenêtre favorable globale
  let premiereFenetre: FarmAgrometeoSummary['prochaine_fenetre_favorable'] = null;
  for (const item of plotSummaries) {
    const favorableWindow = item.prediction.intervention_windows.find(
      (w) => w.statut_fenetre === 'optimale' || w.statut_fenetre === 'favorable'
    );
    if (favorableWindow) {
      premiereFenetre = {
        date_jour: favorableWindow.date_jour,
        creneau: favorableWindow.creneau,
        statut: favorableWindow.statut_fenetre,
        score: favorableWindow.score_aptitude_global,
      };
      break;
    }
  }

  // Recommandation stratégique globale
  let recommandationPrioritaire = '';
  if (globalVigilance === 'rouge') {
    recommandationPrioritaire = `URGENCE PHYTOSANITAIRE [Campagne 2026] : ${parcellesCritiques} parcelle(s) subissent des conditions hautement infectieuses. Traitement curatif et préventif impératif lors de la prochaine fenêtre favorable.`;
  } else if (globalVigilance === 'orange') {
    recommandationPrioritaire = `VIGILANCE ACCRUE [Campagne 2026] : Risque fongique modéré à élevé détecté sur l'exploitation (${scoreRisqueMoyen}% de risque moyen). Surveillez particulièrement les parcelles au stade de floraison/bulbaison.`;
  } else if (globalVigilance === 'jaune') {
    recommandationPrioritaire = `SURVEILLANCE AGROMÉTÉO [Campagne 2026] : Les parcelles présentent un risque latent. Maintenez le feuillage aéré et inspectez les feuilles basses.`;
  } else {
    recommandationPrioritaire = `CONDITIONS SAINES [Campagne 2026] : Climat favorable sur l'ensemble de l'exploitation. Aucun traitement antifongique requis pour le moment.`;
  }

  return {
    farm_id: farm.id,
    farm_nom: farm.nom,
    region: farm.region,
    latitude: farm.latitude,
    longitude: farm.longitude,
    campagne: 'Campagne Agricole 2026',
    date_analyse: new Date().toISOString(),
    total_parcelles: totalParcelles,
    total_surface_ha: Math.round(totalSurface * 100) / 100,
    score_sante_global: scoreSanteGlobal,
    score_risque_moyen: scoreRisqueMoyen,
    niveau_vigilance_global: globalVigilance,
    perte_rendement_globale_kg: perteKgTotal,
    exposition_financiere_totale_cfa: perteCfaTotal,
    gain_evitable_total_cfa: gainCfaTotal,
    parcelles_a_risque_critique: parcellesCritiques,
    recommandation_prioritaire: recommandationPrioritaire,
    prochaine_fenetre_favorable: premiereFenetre,
    plots: plotSummaries.map((i) => i.summary),
  };
}

/**
 * Calcule le bilan prédictif global d'une exploitation à partir de son identifiant
 * en interrogeant la base de données Supabase et le moteur agrométéo.
 */
export async function getFarmAgrometeoSummary(
  farmId: string,
  options?: {
    customClient?: any;
    forceRefresh?: boolean;
    fallbackFarm?: Farm;
    fallbackPlots?: Plot[];
  }
): Promise<FarmAgrometeoSummary | null> {
  const db = options?.customClient || supabase;

  let farm: Farm | null = options?.fallbackFarm || null;
  let plots: Plot[] = options?.fallbackPlots || [];

  if (db && (!farm || plots.length === 0)) {
    try {
      if (!farm) {
        const { data: farmData, error: farmErr } = await db
          .from('farms')
          .select('*')
          .eq('id', farmId)
          .maybeSingle();
        if (!farmErr && farmData) {
          farm = farmData;
        }
      }

      if (plots.length === 0) {
        const { data: plotsData, error: plotsErr } = await db
          .from('plots')
          .select('*')
          .eq('farm_id', farmId)
          .order('created_at', { ascending: false });
        if (!plotsErr && plotsData && plotsData.length > 0) {
          plots = plotsData;
        }
      }
    } catch (err) {
      console.warn('Erreur récupération ferme/parcelles Supabase:', err);
    }
  }

  if (!farm) {
    return null;
  }

  const plotResults: { plot: Plot; prediction: AgrometeoPrediction14d; summary: PlotPredictionSummary }[] = [];

  for (const plot of plots) {
    try {
      const cropParam = await getCropDiseaseParameter(plot.culture, db);
      const prediction = await getOrGeneratePlotAgrometeoPrediction(
        plot,
        farm.latitude,
        farm.longitude,
        options?.forceRefresh || false,
        db
      );
      const summary = buildPlotPredictionSummary(plot, prediction, cropParam);
      plotResults.push({ plot, prediction, summary });
    } catch (plotErr) {
      console.error(`Erreur calcul prédiction parcelle ${plot.id}:`, plotErr);
    }
  }

  return aggregateFarmPredictions(farm, plotResults);
}

