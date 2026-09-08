'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  TrendingUp,
  Layers,
  Smartphone,
  Users,
  CloudRain,
  Calendar,
  Zap,
} from 'lucide-react';
import { FeatureLimitKey, Plan, PlanSlug } from '../../lib/saas/types';
import {
  FEATURE_METADATA,
  getNextPlanSlug,
  formatPriceFCFA,
} from '../../lib/saas/plansData';
import { usePlans } from '../../lib/saas/usePlans';

export interface LimitReachedProps {
  /** Fonctionnalité bloquée par le plafond */
  feature: FeatureLimitKey | string;
  /** Quantité actuellement consommée */
  current: number;
  /** Plafond maximum autorisé par le palier actuel */
  max: number;
  /** Nom du palier actuel (ex: "Solo", "Pro Producteur") */
  planName: string;
  /** Callback optionnel au clic sur Upgrade */
  onUpgrade?: (targetPlanSlug: PlanSlug) => void;
  /** Callback optionnel pour fermer en mode modal */
  onClose?: () => void;
  /** Mode d'affichage : modal dialog, carte inline ou bandeau */
  mode?: 'modal' | 'card' | 'banner';
  /** Classe CSS additionnelle */
  className?: string;
}

export const LimitReached: React.FC<LimitReachedProps> = ({
  feature,
  current,
  max,
  planName,
  onUpgrade,
  onClose,
  mode = 'modal',
  className = '',
}) => {
  const { plans } = usePlans();

  // Détermination dynamique du palier supérieur
  const nextPlanSlug = getNextPlanSlug(planName);
  const nextPlan = plans.find((p) => p.slug === nextPlanSlug) || plans[1];
  const currentPlan =
    plans.find((p) => p.nom.toLowerCase().includes(planName.toLowerCase())) ||
    plans[0];

  // Métadonnées de la fonctionnalité
  const meta =
    FEATURE_METADATA[feature as FeatureLimitKey] || {
      label: feature,
      unit: 'unités',
      formatValue: (v: number) => `${v}`,
      getGainMessage: () =>
        `Débloquez des capacités supérieures en passant à ${nextPlan.nom}`,
    };

  // Récupération de la nouvelle limite dans le plan supérieur
  let nextLimitValue: number | null = null;
  if (feature === 'parcelles') nextLimitValue = nextPlan.limites.max_parcelles;
  else if (feature === 'exploitations') nextLimitValue = nextPlan.limites.max_exploitations;
  else if (feature === 'sms') nextLimitValue = nextPlan.limites.alertes_sms_mois;
  else if (feature === 'pulverisations')
    nextLimitValue = nextPlan.limites.fenetres_pulverisation_mois;
  else if (feature === 'utilisateurs') nextLimitValue = nextPlan.limites.max_users;
  else if (feature === 'projections') nextLimitValue = nextPlan.limites.projection_jours;
  else if (feature === 'tokens_ia') nextLimitValue = nextPlan.limites.tokens_ia_mois;

  // Calcul du gain concret orienté valeur positive
  const concreteGainText = nextLimitValue
    ? `Passez à ${nextPlan.nom} pour gérer jusqu'à ${meta.formatValue(nextLimitValue)}`
    : meta.getGainMessage(currentPlan.slug, nextPlan.slug, plans);

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade(nextPlan.slug);
    } else {
      // Redirection fluide vers la page de tarification avec pré-sélection
      window.location.href = `/tarifs?plan=${nextPlan.slug}&ref=limit_${feature}`;
    }
  };

  // Icône associée à la fonctionnalité
  const getFeatureIcon = () => {
    switch (feature) {
      case 'parcelles':
        return <Layers className="w-5 h-5" />;
      case 'sms':
        return <Smartphone className="w-5 h-5" />;
      case 'utilisateurs':
        return <Users className="w-5 h-5" />;
      case 'pulverisations':
        return <CloudRain className="w-5 h-5" />;
      case 'projections':
        return <Calendar className="w-5 h-5" />;
      case 'tokens_ia':
        return <Zap className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  // -------------------------------------------------------------
  // CONTENU INTERNE PARTAGÉ
  // -------------------------------------------------------------
  const cardContent = (
    <div className="relative overflow-hidden">
      {/* En-tête Valorisation positive & Croissance */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-[#963e1b]/10 text-[#963e1b] flex items-center justify-center shrink-0">
          {getFeatureIcon()}
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#963e1b]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Félicitations pour le développement de votre activité</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-1">
            Plafond atteint sur {meta.label.toLowerCase()}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Votre forfait <strong>{planName}</strong> est actuellement configuré au
            maximum de sa capacité ({current} / {max} {meta.unit}).
          </p>
        </div>
      </div>

      {/* Jauge visuelle de saturation propre */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200/80 mb-5 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-2">
          <span>Capacité consommée</span>
          <span className="font-mono text-[#963e1b]">
            {current} / {max} {meta.unit} (100%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#963e1b] rounded-full transition-all duration-500 ease-out w-full" />
        </div>
      </div>

      {/* Encadré proposition de valeur : Palier supérieur & Gain concret */}
      <div className="p-5 rounded-2xl bg-[#0C2B1E] text-white relative overflow-hidden mb-5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#C8EF56]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#C8EF56] bg-white/10 px-2.5 py-0.5 rounded-full">
            Évolution recommandée
          </span>
          <span className="text-xs font-bold text-stone-300">
            {formatPriceFCFA(nextPlan.prix_mensuel_fcfa)} FCFA / mois
          </span>
        </div>

        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
          <span>{concreteGainText}</span>
        </h4>

        <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-stone-300">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C8EF56] shrink-0" />
            <span>Mise à niveau instantanée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C8EF56] shrink-0" />
            <span>Prise en compte prorata</span>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-[#963e1b] hover:bg-[#823315] text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
        >
          <span>Débloquer avec {nextPlan.nom}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
          >
            Conserver {planName}
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-stone-500 mt-3 font-medium">
        Paiement sans interruption d&apos;activité par Wave ou Orange Money
      </p>
    </div>
  );

  // -------------------------------------------------------------
  // RENDU 1 : BANNER (Bandeau d'alerte inline non bloquant)
  // -------------------------------------------------------------
  if (mode === 'banner') {
    return (
      <div
        className={`p-4 sm:p-5 rounded-3xl bg-[#FAF9F5] border border-amber-300/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in ${className}`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#963e1b]/10 text-[#963e1b] flex items-center justify-center shrink-0">
            {getFeatureIcon()}
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900">
              Plafond {meta.label} atteint ({current}/{max})
            </div>
            <p className="text-xs text-stone-600 mt-0.5">{concreteGainText}.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpgradeClick}
          className="shrink-0 px-4 py-2 rounded-xl bg-[#963e1b] hover:bg-[#823315] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <span>Passer à {nextPlan.nom}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDU 2 : CARD (Encart intégré dans une vue dashboard)
  // -------------------------------------------------------------
  if (mode === 'card') {
    return (
      <div
        className={`p-6 sm:p-7 rounded-3xl bg-[#FAF9F5] border border-stone-200 shadow-md ${className}`}
      >
        {cardContent}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDU 3 : MODAL (Fenêtre de dialogue bloquante au déclenchement d'une action)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-lg bg-[#FAF9F5] rounded-3xl shadow-2xl border border-stone-200 p-6 sm:p-8 animate-fade-in ${className}`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-600 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {cardContent}
      </div>
    </div>
  );
};

export default LimitReached;
