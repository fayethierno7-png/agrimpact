'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  HelpCircle,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  CloudRain,
  Radio,
  Layers,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Plan, PlanSlug } from '../../lib/saas/types';
import {
  calculateEstimatedMessages,
  formatPriceFCFA,
} from '../../lib/saas/plansData';
import { usePlans } from '../../lib/saas/usePlans';

export interface PricingTableProps {
  preselectedPlan?: PlanSlug | string;
  onSelectPayment?: (params: {
    plan: Plan;
    cycle: 'mensuel' | 'annuel';
    provider: 'wave' | 'orange_money';
    amount: number;
  }) => void;
  className?: string;
  showHeader?: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  preselectedPlan = 'pro',
  onSelectPayment,
  className = '',
  showHeader = true,
}) => {
  const { plans, loading } = usePlans();
  const [billingCycle, setBillingCycle] = useState<'mensuel' | 'annuel'>('mensuel');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>(preselectedPlan);
  const [paymentProviderByPlan, setPaymentProviderByPlan] = useState<
    Record<string, 'wave' | 'orange_money'>
  >({
    solo: 'wave',
    pro: 'wave',
    cooperative: 'wave',
  });

  useEffect(() => {
    if (preselectedPlan) {
      setSelectedPlanSlug(preselectedPlan);
    }
  }, [preselectedPlan]);

  const handleProviderToggle = (slug: string, provider: 'wave' | 'orange_money') => {
    setPaymentProviderByPlan((prev) => ({ ...prev, [slug]: provider }));
  };

  const handleCheckout = (plan: Plan) => {
    const provider = paymentProviderByPlan[plan.slug] || 'wave';
    const amount =
      billingCycle === 'annuel' ? plan.prix_annuel_fcfa : plan.prix_mensuel_fcfa;

    if (onSelectPayment) {
      onSelectPayment({
        plan,
        cycle: billingCycle,
        provider,
        amount,
      });
    } else {
      // Redirection ou déclenchement du flux de paiement unifié
      const query = new URLSearchParams({
        plan: plan.slug,
        cycle: billingCycle,
        provider,
        amount: amount.toString(),
      });
      window.location.href = `/payment?${query.toString()}`;
    }
  };

  return (
    <section
      id="tarifs"
      className={`relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 ${className}`}
    >
      {/* En-tête éditorial premium */}
      {showHeader && (
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0C2B1E]/8 text-[#0C2B1E] border border-[#0C2B1E]/15 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-[#963e1b]" />
            <span>SaaS 100% Dédié aux Professionnels Agricoles</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            Un abonnement rentable dès le{' '}
            <span className="font-serif-italic text-[#963e1b] font-normal">
              premier traitement
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
            Pas d’engagement contraignant, zéro commission cachée. Règlement direct et
            sécurisé par <strong className="text-stone-900 font-semibold">Wave</strong> ou{' '}
            <strong className="text-stone-900 font-semibold">Orange Money</strong> sans
            carte bancaire.
          </p>

          {/* Toggle Mensuel / Annuel avec badge -20% */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-stone-200/70 border border-stone-300 shadow-inner backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('mensuel')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                billingCycle === 'mensuel'
                  ? 'bg-white text-[#0C2B1E] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Facturation mensuelle
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annuel')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                billingCycle === 'annuel'
                  ? 'bg-[#0C2B1E] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Facturation annuelle</span>
              <span className="bg-[#C8EF56] text-[#0C2B1E] text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide">
                -20%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Grille des 3 paliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-stretch">
        {plans.map((plan) => {
          const isSelected = selectedPlanSlug === plan.slug;
          const isPro = plan.slug === 'pro';
          const isCoop = plan.slug === 'cooperative';
          const monthlyEquiv = Math.round(plan.prix_annuel_fcfa / 12);
          const activeProvider = paymentProviderByPlan[plan.slug] || 'wave';

          const estMessages = calculateEstimatedMessages(plan.limites.tokens_ia_mois);

          return (
            <div
              key={plan.slug}
              onClick={() => setSelectedPlanSlug(plan.slug)}
              className={`group relative rounded-3xl transition-all duration-300 flex flex-col justify-between ${
                isPro
                  ? 'bg-[#0C2B1E] text-white border-2 border-[#1E6B47] shadow-2xl lg:-translate-y-2.5 z-10'
                  : 'bg-[#FAF9F5] text-stone-900 border border-stone-200/80 shadow-md hover:shadow-xl hover:border-stone-300'
              } ${isSelected && !isPro ? 'ring-2 ring-[#963e1b] border-transparent' : ''}`}
            >
              {/* Badge "Recommandé Producteurs" sur Pro */}
              {isPro && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#C8EF56] text-[#0C2B1E] text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-[#B8DF44]">
                  <Sparkles className="w-3.5 h-3.5 fill-[#0C2B1E]" />
                  <span>{plan.badge || 'Recommandé Producteurs'}</span>
                </div>
              )}

              {/* Partie supérieure de la carte */}
              <div className="p-7 sm:p-8">
                {/* En-tête palier */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3
                      className={`text-2xl font-black tracking-tight ${
                        isPro ? 'text-white' : 'text-stone-900'
                      }`}
                    >
                      {plan.nom}
                    </h3>
                    <p
                      className={`text-xs mt-1.5 leading-relaxed ${
                        isPro ? 'text-stone-300' : 'text-stone-600'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>
                  {isCoop && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-200/80 text-stone-700">
                      Multi-comptes
                    </span>
                  )}
                </div>

                {/* Bloc Prix dynamique */}
                <div className="my-6 pb-6 border-b border-stone-200/30">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-sans ${
                        isPro ? 'text-[#C8EF56]' : 'text-stone-900'
                      }`}
                    >
                      {billingCycle === 'annuel'
                        ? formatPriceFCFA(plan.prix_annuel_fcfa)
                        : formatPriceFCFA(plan.prix_mensuel_fcfa)}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isPro ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      FCFA / {billingCycle === 'annuel' ? 'an' : 'mois'}
                    </span>
                  </div>

                  {/* Détail calcul annuel en temps réel */}
                  {billingCycle === 'annuel' ? (
                    <p
                      className={`text-xs mt-2 font-medium flex items-center gap-1.5 ${
                        isPro ? 'text-[#C8EF56]/90' : 'text-[#963e1b]'
                      }`}
                    >
                      <span>Équivaut à</span>
                      <strong className="underline underline-offset-2">
                        {formatPriceFCFA(monthlyEquiv)} FCFA / mois
                      </strong>
                      <span className="opacity-80">(-20% inclus)</span>
                    </p>
                  ) : (
                    <p
                      className={`text-[11px] mt-2 ${
                        isPro ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      Sans engagement • Reconduction mensuelle
                    </p>
                  )}
                </div>

                {/* Liste explicite des limites chiffrées (AUCUN 'illimité') */}
                <div className="space-y-3.5 text-xs">
                  <div
                    className={`text-[11px] font-black uppercase tracking-wider mb-2 ${
                      isPro ? 'text-[#C8EF56]' : 'text-[#963e1b]'
                    }`}
                  >
                    Limites & Capacités incluses
                  </div>

                  {/* 1. Nombre de parcelles */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPro ? 'bg-[#1E6B47] text-white' : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
                      }`}
                    >
                      <Layers className="w-2.5 h-2.5" />
                    </div>
                    <span className={isPro ? 'text-stone-200' : 'text-stone-700'}>
                      Jusqu&apos;à{' '}
                      <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                        {plan.limites.max_parcelles} parcelles
                      </strong>{' '}
                      agricoles cartographiées
                    </span>
                  </div>

                  {/* 2. Jours de projection */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPro ? 'bg-[#1E6B47] text-white' : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
                      }`}
                    >
                      <Calendar className="w-2.5 h-2.5" />
                    </div>
                    <span className={isPro ? 'text-stone-200' : 'text-stone-700'}>
                      {plan.limites.projection_jours > 0 ? (
                        <>
                          <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                            {plan.limites.projection_jours} jours de projection
                          </strong>{' '}
                          météo & ravageurs
                        </>
                      ) : (
                        <>
                          <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                            0 jour de projection
                          </strong>{' '}
                          (observation météo temps réel)
                        </>
                      )}
                    </span>
                  </div>

                  {/* 3. Fenêtres de pulvérisation */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPro ? 'bg-[#1E6B47] text-white' : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
                      }`}
                    >
                      <CloudRain className="w-2.5 h-2.5" />
                    </div>
                    <span className={isPro ? 'text-stone-200' : 'text-stone-700'}>
                      <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                        {plan.limites.fenetres_pulverisation_mois} fenêtres de traitement
                      </strong>{' '}
                      / mois calculées
                    </span>
                  </div>

                  {/* 4. Nombre de comptes collaborateurs */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPro ? 'bg-[#1E6B47] text-white' : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
                      }`}
                    >
                      <Users className="w-2.5 h-2.5" />
                    </div>
                    <span className={isPro ? 'text-stone-200' : 'text-stone-700'}>
                      <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                        {plan.limites.max_users} compte
                        {plan.limites.max_users > 1 ? 's' : ''}
                      </strong>{' '}
                      collaborateur{plan.limites.max_users > 1 ? 's' : ''} inclus
                    </span>
                  </div>

                  {/* 5. Alertes SMS */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPro ? 'bg-[#1E6B47] text-white' : 'bg-[#0C2B1E]/10 text-[#0C2B1E]'
                      }`}
                    >
                      <Smartphone className="w-2.5 h-2.5" />
                    </div>
                    <span className={isPro ? 'text-stone-200' : 'text-stone-700'}>
                      <strong className={isPro ? 'text-white' : 'text-stone-900'}>
                        {plan.limites.alertes_sms_mois} alertes SMS
                      </strong>{' '}
                      / mois (crises météo & alertes)
                    </span>
                  </div>

                  {/* 6. Quota tokens IA avec Tooltip explicatif */}
                  <div className="relative pt-1">
                    <div
                      className={`p-3 rounded-2xl border flex items-start justify-between gap-2 ${
                        isPro
                          ? 'bg-[#123C2B] border-[#1E6B47]'
                          : 'bg-stone-100 border-stone-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Zap
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isPro ? 'text-[#C8EF56]' : 'text-[#963e1b]'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-xs ${
                                isPro ? 'text-white' : 'text-stone-900'
                              }`}
                            >
                              {plan.limites.tokens_ia_mois.toLocaleString('fr-FR')} tokens IA
                              / mois
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTooltip(
                                  activeTooltip === plan.slug ? null : plan.slug
                                );
                              }}
                              className="focus:outline-none cursor-pointer p-0.5 rounded-full hover:bg-black/10 transition"
                              title="Détails du quota IA"
                            >
                              <HelpCircle
                                className={`w-3.5 h-3.5 ${
                                  isPro ? 'text-stone-300' : 'text-stone-500'
                                }`}
                              />
                            </button>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              isPro ? 'text-stone-300' : 'text-stone-600'
                            }`}
                          >
                            ≈{' '}
                            <strong className={isPro ? 'text-[#C8EF56]' : 'text-stone-900'}>
                              {estMessages} messages
                            </strong>{' '}
                            avec l&apos;assistant AgriImpact
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tooltip Popover explicatif */}
                    {activeTooltip === plan.slug && (
                      <div
                        className="absolute left-0 right-0 -top-2 -translate-y-full z-30 p-3.5 bg-stone-900 text-white rounded-xl shadow-2xl text-[11px] leading-relaxed border border-stone-700 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <strong className="text-[#C8EF56] font-bold">
                            Estimation des échanges IA :
                          </strong>
                          <button
                            type="button"
                            onClick={() => setActiveTooltip(null)}
                            className="text-stone-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-stone-200">
                          Un diagnostic avec photo, analyse météo et protocole de culture
                          consomme environ 500 tokens. Ce palier vous permet environ{' '}
                          <strong>{estMessages} consultations approfondies</strong> chaque
                          mois.
                        </p>
                        <div className="mt-2 text-[10px] text-stone-400 pt-1 border-t border-stone-800">
                          Besoin de plus ? Vous pourrez recharger des packs permanents en 1
                          clic sans changer de palier.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. Exploitations & Historique */}
                  <div className="pt-2 text-[11px] text-stone-500 space-y-1">
                    <p className={isPro ? 'text-stone-300' : 'text-stone-600'}>
                      • {plan.limites.max_exploitations} exploitation{' '}
                      {plan.limites.max_exploitations > 1 ? 's' : ''} gérée
                      {plan.limites.max_exploitations > 1 ? 's' : ''}
                    </p>
                    <p className={isPro ? 'text-stone-300' : 'text-stone-600'}>
                      • {plan.limites.historique_meteo_jours} jours d&apos;historique agrométéo
                      analysable
                    </p>
                  </div>
                </div>
              </div>

              {/* Partie inférieure : Sélecteur Wave / OM & Bouton d'Abonnement Direct (JAMAIS d'essai gratuit) */}
              <div
                className={`p-6 pt-0 border-t ${
                  isPro ? 'border-white/10' : 'border-stone-200'
                }`}
              >
                {/* Sélecteur de méthode de paiement Mobile Money */}
                <div className="mb-3">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${
                      isPro ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    <span>Moyen de paiement direct :</span>
                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      Instant Sen
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Bouton Wave */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderToggle(plan.slug, 'wave');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        activeProvider === 'wave'
                          ? 'bg-[#1DA1F2]/15 border-[#1DA1F2] text-[#0070BA] dark:text-[#38bdf8] shadow-xs'
                          : isPro
                          ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                          : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#1DA1F2]" />
                      <span>Wave</span>
                    </button>

                    {/* Bouton Orange Money */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderToggle(plan.slug, 'orange_money');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        activeProvider === 'orange_money'
                          ? 'bg-[#FF6600]/15 border-[#FF6600] text-[#FF6600] shadow-xs'
                          : isPro
                          ? 'bg-white/5 border-white/10 text-stone-300 hover:bg-white/10'
                          : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#FF6600]" />
                      <span>Orange Money</span>
                    </button>
                  </div>
                </div>

                {/* Bouton CTA Principal — Direct & Explicite */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckout(plan);
                  }}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-md cursor-pointer ${
                    isPro
                      ? 'bg-[#C8EF56] hover:bg-[#B8DF44] text-[#0C2B1E] hover:shadow-lg active:scale-[0.99]'
                      : isCoop
                      ? 'bg-[#0C2B1E] hover:bg-[#123C2B] text-white hover:shadow-lg active:scale-[0.99]'
                      : 'bg-[#963e1b] hover:bg-[#823315] text-white hover:shadow-lg active:scale-[0.99]'
                  }`}
                >
                  <span>
                    Payer avec {activeProvider === 'wave' ? 'Wave' : 'Orange Money'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p
                  className={`text-center text-[10px] mt-2.5 font-medium ${
                    isPro ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  Accès immédiat • Reçu fiscal & quittance générés
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeau de réassurance paiement local */}
      <div className="mt-12 p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E]/8 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#0C2B1E]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">
              Paiement Sécurisé Mobile Money Sénégal & UEMOA
            </h4>
            <p className="text-xs text-stone-600 mt-0.5">
              Agrément opérateur officiel. Validation instantanée sur votre smartphone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-stone-700">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-[#1DA1F2]" /> Wave Sénégal
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-[#FF6600]" /> Orange Money SN
          </span>
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
