'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck, Sprout } from 'lucide-react';
import { useAgri } from '../../../lib/context/AgriContext';
import { UserPlan } from '../../../lib/types';
import { PLAN_LIMITS } from '../../../lib/billing/planLimits';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { updatePlan } = useAgri();

  const plan = (searchParams.get('plan') as UserPlan) || 'pro';
  const reference = searchParams.get('reference') || `AGRI_${Date.now()}`;
  const provider = searchParams.get('provider') || 'wave';

  const planInfo = PLAN_LIMITS[plan] || PLAN_LIMITS.pro;

  useEffect(() => {
    // Activer immédiatement le forfait dans le contexte local
    if (plan) {
      updatePlan(plan);
    }
  }, [plan, updatePlan]);

  return (
    <div className="w-full max-w-lg bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
      <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4 shadow-xs">
        <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
      </div>

      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 inline-block border border-emerald-200">
        Paiement validé par UnitechPay
      </span>

      <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mb-2">
        Votre forfait {planInfo.name} est actif !
      </h1>

      <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
        Votre paiement mobile a été traité et validé avec succès. Vos fonctionnalités premium et alertes SMS sont désormais débloquées.
      </p>

      {/* Détails du paiement */}
      <div className="w-full mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Référence commande :</span>
          <span className="font-mono font-bold text-stone-900 text-[11px] truncate max-w-[200px]">
            {reference}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Moyen de paiement :</span>
          <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase">
            <img
              src={provider === 'orange_money' ? '/logos/orange-money.png' : '/logos/wave.jpg'}
              alt={provider === 'orange_money' ? 'Orange Money' : 'Wave'}
              width={16}
              height={16}
              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
              className="w-4 h-4 object-contain rounded"
            />
            <span>{provider === 'orange_money' ? 'Orange Money (OM)' : 'Wave Sénégal'}</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Montant :</span>
          <span className="font-mono font-bold text-emerald-800">
            {planInfo.priceMonthlyCFA.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-stone-500">
          <span>Passerelle certifiée :</span>
          <span className="font-bold text-stone-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            UnitechPay
          </span>
        </div>
      </div>

      <div className="w-full mt-6 space-y-2.5">
        <Link
          href="/dashboard"
          className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/20"
        >
          <span>Accéder à mon tableau de bord</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/profile"
          className="w-full py-2.5 px-4 text-stone-500 hover:text-stone-800 text-xs font-bold block"
        >
          Voir mon profil & forfaits
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-50 min-h-screen px-4 py-8">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white">
          <Sprout className="w-4 h-4 text-emerald-200" />
        </div>
        <span className="font-extrabold text-base tracking-tight text-emerald-950">
          AGRIMPACT SÉNÉGAL
        </span>
      </div>

      <Suspense fallback={<div className="text-xs text-stone-500">Chargement...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
