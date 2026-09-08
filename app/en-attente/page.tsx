'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ShieldCheck,
  PhoneCall,
  MessageSquare,
  LogOut,
  RefreshCw,
  Sprout,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';

export default function EnAttentePage() {
  const router = useRouter();
  const { profile, logout, isLoading } = useAgri();
  const [contactSettings, setContactSettings] = useState<{
    support_phone: string;
    support_phone_visible: boolean;
    contact_email: string;
    contact_email_visible: boolean;
    whatsapp_link: string;
    whatsapp_visible: boolean;
  }>({
    support_phone: '33 800 12 12',
    support_phone_visible: true,
    contact_email: 'contact@agrimpact.sn',
    contact_email_visible: true,
    whatsapp_link: 'https://wa.me/221771234567',
    whatsapp_visible: true,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Si l'utilisateur a déjà été validé par un admin, redirection immédiate vers le dashboard
    if (profile && profile.statut_compte === 'actif') {
      router.push('/dashboard');
    }
  }, [profile, router]);

  useEffect(() => {
    fetch('/api/settings/contact')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setContactSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.session?.statut_compte === 'actif' || profile?.statut_compte === 'actif') {
        router.push('/dashboard');
        return;
      }
    } catch {}
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F3EB] text-stone-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* En-tête */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0C2B1E] text-white flex items-center justify-center font-bold">
            <Sprout className="w-5 h-5 text-[#C8EF56]" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-stone-900 text-base leading-none block">
              AGRIMPACT
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#963e1b] uppercase block">
              SÉNÉGAL
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </header>

      {/* Contenu Central */}
      <main className="max-w-lg mx-auto w-full my-auto py-8">
        <div className="bg-[#FAF9F5] border border-stone-300 rounded-3xl p-6 sm:p-8 shadow-xl text-center animate-fade-in space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-[#963e1b] mx-auto flex items-center justify-center shadow-xs">
            <Clock className="w-8 h-8 stroke-[2.2] animate-pulse" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#963e1b]/10 text-[#963e1b] text-xs font-black uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compte en cours de vérification</span>
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Bienvenue, {profile?.nom || 'Producteur'} !
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 mt-2.5 leading-relaxed">
              Votre demande d&apos;accès à la plateforme <strong>AgriImpact</strong> a bien été enregistrée.
              Conformément à nos protocoles agronomiques certifiés, chaque exploitation est validée par notre équipe administrative avant ouverture du tableau de bord.
            </p>
          </div>

          {/* Statut & Actualisation */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Statut du compte :</span>
              <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px]">
                En attente de validation admin
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Délai habituel :</span>
              <span className="font-bold text-stone-800">Moins de 2 heures ouvrées</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0C2B1E] hover:bg-[#123C2B] text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-[#C8EF56] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Vérifier mon statut d&apos;activation</span>
            </button>

            {/* Assistance rapide pour accélération */}
            {contactSettings.support_phone_visible && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-stone-600">
                <span>Besoin d&apos;une activation urgente ?</span>
                <a
                  href={`tel:${contactSettings.support_phone.replace(/\s+/g, '')}`}
                  className="font-extrabold text-[#963e1b] hover:underline flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{contactSettings.support_phone}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="text-center text-xs text-stone-500 py-4 max-w-4xl mx-auto w-full border-t border-stone-300/60">
        © 2026 AgriImpact Sénégal • Accès professionnel certifié ISRA / ANACIM.
      </footer>
    </div>
  );
}
