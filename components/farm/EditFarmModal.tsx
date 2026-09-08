'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  MapPin,
  Sprout,
  Droplets,
  Layers,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SENEGAL_REGIONS, CROPS_PRESETS } from '../../lib/constants/senegal';
import { Farm, Plot } from '../../lib/types';

interface EditFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: Farm | null;
  plot: Plot | null;
  onSuccess: (updatedFarm: Farm, updatedPlot: Plot) => void;
}

export default function EditFarmModal({
  isOpen,
  onClose,
  farm,
  plot,
  onSuccess,
}: EditFarmModalProps) {
  const [nomExploitation, setNomExploitation] = useState(farm?.nom || '');
  const [region, setRegion] = useState(farm?.region || 'Thiès');
  const [nomParcelle, setNomParcelle] = useState(plot?.nom || 'Parcelle Principale');
  const [culture, setCulture] = useState(plot?.culture || 'Oignon');
  const [isCustomCrop, setIsCustomCrop] = useState(false);
  const [customCropText, setCustomCropText] = useState('');
  const [surfaceHa, setSurfaceHa] = useState<string>(String(plot?.surface_ha || '1.0'));
  const [typeIrrigation, setTypeIrrigation] = useState(plot?.type_irrigation || 'goutte-a-goutte');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNomExploitation(farm?.nom || '');
      setRegion(farm?.region || 'Thiès');
      setNomParcelle(plot?.nom || 'Parcelle Principale');
      const curCulture = plot?.culture || 'Oignon';
      setCulture(curCulture);
      if (!Object.keys(CROPS_PRESETS).includes(curCulture)) {
        setIsCustomCrop(true);
        setCustomCropText(curCulture);
      } else {
        setIsCustomCrop(false);
        setCustomCropText('');
      }
      setSurfaceHa(String(plot?.surface_ha || '1.0'));
      setTypeIrrigation(plot?.type_irrigation || 'goutte-a-goutte');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, farm, plot]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nomExploitation.trim()) {
      setErrorMessage('Le nom de l\'exploitation est obligatoire.');
      return;
    }

    const numSurface = parseFloat(surfaceHa);
    if (isNaN(numSurface) || numSurface <= 0) {
      setErrorMessage('Veuillez indiquer une superficie valide supérieure à 0 ha.');
      return;
    }

    setLoading(true);

    try {
      const finalCulture = isCustomCrop && customCropText.trim() ? customCropText.trim() : culture;
      const res = await fetch('/api/farms/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: farm?.id,
          nomExploitation,
          region,
          nomParcelle,
          culture: finalCulture,
          surfaceHa: numSurface,
          typeIrrigation,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la mise à jour de l\'exploitation.');
      }

      setSuccessMessage('Fiche exploitation enregistrée avec succès !');
      onSuccess(data.farm, data.plot);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de sauvegarder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        {/* En-tête */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0C2B1E] dark:text-emerald-400">
                Modifier la Fiche Exploitation
              </h2>
              <p className="text-[11px] text-stone-500 font-medium">
                Mise à jour de votre périmètre et de vos parcelles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Nom exploitation */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Nom de l&apos;exploitation
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={nomExploitation}
                onChange={(e) => setNomExploitation(e.target.value)}
                placeholder="Ex: Domaine Maraîcher des Niayes"
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-[#0C2B1E]"
                required
              />
            </div>
          </div>

          {/* Région / Terroir */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Région / Terroir au Sénégal
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-[#0C2B1E]"
              >
                {SENEGAL_REGIONS.map((r) => (
                  <option key={r.nom} value={r.nom}>
                    {r.nom} — {r.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Culture et Superficie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Culture active
              </label>
              <div className="relative">
                <Sprout className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <select
                  value={isCustomCrop ? 'autre' : culture}
                  onChange={(e) => {
                    if (e.target.value === 'autre') {
                      setIsCustomCrop(true);
                    } else {
                      setIsCustomCrop(false);
                      setCulture(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-[#0C2B1E]"
                >
                  {Object.keys(CROPS_PRESETS).map((crop) => (
                    <option key={crop} value={crop} className="text-stone-900 dark:text-stone-100">
                      {crop}
                    </option>
                  ))}
                  <option value="autre" className="text-stone-900 dark:text-stone-100 font-bold">
                    + Autre (saisie libre)
                  </option>
                </select>
              </div>

              {isCustomCrop && (
                <div className="mt-2 animate-fade-in">
                  <input
                    type="text"
                    value={customCropText}
                    onChange={(e) => setCustomCropText(e.target.value)}
                    placeholder="Nom de la culture (ex: Pastèque, Niébé...)"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border-2 border-emerald-600 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 font-medium"
                    required
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Superficie (hectares)
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={surfaceHa}
                  onChange={(e) => setSurfaceHa(e.target.value)}
                  placeholder="1.0"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-[#0C2B1E]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Mode d'irrigation */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Système d&apos;irrigation
            </label>
            <div className="relative">
              <Droplets className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <select
                value={typeIrrigation}
                onChange={(e) => setTypeIrrigation(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-[#0C2B1E]"
              >
                <option value="goutte-a-goutte">Goutte-à-goutte (Haute efficience)</option>
                <option value="aspersion">Aspersion (Pluie artificielle)</option>
                <option value="submersion">Submersion / Gravitaire (Raies)</option>
                <option value="pluviale">Pluviale (Non irriguée)</option>
              </select>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#0C2B1E] hover:bg-[#154230] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#C8EF56]" /> : <Check className="w-4 h-4 text-[#C8EF56]" />}
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
