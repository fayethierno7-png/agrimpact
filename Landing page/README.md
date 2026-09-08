# AgriImpact — Landing Page Premium (Standard Dribbble / Agrovia)

Ce dossier contient la Landing Page complète, moderne et responsive d'**AgriImpact**, développée en Vanilla HTML5 / CSS3 / JavaScript sans framework lourd.

---

## 🌾 Spécificités & Principes Directeurs

1. **Inspiration Artistique Dribbble (*Agrovia*)** :
   - Typographie de haute volée : `Plus Jakarta Sans` combiné avec `Playfair Display` en italique pour les titres éditoriaux.
   - Palette équilibrée : Vert profond agronomique (`#0C2B1E`), vert feuille (`#1E6B47`), fond ivoire naturel (`#FAF9F5`), et accent solaire lime (`#C8EF56`).
   - Barre de navigation en pilule flottante avec effet de flou d'arrière-plan (`backdrop-filter`).
   - Hero section immersive avec visuel agricole africain grand format et cartes flottantes de données réelles.

2. **Crédibilité & Règle d'Or « Zéro Donnée Fictive »** :
   - **Aucune fausse métrique** de vanité (pas de faux "50 000 agriculteurs").
   - **Aucun matériel inventé** (pas de capteurs IoT propriétaires ou de satellites privés).
   - Les calculs s'appuient sur les équations thermo-hygrométriques réelles, les coefficients de sensibilité FAO ($K_s$), les référentiels de l'ANACIM et de l'ISRA.
   - Forfaits et moyens de paiement réels : Gratuit Pilote, Pro Producteur (5 900 FCFA/mois) et Coopérative (54 900 FCFA/mois) avec règlement direct via **Wave** et **Orange Money**.

---

## 📁 Architecture des Fichiers

```text
Landing page/
├── index.html                   # Page d'accueil principale complète (16 sections)
├── assets/
│   ├── images/                  # Photographies haute résolution (hero, cultures, exploitant)
│   ├── icons/                   # Icônes vectorielles SVG
│   └── logo/                    # Logo vectoriel AgriImpact, logos Wave et Orange Money
├── css/
│   ├── style.css                # Design system complet, tokens, composants et typographie
│   ├── responsive.css           # Breakpoints pour Desktop (1440px+), Tablette (768px+) et Mobile (320px+)
│   └── animations.css           # Apparitions au scroll, flottement des cartes et micro-interactions
├── js/
│   ├── main.js                  # Navigation, drawer mobile, commutateur tarifaire mensuel/annuel
│   ├── animations.js            # IntersectionObserver pour les révélations au scroll
│   └── dashboard.js             # Widget interactif AgriMétéo 14j et sélecteur de cultures AgriConseil
├── pages/
│   ├── solutions.html           # Solutions par filière (Maraîchage, Grandes Cultures, Coopératives)
│   ├── agrimeteo.html           # Explication scientifique du moteur 14j et des 28 créneaux
│   ├── agriconseil.html         # Stades phénologiques, vulnérabilité hydrique et conseils sol
│   ├── about.html               # Manifeste éthique, vision d'agronomie frugale et campagne 2026
│   └── contact.html             # Formulaire d'adhésion pilote, assistance téléphonique et FAQ
└── README.md                    # Ce guide
```

---

## 🚀 Consultation & Déploiement

- **Ouverture Directe** : Vous pouvez ouvrir directement le fichier `Landing page/index.html` dans n'importe quel navigateur moderne (Chrome, Safari, Firefox, Edge).
- **Serveur Web Local** :
  ```bash
  # Avec python :
  python3 -m http.server 8080 --directory "Landing page"
  
  # Ou avec npx serve :
  npx serve "Landing page"
  ```
- **Lien avec l'application SaaS** : Les boutons d'action renvoient directement vers le Tableau de bord et les parcours d'inscription d'AgriImpact (`../dashboard`, `../signup`).
