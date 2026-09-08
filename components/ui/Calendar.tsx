'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type?: 'irrigation' | 'fertilisation' | 'sanitaire' | 'meteo' | 'recolte' | 'semis';
  label?: string;
}

export interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: string; // YYYY-MM-DD
  onSelect?: (date: string) => void;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  onSelectRange?: (start: string, end: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  events?: CalendarEvent[];
  showPresets?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Helper pour formater une date en YYYY-MM-DD localement (sans décalage UTC)
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper pour parser une chaîne YYYY-MM-DD
export function parseDateISO(str?: string): Date | null {
  if (!str) return null;
  const parts = str.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  startDate,
  endDate,
  onSelectRange,
  minDate,
  maxDate,
  events = [],
  showPresets = false,
  className = '',
}) => {
  // Date de référence pour le mois actuellement affiché
  const initialDate = useMemo(() => {
    if (selected) {
      const parsed = parseDateISO(selected);
      if (parsed) return parsed;
    }
    if (startDate) {
      const parsed = parseDateISO(startDate);
      if (parsed) return parsed;
    }
    return new Date();
  }, [selected, startDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-11
  const [rangeSelectingStart, setRangeSelectingStart] = useState<string | null>(null);

  const todayStr = formatDateISO(new Date());

  // Navigation mois
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    if (mode === 'single' && onSelect) {
      onSelect(formatDateISO(now));
    }
  };

  // Calcul de la grille des jours du mois
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // En France/Sénégal, la semaine commence le Lundi (1). Dimanche = 0 -> 7
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Dimanche devient 7
    const offsetBefore = startDayOfWeek - 1; // Nombre de jours du mois précédent

    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
    }[] = [];

    // Jours du mois précédent
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = offsetBefore - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const str = formatDateISO(prevDate);
      days.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    // Jours du mois en cours
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const str = formatDateISO(date);
      const isBeforeMin = minDate ? str < minDate : false;
      const isAfterMax = maxDate ? str > maxDate : false;

      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: true,
        isDisabled: isBeforeMin || isAfterMax,
      });
    }

    // Jours du mois suivant pour compléter la dernière semaine (multiple de 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(currentYear, currentMonth + 1, n);
      const str = formatDateISO(nextDate);
      days.push({
        dateStr: str,
        dayNumber: n,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    return days;
  }, [currentYear, currentMonth, minDate, maxDate]);

  // Index des événements par date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  // Gestion de clic sur un jour
  const handleDayClick = (dayStr: string, isDisabled: boolean) => {
    if (isDisabled) return;

    if (mode === 'single') {
      if (onSelect) onSelect(dayStr);
    } else if (mode === 'range') {
      if (!rangeSelectingStart) {
        setRangeSelectingStart(dayStr);
      } else {
        let start = rangeSelectingStart;
        let end = dayStr;
        if (start > end) {
          const tmp = start;
          start = end;
          end = tmp;
        }
        setRangeSelectingStart(null);
        if (onSelectRange) onSelectRange(start, end);
      }
    }
  };

  // Helper pour les badges d'événements
  const getEventDotColor = (type?: string) => {
    switch (type) {
      case 'irrigation':
        return 'bg-blue-500';
      case 'fertilisation':
        return 'bg-emerald-500';
      case 'sanitaire':
        return 'bg-rose-500';
      case 'meteo':
        return 'bg-amber-500';
      case 'semis':
        return 'bg-amber-600';
      case 'recolte':
        return 'bg-purple-500';
      default:
        return 'bg-emerald-600';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-lg text-stone-900 dark:text-stone-100 select-none ${className}`}
    >
      {/* Barre Supérieure : Navigation Mois & Année */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="text-sm font-extrabold tracking-tight">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTodayJump}
            className="px-2 py-1 text-[11px] font-bold rounded-lg text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-colors"
            title="Aller à aujourd'hui"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Raccourcis / Presets optionnels */}
      {showPresets && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-[11px] font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => {
              const today = formatDateISO(new Date());
              if (mode === 'single' && onSelect) onSelect(today);
              if (mode === 'range' && onSelectRange) onSelectRange(today, today);
            }}
            className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:text-emerald-800 transition-colors shrink-0"
          >
            Aujourd&apos;hui
          </button>

          {mode === 'range' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  if (onSelectRange) onSelectRange(formatDateISO(start), formatDateISO(end));
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:text-emerald-800 transition-colors shrink-0"
              >
                7 derniers jours
              </button>
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  if (onSelectRange) onSelectRange(formatDateISO(start), formatDateISO(end));
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:text-emerald-800 transition-colors shrink-0"
              >
                30 derniers jours
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  if (onSelectRange) onSelectRange(formatDateISO(start), formatDateISO(end));
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:text-emerald-800 transition-colors shrink-0"
              >
                Ce mois-ci
              </button>
            </>
          )}
        </div>
      )}

      {/* En-tête des jours de la semaine (Lun, Mar, ...) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 py-1"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarGrid.map((item, idx) => {
          const isToday = item.dateStr === todayStr;
          const isSingleSelected = mode === 'single' && selected === item.dateStr;

          // États pour la sélection par plage
          const effectiveStart = rangeSelectingStart || startDate;
          const effectiveEnd = rangeSelectingStart ? rangeSelectingStart : endDate;
          const isRangeStart = mode === 'range' && effectiveStart === item.dateStr;
          const isRangeEnd = mode === 'range' && effectiveEnd === item.dateStr;
          const isInRange =
            mode === 'range' &&
            effectiveStart &&
            effectiveEnd &&
            effectiveStart <= effectiveEnd &&
            item.dateStr >= effectiveStart &&
            item.dateStr <= effectiveEnd;

          const dayEvents = eventsByDate.get(item.dateStr);

          // Styles conditionnels du bouton de jour
          let buttonClasses =
            'h-9 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all ';

          if (item.isDisabled) {
            buttonClasses +=
              'text-stone-300 dark:text-stone-700 cursor-not-allowed opacity-40 hover:bg-transparent';
          } else if (isSingleSelected || isRangeStart || isRangeEnd) {
            buttonClasses +=
              'bg-emerald-800 text-white font-black shadow-xs ring-2 ring-emerald-600/30 scale-105 z-10 cursor-pointer';
          } else if (isInRange) {
            buttonClasses +=
              'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold rounded-none cursor-pointer';
          } else if (isToday) {
            buttonClasses +=
              'text-emerald-800 dark:text-emerald-400 font-extrabold border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 cursor-pointer';
          } else {
            buttonClasses +=
              'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer';
          }

          return (
            <button
              key={`${item.dateStr}-${idx}`}
              type="button"
              disabled={item.isDisabled}
              onClick={() => handleDayClick(item.dateStr, item.isDisabled)}
              className={buttonClasses}
              title={
                dayEvents && dayEvents.length > 0
                  ? `${item.dateStr} : ${dayEvents.map((e) => e.label || e.type).join(', ')}`
                  : item.dateStr
              }
            >
              <span>{item.dayNumber}</span>

              {/* Indicateur de pastilles d'événements agronomiques */}
              {dayEvents && dayEvents.length > 0 && !item.isDisabled && (
                <div className="flex items-center gap-0.5 mt-0.5 absolute bottom-1">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        isSingleSelected || isRangeStart || isRangeEnd
                          ? 'bg-white'
                          : getEventDotColor(ev.type)
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
