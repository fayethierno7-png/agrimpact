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
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  const handlePlanClick = (plan: UserPlan) => {
    setSelectedPlan(plan);
    setPaymentSuccessMessage(null);

    if (plan === 'free') {
      updatePlan('free');
      setPaymentSuccessMessage('Votre compte a été basculé sur le forfait Gratuit Pilote.');
    } else {
      setTargetCheckoutPlan(plan);
      setIsPaymentModalOpen(true);
    }
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

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 space-y-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Colonne Gauche : Fiche Utilisateur & Exploitation (4 colonnes) */}
          <div className="lg:col-span-4 space-y-5">
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
                  <span className="font-black text-emerald-900 dark:text-emerald-300 uppercase">{profile?.plan || 'free'}</span>
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

              {profile?.role === 'admin' && (
                <div className="mt-2.5">
                  <Link
                    href="/admin"
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ring-2 ring-purple-300"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                    <span>Console d&apos;Administration</span>
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

          {/* Colonne Droite : Grille des Plans & Abonnements (8 colonnes) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Choisir votre Forfait d&apos;Exploitation</span>
              </h3>
              
              {/* Badge opérateurs Sénégal */}
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="text-stone-500 dark:text-stone-400">Paiement Mobile :</span>
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs flex items-center gap-1.5">
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
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs flex items-center gap-1.5">
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

            {/* Grille des 3 Plans alignés sur Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              {/* Plan 1 : Free */}
              <div
                onClick={() => handlePlanClick('free')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  profile?.plan === 'free'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-stone-600 dark:text-stone-400">Pilote</span>
                    {profile?.plan === 'free' && (
                      <span className="text-[10px] font-bold bg-emerald-800 text-white px-2 py-0.5 rounded">Actif</span>
                    )}
                  </div>
                  <div className="text-xl font-black text-stone-900 dark:text-stone-100">0 FCFA</div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500">Gratuit sans engagement</div>

                  <ul className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>1 parcelle</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Conseils quotidiens</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Météo de base</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    profile?.plan === 'free'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {profile?.plan === 'free' ? 'Forfait Actuel' : 'Sélectionner Gratuit'}
                </button>
              </div>

              {/* Plan 2 : Pro (Recommandé) */}
              <div
                onClick={() => handlePlanClick('pro')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                  profile?.plan === 'pro'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-800 dark:border-emerald-600 shadow-md ring-2 ring-emerald-800/20'
                    : 'bg-white dark:bg-stone-900 border-emerald-600/60 hover:border-emerald-600'
                }`}
              >
                <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-800 text-white text-[9px] font-black uppercase tracking-wider">
                  Populaire
                </span>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-emerald-950 dark:text-emerald-200">Producteur</span>
                    {profile?.plan === 'pro' && (
                      <span className="text-[10px] font-bold bg-emerald-800 text-white px-2 py-0.5 rounded">Actif</span>
                    )}
                  </div>
                  <div className="text-xl font-black text-emerald-900 dark:text-emerald-300">5 900 FCFA</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span>par mois •</span>
                    <span className="inline-flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold">
                      <img
                        src="/logos/wave.jpg"
                        alt="Wave"
                        width={12}
                        height={12}
                        style={{ width: '12px', height: '12px', objectFit: 'cover' }}
                        className="w-3 h-3 object-cover rounded-xs"
                      />
                      Wave
                    </span>
                    <span className="inline-flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold">
                      <img
                        src="/logos/orange-money.png"
                        alt="OM"
                        width={12}
                        height={12}
                        style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                        className="w-3 h-3 object-contain rounded-xs bg-white border border-stone-200 dark:border-stone-700 p-0.2"
                      />
                      OM
                    </span>
                  </div>

                  <ul className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Jusqu&apos;à 10 parcelles</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Alertes SMS prioritaires</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Historique complet</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Assistance agronomique</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    profile?.plan === 'pro'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm shadow-emerald-900/20'
                  }`}
                >
                  {profile?.plan === 'pro' ? (
                    'Forfait Actuel'
                  ) : (
                    <>
                      <span className="flex items-center gap-1">
                        <img
                          src="/logos/wave.jpg"
                          alt="Wave"
                          width={14}
                          height={14}
                          style={{ width: '14px', height: '14px', objectFit: 'cover' }}
                          className="w-3.5 h-3.5 object-cover rounded-xs"
                        />
                        <img
                          src="/logos/orange-money.png"
                          alt="OM"
                          width={14}
                          height={14}
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                          className="w-3.5 h-3.5 object-contain rounded-xs bg-white border border-stone-200 p-0.5"
                        />
                      </span>
                      <span>Payer avec Wave / OM</span>
                    </>
                  )}
                </button>
              </div>

              {/* Plan 3 : Business / Coopérative */}
              <div
                onClick={() => handlePlanClick('business')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  profile?.plan === 'business'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-stone-600 dark:text-stone-400">Coopérative</span>
                    {profile?.plan === 'business' && (
                      <span className="text-[10px] font-bold bg-emerald-800 text-white px-2 py-0.5 rounded">Actif</span>
                    )}
                  </div>
                  <div className="text-xl font-black text-stone-900 dark:text-stone-100">54 900 FCFA</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span>par mois •</span>
                    <span className="inline-flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold">
                      <img
                        src="/logos/wave.jpg"
                        alt="Wave"
                        width={12}
                        height={12}
                        style={{ width: '12px', height: '12px', objectFit: 'cover' }}
                        className="w-3 h-3 object-cover rounded-xs"
                      />
                      Wave
                    </span>
                    <span className="inline-flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold">
                      <img
                        src="/logos/orange-money.png"
                        alt="OM"
                        width={12}
                        height={12}
                        style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                        className="w-3 h-3 object-contain rounded-xs bg-white border border-stone-200 dark:border-stone-700 p-0.2"
                      />
                      OM
                    </span>
                  </div>

                  <ul className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs text-stone-600 dark:text-stone-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Parcelles illimitées</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tableau multi-membres</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Export rapports ANACIM</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Agronome attitré</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    profile?.plan === 'business'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-900 dark:bg-stone-800 text-white hover:bg-black dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                  }`}
                >
                  {profile?.plan === 'business' ? (
                    'Forfait Actuel'
                  ) : (
                    <>
                      <span className="flex items-center gap-1">
                        <img
                          src="/logos/wave.jpg"
                          alt="Wave"
                          width={14}
                          height={14}
                          style={{ width: '14px', height: '14px', objectFit: 'cover' }}
                          className="w-3.5 h-3.5 object-cover rounded-xs"
                        />
                        <img
                          src="/logos/orange-money.png"
                          alt="OM"
                          width={14}
                          height={14}
                          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                          className="w-3.5 h-3.5 object-contain rounded-xs bg-white border border-stone-200 p-0.5"
                        />
                      </span>
                      <span>Payer avec Wave / OM</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GESTION TRANSPARENTE DE L'ABONNEMENT ET RÉSILIATION (ZÉRO DARK PATTERN) */}
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Gestion de l&apos;Abonnement & Résiliation
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xl leading-relaxed">
                    {profile?.plan === 'free'
                      ? "Vous bénéficiez actuellement du forfait Gratuit Pilote. Aucun prélèvement n'est actif sur votre compte."
                      : `Votre abonnement ${PLAN_LIMITS[profile?.plan || 'pro'].name} est actif. Vous pouvez le résilier à tout moment d'un simple clic sans pénalité.`}
                  </p>
                </div>

                {profile?.plan !== 'free' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          "Êtes-vous sûr de vouloir résilier votre abonnement ? Votre compte basculera immédiatement sur le forfait Gratuit Pilote sans aucun frais."
                        )
                      ) {
                        handlePlanClick('free');
                      }
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer shrink-0"
                  >
                    Résilier mon abonnement
                  </button>
                )}
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
