'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  Clock,
  HelpCircle,
  X,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';

interface DiagnosticData {
  wallet: {
    tokensRemaining: number;
    monthlyQuota: number;
    permanentTokens: number;
    totalAvailable: number;
    lastReset?: string;
  };
  diagnostic: {
    estimatedQuestionsRemaining: number;
    avgPerQuery: number;
    recentLogs: Array<{
      id: string;
      date: string;
      tokensConsommes: number;
      source: string;
    }>;
  };
}

interface AiUsageDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTopUp: () => void;
}

export default function AiUsageDiagnosticModal({
  isOpen,
  onClose,
  onOpenTopUp,
}: AiUsageDiagnosticModalProps) {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/wallet')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) {
          setData(json);
        }
      })
      .catch((e) => console.error('Erreur chargement diagnostic:', e))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const total = data?.wallet?.totalAvailable ?? 0;
  const quota = data?.wallet?.tokensRemaining ?? 0;
  const pack = data?.wallet?.permanentTokens ?? 0;
  const maxQuota = data?.wallet?.monthlyQuota || 8000;
  const isLow = total > 0 && total < 1600;
  const isZero = total <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#963e1b] flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0C2B1E] dark:text-emerald-400">
                Diagnostic d&apos;Usage IA
              </h2>
              <p className="text-[11px] text-stone-500 font-medium">
                Suivi en temps réel de votre consommation de tokens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="py-4 space-y-4">
          {/* Statut Global */}
          <div
            className={`p-4 rounded-2xl border ${
              isZero
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
                : isLow
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-[#963e1b]'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Solde Total Disponible</span>
              <span className="text-lg font-black">{total.toLocaleString('fr-FR')} tokens</span>
            </div>
            <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-black/10 dark:border-white/10">
              <div>
                <span className="opacity-70 text-[10px] block">Quota mensuel</span>
                <span className="font-bold">{quota.toLocaleString('fr-FR')} / {maxQuota.toLocaleString('fr-FR')}</span>
              </div>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <div>
                <span className="opacity-70 text-[10px] block">Packs achetés (permanents)</span>
                <span className="font-bold">{pack.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>

          {/* Métriques Clés */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Questions estimées</span>
              </div>
              <span className="text-xl font-black text-[#0C2B1E] dark:text-stone-100">
                ~{data?.diagnostic?.estimatedQuestionsRemaining ?? 0}
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">sur la base de 500 tokens/question</span>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Coût moyen / échange</span>
              </div>
              <span className="text-xl font-black text-[#0C2B1E] dark:text-stone-100">
                {data?.diagnostic?.avgPerQuery ?? 500} tokens
              </span>
              <span className="text-[10px] text-stone-400 block mt-0.5">moteur Llama 3.3 70B</span>
            </div>
          </div>

          {/* Historique Récent */}
          <div>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
              Dernières consommations (Base de données)
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {data?.diagnostic?.recentLogs && data.diagnostic.recentLogs.length > 0 ? (
                data.diagnostic.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-xs border border-stone-100 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span className="text-stone-600 dark:text-stone-400 text-[11px]">
                        {new Date(log.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-stone-600 dark:text-stone-300">
                        {log.source === 'quota_mensuel' ? 'Quota' : log.source === 'pack_payant' ? 'Pack' : 'Mixte'}
                      </span>
                    </div>
                    <span className="font-bold text-[#963e1b] dark:text-amber-400">
                      -{log.tokensConsommes} tokens
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 text-center py-3">
                  Aucune requête récente enregistrée sur ce compte.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-50"
          >
            Fermer
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenTopUp();
            }}
            className="px-4 py-2 bg-[#963e1b] hover:bg-[#803416] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#C8EF56]" />
            <span>Acheter des tokens</span>
          </button>
        </div>
      </div>
    </div>
  );
}
