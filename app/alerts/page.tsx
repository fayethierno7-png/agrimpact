'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Share2,
  Users,
  CheckCircle2,
  Bug,
  Sun,
  Wind,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { useAgri } from '../../lib/context/AgriContext';

export default function AlertsPage() {
  const { farm, alerts } = useAgri();
  const [activeTab, setActiveTab] = useState<'actives' | 'passees'>('actives');
  const [alertSent, setAlertSent] = useState(false);

  const farmRegion = farm?.region || 'Sénégal';
  const activeAlerts = alerts.filter((a) => a.statut === 'active');
  const pastAlerts = alerts.filter((a) => a.statut === 'past' || a.statut === 'resolved');

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="Réseau 4G" title="Centre d'Alertes" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 space-y-6">
        {/* Titre & Sous-titre */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Alertes & Vigilance Météorologique
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold">
                ANACIM
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Notifications critiques et anticipation pour votre exploitation à {farmRegion}
            </p>
          </div>

          {/* Onglets Actives / Passées */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <button
              onClick={() => setActiveTab('actives')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'actives'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeAlerts.length > 0 ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>Actives ({activeAlerts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('passees')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'passees'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>Passées ({pastAlerts.length})</span>
            </button>
          </div>
        </div>

        {/* CONTENU ONGLET 1 : ALERTES EN COURS */}
        {activeTab === 'actives' && (
          <div className="space-y-4">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alt) => (
                <div key={alt.id} className="p-5 sm:p-6 bg-orange-50/70 dark:bg-orange-950/40 rounded-3xl border-2 border-orange-400 dark:border-orange-600 shadow-sm relative">
                  {/* En-tête statut */}
                  <div className="flex items-center justify-between pb-3 border-b border-orange-200/80 dark:border-orange-800/80">
                    <span className="text-xs font-extrabold tracking-wider text-orange-950 dark:text-orange-300 uppercase flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      ALERTE EN COURS • {farmRegion.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs font-black tracking-wide capitalize">
                      Vigilance {alt.vigilance}
                    </span>
                  </div>

                  {/* Heure & Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-semibold">
                      <Clock className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                      <span>{alt.time_slot || 'En cours aujourd\'hui'}</span>
                    </div>
                    {alt.is_imminent && (
                      <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-black tracking-wider uppercase animate-pulse">
                        IMMINENT
                      </span>
                    )}
                  </div>

                  {/* Titre */}
                  <h2 className="text-base sm:text-xl font-extrabold text-stone-950 dark:text-stone-100 mt-2">
                    {alt.titre}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {alt.impact_direct && (
                      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-orange-200/70 dark:border-orange-800/70 text-xs sm:text-sm">
                        <span className="font-bold text-orange-950 dark:text-orange-300 block mb-1">
                          ⚠️ Impact direct sur vos parcelles :
                        </span>
                        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                          {alt.impact_direct}
                        </p>
                      </div>
                    )}

                    {alt.consignes && (
                      <div className="p-3.5 rounded-2xl bg-orange-100/80 dark:bg-orange-950/60 border border-orange-300/70 dark:border-orange-800/70 text-xs sm:text-sm">
                        <span className="font-bold text-stone-900 dark:text-stone-200 block mb-1">
                          📋 Consignes d&apos;action immédiates :
                        </span>
                        <p className="text-stone-800 dark:text-stone-300 leading-relaxed">
                          {alt.consignes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className="mt-5 pt-3 border-t border-orange-200/60 dark:border-orange-800/60 flex items-center gap-3">
                    <button
                      onClick={() => setAlertSent(!alertSent)}
                      className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        alertSent
                          ? 'bg-emerald-800 text-white'
                          : 'bg-stone-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white hover:bg-black shadow-xs'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{alertSent ? 'Équipe notifiée par SMS ✓' : "Alerter mon équipe agricole"}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Alerte Météo ${farmRegion} AGRIMPACT`,
                            text: `${alt.titre} à ${farmRegion}. ${alt.consignes || ''}`,
                          });
                        }
                      }}
                      className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer shadow-xs"
                      aria-label="Partager"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-emerald-700 dark:text-emerald-400 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Aucune alerte météorologique active
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                  Les conditions météorologiques dans le bassin de {farmRegion} sont calmes. Le réseau de surveillance ANACIM et AGRIMPACT n&apos;a émis aucun avis de vigilance extrême pour vos parcelles.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CONTENU ONGLET 2 : ALERTES PASSÉES */}
        {activeTab === 'passees' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 tracking-tight">
                Historique des alertes dans votre région
              </h3>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Bassin de {farmRegion}
              </span>
            </div>

            {pastAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAlerts.map((alt) => (
                  <div key={alt.id} className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                              {alt.titre}
                            </h4>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              {new Date(alt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                          Terminée
                        </span>
                      </div>
                    </div>
                    {alt.consignes && (
                      <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">Mesure appliquée : </span>
                        {alt.consignes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs text-center space-y-2">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Aucun historique d&apos;alerte archivé pour le moment sur votre exploitation.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Note ANACIM 3 heures */}
        <div className="p-4 bg-stone-100/80 dark:bg-stone-900/80 border border-transparent dark:border-stone-800 rounded-2xl flex items-start gap-3 text-stone-600 dark:text-stone-300 text-xs">
          <Clock className="w-4 h-4 shrink-0 text-stone-500 dark:text-stone-400 mt-0.5" />
          <p className="leading-relaxed">
            Les alertes météo sont actualisées toutes les 3 heures en liaison directe avec l&apos;ANACIM (Agence Nationale de l&apos;Aviation Civile et de la Météorologie) et le réseau d&apos;observation paysan du Sénégal.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
