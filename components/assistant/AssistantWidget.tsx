'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';
import AssistantDrawer from './AssistantDrawer';

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useAgri();

  // Point 13 : L'assistant flottant interactif est STRICTEMENT réservé aux utilisateurs connectés du SaaS.
  // Aucun affichage sur la landing page ('/'), ni sur les pages de tarification ou d'authentification.
  if (
    pathname === '/' ||
    pathname === '/assistant' ||
    pathname === '/tarifs' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/en-attente' ||
    !profile
  ) {
    return null;
  }

  return (
    <>
      {/* Bouton Flottant en bas à droite — positionné au-dessus du BottomNav sur mobile */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 animate-fade-in">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#0C2B1E] hover:bg-[#123C2B] text-white rounded-full shadow-[0_10px_25px_rgba(12,43,30,0.3)] hover:shadow-[0_14px_30px_rgba(12,43,30,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border border-white/15"
          aria-label="Ouvrir l'Assistant AgriImpact"
        >
          {/* Badge de statut en ligne */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8EF56] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C8EF56]" />
          </span>

          <MessageSquareText className="w-4 h-4 text-[#C8EF56]" />
          <span className="text-xs font-black tracking-tight pr-0.5">Assistant AgriImpact</span>

          <Sparkles className="w-3.5 h-3.5 text-[#C8EF56] opacity-80 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Panneau Latéral (Drawer) */}
      <AssistantDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
