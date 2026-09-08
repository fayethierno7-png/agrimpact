'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, History, Bell, User, ShieldCheck } from 'lucide-react';
import { useAgri } from '../lib/context/AgriContext';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { profile, alerts } = useAgri();
  const activeAlertsCount = alerts.filter((a) => a.statut === 'active').length;
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    {
      label: 'Accueil',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Historique',
      href: '/history',
      icon: History,
      isActive: pathname === '/history',
    },
    {
      label: 'Alertes',
      href: '/alerts',
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      isActive: pathname === '/alerts',
    },
    {
      label: 'Profil',
      href: '/profile',
      icon: User,
      isActive: pathname === '/profile',
    },
    {
      label: 'Admin',
      href: '/admin',
      icon: ShieldCheck,
      isActive: pathname === '/admin' || pathname?.startsWith('/admin'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 px-4 py-2 flex items-center justify-around shadow-lg md:hidden transition-colors duration-200">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (item.href === '/admin') {
                document.cookie = 'agri_user_role=admin; path=/; max-age=604800; SameSite=Lax';
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              active
                ? 'text-emerald-800 dark:text-emerald-300 font-semibold scale-105'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  active ? 'text-emerald-700 dark:text-emerald-400 stroke-[2.5]' : 'stroke-[1.75]'
                }`}
              />
              {item.badge && (
                <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900">
                  {item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] mt-1 tracking-tight ${
                active ? 'text-emerald-900 dark:text-emerald-300 font-bold' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {item.label}
            </span>
            {active && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
