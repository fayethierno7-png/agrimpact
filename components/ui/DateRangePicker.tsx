'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { Calendar, parseDateISO } from './Calendar';

export interface DateRangePickerProps {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  onChangeRange: (start: string, end: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChangeRange,
  label,
  minDate,
  maxDate,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatFrench = (iso?: string) => {
    if (!iso) return '';
    const d = parseDateISO(iso);
    if (!d) return iso;
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const displayLabel = React.useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatFrench(startDate);
      return `Du ${formatFrench(startDate)} au ${formatFrench(endDate)}`;
    }
    if (startDate) return `Depuis le ${formatFrench(startDate)}`;
    return 'Sélectionner une période';
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRangeSelect = (start: string, end: string) => {
    onChangeRange(start, end);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
          {label}
        </label>
      )}

      {/* Bouton déclencheur */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-2xs ${
          isOpen
            ? 'border-emerald-600 bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-600/20'
            : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-stone-400 transition-transform ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Popover Calendrier SaaS */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-88 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <Calendar
            mode="range"
            startDate={startDate}
            endDate={endDate}
            onSelectRange={handleRangeSelect}
            minDate={minDate}
            maxDate={maxDate}
            showPresets={true}
          />
        </div>
      )}
    </div>
  );
};
