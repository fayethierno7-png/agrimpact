import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase as defaultClient } from '../../../../lib/supabase/client';

export const dynamic = 'force-dynamic';

function getAdminClient(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  if (url && anonKey && authHeader) {
    const cleanHeader = authHeader.trim();
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: cleanHeader ? { Authorization: cleanHeader } : {},
      },
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

    const authHeader = req.headers.get('authorization');
    const supabase = getAdminClient(authHeader);
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Client base de données non disponible.' }, { status: 500 });
    }

    const adminNom = user?.nom || 'Administrateur Principal';
    const adminId = user?.id || null;

    // =========================================================================
    // 1. STATUT UTILISATEUR (VALIDATION / SUSPENSION)
    // =========================================================================
    if (actionType === 'user_status') {
      const { targetUserId, targetUserNom, newStatus, reason } = payload;
      if (!targetUserId || !newStatus) {
        return NextResponse.json({ success: false, error: 'Paramètres manquants.' }, { status: 400 });
      }

      // 1. Tentative de mise à jour ciblée sur user_id
      let { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update({ statut_compte: newStatus, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId)
        .select('id, user_id, statut_compte');

      // 2. Si aucune ligne affectée et pas d'erreur, tenter par id
      if ((!updatedData || updatedData.length === 0) && !updateError) {
        const resById = await supabase
          .from('profiles')
          .update({ statut_compte: newStatus, updated_at: new Date().toISOString() })
          .eq('id', targetUserId)
          .select('id, user_id, statut_compte');
        updatedData = resById.data;
        updateError = resById.error;
      }

      if (updateError) {
        console.error('Erreur Supabase update statut_compte:', updateError);
        return NextResponse.json(
          { success: false, error: updateError.message || 'Erreur base de données lors de la mise à jour.' },
          { status: 500 }
        );
      }

      if (!updatedData || updatedData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Aucun profil trouvé pour cet identifiant ou permissions insuffisantes.' },
          { status: 404 }
        );
      }

      // 3. Traçage audit log sécurisé (ne bloque pas la validation si UUID ou audit_log échoue)
      try {
        const isUUID = (id?: any) =>
          typeof id === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const safeAdminId = isUUID(adminId) ? adminId : null;

        await supabase.from('audit_log').insert([
          {
            admin_id: safeAdminId,
            admin_nom: adminNom,
            action: newStatus === 'actif' ? 'validation_utilisateur' : 'suspension_utilisateur',
            cible_id: String(targetUserId),
            cible_type: 'user',
            metadata: {
              cible_nom: targetUserNom || 'Producteur',
              nouveau_statut: newStatus,
              motif: reason || `Statut passé à ${newStatus}`,
            },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (auditErr) {
        console.warn('Avertissement insertion audit_log (non-bloquant):', auditErr);
      }

      return NextResponse.json({
        success: true,
        message: `Utilisateur passé en statut "${newStatus}".`,
        profile: updatedData[0],
      });
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
