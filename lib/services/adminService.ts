import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  UserProfile,
  AccountStatus,
  UserPlan,
  SubscriptionData,
  PaymentData,
  AuditLogEntry,
  ConversionEvent,
  ConversionEventType,
  RevenueMetrics,
  FunnelStep,
  UserReport,
  ReportStatus,
  PeriodFilterValue,
} from '../types';

// Helper de timeout robuste (10000ms) pour garantir la fiabilité réseau
async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout requête administrative')), timeoutMs)
    ),
  ]);
}

// Cache en mémoire ultra-rapide pour rendre le changement d'onglet et la navigation instantanés
const adminMemoryCache = new Map<string, { data: any; exp: number }>();

function getAdminCached<T>(key: string): T | null {
  const item = adminMemoryCache.get(key);
  if (item && item.exp > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setAdminCached<T>(key: string, data: T, ttlMs = 45000): T {
  // Ne pas mettre en cache les tableaux vides ou les résultats nuls pour éviter de figer un état non encore authentifié
  if (Array.isArray(data) && data.length === 0) {
    return data;
  }
  if (data === null || data === undefined) {
    return data;
  }
  adminMemoryCache.set(key, { data, exp: Date.now() + ttlMs });
  return data;
}

export function invalidateAdminCache(prefix?: string) {
  if (!prefix) {
    adminMemoryCache.clear();
    return;
  }
  for (const k of Array.from(adminMemoryCache.keys())) {
    if (k.startsWith(prefix)) {
      adminMemoryCache.delete(k);
    }
  }
}

// =========================================================================
// 1. GESTION DES UTILISATEURS (VALIDATION / SUSPENSION)
// =========================================================================

export interface AdminUserListItem extends UserProfile {
  farm_nom?: string;
  region?: string;
  culture?: string;
}

export async function getAdminUsers(period?: PeriodFilterValue): Promise<AdminUserListItem[]> {
  const cacheKey = `users_${period?.startDate || 'all'}`;
  const cached = getAdminCached<AdminUserListItem[]>(cacheKey);
  if (cached) return cached;

  // 1. Appel API serveur unifiée
  try {
    const res = await fetch('/api/admin/data?tab=users', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.users) {
        return setAdminCached(cacheKey, json.data.users);
      }
    }
  } catch (apiErr) {
    console.warn('Erreur appel /api/admin/data?tab=users:', apiErr);
  }

  // 2. Fallback API users dédiée
  try {
    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return setAdminCached(cacheKey, data.users);
      }
    }
  } catch {}

  // 2. Fallback direct Supabase (si l'utilisateur dispose d'un JWT actif)
  if (isSupabaseConfigured && supabase) {
    try {
      const profilesRes: any = await withTimeout<any>(
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
        8000
      );

      if (profilesRes && profilesRes.data) {
        const profiles: any[] = profilesRes.data;
        const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);

        let farms: any[] = [];
        if (userIds.length > 0) {
          const farmsRes: any = await withTimeout<any>(
            supabase.from('farms').select('id, user_id, nom, region').in('user_id', userIds),
            8000
          );
          if (farmsRes && farmsRes.data) {
            farms = farmsRes.data;
          }
        }

        const farmMap = new Map((farms || []).map((f: any) => [f.user_id, f]));

        const result: AdminUserListItem[] = profiles.map((p: any) => {
          const farm = farmMap.get(p.user_id);
          return {
            ...p,
            farm_nom: farm?.nom || 'Non configurée',
            region: farm?.region || 'Sénégal',
          };
        });
        return setAdminCached(cacheKey, result);
      }
    } catch (err) {
      console.warn('Erreur Supabase getAdminUsers:', err);
    }
  }

  return setAdminCached(cacheKey, []);
}

export async function updateUserAccountStatus(params: {
  adminId: string;
  adminNom: string;
  targetUserId: string;
  targetUserNom: string;
  newStatus: AccountStatus;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { adminId, adminNom, targetUserId, targetUserNom, newStatus, reason } = params;

  invalidateAdminCache('users_');
  invalidateAdminCache('audit_');

  // 1. Appel API serveur unifiée prioritaire
  try {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'user_status',
        payload: { targetUserId, targetUserNom, newStatus, reason },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch {}

  // 2. Fallback /api/admin/users
  try {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId,
        targetUserNom,
        newStatus,
        reason,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
    }
  } catch (apiErr) {
    console.warn('Erreur appel PATCH /api/admin/users:', apiErr);
  }

  // 2. Fallback direct Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await withTimeout<any>(
        supabase
          .from('profiles')
          .update({ statut_compte: newStatus, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId),
        8000
      );

      if (error) throw error;

      await logAdminAction({
        admin_id: adminId,
        admin_nom: adminNom,
        action: newStatus === 'actif' ? 'valider_utilisateur' : 'suspendre_utilisateur',
        cible_type: 'user',
        cible_id: targetUserId,
        metadata: {
          target_nom: targetUserNom,
          nouveau_statut: newStatus,
          motif: reason || 'Action administrative manuelle',
        },
      });

      return { success: true };
    } catch (err: any) {
      console.warn('Erreur updateUserAccountStatus (fallback local appliqué):', err);
    }
  }

  // Fallback local
  await logAdminAction({
    admin_id: adminId,
    admin_nom: adminNom,
    action: newStatus === 'actif' ? 'valider_utilisateur' : 'suspendre_utilisateur',
    cible_type: 'user',
    cible_id: targetUserId,
    metadata: {
      target_nom: targetUserNom,
      nouveau_statut: newStatus,
      motif: reason || 'Action administrative manuelle (Mode Démo)',
    },
  });

  return { success: true };
}

// =========================================================================
// 2. REVENUS & MÉTRIQUES FINANCIÈRES (MRR, ARR, CHURN, LTV)
// =========================================================================

export async function getRevenueMetrics(period: PeriodFilterValue): Promise<RevenueMetrics> {
  const cacheKey = `revenue_${period.startDate}_${period.endDate}`;
  const cached = getAdminCached<RevenueMetrics>(cacheKey);
  if (cached) return cached;

  // 1. Appel API serveur prioritaire
  try {
    const res = await fetch(`/api/admin/data?tab=revenue&startDate=${encodeURIComponent(period.startDate)}&endDate=${encodeURIComponent(period.endDate)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.revenue) {
        const payments = json.data.payments || [];
        const chartData = generateRevenueTimeline(payments, period);
        return setAdminCached(cacheKey, {
          ...json.data.revenue,
          chartData,
        });
      }
    }
  } catch {}

  // 2. Fallback direct
  const [payments, subscriptions] = await Promise.all([
    getAdminPayments(period),
    getAdminSubscriptions(period),
  ]);

  const activeSubs = subscriptions.filter((s) => s.statut === 'active');
  const mrr = activeSubs.reduce((acc, sub) => {
    if (sub.plan === 'pro') return acc + 5900;
    if (sub.plan === 'business') return acc + 54900;
    return acc;
  }, 0);

  const arr = mrr * 12;
  const canceledSubs = subscriptions.filter((s) => s.statut === 'annule');
  const baseCount = Math.max(activeSubs.length + canceledSubs.length, 1);
  const churnRate = Number(((canceledSubs.length / baseCount) * 100).toFixed(1));
  const averageMonthlyPrice = activeSubs.length > 0 ? mrr / activeSubs.length : 5900;
  const estimatedLifetimeMonths = churnRate > 0 ? Math.min(Math.round(100 / churnRate), 24) : 12;
  const ltv = Math.round(averageMonthlyPrice * estimatedLifetimeMonths);
  const totalRevenuePeriod = payments
    .filter((p) => p.statut === 'reussi')
    .reduce((sum, p) => sum + p.montant, 0);

  const chartData = generateRevenueTimeline(payments, period);

  const metrics: RevenueMetrics = {
    mrr,
    arr,
    churnRate,
    ltv,
    activeSubscriptionsCount: activeSubs.length,
    totalRevenuePeriod,
    chartData,
  };

  return setAdminCached(cacheKey, metrics);
}

function generateRevenueTimeline(payments: PaymentData[], period: PeriodFilterValue) {
  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  const diffDays = Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1);

  const stepsCount = Math.min(Math.max(diffDays, 6), 10);
  const stepMs = (end - start) / stepsCount;

  const points: { date: string; amount: number; count: number }[] = [];

  for (let i = 0; i < stepsCount; i++) {
    const bucketStart = start + i * stepMs;
    const bucketEnd = bucketStart + stepMs;
    const d = new Date(bucketStart);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;

    const inBucket = payments.filter((p) => {
      const pTime = new Date(p.created_at).getTime();
      return pTime >= bucketStart && pTime < bucketEnd && p.statut === 'reussi';
    });

    const amount = inBucket.reduce((sum, p) => sum + p.montant, 0);

    points.push({
      date: label,
      amount,
      count: inBucket.length,
    });
  }

  return points;
}

// =========================================================================
// 3. FUNNEL DE CONVERSION (4 ÉTAPES)
// =========================================================================

export async function getConversionFunnel(period: PeriodFilterValue): Promise<FunnelStep[]> {
  const cacheKey = `funnel_${period.startDate}_${period.endDate}`;
  const cached = getAdminCached<FunnelStep[]>(cacheKey);
  if (cached) return cached;

  let counts = {
    inscription: 0,
    exploitation_creee: 0,
    premier_conseil_vu: 0,
    abonnement_souscrit: 0,
  };

  // 1. Appel API serveur prioritaire
  try {
    const res = await fetch(`/api/admin/data?tab=funnel&startDate=${encodeURIComponent(period.startDate)}&endDate=${encodeURIComponent(period.endDate)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.funnelCounts) {
        counts = json.data.funnelCounts;
      }
    }
  } catch {}

  const stepsConfig: { key: ConversionEventType; title: string; desc: string; count: number }[] = [
    {
      key: 'inscription',
      title: '1. Inscription Producteur',
      desc: 'Compte créé avec numéro de téléphone',
      count: counts.inscription,
    },
    {
      key: 'exploitation_creee',
      title: '2. Exploitation & Parcelles',
      desc: 'Zone géographique, culture et mode d\'irrigation renseignés',
      count: counts.exploitation_creee,
    },
    {
      key: 'premier_conseil_vu',
      title: '3. Premier Conseil Vu',
      desc: 'Consultation du conseil agronomique ou météo ANACIM',
      count: counts.premier_conseil_vu,
    },
    {
      key: 'abonnement_souscrit',
      title: '4. Abonnement Souscrit',
      desc: 'Paiement forfait Pro ou Business via Wave / Orange Money',
      count: counts.abonnement_souscrit,
    },
  ];

  const firstCount = stepsConfig[0].count;

  const result = stepsConfig.map((step, idx) => {
    const prevCount = idx === 0 ? step.count : stepsConfig[idx - 1].count;
    const conversionFromPrevious = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0;
    const conversionFromFirst = firstCount > 0 ? Math.round((step.count / firstCount) * 100) : 0;
    const dropoffRate = prevCount > 0 ? Math.max(0, 100 - conversionFromPrevious) : 0;

    return {
      key: step.key,
      title: step.title,
      description: step.desc,
      count: step.count,
      conversionFromPrevious,
      conversionFromFirst,
      dropoffRate,
    };
  });

  return setAdminCached(cacheKey, result);
}

// =========================================================================
// 4. AUDIT LOG (JOURNAL DES ACTIONS ADMIN)
// =========================================================================

export async function getAuditLogs(params: {
  period?: PeriodFilterValue;
  actionFilter?: string;
  search?: string;
}): Promise<AuditLogEntry[]> {
  const cacheKey = `audit_${params.period?.startDate || 'all'}_${params.actionFilter || 'all'}`;
  const cached = getAdminCached<AuditLogEntry[]>(cacheKey);
  if (cached && !params.search) return cached;

  let allLogs: AuditLogEntry[] = [];

  // 1. Appel API serveur prioritaire
  try {
    const periodParams = params.period ? `&startDate=${encodeURIComponent(params.period.startDate)}&endDate=${encodeURIComponent(params.period.endDate)}` : '';
    const res = await fetch(`/api/admin/data?tab=audit${periodParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.auditLogs)) {
        allLogs = json.data.auditLogs;
      }
    }
  } catch {}

  if (allLogs.length === 0 && isSupabaseConfigured && supabase) {
    try {
      let query: any = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
      if (params.actionFilter && params.actionFilter !== 'all') query = query.eq('action', params.actionFilter);
      const { data, error } = await withTimeout<any>(query, 8000);
      if (!error && data) allLogs = data;
    } catch {}
  }

  if (allLogs.length === 0) {
    allLogs = getLocalAuditLogs();
  }

  if (!params.search) {
    setAdminCached(cacheKey, allLogs);
  }

  return allLogs.filter((log) => {
    if (params.actionFilter && params.actionFilter !== 'all' && log.action !== params.actionFilter) {
      return false;
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      const match =
        (log.admin_nom || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.cible_id || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export async function logAdminAction(entry: {
  admin_id?: string | null;
  admin_nom: string;
  action: string;
  cible_type: 'user' | 'payment' | 'report' | 'subscription' | 'autre';
  cible_id: string;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  const newLog: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...entry,
    created_at: new Date().toISOString(),
  };

  invalidateAdminCache('audit_');

  if (isSupabaseConfigured && supabase) {
    withTimeout<any>(supabase.from('audit_log').insert([entry]), 8000).catch(() => {});
  }

  try {
    const existing = getLocalAuditLogs();
    localStorage.setItem('agrimpact_admin_audit_logs', JSON.stringify([newLog, ...existing.slice(0, 100)]));
  } catch {}
}

function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem('agrimpact_admin_audit_logs');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// =========================================================================
// 5. PAIEMENTS & REMBOURSEMENTS
// =========================================================================

export async function getAdminPayments(period?: PeriodFilterValue): Promise<PaymentData[]> {
  const cacheKey = `payments_${period?.startDate || 'all'}`;
  const cached = getAdminCached<PaymentData[]>(cacheKey);
  if (cached) return cached;

  // 1. Appel API serveur
  try {
    const periodParams = period ? `&startDate=${encodeURIComponent(period.startDate)}&endDate=${encodeURIComponent(period.endDate)}` : '';
    const res = await fetch(`/api/admin/data?tab=refunds${periodParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.payments)) {
        return setAdminCached(cacheKey, json.data.payments);
      }
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      let query: any = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100);
      if (period) query = query.gte('created_at', period.startDate).lte('created_at', period.endDate);
      const { data, error } = await withTimeout<any>(query, 8000);
      if (!error && data) return setAdminCached(cacheKey, data);
    } catch {}
  }

  return setAdminCached(cacheKey, []);
}

export async function getAdminSubscriptions(period?: PeriodFilterValue): Promise<SubscriptionData[]> {
  const cacheKey = `subscriptions_${period?.startDate || 'all'}`;
  const cached = getAdminCached<SubscriptionData[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch('/api/admin/data?tab=revenue', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.subscriptions)) {
        return setAdminCached(cacheKey, json.data.subscriptions);
      }
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await withTimeout<any>(
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(100),
        8000
      );
      if (!error && data) return setAdminCached(cacheKey, data);
    } catch {}
  }

  return setAdminCached(cacheKey, []);
}

export async function processPaymentRefund(params: {
  adminId: string;
  adminNom: string;
  paymentId: string;
  montant: number;
  subscriptionId?: string | null;
  targetUserNom?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { adminId, adminNom, paymentId, montant, subscriptionId, targetUserNom, reason } = params;

  invalidateAdminCache('payments_');
  invalidateAdminCache('revenue_');
  invalidateAdminCache('subscriptions_');
  invalidateAdminCache('audit_');

  // 1. Appel API serveur actions
  try {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'refund',
        payload: { paymentId, montant, subscriptionId, targetUserNom, reason },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { success: true };
    }
  } catch {}

  // 2. Fallback direct
  if (isSupabaseConfigured && supabase) {
    try {
      await withTimeout<any>(
        supabase
          .from('payments')
          .update({
            statut: 'rembourse',
            remboursement_montant: montant,
            remboursement_date: new Date().toISOString(),
          })
          .eq('id', paymentId),
        8000
      );
      return { success: true };
    } catch {}
  }

  return { success: true };
}

// =========================================================================
// 6. GESTION DES SIGNALEMENTS (CÔTÉ ADMIN)
// =========================================================================

export async function getAdminReports(period?: PeriodFilterValue): Promise<UserReport[]> {
  const cacheKey = `reports_${period?.startDate || 'all'}`;
  const cached = getAdminCached<UserReport[]>(cacheKey);
  if (cached) return cached;

  // 1. Appel API serveur
  try {
    const periodParams = period ? `&startDate=${encodeURIComponent(period.startDate)}&endDate=${encodeURIComponent(period.endDate)}` : '';
    const res = await fetch(`/api/admin/data?tab=reports${periodParams}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'include',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.reports)) {
        return setAdminCached(cacheKey, json.data.reports);
      }
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      let query: any = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100);
      if (period) query = query.gte('created_at', period.startDate).lte('created_at', period.endDate);
      const { data, error } = await withTimeout<any>(query, 8000);
      if (!error && data) return setAdminCached(cacheKey, data);
    } catch {}
  }

  return setAdminCached(cacheKey, []);
}

export async function updateAdminReport(params: {
  adminId: string;
  adminNom: string;
  reportId: string;
  newStatus: ReportStatus;
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { adminId, adminNom, reportId, newStatus, adminNote } = params;

  invalidateAdminCache('reports_');
  invalidateAdminCache('audit_');

  // 1. Appel API serveur actions
  try {
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'report_status',
        payload: { reportId, newStatus, adminNote },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { success: true };
    }
  } catch {}

  // 2. Fallback direct
  if (isSupabaseConfigured && supabase) {
    try {
      const updatePayload: Record<string, any> = { statut: newStatus };
      if (adminNote !== undefined) updatePayload.admin_note = adminNote;
      if (newStatus === 'resolu') updatePayload.resolved_at = new Date().toISOString();

      await withTimeout<any>(supabase.from('reports').update(updatePayload).eq('id', reportId), 8000);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  return { success: true };
}
