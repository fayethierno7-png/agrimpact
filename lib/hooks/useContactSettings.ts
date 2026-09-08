'use client';

import { useState, useEffect } from 'react';
import { ContactSettings } from '../../app/api/settings/contact/route';

const DEFAULT_SETTINGS: ContactSettings = {
  support_phone: '+221 33 800 12 12',
  support_phone_visible: true,
  contact_email: 'contact@agrimpact.sn',
  contact_email_visible: true,
  whatsapp_link: 'https://wa.me/221771234567',
  whatsapp_visible: true,
  social_link: 'https://facebook.com/agrimpact',
  social_visible: true,
  global_visible: true,
};

export function useContactSettings() {
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/contact');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings) {
          setSettings(json.settings);
        }
      }
    } catch (e) {
      console.warn('Erreur lecture contact settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, refetch: fetchSettings };
}
