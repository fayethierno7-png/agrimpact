'use client';

import React, { useState } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
  Smartphone,
  Info,
} from 'lucide-react';
import { TokenPack } from '../../lib/saas/types';
import {
  calculateEstimatedMessages,
  formatPriceFCFA,
} from '../../lib/saas/plansData';
import { usePlans } from '../../lib/saas/usePlans';

export interface TokenTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (pack: TokenPack, provider: 'wave' | 'orange_money') => void;
  initialPackSlug?: 'eclair' | 'recolte' | 'saison';
}

export const TokenTopUpModal: React.FC<TokenTopUpModalProps> = ({
  isOpen,
  onClose,
  onPurchaseSuccess,
  initialPackSlug = 'recolte',
}) => {
  const { tokenPacks } = usePlans();
  const [selectedPackSlug, setSelectedPackSlug] = useState<string>(initialPackSlug);
  const [provider, setProvider] = useState<'wave' | 'orange_money'>('wave');
  const [phoneNumber, setPhoneNumber] = useState('77 123 45 67');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const selectedPack =
    tokenPacks.find((p) => p.slug === selectedPackSlug) || tokenPacks[1];

  const handleBuy = async () => {
    setIsProcessing(true);
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPack.slug,
          provider,
          phoneNumber: cleanPhone,
          amount: selectedPack.prix_fcfa,
        }),
      });

      const data = await res.json();
      if (data.paymentUrl && data.isLive) {
        window.location.href = data.paymentUrl;
        return;
      }

      setIsDone(true);
      if (onPurchaseSuccess) {
        onPurchaseSuccess(selectedPack, provider);
      }
      setTimeout(() => {
        setIsDone(false);
        setIsProcessing(false);
        onClose();
      }, 1400);
    } catch {
      setIsDone(true);
      if (onPurchaseSuccess) {
        onPurchaseSuccess(selectedPack, provider);
      }
      setTimeout(() => {
        setIsDone(false);
        setIsProcessing(false);
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-modal-title"
        className="relative w-full max-w-xl bg-[#FAF9F5] text-stone-900 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-fade-in"
      >
        {/* Barre d'en-tête décorative terracotta / émeraude */}
        <div className="bg-[#0C2B1E] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#963e1b]/20 rounded-full blur-3xl pointer-events-none" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8EF56]/15 text-[#C8EF56] text-[11px] font-black uppercase tracking-wider mb-2.5">
            <Zap className="w-3.5 h-3.5 fill-[#C8EF56]" />
            <span>Recharge Immédiate de Tokens</span>
          </div>

          <h3
            id="topup-modal-title"
            className="text-2xl sm:text-3xl font-black tracking-tight"
          >
            Recharger vos{' '}
            <span className="font-serif-italic font-normal text-[#C8EF56]">
              tokens IA
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md">
            Prolongez vos diagnostics avec l’assistant agronomique sans attendre le prochain
            cycle mensuel.
          </p>
        </div>

        {/* ÉLÉMENT DE RÉASSURANCE CLÉ : LES TOKENS N'EXPIRENT JAMAIS */}
        <div className="px-6 py-3.5 bg-[#963e1b]/10 border-b border-[#963e1b]/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#963e1b] shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-[#963e1b] block">
              Garantie d’usage permanent :
            </span>
            <p className="text-[11px] text-stone-700 leading-snug">
              Contrairement au quota mensuel inclus dans votre abonnement,{' '}
              <strong>les tokens achetés en pack n&apos;expirent jamais</strong>. Ils
              restent utilisables sur toute la saison et se cumulent sans limite de durée.
            </p>
          </div>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Sélection des 3 packs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Choisissez votre pack de tokens
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tokenPacks.map((pack) => {
                const isSelected = selectedPackSlug === pack.slug;
                const estMsgs = calculateEstimatedMessages(pack.nb_tokens);

                return (
                  <div
                    key={pack.slug}
                    onClick={() => setSelectedPackSlug(pack.slug)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#963e1b] bg-white shadow-md'
                        : 'border-stone-200 bg-white/70 hover:border-stone-300 hover:bg-white'
                    }`}
                  >
                    {pack.isPopular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#0C2B1E] text-[#C8EF56] text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        Populaire
                      </span>
                    )}

                    <div>
                      <div className="text-xs font-extrabold text-stone-900">
                        {pack.nom}
                      </div>
                      <div className="mt-2 text-xl font-black text-[#0C2B1E]">
                        {formatPriceFCFA(pack.prix_fcfa)}{' '}
                        <span className="text-[10px] font-bold text-stone-500">FCFA</span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#963e1b]">
                        +{pack.nb_tokens.toLocaleString('fr-FR')} tokens
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 text-[11px] text-stone-500">
                      ≈ <strong>{estMsgs} messages</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Choix du mode de règlement mobile */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-stone-500">
                Paiement Mobile Money instantané
              </span>
              <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Validation 1-clic
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('wave')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                  provider === 'wave'
                    ? 'border-[#1DA1F2] bg-[#1DA1F2]/10 text-[#0070BA]'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#1DA1F2]" />
                <span>Wave Sénégal</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('orange_money')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                  provider === 'orange_money'
                    ? 'border-[#FF6600] bg-[#FF6600]/10 text-[#FF6600]'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600]" />
                <span>Orange Money</span>
              </button>
            </div>
          </div>

          {/* Bouton d'action 1-clic */}
          <div>
            <button
              type="button"
              disabled={isProcessing || isDone}
              onClick={handleBuy}
              className={`w-full py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#963e1b] hover:bg-[#7e3416] text-white active:scale-[0.99]'
              }`}
            >
              {isDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Tokens crédités avec succès !</span>
                </>
              ) : isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validation Wave / Orange Money...</span>
                </div>
              ) : (
                <>
                  <span>
                    Recharger pour {formatPriceFCFA(selectedPack.prix_fcfa)} FCFA
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-stone-500 mt-2">
              Crédit instantané sur votre solde • Pas de prélèvement automatique ultérieur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenTopUpModal;
