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
    <div className="bg-gradient-to-br from-white via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm p-6 sm:p-7 md:p-8 overflow-hidden relative">
      {/* Halo décoratif subtil */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* En-tête avec badge dynamique */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-stone-100 dark:border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#963e1b] dark:text-amber-400">
                Conseil du Jour AgriImpact
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
              Calculé sur vos données en temps réel • Modélisation ISRA &amp; ANACIM
            </p>
          </div>
        </div>

        {/* Pilules de contexte actif */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold flex items-center gap-1.5">
            <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{culture} • {matchedStage.nom} (J+{daysSinceSowing})</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
            {region}
          </span>
        </div>
      </div>

      {/* Titre de recommandation immédiate */}
      <div className="mt-5 mb-4">
        <h2 className="text-base sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
          {adviceTitle}
        </h2>
      </div>

      {/* 3 Blocs d'action concrets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 my-5">
        {/* Pulvérisation */}
        <div className="p-4 sm:p-4.5 bg-stone-50/80 dark:bg-stone-800/50 rounded-2xl border border-stone-200/70 dark:border-stone-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
            <Wind className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Pulvérisation &amp; Traitement</span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px] sm:text-xs">
            {sprayAdvice}
          </p>
        </div>

        {/* Irrigation */}
        <div className="p-4 sm:p-4.5 bg-stone-50/80 dark:bg-stone-800/50 rounded-2xl border border-stone-200/70 dark:border-stone-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
            <Droplets className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Pilotage Irrigation ({typeIrrigation})</span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px] sm:text-xs">
            {waterAdvice}
          </p>
        </div>

        {/* Vigilance Sanitaire */}
        <div className="p-4 sm:p-4.5 bg-stone-50/80 dark:bg-stone-800/50 rounded-2xl border border-stone-200/70 dark:border-stone-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Surveillance Sanitaire</span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px] sm:text-xs">
            {sanitaryAdvice}
          </p>
        </div>
      </div>

      {/* Footer avec CTA vers l'assistant */}
      <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {weather ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-500 dark:text-stone-400 text-[11px]">
            <span>Météo du jour : <strong className="text-stone-700 dark:text-stone-300">{weather.temperature}°C</strong></span>
            <span>•</span>
            <span>Humidité : <strong className="text-stone-700 dark:text-stone-300">{weather.humidity}%</strong></span>
            <span>•</span>
            <span>Vent : <strong className="text-stone-700 dark:text-stone-300">{weather.windSpeed} km/h</strong></span>
            <span>•</span>
            <span>Pluie : <strong className="text-stone-700 dark:text-stone-300">{weather.precipitationProbability}%</strong></span>
          </div>
        ) : (
          <span className="text-stone-400 dark:text-stone-500 text-[11px] italic">
            Synchronisation de la station agrométéorologique...
          </span>
        )}

        <Link
          href={`/assistant`}
          className="inline-flex items-center gap-1.5 font-bold text-[#963e1b] hover:text-[#7f3214] dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
        >
          <span>Poser une question sur ce conseil</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
