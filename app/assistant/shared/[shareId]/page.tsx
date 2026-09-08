'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sprout,
  User,
  ArrowLeft,
  Calendar,
  Building2,
  Copy,
  Check,
  Trash2,
  Lock,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface SharedData {
  id: string;
  shareToken: string;
  title: string;
  authorNom: string;
  isOwner: boolean;
  createdAt: string;
  farmName: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

export default function SharedConversationPage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedData | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!shareId) return;

    fetch(`/api/assistant/share?token=${shareId}`)
      .then(async (res) => {
        if (res.status === 401) {
          setError('AUTH_REQUIRED');
          return null;
        }
        if (!res.ok) {
          throw new Error('Conversation partagée introuvable ou révoquée.');
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success) {
          setData(json.conversation);
        } else if (json && !json.success) {
          setError(json.error || 'Erreur chargement.');
        }
      })
      .catch((e) => {
        setError(e.message || 'Impossible de charger cette conversation.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async () => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer ce lien de partage ? Personne ne pourra plus y accéder.')) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/assistant/share?token=${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Partage révoqué avec succès.');
        router.push('/assistant');
      } else {
        alert('Erreur lors de la révocation.');
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setRevoking(false);
    }
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-stone-700">
        <Loader2 className="w-8 h-8 animate-spin text-[#0C2B1E] mb-3" />
        <p className="text-sm font-semibold">Chargement de la consultation partagée...</p>
      </div>
    );
  }

  if (error === 'AUTH_REQUIRED') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-[#963e1b] rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-[#0C2B1E]">Authentification Requise</h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Cette conversation agrométéorologique est réservée aux utilisateurs connectés de la plateforme SaaS AgriImpact.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-3 bg-[#0C2B1E] hover:bg-[#154230] text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Se connecter à AgriImpact
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-4">
          <h1 className="text-lg font-bold text-stone-900">Conversation Indisponible</h1>
          <p className="text-xs text-stone-600">{error || 'Ce partage a expiré ou n\'existe pas.'}</p>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C2B1E] text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l&apos;assistant</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 flex flex-col">
      {/* Header officiel */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/assistant"
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retour Assistant</span>
          </Link>
          <div className="h-4 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0C2B1E] text-[#C8EF56] rounded-lg flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-[#0C2B1E] block">AgriImpact Partage</span>
              <span className="text-[10px] text-stone-500 block">Document en lecture seule certifié</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Lien copié !' : 'Copier lien'}</span>
          </button>

          {data.isOwner && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Révoquer</span>
            </button>
          )}
        </div>
      </header>

      {/* Métadonnées du partage */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 pb-2">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 mb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#963e1b] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Conseil IA Partagé
              </span>
              <h1 className="text-base sm:text-lg font-black text-[#0C2B1E] mt-1">{data.title}</h1>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Référentiel ANACIM / ISRA</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-semibold">{data.farmName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>Auteur : {data.authorNom}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Partagé le {formatTimestamp(data.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Liste des messages de la conversation */}
        <div className="space-y-4 pb-12">
          {data.messages.map((msg, index) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAssistant ? 'bg-[#0C2B1E] text-[#C8EF56]' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isAssistant ? <Sprout className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${!isAssistant ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm shadow-xs whitespace-pre-wrap leading-relaxed ${
                      isAssistant
                        ? 'bg-white border border-stone-200 text-stone-800'
                        : 'bg-[#0C2B1E] text-white rounded-tr-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.timestamp && (
                    <span className="text-[10px] text-stone-400 mt-1 px-1">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
