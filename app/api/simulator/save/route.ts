import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, getSupabaseServerClient } from '../../../../lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification session
    const sessionCookie = req.cookies.get('agri_session')?.value;
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (sessionCookie) {
      try {
        const raw = Buffer.from(sessionCookie, 'base64url').toString('utf-8');
        const session = JSON.parse(raw);
        userId = session.userId;
      } catch {}
    }

    const body = await req.json();
    const {
      simulation,
      userId: bodyUserId,
    } = body;

    const targetUserId = userId || bodyUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise pour sauvegarder cette simulation.' },
        { status: 401 }
      );
    }

    if (!simulation || !simulation.situation) {
      return NextResponse.json(
        { success: false, error: 'Données de simulation incomplètes.' },
        { status: 400 }
      );
    }

    const record = {
      id: `sim-${Date.now()}`,
      user_id: targetUserId,
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
