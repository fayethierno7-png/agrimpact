import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, supabase } from '../../../../lib/supabase/client';
import { getFarmAgrometeoSummary } from '../../../../lib/services/agrometeoService';
import { Farm, Plot } from '../../../../lib/types';
import { isValidId } from '../../../../lib/validation/apiValidators';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let farmId = searchParams.get('farmId') || searchParams.get('id');
    const userId = searchParams.get('userId');
    const forceRefresh = searchParams.get('forceRefresh') === 'true' || searchParams.get('forceRefresh') === '1';

    // Validation des identifiants
    if (farmId && !isValidId(farmId)) {
      return NextResponse.json(
        { success: false, error: "Format d'identifiant farmId invalide." },
        { status: 400 }
      );
    }
    if (userId && !isValidId(userId)) {
      return NextResponse.json(
        { success: false, error: "Format d'identifiant userId invalide." },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    // 1. Si pas de farmId, essayer de trouver la ferme par userId ou via la session Supabase
    if (!farmId && db) {
      if (userId) {
        const { data: userFarms } = await db
          .from('farms')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (userFarms && userFarms.length > 0) {
          farmId = userFarms[0].id;
        }
      } else if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const { data: userData } = await db.auth.getUser(token);
        if (userData?.user?.id) {
          const { data: userFarms } = await db
            .from('farms')
            .select('*')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (userFarms && userFarms.length > 0) {
            farmId = userFarms[0].id;
          }
        }
      }
    }

    if (!farmId) {
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant d'exploitation 'farmId' obligatoire. Exemple: /api/agrometeo/farm-summary?farmId=<UUID>",
        },
        { status: 400 }
      );
    }

    const summary = await getFarmAgrometeoSummary(farmId, {
      customClient: db,
      forceRefresh,
    });

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: `Exploitation '${farmId}' introuvable ou inaccessible.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campagne: 'Campagne Agricole 2026',
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API /api/agrometeo/farm-summary [GET]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur interne lors de la génération du bilan de l'exploitation.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { farmId, farm, plots, forceRefresh } = body;

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    const targetFarmId = farmId || farm?.id;

    if (!targetFarmId && !farm) {
      return NextResponse.json(
        {
          success: false,
          error: "Paramètre 'farmId' ou objet 'farm' requis dans le corps de la requête.",
        },
        { status: 400 }
      );
    }

    const summary = await getFarmAgrometeoSummary(targetFarmId || farm.id, {
      customClient: db,
      forceRefresh: Boolean(forceRefresh),
      fallbackFarm: farm as Farm,
      fallbackPlots: plots as Plot[],
    });

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: "Impossible de calculer le bilan agrométéorologique pour cette exploitation.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campagne: 'Campagne Agricole 2026',
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API /api/agrometeo/farm-summary [POST]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne lors du traitement du bilan prédictif.',
      },
      { status: 500 }
    );
  }
}
