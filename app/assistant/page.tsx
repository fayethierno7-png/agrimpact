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

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialisation
  useEffect(() => {
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
  }, [activeConv?.messages]);

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

    setInputVal('');

    // Message utilisateur
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
        body: JSON.stringify({ messages: currentHistory }),
      });

      const json = await res.json();
      if (json.success && json.reply) {
        const assistantMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          role: 'assistant',
          content: json.reply,
          timestamp: new Date().toISOString(),
          model: json.model,
        };
        const convWithReply = addMessageToConversation(activeConvId, assistantMsg);
        if (convWithReply) {
          setConversations((prev) => prev.map((c) => (c.id === activeConvId ? convWithReply : c)));
        }
      } else {
        throw new Error(json.error || 'Erreur réponse');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        content: `Désolé, une difficulté technique est survenue : ${err.message || 'erreur réseau'}.`,
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

  const handleShare = () => {
    if (!activeConv) return;
    const text = activeConv.messages.map((m) => `${m.role === 'user' ? 'Moi' : 'AgriImpact AI'}: ${m.content}`).join('\n\n');
    if (navigator.share) {
      navigator.share({ title: activeConv.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Conversation copiée dans le presse-papier !');
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#FAF9F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* 1. SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 lg:w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shrink-0">
        {/* En-tête Sidebar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-emerald-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour Dashboard</span>
          </Link>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
        </div>

        {/* Liste des conversations & recherche */}
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
            {/* Bouton burger mobile pour ouvrir la sidebar */}
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="md:hidden p-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-100 rounded-lg"
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
                  AgriImpact AI • Référentiels ISRA &amp; ANACIM
                </span>
              </div>
            </div>
          </div>

          {/* Actions globales */}
          <div className="flex items-center gap-2">
            {activeConv && (
              <>
                <button
                  onClick={() => handleTogglePin(activeConv.id)}
                  className={`p-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors ${
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
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Partager cette conversation"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Partager</span>
                </button>
              </>
            )}

            <button
              onClick={handleNewChat}
              className="px-3.5 py-2 bg-[#0C2B1E] text-white hover:bg-[#123C2B] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#C8EF56]" />
              <span className="hidden sm:inline">Nouveau chat</span>
            </button>
          </div>
        </header>

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

            {/* Indicateur de calcul de l'assistant */}
            {loading && (
              <div className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-fit text-xs text-stone-700 dark:text-stone-300 shadow-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>AgriImpact AI formule la recommandation agronomique...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Zone de Saisie Inférieure */}
        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-[#FAF9F5] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-2 focus-within:border-[#0C2B1E] shadow-xs transition-colors"
            >
              <input
                type="text"
                placeholder="Posez votre question (irrigation, mildiou, météo à Kayar, arachide...)"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || loading}
                className="w-10 h-10 bg-[#0C2B1E] hover:bg-[#123C2B] disabled:opacity-30 text-white rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4 text-[#C8EF56]" />
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400 dark:text-stone-500 mt-2 text-center">
              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                AgriImpact AI est un outil d&apos;aide à la décision. Ne remplace pas l&apos;avis d&apos;un agronome de terrain ou de l&apos;ANCAR.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
