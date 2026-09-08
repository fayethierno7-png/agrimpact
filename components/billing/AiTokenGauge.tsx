'use client';

import React, { useState } from 'react';
import {
  Zap,
  AlertTriangle,
  Sparkles,
  PlusCircle,
  ShieldCheck,
  ArrowUpRight,
  Info,
  Clock,
} from 'lucide-react';
import { calculateEstimatedMessages } from '../../lib/saas/plansData';
import TokenTopUpModal from './TokenTopUpModal';
import { TokenPack } from '../../lib/saas/types';

export interface AiTokenGaugeProps {
  /** Nombre de tokens mensuels restants */
  tokensRemaining: number;
  /** Quota total mensuel alloué par le plan */
  monthlyQuota: number;
  /** Tokens permanents achetés via packs (n'expirent jamais) */
  permanentTokens?: number;
  /** Date de renouvellement du quota mensuel */
  renewalDate?: string;
  /** Nom du plan actuel (Solo, Pro Producteur, Coopérative & GIE) */
  planName?: string;
  /** Variante d'affichage : dashboard, chat-bar, ou compact */
  variant?: 'dashboard' | 'chat-bar' | 'compact';
  /** Déclenché lors du rechargement réussi */
  onTopUpSuccess?: (pack: TokenPack) => void;
  /** Forcer l'ouverture de la modal */
  className?: string;
}

export const AiTokenGauge: React.FC<AiTokenGaugeProps> = ({
  tokensRemaining,
  monthlyQuota,
  permanentTokens = 0,
  renewalDate,
  planName = 'Pro Producteur',
  variant = 'dashboard',
  onTopUpSuccess,
  className = '',
}) => {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Calcul du ratio restant
  const totalTokensAvailable = Math.max(0, tokensRemaining) + Math.max(0, permanentTokens);
  const quotaRatio = monthlyQuota > 0 ? Math.max(0, tokensRemaining) / monthlyQuota : 0;
  const percentage = Math.min(100, Math.max(0, Math.round(quotaRatio * 100)));

  // Seuils stricts définis par le cahier des charges
  const isDepleted = totalTokensAvailable <= 0;
  const isLow = !isDepleted && quotaRatio < 0.15; // Moins de 15%

  // Estimation des messages restants
  const estMessagesRemaining = calculateEstimatedMessages(totalTokensAvailable);

  // Thème de couleur de la jauge (Sobre et Fintech Premium, Terracotta / Émeraude)
  let barColorClass = 'bg-[#1A543D]'; // Vert émeraude standard
  let badgeColorClass = 'bg-[#0C2B1E]/10 text-[#0C2B1E] border-[#0C2B1E]/20';

  if (isDepleted) {
    barColorClass = 'bg-stone-400'; // État vide sobre
    badgeColorClass = 'bg-red-50 text-red-700 border-red-200';
  } else if (isLow) {
    barColorClass = 'bg-[#C85A32]'; // Orange terracotta ambré
    badgeColorClass = 'bg-amber-50 text-[#963e1b] border-amber-200';
  }

  // -------------------------------------------------------------
  // VARIANTE 1 : COMPACT (Pour le Header ou Navigation)
  // -------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsTopUpOpen(true)}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs cursor-pointer ${
            isDepleted
              ? 'bg-red-50/80 border-red-300 text-red-700 hover:bg-red-100'
              : isLow
              ? 'bg-amber-50/90 border-[#C85A32]/40 text-[#963e1b] hover:bg-amber-100'
              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 shadow-2xs'
          } ${className}`}
          title="Consommation tokens IA"
        >
          <Zap
            className={`w-3.5 h-3.5 ${
              isDepleted
                ? 'text-red-500'
                : isLow
                ? 'text-[#C85A32] animate-pulse'
                : 'text-[#1A543D]'
            }`}
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold font-mono text-[11px]">
              {totalTokensAvailable.toLocaleString('fr-FR')}
            </span>
            <span className="text-[10px] text-stone-500">tokens</span>
          </div>

          <div className="w-12 h-1.5 bg-stone-200 rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-500 ease-out ${barColorClass}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <PlusCircle className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
        </button>

        <TokenTopUpModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          onPurchaseSuccess={onTopUpSuccess}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // VARIANTE 2 : CHAT-BAR (Bandeau d'état pour l'assistant IA)
  // -------------------------------------------------------------
  if (variant === 'chat-bar') {
    return (
      <>
        <div
          className={`w-full p-3 px-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            isDepleted
              ? 'bg-stone-100 border-stone-300 text-stone-800'
              : isLow
              ? 'bg-amber-50/80 border-[#C85A32]/40 text-[#963e1b]'
              : 'bg-[#FAF9F5] border-stone-200 text-stone-700'
          } ${className}`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isDepleted
                  ? 'bg-stone-300 text-stone-600'
                  : isLow
                  ? 'bg-[#C85A32]/15 text-[#C85A32]'
                  : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
              }`}
            >
              {isLow ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </div>

            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-stone-900">
                  {isDepleted
                    ? 'Quota IA épuisé pour ce cycle'
                    : `${totalTokensAvailable.toLocaleString('fr-FR')} tokens disponibles`}
                </span>
                <span className="text-[10px] text-stone-500">
                  ({percentage}% du forfait {planName})
                </span>
              </div>

              {/* Message spécifique < 15% */}
              {isLow && !isDepleted && (
                <p className="text-[11px] font-medium text-[#963e1b]">
                  Il te reste environ <strong>{estMessagesRemaining} messages</strong> ce
                  mois-ci.
                </p>
              )}

              {/* Message d'épuisement */}
              {isDepleted && (
                <p className="text-[11px] text-stone-600">
                  Le chat est suspendu jusqu’au renouvellement ou recharge immédiate.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="w-24 sm:w-28 h-2 bg-stone-200 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full transition-all duration-500 ease-out ${barColorClass}`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isDepleted || isLow
                  ? 'bg-[#963e1b] hover:bg-[#823315] text-white shadow-xs'
                  : 'bg-[#0C2B1E] hover:bg-[#123C2B] text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Recharger</span>
            </button>
          </div>
        </div>

        <TokenTopUpModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          onPurchaseSuccess={onTopUpSuccess}
        />
      </>
    );
  }

  // -------------------------------------------------------------
  // VARIANTE 3 : DASHBOARD CARD (Composante principale du tableau de bord)
  // -------------------------------------------------------------
  return (
    <>
      <div
        className={`relative bg-[#FAF9F5] text-stone-900 rounded-3xl border border-stone-200/80 p-6 sm:p-7 shadow-xs overflow-hidden transition-all duration-300 ${className}`}
      >
        {/* En-tête de la carte */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-2xs ${
                isDepleted
                  ? 'bg-stone-200 text-stone-600'
                  : isLow
                  ? 'bg-[#C85A32]/15 text-[#C85A32]'
                  : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-stone-900">
                  Consommation IA & Diagnostics
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                  Palier {planName}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Assistant agronomique, météo et analyses sanitaires
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTopUpOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0C2B1E] hover:bg-[#123C2B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C8EF56]" />
            <span>Recharger</span>
          </button>
        </div>

        {/* Chiffres clés */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-stone-900">
              {Math.max(0, tokensRemaining).toLocaleString('fr-FR')}
            </span>
            <span className="text-xs font-bold text-stone-500">
              / {monthlyQuota.toLocaleString('fr-FR')} tokens mensuels
            </span>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeColorClass}`}
            >
              {percentage}% restant
            </span>
          </div>
        </div>

        {/* Barre de progression avec animation sobre (fade + easing) */}
        <div className="w-full h-3.5 bg-stone-200 rounded-full overflow-hidden relative mb-4">
          <div
            className={`h-full transition-all duration-700 ease-out rounded-full ${barColorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Alerte discrète quand < 15% */}
        {isLow && !isDepleted && (
          <div className="p-3 mb-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-2.5 text-xs text-[#963e1b] animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-[#C85A32] shrink-0" />
            <span>
              Il te reste environ <strong>{estMessagesRemaining} messages</strong> ce
              mois-ci avec l&apos;assistant.
            </span>
          </div>
        )}

        {/* Alerte d'épuisement */}
        {isDepleted && (
          <div className="p-3 mb-4 rounded-2xl bg-stone-100 border border-stone-300 flex items-center justify-between gap-2.5 text-xs text-stone-700 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>
                Quota mensuel épuisé. Le chat assistant est bloqué en attente de recharge.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className="text-[#963e1b] font-bold hover:underline shrink-0"
            >
              Acheter un pack →
            </button>
          </div>
        )}

        {/* Détail tokens permanents achetés & Date de renouvellement */}
        <div className="pt-4 border-t border-stone-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#963e1b] shrink-0" />
            <span>
              Packs permanents :{' '}
              <strong className="text-stone-900">
                {permanentTokens.toLocaleString('fr-FR')} tokens
              </strong>{' '}
              <span className="text-[10px] text-stone-500">(n&apos;expirent jamais)</span>
            </span>
          </div>

          {renewalDate && (
            <div className="flex items-center gap-2 sm:justify-end">
              <Clock className="w-4 h-4 text-stone-400 shrink-0" />
              <span>
                Renouvellement du quota :{' '}
                <strong className="text-stone-900">{renewalDate}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <TokenTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onPurchaseSuccess={onTopUpSuccess}
      />
    </>
  );
};

export default AiTokenGauge;
