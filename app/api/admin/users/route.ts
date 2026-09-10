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
 * GET /api/admin/users
 * Récupère la liste complète des utilisateurs et producteurs inscrits pour la console admin.
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

    const supabase = getAdminClient();

    // 2. Tentative via la fonction RPC sécurisée (contourne RLS sans blocage)
    if (supabase) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users_list');
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          return NextResponse.json({
            success: true,
            source: 'rpc',
            users: rpcData,
          });
        }
      } catch (rpcErr) {
        console.warn('RPC get_admin_users_list indisponible, fallback direct:', rpcErr);
      }

      // 3. Fallback direct sur les tables Supabase profiles et farms
      try {
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (!pError && profiles && profiles.length > 0) {
          const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);
          let farms: any[] = [];
          if (userIds.length > 0) {
            const { data: fData } = await supabase
              .from('farms')
              .select('id, user_id, nom, region')
              .in('user_id', userIds);
            farms = fData || [];
          }

          const farmMap = new Map((farms || []).map((f: any) => [f.user_id, f]));
          const combinedUsers = profiles.map((p: any) => {
            const farm = farmMap.get(p.user_id);
            return {
              ...p,
              farm_nom: farm?.nom || 'Non configurée',
              region: farm?.region || 'Sénégal',
            };
          });

          return NextResponse.json({
            success: true,
            source: 'supabase_direct',
            users: combinedUsers,
          });
        }
      } catch (directErr) {
        console.warn('Erreur lecture directe profiles:', directErr);
      }
    }

    // 4. Si aucune donnée en base pour l'instant
    return NextResponse.json({
      success: true,
      source: 'empty',
      users: [],
    });
  } catch (error: any) {
    console.error('Erreur API /api/admin/users:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur serveur lors de la récupération des utilisateurs.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Valide, active ou suspend un utilisateur et consigne l'action dans audit_log.
 */
export async function PATCH(req: NextRequest) {
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
        { success: false, error: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetUserId, targetUserNom, newStatus, reason } = body;

    if (!targetUserId || !newStatus) {
      return NextResponse.json(
        { success: false, error: 'Identifiant et nouveau statut requis.' },
        { status: 400 }
      );
    }

    const adminNom = user?.nom || 'Administrateur Principal';
    const adminId = user?.id || 'admin-directeur';

    const supabase = getAdminClient();

    // 1. Mettre à jour le statut dans la table profiles
    if (supabase) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          statut_compte: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId);

      if (updateError) {
        console.warn('Erreur mise à jour profil:', updateError);
      }

      // 2. Consigner l'action dans audit_log
      try {
        const actionType =
          newStatus === 'actif'
            ? 'validation_utilisateur'
            : newStatus === 'suspendu'
            ? 'suspension_utilisateur'
            : 'mise_a_jour_statut';

        await supabase.from('audit_log').insert([
          {
            admin_id: adminId,
            admin_nom: adminNom,
            action: actionType,
            cible_id: targetUserId,
            cible_type: 'user',
            details: {
              cible_nom: targetUserNom || 'Producteur',
              nouveau_statut: newStatus,
              motif: reason || `Compte passé en ${newStatus}`,
              date: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (auditErr) {
        console.warn('Erreur insertion audit_log:', auditErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Statut de l'utilisateur mis à jour vers "${newStatus}".`,
      targetUserId,
      newStatus,
    });
  } catch (error: any) {
    console.error('Erreur PATCH /api/admin/users:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur mise à jour statut.' },
      { status: 500 }
    );
  }
}
