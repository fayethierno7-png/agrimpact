'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sprout,
  Eye,
  EyeOff,
  ArrowRight,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { useAgri } from '../../lib/context/AgriContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAgri();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const reasonParam = searchParams.get('reason');
  const intentParam = searchParams.get('intent');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Étape de confirmation par code OTP
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Veuillez renseigner votre email ou téléphone.');
      return;
    }

    // Si l'identifiant contient un email, envoyer le code de confirmation
    const emailTarget = identifier.includes('@') ? identifier.trim() : '';

    if (emailTarget) {
      setIsSendingOtp(true);
      try {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: emailTarget,
            email: emailTarget,
            type: 'login',
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMaskedEmail(data.sentTo || emailTarget);
          setStep('otp');
          setIsSendingOtp(false);
          return;
        } else {
          setErrorMessage(data.error || "Impossible d'envoyer le code par email.");
          setIsSendingOtp(false);
          return;
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Erreur de connexion au service d'envoi d'email.");
        setIsSendingOtp(false);
        return;
      }
    }

    // Fallback connexion directe si téléphone pur sans email
    const res = await login(identifier, password, rememberMe);
    if (res.success) {
      router.push(redirectUrl);
    } else {
      setErrorMessage(res.error || 'Identifiants incorrects');
    }
  };

  const handleVerifyOtpAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Veuillez renseigner le code à 6 chiffres.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const verifyRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          code: otpCode.trim(),
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setErrorMessage(verifyData.error || 'Code de confirmation incorrect.');
        setIsVerifyingOtp(false);
        return;
      }

      // Code validé avec succès -> Finalisation de la session
      const res = await login(identifier, password, rememberMe);
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setErrorMessage(res.error || 'Identifiants incorrects');
        setIsVerifyingOtp(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la validation du code.');
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
          identifier,
          type: 'login',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Nouveau code envoyé à ${maskedEmail || identifier}`);
      } else {
        setErrorMessage(data.error || 'Erreur renvoi du code.');
      }
    } catch {
      setErrorMessage('Impossible de renvoyer le code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

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
            <span>Sénégal • Connexion sécurisée</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
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

          {/* Message contextuel bienveillant */}
          {intentParam === 'demo' ? (
            <div className="p-4 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Découvrez votre espace AgriImpact en créant gratuitement votre compte.</span>
                <div className="mt-1.5">
                  <Link
                    href={`/signup?redirect=${encodeURIComponent(redirectUrl)}&intent=demo`}
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                  >
                    <span>Créer un compte en 30 secondes</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : reasonParam === 'auth_required' ? (
            <div className="p-3.5 mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Veuillez vous connecter pour accéder à votre espace personnalisé.</span>
            </div>
          ) : null}

          {/* Titre & Sous-titre */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              Connexion à votre Exploitation
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Accédez au copilote agronomique de vos parcelles.
            </p>
          </div>

          {/* Formulaire de connexion OU de confirmation OTP */}
          {step === 'otp' ? (
            <form onSubmit={handleVerifyOtpAndLogin} className="space-y-4 animate-fade-in">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Code de sécurité envoyé</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Un code de confirmation à 6 chiffres a été expédié par email à <span className="font-semibold">{maskedEmail || identifier}</span> pour valider votre connexion.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Code de confirmation (6 chiffres)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex: 123456"
                  className="w-full text-center tracking-widest text-lg font-mono py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
                >
                  ← Modifier l&apos;email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSendingOtp}
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isSendingOtp ? 'Envoi...' : 'Renvoyer un code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || isLoading}
                className="w-full mt-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10 cursor-pointer disabled:opacity-50"
              >
                <span>{isVerifyingOtp ? 'Vérification en cours...' : 'Confirmer et se connecter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl">
                  {errorMessage}
                </div>
              )}

              {/* Champ Identifiant */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Numéro de téléphone ou Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ex: amadou.sow@gmail.com ou 77 000 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all font-medium"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Mot de passe
                  </label>
                  <Link
                    href="/login"
                    onClick={() => alert("Pour réinitialiser votre mot de passe, contactez l'assistance WhatsApp au 33 800 12 12.")}
                    className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 transition-all"
                    required
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

              {/* Option Rester connecté (non cochée par défaut) */}
              <div className="flex items-center justify-between pt-0.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-stone-300 dark:border-stone-700 text-emerald-700 focus:ring-emerald-600 focus:ring-offset-0 cursor-pointer accent-emerald-700"
                  />
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                    Rester connecté
                  </span>
                </label>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">
                  (sur cet appareil)
                </span>
              </div>

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isLoading || isSendingOtp}
                className="w-full mt-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10 cursor-pointer disabled:opacity-50"
              >
                <span>{isSendingOtp ? 'Envoi du code...' : isLoading ? 'Connexion en cours...' : 'Se connecter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Lien vers Inscription */}
          <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800 text-center">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Pas encore de compte ?{' '}
            </span>
            <Link
              href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Créer mon exploitation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}
