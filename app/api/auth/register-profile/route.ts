import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return defaultClient;
}

/**
 * POST /api/auth/register-profile
 * Enregistrement fiable côté serveur du profil, de l'exploitation et de la parcelle
 * lors de la finalisation de l'inscription.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      nom,
      telephone,
      region = 'Thiès',
      culture = 'Oignon',
      surfaceHa = 1.0,
      typeIrrigation = 'goutte-a-goutte',
    } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'Identifiant et email requis.' },
        { status: 400 }
      );
    }

    const isOwner =
      email.toLowerCase() === 'fayethierno7@gmail.com' ||
      email.toLowerCase().includes('fayethierno7');

    const role = isOwner ? 'superadmin' : 'producteur';
    const statut_compte = isOwner ? 'actif' : 'en_attente';
    const finalNom = nom || email.split('@')[0] || 'Producteur';

    const supabase = getAdminClient();

    if (supabase) {
      // 1. Sauvegarde dans profiles
      try {
        await supabase
          .from('profiles')
          .upsert([
            {
              id: userId,
              user_id: userId,
              nom: finalNom,
              telephone_contact: telephone || '',
              plan: 'free',
              role,
              statut_compte,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ], { onConflict: 'user_id' });
      } catch (pErr) {
        console.warn('Erreur upsert profile dans register-profile:', pErr);
      }

      // 2. Sauvegarde de l'exploitation initiale
      try {
        const { data: existingFarms } = await supabase
          .from('farms')
          .select('id')
          .eq('user_id', userId);

        let farmId: string;
        if (!existingFarms || existingFarms.length === 0) {
          const { data: farmInsert } = await supabase
            .from('farms')
            .insert([
              {
                user_id: userId,
                nom: `Exploitation ${region}`,
                region,
                latitude: 14.7910,
                longitude: -16.9256,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select('id')
            .single();

          farmId = farmInsert?.id;

          if (farmId) {
            await supabase.from('plots').insert([
              {
                farm_id: farmId,
                nom: `Parcelle ${culture}`,
                culture,
                surface_ha: Number(surfaceHa) || 1.0,
                date_semis: new Date().toISOString().split('T')[0],
                type_irrigation: typeIrrigation,
                variete: culture === 'Oignon' ? 'Violet de Galmi' : undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);
          }
        }
      } catch (fErr) {
        console.warn('Erreur insertion farm/plot dans register-profile:', fErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profil enregistré avec succès en base.',
      profile: {
        userId,
        nom: finalNom,
        role,
        statut_compte,
      },
    });
  } catch (error: any) {
    console.error('Erreur API /api/auth/register-profile:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur enregistrement profil.' },
      { status: 500 }
    );
  }
}
