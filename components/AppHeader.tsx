'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Sprout, Wifi, Home, History, User, Settings, Flag, ChevronLeft, ShieldCheck, LayoutDashboard, CreditCard } from 'lucide-react';
import { useAgri } from '../lib/context/AgriContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  statusText?: string;
  variant?: 'minimal' | 'full' | 'connexion';
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  statusText = 'En ligne',
  variant = 'full',
}) => {
  const pathname = usePathname();
  const { profile, farm, alerts } = useAgri();
  const activeAlertsCount = alerts.filter((a) => a.statut === 'active').length;
  const isAdmin = profile?.role === 'admin';

  const navLinks = [
    { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, isActive: pathname === '/dashboard' },
    { label: 'Historique', href: '/history', icon: History, isActive: pathname === '/history' },
    { label: 'Alertes', href: '/alerts', icon: Bell, badge: activeAlertsCount, isActive: pathname === '/alerts' },
    { label: 'Signalements', href: '/signalements', icon: Flag, isActive: pathname === '/signalements' },
    { label: 'Tarifs', href: '/tarifs', icon: CreditCard, isActive: pathname === '/tarifs' },
  ];

  if (variant === 'connexion') {
    return (
      <div className="w-full bg-stone-50/90 border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2 font-medium text-emerald-900">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sénégal • Réseau agronomique & ANACIM synchronisé</span>
          </div>
          <div className="flex items-center gap-2 text-stone-500 font-mono text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-emerald-700" />
            <span>4G+ Opérationnel</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <header className="w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand Logo, Back button & Home button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {showBack && (
            <Link
              href="/dashboard"
              className="p-1.5 -ml-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="Retour"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}

          {/* Logo cliquable -> Retourne sur la landing page (/) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            title="Retourner à la page d'accueil (Landing page)"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-900 transition-colors">
              <Sprout className="w-4.5 h-4.5 text-emerald-200" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-emerald-950 dark:text-emerald-100 text-sm sm:text-base leading-none block">
                AGRIMPACT
              </span>
              <span className="text-[8px] font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase block">
                SÉNÉGAL
              </span>
            </div>
          </Link>

          {/* Bouton Home (Maison) -> Retour Landing page */}
          <Link
            href="/"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-stone-600 dark:text-stone-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-200/80 dark:border-stone-800 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs"
            title="Retourner sur la page d'accueil (Landing page)"
            aria-label="Page d'accueil"
          >
            <Home className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>

          {title && (
            <div className="hidden sm:block pl-3 border-l border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300">
              {title}
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors relative whitespace-nowrap shrink-0 ${
                  item.isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge ? (
                  <span className="ml-0.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Right: Status indicator, alerts & user chip */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Online badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">{statusText}</span>
          </div>

          {/* Console Admin Bouton (Réservé exclusivement aux administrateurs certifiés) */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap shrink-0 ${
                pathname === '/admin' || pathname?.startsWith('/admin')
                  ? 'bg-purple-700 text-white border-purple-800 shadow-purple-900/20 ring-2 ring-purple-300'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 hover:shadow-sm'
              }`}
              title="Accéder à la Console d'Administration"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="hidden md:inline font-bold whitespace-nowrap">Console Admin</span>
            </Link>
          )}

          {/* User Info Chip -> mène vers /profile */}
          <Link
            href="/profile"
            className="hidden lg:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-xs text-stone-700 dark:text-stone-300 whitespace-nowrap shrink-0"
            title="Profil & Forfaits"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.nom || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                profile?.nom ? profile.nom.charAt(0).toUpperCase() : 'P'
              )}
            </div>
            <div className="text-left leading-tight hidden xl:block">
              <span className="font-bold text-stone-900 dark:text-stone-100 block whitespace-nowrap">{profile?.nom || 'Producteur'}</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block whitespace-nowrap">{farm?.region || 'Sénégal'}</span>
            </div>
          </Link>

          {/* Alert Bell */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Alertes"
          >
            <Bell className="w-4.5 h-4.5 text-stone-700 dark:text-stone-300" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-stone-900" />
            )}
          </Link>

          {/* Paramètres Icon */}
          <Link
            href="/parametres"
            className={`p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
              pathname === '/parametres' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : ''
            }`}
            aria-label="Paramètres"
            title="Paramètres"
          >
            <Settings className="w-4.5 h-4.5" />
          </Link>
        </div>
      </div>
    </header>
  );
};
