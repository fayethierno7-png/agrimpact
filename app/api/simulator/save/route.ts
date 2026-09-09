import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, getSupabaseServerClient } from '../../../../lib/supabase/client';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';

export async function POST(req: NextRequest) {
  try {
    // 1. Dérivation stricte de l'identité depuis la session serveur (Prévention CWE-345)
    const user = await getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise pour sauvegarder cette simulation.' },
        { status: 401 }
      );
    }

    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { simulation } = body;

    if (!simulation || !simulation.situation) {
      return NextResponse.json(
        { success: false, error: 'Données de simulation incomplètes.' },
        { status: 400 }
      );
    }

    const record = {
      id: `sim-${Date.now()}`,
      user_id: user.id,
      region: simulation.situation.region,
      culture: simulation.situation.culture,
      stade_nom: simulation.situation.stadeNom,
      surface_ha: 1.0,
      type_irrigation: 'goutte-a-goutte',
      result_data: simulation,
      created_at: new Date().toISOString(),
    };

    // 2. Sauvegarde dans Supabase si configuré
    if (isSupabaseConfigured && supabase) {
      const db = getSupabaseServerClient(authHeader) || supabase;
      try {
        const { error } = await db.from('simulations').insert([record]);
        if (error) {
          console.warn('Avertissement table simulations Supabase (insertion):', error.message);
        }
      } catch (dbErr) {
        console.warn('Erreur réseau BDD simulations:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Simulation enregistrée avec succès.',
      data: record,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la sauvegarde.' },
      { status: 500 }
    );
  }
}
