/**
 * MOTEUR DE RECOMMANDATION AGRONOMIQUE (MVP — règles déterministes)
 * 
 * Croise :
 * 1. Prévisions météorologiques (Pluie, Température, Humidité, Vent)
 * 2. Culture & Stade phénologique (calculé à partir de la date de semis)
 * 3. Type d'irrigation (goutte-à-goutte, submersion, pluviale)
 */

import { CurrentWeatherReport } from '../weather/openMeteo';
import { Plot, Recommendation, AgriAlert } from '../types';
import { CROPS_PRESETS } from '../constants/senegal';

export interface CropStageInfo {
  culture: string;
  variete: string;
  joursDepuisSemis: number;
  cycleTotalJours: number;
  pourcentageCycle: number;
  stadeNom: string;
  stadeDescription: string;
}

/**
 * Déduit le stade de croissance actuel d'une parcelle à partir de sa date de semis
 */
export function calculateCropStage(plot: Plot): CropStageInfo {
  const preset = CROPS_PRESETS[plot.culture] || CROPS_PRESETS.Oignon;
  const dateSemis = new Date(plot.date_semis);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - dateSemis.getTime());
  const joursDepuisSemis = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const cycleTotalJours = preset.dureeCycleJours;
  const pourcentageCycle = Math.min(100, Math.round((joursDepuisSemis / cycleTotalJours) * 100));

  // Trouver le stade correspondant
  const currentStage = preset.stades.find(
    (s) => joursDepuisSemis >= s.debutJour && joursDepuisSemis <= s.finJour
  ) || preset.stades[preset.stades.length - 1];

  return {
    culture: plot.culture,
    variete: plot.variete || preset.varieteDefaut,
    joursDepuisSemis,
    cycleTotalJours,
    pourcentageCycle,
    stadeNom: currentStage.nom,
    stadeDescription: currentStage.description,
  };
}

export interface EngineResult {
  conseilDuJour: Recommendation;
  alerteActive: AgriAlert | null;
  autresConseils: Recommendation[];
}

/**
 * Évalue les règles agronomiques et produit les recommandations personnalisées
 */
export function evaluateAgronomicRules(
  weather: CurrentWeatherReport,
  plot: Plot,
  stage: CropStageInfo
): EngineResult {
  let conseilDuJour: Recommendation;
  let alerteActive: AgriAlert | null = null;
  const autresConseils: Recommendation[] = [];

  // Règle 1 : Pluie imminente/forte (> 60% ou > 15mm) avec irrigation
  if (weather.precipitationProbability >= 60 || weather.precipitationSum >= 15) {
    conseilDuJour = {
      id: 'rec-pluie-irrigation',
      plot_id: plot.id,
      titre: "Reporter le traitement foliaire et suspendre l'irrigation cet après-midi.",
      message:
        'Les fortes précipitations attendues ce soir lessiveraient les produits et les sols ont déjà un taux d’humidité optimal.',
      type: 'irrigation',
      priorite: 'haute',
      statut: 'pending',
      date: new Date().toISOString().split('T')[0],
      temp_c: weather.temperature,
    };

    alerteActive = {
      id: 'alt-pluie-active',
      user_id: 'user',
      plot_id: plot.id,
      titre: 'Pluie torrentielle & vent fort',
      message: `Pluie forte prévue ce soir (${weather.precipitationSum} mm)`,
      type: 'meteo_extreme',
      vigilance: 'orange',
      statut: 'active',
      time_slot: '19h - 22h',
      is_imminent: true,
      impact_direct: `Risque de ruissellement et de submersion des jeunes plants de ${plot.culture.toLowerCase()} et maraîchage.`,
      consignes:
        "Nettoyer les rigoles d'évacuation et couper l'irrigation motorisée dès 18h30.",
      date: new Date().toISOString(),
    };
  }
  // Règle 2 : Température caniculaire (> 35°C) ou fort déficit hygrométrique (Stress Hydrique)
  else if (weather.temperatureMax >= 35 || weather.temperature >= 35 || (weather.temperature >= 32 && weather.humidity <= 35)) {
    conseilDuJour = {
      id: 'rec-canicule',
      plot_id: plot.id,
      titre: 'Protection thermique des sols & stress hydrique',
      message:
        'Paillage recommandé pour maintenir la fraîcheur au sol. Irriguer uniquement très tôt à l\'aube (avant 7h) ou au crépuscule.',
      type: 'alerte_chaleur',
      priorite: 'haute',
      statut: 'pending',
      date: new Date().toISOString().split('T')[0],
      temp_c: weather.temperature,
    };

    alerteActive = {
      id: 'alt-stress-hydrique',
      user_id: 'user',
      plot_id: plot.id,
      titre: 'Alerte Stress Hydrique & Pic Thermique',
      message: `Température élevée (${weather.temperature}°C, max ${weather.temperatureMax}°C) et déficit hygrométrique (${weather.humidity}%)`,
      type: 'secheresse',
      vigilance: (weather.temperature >= 38 || weather.temperatureMax >= 40) ? 'rouge' : 'orange',
      statut: 'active',
      time_slot: '11h - 17h',
      is_imminent: true,
      impact_direct: `Flétrissement foliaire et risque d'avortement floral sur ${plot.culture.toLowerCase()}.`,
      consignes:
        "Compenser par un cycle d'irrigation à la fraîche (avant 07h00 ou après 19h00). Éviter tout arrosage foliaire en plein soleil.",
      date: new Date().toISOString(),
    };
  }
  // Règle 3 : Par défaut selon le stade phénologique
  else {
    conseilDuJour = {
      id: 'rec-stade-normal',
      plot_id: plot.id,
      titre: `Conseil stade ${stage.stadeNom} : gestion de l'eau`,
      message: `En phase de ${stage.stadeNom.toLowerCase()} (${stage.joursDepuisSemis} jours après semis), maintenez une irrigation régulière adaptée au système ${plot.type_irrigation}.`,
      type: 'irrigation',
      priorite: 'normale',
      statut: 'pending',
      date: new Date().toISOString().split('T')[0],
      temp_c: weather.temperature,
    };
  }

  // Conseils agronomiques d'accompagnement personnalisés selon la culture
  autresConseils.push({
    id: `rec-${plot.id}-irrigation-calculee`,
    plot_id: plot.id,
    titre: `Optimisation de l'arrosage (${plot.type_irrigation})`,
    message: `Pour votre culture de ${plot.culture.toLowerCase()} en stade ${stage.stadeNom.toLowerCase()}, appliquez vos cycles d'arrosage aux heures fraîches pour limiter les pertes par évaporation.`,
    type: 'irrigation',
    priorite: 'normale',
    statut: 'pending',
    date: new Date().toISOString().split('T')[0],
    temp_c: weather.temperature,
  });

  autresConseils.push({
    id: `rec-${plot.id}-surveillance`,
    plot_id: plot.id,
    titre: `Surveillance sanitaire & nutrition (${plot.culture})`,
    message: `Contrôle visuel hebdomadaire des parcelles. Privilégiez les apports d'amendements organiques bien mûrs selon les recommandations régionales.`,
    type: 'fertilisation',
    priorite: 'normale',
    statut: 'pending',
    date: new Date().toISOString().split('T')[0],
    temp_c: weather.temperature,
  });

  return {
    conseilDuJour,
    alerteActive,
    autresConseils,
  };
}
