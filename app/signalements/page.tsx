'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Flag,
  Plus,
  Clock,
  CheckCircle2,
  Hourglass,
  MessageSquare,
  Sparkles,
  Loader2,
  ChevronRight,
  Filter,
  ArrowLeft,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { ReportModal } from '../../components/ReportModal';
import { Toast, ToastMessage } from '../../components/Toast';
import { useAgri } from '../../lib/context/AgriContext';
import { UserReport, ReportStatus } from '../../lib/types';
import {
  getUserReports,
  REPORT_TYPE_LABELS,
  REPORT_STATUS_LABELS,
} from '../../lib/services/reportService';

export default function SignalementsPage() {
  const router = useRouter();
  const { profile, isLoading: isAuthLoading } = useAgri();

  const [reports, setReports] = useState<UserReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Redirection si explicitement non connecté
  useEffect(() => {
    if (!isAuthLoading && !profile) {
      const isExplicitlyLoggedOut = typeof window !== 'undefined' && localStorage.getItem('agrimpact_logged_out') === 'true';
      if (isExplicitlyLoggedOut) {
        router.push('/login?redirect=/signalements');
      }
    }
  }, [isAuthLoading, profile, router]);

  // Chargement des signalements
  const loadReports = async () => {
    if (!profile?.user_id) return;
    const res = await getUserReports(profile.user_id);
    if (res.success) {
      setReports(res.reports);
    }
    setIsLoadingReports(false);
  };

  useEffect(() => {
    if (profile?.user_id) {
      loadReports();
    }
  }, [profile?.user_id]);

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.statut === filterStatus;
  });

  const countNouveau = reports.filter((r) => r.statut === 'nouveau').length;
  const countEnCours = reports.filter((r) => r.statut === 'en_cours').length;
  const countResolu = reports.filter((r) => r.statut === 'resolu').length;

  if (isAuthLoading || (!profile && isAuthLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium">Chargement de vos signalements...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="En ligne" title="Mes Signalements" />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12 space-y-6">
        {/* En-tête avec bouton Nouveau */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Retour au tableau de bord"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Mes Signalements
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 pl-6">
              Suivez l&apos;état de traitement des anomalies météo ou des conseils rapportés par votre exploitation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau signalement</span>
          </button>
        </div>

        {/* Barre de Filtres par statut */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              filterStatus === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            Tous ({reports.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('nouveau')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'nouveau'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Nouveaux ({countNouveau})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('en_cours')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'en_cours'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <Hourglass className="w-3.5 h-3.5 text-amber-500" />
            <span>En cours ({countEnCours})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('resolu')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'resolu'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Résolus ({countResolu})</span>
          </button>
        </div>

        {/* Liste des signalements ou état vide */}
        {isLoadingReports ? (
          <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2" />
            <span className="text-xs text-stone-500 dark:text-stone-400">Chargement de la liste...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 sm:p-14 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {filterStatus === 'all'
                  ? 'Aucun signalement enregistré'
                  : 'Aucun signalement dans cette catégorie'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {filterStatus === 'all'
                  ? 'Si vous observez un décalage météo, une recommandation douteuse ou un problème technique, signalez-le pour aider nos agronomes.'
                  : 'Changez de filtre pour afficher vos autres signalements.'}
              </p>
            </div>
            {filterStatus === 'all' && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer un signalement</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const typeInfo = REPORT_TYPE_LABELS[report.type] || {
                label: report.type,
                icon: '📌',
                desc: '',
              };
              const statusInfo = REPORT_STATUS_LABELS[report.statut] || {
                label: report.statut,
                badgeClass: 'bg-stone-100 text-stone-800',
                description: '',
              };

              const formattedDate = new Date(report.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={report.id}
                  className="p-5 sm:p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
                >
                  {/* Top Bar : Type & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {typeInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400 font-mono">
                        {formattedDate}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Description de l'exploitant */}
                  <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed bg-stone-50/60 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
                    {report.description}
                  </div>

                  {/* Réponse de l'agronome / Note admin */}
                  {report.admin_note && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Réponse de l&apos;équipe AGRIMPACT</span>
                        </div>
                        {report.resolved_at && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                            Résolu le{' '}
                            {new Date(report.resolved_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-emerald-950 dark:text-emerald-100 leading-relaxed">
                        {report.admin_note}
                      </p>
                    </div>
                  )}

                  {!report.admin_note && report.statut !== 'resolu' && (
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 italic">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{statusInfo.description}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Signalement */}
      {profile && (
        <ReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={profile.user_id}
          onSuccess={(newReport) => {
            setReports((prev) => [newReport, ...prev]);
            setToast({
              id: `${Date.now()}`,
              type: 'success',
              title: 'Signalement envoyé',
              message: 'Votre signalement a été enregistré avec succès.',
            });
          }}
        />
      )}

      {/* Toast Feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      <BottomNav />
    </div>
  );
}
