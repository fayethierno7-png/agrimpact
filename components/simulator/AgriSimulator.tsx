'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  MapPin,
  Sprout,
  Droplets,
  Wind,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
  Info,
  Calendar,
} from 'lucide-react';
import { SENEGAL_REGIONS, CROPS_PRESETS } from '../../lib/constants/senegal';
import { SimulatorResult } from '../../lib/types';

interface AgriSimulatorProps {
  onSimulationComplete?: (result: SimulatorResult) => void;
  standalone?: boolean;
}

export const AgriSimulator: React.FC<AgriSimulatorProps> = ({
  onSimulationComplete,
  standalone = false,
}) => {
  const router = useRouter();

  // Sélecteurs d'entrées simplifiés au strict nécessaire
  const [selectedRegion, setSelectedRegion] = useState('Thiès');
  const [selectedCrop, setSelectedCrop] = useState('Oignon');
  const [selectedStage, setSelectedStage] = useState('Bulbaison');

  // États de calcul et d'affichage
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulatorResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mettre à jour le stade par défaut lorsque la culture change
  useEffect(() => {
    const preset = CROPS_PRESETS[selectedCrop] || CROPS_PRESETS.Oignon;
    if (preset && preset.stades.length > 0) {
      // Choisir un stade intermédiaire représentatif (souvent le plus critique pour l'irrigation/maladies)
      const defaultStage = preset.stades[2]?.nom || preset.stades[1]?.nom || preset.stades[0].nom;
      setSelectedStage(defaultStage);
    }
  }, [selectedCrop]);

  // Fonction de calcul de la simulation
  const runEvaluation = async (region = selectedRegion, crop = selectedCrop, stage = selectedStage) => {
    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          culture: crop,
          stadeNom: stage,
          surfaceHa: 1.0,
          typeIrrigation: 'goutte-a-goutte',
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setSimulationResult(data.result);
        // Conserver temporairement la dernière simulation en cache local
        try {
          localStorage.setItem('agrimpact_active_simulation', JSON.stringify(data.result));
        } catch {}
        if (onSimulationComplete) {
          onSimulationComplete(data.result);
        }
      } else {
        throw new Error(data.error || 'Erreur lors du calcul.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de charger la météo régionale.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Calculer automatiquement une première simulation au montage
  useEffect(() => {
    runEvaluation('Thiès', 'Oignon', 'Bulbaison');
  }, []);

  // Déclenchement lors d'un changement de sélection
  const handleSelectRegion = (reg: string) => {
    setSelectedRegion(reg);
    runEvaluation(reg, selectedCrop, selectedStage);
  };

  const handleSelectCrop = (crop: string) => {
    setSelectedCrop(crop);
    const preset = CROPS_PRESETS[crop] || CROPS_PRESETS.Oignon;
    const nextStage = preset.stades[2]?.nom || preset.stades[1]?.nom || preset.stades[0].nom;
    setSelectedStage(nextStage);
    runEvaluation(selectedRegion, crop, nextStage);
  };

  const handleSelectStage = (stage: string) => {
    setSelectedStage(stage);
    runEvaluation(selectedRegion, selectedCrop, stage);
  };

  // Redirection vers création de compte avec conservation des données
  const handleSaveAndSignup = () => {
    if (simulationResult) {
      try {
        localStorage.setItem('agrimpact_pending_simulation', JSON.stringify(simulationResult));
      } catch {}
    }
    router.push(
      `/signup?redirect=/dashboard&save_simulation=true&region=${encodeURIComponent(
        selectedRegion
      )}&culture=${encodeURIComponent(selectedCrop)}`
    );
  };

  const handleContinueWithoutSaving = () => {
    router.push('/dashboard');
  };

  const currentCropPreset = CROPS_PRESETS[selectedCrop] || CROPS_PRESETS.Oignon;

  return (
    <div id="simulateur" className="w-full max-w-5xl mx-auto">
      {/* En-tête du simulateur */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Simulateur Agrométéo Déterministe • Sans Inscription</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-stone-900 dark:text-white">
          Testez instantanément le copilote sur votre terroir
        </h2>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-2xl mx-auto mt-2">
          Sélectionnez votre région et votre culture. Notre moteur croise en temps réel la météo
          locale avec les règles phénologiques de l&apos;ISRA.
        </p>
      </div>

      {/* Boîtier principal du simulateur */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
        {/* ÉTAPE 1 : Sélecteurs Zero-Friction */}
        <div className="p-5 sm:p-7 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Région */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>1. Terroir / Région</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Thiès', 'Saint-Louis', 'Kaolack', 'Louga', 'Dakar (Niayes)'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSelectRegion(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedRegion === r
                        ? 'bg-[#0C2B1E] text-[#C8EF56] shadow-sm ring-2 ring-[#C8EF56]/40'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Culture */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>2. Culture Principale</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Oignon', 'Tomate', 'Maïs', 'Arachide', 'Piment'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectCrop(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCrop === c
                        ? 'bg-[#0C2B1E] text-[#C8EF56] shadow-sm ring-2 ring-[#C8EF56]/40'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Stade phénologique */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>3. Stade de Développement</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentCropPreset.stades.map((s) => (
                  <button
                    key={s.nom}
                    type="button"
                    onClick={() => handleSelectStage(s.nom)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedStage === s.nom
                        ? 'bg-[#0C2B1E] text-[#C8EF56] shadow-sm ring-2 ring-[#C8EF56]/40'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500'
                    }`}
                  >
                    {s.nom}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ÉTAPE 2 : LE MOMENT WOW / RÉSULTATS VISUELS FORTS */}
        <div className="p-6 sm:p-8">
          {isEvaluating ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <div className="text-base font-extrabold text-stone-900 dark:text-white">
                Interrogation des stations météo & calcul agronomique...
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Analyse du microclimat de {selectedRegion} pour votre culture d&apos;{selectedCrop}.
              </p>
            </div>
          ) : simulationResult ? (
            <div className="space-y-6">
              {/* Carte Situation & Météo Réelle */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Terroir
                    </div>
                    <div className="text-sm font-black text-stone-900 dark:text-white">
                      {simulationResult.situation.region}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-100 dark:bg-lime-900/50 flex items-center justify-center text-lime-700 dark:text-lime-300 shrink-0">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Culture & Stade
                    </div>
                    <div className="text-sm font-black text-stone-900 dark:text-white">
                      {simulationResult.situation.culture} • {simulationResult.situation.stadeNom}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0">
                    <CloudSun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Météo Locale
                    </div>
                    <div className="text-sm font-black text-stone-900 dark:text-white">
                      {simulationResult.situation.meteo.temperature}°C • {simulationResult.situation.meteo.humidity}% hum.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Vent Actuel
                    </div>
                    <div className="text-sm font-black text-stone-900 dark:text-white">
                      {simulationResult.situation.meteo.windSpeed} km/h{' '}
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {simulationResult.situation.meteo.windSpeed <= 15 ? '(Favorable)' : '(Vigie vent)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc WOW : Diagnostic & Recommandation Concrète */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0C2B1E] to-[#123E2C] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sprout className="w-48 h-48 text-[#C8EF56]" />
                </div>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8EF56]/20 border border-[#C8EF56]/40 text-[#C8EF56] text-xs font-black uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Action Recommandée AgriImpact</span>
                    </div>
                    <div className="text-xs font-mono text-emerald-200">
                      {simulationResult.recommandation.creneauConseille}
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#C8EF56] tracking-tight mb-2.5">
                    {simulationResult.recommandation.actionTitre}
                  </h3>

                  <p className="text-sm sm:text-base text-stone-200 leading-relaxed mb-6 max-w-3xl">
                    {simulationResult.recommandation.actionMessage}
                  </p>

                  {/* Facteurs d'explication "Pourquoi ?" */}
                  <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                        Économie d&apos;eau estimée
                      </div>
                      <div className="text-lg font-black text-white">
                        ~{simulationResult.analyse.economieEauEstimeeM3} m³ / ha
                      </div>
                      <div className="text-[11px] text-stone-300 mt-0.5">
                        Par rapport à une irrigation continue en plein soleil.
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                        Risque fongique / Mildiou
                      </div>
                      <div className="text-lg font-black text-white capitalize">
                        {simulationResult.analyse.risqueFongique}
                      </div>
                      <div className="text-[11px] text-stone-300 mt-0.5">
                        Croisement humidité de rosée et hygrométrie côtière.
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                        Justification Agronomique
                      </div>
                      <div className="text-xs text-stone-200 leading-snug">
                        {simulationResult.explication.justification}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mention Éthique & Transparence */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="leading-relaxed">
                  <span className="font-bold">Avertissement agronomique :</span> {simulationResult.disclaimer}
                </p>
              </div>

              {/* ÉTAPE 3 : TRANSITION NATURELLE VERS LE COMPTE (CTA) */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <div className="text-sm font-black text-stone-900 dark:text-white">
                    Ne perdez pas cette analyse.
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Créez votre compte gratuitement pour enregistrer vos résultats et suivre votre parcelle.
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleContinueWithoutSaving}
                    className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors text-center"
                  >
                    Continuer sans enregistrer
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndSignup}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-[#C8EF56] hover:bg-[#b8df46] text-[#0C2B1E] text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-[#C8EF56]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Enregistrer mes résultats</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-stone-500 text-sm">
              Sélectionnez une région pour générer votre première analyse.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
