/**
 * Validation des variables d'environnement critiques au démarrage
 * Empêche l'exécution silencieuse avec des configurations non sécurisées.
 */

interface EnvConfig {
  name: string;
  required: boolean;
  isSecret: boolean;
  description: string;
}

const ENV_SPECS: EnvConfig[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    isSecret: false,
    description: 'URL du projet Supabase',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    isSecret: false,
    description: 'Clé publique anon Supabase',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    isSecret: true,
    description: 'Clé service_role Supabase (nécessaire pour les opérations admin/webhook)',
  },
  {
    name: 'SESSION_SECRET',
    required: false,
    isSecret: true,
    description: 'Clé secrète de signature HMAC des sessions agri_session',
  },
  {
    name: 'UNITECHPAY_WEBHOOK_SECRET',
    required: false,
    isSecret: true,
    description: 'Secret de validation des webhooks UnitechPay',
  },
  {
    name: 'GROQ_API_KEY',
    required: false,
    isSecret: true,
    description: 'Clé API Groq pour le modèle IA agronomique',
  },
];

let validated = false;

export function validateEnvironment(): { valid: boolean; warnings: string[]; errors: string[] } {
  if (validated) {
    return { valid: true, warnings: [], errors: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name];

    if (!value || value.trim() === '') {
      if (spec.required) {
        errors.push(`Variable obligatoire manquante: ${spec.name} (${spec.description})`);
      } else if (process.env.NODE_ENV === 'production') {
        warnings.push(`Variable recommandée non définie en production: ${spec.name} (${spec.description})`);
      }
    } else if (spec.isSecret && spec.name.startsWith('NEXT_PUBLIC_')) {
      errors.push(`ALERTE DE SÉCURITÉ: Secret sensible exposé avec préfixe public: ${spec.name}`);
    }
  }

  if (errors.length > 0) {
    console.error('🚨 [ENV] Erreurs de configuration environnementales:', errors);
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [ENV] Avertissements de sécurité configuration:', warnings);
  }

  validated = true;
  return { valid: errors.length === 0, warnings, errors };
}

// Exécution de la validation au premier import
validateEnvironment();
