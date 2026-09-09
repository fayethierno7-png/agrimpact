import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, supabase } from '../../../../lib/supabase/client';
import {
  getOrGeneratePlotAgrometeoPrediction,
  getCropDiseaseParameter,
  buildPlotPredictionSummary,
} from '../../../../lib/services/agrometeoService';
import { Plot } from '../../../../lib/types';
import { isValidId, sanitizeCoordinates } from '../../../../lib/validation/apiValidators';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const plotId = searchParams.get('plotId') || searchParams.get('id');
    const forceRefresh = searchParams.get('forceRefresh') === 'true' || searchParams.get('forceRefresh') === '1';
    const latParam = searchParams.get('lat') || searchParams.get('latitude');
    const lonParam = searchParams.get('lon') || searchParams.get('longitude');

    if (!plotId || !isValidId(plotId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Paramètre 'plotId' obligatoire et valide. Exemple: /api/agrometeo/predictions?plotId=<UUID>",
        },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    // Récupération de la parcelle et de sa ferme associée dans Supabase
    let plot: Plot | null = null;
    const coords = sanitizeCoordinates(latParam, lonParam);
    let latitude = coords.latitude;
    let longitude = coords.longitude;

    if (db) {
      const { data: plotData, error: plotErr } = await db
        .from('plots')
        .select('*, farms(latitude, longitude, region, nom)')
        .eq('id', plotId)
        .maybeSingle();

      if (!plotErr && plotData) {
        plot = {
          id: plotData.id,
          farm_id: plotData.farm_id,
          nom: plotData.nom,
          culture: plotData.culture,
          surface_ha: Number(plotData.surface_ha) || 1.0,
          date_semis: plotData.date_semis,
          type_irrigation: plotData.type_irrigation,
          variete: plotData.variete,
          created_at: plotData.created_at,
        };

        if (plotData.farms && !latParam) {
          latitude = Number(plotData.farms.latitude) || latitude;
          longitude = Number(plotData.farms.longitude) || longitude;
        }
      }
    }

    if (!plot) {
      return NextResponse.json(
        {
          success: false,
          error: `Parcelle '${plotId}' introuvable dans la base de données.`,
          solution: "Vérifiez l'identifiant de la parcelle ou transmettez l'objet parcelle via POST.",
        },
        { status: 404 }
      );
    }

    const cropParam = await getCropDiseaseParameter(plot.culture, db);
    const prediction = await getOrGeneratePlotAgrometeoPrediction(
      plot,
      latitude,
      longitude,
      forceRefresh,
      db
    );

    const summary = buildPlotPredictionSummary(plot, prediction, cropParam);

    return NextResponse.json({
      success: true,
      campagne: 'Campagne Agricole 2026',
      plot,
      prediction,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API /api/agrometeo/predictions [GET]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne lors de la projection agrométéorologique.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plotId, plot, latitude, longitude, forceRefresh } = body;

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    let targetPlot: Plot | null = plot || null;
    let lat = typeof latitude === 'number' ? latitude : 14.7910;
    let lon = typeof longitude === 'number' ? longitude : -16.9256;

    if (!targetPlot && plotId && db) {
      const { data: plotData, error: plotErr } = await db
        .from('plots')
        .select('*, farms(latitude, longitude, region, nom)')
        .eq('id', plotId)
        .maybeSingle();

      if (!plotErr && plotData) {
        targetPlot = {
          id: plotData.id,
          farm_id: plotData.farm_id,
          nom: plotData.nom,
          culture: plotData.culture,
          surface_ha: Number(plotData.surface_ha) || 1.0,
          date_semis: plotData.date_semis,
          type_irrigation: plotData.type_irrigation,
          variete: plotData.variete,
          created_at: plotData.created_at,
        };

        if (plotData.farms && latitude === undefined) {
          lat = Number(plotData.farms.latitude) || lat;
          lon = Number(plotData.farms.longitude) || lon;
        }
      }
    }

    if (!targetPlot) {
      return NextResponse.json(
        {
          success: false,
          error: "Données de parcelle manquantes. Fournissez 'plot' ou un 'plotId' valide.",
        },
        { status: 400 }
      );
    }

    // Validation des champs obligatoires
    if (!targetPlot.culture || !targetPlot.surface_ha) {
      return NextResponse.json(
        {
          success: false,
          error: "Champs de parcelle obligatoires manquants: 'culture' et 'surface_ha'.",
        },
        { status: 400 }
      );
    }

    // Assignation d'un ID temporaire si non fourni
    if (!targetPlot.id) {
      targetPlot.id = `plot-${Date.now()}`;
    }
    if (!targetPlot.date_semis) {
      targetPlot.date_semis = '2026-07-15'; // Date médiane de la Campagne Agricole 2026
    }
    if (!targetPlot.type_irrigation) {
      targetPlot.type_irrigation = 'goutte-a-goutte';
    }

    const cropParam = await getCropDiseaseParameter(targetPlot.culture, db);
    const prediction = await getOrGeneratePlotAgrometeoPrediction(
      targetPlot,
      lat,
      lon,
      Boolean(forceRefresh),
      db
    );

    const summary = buildPlotPredictionSummary(targetPlot, prediction, cropParam);

    return NextResponse.json({
      success: true,
      campagne: 'Campagne Agricole 2026',
      plot: targetPlot,
      prediction,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erreur API /api/agrometeo/predictions [POST]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne lors du traitement de la requête de prédiction.',
      },
      { status: 500 }
    );
  }
}
