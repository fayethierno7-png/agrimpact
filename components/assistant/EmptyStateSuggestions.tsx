'use client';

import React from 'react';
import { CloudRain, Sprout, Droplets, ShieldAlert, MapPin, Sparkles } from 'lucide-react';

interface EmptyStateSuggestionsProps {
  onSelectPrompt: (promptText: string) => void;
}

export default function EmptyStateSuggestions({ onSelectPrompt }: EmptyStateSuggestionsProps) {
  const suggestions = [
    {
      category: 'Comprendre la météo',
      icon: CloudRain,
      iconColor: 'text-blue-500',
      prompt: 'Que signifie 70 % de probabilité de pluie pour mes cultures ?',
    },
    {
      category: 'Ma culture',
      icon: Sprout,
      iconColor: 'text-emerald-500',
      prompt: 'Quels sont les principaux besoins du maïs pendant la floraison ?',
    },
    {
      category: 'Irrigation',
      icon: Droplets,
      iconColor: 'text-cyan-500',
      prompt: 'Quels facteurs dois-je prendre en compte avant d\'irriguer demain ?',
    },
    {
      category: 'Protection des cultures',
      icon: ShieldAlert,
      iconColor: 'text-orange-500',
      prompt: 'Comment reconnaître les premiers signes du mildiou sur l\'oignon ?',
    },
    {
      category: 'Agriculture au Sénégal',
      icon: MapPin,
      iconColor: 'text-amber-500',
      prompt: 'Quelles sont les meilleures variétés d\'arachide recommandées par l\'ISRA ?',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 max-w-xl mx-auto text-center animate-fade-in">
      {/* Salutation chaleureuse */}
      <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center mb-4 shadow-md">
        <Sparkles className="w-6 h-6" />
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
        Bonjour 👋
      </h3>

      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-2 max-w-md leading-relaxed font-medium">
        Je suis l&apos;assistant IA officiel d&apos;<strong>AgriImpact</strong>. Je peux vous aider à mieux comprendre la météo, le cycle de vos cultures et les décisions au champ.
      </p>

      {/* Grille des suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-8 text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl hover:border-emerald-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-emerald-700 transition-colors">
                  {item.category}
                </span>
              </div>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 group-hover:text-[#0C2B1E] dark:group-hover:text-emerald-300 leading-snug">
                {item.prompt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
