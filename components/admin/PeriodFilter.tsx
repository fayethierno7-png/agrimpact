'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { PeriodType, PeriodFilterValue } from '../../lib/types';
import { Calendar } from '../ui/Calendar';

interface PeriodFilterProps {
  value: PeriodFilterValue;
  onChange: (val: PeriodFilterValue) => void;
  className?: string;
}

const PRESET_OPTIONS: { type: PeriodType; label: string; days: number }[] = [
  { type: '24h', label: '24h', days: 1 },
  { type: '7d', label: '7 jours', days: 7 },
  { type: '30d', label: '30 jours', days: 30 },
  { type: '90d', label: '90 jours', days: 90 },
  { type: '1y', label: '1 an', days: 365 },
];

export function computePeriodDates(type: PeriodType, customStart?: string, customEnd?: string): PeriodFilterValue {
  const now = new Date();
  const endDate = customEnd ? new Date(customEnd).toISOString() : now.toISOString();

  if (type === 'custom' && customStart) {
    return {
      period: 'custom',
      startDate: new Date(customStart).toISOString(),
      endDate,
      label: `Du ${new Date(customStart).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`,
    };
  }

  const preset = PRESET_OPTIONS.find((p) => p.type === type) || PRESET_OPTIONS[2]; // Default 30d
  const startDate = new Date(now.getTime() - preset.days * 86400000).toISOString();

  return {
    period: type,
    startDate,
    endDate,
    label: preset.label,
  };
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ value, onChange, className = '' }) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const handleSelectPreset = (type: PeriodType) => {
    setIsCustomOpen(false);
    onChange(computePeriodDates(type));
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    onChange(computePeriodDates('custom', customStart, customEnd));
    setIsCustomOpen(false);
  };

  return (
    <div className={`relative flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Pills Prédéfinis */}
      <div className="flex items-center bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl border border-stone-200 dark:border-stone-700/80 shadow-2xs">
        {PRESET_OPTIONS.map((opt) => {
          const isActive = value.period === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleSelectPreset(opt.type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs scale-102'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}

        {/* Bouton Personnalisé */}
        <button
          type="button"
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            value.period === 'custom'
              ? 'bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Personnalisé</span>
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {/* Popover Calendrier SaaS Personnalisé */}
      {isCustomOpen && (
        <div className="absolute right-0 top-full mt-2 z-40 w-80 sm:w-88 p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider">
              Sélectionner la période
            </div>
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {customStart} → {customEnd}
            </div>
          </div>

          <Calendar
            mode="range"
            startDate={customStart}
            endDate={customEnd}
            onSelectRange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
            maxDate={new Date().toISOString().split('T')[0]}
            showPresets={true}
          />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-semibold text-xs"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                if (!customStart || !customEnd) return;
                onChange(computePeriodDates('custom', customStart, customEnd));
                setIsCustomOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-xs"
            >
              Appliquer la période
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
