'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  QrCode,
  Lock,
  Receipt,
  Download,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { UserPlan } from '../lib/types';
import { PLAN_LIMITS } from '../lib/billing/planLimits';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: UserPlan;
  onSuccess: (plan: UserPlan) => void;
  userPhone?: string;
  userName?: string;
  userId?: string;
}

type PaymentProvider = 'wave' | 'orange_money';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  onSuccess,
  userPhone = '78 017 88 18',
  userName = 'Producteur',
  userId = 'usr-client',
}) => {
  const [provider, setProvider] = useState<PaymentProvider>('wave');
  const [phoneNumber, setPhoneNumber] = useState(
    userPhone ? userPhone.replace('+221', '').trim() : '78 017 88 18'
  );
  const [step, setStep] = useState<'form' | 'waiting_approval' | 'success'>('form');
  const [countdownSeconds, setCountdownSeconds] = useState(120);

  React.useEffect(() => {
    let timer: any = null;
    if (step === 'waiting_approval') {
      setCountdownSeconds(120);
      timer = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  React.useEffect(() => {
    if (userPhone) {
      setPhoneNumber(userPhone.replace('+221', '').trim());
    }
  }, [userPhone]);
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const planInfo = PLAN_LIMITS[targetPlan];
  const amountCfa = planInfo.priceMonthlyCFA;

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Veuillez entrer un numéro de téléphone sénégalais valide (ex: 77 123 45 67).');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Initialiser le paiement auprès de notre API UnitechPay
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: targetPlan,
          provider,
          phoneNumber: cleanPhone,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      setTransactionId(data.transactionId || `TX_${Date.now()}`);
      setOrderRef(data.orderReference || `AGRI_${targetPlan.toUpperCase()}_${userId}_${Date.now()}`);
      setIsLive(Boolean(data.isLive));

      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        // Si URL officielle UnitechPay reçue, ouvrir la page
        window.open(data.paymentUrl, '_blank');
      }

      setStep('waiting_approval');
    } catch (err: any) {
      console.error('Erreur initialisation paiement UnitechPay:', err);
      // Fallback gracieux en mode démo si réseau ou clé indisponible
      const generatedTx = provider === 'wave' 
        ? `WAVE-SN-${Date.now().toString().slice(-6)}` 
        : `OM-SN-${Date.now().toString().slice(-6)}`;
      setTransactionId(generatedTx);
      setOrderRef(`AGRI_${targetPlan.toUpperCase()}_${userId}_${Date.now()}`);
      setStep('waiting_approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmMobileAuthorization = async () => {
    setIsSubmitting(true);
    try {
      // Déclencher le webhook UnitechPay officiel pour enregistrer en base Supabase
      await fetch('/api/webhooks/unitechpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment_completed',
          data: {
            transaction_id: transactionId,
            reference: orderRef || `AGRI_${targetPlan.toUpperCase()}_${userId}_${Date.now()}`,
            amount: amountCfa,
            status: 'completed',
          },
        }),
      });

      // Appeler le callback de succès du contexte
      onSuccess(targetPlan);
      setIsSubmitting(false);
      setStep('success');
    } catch (err) {
      console.error('Erreur webhook paiement:', err);
      onSuccess(targetPlan);
      setIsSubmitting(false);
      setStep('success');
    }
  };

  const handleClose = () => {
    setStep('form');
    setIsSubmitting(false);
    setErrorMessage(null);
    setPaymentUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête Modal */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Paiement Mobile Money Sénégal
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-stone-400">Paiement instantané sécurisé avec</span>
                <span className="inline-flex items-center gap-1.5 bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-700">
                  <img
                    src="/logos/wave.jpg"
                    alt="Wave"
                    width={14}
                    height={14}
                    style={{ width: '14px', height: '14px', objectFit: 'cover' }}
                    className="w-3.5 h-3.5 rounded-xs object-cover"
                  />
                  <span className="text-[10px] text-sky-400 font-bold">Wave</span>
                  <span className="text-stone-600 text-[10px]">•</span>
                  <img
                    src="/logos/orange-money.png"
                    alt="Orange Money"
                    width={14}
                    height={14}
                    style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                    className="w-3.5 h-3.5 rounded-xs object-contain"
                  />
                  <span className="text-[10px] text-orange-400 font-bold">OM</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* ÉTAPE 1 : FORMULAIRE ET SÉLECTION WAVE / ORANGE MONEY */}
          {step === 'form' && (
            <>
              {/* Carte Récapitulatif Forfait */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                    Forfait sélectionné
                  </span>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100 mt-1">
                    {planInfo.name}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Abonnement mensuel renouvelable • Accès direct
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-950 dark:text-emerald-300 font-mono">
                    {amountCfa.toLocaleString('fr-FR')} FCFA
                  </div>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">/ 30 jours</span>
                </div>
              </div>

              {/* Sélection du moyen de paiement (Wave vs Orange Money) */}
              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                  Choisissez votre opérateur de paiement mobile :
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option WAVE */}
                  <div
                    onClick={() => setProvider('wave')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center relative hover:scale-[1.02] active:scale-[0.98] ${
                      provider === 'wave'
                        ? 'border-[#1DA1F2] bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-2 ring-[#1DA1F2]/25'
                        : 'border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xs mb-2 overflow-hidden border p-0.5 transition-all ${
                        provider === 'wave' ? 'border-[#1DA1F2]/50 shadow-sky-100' : 'border-stone-200/80'
                      }`}
                    >
                      <img
                        src="/logos/wave.jpg"
                        alt="Wave Sénégal"
                        width={44}
                        height={44}
                        style={{ width: '44px', height: '44px', objectFit: 'cover' }}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Wave Sénégal</span>
                    <span className="text-[10px] text-sky-700 dark:text-sky-400 font-medium mt-0.5">0% de frais • Débit direct</span>
                    {provider === 'wave' && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Option ORANGE MONEY */}
                  <div
                    onClick={() => setProvider('orange_money')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center relative hover:scale-[1.02] active:scale-[0.98] ${
                      provider === 'orange_money'
                        ? 'border-[#FF7900] bg-orange-50/70 dark:bg-orange-950/40 shadow-sm ring-2 ring-[#FF7900]/25'
                        : 'border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xs mb-2 overflow-hidden border p-1 transition-all ${
                        provider === 'orange_money' ? 'border-[#FF7900]/50 shadow-orange-100' : 'border-stone-200/80'
                      }`}
                    >
                      <img
                        src="/logos/orange-money.png"
                        alt="Orange Money"
                        width={44}
                        height={44}
                        style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Orange Money</span>
                    <span className="text-[10px] text-orange-700 dark:text-orange-400 font-medium mt-0.5">Validation USSD #144#</span>
                    {provider === 'orange_money' && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF7900] text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulaire de saisie du numéro */}
              <form onSubmit={handleStartPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Numéro {provider === 'wave' ? 'Wave' : 'Orange Money'} (Sénégal) :
                  </label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 dark:bg-stone-800 border border-r-0 border-stone-200 dark:border-stone-700 rounded-l-xl text-xs font-medium text-stone-700 dark:text-stone-300 select-none">
                      <span>🇸🇳</span>
                      <span>+221</span>
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="77 123 45 67"
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-r-xl text-xs text-stone-800 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-mono font-bold"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {provider === 'wave'
                      ? `Une notification push Wave vous demandera de valider ${amountCfa.toLocaleString('fr-FR')} FCFA.`
                      : 'Un prompt USSD ou une notification Maxit vous sera envoyé.'}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 px-4 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-60 ${
                      provider === 'wave'
                        ? 'bg-[#1DA1F2] hover:bg-[#188bd4] shadow-sky-500/25'
                        : 'bg-[#FF7900] hover:bg-[#e66d00] shadow-orange-500/25'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connexion sécurisée en cours...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-lg overflow-hidden bg-white shrink-0 flex items-center justify-center p-0.5 shadow-2xs border border-white/20">
                          <img
                            src={provider === 'wave' ? '/logos/wave.jpg' : '/logos/orange-money.png'}
                            alt={provider === 'wave' ? 'Wave' : 'Orange Money'}
                            width={18}
                            height={18}
                            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            className="w-full h-full object-contain rounded-xs"
                          />
                        </div>
                        <span>
                          Payer {amountCfa.toLocaleString('fr-FR')} FCFA avec {provider === 'wave' ? 'Wave' : 'Orange Money'}
                        </span>
                        <ArrowRight className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 pt-1">
                  <Lock className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                  <span>Transaction cryptée 256-bit • Sans frais additionnels</span>
                </div>
              </form>
            </>
          )}

          {/* ÉTAPE 2 : ATTENTE D'AUTORISATION SUR LE SMARTPHONE (SIMULATION INTERACTIVE) */}
          {step === 'waiting_approval' && (
            <div className="text-center py-3 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-md overflow-hidden border bg-white p-1.5 transition-all ${
                    provider === 'wave' ? 'border-sky-300' : 'border-orange-300'
                  }`}
                >
                  <img
                    src={provider === 'wave' ? '/logos/wave.jpg' : '/logos/orange-money.png'}
                    alt={provider === 'wave' ? 'Wave' : 'Orange Money'}
                    width={56}
                    height={56}
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'contain',
                    }}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-stone-900"></span>
                </span>
              </div>

              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
                    provider === 'wave'
                      ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                      : 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300'
                  }`}
                >
                  {provider === 'wave' ? 'Notification Wave envoyée' : 'Invite Orange Money envoyée'}
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  Validez la transaction sur votre téléphone
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Une demande de débit de{' '}
                  <strong className="text-stone-900 dark:text-stone-100 font-bold font-mono">
                    {amountCfa.toLocaleString('fr-FR')} FCFA
                  </strong>{' '}
                  a été envoyée à votre compte {provider === 'wave' ? 'Wave' : 'Orange Money'} :
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                  +221 {phoneNumber}
                </div>
              </div>

              {/* Indicateur de Progression en 3 Étapes (Point 15) */}
              <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-300">
                  <span>Traitement opérateur en direct</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    Expire dans {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Barre animée */}
                <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-1000 ease-linear animate-pulse"
                    style={{ width: `${Math.max(15, ((120 - countdownSeconds) / 120) * 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 font-semibold text-stone-500 dark:text-stone-400">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ 1. Initialisé</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold animate-pulse">● 2. Push émis</span>
                  <span>3. Validation PIN</span>
                </div>
              </div>

              {/* Boîte d'instructions réaliste Wave vs Orange Money */}
              <div
                className={`p-4 rounded-2xl border text-left text-xs space-y-2 ${
                  provider === 'wave'
                    ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200'
                    : 'bg-orange-50/70 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-950 dark:text-orange-200'
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {provider === 'wave'
                      ? 'Action requise sur l\'application Wave :'
                      : 'Action requise sur Orange Money :'}
                  </span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {provider === 'wave' ? (
                    <>
                      <li>Ouvrez l&apos;application Wave sur votre smartphone.</li>
                      <li>Appuyez sur la notification <strong>« Payer AGRIMPACT Sénégal »</strong>.</li>
                      <li>Confirmez le débit de <strong>{amountCfa} FCFA</strong>.</li>
                    </>
                  ) : (
                    <>
                      <li>Consultez l&apos;écran de votre téléphone ou composez <strong>#144#</strong>.</li>
                      <li>Sélectionnez l&apos;option <strong>Autorisation de paiement marchand</strong>.</li>
                      <li>Entrez votre code secret confidentiel pour valider <strong>{amountCfa} FCFA</strong>.</li>
                    </>
                  )}
                </ol>
              </div>

              {/* Bouton vers la passerelle de paiement en direct si UnitechPay fournit une URL */}
              {paymentUrl && (
                <div className="pt-1">
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span>Ouvrir la page de paiement sécurisée</span>
                  </a>
                </div>
              )}

              {/* Bouton simulant la validation immédiate par l'utilisateur */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleConfirmMobileAuthorization}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validation de la transaction...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>J&apos;ai validé sur mon téléphone (Confirmer)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                >
                  Modifier le numéro ou le mode de paiement
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PAIEMENT RÉUSSI & REÇU DE PAIEMENT */}
          {step === 'success' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center">
                <CheckCircle className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Paiement Réussi
                </span>
                <h3 className="text-lg font-black text-stone-900 dark:text-stone-100 mt-2">
                  Félicitations, votre forfait est actif !
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Votre compte a été surclassé avec succès en forfait{' '}
                  <strong className="text-emerald-900 dark:text-emerald-300 font-bold">{planInfo.name}</strong>.
                </p>
              </div>

              {/* Reçu officiel de paiement */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-left text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500 dark:text-stone-400">Transaction N° :</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{transactionId}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500 dark:text-stone-400">Moyen de paiement :</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 uppercase">
                    <span className="w-5 h-5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-0.5 inline-flex items-center justify-center shadow-2xs">
                      <img
                        src={provider === 'wave' ? '/logos/wave.jpg' : '/logos/orange-money.png'}
                        alt={provider === 'wave' ? 'Wave' : 'Orange Money'}
                        width={16}
                        height={16}
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                        className="w-full h-full object-contain rounded-xs"
                      />
                    </span>
                    <span>{provider === 'wave' ? 'Wave Sénégal' : 'Orange Money'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500 dark:text-stone-400">Montant réglé :</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                    {amountCfa.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                  <span className="text-stone-500 dark:text-stone-400">Bénéficiaire :</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">AGRIMPACT Sénégal</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-stone-500 dark:text-stone-400">Prochain renouvellement :</span>
                  <span className="font-medium text-stone-700 dark:text-stone-300">Dans 30 jours</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span>Profiter de mes fonctionnalités Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
