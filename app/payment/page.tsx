'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DEFAULT_PLANS, DEFAULT_TOKEN_PACKS, formatPriceFCFA } from '../../lib/saas/plansData';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planParam = searchParams.get('plan') || 'pro';
  const providerParam = (searchParams.get('provider') as 'wave' | 'orange_money') || 'wave';
  const cycleParam = (searchParams.get('cycle') as 'mensuel' | 'annuel') || 'mensuel';
  const amountParam = searchParams.get('amount');

  const [provider, setProvider] = useState<'wave' | 'orange_money'>(providerParam);
  const [phoneNumber, setPhoneNumber] = useState('77 123 45 67');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Nouvel état pour gérer l'affichage post-soumission (Le Vrai QR Code)
  const [paymentData, setPaymentData] = useState<{ url: string, transactionId: string, reference: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'expired'>('pending');

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

  // Polling Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (paymentData && paymentStatus === 'pending') {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/status?transactionId=${paymentData.transactionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              setPaymentStatus('completed');
              clearInterval(intervalId);
              // Redirection au succès
              router.push(
                `/payment/success?reference=${paymentData.reference}&plan=${planParam}&provider=${provider}&amount=${amount}`
              );
            }
          }
        } catch (error) {
          console.error("Erreur polling", error);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentData, paymentStatus, router, planParam, provider, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setErrorMessage('Veuillez entrer un numéro de mobile sénégalais valide (9 chiffres).');
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
          // on n'envoie pas amount, le backend gère.
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Échec de la communication avec la passerelle de paiement.');
      }

      if (data.paymentUrl) {
        // Au lieu de rediriger directement, on affiche le QR Code et on lance le polling
        setPaymentData({ 
          url: data.paymentUrl, 
          transactionId: data.transactionId,
          reference: data.orderReference
        });
      } else {
        // Fallback s'il n'y a pas d'URL (ex: mode simulation direct)
        router.push(
          `/payment/success?reference=${data.orderReference || 'AGRI_' + Date.now()}&plan=${planParam}&provider=${provider}&amount=${amount}`
        );
      }
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de l’initialisation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaymentForm = () => (
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
          Ce numéro sera utilisé pour générer la demande de paiement.
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
            <span>Création de la transaction...</span>
          </div>
        ) : (
          <>
            <span>
              Générer le paiement de {formatPriceFCFA(amount)} FCFA
            </span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <p className="text-[11px] text-stone-500 font-medium">
          Paiement sécurisé • Facture et quittance éditées automatiquement
        </p>
      </div>
    </form>
  );

  const renderQRCodeScreen = () => {
    if (!paymentData) return null;
    
    return (
      <div className="p-6 sm:p-8 flex flex-col items-center space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-black text-stone-900">Validation requise</h2>
          <p className="text-sm text-stone-500">
            Ouvrez votre application <strong className={provider === 'wave' ? 'text-[#0070BA]' : 'text-[#FF6600]'}>{provider === 'wave' ? 'Wave' : 'Orange Money'}</strong> pour scanner ce code, ou cliquez sur le bouton si vous êtes sur votre téléphone.
          </p>
        </div>

        <div className="relative overflow-hidden p-4 bg-white border-2 border-stone-200 rounded-3xl shadow-sm">
          <div className={`absolute top-0 left-0 w-full h-1.5 ${provider === 'wave' ? 'bg-[#1DA1F2]' : 'bg-[#FF6600]'}`}></div>
          <div className="p-2 border border-stone-100 rounded-2xl">
            {/* Vrai QR Code généré à partir du vrai URL de paiement UnitechPay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentData.url)}&margin=0`} 
              alt="QR Code de Paiement" 
              className="w-48 h-48 object-contain rounded-lg"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-full">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          En attente du paiement...
        </div>

        <div className="w-full space-y-3 pt-4 border-t border-stone-200">
          <a
            href={paymentData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Smartphone className="w-4 h-4" />
            Ouvrir l'application mobile
          </a>
          
          <button
            onClick={() => setPaymentData(null)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white border-2 border-stone-200 text-stone-600 text-sm font-black hover:bg-stone-50 transition-all"
          >
            Annuler et recommencer
          </button>
        </div>
      </div>
    );
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

          {/* Contenu dynamique (Formulaire ou Ecran de Scan QR) */}
          {paymentData ? renderQRCodeScreen() : renderPaymentForm()}
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
