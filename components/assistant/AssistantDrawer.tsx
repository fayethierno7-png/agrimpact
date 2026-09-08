'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Send,
  Plus,
  Maximize2,
  Sprout,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Conversation,
  ChatMessage,
  getStoredConversations,
  createNewConversation,
  addMessageToConversation,
  updateMessageFeedback,
  getActiveConversationId,
  setActiveConversationId,
} from '../../lib/assistant/assistantStorage';
import ChatMessageItem from './ChatMessageItem';
import EmptyStateSuggestions from './EmptyStateSuggestions';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssistantDrawer({ isOpen, onClose }: AssistantDrawerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les conversations au montage ou à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredConversations();
      setConversations(stored);

      const activeId = getActiveConversationId();
      if (activeId && stored.some((c) => c.id === activeId)) {
        setActiveConvId(activeId);
      } else if (stored.length > 0) {
        setActiveConvId(stored[0].id);
        setActiveConversationId(stored[0].id);
      } else {
        const fresh = createNewConversation();
        setConversations([fresh]);
        setActiveConvId(fresh.id);
      }
    }
  }, [isOpen]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Défilement automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [activeConv?.messages, isOpen]);

  const handleNewChat = () => {
    const newConv = createNewConversation();
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || loading || !activeConvId) return;

    setInputVal('');

    // 1. Ajouter le message de l'utilisateur
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
        throw new Error(json.error || 'Erreur lors de la réponse de l\'assistant.');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        content: `Désolé, une difficulté temporaire est survenue : ${err.message || 'erreur réseau'}. Veuillez réessayer dans quelques instants.`,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fond sombre cliquable */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Panneau coulissant depuis la droite */}
      <div className="relative w-full max-w-lg bg-[#FAF9F5] dark:bg-stone-950 h-full shadow-2xl flex flex-col z-10 border-l border-stone-200 dark:border-stone-800 animate-in slide-in-from-right duration-300">
        {/* Entête du tiroir */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-bold">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>AgriImpact AI</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">
                Copilote agrométéorologique Sénégal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Nouveau chat */}
            <button
              onClick={handleNewChat}
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              title="Nouvelle conversation"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>

            {/* Plein écran vers /assistant */}
            <Link
              href="/assistant"
              onClick={onClose}
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              title="Ouvrir en plein écran"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>

            {/* Fermer */}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps des messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
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

          {/* Indicateur de chargement / réflexion */}
          {loading && (
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-fit text-xs text-stone-600 dark:text-stone-300 shadow-xs animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>AgriImpact AI analyse les paramètres agronomiques...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie et avertissement déontologique */}
        <div className="p-3 sm:p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-[#FAF9F5] dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-1.5 focus-within:border-[#0C2B1E] transition-colors"
          >
            <input
              type="text"
              placeholder="Posez votre question (irrigation, mildiou, maïs...)"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || loading}
              className="w-9 h-9 bg-[#0C2B1E] hover:bg-[#123C2B] disabled:opacity-30 text-white rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#C8EF56]" />
            </button>
          </form>

          {/* Clause de déontologie agricole */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400 dark:text-stone-500 mt-2 text-center">
            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Ne remplace pas l&apos;avis d&apos;un agronome de terrain ou de l&apos;ANCAR.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
