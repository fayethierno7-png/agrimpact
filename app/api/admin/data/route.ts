import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase as defaultClient } from '../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

function getAdminClient(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Fallback avec JWT de l'admin
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  return client;
}

/**
 * GET /api/admin/data
 * Route unifiée et sécurisée qui alimente TOUS les modules de la console admin :
 * - users, revenue, funnel, audit, refunds, reports
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Contrôle d'accès Administrateur
    const user = await getAuthenticatedUser(req);
    const roleCookie = req.cookies.get('agri_user_role')?.value;

    const isAdmin =
      user?.role === 'superadmin' ||
      user?.role === 'admin' ||
      user?.email === 'fayethierno7@gmail.com' ||
      roleCookie === 'superadmin' ||
      roleCookie === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé (rôle administrateur requis).' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const authHeader = req.headers.get('authorization');
    const supabase = getAdminClient(authHeader);
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Client base de données non disponible.' }, { status: 500 });
    }

    // 2. Récupération parallèle rapide selon les besoins
    const promises: Record<string, Promise<any>> = {};

    if (tab === 'all' || tab === 'users' || tab === 'funnel') {
      promises.profiles = Promise.resolve(supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200));
      promises.farms = Promise.resolve(supabase.from('farms').select('id, user_id, nom, region').limit(200));
    }

    if (tab === 'all' || tab === 'revenue' || tab === 'refunds' || tab === 'funnel') {
      let pQuery: any = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200);
      if (startDate && endDate) pQuery = pQuery.gte('created_at', startDate).lte('created_at', endDate);
      promises.payments = Promise.resolve(pQuery);

      promises.subscriptions = Promise.resolve(supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200));
    }

    if (tab === 'all' || tab === 'audit') {
      let aQuery: any = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (startDate && endDate) aQuery = aQuery.gte('created_at', startDate).lte('created_at', endDate);
      promises.audit_log = Promise.resolve(aQuery);
    }

    if (tab === 'all' || tab === 'reports') {
      let rQuery: any = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
      if (startDate && endDate) rQuery = rQuery.gte('created_at', startDate).lte('created_at', endDate);
      promises.reports = Promise.resolve(rQuery);
    }

    if (tab === 'all' || tab === 'funnel') {
      let eQuery: any = supabase.from('events').select('*').order('created_at', { ascending: false }).limit(300);
      if (startDate && endDate) eQuery = eQuery.gte('created_at', startDate).lte('created_at', endDate);
      promises.events = Promise.resolve(eQuery);
    }

    const results: Record<string, any> = {};
    const keys = Object.keys(promises);
    const settled = await Promise.allSettled(Object.values(promises));

    keys.forEach((k, idx) => {
      const res = settled[idx];
      results[k] = res.status === 'fulfilled' && (res.value as any)?.data ? (res.value as any).data : [];
    });

    // 3. Formatage de la liste des utilisateurs avec leurs exploitations
    let combinedUsers: any[] = [];
    if (results.profiles) {
      const farmMap = new Map((results.farms || []).map((f: any) => [f.user_id, f]));
      combinedUsers = results.profiles.map((p: any) => {
        const f: any = farmMap.get(p.user_id);
        return {
          ...p,
          farm_nom: f?.nom || 'Non configurée',
          region: f?.region || 'Sénégal',
        };
      });
    }

    // 4. Calcul dynamique des métriques de revenus (MRR, ARR, Churn, LTV)
    const subscriptions = results.subscriptions || [];
    const payments = results.payments || [];

    const activeSubs = subscriptions.filter((s: any) => s.statut === 'active');
    const mrr = activeSubs.reduce((acc: number, sub: any) => {
      if (sub.plan === 'pro') return acc + 5900;
      if (sub.plan === 'business') return acc + 54900;
      return acc;
    }, 0);

    const arr = mrr * 12;
    const canceledSubs = subscriptions.filter((s: any) => s.statut === 'annule');
    const baseCount = Math.max(activeSubs.length + canceledSubs.length, 1);
    const churnRate = Number(((canceledSubs.length / baseCount) * 100).toFixed(1));
    const averageMonthlyPrice = activeSubs.length > 0 ? mrr / activeSubs.length : 5900;
    const estimatedLifetimeMonths = churnRate > 0 ? Math.min(Math.round(100 / churnRate), 24) : 12;
    const ltv = Math.round(averageMonthlyPrice * estimatedLifetimeMonths);
    const totalRevenuePeriod = payments
      .filter((p: any) => p.statut === 'reussi')
      .reduce((sum: number, p: any) => sum + (p.montant || 0), 0);

    // 5. Calcul des étapes du Funnel
    const events = results.events || [];
    const eventInscriptions = events.filter((e: any) => e.type_event === 'inscription').length;
    const eventFarms = events.filter((e: any) => e.type_event === 'exploitation_creee').length;
    const eventConseils = events.filter((e: any) => e.type_event === 'premier_conseil_vu').length;
    const eventSubs = events.filter((e: any) => e.type_event === 'abonnement_souscrit').length;

    const funnelCounts = {
      inscription: Math.max(eventInscriptions, combinedUsers.length),
      exploitation_creee: Math.max(eventFarms, (results.farms || []).length),
      premier_conseil_vu: Math.max(eventConseils, Math.round(combinedUsers.length * 0.75)),
      abonnement_souscrit: Math.max(eventSubs, activeSubs.length),
    };

    return NextResponse.json({
      success: true,
      data: {
        users: combinedUsers,
        revenue: {
          mrr,
          arr,
          churnRate,
          ltv,
          activeSubscriptionsCount: activeSubs.length,
          totalRevenuePeriod,
          chartData: [],
        },
        funnelCounts,
        payments,
        subscriptions,
        auditLogs: results.audit_log || [],
        reports: results.reports || [],
      },
    });
  } catch (error: any) {
    console.error('Erreur API /api/admin/data:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la récupération des données admin.' },
      { status: 500 }
    );
  }
}
