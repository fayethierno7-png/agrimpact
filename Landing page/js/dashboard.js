/**
 * AGRIMPACT - DASHBOARD & INTERACTIVE WIDGETS
 * Démonstration des flux de données réels AgriMétéo et AgriConseil
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. WIDGET INTERACTIF AGRIMÉTÉO 14 JOURS ---
  // Données représentatives de la zone des Niayes (Sénégal) pour Tomate / Oignon
  const daysData = [
    {
      day: 'J+1',
      date: 'Mardi 08 Sept.',
      temp: '26°C',
      humidity: '84%',
      risk: 28,
      vigilance: 'verte',
      label: 'Risque fongique faible',
      bannerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '8 km/h', pluie: '0 mm', temp: '22°C' },
      slot2: { time: '16h - 19h', status: 'favorable', vent: '12 km/h', pluie: '0 mm', temp: '27°C' }
    },
    {
      day: 'J+2',
      date: 'Mercredi 09 Sept.',
      temp: '27°C',
      humidity: '89%',
      risk: 54,
      vigilance: 'jaune',
      label: 'Vigilance modérée : incubation fongique',
      bannerClass: 'bg-amber-50 border-amber-200 text-amber-800',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '9 km/h', pluie: '0 mm', temp: '23°C' },
      slot2: { time: '16h - 19h', status: 'déconseillée', vent: '21 km/h', pluie: '0 mm', temp: '28°C' }
    },
    {
      day: 'J+3',
      date: 'Jeudi 10 Sept.',
      temp: '25°C',
      humidity: '94%',
      risk: 86,
      vigilance: 'orange',
      label: 'Alerte Sanitaire : Risque d’infection critique à l’aube',
      bannerClass: 'bg-orange-50 border-orange-200 text-orange-800',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '11 km/h', pluie: '0 mm', temp: '22°C' },
      slot2: { time: '16h - 19h', status: 'interdite', vent: '14 km/h', pluie: '8.5 mm', temp: '26°C' }
    },
    {
      day: 'J+4',
      date: 'Vendredi 11 Sept.',
      temp: '24°C',
      humidity: '96%',
      risk: 92,
      vigilance: 'rouge',
      label: 'Alerte Maximale : Sporulation active post-pluie',
      bannerClass: 'bg-red-50 border-red-200 text-red-800',
      slot1: { time: '06h - 10h', status: 'interdite', vent: '16 km/h', pluie: '14 mm', temp: '21°C' },
      slot2: { time: '16h - 19h', status: 'déconseillée', vent: '18 km/h', pluie: '3 mm', temp: '24°C' }
    },
    {
      day: 'J+5',
      date: 'Samedi 12 Sept.',
      temp: '28°C',
      humidity: '76%',
      risk: 65,
      vigilance: 'orange',
      label: 'Ressuyage des sols : fenêtre de rattrapage',
      bannerClass: 'bg-orange-50 border-orange-200 text-orange-800',
      slot1: { time: '06h - 10h', status: 'favorable', vent: '10 km/h', pluie: '0 mm', temp: '23°C' },
      slot2: { time: '16h - 19h', status: 'optimale', vent: '7 km/h', pluie: '0 mm', temp: '27°C' }
    },
    {
      day: 'J+6',
      date: 'Dimanche 13 Sept.',
      temp: '30°C',
      humidity: '68%',
      risk: 38,
      vigilance: 'jaune',
      label: 'Conditions asséchantes : risque en décrue',
      bannerClass: 'bg-amber-50 border-amber-200 text-amber-800',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '9 km/h', pluie: '0 mm', temp: '24°C' },
      slot2: { time: '16h - 19h', status: 'optimale', vent: '8 km/h', pluie: '0 mm', temp: '29°C' }
    },
    {
      day: 'J+7',
      date: 'Lundi 14 Sept.',
      temp: '31°C',
      humidity: '58%',
      risk: 22,
      vigilance: 'verte',
      label: 'Conditions stables : gestion hydrique prioritaire',
      bannerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '7 km/h', pluie: '0 mm', temp: '25°C' },
      slot2: { time: '16h - 19h', status: 'favorable', vent: '11 km/h', pluie: '0 mm', temp: '30°C' }
    }
  ];

  const dayPillsContainer = document.getElementById('agrometeoDayPills');
  const bannerBox = document.getElementById('agrometeoBanner');
  const bannerTag = document.getElementById('agrometeoBannerTag');
  const bannerText = document.getElementById('agrometeoBannerText');
  const currentRiskVal = document.getElementById('agrometeoCurrentRisk');
  const slot1Box = document.getElementById('slotCardMatin');
  const slot2Box = document.getElementById('slotCardSoir');

  function renderDayPills() {
    if (!dayPillsContainer) return;
    dayPillsContainer.innerHTML = '';

    daysData.forEach((item, index) => {
      const pill = document.createElement('div');
      pill.className = `ui-day-pill ${index === 2 ? 'active' : ''}`; // J+3 actif par défaut (alerte)
      pill.innerHTML = `
        <span class="ui-day-name">${item.day}</span>
        <div class="ui-day-val" style="color: ${item.risk > 80 ? '#EF4444' : item.risk > 50 ? '#F97316' : '#10B981'}">${item.risk}%</div>
      `;
      pill.addEventListener('click', () => selectDay(index));
      dayPillsContainer.appendChild(pill);
    });
  }

  function selectDay(index) {
    const data = daysData[index];
    if (!data) return;

    // Mise à jour classe active
    const pills = dayPillsContainer.querySelectorAll('.ui-day-pill');
    pills.forEach((p, idx) => {
      p.classList.toggle('active', idx === index);
    });

    // Mise à jour banner
    if (bannerBox && bannerTag && bannerText) {
      bannerTag.textContent = data.vigilance.toUpperCase();
      bannerTag.style.backgroundColor = data.vigilance === 'rouge' ? '#EF4444' : data.vigilance === 'orange' ? '#F97316' : data.vigilance === 'jaune' ? '#F59E0B' : '#10B981';
      bannerText.textContent = `${data.date} : ${data.label} (Humidité : ${data.humidity})`;
    }

    if (currentRiskVal) {
      currentRiskVal.textContent = `${data.risk}%`;
      currentRiskVal.style.color = data.risk > 80 ? '#EF4444' : data.risk > 50 ? '#F97316' : '#10B981';
    }

    // Mise à jour créneaux d'intervention
    if (slot1Box) {
      slot1Box.innerHTML = `
        <div class="ui-slot-header">
          <span>Créneau Matin (${data.slot1.time})</span>
          <span class="ui-slot-badge ${data.slot1.status === 'interdite' ? 'warning' : ''}" style="background-color: ${data.slot1.status === 'optimale' ? '#10B981' : data.slot1.status === 'favorable' ? '#3B82F6' : '#EF4444'}">
            ${data.slot1.status.toUpperCase()}
          </span>
        </div>
        <div class="ui-slot-params">
          <span>Vent : <strong>${data.slot1.vent}</strong></span>
          <span>Pluie : <strong>${data.slot1.pluie}</strong></span>
          <span>Temp : <strong>${data.slot1.temp}</strong></span>
        </div>
      `;
    }

    if (slot2Box) {
      slot2Box.innerHTML = `
        <div class="ui-slot-header">
          <span>Créneau Soir (${data.slot2.time})</span>
          <span class="ui-slot-badge ${data.slot2.status === 'interdite' ? 'warning' : ''}" style="background-color: ${data.slot2.status === 'optimale' ? '#10B981' : data.slot2.status === 'favorable' ? '#3B82F6' : '#EF4444'}">
            ${data.slot2.status.toUpperCase()}
          </span>
        </div>
        <div class="ui-slot-params">
          <span>Vent : <strong>${data.slot2.vent}</strong></span>
          <span>Pluie : <strong>${data.slot2.pluie}</strong></span>
          <span>Temp : <strong>${data.slot2.temp}</strong></span>
        </div>
      `;
    }
  }

  // --- 2. WIDGET INTERACTIF AGRICONSEIL (CULTURES) ---
  const cropsData = {
    oignon: {
      name: 'Oignon (Violet de Galmi)',
      stage: 'Bulbaison active (J+52 après repiquage)',
      cycle: 'Cycle total : 120 jours',
      irrigationType: 'Goutte-à-goutte (2x / semaine)',
      actionTitle: 'Réduction des apports azotés & surveillance mildiou',
      actionDesc: 'En phase de grossissement des bulbes, stoppez impérativement les apports d’azote pour éviter le pourrissement des collets. Maintenez une humidité racinaire régulière sans mouiller le feuillage.',
      sanitaryConseil: 'Humidité nocturne > 90% prévue à J+3 : prévoyez un traitement préventif de contact avant mercredi 18h.'
    },
    tomate: {
      name: 'Tomate (Mongal RZ)',
      stage: 'Floraison & Nouaison (J+44 après repiquage)',
      cycle: 'Cycle total : 90 jours',
      irrigationType: 'Goutte-à-goutte quotidien',
      actionTitle: 'Maintien de l’équilibre hydrique contre la nécrose apicale',
      actionDesc: 'Le stade de nouaison est le plus sensible au stress hydrique (Ks = 1.25). Des à-coups d’arrosage provoquent le cul noir. Privilégiez 2 fractions d’irrigation (06h30 et 17h30).',
      sanitaryConseil: 'Attention au risque d’alternariose si des pluies orageuses surviennent ce weekend. Traiter uniquement en créneau sans vent (< 15 km/h).'
    },
    arachide: {
      name: 'Arachide (Variété 55-437)',
      stage: 'Gynophorisation & Remplissage des gousses (J+48)',
      cycle: 'Cycle total : 90 jours',
      irrigationType: 'Pluvial avec appoint d’irrigation de secours',
      actionTitle: 'Période critique de pénétration des gynophores dans le sol',
      actionDesc: 'La terre doit rester meuble pour permettre l’enfouissement des jeunes gousses. En cas de poche de sécheresse > 5 jours, déclenchez une aspersion légère pour décompacter le sol.',
      sanitaryConseil: 'Surveiller l’apparition de la cercosporiose précoce sur les feuilles basses si l’humidité relative dépasse 85% pendant 48 heures.'
    },
    mais: {
      name: 'Maïs (Variété Locale / Hybride)',
      stage: 'Épiaison & Floraison mâle (J+55)',
      cycle: 'Cycle total : 105 jours',
      irrigationType: 'Submersion / Raie ou Aspersion',
      actionTitle: 'Pic maximal de consommation en eau de la culture',
      actionDesc: 'La floraison conditionne 60% du rendement final. Tout stress hydrique à ce stade entraîne un avortement des soies. Assurez un apport hydrique soutenu.',
      sanitaryConseil: 'Inspecter les cornets à la recherche de la chenille légionnaire d’automne (Spodoptera frugiperda) aux heures fraîches.'
    }
  };

  const cropTabButtons = document.querySelectorAll('.crop-tab-btn');
  const cropStageTitle = document.getElementById('cropStageTitle');
  const cropStageBadge = document.getElementById('cropStageBadge');
  const cropCycleDesc = document.getElementById('cropCycleDesc');
  const cropActionTitle = document.getElementById('cropActionTitle');
  const cropActionDesc = document.getElementById('cropActionDesc');
  const cropSanitaryDesc = document.getElementById('cropSanitaryDesc');

  function selectCrop(cropKey) {
    const data = cropsData[cropKey];
    if (!data) return;

    cropTabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-crop') === cropKey);
    });

    if (cropStageTitle) cropStageTitle.textContent = data.name;
    if (cropStageBadge) cropStageBadge.textContent = data.stage;
    if (cropCycleDesc) cropCycleDesc.textContent = `${data.cycle} • Système : ${data.irrigationType}`;
    if (cropActionTitle) cropActionTitle.textContent = data.actionTitle;
    if (cropActionDesc) cropActionDesc.textContent = data.actionDesc;
    if (cropSanitaryDesc) cropSanitaryDesc.textContent = data.sanitaryConseil;
  }

  cropTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cropKey = btn.getAttribute('data-crop');
      if (cropKey) selectCrop(cropKey);
    });
  });

  // Initialisation au chargement
  renderDayPills();
  selectDay(2); // Jour J+3 par défaut
});
