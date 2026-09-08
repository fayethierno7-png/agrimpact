'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sprout,
  Send,
  Plus,
  Share2,
  Pin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Menu,
  X,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Activity,
  Check,
  Radio,
} from 'lucide-react';
import {
  Conversation,
  ChatMessage,
  getStoredConversations,
  createNewConversation,
  deleteConversation,
  renameConversation,
  togglePinConversation,
  addMessageToConversation,
  updateMessageFeedback,
  getActiveConversationId,
  setActiveConversationId,
} from '../../lib/assistant/assistantStorage';
import ConversationSidebar from '../../components/assistant/ConversationSidebar';
import ChatMessageItem from '../../components/assistant/ChatMessageItem';
import EmptyStateSuggestions from '../../components/assistant/EmptyStateSuggestions';
import AiTokenGauge from '../../components/billing/AiTokenGauge';
import TokenTopUpModal from '../../components/billing/TokenTopUpModal';
import AiUsageDiagnosticModal from '../../components/assistant/AiUsageDiagnosticModal';

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gestion du portefeuille de tokens IA (chargé dynamiquement depuis la base de données)
  const [tokensRemaining, setTokensRemaining] = useState(8000);
  const [monthlyQuota, setMonthlyQuota] = useState(8000);
  const [permanentTokens, setPermanentTokens] = useState(0);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // Partage de conversation (Point 8)
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccessUrl, setShareSuccessUrl] = useState<string | null>(null);

  // Mode vocal 100% mains-libres & STT / TTS (Point 15)
  const [isListening, setIsListening] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [continuousVoice, setContinuousVoice] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const continuousVoiceRef = useRef(continuousVoice);
  continuousVoiceRef.current = continuousVoice;

  const totalTokensAvailable = Math.max(0, tokensRemaining) + Math.max(0, permanentTokens);
  const isDepleted = totalTokensAvailable <= 0;

  // Charger le solde réel depuis l'API Wallet
  const refreshWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setTokensRemaining(data.wallet.tokensRemaining);
          setMonthlyQuota(data.wallet.monthlyQuota);
          setPermanentTokens(data.wallet.permanentTokens);
        }
      }
    } catch (e) {
      console.warn('Erreur rafraîchissement wallet:', e);
    }
  };

  // Initialisation STT Web Speech API
  useEffect(() => {
    refreshWallet();

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript && transcript.trim()) {
            setIsListening(false);
            handleSendMessage(transcript.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Reconnaissance vocale erreur:', e);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    const stored = getStoredConversations();
    setConversations(stored);

    const savedActiveId = getActiveConversationId();
    if (savedActiveId && stored.some((c) => c.id === savedActiveId)) {
      setActiveConvId(savedActiveId);
    } else if (stored.length > 0) {
      setActiveConvId(stored[0].id);
      setActiveConversationId(stored[0].id);
    } else {
      const fresh = createNewConversation();
      setConversations([fresh]);
      setActiveConvId(fresh.id);
    }
  }, []);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Scroll en bas automatique
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, loading]);

  // Contrôle du micro
  const startListening = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée sur ce navigateur.');
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTtsSpeaking(false);
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.warn('Erreur démarrage écoute:', err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleVoiceMode = () => {
    const next = !voiceModeActive;
    setVoiceModeActive(next);
    if (!next) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsTtsSpeaking(false);
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setActiveConversationId(id);
    setSidebarMobileOpen(false);
  };

  const handleNewChat = () => {
    const newConv = createNewConversation();
    setConversations([newConv, ...conversations]);
    setActiveConvId(newConv.id);
    setSidebarMobileOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
    const updated = getStoredConversations();
    setConversations(updated);
    if (activeConvId === id) {
      setActiveConvId(updated[0]?.id || null);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    renameConversation(id, newTitle);
    setConversations(getStoredConversations());
  };

  const handleTogglePin = (id: string) => {
    togglePinConversation(id);
    setConversations(getStoredConversations());
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || loading || !activeConvId) return;

    if (isDepleted) {
      setIsTopUpOpen(true);
      return;
    }

    setInputVal('');

    // Message utilisateur avec horodatage ISO complet
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const updatedConv = addMessageToConversation(activeConvId, userMsg);
    if (updatedConv) {
      setConversations((prev) => prev.map((c) => (c.id === activeConvId ? updatedConv : c)));
    }

    setLoading(true);

    try {
      const currentHistory = updatedConv?.messages || [userMsg];
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentHistory,
          conversationId: activeConvId,
        }),
      });

      const json = await res.json();

      if (res.status === 402 || json.code === 'TOKENS_EXHAUSTED') {
        setTokensRemaining(0);
        setPermanentTokens(0);
        setIsTopUpOpen(true);
        throw new Error('Votre solde de tokens IA est épuisé. Veuillez recharger pour continuer.');
      }

      if (json.success && json.reply) {
        const assistantMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          role: 'assistant',
          content: json.reply,
          timestamp: json.created_at || new Date().toISOString(),
          model: json.model,
        };

        const convWithReply = addMessageToConversation(activeConvId, assistantMsg);
        if (convWithReply) {
          setConversations((prev) => prev.map((c) => (c.id === activeConvId ? convWithReply : c)));
        }

        // Mettre à jour les compteurs en direct
        if (json.tokensRemaining !== undefined) {
          setTokensRemaining(json.tokensRemaining);
        }
        if (json.permanentTokens !== undefined) {
          setPermanentTokens(json.permanentTokens);
        }

        // POINT 15 : Réponse Vocale TTS si Mode Vocal Activé
        if (voiceModeActive && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const cleanText = json.reply.replace(/[*_#`]/g, '');
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'fr-FR';
          utterance.rate = 1.0;
          utterance.onstart = () => setIsTtsSpeaking(true);
          utterance.onend = () => {
            setIsTtsSpeaking(false);
            // Mode continu : relancer l'écoute automatique dès la fin de la réponse
            if (continuousVoiceRef.current) {
              setTimeout(() => {
                startListening();
              }, 700);
            }
          };
          utterance.onerror = () => setIsTtsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      } else {
        throw new Error(json.error || 'Erreur réponse');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        content: `Difficulté technique : ${err.message || 'erreur réseau'}.`,
        timestamp: new Date().toISOString(),
      };
      addMessageToConversation(activeConvId, errorMsg);
      setConversations(getStoredConversations());
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    if (!activeConvId) return;
    updateMessageFeedback(activeConvId, messageId, feedback);
    setConversations(getStoredConversations());
  };

  const handleRetry = () => {
    if (!activeConv || activeConv.messages.length < 2) return;
    const lastUserMsg = [...activeConv.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  // POINT 8 : Partage de conversation via route API sécurisée
  const handleShare = async () => {
    if (!activeConv || activeConv.messages.length === 0) {
      alert('Cette conversation est vide.');
      return;
    }
    setShareLoading(true);
    try {
      const res = await fetch('/api/assistant/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeConv.title,
          messages: activeConv.messages,
          farmName: 'Mon Exploitation AgriImpact',
        }),
      });
      const data = await res.json();
      if (data.success && data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        setShareSuccessUrl(data.shareUrl);
        setTimeout(() => setShareSuccessUrl(null), 6000);
      } else {
        alert(data.error || 'Erreur lors du partage.');
      }
    } catch {
      alert('Erreur réseau lors de la génération du lien.');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#FAF9F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* 1. SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 lg:w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shrink-0">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour Dashboard</span>
          </Link>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
        </div>

        <ConversationSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          onRename={handleRename}
          onTogglePin={handleTogglePin}
        />
      </aside>

      {/* SIDEBAR MOBILE OVERLAY */}
      {sidebarMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setSidebarMobileOpen(false)}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs"
          />
          <aside className="relative w-80 max-w-[85%] bg-white dark:bg-stone-900 h-full flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs font-black text-[#0C2B1E] dark:text-emerald-400">Conversations</span>
              <button
                onClick={() => setSidebarMobileOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ConversationSidebar
              conversations={conversations}
              activeId={activeConvId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onDelete={handleDelete}
              onRename={handleRename}
              onTogglePin={handleTogglePin}
            />
          </aside>
        </div>
      )}

      {/* 2. ZONE PRINCIPALE DE CHAT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header du Chat */}
        <header className="px-4 sm:px-6 py-3.5 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="md:hidden p-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-bold shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 truncate">
                  {activeConv?.title || 'Nouvelle conversation'}
                </h1>
                <span className="text-[10px] text-stone-500 font-bold block">
                  AgriImpact AI • Llama 3.3 70B &amp; ANACIM
                </span>
              </div>
            </div>
          </div>

          {/* Actions globales */}
          <div className="flex items-center gap-2">
            {/* Toggle Mode Vocal 100% (Point 15) */}
            <button
              onClick={toggleVoiceMode}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                voiceModeActive
                  ? 'bg-amber-500 text-white border-amber-600 shadow-[0_0_10px_#F59E0B]'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
              }`}
              title={voiceModeActive ? 'Désactiver le mode vocal' : 'Activer le mode vocal mains-libres'}
            >
              {voiceModeActive ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{voiceModeActive ? 'Vocal Activé' : 'Mode Vocal'}</span>
            </button>

            {/* Diagnostic Usage Tokens (Point 4) */}
            <button
              onClick={() => setIsDiagnosticOpen(true)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Consulter le diagnostic d'usage IA"
            >
              <Activity className="w-3.5 h-3.5 text-[#963e1b]" />
              <span className="hidden lg:inline">Diagnostic</span>
            </button>

            {/* Partage Sécurisé (Point 8) */}
            {activeConv && (
              <>
                <button
                  onClick={() => handleTogglePin(activeConv.id)}
                  className={`p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeConv.isPinned
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300'
                      : 'hover:bg-stone-50 text-stone-600 dark:text-stone-300'
                  }`}
                  title={activeConv.isPinned ? 'Désépingler' : 'Épingler'}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{activeConv.isPinned ? 'Épinglé' : 'Épingler'}</span>
                </button>

                <button
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Partager cette conversation"
                >
                  {shareLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Partager</span>
                </button>
              </>
            )}

            {/* Jauge IA Compacte dans le Header */}
            <div className="hidden sm:block">
              <AiTokenGauge
                tokensRemaining={tokensRemaining}
                monthlyQuota={monthlyQuota}
                permanentTokens={permanentTokens}
                planName="Pro Producteur"
                variant="compact"
                onTopUpSuccess={(pack) => {
                  setPermanentTokens((prev) => prev + pack.nb_tokens);
                }}
              />
            </div>

            <button
              onClick={handleNewChat}
              className="px-3.5 py-2 bg-[#0C2B1E] text-white hover:bg-[#123C2B] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C8EF56]" />
              <span className="hidden sm:inline">Nouveau chat</span>
            </button>
          </div>
        </header>

        {/* Notification Toast de partage copié */}
        {shareSuccessUrl && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Lien de partage généré et copié dans le presse-papier !</span>
            </div>
            <a
              href={shareSuccessUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-emerald-100 hover:text-white text-[11px]"
            >
              Tester le lien
            </a>
          </div>
        )}

        {/* Bannière Mode Vocal Actif */}
        {voiceModeActive && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Mode Vocal 100% Actif</span>
              {isListening && <span className="text-[11px] text-amber-600 font-normal animate-pulse">— À votre écoute...</span>}
              {isTtsSpeaking && <span className="text-[11px] text-emerald-600 font-normal">— Réponse vocale en cours...</span>}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousVoice}
                  onChange={(e) => setContinuousVoice(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Mode Continu</span>
              </label>

              <button
                onClick={toggleVoiceMode}
                className="text-[10px] text-red-600 hover:underline font-bold"
              >
                Couper le son
              </button>
            </div>
          </div>
        )}

        {/* Corps des Messages Scrollables */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="max-w-3xl mx-auto">
            {activeConv && activeConv.messages.length > 0 ? (
              activeConv.messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onFeedback={(f) => handleFeedback(msg.id, f)}
                  onRetry={msg.role === 'assistant' ? handleRetry : undefined}
                />
              ))
            ) : (
              <EmptyStateSuggestions onSelectPrompt={(p) => handleSendMessage(p)} />
            )}

            {loading && (
              <div className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-fit text-xs text-stone-700 dark:text-stone-300 shadow-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>AgriImpact AI formule la recommandation agronomique...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Zone de Saisie Inférieure avec Jauge IA Réactive intégrée */}
        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
          <div className="max-w-3xl mx-auto space-y-2.5">
            {/* Jauge IA dans le chat */}
            <AiTokenGauge
              tokensRemaining={tokensRemaining}
              monthlyQuota={monthlyQuota}
              permanentTokens={permanentTokens}
              planName="Pro Producteur"
              variant="chat-bar"
              onTopUpSuccess={(pack) => {
                setPermanentTokens((prev) => prev + pack.nb_tokens);
              }}
            />

            {/* Formulaire de saisie - Bloqué si quota épuisé (Point 12) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isDepleted) {
                  setIsTopUpOpen(true);
                  return;
                }
                handleSendMessage();
              }}
              className={`flex items-center gap-2 rounded-2xl p-2 border shadow-xs transition-colors ${
                isDepleted
                  ? 'bg-stone-100 dark:bg-stone-800/80 border-stone-300 dark:border-stone-700 opacity-80'
                  : 'bg-[#FAF9F5] dark:bg-stone-800 border-stone-200 dark:border-stone-700 focus-within:border-[#0C2B1E]'
              }`}
            >
              {/* Bouton Microphone pour dictée vocale (Point 15) */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isDepleted}
                title={isListening ? 'Arrêter la dictée' : 'Parler au micro'}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_8px_#EF4444]'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Animation Onde Sonore quand le micro écoute */}
              {isListening && (
                <div className="flex items-center gap-1 px-1">
                  <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-4 bg-red-500 rounded-full animate-bounce" />
                </div>
              )}

              <input
                type="text"
                placeholder={
                  isDepleted
                    ? 'Quota IA épuisé — Renouvellement prochainement ou rechargez vos tokens'
                    : isListening
                    ? 'Parlez maintenant... AgriImpact écoute'
                    : 'Posez votre question (irrigation, mildiou, météo à Kayar, arachide...)'
                }
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden disabled:cursor-not-allowed"
                disabled={loading || isDepleted}
              />

              {isDepleted ? (
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(true)}
                  className="px-3.5 py-2 bg-[#963e1b] hover:bg-[#823315] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-[#C8EF56]" />
                  <span>Recharger</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputVal.trim() || loading}
                  className="w-10 h-10 bg-[#0C2B1E] hover:bg-[#123C2B] disabled:opacity-30 text-white rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4 text-[#C8EF56]" />
                </button>
              )}
            </form>

            <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 pt-1">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span>
                  AgriImpact AI est un outil d&apos;aide à la décision certifié sur les données ANACIM &amp; ISRA.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDiagnosticOpen(true)}
                className="text-[#963e1b] hover:underline font-bold cursor-pointer"
              >
                Diagnostic d&apos;usage IA
              </button>
            </div>
          </div>
        </div>

        {/* Modales */}
        <TokenTopUpModal
          isOpen={isTopUpOpen}
          onClose={() => setIsTopUpOpen(false)}
          onPurchaseSuccess={(pack) => {
            setPermanentTokens((prev) => prev + pack.nb_tokens);
          }}
        />

        <AiUsageDiagnosticModal
          isOpen={isDiagnosticOpen}
          onClose={() => setIsDiagnosticOpen(false)}
          onOpenTopUp={() => setIsTopUpOpen(true)}
        />
      </main>
    </div>
  );
}
