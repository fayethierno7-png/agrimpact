'use client';

import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  Share2,
  MoreHorizontal,
  Sprout,
  User,
  Pin,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChatMessage } from '../../lib/assistant/assistantStorage';

interface ChatMessageItemProps {
  message: ChatMessage;
  onFeedback?: (feedback: 'like' | 'dislike') => void;
  onRetry?: () => void;
}

export default function ChatMessageItem({ message, onFeedback, onRetry }: ChatMessageItemProps) {
  const isAssistant = message.role === 'assistant';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper pour formater l'horodatage exact
  function formatMessageDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Aujourd'hui à ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Hier à ${time}`;
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${time}`;
  }

  const handleSpeakToggle = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('La synthèse vocale n\'est pas supportée par votre navigateur.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = message.content.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Conseil AgriImpact AI',
        text: message.content,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  // Formatage simple du markdown (gras, listes à puces)
  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Puces
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        const bulletText = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-stone-700 dark:text-stone-300 my-1 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: formatBold(bulletText) }} />
          </li>
        );
      }
      // Titres / Sections numérotées
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={idx} className="font-bold text-stone-900 dark:text-stone-100 mt-2 mb-1">
            <span dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
          </div>
        );
      }
      // Ligne vide
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      // Paragraphe standard
      return (
        <p key={idx} className="my-1 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
        </p>
      );
    });
  };

  // Helper pour convertir **texte** en <strong>texte</strong>
  function formatBold(str: string): string {
    return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  return (
    <div className={`flex gap-3 my-4 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
          isAssistant
            ? 'bg-[#0C2B1E] text-[#C8EF56]'
            : 'bg-emerald-600 text-white'
        }`}
      >
        {isAssistant ? <Sprout className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Conteneur de message */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${!isAssistant ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm shadow-xs ${
            isAssistant
              ? 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
              : 'bg-[#0C2B1E] text-white rounded-tr-xs'
          }`}
        >
          {renderFormattedContent(message.content)}
        </div>

        {/* Horodatage précis (Point 7) */}
        {message.timestamp && (
          <span className={`text-[10px] text-stone-500 dark:text-stone-400 mt-1 px-1 font-medium select-none ${!isAssistant ? 'text-right' : 'text-left'}`}>
            {formatMessageDate(message.timestamp)}
          </span>
        )}

        {/* Barre d'actions (uniquement pour les réponses de l'IA) */}
        {isAssistant && (
          <div className="flex items-center gap-1.5 mt-1.5 text-stone-400 text-xs">
            {/* Écoute vocale TTS (Point 15) */}
            <button
              onClick={handleSpeakToggle}
              title={isSpeaking ? 'Arrêter la lecture vocale' : 'Écouter cette réponse'}
              className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer ${
                isSpeaking ? 'text-[#963e1b] font-bold bg-amber-50 dark:bg-amber-950/40 animate-pulse' : ''
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Like */}
            <button
              onClick={() => onFeedback && onFeedback('like')}
              title="J'aime cette réponse"
              className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                message.feedback === 'like' ? 'text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40' : ''
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            {/* Dislike */}
            <button
              onClick={() => onFeedback && onFeedback('dislike')}
              title="Je n'aime pas cette réponse"
              className={`p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                message.feedback === 'dislike' ? 'text-red-600 font-bold bg-red-50 dark:bg-red-950/40' : ''
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>

            {/* Réessayer */}
            {onRetry && (
              <button
                onClick={onRetry}
                title="Régénérer cette réponse"
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Copier */}
            <button
              onClick={handleCopy}
              title="Copier le conseil"
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied && <span className="text-[10px] text-emerald-600 font-bold">Copié !</span>}
            </button>

            {/* Partager */}
            <button
              onClick={handleShare}
              title="Partager cette réponse"
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Menu Plus */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute left-0 bottom-full mb-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 z-30 min-w-[140px]">
                  <button
                    onClick={() => {
                      handleCopy();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-left"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copier texte</span>
                  </button>
                  {onRetry && (
                    <button
                      onClick={() => {
                        onRetry();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-left"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Régénérer</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      alert('Merci pour votre signalement. Notre équipe agronomique vérifiera cette réponse.');
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-left"
                  >
                    <span>Signaler réponse</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
