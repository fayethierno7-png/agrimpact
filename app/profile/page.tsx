'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  Crown,
  LogOut,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Globe,
  Layers,
  Check,
  Settings,
  Flag,
  Building2,
  Calendar,
  Gauge,
  Users,
  Zap,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { PaymentModal } from '../../components/PaymentModal';
import EditFarmModal from '../../components/farm/EditFarmModal';
import { useAgri } from '../../lib/context/AgriContext';
import { PLAN_LIMITS } from '../../lib/billing/planLimits';
import { UserPlan } from '../../lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, farm, plot, logout, updatePlan, updateFarmAndPlot } = useAgri();
  const [selectedPlan, setSelectedPlan] = useState<UserPlan>(profile?.plan || 'pro');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditFarmOpen, setIsEditFarmOpen] = useState(false);
  const [targetCheckoutPlan, setTargetCheckoutPlan] = useState<UserPlan>('pro');
  const [targetCheckoutProvider, setTargetCheckoutProvider] = useState<'wave' | 'orange_money'>('wave');
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [paymentProviderByPlan, setPaymentProviderByPlan] = useState<
    Record<string, 'wave' | 'orange_money'>
  >({
    solo: 'wave',
    pro: 'wave',
    cooperative: 'wave',
  });

  const handleStartPlanPayment = (plan: UserPlan) => {
    const prov = paymentProviderByPlan[plan] || 'wave';
    setSelectedPlan(plan);
    setTargetCheckoutPlan(plan);
    setTargetCheckoutProvider(prov);
    setPaymentSuccessMessage(null);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (plan: UserPlan) => {
    updatePlan(plan);
    setPaymentSuccessMessage(
      `Félicitations ! Votre abonnement a été activé pour le forfait ${PLAN_LIMITS[plan].name} avec succès via paiement mobile.`
    );
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="En ligne" title="Profil & Forfaits" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 space-y-6">
        {/* Titre */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Mon Profil & Gestion de l&apos;Abonnement
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Gérez vos coordonnées d&apos;exploitant et votre forfait d&apos;accompagnement agronomique.
          </p>
        </div>

        {/* Layout Responsive (Grille 12 colonnes sur desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          {/* Colonne Gauche : Fiche Utilisateur & Exploitation */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black text-lg shadow-sm overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.nom || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    profile?.nom?.charAt(0) || 'P'
                  )}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    {profile?.nom || 'Producteur'}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                    <span>{profile?.telephone_contact || 'Téléphone non renseigné'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5 text-xs text-stone-600 dark:text-stone-300">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Exploitation :</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{farm?.nom || 'Non configurée'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Région / Terroir :</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{farm?.region || 'Sénégal'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Culture principale :</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">{plot ? `${plot.culture} (${plot.surface_ha} ha)` : 'Aucune parcelle'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Forfait actuel :</span>
                  {profile?.plan === 'free' ? (
                    <span className="font-black text-rose-600 dark:text-rose-400 uppercase text-xs">Aucun (Expiré)</span>
                  ) : (
                    <span className="font-black text-emerald-900 dark:text-emerald-300 uppercase text-xs">
                      {PLAN_LIMITS[profile?.plan || 'solo']?.name || profile?.plan}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditFarmOpen(true)}
                className="w-full mt-2.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Modifier l&apos;exploitation</span>
              </button>

              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <Link
                  href="/parametres"
                  className="py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>Paramètres</span>
                </Link>

                <Link
                  href="/signalements"
                  className="py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Signalements</span>
                </Link>
              </div>

              {profile?.role === 'superadmin' && (
                <div className="mt-2.5">
                  <Link
                    href="/admin"
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ring-2 ring-purple-300"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                    <span>
                      {profile?.role === 'superadmin' ? 'Console SuperAdmin' : "Console d'Administration"}
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Reassurance Wave & Orange Money */}
            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
                  <Smartphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Paiements mobiles locaux</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img
                    src="/logos/wave.jpg"
                    alt="Wave"
                    width={20}
                    height={20}
                    style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                    className="h-5 w-5 object-cover rounded-md border border-stone-100 dark:border-stone-700"
                  />
                  <img
                    src="/logos/orange-money.png"
                    alt="Orange Money"
                    width={20}
                    height={20}
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    className="h-5 w-5 object-contain rounded-md bg-white p-0.5 border border-stone-200 dark:border-stone-700"
                  />
                </div>
              </div>
              <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
                Sans carte bancaire. Renouvellement instantané via votre compte Wave ou Orange Money au Sénégal.
              </p>
            </div>

            {/* Bouton Déconnexion */}
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter</span>
            </button>
          </div>

          {/* Colonne Droite : Grille des Plans & Abonnements (Élargie sur Desktop) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span>Choisir votre Forfait d&apos;Exploitation</span>
              </h3>
              
              {/* Badge opérateurs Sénégal */}
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="text-stone-500 dark:text-stone-400">Paiement Mobile :</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs flex items-center gap-1.5">
                  <img
                    src="/logos/wave.jpg"
                    alt="Wave"
                    width={16}
                    height={16}
                    style={{ width: '16px', height: '16px', objectFit: 'cover' }}
                    className="w-4 h-4 object-cover rounded"
                  />
                  <span className="text-stone-800 dark:text-stone-200 text-xs">Wave</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs flex items-center gap-1.5">
                  <img
                    src="/logos/orange-money.png"
                    alt="Orange Money"
                    width={16}
                    height={16}
                    style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                    className="w-4 h-4 object-contain rounded bg-white p-0.5 border border-stone-200 dark:border-stone-700"
                  />
                  <span className="text-stone-800 dark:text-stone-200 text-xs">Orange Money</span>
                </span>
              </div>
            </div>

            {paymentSuccessMessage && (
              <div className="p-3.5 text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl font-bold flex items-center gap-2 shadow-xs">
                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
                <span>{paymentSuccessMessage}</span>
              </div>
            )}

            {/* Grille des 3 Plans au gabarit compact (Solo, Pro Producteur, Coopérative & GIE) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 xl:gap-4 items-stretch pt-1">
              
              {/* PLAN 1 : SOLO (1 490 FCFA) */}
              <div
                className={`rounded-3xl p-4.5 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
                  profile?.plan === 'solo'
                    ? 'bg-stone-50 dark:bg-stone-900 border-2 border-emerald-600 dark:border-emerald-500 shadow-md ring-2 ring-emerald-600/20'
                    : 'bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Solo</h4>
                    {profile?.plan === 'solo' && (
                      <span className="text-[9px] font-bold bg-emerald-800 text-white px-2 py-0.5 rounded-full">Actif</span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-snug line-clamp-2 min-h-[30px]">
                    Le socle agronomique essentiel pour le producteur individuel autonome.
                  </p>

                  <div className="mt-3 pb-3 border-b border-stone-200/80 dark:border-stone-800">
                    <div className="flex items-baseline gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden">
                      <span className="text-3xl sm:text-3xl xl:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight font-sans shrink-0">
                        1 490
                      </span>
                      <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 shrink-0">
                        FCFA / MOIS
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 dark:text-stone-500 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      Sans engagement • Reconduction mensuelle
                    </p>
                  </div>

                  <div className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-[#963E1B] dark:text-amber-500 mt-3.5 mb-2.5 whitespace-nowrap">
                    LIMITES &amp; CAPACITÉS INCLUSES
                  </div>

                  <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-[11.5px] leading-snug text-stone-700 dark:text-stone-300">
                    <li className="flex items-start gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span>Jusqu&apos;à <strong className="font-bold text-stone-900 dark:text-stone-100">3 parcelles</strong> cartographiées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">0 jour de projection</strong> (temps réel)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gauge className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">5 fenêtres</strong> de traitement / mois</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">1 compte</strong> collaborateur inclus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">10 alertes SMS</strong> / mois (urgences)</span>
                    </li>
                  </ul>

                  {/* Encart IA Solo */}
                  <div className="bg-stone-100/90 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 my-2.5">
                    <div className="flex items-center justify-between text-stone-900 dark:text-stone-100">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                        <span className="whitespace-nowrap">8 000 tokens IA / mois</span>
                      </div>
                      <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 pl-5 font-medium whitespace-nowrap">
                      ≈ <strong className="text-stone-700 dark:text-stone-300">16 messages</strong> avec l&apos;IA AgriImpact
                    </p>
                  </div>

                  <ul className="space-y-1 text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 pl-1 mb-3.5">
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-stone-400">•</span>
                      <span>1 exploitation gérée</span>
                    </li>
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-stone-400">•</span>
                      <span>7 jours d&apos;historique analysable</span>
                    </li>
                  </ul>
                </div>

                {/* Section Paiement Direct Solo */}
                <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      PAIEMENT DIRECT :
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      INSTANT SEN
                    </span>
                  </div>

                  {/* Sélecteur Wave / Orange Money */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, solo: 'wave' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.solo === 'wave'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs ring-1 ring-sky-400'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <img src="/logos/wave.jpg" alt="Wave" className="w-3.5 h-3.5 rounded-xs object-cover" />
                      <span className="text-[11px]">Wave</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, solo: 'orange_money' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.solo === 'orange_money'
                          ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-400 text-orange-950 dark:text-orange-200 shadow-2xs ring-1 ring-orange-400'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <img src="/logos/orange-money.png" alt="OM" className="w-3.5 h-3.5 rounded-xs object-contain bg-white" />
                      <span className="text-[11px] truncate">Orange Money</span>
                    </button>
                  </div>

                  {/* CTA Button Solo */}
                  {profile?.plan === 'solo' ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-black uppercase tracking-wider text-center border border-stone-200 dark:border-stone-700">
                      Forfait Actuel
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartPlanPayment('solo')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#963E1B] hover:bg-[#7D3416] text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <span className="truncate">PAYER AVEC {paymentProviderByPlan.solo === 'wave' ? 'WAVE' : 'ORANGE MONEY'}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  )}
                </div>
              </div>

              {/* PLAN 2 : PRO PRODUCTEUR (5 900 FCFA - CARTE DU MILIEU MISE EN AVANT) */}
              <div
                className="bg-[#0C2B1E] text-white border-2 border-[#1E6B47] rounded-3xl p-4.5 sm:p-5 flex flex-col justify-between shadow-2xl relative lg:-translate-y-2 z-10 ring-2 ring-[#C8EF56]/40"
              >
                {/* Badge en haut PRODUCTEURS */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C8EF56] text-[#0C2B1E] text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-lg border border-[#B8DF44] flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-[#0C2B1E]" />
                  <span>PRODUCTEURS</span>
                </div>

                <div>
                  <div className="flex items-center justify-between pt-0.5">
                    <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pro Producteur</h4>
                    {profile?.plan === 'pro' && (
                      <span className="text-[9px] font-bold bg-[#C8EF56] text-[#0C2B1E] px-2 py-0.5 rounded-full uppercase">Actif</span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-300 mt-0.5 leading-snug line-clamp-2 min-h-[30px]">
                    Le copilote agrométéo et prédictif complet pour sécuriser ses rendements.
                  </p>

                  <div className="mt-3 pb-3 border-b border-[#1E6B47]/60">
                    <div className="flex items-baseline gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden">
                      <span className="text-3xl sm:text-3xl xl:text-4xl font-extrabold text-[#C8EF56] tracking-tight font-sans shrink-0">
                        5 900
                      </span>
                      <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-stone-300 shrink-0">
                        FCFA / MOIS
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      Sans engagement • Reconduction mensuelle
                    </p>
                  </div>

                  <div className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-[#C8EF56] mt-3.5 mb-2.5 whitespace-nowrap">
                    LIMITES &amp; CAPACITÉS INCLUSES
                  </div>

                  <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-[11.5px] leading-snug text-stone-200">
                    <li className="flex items-start gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#C8EF56] shrink-0 mt-0.5" />
                      <span>Jusqu&apos;à <strong className="font-bold text-white">10 parcelles</strong> cartographiées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#C8EF56] shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-white">14 jours de projection</strong> météo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gauge className="w-3.5 h-3.5 text-[#C8EF56] shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-white">28 fenêtres</strong> de traitement / mois</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-3.5 h-3.5 text-[#C8EF56] shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-white">2 comptes</strong> collaborateurs inclus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-[#C8EF56] shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-white">50 alertes SMS</strong> / mois (urgences)</span>
                    </li>
                  </ul>

                  {/* Encart IA Pro */}
                  <div className="bg-[#071F15] border border-[#1B5238] rounded-xl p-2.5 my-2.5">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#C8EF56]">
                        <Zap className="w-3.5 h-3.5 text-[#C8EF56] fill-[#C8EF56] shrink-0" />
                        <span className="whitespace-nowrap">60 000 tokens IA / mois</span>
                      </div>
                      <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
                    </div>
                    <p className="text-[10px] text-stone-300 mt-0.5 pl-5 font-medium whitespace-nowrap">
                      ≈ <strong className="text-white font-bold">120 messages</strong> avec l&apos;IA AgriImpact
                    </p>
                  </div>

                  <ul className="space-y-1 text-[10px] sm:text-[10.5px] text-stone-300 pl-1 mb-3.5">
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-[#C8EF56]">•</span>
                      <span>1 exploitation gérée</span>
                    </li>
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-[#C8EF56]">•</span>
                      <span>30 jours d&apos;historique analysable</span>
                    </li>
                  </ul>
                </div>

                {/* Section Paiement Direct Pro */}
                <div className="pt-2.5 border-t border-[#1E6B47]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-300 whitespace-nowrap">
                      PAIEMENT DIRECT :
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-[#C8EF56] text-[#0C2B1E]">
                      INSTANT SEN
                    </span>
                  </div>

                  {/* Sélecteur Wave / Orange Money */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, pro: 'wave' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.pro === 'wave'
                          ? 'bg-[#071F15] border-sky-400 text-sky-200 shadow-2xs ring-1 ring-sky-400'
                          : 'bg-[#071F15]/70 border-[#1B5238] text-stone-300 hover:border-[#287A53]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <img src="/logos/wave.jpg" alt="Wave" className="w-3.5 h-3.5 rounded-xs object-cover" />
                      <span className="text-[11px]">Wave</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, pro: 'orange_money' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.pro === 'orange_money'
                          ? 'bg-[#071F15] border-orange-400 text-orange-200 shadow-2xs ring-1 ring-orange-400'
                          : 'bg-[#071F15]/70 border-[#1B5238] text-stone-300 hover:border-[#287A53]'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      <img src="/logos/orange-money.png" alt="OM" className="w-3.5 h-3.5 rounded-xs object-contain bg-white" />
                      <span className="text-[11px] truncate">Orange Money</span>
                    </button>
                  </div>

                  {/* CTA Button Pro */}
                  {profile?.plan === 'pro' ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-white/20 text-white text-[11px] font-black uppercase tracking-wider text-center border border-white/30">
                      Forfait Actuel
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartPlanPayment('pro')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#C8EF56] hover:bg-[#D6F569] text-[#0C2B1E] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    >
                      <span className="truncate">PAYER AVEC {paymentProviderByPlan.pro === 'wave' ? 'WAVE' : 'ORANGE MONEY'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0C2B1E] shrink-0" />
                    </button>
                  )}
                </div>
              </div>

              {/* PLAN 3 : COOPÉRATIVE & GIE (49 900 FCFA) */}
              <div
                className={`rounded-3xl p-4.5 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
                  profile?.plan === 'cooperative' || profile?.plan === 'business'
                    ? 'bg-stone-50 dark:bg-stone-900 border-2 border-emerald-600 dark:border-emerald-500 shadow-md ring-2 ring-emerald-600/20'
                    : 'bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight truncate">Coopérative &amp; GIE</h4>
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      Multi-comptes
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-snug line-clamp-2 min-h-[30px]">
                    La plateforme de pilotage mutualisée pour groupements et unions paysannes.
                  </p>

                  <div className="mt-3 pb-3 border-b border-stone-200/80 dark:border-stone-800">
                    <div className="flex items-baseline gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden">
                      <span className="text-3xl sm:text-3xl xl:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight font-sans shrink-0">
                        49 900
                      </span>
                      <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 shrink-0">
                        FCFA / MOIS
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 dark:text-stone-500 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      Sans engagement • Reconduction mensuelle
                    </p>
                  </div>

                  <div className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-[#963E1B] dark:text-amber-500 mt-3.5 mb-2.5 whitespace-nowrap">
                    LIMITES &amp; CAPACITÉS INCLUSES
                  </div>

                  <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-[11.5px] leading-snug text-stone-700 dark:text-stone-300">
                    <li className="flex items-start gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span>Jusqu&apos;à <strong className="font-bold text-stone-900 dark:text-stone-100">100 parcelles</strong> cartographiées</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">21 jours de projection</strong> météo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gauge className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">60 fenêtres</strong> de traitement / mois</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">15 comptes</strong> collaborateurs inclus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span><strong className="font-bold text-stone-900 dark:text-stone-100">200 alertes SMS</strong> / mois (urgences)</span>
                    </li>
                  </ul>

                  {/* Encart IA Coopérative */}
                  <div className="bg-stone-100/90 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 my-2.5">
                    <div className="flex items-center justify-between text-stone-900 dark:text-stone-100">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
                        <span className="whitespace-nowrap">300 000 tokens IA / mois</span>
                      </div>
                      <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 pl-5 font-medium whitespace-nowrap">
                      ≈ <strong className="text-stone-700 dark:text-stone-300">600 messages</strong> avec l&apos;IA AgriImpact
                    </p>
                  </div>

                  <ul className="space-y-1 text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 pl-1 mb-3.5">
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-stone-400">•</span>
                      <span>15 exploitations gérées</span>
                    </li>
                    <li className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-stone-400">•</span>
                      <span>90 jours d&apos;historique analysable</span>
                    </li>
                  </ul>
                </div>

                {/* Section Paiement Direct Coopérative */}
                <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      PAIEMENT DIRECT :
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      INSTANT SEN
                    </span>
                  </div>

                  {/* Sélecteur Wave / Orange Money */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, cooperative: 'wave' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.cooperative === 'wave'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-900 dark:text-sky-200 shadow-2xs ring-1 ring-sky-400'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <img src="/logos/wave.jpg" alt="Wave" className="w-3.5 h-3.5 rounded-xs object-cover" />
                      <span className="text-[11px]">Wave</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentProviderByPlan((prev) => ({ ...prev, cooperative: 'orange_money' }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        paymentProviderByPlan.cooperative === 'orange_money'
                          ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-400 text-orange-950 dark:text-orange-200 shadow-2xs ring-1 ring-orange-400'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <img src="/logos/orange-money.png" alt="OM" className="w-3.5 h-3.5 rounded-xs object-contain bg-white" />
                      <span className="text-[11px] truncate">Orange Money</span>
                    </button>
                  </div>

                  {/* CTA Button Coopérative */}
                  {(profile?.plan === 'cooperative' || profile?.plan === 'business') ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-black uppercase tracking-wider text-center border border-stone-200 dark:border-stone-700">
                      Forfait Actuel
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartPlanPayment('cooperative')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0C2B1E] hover:bg-stone-900 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <span className="truncate">PAYER AVEC {paymentProviderByPlan.cooperative === 'wave' ? 'WAVE' : 'ORANGE MONEY'}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* GESTION TRANSPARENTE DE L'ABONNEMENT */}
            <div className="mt-6 pt-5 border-t border-stone-200 dark:border-stone-800">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Gestion de l&apos;Abonnement &amp; Facturation
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xl leading-relaxed">
                    {profile?.plan === 'free'
                      ? "Votre exploitation ne dispose d'aucun abonnement actif. Sélectionnez l'un des 3 forfaits professionnels ci-dessus pour activer vos alertes météo, analyses parcellaires et l'assistant IA."
                      : `Votre abonnement ${PLAN_LIMITS[profile?.plan || 'pro']?.name} est actif. Règlement direct et renouvellement sécurisé par Wave ou Orange Money.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE PAIEMENT SÉNÉGAL WAVE & ORANGE MONEY */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        targetPlan={targetCheckoutPlan}
        onSuccess={handlePaymentSuccess}
        userPhone={profile?.telephone_contact || ''}
        userName={profile?.nom || 'Producteur'}
        userId={profile?.user_id || 'usr-anonymous'}
        initialProvider={targetCheckoutProvider}
      />

      {/* MODAL DE MODIFICATION DE L'EXPLOITATION (Point 5) */}
      <EditFarmModal
        isOpen={isEditFarmOpen}
        onClose={() => setIsEditFarmOpen(false)}
        farm={farm}
        plot={plot}
        onSuccess={(updatedFarm, updatedPlot) => {
          updateFarmAndPlot(updatedFarm, updatedPlot);
          setPaymentSuccessMessage('Fiche exploitation et parcelle mises à jour avec succès.');
        }}
      />

      <BottomNav />
    </div>
  );
}
