import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '../supabase/client';
import { verifySessionToken } from './sessionSigner';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  nom?: string;
  role?: string;
  statut_compte?: string;
  statut_abonnement?: string;
  date_limite_grace?: string | null;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Vérifier le cookie de session httpOnly agri_session avec vérification HMAC
  const sessionCookie = req.cookies.get('agri_session')?.value;
  if (sessionCookie) {
    const data = await verifySessionToken(sessionCookie);
    if (data && data.userId) {
      return {
        id: data.userId,
        email: data.email,
        nom: data.nom,
        role: data.role || 'producteur',
        statut_compte: data.statut_compte || 'actif',
        statut_abonnement: data.statut_abonnement || 'actif',
        date_limite_grace: data.date_limite_grace,
      };
    }
  }

  // 2. Vérifier l'en-tête Authorization (Bearer token) ou cookies Supabase
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const serverClient = getSupabaseServerClient(authHeader);
      if (serverClient) {
        const { data, error } = await serverClient.auth.getUser();
        if (!error && data?.user) {
          const userMeta = data.user.user_metadata || {};
          return {
            id: data.user.id,
            email: data.user.email,
            nom: userMeta.nom || data.user.email?.split('@')[0],
            role: userMeta.role || 'producteur',
            statut_compte: 'actif',
            statut_abonnement: 'actif',
          };
        }
      }
    } catch (e) {
      console.warn('Erreur vérification Supabase auth:', e);
    }
  }

  return null;
}
