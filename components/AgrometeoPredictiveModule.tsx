'use client';

import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Check,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Droplets,
  Wind,
  Sun,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { Plot, AgrometeoPrediction14d, PlotPredictionSummary, DailyDiseaseRisk } from '../lib/types';

interface AgrometeoPredictiveModuleProps {
  plot: Plot | null;
  latitude: number;
  longitude: number;
  hasApplied: boolean;
  onApply: () => void;
  conseilFallback?: { titre: string; message: string } | null;
  onPredictionSync?: (data: {
    niveau_vigilance: string;
    alertText?: string;
    conseilStrategique?: string;
  }) => void;
}

export function AgrometeoPredictiveModule({
  plot,
  latitude,
  longitude,
  hasApplied,
  onApply,
  conseilFallback,
  onPredictionSync,
}: AgrometeoPredictiveModuleProps) {
  const gradientId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<AgrometeoPrediction14d | null>(null);
  const [summary, setSummary] = useState<PlotPredictionSummary | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'chart' | 'details' | 'windows'>('chart');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chargement des données réelles de l'API backend
  const fetchPrediction = useCallback(async (force: boolean = false) => {
    if (!plot) {
      setLoading(false);
      return;
    }

    try {
      if (force) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch('/api/agrometeo/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot,
          latitude,
          longitude,
          forceRefresh: force,
        }),
      });

      const json = await response.json();

      if (json.success && json.prediction) {
        setPrediction(json.prediction);
        setSummary(json.summary);

        // Synchroniser le niveau de vigilance et les alertes vers le dashboard parent
        if (onPredictionSync) {
          const highRiskDay = json.prediction.daily_risks?.find(
            (d: DailyDiseaseRisk) => d.alerte_active
          );
          onPredictionSync({
            niveau_vigilance: json.prediction.niveau_vigilance,
            alertText: highRiskDay
              ? `Indice d'infection fongique à ${highRiskDay.indice_infection_journalier}% le ${highRiskDay.date_jour} (${highRiskDay.stade_incubation.replace('_', ' ')}). ${json.prediction.yield_simulation?.perte_rendement_pct ? `Perte projetée : ${json.prediction.yield_simulation.perte_rendement_pct}%.` : ''}`
              : undefined,
            conseilStrategique: json.prediction.conseil_strategique,
          });
        }

        // Sélectionner par défaut le jour avec le plus grand risque ou le pic
        if (json.prediction.daily_risks && json.prediction.daily_risks.length > 0) {
          let maxIdx = 0;
          let maxVal = -1;
          json.prediction.daily_risks.forEach((d: DailyDiseaseRisk, idx: number) => {
            if (d.indice_infection_journalier > maxVal) {
              maxVal = d.indice_infection_journalier;
              maxIdx = idx;
            }
          });
          // Si le risque aujourd'hui ou demain est significatif, pointer dessus, sinon laisser sur le pic
          setSelectedDayIndex(maxIdx > 3 && json.prediction.daily_risks[0].indice_infection_journalier >= 40 ? 0 : maxIdx);
        }
      } else {
        throw new Error(json.error || 'Erreur lors du calcul prédictif.');
      }
    } catch (err: any) {
      console.error('Erreur module prédictif:', err);
      setError(err?.message || 'Impossible de charger la modélisation agrométéorologique.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [plot, latitude, longitude, onPredictionSync]);

  useEffect(() => {
    fetchPrediction(false);

    // Rafraîchissement automatique toutes les 15 minutes pour synchronisation quasi temps-réel
    autoRefreshRef.current = setInterval(() => fetchPrediction(true), 15 * 60 * 1000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchPrediction]);

  if (!plot) {
    return null;
  }

  // Couleurs selon le niveau de vigilance
  const vigilance = prediction?.niveau_vigilance || 'jaune';
  const vigilanceConfig = {
    verte: {
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      borderCard: 'border-emerald-600/40 dark:border-emerald-700/50',
      dotColor: 'bg-emerald-500',
      gradientStart: '#10b981',
      gradientStop: '#059669',
      strokeColor: '#059669',
      label: 'Vigilance Verte (Risque Faible)',
      icon: ShieldCheck,
    },
    jaune: {
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      borderCard: 'border-amber-500/50 dark:border-amber-600/50',
      dotColor: 'bg-amber-500',
      gradientStart: '#f59e0b',
      gradientStop: '#d97706',
      strokeColor: '#d97706',
      label: 'Vigilance Jaune (Risque Modéré)',
      icon: AlertTriangle,
    },
    orange: {
      badgeBg: 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800',
      borderCard: 'border-orange-500/60 dark:border-orange-600/60',
      dotColor: 'bg-orange-500',
      gradientStart: '#f97316',
      gradientStop: '#ea580c',
      strokeColor: '#ea580c',
      label: 'Vigilance Orange (Risque Élevé)',
      icon: AlertTriangle,
    },
    rouge: {
      badgeBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      borderCard: 'border-rose-600/70 dark:border-rose-700/70',
      dotColor: 'bg-rose-600',
      gradientStart: '#f43f5e',
      gradientStop: '#e11d48',
      strokeColor: '#e11d48',
      label: 'Vigilance Rouge (Urgence Sanitaire)',
      icon: ShieldAlert,
    },
  }[vigilance];

  const dailyRisks = prediction?.daily_risks || [];
  const selectedDay = dailyRisks[selectedDayIndex] || dailyRisks[0];

  // Fenêtres associées au jour sélectionné
  const selectedDayWindows = (prediction?.intervention_windows || []).filter(
    (w) => w.date_jour === selectedDay?.date_jour
  );

  // Estimation du ROI du traitement (Gain évitable vs Coût moyen traitement préventif au Sénégal ~35 000 FCFA/ha)
  const coutTraitementEstime = Math.round((plot.surface_ha || 1) * 35000);
  const gainCfa = summary?.gain_potentiel_cfa || 0;
  const roiRatio = coutTraitementEstime > 0 ? (gainCfa / coutTraitementEstime).toFixed(1) : '3.8';

  // Calcul des coordonnées du graphique SVG interactif (600x170)
  const chartWidth = 600;
  const chartHeight = 160;
  const paddingX = 25;
  const paddingBottom = 25;
  const paddingTop = 15;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const points = dailyRisks.map((d, i) => {
    const x = paddingX + (i / Math.max(1, dailyRisks.length - 1)) * usableWidth;
    const clampedY = Math.max(0, Math.min(100, d.indice_infection_journalier));
    const y = paddingTop + usableHeight - (clampedY / 100) * usableHeight;
    return { x, y, risk: d.indice_infection_journalier, date: d.date_jour, day: d.jour_horizon };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x},${pt.y}`;
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
      }, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${paddingTop + usableHeight} L ${points[0].x},${paddingTop + usableHeight} Z`
    : '';

  return (
    <div
      className={`p-6 sm:p-7 md:p-8 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm relative transition-all duration-200`}
    >
      {/* 1. EN-TÊTE DU MODULE PRÉDICTIF */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            ANALYSE PRÉDICTIVE 14J • CAMPAGNE 2026
          </span>
          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${vigilanceConfig.badgeBg}`}
          >
            <span className={`w-2 h-2 rounded-full ${vigilanceConfig.dotColor} animate-pulse`} />
            {vigilanceConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPrediction(true)}
            disabled={isRefreshing || loading}
            title="Recalculer les prévisions à partir des dernières données satellites"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold hidden sm:inline-block">
            Modèle Biophysique FAO
          </span>
        </div>
      </div>

      {/* Titre & Sous-titre Culture */}
      <div className="mb-5">
        <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-snug">
          {loading ? (
            <span className="inline-block w-64 h-6 bg-stone-200 dark:bg-stone-800 animate-pulse rounded" />
          ) : (
            `Diagnostic d'exposition : ${summary?.nom || plot.nom} (${plot.culture}${plot.variete ? ` - ${plot.variete}` : ''})`
          )}
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1">
          {summary ? (
            <>
              Stade phénologique : <strong className="text-stone-900 dark:text-stone-100">{summary.stade_phenologique}</strong> • J+{summary.jours_apres_semis} après semis • Surface : <strong>{summary.surface_ha} ha</strong> ({plot.type_irrigation})
            </>
          ) : (
            'Calcul des projections de risque épidémique et de pertes de récolte...'
          )}
        </p>
      </div>

      {/* 2. BANDEAU DE RENTABILITÉ & ROI (4 INDICATEURS CLÉS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Métrique 1 : Perte de rendement projetée */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Perte Projetée</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {loading ? '...' : `-${summary?.perte_rendement_pct ?? 0}%`}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              soit <strong className="text-stone-700 dark:text-stone-300">{summary?.perte_rendement_kg?.toLocaleString('fr-FR') ?? 0} kg</strong> menacés
            </div>
          </div>
        </div>

        {/* Métrique 2 : Exposition financière brute */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Risque Financier</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
              BRUT
            </span>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {loading ? '...' : `${summary?.perte_financiere_cfa?.toLocaleString('fr-FR') ?? 0} F`}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              Cours indicatif : {summary?.prix_indicatif_cfa_kg ?? 350} FCFA/kg
            </div>
          </div>
        </div>

        {/* Métrique 3 : Gain évitable (Marge nette sauvée) */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <span>Gain Évitable</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
              {loading ? '...' : `+${summary?.gain_potentiel_cfa?.toLocaleString('fr-FR') ?? 0} F`}
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              82% de la récolte préservée
            </div>
          </div>
        </div>

        {/* Métrique 4 : Ratio ROI ou Fenêtres optimales */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Efficacité & ROI</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-baseline gap-1">
              <span>x{roiRatio}</span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">ROI traitement</span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              {summary?.nb_fenetres_optimales ?? 0} créneau(x) optimal(ux)
            </div>
          </div>
        </div>
      </div>

      {/* Onglets de navigation interactifs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 mb-3">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'chart'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Projection Risque 14 Jours</span>
        </button>
        <button
          onClick={() => setActiveTab('windows')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'windows'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Fenêtres de Pulvérisation ({summary?.nb_fenetres_optimales ?? 0} favorables)</span>
        </button>
      </div>

      {/* 3. GRAPHIQUE SVG INTERACTIF À 14 JOURS */}
      {activeTab === 'chart' && (
        <div className="mb-4">
          <div className="p-3 sm:p-4 rounded-xl bg-stone-950 dark:bg-black text-white relative overflow-hidden border border-stone-800">
            {/* Légende du graphique */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 text-stone-400">
              <span className="font-semibold flex items-center gap-1.5 text-stone-200">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Indice d&apos;infection fongique journalier (0 - 100%)
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-0.5 bg-emerald-400 inline-block" /> Faible (&lt;30%)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-0.5 bg-amber-400 inline-block" /> Modéré (30-60%)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-0.5 bg-rose-400 inline-block" /> Élevé (&gt;60%)
                </span>
              </div>
            </div>

            {/* Zone SVG responsive */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[500px]">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-40 select-none cursor-crosshair"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={vigilanceConfig.gradientStart} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={vigilanceConfig.gradientStop} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Lignes de seuils horizontales */}
                  {/* Seuil 80% (Critique) */}
                  <line
                    x1={paddingX}
                    y1={paddingTop + usableHeight * 0.2}
                    x2={chartWidth - paddingX}
                    y2={paddingTop + usableHeight * 0.2}
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={chartWidth - paddingX - 4}
                    y={paddingTop + usableHeight * 0.2 - 3}
                    fill="#f43f5e"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="end"
                    opacity="0.8"
                  >
                    80% Alerte Rouge
                  </text>

                  {/* Seuil 60% (Vigilance Orange) */}
                  <line
                    x1={paddingX}
                    y1={paddingTop + usableHeight * 0.4}
                    x2={chartWidth - paddingX}
                    y2={paddingTop + usableHeight * 0.4}
                    stroke="#f97316"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    strokeOpacity="0.35"
                  />

                  {/* Seuil 30% (Vigilance Jaune) */}
                  <line
                    x1={paddingX}
                    y1={paddingTop + usableHeight * 0.7}
                    x2={chartWidth - paddingX}
                    y2={paddingTop + usableHeight * 0.7}
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    strokeOpacity="0.35"
                  />

                  {/* Aire dégradée sous la courbe */}
                  {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

                  {/* Ligne principale de la courbe */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={vigilanceConfig.strokeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points interactifs de chaque jour */}
                  {points.map((pt, i) => {
                    const isSelected = i === selectedDayIndex;
                    const isHigh = pt.risk >= 60;
                    const pointColor = pt.risk >= 80 ? '#f43f5e' : pt.risk >= 60 ? '#f97316' : pt.risk >= 30 ? '#f59e0b' : '#10b981';

                    return (
                      <g key={i} onClick={() => setSelectedDayIndex(i)} className="cursor-pointer">
                        {/* Barre d'impact verticale invisible pour zone de clic large */}
                        <rect
                          x={pt.x - 12}
                          y={paddingTop}
                          width="24"
                          height={usableHeight + paddingBottom}
                          fill="transparent"
                        />

                        {isSelected && (
                          <line
                            x1={pt.x}
                            y1={paddingTop}
                            x2={pt.x}
                            y2={paddingTop + usableHeight}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            opacity="0.75"
                          />
                        )}

                        {/* Anneau actif */}
                        {isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="9"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity="0.9"
                          />
                        )}

                        {/* Point de données */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? '5.5' : isHigh ? '4.5' : '3.5'}
                          fill={pointColor}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? '2' : '1'}
                        />

                        {/* Label jour J+i */}
                        <text
                          x={pt.x}
                          y={chartHeight - 6}
                          fill={isSelected ? '#ffffff' : '#a8a29e'}
                          fontSize={isSelected ? '10' : '9'}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          textAnchor="middle"
                        >
                          J+{pt.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Instruction de clic */}
            <div className="mt-1 text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              <span>Cliquez sur n&apos;importe quel point du graphique pour inspecter la météo et les risques du jour.</span>
            </div>
          </div>

          {/* Fiche d'inspection du jour sélectionné */}
          {selectedDay && (
            <div className="mt-3 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
                  <span>
                    Jour {selectedDay.jour_horizon} • {selectedDay.date_jour}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      selectedDay.niveau_vigilance === 'rouge'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : selectedDay.niveau_vigilance === 'orange'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                        : selectedDay.niveau_vigilance === 'jaune'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    Risque {selectedDay.indice_infection_journalier}% ({selectedDay.niveau_vigilance})
                  </span>
                </div>
                <div className="text-stone-600 dark:text-stone-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Temp : <strong>{selectedDay.temp_min}°C à {selectedDay.temp_max}°C</strong></span>
                  <span>Humidité : <strong>{selectedDay.humidite_moyenne}%</strong></span>
                  <span>Pluie : <strong>{selectedDay.pluie_somme_mm} mm</strong> ({selectedDay.pluie_probabilite_pct}%)</span>
                  <span>Vent max : <strong>{selectedDay.vent_vitesse_max_kmh} km/h</strong></span>
                  <span>Incubation : <strong className="capitalize">{selectedDay.stade_incubation.replace('_', ' ')}</strong></span>
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">Conseil du jour :</div>
                <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 max-w-xs">
                  {selectedDay.recommandation_courte}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. VUE FENÊTRES DE PULVÉRISATION / INTERVENTION */}
      {activeTab === 'windows' && (
        <div className="mb-4 space-y-2.5">
          <div className="text-xs text-stone-600 dark:text-stone-300 mb-2">
            Analyse physico-chimique des créneaux sur 14 jours selon les règles agronomiques (Vent &lt; 19 km/h, Pluie &lt; 1.5 mm, Temp &lt; 31°C) :
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {(prediction?.intervention_windows || []).map((w, idx) => {
              const isOpt = w.statut_fenetre === 'optimale';
              const isFav = w.statut_fenetre === 'favorable';
              const isDel = w.statut_fenetre === 'delicate';
              const isInt = w.statut_fenetre === 'interdite';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                    isOpt
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : isFav
                      ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
                      : isDel
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{w.date_jour}</span>
                      <span className="font-semibold text-stone-500 dark:text-stone-400">
                        ({w.creneau === 'matin_06h_10h' ? 'Matin 06h-10h' : 'Soir 16h-19h'})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isOpt
                          ? 'bg-emerald-800 text-white'
                          : isFav
                          ? 'bg-teal-700 text-white'
                          : isDel
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-700 text-white'
                      }`}
                    >
                      {w.statut_fenetre} ({w.score_aptitude_global}/100)
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-stone-600 dark:text-stone-300 grid grid-cols-3 gap-1">
                    <span>Vent : <strong>{w.vitesse_vent_kmh} km/h</strong></span>
                    <span>Pluie : <strong>{w.pluie_prevue_mm} mm</strong></span>
                    <span>Temp : <strong>{w.temperature_creneau}°C</strong></span>
                  </div>

                  <div className="mt-2 text-[11px] font-medium text-stone-700 dark:text-stone-300 italic border-t border-stone-200/60 dark:border-stone-700/60 pt-1.5">
                    {w.justification_technique}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CONSEIL STRATÉGIQUE & BOUTON D'ACTION (CONTINUITÉ PARFAITE DU DASHBOARD) */}
      <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider mb-1">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
          <span>Décision Stratégique Recommandée</span>
        </div>
        <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
          {prediction?.conseil_strategique || conseilFallback?.message || "Surveillez l'évolution de la pression fongique au vu des conditions météo de la semaine."}
        </p>
      </div>

      {/* Bouton d'action "J'ai appliqué ce conseil" */}
      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {hasApplied ? (
            <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
              Enregistré dans votre historique agronomique
            </span>
          ) : (
            <span>Validez après avoir appliqué le traitement ou ajusté l&apos;irrigation.</span>
          )}
        </div>

        <button
          onClick={onApply}
          className={`w-full sm:w-auto py-2.5 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            hasApplied
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs'
          }`}
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{hasApplied ? 'Conseil appliqué ✓' : "J'ai appliqué ce conseil"}</span>
        </button>
      </div>
    </div>
  );
}
