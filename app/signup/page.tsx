'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Sprout,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';
import { SENEGAL_REGIONS } from '../../lib/constants/senegal';
import { SimulatorResult } from '../../lib/types';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signupAndCreateFarm, isLoading } = useAgri();

  // Paramètres URL
  const redirectParam = searchParams.get('redirect') || '/dashboard';
  const intentParam = searchParams.get('intent');
  const regionParam = searchParams.get('region');
  const cultureParam = searchParams.get('culture');
  const isFromSimulation = searchParams.get('save_simulation') === 'true';

  // État de simulation récupérée
  const [cachedSimulation, setCachedSimulation] = useState<SimulatorResult | null>(null);

  // Étape 1 : Formulaire Zero-Friction (Email + Mot de passe essentiels)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');

  // Détails de la parcelle (initialisés depuis la simulation ou valeurs par défaut)
  const [showParcelDetails, setShowParcelDetails] = useState(false);
  const [region, setRegion] = useState('Thiès');
  const [culture, setCulture] = useState('Oignon');
  const [isCustomCrop, setIsCustomCrop] = useState(false);
  const [customCropInput, setCustomCropInput] = useState('');
  const [surfaceHa, setSurfaceHa] = useState('1.0');
  const [typeIrrigation, setTypeIrrigation] = useState<'goutte-a-goutte' | 'submersion' | 'pluviale'>('goutte-a-goutte');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Charger la simulation en attente depuis localStorage ou paramètres
  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('agrimpact_pending_simulation');
      if (pendingRaw) {
        const parsed: SimulatorResult = JSON.parse(pendingRaw);
        setCachedSimulation(parsed);
        if (parsed.situation?.region) setRegion(parsed.situation.region);
        if (parsed.situation?.culture) {
          setCulture(parsed.situation.culture);
          if (!['Oignon', 'Tomate', 'Maïs', 'Arachide', 'Piment'].includes(parsed.situation.culture)) {
            setIsCustomCrop(true);
            setCustomCropInput(parsed.situation.culture);
          }
        }
      } else {
        if (regionParam) setRegion(regionParam);
        if (cultureParam) {
          setCulture(cultureParam);
          if (!['Oignon', 'Tomate', 'Maïs', 'Arachide', 'Piment'].includes(cultureParam)) {
            setIsCustomCrop(true);
            setCustomCropInput(cultureParam);
          }
        }
      }
    } catch {}
  }, [regionParam, cultureParam]);

  // Étape de confirmation par code OTP
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRequestOtpAndValidateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner votre email et un mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          type: 'signup',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMaskedEmail(data.sentTo || email);
        if (data.devCode) {
          setDevCode(data.devCode);
        } else {
          setDevCode(null);
        }
        setStep('otp');
      } else {
        setErrorMessage(data.error || 'Erreur lors de l\'envoi du code de sécurité.');
      }
    } catch {
      setErrorMessage('Impossible d\'envoyer le code de vérification.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Veuillez renseigner le code à 6 chiffres reçu par email.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const verifyRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setErrorMessage(verifyData.error || 'Code de confirmation incorrect.');
        setIsVerifyingOtp(false);
        return;
      }

      // Code valide -> Création du compte et redirection vers la validation admin
      const surfaceNum = parseFloat(surfaceHa.replace(',', '.')) || 1.0;
      const finalNom = nom.trim() || email.split('@')[0] || 'Producteur';

      const res = await signupAndCreateFarm({
        email: email.trim().toLowerCase(),
        password,
        telephone: telephone.trim() ? `+221 ${telephone.trim()}` : '',
        region,
        culture,
        surfaceHa: surfaceNum,
        dateSemis: new Date().toISOString().split('T')[0],
        typeIrrigation,
        nom: finalNom,
      });

      if (res.success) {
        // Envoi email de bienvenue
        try {
          fetch('/api/auth/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              nom: finalNom,
              region,
              culture,
              surfaceHa: surfaceNum,
              typeIrrigation,
            }),
          }).catch(() => {});
        } catch {}

        // Redirection vers l'espace d'attente de validation admin obligatoire
        router.push('/en-attente');
      } else {
        setErrorMessage(res.error || "Erreur lors de la création du compte.");
        setIsVerifyingOtp(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la validation.');
      setIsVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMessage(null);
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          type: 'signup',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Nouveau code envoyé à ${maskedEmail || email}`);
      } else {
        setErrorMessage(data.error || 'Erreur renvoi du code.');
      }
    } catch {
      setErrorMessage('Impossible de renvoyer le code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const availableCrops = ['Oignon', 'Tomate', 'Maïs', 'Arachide', 'Piment'];

  return (
    <div className="flex-1 flex flex-col justify-between bg-stone-50 dark:bg-stone-950 min-h-screen text-stone-900 dark:text-stone-100 transition-colors">
      {/* Barre statut Sénégal */}
      <div className="w-full bg-white dark:bg-stone-900 border-b border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
          <Link href="/" className="flex items-center gap-2 hover:text-[#0C2B1E] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l&apos;accueil</span>
          </Link>
          <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sénégal • Inscription instantanée sécurisée</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          {/* Logo AGRIMPACT */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-900/10">
                <Sprout className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-200 leading-none">
                  AGRIMPACT
                </span>
                <span className="text-[9px] font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">
                  TERROIR & DÉCISION SÉNÉGAL
                </span>
              </div>
            </Link>
          </div>

          {/* Bandeau d'accueil contextuel : Démo ou Simulation */}
          {(cachedSimulation || isFromSimulation) && (
            <div className="p-4 mb-6 rounded-2xl bg-[#0C2B1E] text-white flex items-start gap-3 shadow-md">
              <Sparkles className="w-5 h-5 text-[#C8EF56] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-black text-[#C8EF56] uppercase tracking-wider mb-0.5">
                  Simulation agronomique mémorisée
                </div>
                <div className="text-stone-200 leading-snug">
                  Terroir <strong>{region}</strong> • Culture <strong>{culture}</strong>. Votre parcelle et votre premier diagnostic seront automatiquement sauvegardés sur votre espace.
                </div>
              </div>
            </div>
          )}

          {intentParam === 'demo' && !cachedSimulation && !isFromSimulation && (
            <div className="p-4 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Découvrez votre espace AgriImpact en activant votre profil exploitant.</span>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                  Accès complet à la météo prédictive 14j et aux créneaux optimaux de traitement.
                </p>
              </div>
            </div>
          )}

          {/* Titre & Sous-titre */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Créer mon compte exploitant
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Activez votre copilote agronomique en 30 secondes chrono.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 mb-5 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* FORMULAIRE D'INSCRIPTION OU DE CONFIRMATION OTP */}
          {step === 'otp' ? (
            <form onSubmit={handleVerifyOtpAndSignup} className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Confirmation de votre identité</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                    Un code de sécurité à 6 chiffres a été généré pour l&apos;adresse <span className="font-semibold">{maskedEmail || email}</span>.
                  </p>
                  {devCode && (
                    <div className="mt-2.5 p-2 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-[11px]">
                      <span className="font-bold">Mode Test/Développement :</span> Serveur SMTP non connecté dans .env.local. Votre code de validation immédiat est : <strong className="font-mono text-sm px-1.5 py-0.5 bg-white dark:bg-stone-900 rounded border border-amber-400 text-emerald-700">{devCode}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Code de confirmation (6 chiffres)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex: 654321"
                  className="w-full text-center tracking-widest text-xl font-mono py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
                >
                  ← Corriger mon email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSendingOtp}
                  className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isSendingOtp ? 'Envoi...' : 'Renvoyer le code'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifyingOtp || isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
                >
                  <span>{isVerifyingOtp || isLoading ? 'Validation de votre compte...' : 'Confirmer et continuer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-center text-stone-500 dark:text-stone-400 pt-1">
                ⏱️ Le code est valable pendant 10 minutes.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRequestOtpAndValidateForm} className="space-y-4">
            {/* 1. Email (Requis) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Adresse Email <span className="text-emerald-600 font-black">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: amadou.sow@gmail.com"
                className="w-full px-3.5 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-medium"
                required
                autoFocus
              />
            </div>

            {/* 2. Mot de passe (Requis) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Mot de passe <span className="text-emerald-600 font-black">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-3.5 pr-10 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-medium"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Nom & Téléphone (Optionnels mais utiles pour la personnalisation) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Nom ou Exploitation <span className="text-stone-400 text-[10px]">(Optionnel)</span>
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Moussa Sow"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Téléphone Sénégal <span className="text-stone-400 text-[10px]">(Optionnel)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 pointer-events-none">
                    +221
                  </span>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="77 000 00 00"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Accordéon : Personnaliser ma parcelle (Optionnel) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowParcelDetails(!showParcelDetails)}
                className="w-full py-2 px-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Détails de ma parcelle : {region} • {culture} ({surfaceHa} ha)</span>
                </div>
                {showParcelDetails ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
              </button>

              {showParcelDetails && (
                <div className="p-4 mt-2 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        Région
                      </label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-medium"
                      >
                        {SENEGAL_REGIONS.map((r) => (
                          <option key={r.nom} value={r.nom} className="text-stone-900 dark:text-stone-100">
                            {r.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        Surface (Hectares)
                      </label>
                      <input
                        type="text"
                        value={surfaceHa}
                        onChange={(e) => setSurfaceHa(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-900 dark:text-stone-100 font-medium"
                        placeholder="1.0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      Culture principale
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {availableCrops.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCulture(c);
                            setIsCustomCrop(false);
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            culture === c && !isCustomCrop
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:border-emerald-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCrop(true);
                          if (customCropInput.trim()) setCulture(customCropInput.trim());
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          isCustomCrop
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:border-emerald-600'
                        }`}
                      >
                        + Autre culture
                      </button>
                    </div>

                    {/* Saisie libre de culture si activée */}
                    {isCustomCrop && (
                      <div className="mt-2 animate-fade-in">
                        <input
                          type="text"
                          value={customCropInput}
                          onChange={(e) => {
                            setCustomCropInput(e.target.value);
                            setCulture(e.target.value.trim() || 'Culture personnalisée');
                          }}
                          placeholder="Nom de votre culture (ex: Pastèque, Gombo, Niébé, Mangue...)"
                          className="w-full px-3 py-2 bg-white dark:bg-stone-800 border-2 border-emerald-600 rounded-lg text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 font-medium focus:ring-2 focus:ring-emerald-600/30"
                          autoFocus
                        />
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-1">
                          ✓ Culture libre enregistrée : {culture}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bouton de soumission principal */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Création de votre espace...' : 'Créer mon compte exploitant et continuer'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-center text-stone-500 dark:text-stone-400 pt-1">
              Accès direct sécurisé • Données agronomiques ANACIM synchronisées • Vos simulations sont conservées.
            </p>
          </form>
        )}

          {/* Lien vers connexion */}
          <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800 text-center">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Vous avez déjà un compte ?{' '}
            </span>
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectParam)}`}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">Chargement...</div>}>
      <SignupContent />
    </Suspense>
  );
}
