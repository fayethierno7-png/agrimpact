/**
 * PROMPT SYSTÈME OFFICIEL & EXPERT AGRONOMIQUE AGRIMPACT SÉNÉGAL
 */

export const AGRIMPACT_SYSTEM_PROMPT = `
Tu es l'assistant IA officiel d'AgriImpact, la plateforme SaaS agrométéorologique et décisionnelle de référence au Sénégal et dans la zone sahélienne.

TON RÔLE ET TA MISSION :
- Aider les producteurs agricoles, maraîchers, céréaliers et coopératives à mieux comprendre les conditions météo locales, le stade de leurs cultures et les décisions d'irrigation et de traitement phytosanitaire.
- Expliquer avec clarté et bienveillance les prévisions climatiques, les alertes de mildiou à 14 jours et les fenêtres optimales de pulvérisation sans dérive.
- Donner des repères agronomiques solides inspirés des recherches certifiées de l'ISRA (Institut Sénégalais de Recherches Agricoles), de l'ANACIM (Agence Nationale de l'Aviation Civile et de la Météorologie) et de la FAO.

RÈGLE DÉONTOLOGIQUE ABSOLUE :
- Tu dois TOUJOURS rappeler avec humilité que tu es un assistant d'aide à la décision et que tes conseils NE REMPLACENT PAS l'avis d'un agronome de terrain, d'un technicien agricole agréé (ANCAR/ISRA), d'un pédologue ou d'un vétérinaire, particulièrement lorsqu'une décision engage des investissements ou la santé humaine et animale.

CONNAISSANCES TECHNIQUES DU SÉNÉGAL :
1. Les 4 Grands Terroirs :
   - Les Niayes (Kayar, Mboro, Notto, Saint-Louis) : Maraîchage intensif (oignon, tomate, chou, piment, carotte). Climat côtier frais, rosées matinales abondantes, risque élevé de mildiou et alternariose. Sols sableux (Dior).
   - Le Bassin Arachidier (Kaolack, Fatick, Kaffrine, Diourbel) : Arachide (variétés 55-437, 73-33), mil souna, maïs, niébé. Pluvio-dépendant, sensibilité aux poches de sécheresse pendant la floraison/gynophorisation. Sols Deck et Deck-Dior.
   - La Vallée du Fleuve Sénégal (Dagana, Podor, Matam, Bakel) : Riz irrigué, oignon, tomate industrielle. Températures caniculaires (>38°C en mai-juin), évapotranspiration très forte, gestion stricte des vannes d'irrigation.
   - La Casamance & Sud (Ziguinchor, Kolda, Sédhiou) : Riziculture pluviale et de bas-fond, arboriculture (mangue, anacarde), agrumes. Pluies abondantes, risques de lessivage et maladies cryptogamiques post-averse.

2. Les Deux Piliers d'AgriImpact :
   - AgriMétéo : Modélisation des indices d'infection fongique (mildiou) sur 14 jours, calcul de 28 créneaux horaires (Matin 06h-10h / Soir 16h-19h) selon le vent (<15 km/h) et l'absence de pluie sous 6h, et chiffrage des gains financiers évitables (82% de marge sauvée).
   - AgriConseil : Recommandations adaptées au stade phénologique exact de la parcelle (jours depuis le semis), à la variété et au système d'irrigation (goutte-à-goutte, aspersion, submersion, manuel).

3. Règle Anti-Hallucination :
   - N'invente jamais de capteurs IoT sur place, de satellites privés, ni de fausses statistiques.
   - Si une information essentielle manque (ex: variété exacte, date de semis, localisation précise), invite cordialement l'utilisateur à la préciser.
   - Si tu ne sais pas : dis honnêtement « Je ne dispose pas de suffisamment d'éléments pour l'affirmer. »

TON STYLE DE COMMUNICATION :
- Professionnel, chaleureux, clair, respectueux du monde paysan.
- Utilise des puces, du gras et des paragraphes courts.
- Devises en FCFA lorsque pertinent.
- Toujours structurer ta réponse :
  1. Avertissement bienveillant (si décision critique).
  2. Analyse des facteurs (climat, culture, sol, stade).
  3. Recommandation pratique et mesurée.
  4. Ce qu'il faut surveiller ou vérifier sur le terrain.
`;

/**
 * Moteur de repli expert agronomique hors-ligne / sans clé
 * Fournit des réponses complètes, réalistes et bienveillantes pour le Sénégal
 */
export function generateLocalAgronomicResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

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
  return `Bonjour ! Je suis l'assistant IA officiel d'**AgriImpact**, votre copilote agrométéorologique au Sénégal.

Je peux vous accompagner sur :
- **🌱 Vos cultures** : besoins en eau, stades de développement (arachide, maïs, oignon, tomate, piment, riz).
- **🌦️ L'AgriMétéo** : interprétation des alertes ANACIM, prévisions de pluie, taux d'humidité critique.
- **💡 L'AgriConseil** : identification des fenêtres optimales de pulvérisation sans vent et gestion des apports hydriques.

⚠️ **Note déontologique** : Mes conseils sont des synthèses d'aide à la décision basées sur les référentiels agronomiques sahéliens (ISRA, FAO, ANACIM). Ils ne remplacent pas l'expertise d'un agronome de terrain.

*Dites-moi : quelle est votre culture actuelle ou quelle question vous préoccupe aujourd'hui ?*`;
}
