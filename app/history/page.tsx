'use client';

import React, { useState } from 'react';
import {
  Droplets,
  Sun,
  Leaf,
  AlertOctagon,
  Check,
  ChevronRight,
  TrendingUp,
  Filter,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { useAgri } from '../../lib/context/AgriContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';

export default function HistoryPage() {
  const { recommendations, markRecommendationApplied, plot, farm } = useAgri();
  const [filterPeriod, setFilterPeriod] = useState<'semaine' | 'mois' | 'tout' | 'custom'>('semaine');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const getIconForType = (type: string) => {
    switch (type) {
      case 'irrigation':
        return { icon: Droplets, color: 'text-blue-700 bg-blue-50' };
      case 'alerte_chaleur':
        return { icon: Sun, color: 'text-amber-600 bg-amber-50' };
      case 'fertilisation':
        return { icon: Leaf, color: 'text-emerald-700 bg-emerald-50' };
      case 'sanitaire':
        return { icon: AlertOctagon, color: 'text-rose-600 bg-rose-50' };
      default:
        return { icon: Sparkles, color: 'text-emerald-700 bg-emerald-50' };
    }
  };

  const filteredItems = recommendations.filter((rec) => {
    if (filterPeriod === 'custom' && customStartDate && customEndDate) {
      const recDay = rec.date.split('T')[0];
      return recDay >= customStartDate && recDay <= customEndDate;
    }
    if (filterPeriod === 'tout') return true;
    const recDate = new Date(rec.date).getTime();
    const now = Date.now();
    const daysDiff = Math.max(0, (now - recDate) / (1000 * 60 * 60 * 24));
    if (filterPeriod === 'semaine') return daysDiff <= 7;
    if (filterPeriod === 'mois') return daysDiff <= 30;
    return true;
  });

  const appliedCount = recommendations.filter((i) => i.statut === 'applied').length;
  const totalCount = recommendations.length;
  const ratePct = totalCount > 0 ? Math.round((appliedCount / totalCount) * 100) : 100;

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="En ligne" title="Historique Agronomique" />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 space-y-6">
        {/* Titre & Sous-titre */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Historique des Conseils & Pratiques
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Traçabilité complète des interventions appliquées et des recommandations agronomiques.
            </p>
          </div>

          {/* Filtres de période & Calendrier SaaS */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700/80">
              <button
                type="button"
                onClick={() => setFilterPeriod('semaine')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPeriod === 'semaine'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('mois')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPeriod === 'mois'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Ce mois-ci
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('tout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPeriod === 'tout'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Tout voir
              </button>
            </div>

            <DateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              onChangeRange={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setFilterPeriod('custom');
              }}
            />
          </div>
        </div>

        {/* 3 Cartes KPI d'impact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100">{ratePct}%</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {totalCount > 0 ? `${appliedCount} sur ${totalCount} conseils appliqués` : 'Traçabilité active'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100">{appliedCount > 0 ? `~${Math.min(45, appliedCount * 8)}% d'eau` : 'Optimisation'}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Économie de carburant & eau
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100">{appliedCount > 0 ? `${(appliedCount * 15000).toLocaleString('fr-FR')} FCFA` : 'Préservation'}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Intrants & récolte préservés
              </div>
            </div>
          </div>
        </div>

        {/* Grille des Cartes de Conseils ou État Vierge */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const { icon: Icon, color: iconColor } = getIconForType(item.type);
              const isApplied = item.statut === 'applied';

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between hover:border-emerald-200 dark:hover:border-emerald-700/60 transition-all"
                >
                  <div>
                    {/* En-tête de la carte */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                        {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {plot?.culture || 'Parcelle'}
                      </span>
                      {item.temp_c && (
                        <span className="font-bold text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200/60 dark:border-stone-700">
                          {item.temp_c}°C
                        </span>
                      )}
                    </div>

                    {/* Contenu principal */}
                    <div className="flex items-start gap-3 mt-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {item.titre}
                        </h3>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pied de carte avec statut et parcelle */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Appliqué
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-md border border-stone-200/60 dark:border-stone-700">
                        En attente
                      </span>
                    )}

                    {isApplied ? (
                      <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">
                        {plot?.nom || farm?.nom || 'Exploitation'}
                      </span>
                    ) : (
                      <button
                        onClick={() => markRecommendationApplied(item.id)}
                        className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer underline"
                      >
                        <span>Marquer comme appliqué</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Votre journal d&apos;interventions agronomiques
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
                Validez vos conseils quotidiens depuis le tableau de bord pour alimenter automatiquement votre historique et mesurer vos économies d&apos;eau et d&apos;intrants.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                <span>Accéder au conseil du jour</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
