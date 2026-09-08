'use client';

import { useState, useEffect } from 'react';
import { Plan, TokenPack } from './types';
import { DEFAULT_PLANS, DEFAULT_TOKEN_PACKS } from './plansData';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>(DEFAULT_TOKEN_PACKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchPlans() {
      try {
        const res = await fetch('/api/plans');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
          if (Array.isArray(data.tokenPacks) && data.tokenPacks.length > 0) {
            setTokenPacks(data.tokenPacks);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Impossible de synchroniser avec l’API plans');
          // Utilise DEFAULT_PLANS en fallback immédiat
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  return { plans, tokenPacks, loading, error };
}
