'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Calendar, parseDateISO } from './Calendar';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date',
  minDate,
  maxDate,
  required = false,
  disabled = false,
  className = '',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Formatage d'affichage en français (ex : "15 sept. 2026")
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const date = parseDateISO(value);
    if (!date) return value;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [value]);

  // Fermeture au clic à l'extérieur
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

  const handleSelect = (selectedDate: string) => {
    onChange(selectedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Champ Déclencheur UI */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs select-none ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-white dark:bg-stone-800'
            : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-stone-900' : ''}`}
        tabIndex={0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isOpen || value
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          />
          <span
            className={`truncate font-medium ${
              value
                ? 'text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            {displayValue || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              title="Effacer la date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">{helperText}</p>
      )}

      {/* Popover Calendrier SaaS */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            minDate={minDate}
            maxDate={maxDate}
            showPresets={true}
          />
        </div>
      )}
    </div>
  );
};
