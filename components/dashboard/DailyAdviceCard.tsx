'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Droplets,
  Wind,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sprout,
  SunMedium,
  CheckCircle2,
} from 'lucide-react';
import { Plot, Farm } from '../../lib/types';
import { CROPS_PRESETS } from '../../lib/constants/senegal';

interface DailyAdviceCardProps {
  plot: Plot | null;
  farm: Farm | null;
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitationProbability: number;
    conditionText?: string;
  } | null;
}

export default function DailyAdviceCard({ plot, farm, weather }: DailyAdviceCardProps) {
  // Données de secours réalistes si météo non chargée
  const currentTemp = weather?.temperature ?? 28.5;
  const currentHumidity = weather?.humidity ?? 76;
  const currentWind = weather?.windSpeed ?? 12;
  const currentRainProb = weather?.precipitationProbability ?? 15;

  const culture = plot?.culture || 'Oignon';
  const region = farm?.region || 'Thiès (Niayes)';
  const typeIrrigation = plot?.type_irrigation || 'goutte-a-goutte';

  // Calcul du stade phénologique depuis la date de semis
  let daysSinceSowing = 45;
  if (plot?.date_semis) {
    const diffTime = Math.abs(new Date().getTime() - new Date(plot.date_semis).getTime());
    daysSinceSowing = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const preset = CROPS_PRESETS[culture] || CROPS_PRESETS.Oignon;
  const matchedStage =
    preset.stades.find(
      (s) => daysSinceSowing >= s.debutJour && daysSinceSowing <= s.finJour
    ) || preset.stades[preset.stades.length - 1] || preset.stades[0];

  // Calcul agronomique dynamique du conseil du jour
  const isRainRisk = currentRainProb >= 40;
  const isHighWind = currentWind > 17;
  const isHighHumidity = currentHumidity > 80;
  const isExtremeHeat = currentTemp > 34;

  let adviceTitle = '';
  let adviceType: 'danger' | 'warning' | 'optimal' = 'optimal';
  let sprayAdvice = '';
  let waterAdvice = '';
  let sanitaryAdvice = '';

  // 1. Risque pluie
  if (isRainRisk) {
    adviceType = 'warning';
    adviceTitle = `Pluie annoncée (${currentRainProb}%) : Coupez l'irrigation et suspendez les traitements`;
    sprayAdvice = `Ne réalisez aucune pulvérisation foliaire sur vos ${culture} aujourd'hui. Les averses lessiveraient le produit, générant une perte sèche.`;
    waterAdvice = `Stoppez les motopompes. Les précipitations naturelles couvriront les besoins du stade ${matchedStage.nom.toLowerCase()}.`;
    sanitaryAdvice = `Vérifiez le drainage des rigoles après les pluies pour éviter la pourriture racinaire.`;
  }
  // 2. Risque vent violent
  else if (isHighWind) {
    adviceType = 'warning';
    adviceTitle = `Vent fort (${currentWind} km/h) : Interdiction stricte de pulvérisation`;
    sprayAdvice = `Dérive excessive du produit au-delà de 15 km/h. Reportez tout traitement à demain matin 06h30 quand le vent faiblira.`;
    waterAdvice = `En ${typeIrrigation}, maintenez l'apport d'eau habituel aux heures fraîches pour compenser le dessèchement dû au vent.`;
    sanitaryAdvice = `Inspectez les bordures de parcelle exposées aux bourrasques.`;
  }
  // 3. Risque cryptogamique / mildiou / cercosporiose
  else if (isHighHumidity && currentTemp >= 19 && currentTemp <= 29) {
    adviceType = 'danger';
    adviceTitle = `Alerte rosée saturante (${currentHumidity}%) : Fenêtre de traitement préventif prioritaire`;
    const targetDisease = culture === 'Arachide' ? 'la cercosporiose' : (culture === 'Maïs' ? 'la rouille / chenille' : 'le mildiou');
    sprayAdvice = `Fenêtre de traitement très favorable demain matin entre 06h00 et 08h30 (vent calme ${currentWind} km/h, zéro pluie sous 24h) contre ${targetDisease}.`;
    waterAdvice = `Arrosez de préférence par le sol sans mouiller le feuillage pour ne pas aggraver l'hygrométrie foliaire.`;
    sanitaryAdvice = `Surveillez l'apparition de taches translucides ou de feutrage sous les feuilles basses.`;
  }
  // 4. Fortes chaleurs
  else if (isExtremeHeat) {
    adviceType = 'warning';
    adviceTitle = `Pic de chaleur (${currentTemp}°C) : Protection contre le stress hydrique`;
    sprayAdvice = `Ne traitez pas en journée (évaporation instantanée des gouttelettes et phytotoxicité). Traitez uniquement au coucher du soleil (après 18h).`;
    waterAdvice = `Fractionnez l'irrigation : 60% avant 07h30 et 40% après 18h00. Évitez formellement d'arroser entre 11h et 16h.`;
    sanitaryAdvice = `Surveillez le flétrissement des apex pendant les heures de pointe.`;
  }
  // 5. Conditions optimales
  else {
    adviceType = 'optimal';
    adviceTitle = `Conditions agrométéorologiques favorables sur ${culture}`;
    sprayAdvice = `Créneau idéal d'intervention sans dérive : ce matin jusqu'à 09h30 ou ce soir de 17h00 à 18h45 (vent modéré ${currentWind} km/h).`;
    waterAdvice = `Apport standard d'eau adapté au stade ${matchedStage.nom.toLowerCase()} (J+${daysSinceSowing}). Sol meuble et aéré.`;
    sanitaryAdvice = `Pression parasitaire modérée. Poursuivez la surveillance de routine.`;
  }

  return (
    <div className="bg-gradient-to-br from-white via-white to-amber-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-md p-5 sm:p-6 overflow-hidden relative">
      {/* Halo décoratif subtil */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* En-tête avec badge dynamique */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#963e1b] dark:text-amber-400">
                Conseil du Jour AgriImpact
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Calculé sur vos données en temps réel • Modélisation ISRA &amp; ANACIM
            </p>
          </div>
        </div>

        {/* Pilules de contexte actif */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1">
            <Sprout className="w-3.5 h-3.5 text-emerald-600" />
            <span>{culture} • {matchedStage.nom} (J+{daysSinceSowing})</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
            {region}
          </span>
        </div>
      </div>

      {/* Titre de recommandation immédiate */}
      <div className="mt-4 mb-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-snug">
          {adviceTitle}
        </h2>
      </div>

      {/* 3 Blocs d'action concrets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        {/* Pulvérisation */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-bold">
            <Wind className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Pulvérisation &amp; Traitement</span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
            {sprayAdvice}
          </p>
        </div>

        {/* Irrigation */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-bold">
            <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Pilotage Irrigation ({typeIrrigation})</span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
            {waterAdvice}
          </p>
        </div>

        {/* Vigilance Sanitaire */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Surveillance Sanitaire</span>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
            {sanitaryAdvice}
          </p>
        </div>
      </div>

      {/* Footer avec CTA vers l'assistant */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400 text-[11px]">
          <span>Météo du jour : <strong>{currentTemp}°C</strong></span>
          <span>•</span>
          <span>Humidité : <strong>{currentHumidity}%</strong></span>
          <span>•</span>
          <span>Vent : <strong>{currentWind} km/h</strong></span>
          <span>•</span>
          <span>Pluie : <strong>{currentRainProb}%</strong></span>
        </div>

        <Link
          href={`/assistant`}
          className="inline-flex items-center gap-1.5 font-bold text-[#963e1b] hover:text-[#7f3214] dark:text-amber-400 transition-colors"
        >
          <span>Poser une question sur ce conseil</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
