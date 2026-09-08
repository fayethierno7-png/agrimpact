'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Lock,
  PhoneCall,
  Sprout,
  AlertTriangle,
} from 'lucide-react';
import PricingTable from '../../components/billing/PricingTable';
import { useAgri } from '../../lib/context/AgriContext';
import { PlanSlug } from '../../lib/saas/types';

function TarifsContent() {
  const searchParams = useSearchParams();
  const planQuery = searchParams.get('plan') as PlanSlug | null;
  const isPaywallRequested = searchParams.get('paywall') === 'true' || searchParams.get('blocked') === 'true';
  const reasonParam = searchParams.get('reason');

  const { profile } = useAgri();
  const isUnpaidOrExpired =
    (profile as any)?.statut_abonnement === 'impaye' ||
    (profile as any)?.statut_compte === 'en_attente';

  const isBlockingPaywall = isPaywallRequested || isUnpaidOrExpired;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col selection:bg-[#963e1b]/20 selection:text-[#963e1b]">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          {!isBlockingPaywall ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-stone-700 hover:text-[#0C2B1E] transition whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Retour au Tableau de Bord</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs font-black text-[#963e1b] uppercase tracking-wider whitespace-nowrap shrink-0">
              <Lock className="w-4 h-4 text-[#963e1b] shrink-0" />
              <span>Accès Restreint • Activation Requise</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 group text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0C2B1E] flex items-center justify-center text-white shadow-xs">
              <Sprout className="w-4 h-4 text-[#C8EF56]" />
            </div>
            <span className="hidden sm:inline font-extrabold text-[#0C2B1E]">AGRIMPACT</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-10">
        {/* BANNIÈRE DE BLOCAGE PAYWALL DÉDIÉE (Point 10) */}
        {isBlockingPaywall && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C2B1E] to-[#164733] text-white border-2 border-[#C8EF56]/40 shadow-xl relative overflow-hidden animate-fade-in">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8EF56]/20 text-[#C8EF56] text-xs font-black uppercase tracking-wider border border-[#C8EF56]/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Abonnement Agricole Requis</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {reasonParam === 'expired'
                    ? 'Votre période d’évaluation est arrivée à échéance'
                    : reasonParam === 'unpaid'
                    ? 'Renouvellement requis pour maintenir vos accès'
                    : 'Activez votre forfait pour débloquer votre exploitation'}
                </h1>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  AgriImpact est un service professionnel d&apos;aide à la décision agronomique 100% dédié aux producteurs sénégalais. Choisissez l&apos;un de nos 3 paliers ci-dessous pour débloquer instantanément les prévisions météo 14j, les alertes sanitaires et l&apos;assistant agronomique IA.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0 bg-white/10 p-4 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Smartphone className="w-4 h-4 text-[#C8EF56]" />
                  <span>Paiement direct Wave &amp; OM</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Activation instantanée sans délai</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABLE DE TARIFICATION OFFICIELLE (Composant 1) */}
        <section className="space-y-6">
          {!isBlockingPaywall && (
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#963e1b] bg-[#963e1b]/10 px-3 py-1 rounded-full">
                Forfaits &amp; Abonnements
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
                Tarification transparente, adaptée au cycle cultural
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Paiement mobile sécurisé par Wave ou Orange Money. Aucun frais caché, aucun engagement.
              </p>
            </div>
          )}

          <PricingTable preselectedPlan={planQuery || 'pro'} showHeader={!isBlockingPaywall} />
        </section>

        {/* GARANTIES & SÉCURITÉ */}
        <section className="pt-8 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-700">
          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-sm">Activation Mobile Immédiate</h3>
            <p className="text-stone-600 leading-relaxed">
              Dès la confirmation du paiement sur votre téléphone Wave ou Orange Money, vos accès sont débloqués en temps réel.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-sm">Zéro Frais Bancaires</h3>
            <p className="text-stone-600 leading-relaxed">
              Vous payez exactement le montant affiché en Francs CFA (XOF) sans surcoût opérateur ni prélèvement imprévu.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-stone-900 text-sm">Assistance Terroir Dédiée</h3>
            <p className="text-stone-600 leading-relaxed">
              Une équipe d&apos;ingénieurs agronomes disponible pour vous guider dans la configuration de vos parcelles au Sénégal.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-stone-200 text-center text-xs text-stone-500 bg-white">
        <p>© 2026 AgriImpact • Copilote Décisionnel Agricole au Sénégal • 100% Payant.</p>
        <p className="mt-1 text-[11px] text-stone-400">
          Transactions sécurisées Wave &amp; Orange Money Sénégal.
        </p>
      </footer>
    </div>
  );
}

export default function TarifsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
          <div className="w-8 h-8 border-3 border-[#0C2B1E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TarifsContent />
    </Suspense>
  );
}
