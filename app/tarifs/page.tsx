'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Layers,
  Info,
} from 'lucide-react';
import PricingTable from '../../components/billing/PricingTable';
import AiTokenGauge from '../../components/billing/AiTokenGauge';
import LimitReached from '../../components/billing/LimitReached';
import TokenTopUpModal from '../../components/billing/TokenTopUpModal';
import { PlanSlug } from '../../lib/saas/types';

function TarifsContent() {
  const searchParams = useSearchParams();
  const planQuery = searchParams.get('plan') as PlanSlug | null;

  // Démonstration interactive de la jauge IA
  const [demoGaugeState, setDemoGaugeState] = useState<'normal' | 'low' | 'depleted'>('normal');
  const [simulatedTokens, setSimulatedTokens] = useState({
    remaining: 42500,
    quota: 60000,
    permanent: 15000,
  });

  // Démonstration du Paywall LimitReached
  const [activePaywallDemo, setActivePaywallDemo] = useState<null | {
    feature: 'parcelles' | 'sms' | 'utilisateurs';
    current: number;
    max: number;
    planName: string;
  }>(null);

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  // Mise à jour de la démo jauge
  const handleSetGaugeState = (state: 'normal' | 'low' | 'depleted') => {
    setDemoGaugeState(state);
    if (state === 'normal') {
      setSimulatedTokens({ remaining: 42500, quota: 60000, permanent: 15000 });
    } else if (state === 'low') {
      setSimulatedTokens({ remaining: 4500, quota: 60000, permanent: 0 }); // < 15% (7.5%)
    } else {
      setSimulatedTokens({ remaining: 0, quota: 60000, permanent: 0 }); // 0 tokens (épuisé)
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EB] text-stone-900 flex flex-col selection:bg-[#963e1b]/20 selection:text-[#963e1b]">
      {/* Navigation supérieure de retour */}
      <header className="sticky top-0 z-40 bg-[#F5F3EB]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-stone-700 hover:text-[#0C2B1E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au Tableau de Bord</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Exemple de jauge compacte dans le header */}
          <AiTokenGauge
            tokensRemaining={simulatedTokens.remaining}
            monthlyQuota={simulatedTokens.quota}
            permanentTokens={simulatedTokens.permanent}
            variant="compact"
          />

          <Link
            href="/assistant"
            className="px-3.5 py-1.5 rounded-full bg-[#0C2B1E] text-white text-xs font-bold hover:bg-[#123C2B] transition"
          >
            Assistant IA
          </Link>
        </div>
      </header>

      {/* COMPOSANT 1 : TABLE DE TARIFICATION OFFICIELLE AGRIMPACT */}
      <main className="flex-1">
        <PricingTable preselectedPlan={planQuery || 'pro'} />

        {/* SECTION DÉMONSTRATION INTERACTIVE : COMPOSANTS 2 & 3 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-stone-300/70">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#963e1b] bg-[#963e1b]/10 px-3 py-1 rounded-full">
              Démonstrateur Interactif Senior
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-3">
              Jauge de Consommation IA & Paywall Réutilisable
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-2">
              Testez en conditions réelles les 3 états de la jauge (normal, alerte &lt;15%,
              vide avec blocage) et le comportement du paywall orienté valorisation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* 1. Démonstration de la jauge IA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  Composant 2 : Jauge IA (3 états réactifs)
                </h4>
                <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetGaugeState('normal')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      demoGaugeState === 'normal'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Normal (70%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGaugeState('low')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      demoGaugeState === 'low'
                        ? 'bg-[#963e1b] text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    &lt; 15% (Alerte)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGaugeState('depleted')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      demoGaugeState === 'depleted'
                        ? 'bg-stone-800 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    0 tokens (Vide)
                  </button>
                </div>
              </div>

              {/* Rendu de la Jauge format Dashboard */}
              <AiTokenGauge
                tokensRemaining={simulatedTokens.remaining}
                monthlyQuota={simulatedTokens.quota}
                permanentTokens={simulatedTokens.permanent}
                planName="Pro Producteur"
                renewalDate="1er du mois prochain"
                variant="dashboard"
                onTopUpSuccess={(pack) => {
                  setSimulatedTokens((prev) => ({
                    ...prev,
                    permanent: prev.permanent + pack.nb_tokens,
                  }));
                }}
              />

              {/* Rendu de la Jauge format Chat-Bar */}
              <div className="mt-4">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Aperçu dans le chat assistant :
                </div>
                <AiTokenGauge
                  tokensRemaining={simulatedTokens.remaining}
                  monthlyQuota={simulatedTokens.quota}
                  permanentTokens={simulatedTokens.permanent}
                  planName="Pro Producteur"
                  variant="chat-bar"
                  onTopUpSuccess={(pack) => {
                    setSimulatedTokens((prev) => ({
                      ...prev,
                      permanent: prev.permanent + pack.nb_tokens,
                    }));
                  }}
                />
              </div>
            </div>

            {/* 2. Démonstration du Paywall LimitReached */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                Composant 3 : Paywall Générique Réutilisable
              </h4>

              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-xs space-y-3">
                <p className="text-stone-600 leading-relaxed">
                  Déclencheur universel à appeler dès qu&apos;une action utilisateur excède un
                  plafond contractuel (parcelles, SMS, etc.).
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePaywallDemo({
                        feature: 'parcelles',
                        current: 10,
                        max: 10,
                        planName: 'Pro Producteur',
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-[#0C2B1E] text-white font-bold hover:bg-[#123C2B] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#C8EF56]" />
                    <span>Dépasser 10 parcelles (Modal)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActivePaywallDemo({
                        feature: 'sms',
                        current: 50,
                        max: 50,
                        planName: 'Pro Producteur',
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-[#963e1b] text-white font-bold hover:bg-[#823315] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Plafond 50 SMS (Modal)</span>
                  </button>
                </div>
              </div>

              {/* Version inline card de démonstration */}
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Version Encart / Card (intégrable dans un formulaire) :
                </div>
                <LimitReached
                  feature="parcelles"
                  current={10}
                  max={10}
                  planName="Pro Producteur"
                  mode="card"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Paywall Modal actif si déclenché par un bouton */}
      {activePaywallDemo && (
        <LimitReached
          feature={activePaywallDemo.feature}
          current={activePaywallDemo.current}
          max={activePaywallDemo.max}
          planName={activePaywallDemo.planName}
          mode="modal"
          onClose={() => setActivePaywallDemo(null)}
        />
      )}

      {/* Modale de recharge directe si ouverte */}
      <TokenTopUpModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
      />

      {/* Pied de page */}
      <footer className="py-8 border-t border-stone-300 text-center text-xs text-stone-500 bg-[#FAF9F5]">
        <p>© 2026 AgriImpact • Plateforme SaaS Agricole Professionnelle 100% Payante.</p>
        <p className="mt-1">
          Paiements sécurisés Wave & Orange Money au Sénégal & UEMOA.
        </p>
      </footer>
    </div>
  );
}

export default function TarifsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F3EB]">
          <div className="w-8 h-8 border-3 border-[#0C2B1E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TarifsContent />
    </Suspense>
  );
}
