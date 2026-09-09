'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { DEFAULT_PLANS, DEFAULT_TOKEN_PACKS, formatPriceFCFA } from '../../lib/saas/plansData';
import { useAgri } from '../../lib/context/AgriContext';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAgri();

  const planParam = searchParams.get('plan') || 'pro';
  const providerParam = (searchParams.get('provider') as 'wave' | 'orange_money') || 'wave';
  const cycleParam = (searchParams.get('cycle') as 'mensuel' | 'annuel') || 'mensuel';
  const amountParam = searchParams.get('amount');

  const [provider, setProvider] = useState<'wave' | 'orange_money'>(providerParam);
  const [phoneNumber, setPhoneNumber] = useState('77 123 45 67');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recherche du plan ou pack correspondant
  const matchingPlan = DEFAULT_PLANS.find((p) => p.slug === planParam);
  const matchingPack = DEFAULT_TOKEN_PACKS.find((p) => p.slug === planParam);

  const title = matchingPlan
    ? `Abonnement ${matchingPlan.nom}`
    : matchingPack
    ? matchingPack.nom
    : 'Abonnement Professionnel AgriImpact';

  const amount = amountParam
    ? parseInt(amountParam, 10)
    : matchingPlan
    ? cycleParam === 'annuel'
      ? matchingPlan.prix_annuel_fcfa
      : matchingPlan.prix_mensuel_fcfa
    : matchingPack
    ? matchingPack.prix_fcfa
    : 5900;

  useEffect(() => {
    if (providerParam) {
      setProvider(providerParam);
    }
  }, [providerParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setErrorMessage('Veuillez entrer un numéro de mobile sénégalais valide (9 chiffres, ex: 77 123 45 67).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planParam,
          provider,
          phoneNumber: cleanPhone,
          cycle: cycleParam,
          userId: profile?.user_id || 'anonymous',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Échec de la communication avec la passerelle de paiement.');
      }

      if (data.paymentUrl) {
        // Redirection directe vers le portail officiel Wave ou Orange Money
        window.location.href = data.paymentUrl;
      } else {
        // Redirection vers la page de confirmation de commande
        router.push(
          `/payment/success?reference=${data.orderReference || 'AGRI_' + Date.now()}&plan=${planParam}&provider=${provider}&amount=${amount}`
        );
      }
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de l’initialisation.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EB] text-stone-900 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg">
        {/* Navigation retour */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#0C2B1E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Modifier mon choix de formule</span>
          </Link>

          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Paiement 256-bit SSL
          </span>
        </div>

        {/* Carte Principale de Règlement */}
        <div className="bg-[#FAF9F5] border border-stone-300/80 rounded-3xl shadow-xl overflow-hidden animate-fade-in">
          {/* En-tête éditorial */}
          <div className="bg-[#0C2B1E] text-white p-6 sm:p-7 relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8EF56]/15 text-[#C8EF56] text-[10px] font-black uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Passerelle Sécurisée UnitechPay</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">
              Règlement sans carte bancaire par portefeuille mobile local.
            </p>
          </div>

          {/* Récapitulatif de la commande */}
          <div className="p-6 sm:p-7 border-b border-stone-200 bg-white/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Formule sélectionnée :</span>
              <span className="font-extrabold text-stone-900">{title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Fréquence de facturation :</span>
              <span className="font-bold text-stone-900 capitalize">
                {cycleParam === 'annuel' ? 'Annuelle (-20% déduit)' : 'Mensuelle sans engagement'}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-stone-900">Total à régler :</span>
              <div className="text-right">
                <span className="text-3xl font-black text-[#963e1b] tracking-tight font-sans">
                  {formatPriceFCFA(amount)}
                </span>
                <span className="text-xs font-bold text-stone-600 ml-1.5">FCFA</span>
              </div>
            </div>
          </div>

          {/* Formulaire de paiement Mobile Money */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
            {/* 1. Sélection opérateur */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2.5">
                1. Choisissez votre compte Mobile Money
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('wave')}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    provider === 'wave'
                      ? 'border-[#1DA1F2] bg-[#1DA1F2]/10 text-[#0070BA] shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1DA1F2]" />
                  <span>Wave Sénégal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('orange_money')}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                    provider === 'orange_money'
                      ? 'border-[#FF6600] bg-[#FF6600]/10 text-[#FF6600] shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600]" />
                  <span>Orange Money</span>
                </button>
              </div>
            </div>

            {/* 2. Numéro de téléphone */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                2. Numéro de téléphone rattaché au compte
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-stone-500">
                  +221
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="77 123 45 67"
                  className="w-full pl-14 pr-4 py-3 bg-white border border-stone-300 rounded-2xl text-sm font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0C2B1E]"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5 font-medium">
                Vous serez redirigé automatiquement vers l'application {provider === 'wave' ? 'Wave' : 'Orange Money'} pour valider le débit.
              </p>
            </div>

            {/* Alerte d'erreur */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bouton de confirmation */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#963e1b] hover:bg-[#823315] text-white text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Redirection vers {provider === 'wave' ? 'Wave' : 'Orange Money'}...</span>
                </div>
              ) : (
                <>
                  <span>
                    Valider le paiement de {formatPriceFCFA(amount)} FCFA
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-stone-500 font-medium">
                Paiement instantané • Facture et quittance éditées automatiquement
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F3EB]">
          <div className="w-8 h-8 border-3 border-[#0C2B1E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
