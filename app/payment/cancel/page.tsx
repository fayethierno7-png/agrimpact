'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, RefreshCw, Sprout } from 'lucide-react';

function CancelContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';

  return (
    <div className="w-full max-w-lg bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4 shadow-xs">
        <AlertTriangle className="w-9 h-9 stroke-[2]" />
      </div>

      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 inline-block border border-amber-200">
        Paiement non finalisé
      </span>

      <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mb-2">
        La transaction a été annulée
      </h1>

      <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
        Vous avez annulé la procédure de paiement sur la passerelle UnitechPay ou le délai a expiré. Aucun montant n&apos;a été débité de votre compte.
      </p>

      <div className="w-full mt-6 space-y-2.5">
        <Link
          href="/profile"
          className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Réessayer le paiement (Wave / OM)</span>
        </Link>
        <Link
          href="/dashboard"
          className="w-full py-2.5 px-4 text-stone-500 hover:text-stone-800 text-xs font-bold block"
        >
          Retourner au tableau de bord
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-stone-50 min-h-screen px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white">
          <Sprout className="w-4 h-4 text-emerald-200" />
        </div>
        <span className="font-extrabold text-base tracking-tight text-emerald-950">
          AGRIMPACT SÉNÉGAL
        </span>
      </div>

      <Suspense fallback={<div className="text-xs text-stone-500">Chargement...</div>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}
