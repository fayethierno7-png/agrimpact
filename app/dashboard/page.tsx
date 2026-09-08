'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Sun,
  CloudRain,
  Sprout,
  Check,
  ChevronRight,
  MapPin,
  Sparkles,
  Wind,
  Droplets,
  PhoneCall,
  Calendar,
  Layers,
  ArrowUpRight,
  Flag,
  ShieldCheck,
} from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { ReportModal } from '../../components/ReportModal';
import { AgriCalendarModal } from '../../components/AgriCalendarModal';
import { Toast, ToastMessage } from '../../components/Toast';
import { AgrometeoPredictiveModule } from '../../components/AgrometeoPredictiveModule';
import { getWeatherData, CurrentWeatherReport } from '../../lib/weather/openMeteo';
import { calculateCropStage, evaluateAgronomicRules } from '../../lib/engine/recommendationEngine';
import AiTokenGauge from '../../components/billing/AiTokenGauge';
import DailyAdviceCard from '../../components/dashboard/DailyAdviceCard';
import EditFarmModal from '../../components/farm/EditFarmModal';
import ContactSupportBanner from '../../components/common/ContactSupportBanner';

export default function DashboardPage() {
  const { profile, farm, plot, markRecommendationApplied, recommendations, alerts, updateFarmAndPlot } = useAgri();

  const [weather, setWeather] = useState<CurrentWeatherReport | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isEditFarmOpen, setIsEditFarmOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // État réel du portefeuille IA (Point 4)
  const [walletData, setWalletData] = useState({
    tokensRemaining: 45000,
    monthlyQuota: 60000,
    permanentTokens: 0,
    planName: 'Pro Producteur',
  });

  useEffect(() => {
    fetch('/api/wallet')
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.wallet) {
          setWalletData({
            tokensRemaining: json.wallet.tokensRemaining,
            monthlyQuota: json.wallet.monthlyQuota,
            permanentTokens: json.wallet.permanentTokens,
            planName: 'Pro Producteur',
          });
        }
      })
      .catch(() => {});
  }, []);

  // État de vigilance prédictive synchro depuis le module AgrometeoPredictiveModule
  const [predictionVigilance, setPredictionVigilance] = useState<string | null>(null);
  const [predictionAlertText, setPredictionAlertText] = useState<string | null>(null);
  const [predictionAlertConseil, setPredictionAlertConseil] = useState<string | null>(null);

  // État de la simulation récente (restitution immédiate post-inscription)
  const [recentSimulation, setRecentSimulation] = useState<any | null>(null);
  const [showSimulationCard, setShowSimulationCard] = useState(true);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('agrimpact_pending_simulation') ||
        localStorage.getItem('agrimpact_active_simulation');
      if (raw) {
        setRecentSimulation(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // Nom d'utilisateur et coordonnées réelles
  const userName = profile?.nom || 'Producteur';
  const farmName = farm?.nom || (farm?.region ? `Exploitation ${farm.region}` : 'Mon Exploitation');
  const farmRegion = farm?.region || 'Sénégal';
  const latitude = farm?.latitude ?? 14.791;
  const longitude = farm?.longitude ?? -16.9256;

  // Parcelle courante (réelle uniquement)
  const currentPlot = plot || null;
  const cropStage = currentPlot ? calculateCropStage(currentPlot) : null;

  const weatherRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadWeather = useCallback(async () => {
    try {
      const data = await getWeatherData(latitude, longitude, currentPlot?.id || 'farm-loc');
      setWeather(data);
    } catch (err) {
      console.warn('Erreur chargement météo:', err);
    }
  }, [latitude, longitude, currentPlot?.id]);

  useEffect(() => {
    loadWeather();

    // Rafraîchissement automatique toutes les 15 minutes pour synchronisation quasi temps-réel
    weatherRefreshRef.current = setInterval(loadWeather, 15 * 60 * 1000);
    return () => {
      if (weatherRefreshRef.current) clearInterval(weatherRefreshRef.current);
    };
  }, [loadWeather]);

  // Données météo réelles uniquement — aucune valeur fictive
  const currentWeather = weather;

  // Callback de synchronisation depuis le module prédictif vers le bandeau alerte du dashboard
  const handlePredictionSync = useCallback((data: {
    niveau_vigilance: string;
    alertText?: string;
    conseilStrategique?: string;
  }) => {
    setPredictionVigilance(data.niveau_vigilance);
    setPredictionAlertText(data.alertText || null);
    setPredictionAlertConseil(data.conseilStrategique || null);
  }, []);

  const engineOutput = (currentPlot && cropStage && currentWeather) ? evaluateAgronomicRules(currentWeather, currentPlot, cropStage) : null;
  const conseilDuJour = recommendations.find((r) => r.id === 'rec-today') || engineOutput?.conseilDuJour || null;
  const hasApplied = isApplied || (conseilDuJour ? conseilDuJour.statut === 'applied' : false);

  const handleApply = () => {
    if (conseilDuJour) {
      setIsApplied(true);
      markRecommendationApplied(conseilDuJour.id);
    }
  };

  // Alerte météo en cours : priorité aux alertes Supabase, puis au moteur prédictif, puis au moteur basique
  const supabaseAlert = alerts.find((a) => a.statut === 'active');
  const predictionDrivenAlert: typeof supabaseAlert | null =
    predictionVigilance && (predictionVigilance === 'orange' || predictionVigilance === 'rouge')
      ? {
          id: 'alt-prediction-14d',
          user_id: 'user',
          titre: predictionVigilance === 'rouge'
            ? 'Alerte Sanitaire Critique — Risque Fongique Majeur'
            : 'Vigilance Élevée — Pression Épidémique en Hausse',
          message: predictionAlertText || '',
          type: 'meteo_extreme' as const,
          vigilance: predictionVigilance,
          statut: 'active' as const,
          is_imminent: predictionVigilance === 'rouge',
          impact_direct: predictionAlertText || undefined,
          consignes: predictionAlertConseil || undefined,
          date: new Date().toISOString(),
        }
      : null;
  const activeAlert = supabaseAlert || predictionDrivenAlert || engineOutput?.alerteActive || null;

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="En ligne" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* En-tête Salutations & Contexte */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Bonjour {userName}
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                Exploitant certifié
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
              <span>Exploitation active : </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {farmName} • Région {farmRegion}
              </span>
              <span className="hidden md:inline text-stone-400 dark:text-stone-500">• GPS {latitude.toFixed(2)}°N, {Math.abs(longitude).toFixed(2)}°O</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              onClick={() => {
                document.cookie = 'agri_user_role=admin; path=/; max-age=604800; SameSite=Lax';
              }}
              className="px-3.5 py-1.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer ring-2 ring-purple-300"
              title="Accéder à la Console d'Administration"
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>Console Admin</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="px-3 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-emerald-600 text-stone-700 dark:text-stone-200 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer group"
              title="Ouvrir le Calendrier Cultural & Saisons Agricoles"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Campagne Agricole {new Date().getFullYear()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </button>
          </div>
        </div>

        {/* Layout Responsive en Grille (12 colonnes sur Desktop, 1 colonne sur Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLONNE PRINCIPALE (8 Cols sur Desktop) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Bannière de restitution de simulation */}
            {recentSimulation && showSimulationCard && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0C2B1E] to-[#164733] text-white shadow-md relative overflow-hidden animate-fade-in border border-[#C8EF56]/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#C8EF56]/20 flex items-center justify-center text-[#C8EF56] shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-[#C8EF56]">
                        Diagnostic issu de votre simulation • {recentSimulation.situation?.culture} ({recentSimulation.situation?.region})
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                        {recentSimulation.recommandation?.actionTitre}
                      </h3>
                      <p className="text-xs text-stone-200 mt-1 max-w-2xl leading-relaxed">
                        {recentSimulation.recommandation?.actionMessage}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-emerald-200 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono">
                          {recentSimulation.recommandation?.creneauConseille}
                        </span>
                        <span>• Économie estimée : ~{recentSimulation.analyse?.economieEauEstimeeM3 || 25} m³/ha</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSimulationCard(false)}
                    className="text-stone-300 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* POINT 11 : Avertissement Période de grâce 3 jours avant coupure */}
            {Boolean((profile as any)?.statut_abonnement === 'impaye') && (
              <div className="p-4 rounded-2xl bg-[#963e1b]/10 border border-[#963e1b]/30 text-[#963e1b] dark:text-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-[#963e1b] animate-pulse" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      Période de grâce active — Renouvellement requis
                    </span>
                    <p className="text-xs mt-0.5 text-stone-700 dark:text-stone-300">
                      Votre abonnement est en attente de règlement. Veuillez régulariser votre souscription avant la suspension complète de vos accès aux outils d&apos;aide à la décision.
                    </p>
                  </div>
                </div>
                <Link
                  href="/tarifs"
                  className="px-3.5 py-1.5 bg-[#963e1b] hover:bg-[#7f3214] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors"
                >
                  Régulariser mon forfait
                </Link>
              </div>
            )}

            {/* Bandeau Alerte Météo Prioritaire (Conditionnel Réel) */}
            {activeAlert ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[11px] font-extrabold tracking-wider text-amber-900 dark:text-amber-300 uppercase">
                        VIGILANCE MÉTÉO • {activeAlert.vigilance.toUpperCase()}
                      </span>
                      {activeAlert.time_slot && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-xs font-bold">
                          {activeAlert.time_slot}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-stone-950 dark:text-stone-100 mt-1">
                      {activeAlert.titre}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                      {activeAlert.impact_direct || activeAlert.message}
                    </p>
                    {activeAlert.consignes && (
                      <p className="text-xs font-semibold text-amber-950 dark:text-amber-200 mt-2 bg-amber-100/70 dark:bg-amber-900/50 p-2 rounded-lg">
                        👉 {activeAlert.consignes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-emerald-700 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Conditions météorologiques favorables
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Aucune alerte météo extrême en cours sur votre exploitation à {farmRegion}.
                    </p>
                  </div>
                </div>
                <Link
                  href="/alerts"
                  className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 underline shrink-0 hidden sm:inline"
                >
                  Vigilance ANACIM
                </Link>
              </div>
            )}

            {/* Cartes Météo (2 sur mobile, 4 sur tablette/desktop) */}
            {currentWeather ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Carte 1 : Température */}
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
                  <span className="text-xs font-medium">Température</span>
                  <Sun className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {currentWeather.temperature}°C
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium">
                    Max {currentWeather.temperatureMax}°C • Min {currentWeather.temperatureMin}°C
                  </div>
                </div>
              </div>

              {/* Carte 2 : Risque de pluie */}
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
                  <span className="text-xs font-medium">Précipitations</span>
                  <CloudRain className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {currentWeather.precipitationProbability}%
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium truncate">
                    {currentWeather.precipitationSum} mm attendus
                  </div>
                </div>
              </div>

              {/* Carte 3 : Vent */}
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
                  <span className="text-xs font-medium">Vent / Rafales</span>
                  <Wind className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {currentWeather.windSpeed} <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">km/h</span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium">
                    {currentWeather.windSpeed >= 25 ? 'Rafales soutenues' : currentWeather.windSpeed >= 15 ? 'Vent modéré' : 'Vent calme'}
                  </div>
                </div>
              </div>

              {/* Carte 4 : Humidité de l'air */}
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1">
                  <span className="text-xs font-medium">Humidité</span>
                  <Droplets className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {currentWeather.humidity}%
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-medium">
                    {predictionVigilance === 'rouge'
                      ? 'Vigilance mildiou critique'
                      : predictionVigilance === 'orange'
                      ? 'Vigilance mildiou élevée'
                      : predictionVigilance === 'jaune'
                      ? 'Vigilance mildiou modérée'
                      : currentWeather.humidity >= 80
                      ? 'Humidité élevée — surveiller'
                      : currentWeather.humidity >= 60
                      ? 'Humidité normale'
                      : 'Air sec — irriguer si nécessaire'
                    }
                  </div>
                </div>
              </div>
            </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {['Température', 'Précipitations', 'Vent / Rafales', 'Humidité'].map((label) => (
                <div key={label} className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between animate-pulse">
                  <div className="flex items-center justify-between text-stone-400 dark:text-stone-500 mb-1">
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  <div>
                    <div className="w-20 h-8 bg-stone-200 dark:bg-stone-800 rounded mt-1" />
                    <div className="w-32 h-3 bg-stone-100 dark:bg-stone-800 rounded mt-2" />
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Module d'Analyse Prédictive Avancée 14j & Rentabilité ROI */}
            {currentPlot && cropStage ? (
              <>
                {/* POINT 3 : Conseil du jour visible, dynamique et contextuel */}
                <DailyAdviceCard plot={currentPlot} farm={farm} weather={currentWeather} />

                <AgrometeoPredictiveModule
                  plot={currentPlot}
                  latitude={latitude}
                  longitude={longitude}
                  hasApplied={hasApplied}
                  onApply={handleApply}
                  conseilFallback={conseilDuJour}
                  onPredictionSync={handlePredictionSync}
                />

                {/* Carte Culture & Cycle Végétatif */}
                <Link
                  href="/history"
                  className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-sm transition-all block group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                        <Sprout className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100">
                          <span>{cropStage.culture} ({cropStage.variete})</span>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          Semis il y a {cropStage.joursDepuisSemis} jours • Actuellement au stade : <span className="font-semibold text-emerald-900 dark:text-emerald-300">{cropStage.stadeNom}</span>
                        </p>
                      </div>
                    </div>

                    <span className="hidden sm:inline-flex text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      Progression : {cropStage.pourcentageCycle}%
                    </span>
                  </div>

                  {/* Jauge de progression */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                      <span>
                        Cycle végétatif : {cropStage.joursDepuisSemis} sur {cropStage.cycleTotalJours} jours
                      </span>
                      <span className="text-emerald-900 dark:text-emerald-300 font-bold">{cropStage.pourcentageCycle}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                        style={{ width: `${cropStage.pourcentageCycle}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </>
            ) : (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Sprout className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Aucune parcelle agricole enregistrée
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
                    Configurez votre culture principale (Oignon, Tomate, Piment, Pomme de terre, etc.), votre mode d&apos;irrigation et votre date de semis pour activer les recommandations quotidiennes personnalisées.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <span>Ajouter ma parcelle</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* COLONNE LATÉRALE DESKTOP (4 Cols sur Desktop, sous la colonne principale sur Mobile) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Jauge IA & Tokens AgriImpact (Point 4) */}
            <AiTokenGauge
              tokensRemaining={walletData.tokensRemaining}
              monthlyQuota={walletData.monthlyQuota}
              permanentTokens={walletData.permanentTokens}
              planName={walletData.planName}
              variant="dashboard"
              onTopUpSuccess={(pack) => {
                setWalletData((prev) => ({
                  ...prev,
                  permanentTokens: prev.permanentTokens + pack.nb_tokens,
                }));
              }}
            />

            {/* Carte Exploitation & Parcelles (Point 5) */}
            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                    Fiche Exploitation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditFarmOpen(true)}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  {currentPlot ? 'Modifier' : 'Configurer'}
                </button>
              </div>

              {currentPlot ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Parcelle active :</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{currentPlot.nom}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Superficie :</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{currentPlot.surface_ha} hectares</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Culture principale :</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">{currentPlot.culture} ({currentPlot.variete || 'Locale'})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Mode d&apos;irrigation :</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 capitalize">{currentPlot.type_irrigation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400">Date de semis :</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{currentPlot.date_semis}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 py-4 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2">
                  <p>Aucune parcelle configurée.</p>
                  <Link
                    href="/profile"
                    className="inline-block px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200 dark:border-emerald-800/60"
                  >
                    + Configurer une parcelle
                  </Link>
                </div>
              )}
            </div>

            {/* Carte Météo Prévisionnelle 24h */}
            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Prévisions 24h • ANACIM
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  currentWeather
                    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                }`}>
                  {currentWeather ? 'Synchronisé' : 'Chargement…'}
                </span>
              </div>

              {currentWeather ? (
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-stone-700 dark:text-stone-300">Midi (12h - 15h)</span>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{currentWeather.temperatureMax}°C • {currentWeather.temperatureMax >= 35 ? 'Caniculaire' : currentWeather.temperatureMax >= 30 ? 'Chaud' : 'Tempéré'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-stone-400" />
                    <span className="text-stone-700 dark:text-stone-300">Après-midi (15h - 18h)</span>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{currentWeather.windSpeed} km/h • {currentWeather.windSpeed >= 25 ? 'Rafales' : currentWeather.windSpeed >= 15 ? 'Vent modéré' : 'Vent calme'}</span>
                </div>
                {currentWeather.precipitationProbability >= 40 || currentWeather.precipitationSum > 0 ? (
                  <div className="py-2.5 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/40 -mx-2 px-2 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold">
                      <CloudRain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Soirée (19h - 22h)</span>
                    </div>
                    <span className="font-bold text-amber-900 dark:text-amber-200">{currentWeather.precipitationSum} mm • {currentWeather.description}</span>
                  </div>
                ) : (
                  <div className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Soirée (19h - 22h)</span>
                    </div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{currentWeather.temperatureMin + 3}°C • Calme</span>
                  </div>
                )}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-stone-700 dark:text-stone-300">Nuit & Aurore</span>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{currentWeather.temperatureMin}°C • Humidité {currentWeather.humidity}%</span>
                </div>
              </div>
              ) : (
              <div className="mt-3 space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div className="w-28 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="w-36 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Carte Support Paysan & Hotline */}
            <div className="p-5 rounded-2xl bg-emerald-900 text-white shadow-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Assistance Téléphonique
                  </h4>
                  <div className="text-sm font-extrabold text-white">33 800 12 12</div>
                </div>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed mt-2">
                Un agronome AGRIMPACT est disponible pour répondre à vos doutes sur l&apos;irrigation et les traitements foliaires.
              </p>
              <a
                href="tel:338001212"
                className="mt-4 w-full py-2 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <span>Appeler l&apos;agronome</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Action Discrète : Signalement d'anomalie */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Un souci ou un doute ?</span>
                <Link
                  href="/signalements"
                  className="text-stone-500 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 font-semibold underline text-[11px]"
                >
                  Mes signalements
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Signaler un problème</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coordonnées de contact administrables (Point 14) */}
        <div className="mt-6">
          <ContactSupportBanner />
        </div>
      </main>

      {/* Modal de Signalement */}
      {profile && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          userId={profile.user_id}
          onSuccess={(newReport) => {
            setToast({
              id: `${Date.now()}`,
              type: 'success',
              title: 'Signalement envoyé',
              message: 'Merci ! Votre signalement a été transmis aux agronomes AGRIMPACT.',
            });
          }}
        />
      )}

      {/* Modal de Calendrier Cultural SaaS */}
      <AgriCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />

      {/* Modal de Modification d'Exploitation (Point 5) */}
      <EditFarmModal
        isOpen={isEditFarmOpen}
        onClose={() => setIsEditFarmOpen(false)}
        farm={farm}
        plot={currentPlot}
        onSuccess={(updatedFarm, updatedPlot) => {
          updateFarmAndPlot(updatedFarm, updatedPlot);
          setToast({
            id: `${Date.now()}`,
            type: 'success',
            title: 'Exploitation mise à jour',
            message: 'Vos modifications d\'exploitation ont été enregistrées avec succès.',
          });
        }}
      />

      {/* Toast de Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      <BottomNav />
    </div>
  );
}
