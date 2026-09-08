'use client';

import React from 'react';

interface SkeletonCardProps {
  variant?: 'card' | 'weather' | 'advice' | 'list';
  className?: string;
}

export default function SkeletonCard({ variant = 'card', className = '' }: SkeletonCardProps) {
  if (variant === 'weather') {
    return (
      <div className={`p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="h-4 w-36 bg-stone-200 dark:bg-stone-800 rounded-md" />
          <div className="h-6 w-20 bg-stone-200 dark:bg-stone-800 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-stone-200 dark:bg-stone-800 rounded-md" />
              <div className="h-7 w-24 bg-stone-200 dark:bg-stone-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'advice') {
    return (
      <div className={`p-6 sm:p-7 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs animate-pulse space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-28 bg-stone-200 dark:bg-stone-800 rounded-md" />
            <div className="h-5 w-64 bg-stone-200 dark:bg-stone-800 rounded-md" />
          </div>
        </div>
        <div className="h-16 w-full bg-stone-100 dark:bg-stone-800/60 rounded-2xl" />
        <div className="h-10 w-44 bg-stone-200 dark:bg-stone-800 rounded-xl" />
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-800" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-stone-200 dark:bg-stone-800 rounded-md" />
                <div className="h-3 w-24 bg-stone-200 dark:bg-stone-800 rounded-md" />
              </div>
            </div>
            <div className="h-6 w-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xs animate-pulse space-y-3 ${className}`}>
      <div className="h-4 w-32 bg-stone-200 dark:bg-stone-800 rounded-md" />
      <div className="h-8 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg" />
      <div className="h-3 w-full bg-stone-200 dark:bg-stone-800 rounded-md" />
    </div>
  );
}
