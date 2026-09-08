import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';

export interface ContactSettings {
  support_phone: string;
  support_phone_visible: boolean;
  contact_email: string;
  contact_email_visible: boolean;
  whatsapp_link: string;
  whatsapp_visible: boolean;
  social_link: string;
  social_visible: boolean;
  global_visible: boolean;
  updated_at?: string;
}

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

// GET : Public (utilisé par le footer et les pages de contact)
export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'contact_settings')
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          settings: {
            support_phone: data.support_phone,
            support_phone_visible: data.support_phone_visible ?? true,
            contact_email: data.contact_email,
            contact_email_visible: data.contact_email_visible ?? true,
            whatsapp_link: data.whatsapp_link,
            whatsapp_visible: data.whatsapp_visible ?? true,
            social_link: data.social_link,
            social_visible: data.social_visible ?? true,
            global_visible: data.global_visible ?? true,
            updated_at: data.updated_at,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS,
    });
  }
}

// PUT : Admin uniquement (Point 14)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Accès réservé aux administrateurs.' },
        { status: 403 }
      );
    }

    const body: Partial<ContactSettings> = await req.json();

    const payload = {
      id: 'contact_settings',
      support_phone: body.support_phone?.trim() || DEFAULT_SETTINGS.support_phone,
      support_phone_visible: Boolean(body.support_phone_visible),
      contact_email: body.contact_email?.trim() || DEFAULT_SETTINGS.contact_email,
      contact_email_visible: Boolean(body.contact_email_visible),
      whatsapp_link: body.whatsapp_link?.trim() || DEFAULT_SETTINGS.whatsapp_link,
      whatsapp_visible: Boolean(body.whatsapp_visible),
      social_link: body.social_link?.trim() || DEFAULT_SETTINGS.social_link,
      social_visible: Boolean(body.social_visible),
      global_visible: Boolean(body.global_visible ?? true),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (isSupabaseConfigured && supabase) {
      const { error: upsertErr } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'id' });

      if (upsertErr) {
        console.error('Erreur sauvegarde app_settings:', upsertErr);
        return NextResponse.json(
          { success: false, error: upsertErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Coordonnées de contact mises à jour avec succès.',
      settings: payload,
    });
  } catch (err: any) {
    console.error('Erreur mise à jour settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
