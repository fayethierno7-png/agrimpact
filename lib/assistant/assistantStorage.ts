/**
 * GESTION DU STOCKAGE LOCAL DES CONVERSATIONS ASSISTANT IA
 * Prise en charge de la persistance, de la recherche, de l'épinglage et des feedbacks
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'like' | 'dislike' | null;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'agrimpact_ai_conversations';
const ACTIVE_CONV_KEY = 'agrimpact_ai_active_conv_id';

// Exemples pré-chargés réalistes pour la première ouverture
const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-seed-1',
    title: 'Conseil maïs & fertilisation',
    createdAt: '2026-09-06T14:30:00.000Z',
    updatedAt: '2026-09-06T14:35:00.000Z',
    isPinned: false,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Quels sont les besoins en eau du maïs pendant la floraison à Thiès ?',
        timestamp: '2026-09-06T14:30:00.000Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Je peux vous aider à analyser les besoins de votre culture, mais **ce conseil ne remplace pas l'avis d'un conseiller agricole de terrain**.

À Thiès, la floraison mâle et l'apparition des soies (vers J+55) constitue le **stade le plus critique du maïs** :
- **Consommation hydrique** : 6 à 8 mm/jour par temps chaud.
- **Risque** : Tout déficit hydrique supérieur à 4 jours entraîne un avortement floral et une baisse de rendement de 40 à 60%.
- **Action recommandée** : Maintenez une irrigation régulière aux heures fraîches (avant 8h ou après 18h).`,
        timestamp: '2026-09-06T14:31:00.000Z',
        feedback: 'like',
      },
    ],
  },
  {
    id: 'conv-seed-2',
    title: 'Vigilance Mildiou Oignon (Kayar)',
    createdAt: '2026-09-05T09:15:00.000Z',
    updatedAt: '2026-09-05T09:20:00.000Z',
    isPinned: false,
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Dois-je traiter contre le mildiou de l\'oignon aujourd\'hui ?',
        timestamp: '2026-09-05T09:15:00.000Z',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Rappel préalable : **consultez la Direction de la Protection des Végétaux (DPV) pour la validation du produit de traitement**.

Pour la zone de Kayar (Niayes) :
- **Hygrométrie nocturne** : modélisée à 92% à J+2 et J+3 (risque d'infection fongique élevé).
- **Fenêtre recommandée** : Traitez préventivement demain matin entre **06h30 et 09h00** (vent calme < 10 km/h, zéro pluie annoncée dans les 24h).`,
        timestamp: '2026-09-05T09:16:00.000Z',
      },
    ],
  },
  {
    id: 'conv-seed-3',
    title: 'Cycle de l\'arachide 55-437',
    createdAt: '2026-09-03T16:00:00.000Z',
    updatedAt: '2026-09-03T16:05:00.000Z',
    isPinned: false,
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'À quel moment la variété 55-437 forme-t-elle ses gousses ?',
        timestamp: '2026-09-03T16:00:00.000Z',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: `La variété d'arachide **55-437** (sélectionnée par l'ISRA pour le bassin arachidier) a un cycle court de 90 jours :
- **Gynophorisation** : débute entre J+40 et J+45.
- **Remplissage des gousses** : J+50 à J+75. Le sol doit rester meuble pour favoriser l'enfouissement.`,
        timestamp: '2026-09-03T16:01:00.000Z',
      },
    ],
  },
];

export function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return SEED_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONVERSATIONS));
      return SEED_CONVERSATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture conversations locales:', e);
    return SEED_CONVERSATIONS;
  }
}

export function saveAllConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Erreur sauvegarde conversations:', e);
  }
}

export function getActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_CONV_KEY);
}

export function setActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_CONV_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONV_KEY);
  }
}

export function createNewConversation(initialTitle: string = 'Nouvelle conversation'): Conversation {
  const newConv: Conversation = {
    id: 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    title: initialTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    messages: [],
  };

  const current = getStoredConversations();
  const updated = [newConv, ...current];
  saveAllConversations(updated);
  setActiveConversationId(newConv.id);
  return newConv;
}

export function deleteConversation(id: string): void {
  const current = getStoredConversations();
  const filtered = current.filter((c) => c.id !== id);
  saveAllConversations(filtered);

  if (getActiveConversationId() === id) {
    const nextActive = filtered[0]?.id || null;
    setActiveConversationId(nextActive);
  }
}

export function renameConversation(id: string, newTitle: string): void {
  const current = getStoredConversations();
  const updated = current.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c));
  saveAllConversations(updated);
}

export function togglePinConversation(id: string): boolean {
  const current = getStoredConversations();
  let newPinnedState = false;
  const updated = current.map((c) => {
    if (c.id === id) {
      newPinnedState = !c.isPinned;
      return { ...c, isPinned: newPinnedState, updatedAt: new Date().toISOString() };
    }
    return c;
  });
  saveAllConversations(updated);
  return newPinnedState;
}

export function addMessageToConversation(convId: string, message: ChatMessage): Conversation | null {
  const current = getStoredConversations();
  let updatedConv: Conversation | null = null;

  const updated = current.map((c) => {
    if (c.id === convId) {
      // Si c'est le 1er message utilisateur, mettre à jour le titre automatiquement
      let newTitle = c.title;
      if (c.messages.length === 0 && message.role === 'user') {
        newTitle = message.content.slice(0, 32) + (message.content.length > 32 ? '...' : '');
      }

      updatedConv = {
        ...c,
        title: newTitle,
        updatedAt: new Date().toISOString(),
        messages: [...c.messages, message],
      };
      return updatedConv;
    }
    return c;
  });

  saveAllConversations(updated);
  return updatedConv;
}

export function updateMessageFeedback(convId: string, messageId: string, feedback: 'like' | 'dislike' | null): void {
  const current = getStoredConversations();
  const updated = current.map((c) => {
    if (c.id === convId) {
      return {
        ...c,
        messages: c.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
      };
    }
    return c;
  });
  saveAllConversations(updated);
}

export function searchConversations(query: string): Conversation[] {
  if (!query || query.trim() === '') return getStoredConversations();
  const q = query.toLowerCase().trim();
  const all = getStoredConversations();

  return all.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });
}
