import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { isSuperadminEmail } from '../../../../lib/auth/superadmins';

export const dynamic = 'force-dynamic';

function getAdminClient(authHeader?: string | null): { client: ReturnType<typeof createClient> | null; usingServiceRole: boolean } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && serviceKey) {
    return {
      client: createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      usingServiceRole: true,
    };
  }
  if (url && anonKey && authHeader) {
    const cleanHeader = authHeader.trim();
    return {
      client: createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: cleanHeader ? { Authorization: cleanHeader } : {},
        },
      }),
      usingServiceRole: false,
    };
  }
  return { client: null, usingServiceRole: false };
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
      isSuperadminEmail(user?.email) ||
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
    const { client: supabase, usingServiceRole } = getAdminClient(authHeader);
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

      // profiles.statut_compte est verrouillé en base contre toute écriture qui
      // n'utilise pas la clé service_role (trigger anti-fraude) : sans elle,
      // l'UPDATE ci-dessous serait silencieusement annulé tout en renvoyant une
      // ligne (donc un faux succès). On refuse explicitement plutôt que de mentir.
      if (!usingServiceRole) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY doit être définie pour modifier le statut d\'un compte.',
          },
          { status: 500 }
        );
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

      if (updatedData[0].statut_compte !== newStatus) {
        // Défense en profondeur : si la valeur réellement stockée ne correspond
        // pas à ce qui a été demandé, ne jamais prétendre un succès.
        return NextResponse.json(
          { success: false, error: 'La mise à jour du statut n\'a pas été appliquée en base.' },
          { status: 500 }
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
      const { data: refundedPayment, error: refundError } = await supabase
        .from('payments')
        .update({
          statut: 'rembourse',
          remboursement_montant: montant,
          remboursement_date: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select('id, statut');

      if (refundError) {
        console.error('Erreur Supabase update remboursement:', refundError);
        return NextResponse.json(
          { success: false, error: refundError.message || 'Erreur base de données lors du remboursement.' },
          { status: 500 }
        );
      }

      if (!refundedPayment || refundedPayment.length === 0 || refundedPayment[0].statut !== 'rembourse') {
        return NextResponse.json(
          { success: false, error: 'Paiement introuvable ou remboursement non appliqué en base.' },
          { status: 404 }
        );
      }

      // Annulation de l'abonnement si lié
      if (subscriptionId) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ statut: 'annule', updated_at: new Date().toISOString() })
          .eq('id', subscriptionId);
        if (subError) {
          console.warn('Avertissement: annulation abonnement liée au remboursement a échoué:', subError);
        }
      }

      // Traçage audit log (non-bloquant : le remboursement lui-même est déjà confirmé ci-dessus)
      try {
        const isUUID = (id?: any) =>
          typeof id === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        await supabase.from('audit_log').insert([
          {
            admin_id: isUUID(adminId) ? adminId : null,
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
      } catch (auditErr) {
        console.warn('Avertissement insertion audit_log (non-bloquant):', auditErr);
      }

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

      const { data: updatedReport, error: reportError } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId)
        .select('id, statut');

      if (reportError) {
        console.error('Erreur Supabase update signalement:', reportError);
        return NextResponse.json(
          { success: false, error: reportError.message || 'Erreur base de données lors du traitement du signalement.' },
          { status: 500 }
        );
      }

      if (!updatedReport || updatedReport.length === 0 || updatedReport[0].statut !== newStatus) {
        return NextResponse.json(
          { success: false, error: 'Signalement introuvable ou mise à jour non appliquée en base.' },
          { status: 404 }
        );
      }

      // Traçage audit log (non-bloquant : le traitement du signalement est déjà confirmé ci-dessus)
      try {
        const isUUID = (id?: any) =>
          typeof id === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        await supabase.from('audit_log').insert([
          {
            admin_id: isUUID(adminId) ? adminId : null,
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
      } catch (auditErr) {
        console.warn('Avertissement insertion audit_log (non-bloquant):', auditErr);
      }

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
