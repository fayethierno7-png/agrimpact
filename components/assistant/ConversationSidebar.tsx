'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  MessageSquare,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import { Conversation } from '../../lib/assistant/assistantStorage';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Filtrage selon la recherche
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const pinned = filtered.filter((c) => c.isPinned);
  const recents = filtered.filter((c) => !c.isPinned);

  const startRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditingTitle(c.title);
    setMenuOpenId(null);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRename(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const renderConvItem = (c: Conversation) => {
    const isActive = c.id === activeId;
    const isEditing = c.id === editingId;

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
          isActive
            ? 'bg-[#0C2B1E] text-white font-bold shadow-xs'
            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
        }`}
        onClick={() => !isEditing && onSelectConversation(c.id)}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          {c.isPinned ? (
            <Pin className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#C8EF56]' : 'text-emerald-700'}`} />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename(c.id)}
                className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
                autoFocus
              />
              <button
                onClick={() => saveRename(c.id)}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 text-stone-400 hover:bg-stone-100 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate">{c.title}</span>
          )}
        </div>

        {/* Bouton de menu contextuel */}
        {!isEditing && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
              className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500'
              }`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpenId === c.id && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl p-1 z-30 min-w-[130px] flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    onTogglePin(c.id);
                    setMenuOpenId(null);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-left"
                >
                  <Pin className="w-3 h-3" />
                  <span>{c.isPinned ? 'Désépingler' : 'Épingler'}</span>
                </button>
                <button
                  onClick={() => startRename(c)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg text-left"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Renommer</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Supprimer cette conversation ?')) {
                      onDelete(c.id);
                    }
                    setMenuOpenId(null);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-left"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full">
      {/* Bouton Nouveau Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-4 bg-[#0C2B1E] hover:bg-[#123C2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C8EF56]" />
          <span>Nouveau chat</span>
        </button>
      </div>

      {/* Barre de Recherche */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60 rounded-xl text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-hidden focus:border-[#0C2B1E]"
          />
        </div>
        {searchQuery.trim() && (
          <div className="text-[10px] text-stone-500 font-bold px-1 mt-1.5">
            {filtered.length} conversation{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Liste déroulante des conversations */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
        {/* Section Épinglés */}
        {pinned.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 mb-1.5 flex items-center gap-1">
              <Pin className="w-3 h-3 text-[#1E6B47]" />
              <span>Épinglés</span>
            </div>
            <div className="space-y-1">{pinned.map(renderConvItem)}</div>
          </div>
        )}

        {/* Section Récents */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 mb-1.5">
            <span>Récents</span>
          </div>
          <div className="space-y-1">
            {recents.length > 0 ? (
              recents.map(renderConvItem)
            ) : (
              <div className="text-[11px] text-stone-400 px-2 py-3 text-center italic">
                Aucune conversation récente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
