import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { SENEGAL_REGIONS } from '../../../../lib/constants/senegal';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Vous devez être connecté pour modifier votre exploitation.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      farmId,
      nomExploitation,
      region,
      nomParcelle,
      culture,
      surfaceHa,
      typeIrrigation,
    } = body;

    // Validation des champs
    if (!nomExploitation || !nomExploitation.trim()) {
      return NextResponse.json(
        { success: false, error: 'Le nom de l\'exploitation est requis.' },
        { status: 400 }
      );
    }

    const numericSurface = Number(surfaceHa);
    if (isNaN(numericSurface) || numericSurface <= 0) {
      return NextResponse.json(
        { success: false, error: 'La superficie doit être un nombre positif (ex: 2.5).' },
        { status: 400 }
      );
    }

    // Trouver les coordonnées de la région sélectionnée
    const matchedRegion = SENEGAL_REGIONS.find(
      (r) => r.nom.toLowerCase() === (region || '').toLowerCase()
    ) || SENEGAL_REGIONS[0];

    let updatedFarm = {
      id: farmId || 'farm-' + user.id.slice(0, 8),
      user_id: user.id,
      nom: nomExploitation.trim(),
      region: matchedRegion.nom,
      latitude: matchedRegion.latitude,
      longitude: matchedRegion.longitude,
      created_at: new Date().toISOString(),
    };

    let updatedPlot = {
      id: 'plot-' + user.id.slice(0, 8),
      farm_id: updatedFarm.id,
      nom: nomParcelle?.trim() || 'Parcelle Principale',
      culture: culture || 'Oignon',
      surface_ha: numericSurface,
      type_irrigation: typeIrrigation || 'goutte-a-goutte',
      date_semis: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      // 1. Mettre à jour ou insérer la ferme dans Supabase
      if (farmId) {
        const { data: existingFarm, error: checkErr } = await supabase
          .from('farms')
          .select('id, user_id')
          .eq('id', farmId)
          .maybeSingle();

        if (existingFarm && existingFarm.user_id !== user.id && user.role !== 'admin') {
          return NextResponse.json(
            { success: false, error: 'Accès refusé : vous n\'êtes pas propriétaire de cette exploitation.' },
            { status: 403 }
          );
        }

        const { data: farmDb, error: farmErr } = await supabase
          .from('farms')
          .update({
            nom: nomExploitation.trim(),
            region: matchedRegion.nom,
            latitude: matchedRegion.latitude,
            longitude: matchedRegion.longitude,
          })
          .eq('id', farmId)
          .select()
          .single();

        if (farmErr) {
          console.error('Erreur update farm Supabase:', farmErr);
        } else if (farmDb) {
          updatedFarm = farmDb;
        }
      } else {
        const { data: newFarmDb, error: newFarmErr } = await supabase
          .from('farms')
          .insert({
            user_id: user.id,
            nom: nomExploitation.trim(),
            region: matchedRegion.nom,
            latitude: matchedRegion.latitude,
            longitude: matchedRegion.longitude,
          })
          .select()
          .single();

        if (!newFarmErr && newFarmDb) {
          updatedFarm = newFarmDb;
        }
      }

      // 2. Mettre à jour ou créer la parcelle associée
      const { data: existingPlots } = await supabase
        .from('plots')
        .select('*')
        .eq('farm_id', updatedFarm.id)
        .limit(1);

      if (existingPlots && existingPlots.length > 0) {
        const { data: plotDb } = await supabase
          .from('plots')
          .update({
            nom: nomParcelle?.trim() || existingPlots[0].nom,
            culture: culture || existingPlots[0].culture,
            surface_ha: numericSurface,
            type_irrigation: typeIrrigation || existingPlots[0].type_irrigation,
          })
          .eq('id', existingPlots[0].id)
          .select()
          .single();

        if (plotDb) {
          updatedPlot = plotDb;
        }
      } else {
        const { data: newPlotDb } = await supabase
          .from('plots')
          .insert({
            farm_id: updatedFarm.id,
            nom: nomParcelle?.trim() || 'Parcelle Principale',
            culture: culture || 'Oignon',
            surface_ha: numericSurface,
            type_irrigation: typeIrrigation || 'goutte-a-goutte',
            date_semis: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (newPlotDb) {
          updatedPlot = newPlotDb;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Exploitation et parcelle mises à jour avec succès.',
      farm: updatedFarm,
      plot: updatedPlot,
    });
  } catch (error: any) {
    console.error('Erreur API Update Farm:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la sauvegarde.' },
      { status: 500 }
    );
  }
}
