/**
 * Utilitaires légers de validation d'entrées API côté serveur
 * Permet de garantir l'intégrité des payloads sans dépendance externe.
 */

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

/**
 * Valide un objet selon un ensemble de règles simples
 */
export function validateObject<T extends Record<string, any>>(
  data: any,
  rules: { [K in keyof T]?: ValidationRule<any>[] }
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { isValid: false, errors: { _body: 'Le corps de la requête doit être un objet JSON valide' } };
  }

  for (const field in rules) {
    const fieldRules = rules[field];
    if (!fieldRules) continue;

    const value = data[field];
    for (const rule of fieldRules) {
      if (!rule.validate(value)) {
        errors[field] = rule.message;
        break;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Règles réutilisables
export const v = {
  requiredString: (name: string, min = 1, max = 255): ValidationRule<any> => ({
    validate: (val) => typeof val === 'string' && val.trim().length >= min && val.trim().length <= max,
    message: `${name} doit être une chaîne valide entre ${min} et ${max} caractères`,
  }),

  optionalString: (name: string, max = 255): ValidationRule<any> => ({
    validate: (val) => val === undefined || val === null || (typeof val === 'string' && val.length <= max),
    message: `${name} ne doit pas dépasser ${max} caractères`,
  }),

  positiveNumber: (name: string, max = 100_000): ValidationRule<any> => ({
    validate: (val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0 && num <= max;
    },
    message: `${name} doit être un nombre positif supérieur à 0 (max ${max})`,
  }),

  email: (): ValidationRule<any> => ({
    validate: (val) => typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
    message: 'Adresse email invalide',
  }),

  enumValue: <T extends string>(name: string, allowed: readonly T[]): ValidationRule<any> => ({
    validate: (val) => allowed.includes(val),
    message: `${name} doit être l'une des valeurs suivantes: ${allowed.join(', ')}`,
  }),
};
