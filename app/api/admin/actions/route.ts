import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
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
 * POST /api/admin/actions
 * Exécute les actions administratives réelles et consigne chaque action dans audit_log :
 * - action: 'user_status' (valider, suspendre)
 * - action: 'refund' (rembourser un paiement Wave / Orange Money)
 * - action: 'report_status' (traiter un signalement)
 */
export async function POST(req: NextRequest) {
  try {
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
        { success: false, error: 'Accès réservé aux administrateurs.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { actionType, payload } = body;

    const supabase = getAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Client base de données non disponible.' }, { status: 500 });
    }

    const adminNom = user?.nom || 'Administrateur Principal';
    const adminId = user?.id || 'admin-directeur';

    // =========================================================================
    // 1. STATUT UTILISATEUR (VALIDATION / SUSPENSION)
    // =========================================================================
    if (actionType === 'user_status') {
      const { targetUserId, targetUserNom, newStatus, reason } = payload;
      if (!targetUserId || !newStatus) {
        return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
      }

      await supabase
        .from('profiles')
        .update({ statut_compte: newStatus, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);

      // Traçage audit log
      await supabase.from('audit_log').insert([
        {
          admin_id: adminId,
          admin_nom: adminNom,
          action: newStatus === 'actif' ? 'validation_utilisateur' : 'suspension_utilisateur',
          cible_id: targetUserId,
          cible_type: 'user',
          metadata: {
            cible_nom: targetUserNom || 'Producteur',
            nouveau_statut: newStatus,
            motif: reason || `Statut passé à ${newStatus}`,
          },
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json({ success: true, message: `Utilisateur passé en statut "${newStatus}".` });
    }

    // =========================================================================
    // 2. REMBOURSEMENT DE PAIEMENT
    // =========================================================================
    if (actionType === 'refund') {
      const { paymentId, montant, subscriptionId, targetUserNom, reason } = payload;
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Identifiant de paiement manquant.' }, { status: 400 });
      }

      // Mise à jour du paiement
      await supabase
        .from('payments')
        .update({
          statut: 'rembourse',
          remboursement_montant: montant,
          remboursement_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Annulation de l'abonnement si lié
      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ statut: 'annule', updated_at: new Date().toISOString() })
          .eq('id', subscriptionId);
      }

      // Traçage audit log
      await supabase.from('audit_log').insert([
        {
          admin_id: adminId,
          admin_nom: adminNom,
          action: 'remboursement_paiement',
          cible_id: paymentId,
          cible_type: 'payment',
          metadata: {
            client: targetUserNom || 'Producteur',
            montant_rembourse: montant,
            motif: reason || 'Remboursement validé par l\'administrateur',
          },
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json({ success: true, message: 'Remboursement effectué et consigné dans l\'audit log.' });
    }

    // =========================================================================
    // 3. TRAITEMENT DE SIGNALEMENT
    // =========================================================================
    if (actionType === 'report_status') {
      const { reportId, newStatus, adminNote } = payload;
      if (!reportId || !newStatus) {
        return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
      }

      const updateData: Record<string, any> = { statut: newStatus };
      if (adminNote) updateData.admin_note = adminNote;
      if (newStatus === 'resolu') updateData.resolved_at = new Date().toISOString();

      await supabase.from('reports').update(updateData).eq('id', reportId);

      // Traçage audit log
      await supabase.from('audit_log').insert([
        {
          admin_id: adminId,
          admin_nom: adminNom,
          action: 'traitement_signalement',
          cible_id: reportId,
          cible_type: 'report',
          metadata: {
            nouveau_statut: newStatus,
            note: adminNote || 'Signalement traité',
          },
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json({ success: true, message: `Signalement mis à jour vers "${newStatus}".` });
    }

    return NextResponse.json({ success: false, error: 'Type d\'action non reconnu.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erreur API /api/admin/actions:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de l\'exécution de l\'action.' },
      { status: 500 }
    );
  }
}
