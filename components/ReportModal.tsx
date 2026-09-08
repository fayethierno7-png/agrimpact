'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ReportType, UserReport } from '../lib/types';
import { REPORT_TYPE_LABELS, createReport } from '../lib/services/reportService';

const REPORT_TYPES: ReportType[] = [
  'recommandation_incorrecte',
  'donnee_meteo_incorrecte',
  'bug_technique',
  'autre',
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: (report: UserReport) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
}) => {
  const [type, setType] = useState<ReportType>('recommandation_incorrecte');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const charCount = description.trim().length;
  const isValid = charCount >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValid) {
      setErrorMsg('Veuillez décrire le problème avec au moins 10 caractères.');
      return;
    }

    setIsSubmitting(true);
    const res = await createReport({
      userId,
      type,
      description,
    });
    setIsSubmitting(false);

    if (res.success && res.report) {
      setDescription('');
      setType('recommandation_incorrecte');
      if (onSuccess) onSuccess(res.report);
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de l\'envoi du signalement.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 id="report-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                Signaler un problème
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Aidez-nous à améliorer la précision des conseils et de la météo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* 1. Sélection du type */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Type d&apos;anomalie
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REPORT_TYPES.map((key) => {
                const info = REPORT_TYPE_LABELS[key];
                const selected = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      selected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{info.icon}</span>
                      {selected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{info.label}</div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                        {info.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Champ description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="report-desc"
                className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider"
              >
                Description du problème *
              </label>
              <span
                className={`text-[11px] font-mono ${
                  isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'
                }`}
              >
                {charCount} / 10 caractères min
              </span>
            </div>

            <textarea
              id="report-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expliquez ce qui s'est passé (ex: 'La pluie annoncée de 15 mm hier soir à Thiès ne s'est pas produite', ou 'Le conseil de traitement du mildiou est arrivé trop tard...')"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors placeholder:text-stone-400"
              required
            />
          </div>

          {/* Reassurance */}
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Votre retour est directement transmis à l&apos;équipe agronomique AGRIMPACT pour examen et recalibrage.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer le signalement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
