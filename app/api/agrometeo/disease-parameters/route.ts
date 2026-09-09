import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, supabase } from '../../../../lib/supabase/client';
import { getCropDiseaseParameter } from '../../../../lib/services/agrometeoService';
import { DEFAULT_DISEASE_PARAMETERS } from '../../../../lib/engine/agrometeoPredictionEngine';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const culture = searchParams.get('culture');

    const authHeader = req.headers.get('authorization');
    const db = getSupabaseServerClient(authHeader) || supabase;

    if (culture) {
      const cleanCulture = culture.trim();
      if (cleanCulture.length > 50 || !/^[a-zA-Z0-9\u00C0-\u017F\s\-_]+$/.test(cleanCulture)) {
        return NextResponse.json(
          { success: false, error: 'Nom de culture invalide (max 50 caractères alphanumériques).' },
          { status: 400 }
        );
      }

      const parameter = await getCropDiseaseParameter(cleanCulture, db);
      return NextResponse.json({
        success: true,
        culture: cleanCulture,
        parameter,
      });
    }

    // Récupération de tous les paramètres
    let parameters = Object.values(DEFAULT_DISEASE_PARAMETERS);

    if (db) {
      try {
        const { data, error } = await db
          .from('agrometeo_disease_parameters')
          .select('*')
          .order('culture', { ascending: true });

        if (!error && data && data.length > 0) {
          parameters = data.map((d: any) => ({
            id: d.id,
            culture: d.culture,
            maladie_principale: d.maladie_principale,
            pathogene_scientifique: d.pathogene_scientifique,
            temp_min: Number(d.temp_min),
            temp_opt_basse: Number(d.temp_opt_basse),
            temp_opt_haute: Number(d.temp_opt_haute),
            temp_max: Number(d.temp_max),
            humidite_seuil_infection: Number(d.humidite_seuil_infection),
            humidite_optimale: Number(d.humidite_optimale),
            pluie_declenchement_mm: Number(d.pluie_declenchement_mm),
            sensibilite_culture: Number(d.sensibilite_culture),
            rendement_nominal_kg_ha: Number(d.rendement_nominal_kg_ha),
            prix_indicatif_cfa_kg: Number(d.prix_indicatif_cfa_kg),
            description_symptomes: d.description_symptomes,
            methodes_lutte: d.methodes_lutte,
          }));
        }
      } catch (dbErr) {
        console.warn('Erreur lecture paramètres maladie Supabase:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      total: parameters.length,
      parameters,
    });
  } catch (error: any) {
    console.error('Erreur API /api/agrometeo/disease-parameters [GET]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne lors de la récupération des paramètres épidémiologiques.',
      },
      { status: 500 }
    );
  }
}
