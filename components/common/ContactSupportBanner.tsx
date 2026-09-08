'use client';

import React from 'react';
import { Phone, Mail, MessageCircle, Globe } from 'lucide-react';
import { useContactSettings } from '../../lib/hooks/useContactSettings';

export default function ContactSupportBanner() {
  const { settings } = useContactSettings();

  if (!settings.global_visible) {
    return null;
  }

  const hasAnyChannel =
    settings.support_phone_visible ||
    settings.contact_email_visible ||
    settings.whatsapp_visible ||
    settings.social_visible;

  if (!hasAnyChannel) {
    return null;
  }

  return (
    <div className="py-4 px-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div>
        <span className="font-black text-[#0C2B1E] dark:text-emerald-400 block">
          Assistance &amp; Support Technique AgriImpact
        </span>
        <span className="text-stone-500 dark:text-stone-400 text-[11px]">
          Une équipe dédiée pour accompagner les producteurs et coopératives
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {settings.support_phone_visible && (
          <a
            href={`tel:${settings.support_phone.replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{settings.support_phone}</span>
          </a>
        )}

        {settings.whatsapp_visible && (
          <a
            href={settings.whatsapp_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Direct</span>
          </a>
        )}

        {settings.contact_email_visible && (
          <a
            href={`mailto:${settings.contact_email}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-stone-400" />
            <span>{settings.contact_email}</span>
          </a>
        )}

        {settings.social_visible && (
          <a
            href={settings.social_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-stone-400" />
            <span>Réseaux</span>
          </a>
        )}
      </div>
    </div>
  );
}
