'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  X,
  Sprout,
  Sun,
  Droplets,
  Leaf,
  CloudRain,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Calendar, CalendarEvent, formatDateISO } from './ui/Calendar';
import { useAgri } from '../lib/context/AgriContext';

interface AgriCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalendarTab = 'month' | 'seasons' | 'stages';

export const AgriCalendarModal: React.FC<AgriCalendarModalProps> = ({ isOpen, onClose }) => {
  const { farm, plot, recommendations } = useAgri();
  const [activeTab, setActiveTab] = useState<CalendarTab>('month');
  const [selectedDay, setSelectedDay] = useState<string>(() => formatDateISO(new Date()));

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const cultureName = plot?.culture || 'Maraîchage diversifié';
  const surfaceHa = plot?.surface_ha || 1.5;

  // Calcul dynamique des événements agronomiques à partir des recommandations et du cycle cultural
  const today = new Date();
  const agronomicEvents: CalendarEvent[] = [];

  // Événements dérivés des recommandations
  recommendations.forEach((rec, idx) => {
    let type: CalendarEvent['type'] = 'irrigation';
    if (rec.type === 'fertilisation') type = 'fertilisation';
    else if (rec.type === 'sanitaire') type = 'sanitaire';
    else if (rec.type === 'alerte_chaleur') type = 'meteo';

    agronomicEvents.push({
      date: rec.date.split('T')[0],
      type,
      label: rec.titre,
    });
  });

  // Événement réel lié à la date de semis de la parcelle
  if (plot?.date_semis) {
    agronomicEvents.push({
      date: plot.date_semis.split('T')[0],
      type: 'semis',
      label: `Date de semis : ${cultureName} (${plot.variete || 'Locale'})`,
    });
  }

  // Événements pour le jour sélectionné
  const dayEvents = agronomicEvents.filter((ev) => ev.date === selectedDay);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* En-tête Modal */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-500/30 flex items-center justify-center text-white shadow-inner">
              <CalendarIcon className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Calendrier Cultural & Campagne Agricole {currentYear}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold uppercase border border-emerald-400/30">
                  Sénégal
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {farm?.nom || 'Exploitation'} • {farm?.region || 'Thiès'} • Parcelle active : {cultureName} ({surfaceHa} ha)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'onglets UI/UX */}
        <div className="flex items-center border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 px-4 sm:px-6 pt-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('month')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'month'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendrier Mensuel & Interventions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seasons')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'seasons'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Saisons Agricoles au Sénégal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'stages'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Stades Phénologiques ({cultureName})</span>
          </button>
        </div>

        {/* Contenu Déroulant */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ONGLET 1 : CALENDRIER MENSUEL & INTERVENTIONS */}
          {activeTab === 'month' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Calendrier SaaS Interactif (7 colonnes) */}
              <div className="lg:col-span-7">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={(d) => setSelectedDay(d)}
                  events={agronomicEvents}
                  showPresets={true}
                  className="shadow-xs border-stone-200 dark:border-stone-800"
                />

                {/* Légende des pastilles */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-stone-500 dark:text-stone-400 mt-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Irrigation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Fertilisation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Sanitaire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Météo/Chaleur</span>
                  </div>
                </div>
              </div>

              {/* Panneau Détails du jour sélectionné (5 colonnes) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      Interventions du jour
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400">
                      {selectedDay}
                    </span>
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className="space-y-2.5">
                      {dayEvents.map((ev, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-1"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-stone-100">
                            {ev.type === 'irrigation' && <Droplets className="w-4 h-4 text-blue-600" />}
                            {ev.type === 'fertilisation' && <Leaf className="w-4 h-4 text-emerald-600" />}
                            {ev.type === 'sanitaire' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                            {ev.type === 'meteo' && <Sun className="w-4 h-4 text-amber-600" />}
                            <span>{ev.label || 'Action agronomique'}</span>
                          </div>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            Action planifiée dans le calendrier pour la culture de {cultureName}.
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-stone-400 dark:text-stone-500 text-xs">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                      <p>Aucune intervention critique planifiée pour ce jour.</p>
                      <p className="text-[11px] mt-0.5">Surveillance habituelle et maintien du sol.</p>
                    </div>
                  )}
                </div>

                {/* Synthèse Campagne active */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-950 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Recommandation du Copilote AgriImpact</span>
                  </div>
                  <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                    Adaptez le calendrier d&apos;irrigation en fonction de l&apos;ETP locale ({farm?.region || 'Thiès'}) et des prévisions pluviométriques synchronisées avec l&apos;ANACIM.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : SAISONS AGRICOLES AU SÉNÉGAL */}
          {activeTab === 'seasons' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Le calendrier agricole sénégalais s&apos;articule autour de 3 grandes saisons culturales adaptées aux spécificités agroclimatiques régionales.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Hivernage */}
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-extrabold text-sm">
                    <CloudRain className="w-5 h-5 text-sky-600" />
                    <span>Hivernage (Pluviale)</span>
                  </div>
                  <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
                    Juin à Octobre
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Saison des pluies concentrée. Période idéale pour les céréales sèches (Mil, Sorgho, Maïs), l&apos;Arachide et le Niébé.
                  </p>
                  <div className="pt-2 text-[10px] font-semibold text-sky-800 dark:text-sky-300 border-t border-sky-200/60">
                    • Bassin arachidier, Casamance, Sud-Est
                  </div>
                </div>

                {/* 2. Contre-saison froide */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-extrabold text-sm">
                    <Sprout className="w-5 h-5 text-emerald-600" />
                    <span>Contre-Saison Froide</span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Novembre à Février
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Températures nocturnes douces. Période reine du maraîchage intensif : Oignon, Tomate, Pomme de terre, Carotte, Chou.
                  </p>
                  <div className="pt-2 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border-t border-emerald-200/60">
                    • Zone des Niayes, Vallée du Fleuve
                  </div>
                </div>

                {/* 3. Contre-saison chaude */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm">
                    <Sun className="w-5 h-5 text-amber-600" />
                    <span>Contre-Saison Chaude</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    Mars à Mai
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Fort ensoleillement et ETP élevée. Cultures irriguées tolérantes : Pastèque, Melon, Maïs d&apos;hivernage précoce, Riz de contre-saison.
                  </p>
                  <div className="pt-2 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border-t border-amber-200/60">
                    • Vallée du Fleuve, Périmètres irrigués
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 3 : STADES PHÉNOLOGIQUES */}
          {activeTab === 'stages' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    <Sprout className="w-4 h-4 text-emerald-600" />
                    <span>Chronologie Phénologique : {cultureName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    Cycle moyen : 90 - 110 jours
                  </span>
                </div>

                {/* Étapes du cycle */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Étape 1</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Semis & Levée</div>
                    <div className="text-[11px] text-stone-500">J0 à J+10</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Étape 2</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Croissance végétative</div>
                    <div className="text-[11px] text-stone-500">J+15 à J+40</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Étape 3 (Actuel)</div>
                    <div className="font-bold text-emerald-950 dark:text-emerald-200">Floraison & Nouaison</div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">J+45 à J+70</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Étape 4</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Grossissement & Maturation</div>
                    <div className="text-[11px] text-stone-500">J+75 à J+95</div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Étape 5</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">Récolte estimée</div>
                    <div className="text-[11px] text-stone-500">J+100+</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de modal */}
        <div className="p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Calendrier 100% synchronisé avec l&apos;interface AgriImpact</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-xs"
          >
            Fermer le calendrier
          </button>
        </div>
      </div>
    </div>
  );
};
