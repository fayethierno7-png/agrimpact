import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, supabase } from '../../../../../lib/supabase/client';
import { getFarmAgrometeoSummary } from '../../../../../lib/services/agrometeoService';
import { isValidId } from '../../../../../lib/validation/apiValidators';

type RouteContext = {
  params: Promise<{ farmId: string }> | { farmId: string };
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const farmId = resolvedParams.farmId;

    if (!farmId || !isValidId(farmId)) {
      return NextResponse.json(
        { success: false, error: "Paramètre d'URL 'farmId' obligatoire et valide." },
        { status: 400 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get('forceRefresh') === 'true' || searchParams.get('forceRefresh') === '1';

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    const summary = await getFarmAgrometeoSummary(farmId, {
      customClient: db,
      forceRefresh,
    });

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: `Exploitation '${farmId}' introuvable ou aucune parcelle enregistrée.`,
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
    console.error('Erreur API /api/farms/[farmId]/predictions [GET]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur interne lors de la récupération des prédictions de l'exploitation.",
      },
      { status: 500 }
    );
  }
}
