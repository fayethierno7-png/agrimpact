export interface SenegalRegion {
  nom: string;
  code: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const SENEGAL_REGIONS: SenegalRegion[] = [
  { nom: 'Thiès', code: 'TH', latitude: 14.7910, longitude: -16.9256, description: 'Zone maraîchère des Niayes & arboriculture' },
  { nom: 'Saint-Louis', code: 'SL', latitude: 16.0326, longitude: -16.4818, description: 'Vallée du Fleuve Sénégal (Riz, Tomate)' },
  { nom: 'Dakar (Niayes)', code: 'DK', latitude: 14.7167, longitude: -17.4677, description: 'Ceinture maraîchère périurbaine' },
  { nom: 'Kaolack', code: 'KL', latitude: 14.1500, longitude: -16.0833, description: 'Bassin arachidier & céréales' },
  { nom: 'Fatick', code: 'FK', latitude: 14.3333, longitude: -16.4000, description: 'Arachide, mil et maraîchage' },
  { nom: 'Louga', code: 'LG', latitude: 15.6186, longitude: -16.2244, description: 'Niayes nord & pastoralisme' },
  { nom: 'Kolda', code: 'KD', latitude: 12.8833, longitude: -14.9500, description: 'Haute Casamance (Céréales, Coton, Banane)' },
  { nom: 'Ziguinchor', code: 'ZG', latitude: 12.5833, longitude: -16.2667, description: 'Basse Casamance (Riziculture, Vergers)' },
  { nom: 'Matam', code: 'MT', latitude: 15.6559, longitude: -13.2554, description: 'Vallée du fleuve (Cultures irriguées)' },
  { nom: 'Tambacounda', code: 'TC', latitude: 13.7689, longitude: -13.6672, description: 'Sénégal oriental (Coton, Maïs, Sorgho)' },
  { nom: 'Kédougou', code: 'KG', latitude: 12.5564, longitude: -12.1747, description: 'Zone humide sud-est' },
  { nom: 'Kaffrine', code: 'KF', latitude: 14.1059, longitude: -15.5508, description: 'Cœur du bassin arachidier' },
  { nom: 'Sédhiou', code: 'SD', latitude: 12.7081, longitude: -15.5569, description: 'Moyenne Casamance' },
  { nom: 'Diourbel', code: 'DB', latitude: 14.6553, longitude: -16.2317, description: 'Bassin arachidier ouest' }
];

export interface CropPreset {
  id: string;
  nom: string;
  varieteDefaut: string;
  dureeCycleJours: number;
  eauBesoin: 'faible' | 'moyen' | 'eleve';
  stades: { nom: string; debutJour: number; finJour: number; description: string }[];
}

export const CROPS_PRESETS: Record<string, CropPreset> = {
  Oignon: {
    id: 'Oignon',
    nom: 'Oignon',
    varieteDefaut: 'Violet de Galmi',
    dureeCycleJours: 90,
    eauBesoin: 'moyen',
    stades: [
      { nom: 'Levée & Reprise', debutJour: 0, finJour: 15, description: 'Humidité régulière requise' },
      { nom: 'Développement végétatif', debutJour: 16, finJour: 35, description: 'Croissance foliaire' },
      { nom: 'Bulbaison', debutJour: 36, finJour: 70, description: 'Formation des bulbes, sensible au lessivage' },
      { nom: 'Maturation & Arrêt d\'eau', debutJour: 71, finJour: 90, description: 'Diminution drastique des irrigations' }
    ]
  },
  Tomate: {
    id: 'Tomate',
    nom: 'Tomate',
    varieteDefaut: 'Mongal F1',
    dureeCycleJours: 85,
    eauBesoin: 'eleve',
    stades: [
      { nom: 'Reprise', debutJour: 0, finJour: 12, description: 'Enracinement initial' },
      { nom: 'Végétation', debutJour: 13, finJour: 35, description: 'Ramification et tuteurage' },
      { nom: 'Floraison & Nouaison', debutJour: 36, finJour: 60, description: 'Sensible aux à-coups hydriques' },
      { nom: 'Récolte continue', debutJour: 61, finJour: 85, description: 'Maturation des fruits' }
    ]
  },
  'Maïs': {
    id: 'Maïs',
    nom: 'Maïs',
    varieteDefaut: 'Pannar / TZEE',
    dureeCycleJours: 95,
    eauBesoin: 'moyen',
    stades: [
      { nom: 'Levée', debutJour: 0, finJour: 10, description: 'Stade plantule' },
      { nom: 'Croissance foliaire', debutJour: 11, finJour: 40, description: 'Élongation de la tige' },
      { nom: 'Floraison / Épiaison', debutJour: 41, finJour: 65, description: 'Période critique sans stress hydrique' },
      { nom: 'Remplissage du grain', debutJour: 66, finJour: 95, description: 'Maturation' }
    ]
  },
  Arachide: {
    id: 'Arachide',
    nom: 'Arachide',
    varieteDefaut: '55-437 / 73-33',
    dureeCycleJours: 90,
    eauBesoin: 'faible',
    stades: [
      { nom: 'Levée', debutJour: 0, finJour: 10, description: 'Apparition des premières feuilles' },
      { nom: 'Floraison', debutJour: 11, finJour: 35, description: 'Fleurs jaunes et gynophores' },
      { nom: 'Fructification', debutJour: 36, finJour: 70, description: 'Pénétration des gousses en terre' },
      { nom: 'Maturation', debutJour: 71, finJour: 90, description: 'Dessèchement foliaire' }
    ]
  },
  Piment: {
    id: 'Piment',
    nom: 'Piment',
    varieteDefaut: 'Scotch Bonnet / Antillais',
    dureeCycleJours: 110,
    eauBesoin: 'moyen',
    stades: [
      { nom: 'Reprise', debutJour: 0, finJour: 15, description: 'Installation des plants' },
      { nom: 'Végétation', debutJour: 16, finJour: 45, description: 'Buissonnement' },
      { nom: 'Floraison & Fruits', debutJour: 46, finJour: 80, description: 'Charge en fruits' },
      { nom: 'Récolte', debutJour: 81, finJour: 110, description: 'Cueillete échelonnée' }
    ]
  }
};
