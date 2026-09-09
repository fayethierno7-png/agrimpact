'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Camera,
  Sun,
  Moon,
  Laptop,
  Check,
  Save,
  Loader2,
  Trash2,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { AppHeader } from '../../components/AppHeader';
import { BottomNav } from '../../components/BottomNav';
import { Toast, ToastMessage } from '../../components/Toast';
import { useAgri } from '../../lib/context/AgriContext';
import { UserTheme } from '../../lib/types';
import { compressAndResizeImage } from '../../lib/utils/imageCompressor';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export default function ParametresPage() {
  const router = useRouter();
  const { profile, farm, isLoading, theme, setTheme, updateProfile, logout, setRole } = useAgri();

  // États locaux du formulaire
  const [nom, setNom] = useState('');
  const [isSavingNom, setIsSavingNom] = useState(false);

  // États locaux de l'avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // État du toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Protection de route : redirection si explicitement non connecté
  useEffect(() => {
    if (!isLoading && !profile) {
      const isExplicitlyLoggedOut = typeof window !== 'undefined' && localStorage.getItem('agrimpact_logged_out') === 'true';
      if (isExplicitlyLoggedOut) {
        router.push('/login?redirect=/parametres');
      }
    }
  }, [isLoading, profile, router]);

  // Synchronisation du nom avec le profil
  useEffect(() => {
    if (profile?.nom) {
      setNom(profile.nom);
    }
  }, [profile?.nom]);

  // Synchronisation de l'avatar avec le profil
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    setToast({
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      title,
    });
  };

  // 1. Sauvegarde du Nom
  const handleSaveNom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNom = nom.trim();
    if (!cleanNom || cleanNom.length < 2) {
      showToast('error', 'Le nom doit comporter au moins 2 caractères.');
      return;
    }

    setIsSavingNom(true);
    const res = await updateProfile({ nom: cleanNom });
    setIsSavingNom(false);

    if (res.success) {
      showToast('success', 'Votre nom a été mis à jour avec succès.', 'Modifications enregistrées');
    } else {
      showToast('error', res.error || 'Impossible de sauvegarder votre nom.');
    }
  };

  // 2. Sélection et Upload de l'Avatar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset de l'input pour permettre de re-sélectionner le même fichier si besoin
    e.target.value = '';

    try {
      setIsUploadingAvatar(true);
      setCompressionInfo('Optimisation et compression 500x500px...');

      // Compression & redimensionnement côté client (max 500x500px, WebP 85%)
      const compressed = await compressAndResizeImage(file, 500, 0.85);
      setAvatarPreview(compressed.previewUrl);
      setCompressionInfo(`Image compressée (${compressed.sizeKB} Ko, ${compressed.width}x${compressed.height}px)`);

      // Upload vers Supabase Storage bucket 'avatars'
      if (isSupabaseConfigured && supabase && profile?.user_id) {
        const fileExt = compressed.file.name.split('.').pop() || 'webp';
        const filePath = `${profile.user_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressed.file, {
            cacheControl: '3600',
            upsert: true,
            contentType: compressed.file.type,
          });

        if (uploadError) {
          throw new Error(`Échec du téléversement : ${uploadError.message}`);
        }

        // Récupérer l'URL publique directe
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Sauvegarder l'avatar_url dans profiles
        const res = await updateProfile({ avatar_url: publicUrl });
        if (!res.success) {
          throw new Error(res.error || 'Erreur lors de la mise à jour du profil.');
        }

        setAvatarPreview(publicUrl);
        showToast('success', 'Votre photo de profil a été mise à jour.', 'Photo enregistrée');
      } else {
        // En mode démo local, persister le DataURL / preview dans le profil local
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          await updateProfile({ avatar_url: base64data });
          showToast('success', 'Photo de profil enregistrée en local.', 'Photo mise à jour');
        };
        reader.readAsDataURL(compressed.blob);
      }
    } catch (err: any) {
      console.error('Erreur upload avatar:', err);
      showToast('error', err.message || 'Impossible de charger la photo.');
      // Restaurer l'ancien avatar en cas d'échec
      setAvatarPreview(profile?.avatar_url || null);
    } finally {
      setIsUploadingAvatar(false);
      setTimeout(() => setCompressionInfo(null), 4000);
    }
  };

  // 3. Suppression de l'Avatar
  const handleDeleteAvatar = async () => {
    if (!profile?.avatar_url && !avatarPreview) return;
    setIsUploadingAvatar(true);
    const res = await updateProfile({ avatar_url: null });
    setIsUploadingAvatar(false);

    if (res.success) {
      setAvatarPreview(null);
      showToast('info', 'Votre photo de profil a été retirée.');
    } else {
      showToast('error', res.error || 'Impossible de supprimer la photo.');
    }
  };

  // 4. Changement de Thème
  const handleThemeSelect = async (newTheme: UserTheme) => {
    if (theme === newTheme) return;
    await setTheme(newTheme);

    const themeLabels: Record<UserTheme, string> = {
      light: 'Clair',
      dark: 'Sombre',
      system: 'Système',
    };
    showToast('success', `Thème appliqué : ${themeLabels[newTheme]}`, 'Apparence modifiée');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium">Chargement de vos paramètres...</span>
      </div>
    );
  }

  const initial = profile.nom ? profile.nom.charAt(0).toUpperCase() : 'P';

  return (
    <div className="flex-1 flex flex-col bg-stone-50/70 dark:bg-stone-950 min-h-screen transition-colors duration-200">
      <AppHeader statusText="En ligne" title="Paramètres du compte" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12 space-y-6">
        {/* En-tête Page */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Paramètres du Compte
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            Personnalisez votre identité de producteur, votre avatar et l&apos;apparence visuelle d&apos;AgriImpact.
          </p>
        </div>

        {/* Accès rapide Console Admin et Gestion des Droits Système */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/40 to-stone-50 dark:from-purple-950/40 dark:via-purple-900/20 dark:to-stone-900 border border-purple-200 dark:border-purple-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-purple-300 dark:ring-purple-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-purple-950 dark:text-purple-100">
                  Console d&apos;Administration AgrImpact
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    profile?.role === 'superadmin'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400'
                      : profile?.role === 'admin'
                      ? 'bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {profile?.role === 'superadmin'
                    ? 'Super Administrateur Actif'
                    : profile?.role === 'admin'
                    ? 'Rôle Administrateur Actif'
                    : 'Rôle Producteur'}
                </span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Pilotez la validation des exploitants, les finances MRR/ARR, les remboursements, le funnel et les signalements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {profile?.role === 'superadmin' && (
              <Link
                href="/admin"
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-105 cursor-pointer ring-2 ring-purple-300"
              >
                <span>Console SuperAdmin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* SECTION 1 : PHOTO DE PROFIL (AVATAR) */}
          <section className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <Camera className="w-5 h-5 text-emerald-700 dark:text-emerald-500" />
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Photo de profil
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-emerald-600 dark:border-emerald-500 shadow-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={profile.nom || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-800 text-white flex items-center justify-center text-3xl font-black">
                      {initial}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs gap-1.5">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="font-semibold">Upload...</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-transform hover:scale-105"
                  title="Changer la photo"
                  aria-label="Changer la photo de profil"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Controls & Instructions */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Photo d&apos;exploitant agricole
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Formats acceptés : JPG, PNG, WEBP. Redimensionnement automatique à 500x500px et compression allégée pour les connexions mobiles.
                  </p>
                </div>

                {compressionInfo && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{compressionInfo}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Choisir une photo</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      disabled={isUploadingAvatar}
                      className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2 : INFORMATIONS PERSONNELLES (NOM & COORDONNÉES) */}
          <section className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <User className="w-5 h-5 text-emerald-700 dark:text-emerald-500" />
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                Informations du Producteur
              </h2>
            </div>

            <form onSubmit={handleSaveNom} className="space-y-4">
              <div>
                <label
                  htmlFor="nom-input"
                  className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5"
                >
                  Nom complet / Raison Sociale
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      id="nom-input"
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Ex: Babacar Diop"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingNom || nom.trim() === profile.nom}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isSavingNom ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Enregistrer le nom</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Détails en lecture seule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-semibold">Numéro de contact</span>
                  </div>
                  <div className="font-bold text-stone-800 dark:text-stone-200 font-mono">
                    {profile.telephone_contact || 'Non renseigné'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-semibold">Exploitation active</span>
                  </div>
                  <div className="font-bold text-stone-800 dark:text-stone-200">
                    {farm?.nom || 'Mon Exploitation'} • Région {farm?.region || 'Sénégal'}
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* SECTION 3 : SÉLECTEUR DE THÈME */}
          <section className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Apparence & Thème
                </h2>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Instantané
              </span>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              Choisissez le mode d&apos;affichage adapté à vos conditions de travail au champ ou de nuit :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Option 1 : Thème Clair */}
              <button
                type="button"
                onClick={() => handleThemeSelect('light')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 ${
                  theme === 'light'
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  {theme === 'light' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Clair
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Optimal pour une utilisation en plein soleil au champ.
                  </div>
                </div>
              </button>

              {/* Option 2 : Thème Sombre */}
              <button
                type="button"
                onClick={() => handleThemeSelect('dark')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 ${
                  theme === 'dark'
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center border border-stone-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  {theme === 'dark' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Sombre
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Confort oculaire la nuit et économie de batterie sur mobile.
                  </div>
                </div>
              </button>

              {/* Option 3 : Thème Système */}
              <button
                type="button"
                onClick={() => handleThemeSelect('system')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3 ${
                  theme === 'system'
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  {theme === 'system' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                    Système
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    S&apos;adapte automatiquement aux réglages de votre appareil.
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* SECTION 4 : SÉCURITÉ & SESSION */}
          <section className="p-6 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Sécurité du compte
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Forfait actif : <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400">{profile.plan}</span> • Identifiant certifié
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold transition-colors"
              >
                Gérer l&apos;abonnement
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Toast de Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Navigation Mobile Basse */}
      <BottomNav />
    </div>
  );
}
