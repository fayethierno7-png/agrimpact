import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, getSupabaseServerClient } from '../../../../lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
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

    if (!userId && !authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise.' },
        { status: 401 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      const db = getSupabaseServerClient(authHeader) || supabase;
      const { data, error } = await db
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: true, data: [] });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur récupération historique.' },
      { status: 500 }
    );
  }
}
