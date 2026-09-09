'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  Filter,
  ShieldCheck,
  RotateCcw,
  Flag,
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
  ChevronRight,
  Loader2,
  Lock,
  Home,
} from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';
import {
  PeriodFilter,
  computePeriodDates,
} from '../../components/admin/PeriodFilter';
import { Toast, ToastMessage } from '../../components/Toast';
import {
  PeriodFilterValue,
  AccountStatus,
  ReportStatus,
  UserReport,
  AuditLogEntry,
  PaymentData,
  SubscriptionData,
  RevenueMetrics,
  FunnelStep,
} from '../../lib/types';
import {
  getAdminUsers,
  updateUserAccountStatus,
  getRevenueMetrics,
  getConversionFunnel,
  getAuditLogs,
  getAdminPayments,
  getAdminSubscriptions,
  processPaymentRefund,
  getAdminReports,
  updateAdminReport,
  AdminUserListItem,
} from '../../lib/services/adminService';
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from '../../lib/services/reportService';

type AdminTab = 'users' | 'revenue' | 'funnel' | 'audit' | 'refunds' | 'reports' | 'settings';

export default function AdminConsolePage() {
  const router = useRouter();
  const { profile, isLoading: isAuthLoading } = useAgri();

  // Onglet actif
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // État des coordonnées de contact administrables (Point 14)
  const [contactSettings, setContactSettings] = useState({
    support_phone: '+221 33 800 12 12',
    support_phone_visible: true,
    contact_email: 'contact@agrimpact.sn',
    contact_email_visible: true,
    whatsapp_link: 'https://wa.me/221771234567',
    whatsapp_visible: true,
    social_link: 'https://facebook.com/agrimpact',
    social_visible: true,
    global_visible: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Filtre de période global réutilisable
  const [period, setPeriod] = useState<PeriodFilterValue>(() => computePeriodDates('30d'));

  // États de chargement et données
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);

  // Filtres spécifiques aux modules
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  // Modals d'actions
  const [refundModal, setRefundModal] = useState<{ open: boolean; payment: PaymentData | null; reason: string }>({
    open: false,
    payment: null,
    reason: '',
  });
  const [reportModal, setReportModal] = useState<{
    open: boolean;
    report: UserReport | null;
    newStatus: ReportStatus;
    note: string;
  }>({
    open: false,
    report: null,
    newStatus: 'resolu',
    note: '',
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      title,
    });
  };

  const currentAdminId = profile?.user_id || 'adm-directeur';
  const currentAdminNom = profile?.nom || 'Administrateur Principal';

  // Chargement des données selon l'onglet et la période
  const loadModuleData = async (forceSpinner = false) => {
    const hasData =
      (activeTab === 'users' && users.length > 0) ||
      (activeTab === 'revenue' && revenue !== null) ||
      (activeTab === 'funnel' && funnel.length > 0) ||
      (activeTab === 'audit' && auditLogs.length > 0) ||
      (activeTab === 'refunds' && payments.length > 0) ||
      (activeTab === 'reports' && reports.length > 0);

    if (!hasData || forceSpinner) {
      setIsLoadingData(true);
    }
    try {
      if (activeTab === 'users') {
        const data = await getAdminUsers(period);
        setUsers(data);
      } else if (activeTab === 'revenue') {
        const metrics = await getRevenueMetrics(period);
        setRevenue(metrics);
      } else if (activeTab === 'funnel') {
        const steps = await getConversionFunnel(period);
        setFunnel(steps);
      } else if (activeTab === 'audit') {
        const logs = await getAuditLogs({
          period,
          actionFilter: auditActionFilter,
          search: auditSearch,
        });
        setAuditLogs(logs);
      } else if (activeTab === 'refunds') {
        const pays = await getAdminPayments(period);
        setPayments(pays);
      } else if (activeTab === 'reports') {
        const reps = await getAdminReports(period);
        setReports(reps);
      }
    } catch (err) {
      console.error('Erreur chargement données admin:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [activeTab, period, auditActionFilter]);

  // Action : Valider / Suspendre utilisateur
  const handleUserStatusChange = async (targetUser: AdminUserListItem, newStatus: AccountStatus) => {
    const res = await updateUserAccountStatus({
      adminId: currentAdminId,
      adminNom: currentAdminNom,
      targetUserId: targetUser.user_id,
      targetUserNom: targetUser.nom,
      newStatus,
      reason: newStatus === 'actif' ? 'Compte vérifié et activé' : 'Suspendu par décision administrative',
    });

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, statut_compte: newStatus } : u))
      );
      showToast(
        'success',
        `Le compte de ${targetUser.nom} est désormais ${newStatus === 'actif' ? 'activé' : 'suspendu'}. Action enregistrée dans l'audit log.`,
        'Statut mis à jour'
      );
    } else {
      showToast('error', res.error || 'Erreur de mise à jour.');
    }
  };

  // Action : Rembourser paiement
  const handleConfirmRefund = async () => {
    if (!refundModal.payment) return;
    const p = refundModal.payment;

    const res = await processPaymentRefund({
      adminId: currentAdminId,
      adminNom: currentAdminNom,
      paymentId: p.id,
      montant: p.montant,
      subscriptionId: p.subscription_id,
      targetUserNom: p.user_nom,
      reason: refundModal.reason,
    });

    if (res.success) {
      setPayments((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? { ...item, statut: 'rembourse', remboursement_montant: p.montant, remboursement_date: new Date().toISOString() }
            : item
        )
      );
      setRefundModal({ open: false, payment: null, reason: '' });
      showToast(
        'success',
        `Paiement de ${p.montant.toLocaleString()} FCFA remboursé pour ${p.user_nom || 'le client'}. Abonnement associé résilié.`,
        'Remboursement validé'
      );
    } else {
      showToast('error', res.error || 'Impossible d\'effectuer le remboursement.');
    }
  };

  // Action : Traiter signalement admin
  const handleConfirmReportUpdate = async () => {
    if (!reportModal.report) return;
    const rep = reportModal.report;

    const res = await updateAdminReport({
      adminId: currentAdminId,
      adminNom: currentAdminNom,
      reportId: rep.id,
      newStatus: reportModal.newStatus,
      adminNote: reportModal.note,
    });

    if (res.success) {
      setReports((prev) =>
        prev.map((item) =>
          item.id === rep.id
            ? {
                ...item,
                statut: reportModal.newStatus,
                admin_note: reportModal.note,
                resolved_at: reportModal.newStatus === 'resolu' ? new Date().toISOString() : item.resolved_at,
              }
            : item
        )
      );
      setReportModal({ open: false, report: null, newStatus: 'resolu', note: '' });
      showToast(
        'success',
        `Signalement mis à jour avec le statut "${reportModal.newStatus}". Note d'explication envoyée au producteur.`,
        'Signalement traité'
      );
    } else {
      showToast('error', res.error || 'Erreur lors du traitement du signalement.');
    }
  };

  // Chargement des coordonnées de contact (Point 14)
  useEffect(() => {
    fetch('/api/settings/contact')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json.settings) {
          setContactSettings(json.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactSettings),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          'Coordonnées de contact mises à jour et répercutées immédiatement sur le site.',
          'Paramètres enregistrés'
        );
      } else {
        showToast('error', data.error || 'Erreur lors de la sauvegarde des paramètres.');
      }
    } catch {
      showToast('error', 'Erreur réseau lors de la mise à jour.');
    } finally {
      setSavingSettings(false);
    }
  };

  const navTabs: { key: AdminTab; label: string; icon: any; countBadge?: number }[] = [
    { key: 'users', label: '1. Utilisateurs', icon: Users },
    { key: 'revenue', label: '2. Revenus (MRR/ARR)', icon: TrendingUp },
    { key: 'funnel', label: '3. Funnel Conversion', icon: Filter },
    { key: 'audit', label: '4. Audit Log', icon: ShieldCheck },
    { key: 'refunds', label: '5. Remboursements', icon: RotateCcw },
    { key: 'reports', label: '6. Signalements', icon: Flag },
    { key: 'settings', label: '7. Coordonnées Contact', icon: Sliders },
  ];

  // Garde RBAC client-side stricte (Point 9)
  useEffect(() => {
    if (!isAuthLoading) {
      if (!profile) {
        router.replace('/login?redirect=/admin');
      } else if (profile.role !== 'superadmin') {
        router.replace('/dashboard');
      }
    }
  }, [profile, isAuthLoading, router]);

  if (isAuthLoading || !profile || profile.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border border-purple-500/30 text-purple-300 flex items-center justify-center mb-4 shadow-xl">
          <Lock className="w-7 h-7 animate-pulse text-purple-400" />
        </div>
        <h2 className="text-base sm:text-lg font-bold">Vérification des droits d&apos;administration...</h2>
        <p className="text-xs text-stone-400 mt-1 max-w-sm">
          Redirection immédiate si votre compte ne dispose pas des privilèges administrateur certifiés.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-stone-100 dark:bg-stone-950 min-h-screen text-stone-900 dark:text-stone-100">
      {/* Top Header Admin */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Retourner à la page d'accueil (Landing page)"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>

            <Link
              href="/dashboard"
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Quitter la console et retourner au tableau de bord"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour App</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-sm sm:text-base">
                    CONSOLE ADMIN
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/40">
                    Directeur
                  </span>
                </div>
                <div className="text-[10px] text-stone-400">
                  AGRIMPACT • Gestion centralisée et gouvernance
                </div>
              </div>
            </div>
          </div>

          {/* Filtre de Période Réutilisable Global */}
          <div className="flex items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>
      </header>

      {/* Barre de navigation des modules (Tabs) */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-[57px] z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2 text-xs font-bold scrollbar-none">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Titre & Sous-titre de la section active */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              {activeTab === 'users' && '1. Validation & Contrôle des Utilisateurs'}
              {activeTab === 'revenue' && '2. Métriques Financières & Revenus Récurrents'}
              {activeTab === 'funnel' && '3. Entonnoir de Conversion des Producteurs'}
              {activeTab === 'audit' && '4. Journal d\'Audit & Sécurité'}
              {activeTab === 'refunds' && '5. Gestion des Remboursements'}
              {activeTab === 'reports' && '6. Traitement des Signalements Utilisateurs'}
              {activeTab === 'settings' && '7. Paramètres & Coordonnées de Contact Administrables'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Période sélectionnée : <span className="font-semibold text-emerald-700 dark:text-emerald-400">{period.label}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadModuleData(true)}
            disabled={isLoadingData}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION 1 : VALIDATION DES UTILISATEURS                       */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  {users.length} producteur(s) répertorié(s)
                </span>
                <span className="text-[11px] text-stone-400">
                  Toute action de validation ou suspension est tracée dans l&apos;audit log.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 uppercase tracking-wider text-[10px] font-bold border-b border-stone-100 dark:border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Producteur</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Exploitation</th>
                      <th className="py-3 px-4">Forfait</th>
                      <th className="py-3 px-4">Statut Compte</th>
                      <th className="py-3 px-4">Date création</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400 font-sans">
                          Aucun compte utilisateur enregistré dans la base de données pour le moment.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                      const isActif = u.statut_compte === 'actif';
                      const isSuspendu = u.statut_compte === 'suspendu';
                      const isAttente = u.statut_compte === 'en_attente';

                      return (
                        <tr key={u.user_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-900 dark:text-stone-100">{u.nom}</div>
                            <div className="text-[10px] text-stone-400 font-mono">ID: {u.user_id.slice(0, 8)}...</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-700 dark:text-stone-300">
                            {u.telephone_contact || 'Non renseigné'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-stone-800 dark:text-stone-200">{u.farm_nom || 'Non configurée'}</div>
                            <div className="text-[10px] text-stone-500">Région {u.region || 'Sénégal'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {u.plan}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                                isActif
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isSuspendu
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {isActif && <CheckCircle2 className="w-3 h-3" />}
                              {isSuspendu && <XCircle className="w-3 h-3" />}
                              {isAttente && <Clock className="w-3 h-3" />}
                              <span>{u.statut_compte || 'actif'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                            {new Date(u.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {u.statut_compte === 'en_attente' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUserStatusChange(u, 'actif')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                  title="Valider et activer l'accès au SaaS"
                                >
                                  Valider
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUserStatusChange(u, 'suspendu')}
                                  className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Refuser ce compte"
                                >
                                  Refuser
                                </button>
                              </>
                            )}

                            {u.statut_compte === 'actif' && (
                              <button
                                type="button"
                                onClick={() => handleUserStatusChange(u, 'suspendu')}
                                className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Suspendre
                              </button>
                            )}

                            {u.statut_compte === 'suspendu' && (
                              <button
                                type="button"
                                onClick={() => handleUserStatusChange(u, 'actif')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Réactiver
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 2 : REVENUS (MRR, ARR, CHURN, LTV, GRAPHIQUE)         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'revenue' && revenue && (
          <div className="space-y-6 animate-fade-in">
            {/* 4 Cartes Métriques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Carte 1 : MRR */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">MRR</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {revenue.mrr.toLocaleString()} <span className="text-sm font-semibold text-stone-500">FCFA</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Revenu Mensuel Récurrent ({revenue.activeSubscriptionsCount} abonnements actifs)
                  </div>
                </div>
              </div>

              {/* Carte 2 : ARR */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">ARR</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                    {revenue.arr.toLocaleString()} <span className="text-sm font-semibold text-stone-500">FCFA</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Revenu Annuel Projeté (MRR × 12)
                  </div>
                </div>
              </div>

              {/* Carte 3 : Churn */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Taux de Churn</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                    {revenue.churnRate}%
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Abonnements résiliés sur la période
                  </div>
                </div>
              </div>

              {/* Carte 4 : LTV */}
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">LTV (Valeur Client)</span>
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                    {revenue.ltv.toLocaleString()} <span className="text-sm font-semibold text-stone-500">FCFA</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    Revenu moyen généré par client sur sa durée de vie
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique d'évolution dans le temps */}
            <div className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                    Évolution des Encaissements
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Total période : <span className="font-bold text-emerald-800 dark:text-emerald-400">{revenue.totalRevenuePeriod.toLocaleString()} FCFA</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span>Paiements Wave & Orange Money</span>
                </div>
              </div>

              {/* Bar Chart Stylisé SVG */}
              <div className="pt-4 pb-2">
                <div className="h-56 flex items-end gap-2 sm:gap-4 px-2 border-b border-stone-200 dark:border-stone-800">
                  {revenue.chartData.map((item, idx) => {
                    const max = Math.max(...revenue.chartData.map((d) => d.amount), 30000);
                    const heightPct = Math.max(Math.round((item.amount / max) * 100), 12);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] font-mono text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.amount.toLocaleString()} F
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[48px] bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-t-xl transition-all relative shadow-2xs"
                        />
                        <span className="text-[10px] text-stone-500 font-semibold truncate">
                          {item.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 3 : FUNNEL DE CONVERSION (4 ÉTAPES)                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'funnel' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Entonnoir d&apos;Activation & Conversion Producteurs
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Calculé à partir des événements horodatés de la table <code className="text-emerald-700">events</code>.
                </p>
              </div>

              {/* Étapes du Funnel */}
              <div className="space-y-4">
                {funnel.map((step, idx) => {
                  return (
                    <div
                      key={step.key}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                            {step.title}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">
                            {step.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                              {step.count.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-stone-400 uppercase font-semibold">
                              Producteurs
                            </div>
                          </div>

                          <div className="pl-4 border-l border-stone-200 dark:border-stone-700">
                            <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                              {step.conversionFromFirst}%
                            </div>
                            <div className="text-[10px] text-stone-400">
                              du total initial
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Barre visuelle du funnel */}
                      <div className="w-full h-3 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${step.conversionFromFirst}%` }}
                        />
                      </div>

                      {/* Taux de passage depuis l'étape précédente */}
                      {idx > 0 && (
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                            👉 Taux de passage étape : <span className="font-bold">{step.conversionFromPrevious}%</span>
                          </span>
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            Déperdition (Drop-off) : -{step.dropoffRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bilan de conversion global */}
              {funnel.length >= 4 && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-black">
                      🎯
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Conversion Globale (Inscription ➔ Abonnement Payant)
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Mesure le taux de monétisation réel de la plateforme sur le terroir sénégalais.
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                    {funnel[3].conversionFromFirst}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 4 : AUDIT LOG (TABLE RECHERCHE & FILTRES)             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            {/* Barre de Recherche et Filtres */}
            <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Recherche par admin, action, cible..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-stone-500 font-semibold">Action :</span>
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="all">Toutes les actions</option>
                  <option value="valider_utilisateur">Validation compte</option>
                  <option value="suspendre_utilisateur">Suspension compte</option>
                  <option value="rembourser_paiement">Remboursement</option>
                  <option value="traiter_signalement">Traitement signalement</option>
                </select>
              </div>
            </div>

            {/* Table des Logs */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 uppercase tracking-wider text-[10px] font-bold border-b border-stone-100 dark:border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Date & Heure</th>
                      <th className="py-3 px-4">Administrateur</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Cible</th>
                      <th className="py-3 px-4">Détails / Métadonnées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono text-[11px]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-400 font-sans">
                          Aucun enregistrement d&apos;audit pour cette période.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-4 text-stone-500">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 font-sans font-bold text-stone-900 dark:text-stone-100">
                            {log.admin_nom}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                            <span className="text-stone-400">{log.cible_type}:</span> {log.cible_id.slice(0, 10)}...
                          </td>
                          <td className="py-3 px-4 text-stone-500 font-sans text-xs">
                            {log.metadata ? JSON.stringify(log.metadata) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 5 : REMBOURSEMENTS                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'refunds' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Transactions & Paiements enregistrés
                </span>
                <span className="text-[11px] text-stone-400">
                  Tout remboursement annule l&apos;abonnement associé et écrit dans l&apos;audit log.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 uppercase tracking-wider text-[10px] font-bold border-b border-stone-100 dark:border-stone-800">
                    <tr>
                      <th className="py-3 px-4">ID Transaction</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Montant</th>
                      <th className="py-3 px-4">Méthode</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-400 font-sans">
                          Aucune transaction financière enregistrée pour cette période.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => {
                        const isReussi = p.statut === 'reussi';
                        const isRembourse = p.statut === 'rembourse';
                        const isEchoue = p.statut === 'echoue';

                        return (
                          <tr key={p.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                              {p.id.slice(0, 12)}...
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-stone-900 dark:text-stone-100">{p.user_nom || 'Producteur'}</div>
                              <div className="text-[10px] text-stone-400 font-mono">{p.user_phone}</div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                              {p.montant.toLocaleString()} FCFA
                            </td>
                            <td className="py-3.5 px-4 uppercase font-bold text-[10px]">
                              {p.methode === 'wave' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  Wave
                                </span>
                              )}
                              {p.methode === 'orange_money' && (
                                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                                  Orange Money
                                </span>
                              )}
                              {p.methode !== 'wave' && p.methode !== 'orange_money' && (
                                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                                  {p.methode}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                  isReussi
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : isRembourse
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                }`}
                              >
                                {p.statut}
                              </span>
                              {p.remboursement_date && (
                                <div className="text-[10px] text-stone-400 mt-0.5">
                                  le {new Date(p.remboursement_date).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                              {new Date(p.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isReussi && (
                                <button
                                  type="button"
                                  onClick={() => setRefundModal({ open: true, payment: p, reason: 'Demande client / Erreur de prélèvement' })}
                                  className="px-3 py-1 rounded-xl border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-bold transition-colors"
                                >
                                  Rembourser
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 6 : SIGNALEMENTS (CÔTÉ ADMIN)                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filtre de statut des signalements */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {['all', 'nouveau', 'en_cours', 'resolu'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setReportStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors capitalize ${
                    reportStatusFilter === st
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  {st === 'all' ? 'Tous les signalements' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {reports.filter((r) => reportStatusFilter === 'all' || r.statut === reportStatusFilter).length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-400">
                  Aucun signalement utilisateur pour cette sélection.
                </div>
              ) : (
                reports
                  .filter((r) => reportStatusFilter === 'all' || r.statut === reportStatusFilter)
                  .map((rep) => {
                    const typeInfo = REPORT_TYPE_LABELS[rep.type] || { label: rep.type, icon: '📌', desc: '' };
                    const statusInfo = REPORT_STATUS_LABELS[rep.statut] || { label: rep.statut, badgeClass: '' };

                    return (
                      <div
                        key={rep.id}
                        className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{typeInfo.icon}</span>
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                              {typeInfo.label}
                            </span>
                            <span className="text-stone-400">•</span>
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              {rep.user_nom || 'Producteur certifié'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-stone-400 font-mono">
                              {new Date(rep.created_at).toLocaleString('fr-FR')}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800 leading-relaxed">
                          {rep.description}
                        </div>

                        {rep.admin_note && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-1">
                              Réponse enregistrée :
                            </span>
                            <span className="text-emerald-950 dark:text-emerald-100">{rep.admin_note}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setReportModal({
                                open: true,
                                report: rep,
                                newStatus: rep.statut === 'resolu' ? 'en_cours' : 'resolu',
                                note: rep.admin_note || '',
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>Mettre à jour & Répondre</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 7 : COORDONNÉES DE CONTACT ADMINISTRABLES (Point 14)  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8">
              <div className="max-w-2xl">
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 mb-1">
                  Coordonnées d&apos;Assistance &amp; Canaux Publics
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
                  Configurez les canaux officiels d&apos;AgriImpact. Chaque coordonnée peut être activée ou masquée individuellement sur l&apos;ensemble du site public (footer, pages d&apos;accueil et de support).
                </p>

                <form onSubmit={handleSaveContactSettings} className="space-y-5">
                  {/* Téléphone Support */}
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Téléphone Support Client
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactSettings.support_phone_visible}
                          onChange={(e) =>
                            setContactSettings({ ...contactSettings, support_phone_visible: e.target.checked })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] text-stone-600 dark:text-stone-400">Afficher sur le site</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={contactSettings.support_phone}
                      onChange={(e) => setContactSettings({ ...contactSettings, support_phone: e.target.value })}
                      placeholder="+221 33 800 12 12"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-mono"
                    />
                  </div>

                  {/* Email Support */}
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Email Officiel de Contact
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactSettings.contact_email_visible}
                          onChange={(e) =>
                            setContactSettings({ ...contactSettings, contact_email_visible: e.target.checked })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] text-stone-600 dark:text-stone-400">Afficher sur le site</span>
                      </label>
                    </div>
                    <input
                      type="email"
                      value={contactSettings.contact_email}
                      onChange={(e) => setContactSettings({ ...contactSettings, contact_email: e.target.value })}
                      placeholder="contact@agrimpact.sn"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-mono"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Lien WhatsApp Direct
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactSettings.whatsapp_visible}
                          onChange={(e) =>
                            setContactSettings({ ...contactSettings, whatsapp_visible: e.target.checked })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] text-stone-600 dark:text-stone-400">Afficher sur le site</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={contactSettings.whatsapp_link}
                      onChange={(e) => setContactSettings({ ...contactSettings, whatsapp_link: e.target.value })}
                      placeholder="https://wa.me/221771234567"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-mono"
                    />
                  </div>

                  {/* Réseau Social */}
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Page / Réseau Social
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactSettings.social_visible}
                          onChange={(e) =>
                            setContactSettings({ ...contactSettings, social_visible: e.target.checked })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] text-stone-600 dark:text-stone-400">Afficher sur le site</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={contactSettings.social_link}
                      onChange={(e) => setContactSettings({ ...contactSettings, social_link: e.target.value })}
                      placeholder="https://facebook.com/agrimpact"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-mono"
                    />
                  </div>

                  {/* Visibilité Globale */}
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#963e1b] dark:text-amber-300 block">
                        Affichage Global des Canaux de Support
                      </span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        Active ou désactive la section de contact sur l&apos;ensemble de la plateforme
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={contactSettings.global_visible}
                      onChange={(e) =>
                        setContactSettings({ ...contactSettings, global_visible: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-[#963e1b] focus:ring-[#963e1b]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-6 py-3 bg-[#0C2B1E] hover:bg-[#154230] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin text-[#C8EF56]" /> : <Check className="w-4 h-4 text-[#C8EF56]" />}
                      <span>Enregistrer les coordonnées</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL : REMBOURSEMENT                                         */}
      {/* ------------------------------------------------------------- */}
      {refundModal.open && refundModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-sm">
              <RotateCcw className="w-5 h-5" />
              <span>Confirmer le remboursement</span>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Vous êtes sur le point de valider le remboursement de{' '}
              <span className="font-bold text-stone-900 dark:text-white">
                {refundModal.payment.montant.toLocaleString()} FCFA
              </span>{' '}
              pour le client <span className="font-bold">{refundModal.payment.user_nom || 'Producteur'}</span>.
              L&apos;abonnement lié sera automatiquement résilié et une trace sera créée dans le journal d&apos;audit.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Motif du remboursement :
              </label>
              <textarea
                rows={2}
                value={refundModal.reason}
                onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModal({ open: false, payment: null, reason: '' })}
                className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Confirmer le remboursement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL : TRAITEMENT SIGNALEMENT                                */}
      {/* ------------------------------------------------------------- */}
      {reportModal.open && reportModal.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <Flag className="w-5 h-5" />
              <span>Traiter le signalement #{reportModal.report.id.slice(0, 8)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nouveau statut :
                </label>
                <select
                  value={reportModal.newStatus}
                  onChange={(e) => setReportModal({ ...reportModal, newStatus: e.target.value as ReportStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="en_cours">En cours d&apos;analyse</option>
                  <option value="resolu">Résolu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Note d&apos;explication / Réponse à l&apos;agriculteur :
                </label>
                <textarea
                  rows={3}
                  value={reportModal.note}
                  onChange={(e) => setReportModal({ ...reportModal, note: e.target.value })}
                  placeholder="Ex: Station météo recalibrée avec les radars ANACIM ou conseil adapté."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportModal({ open: false, report: null, newStatus: 'resolu', note: '' })}
                className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReportUpdate}
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Enregistrer la réponse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
