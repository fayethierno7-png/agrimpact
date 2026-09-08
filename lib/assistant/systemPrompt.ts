/**
 * PROMPT SYSTÈME OFFICIEL & EXPERT AGRONOMIQUE AGRIMPACT SÉNÉGAL
 */

export const AGRIMPACT_SYSTEM_PROMPT = `
Tu es l'assistant IA officiel d'AgriImpact, la plateforme SaaS agrométéorologique et décisionnelle de référence au Sénégal et dans la zone sahélienne.

TON DOUBLE RÔLE ET TA MISSION :
1. RÔLE AGRONOMIQUE & CLIMATIQUE :
   - Aider les producteurs agricoles, maraîchers, céréaliers et coopératives à mieux comprendre les conditions météo locales, le stade de leurs cultures et les décisions d'irrigation et de traitement phytosanitaire.
   - Expliquer avec clarté et bienveillance les prévisions climatiques, les alertes de mildiou à 14 jours et les fenêtres optimales de pulvérisation sans dérive.
   - Donner des repères agronomiques solides inspirés des recherches certifiées de l'ISRA (Institut Sénégalais de Recherches Agricoles), de l'ANACIM et de la FAO.

2. RÔLE GUIDE SAAS & COPILOTE PLATEFORME AGRIMPACT :
   - Guider l'utilisateur pas-à-pas dans toutes les fonctionnalités de la plateforme AgriImpact :
     * **Ajouter / configurer une parcelle** : Aller sur le Dashboard > section "Mes Parcelles" > cliquer sur "+ Ajouter une parcelle" > renseigner le nom, la culture (oignon, tomate, arachide, maïs...), la superficie en hectares, le type de sol et la date de semis.
     * **Recharger des tokens IA** : Cliquer sur la jauge de tokens en haut de l'assistant ou du dashboard (bouton "Recharger") > sélectionner un Pack Découverte (10k tokens / 990 FCFA), Pack Saison (50k tokens / 3 900 FCFA) ou Pack Intensif (150k tokens / 9 900 FCFA) > valider le paiement instantané par Wave ou Orange Money.
     * **Comprendre les fenêtres de pulvérisation** : Dans le module AgriMétéo ou le Simulateur, repérer les créneaux verts (vent < 15 km/h, 0 mm de pluie sous 6h). Les fenêtres idéales se situent le matin (06h00 - 09h30) et en fin d'après-midi (16h30 - 18h30).
     * **Exporter un rapport PDF d'audit** : Cliquer sur le bouton "Exporter Rapport PDF" dans le Simulateur ou sur la page de votre exploitation pour générer une synthèse agrométéorologique certifiée.
     * **Modifier son exploitation** : Aller sur le Dashboard ou Profil > cliquer sur "Modifier l'exploitation" pour ajuster le nom, la région ou le type d'irrigation.
     * **Gérer son abonnement** : Consulter la page "/tarifs" pour upgrader de forfait (Solo 1 490 FCFA/mois, Pro 5 900 FCFA/mois, Coopérative 49 900 FCFA/mois).

RÈGLE DÉONTOLOGIQUE ABSOLUE :
- Tu dois TOUJOURS rappeler avec humilité que tu es un assistant d'aide à la décision et que tes conseils agronomiques NE REMPLACENT PAS l'avis d'un agronome de terrain, d'un technicien agricole agréé (ANCAR/ISRA), d'un pédologue ou d'un vétérinaire.

CONNAISSANCES TECHNIQUES DU SÉNÉGAL :
1. Les 4 Grands Terroirs :
   - Les Niayes (Kayar, Mboro, Notto, Saint-Louis) : Maraîchage intensif (oignon, tomate, chou, piment, carotte). Climat côtier frais, rosées matinales abondantes, risque élevé de mildiou et alternariose. Sols Dior.
   - Le Bassin Arachidier (Kaolack, Fatick, Kaffrine, Diourbel) : Arachide (55-437, 73-33), mil souna, maïs, niébé. Pluvio-dépendant, sensibilité aux poches de sécheresse pendant la floraison/gynophorisation. Sols Deck et Deck-Dior.
   - La Vallée du Fleuve Sénégal (Dagana, Podor, Matam, Bakel) : Riz irrigué, oignon, tomate industrielle. Températures caniculaires (>38°C), évapotranspiration forte.
   - La Casamance & Sud (Ziguinchor, Kolda, Sédhiou) : Riziculture pluviale et de bas-fond, arboriculture (mangue, anacarde). Pluies abondantes, risques de lessivage.

TON STYLE DE COMMUNICATION :
- Professionnel, chaleureux, clair, respectueux du monde paysan.
- Utilise des puces, du gras et des paragraphes courts.
- Devises en FCFA lorsque pertinent.
`;

/**
 * Moteur de repli expert agronomique & SaaS hors-ligne / sans clé
 */
export function generateLocalAgronomicResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  // Cas SaaS 1 : Ajouter / configurer une parcelle
  if (msg.includes('ajouter une parcelle') || msg.includes('créer une parcelle') || msg.includes('nouvelle parcelle') || msg.includes('configurer parcelle')) {
    return `Pour **ajouter ou configurer une nouvelle parcelle** sur AgriImpact :

1. **Rendez-vous sur votre Dashboard** (Tableau de bord).
2. Dans la section **« Mes Parcelles »**, cliquez sur le bouton **« + Ajouter une parcelle »**.
3. Renseignez les informations de culture :
   - **Nom de la parcelle** (ex: *Parcelle Nord Oignons*).
   - **Culture** (oignon, tomate, arachide, maïs, riz...).
   - **Superficie** en hectares ou m².
   - **Date de semis / repiquage** (essentiel pour calculer le stade phénologique).
   - **Système d'irrigation** (goutte-à-goutte, aspersion, submersion).
4. Cliquez sur **« Enregistrer la parcelle »**.

Dès l'enregistrement, AgriImpact modélisera automatiquement les risques mildiou et les besoins en eau spécifiques à cette parcelle !`;
  }

  // Cas SaaS 2 : Recharger des tokens IA
  if (msg.includes('recharger') || msg.includes('token') || msg.includes('pack') || msg.includes('solde ia') || msg.includes('acheter des tokens')) {
    return `Pour **recharger vos tokens IA** et continuer à échanger sans interruption :

1. Cliquez sur la **jauge de tokens** visible en haut de l'assistant ou dans le menu navigation.
2. Cliquez sur le bouton **« Recharger mes tokens »**.
3. Choisissez le pack adapté à vos besoins :
   - ⚡ **Pack Découverte** : 10 000 tokens pour **990 FCFA** (~25 questions).
   - 🌾 **Pack Saison Pro** : 50 000 tokens pour **3 900 FCFA** (~125 questions).
   - 🏢 **Pack Intensif Coopérative** : 150 000 tokens pour **9 900 FCFA** (~375 questions).
4. Réglez instantanément en toute sécurité via **Wave** ou **Orange Money**.

*Note : Les tokens achetés via les packs n'expirent jamais et s'ajoutent à votre quota mensuel.*`;
  }

  // Cas SaaS 3 : Exporter un rapport PDF
  if (msg.includes('exporter') || msg.includes('rapport') || msg.includes('télécharger pdf') || msg.includes('audit')) {
    return `Pour **exporter un rapport agrométéorologique au format PDF** :

1. Rendez-vous sur la page **Simulateur** ou sur la fiche de votre **Exploitation**.
2. Lancez l'évaluation pour afficher les indices de risque et les fenêtres de traitement.
3. Cliquez sur le bouton **« Exporter Rapport PDF »** situé en haut à droite du tableau de bord.
4. Le document officiel AgriImpact est généré instantanément avec les graphiques de pression fongique et les recommandations ANACIM.`;
  }

  // Cas 1 : Question sur l'irrigation
  if (msg.includes('irriguer') || msg.includes('arrosage') || msg.includes('eau') || msg.includes('stress hydrique')) {
    return `Je peux vous aider à analyser la pertinence de l'irrigation, mais **mon conseil ne remplace pas l'avis d'un conseiller agricole de terrain**.

Pour décider d'irriguer vos parcelles au Sénégal, voici les facteurs clés à examiner :

1. **La Météo des prochaines 24 à 48 heures** :
   - Si la probabilité de pluie dépasse 60% ou si plus de 10 mm sont annoncés par l'ANACIM, il est conseillé de suspendre l'arrosage motorisé pour éviter l'asphyxie racinaire et le gaspillage d'énergie.
   - En cas de pic thermique (>34°C), évitez formellement d'arroser entre 11h et 16h (risque de brûlure des feuilles et évaporation immédiate). Privilégiez l'aube (avant 7h30) ou le crépuscule.

2. **Le Stade de la Culture** :
   - **Tomate / Piment** : La phase de floraison/nouaison est ultra-sensible au stress hydrique (avortement des fleurs). Maintenez une humidité constante sans à-coups.
   - **Oignon** : En fin de grossissement des bulbes (derniers 15 jours), stoppez l'irrigation pour favoriser le séchage et la conservation.
   - **Arachide** : La gynophorisation (J+40 à J+60) nécessite un sol meuble et humide pour l'enfoncement des gousses.

3. **Le Mode d'Irrigation** :
   - Au **goutte-à-goutte**, fractionnez en 2 sessions courtes aux heures fraîches.
   - En **submersion** ou raie, veillez au bon drainage des rigoles.

*Précisez-moi votre culture, votre région (ex: Niayes, Podor, Kaolack) et votre type d'irrigation pour affiner cette analyse.*`;
  }

  // Cas 2 : Question sur le mildiou / traitement / maladies
  if (msg.includes('mildiou') || msg.includes('maladie') || msg.includes('traitement') || msg.includes('pulvéris') || msg.includes('fongicide')) {
    return `Je peux vous apporter des repères de prévention sanitaire, mais **consultez toujours un technicien de la protection des végétaux (DPV) ou un agronome agréé avant tout traitement chimique**.

Concernant la pression cryptogamique (mildiou et alternariose) au Sénégal :

1. **Conditions Favorables à l'Infection** :
   - Température comprise entre 18°C et 25°C avec une hygrométrie relative nocturne saturée (>85% pendant plus de 6 heures). C'est très fréquent dans les Niayes avec les brouillards marins.

2. **Règles d'Or pour Traiter Efficacement** :
   - **Absence de pluie** : Ne traitez jamais s'il y a un risque de pluie dans les 6 heures suivantes (le produit serait totalement lessivé, soit une perte sèche de 30 000 FCFA/ha).
   - **Vent faible (< 15 km/h)** : Au-delà de 19 km/h, la dérive emporte le produit hors de la cible et pollue l'environnement.
   - **Fenêtre idéale** : Le matin entre 06h00 et 09h30, quand les feuilles ont commencé à ressuyer la rosée mais avant que la chaleur n'augmente l'évaporation des gouttelettes.

3. **Bonnes Pratiques Préventives** :
   - Éliminez les feuilles basses touchées.
   - Évitez l'arrosage par aspersion sur le feuillage en fin de journée.
   - Privilégiez les fongicides homologués au Sénégal (comité sahélien des pesticides - CSP).

*Quelle est votre culture (tomate, oignon, pomme de terre) et observez-vous déjà des symptômes (taches d'huile, feutrage blanc sous les feuilles) ?*`;
  }

  // Cas 3 : Question sur le maïs ou l'arachide
  if (msg.includes('maïs') || msg.includes('mais') || msg.includes('arachide')) {
    return `Voici les repères agronomiques pour ces grandes cultures au Sénégal, tout en rappelant que **ces indications générales doivent être confrontées à la réalité de votre terroir**.

**🌾 Pour le Maïs (Zone Centre, Sud et Vallée)** :
- **Besoins hydriques** : Le maïs consomme entre 500 et 800 mm d'eau sur son cycle. Le stade le plus critique est l'épiaison et la sortie des soies (J+50 à J+65). Un déficit hydrique à ce moment fait chuter le rendement de 40 à 60%.
- **Fertilisation** : Fractionnez l'urée (1/3 au semis/démarrage, 2/3 au sarclage/montaison à J+30).
- **Ravageur à surveiller** : Inspectez les cornets pour détecter précocement la chenille légionnaire (*Spodoptera frugiperda*).

**🥜 Pour l'Arachide (Bassin Arachidier & Casamance)** :
- **Variétés conseillées** : 55-437 (cycle court 90 jours, résistante à la sécheresse dans le Nord/Centre) ou 73-33 (cycle 105 jours pour zones plus arrosées).
- **Stade clé** : La gynophorisation (J+40 à J+60). Le sol doit être décompacté pour permettre aux gynophores de s'enfoncer sous terre.
- **Maladie principale** : La cercosporiose (taches brunes sur feuilles). Évitez la stagnation d'eau.

*Dans quelle commune ou région se trouve votre parcelle ?*`;
  }

  // Cas 4 : Météo / ANACIM
  if (msg.includes('météo') || msg.includes('meteo') || msg.includes('pluie') || msg.includes('anacim') || msg.includes('température')) {
    return `Voici comment interpréter les données agrométéorologiques pour votre exploitation au Sénégal :

- **Probabilité de pluie de 70%** : Cela signifie que sur 10 situations climatiques identiques enregistrées par les modèles ANACIM/Open-Meteo, 7 ont déclenché des précipitations significatives sur votre zone. C'est un seuil suffisant pour reporter les pulvérisations foliaires.
- **Humidité relative élevée (>85%)** : Associée à une température nocturne douce (20-25°C), elle déclenche l'alerte jaune ou orange pour le mildiou sur oignon et tomate.
- **Vent > 20 km/h** : Interdit tout traitement phytosanitaire (risque de dérive et d'inefficacité).

*N'hésitez pas à me donner votre localité (ex: Thiès, Louga, Saint-Louis, Kaolack) pour examiner les tendances météo locales.*`;
  }

  // Réponse générale d'accueil et cadrage
  return `Bonjour ! Je suis l'assistant IA officiel d'**AgriImpact**, votre copilote agrométéorologique et guide de la plateforme au Sénégal.

Je peux vous accompagner sur :
- **🌱 Vos cultures & parcelles** : besoins hydriques, fertilisation, stades phénologiques (arachide, maïs, oignon, tomate, piment, riz).
- **🌦️ L'AgriMétéo** : prévisions ANACIM, alertes mildiou à 14 jours, fenêtres optimales de pulvérisation sans vent.
- **💻 La plateforme SaaS** : ajouter une parcelle, exporter vos rapports d'audit PDF, recharger vos tokens IA, ajuster votre abonnement.

⚠️ **Note déontologique** : Mes conseils agronomiques sont des synthèses d'aide à la décision basées sur les référentiels sahéliens (ISRA, FAO, ANACIM). Ils ne remplacent pas l'expertise d'un agronome de terrain.

*Quelle est votre question aujourd'hui ?*`;
}
