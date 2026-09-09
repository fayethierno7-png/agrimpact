'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sprout,
  ArrowRight,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  MapPin,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  Smartphone,
  Check,
  Lock,
} from 'lucide-react';
import { useAgri } from '../lib/context/AgriContext';
import { AgriSimulator } from '../components/simulator/AgriSimulator';
import PricingTable from '../components/billing/PricingTable';

export default function SaaSLandingPage() {
  const { profile } = useAgri();
  const saasDestination = profile ? '/dashboard' : '/signup?redirect=/dashboard&intent=demo';

  // --- ÉTATS INTERACTIFS ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(2); // J+3 actif par défaut (alerte orange)
  const [selectedCropKey, setSelectedCropKey] = useState<'oignon' | 'tomate' | 'arachide' | 'mais'>('oignon');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Données interactives de la timeline AgriMétéo 14 jours (Zone Niayes)
  const daysData = [
    {
      day: 'J+1',
      date: 'Mardi 08 Sept.',
      temp: '26°C',
      humidity: '84%',
      risk: 28,
      vigilance: 'verte',
      label: 'Risque fongique faible • Conditions tempérées',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '8 km/h', pluie: '0 mm', temp: '22°C' },
      slot2: { time: '16h - 19h', status: 'favorable', vent: '12 km/h', pluie: '0 mm', temp: '27°C' },
    },
    {
      day: 'J+2',
      date: 'Mercredi 09 Sept.',
      temp: '27°C',
      humidity: '89%',
      risk: 54,
      vigilance: 'jaune',
      label: 'Vigilance modérée : incubation fongique nocturne',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '9 km/h', pluie: '0 mm', temp: '23°C' },
      slot2: { time: '16h - 19h', status: 'déconseillée', vent: '21 km/h', pluie: '0 mm', temp: '28°C' },
    },
    {
      day: 'J+3',
      date: 'Jeudi 10 Sept.',
      temp: '25°C',
      humidity: '94%',
      risk: 86,
      vigilance: 'orange',
      label: 'Alerte Sanitaire : Risque d’infection critique à l’aube',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '11 km/h', pluie: '0 mm', temp: '22°C' },
      slot2: { time: '16h - 19h', status: 'interdite', vent: '14 km/h', pluie: '8.5 mm', temp: '26°C' },
    },
    {
      day: 'J+4',
      date: 'Vendredi 11 Sept.',
      temp: '24°C',
      humidity: '96%',
      risk: 92,
      vigilance: 'rouge',
      label: 'Alerte Maximale : Sporulation active post-pluie',
      slot1: { time: '06h - 10h', status: 'interdite', vent: '16 km/h', pluie: '14 mm', temp: '21°C' },
      slot2: { time: '16h - 19h', status: 'déconseillée', vent: '18 km/h', pluie: '3 mm', temp: '24°C' },
    },
    {
      day: 'J+5',
      date: 'Samedi 12 Sept.',
      temp: '28°C',
      humidity: '76%',
      risk: 65,
      vigilance: 'orange',
      label: 'Ressuyage des sols : fenêtre de traitement préventif',
      slot1: { time: '06h - 10h', status: 'favorable', vent: '10 km/h', pluie: '0 mm', temp: '23°C' },
      slot2: { time: '16h - 19h', status: 'optimale', vent: '7 km/h', pluie: '0 mm', temp: '27°C' },
    },
    {
      day: 'J+6',
      date: 'Dimanche 13 Sept.',
      temp: '30°C',
      humidity: '68%',
      risk: 38,
      vigilance: 'jaune',
      label: 'Conditions asséchantes : risque en nette décrue',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '9 km/h', pluie: '0 mm', temp: '24°C' },
      slot2: { time: '16h - 19h', status: 'optimale', vent: '8 km/h', pluie: '0 mm', temp: '29°C' },
    },
    {
      day: 'J+7',
      date: 'Lundi 14 Sept.',
      temp: '31°C',
      humidity: '58%',
      risk: 22,
      vigilance: 'verte',
      label: 'Conditions stables : gestion hydrique prioritaire',
      slot1: { time: '06h - 10h', status: 'optimale', vent: '7 km/h', pluie: '0 mm', temp: '25°C' },
      slot2: { time: '16h - 19h', status: 'favorable', vent: '11 km/h', pluie: '0 mm', temp: '30°C' },
    },
  ];

  // Données interactives du moteur AgriConseil
  const cropsData = {
    oignon: {
      name: 'Oignon (Violet de Galmi)',
      stage: 'Bulbaison active (J+52)',
      cycle: 'Cycle total : 120 jours • Système : Goutte-à-goutte',
      actionTitle: 'Arrêt des apports azotés & surveillance mildiou',
      actionDesc:
        'En phase de grossissement des bulbes, stoppez impérativement les apports d’azote pour éviter le pourrissement des collets. Maintenez une humidité racinaire régulière sans mouiller le feuillage.',
      sanitaryConseil:
        'Humidité nocturne > 90% prévue à J+3 : appliquez un traitement préventif de contact avant mercredi 18h.',
    },
    tomate: {
      name: 'Tomate (Mongal RZ)',
      stage: 'Floraison & Nouaison (J+44)',
      cycle: 'Cycle total : 90 jours • Système : Goutte-à-goutte quotidien',
      actionTitle: 'Maintien de l’équilibre hydrique contre le cul noir',
      actionDesc:
        'Le stade de nouaison est le plus vulnérable au stress hydrique (Ks = 1.25). Fractionnez l’apport en 2 cycles (06h30 et 17h30) pour éviter l’avortement floral.',
      sanitaryConseil:
        'Risque d’alternariose élevé post-pluie. Traiter uniquement lors d’un créneau sans vent (< 15 km/h).',
    },
    arachide: {
      name: 'Arachide (Variété 55-437)',
      stage: 'Gynophorisation & Remplissage (J+48)',
      cycle: 'Cycle total : 90 jours • Système : Pluvial avec appoint de secours',
      actionTitle: 'Période critique d’enfouissement des gynophores',
      actionDesc:
        'La terre doit rester meuble pour permettre l’enfouissement des jeunes gousses. En cas d’arrêt des pluies > 5 jours, déclenchez une aspersion légère pour décompacter la couche superficielle.',
      sanitaryConseil:
        'Surveiller la cercosporiose précoce sur les feuilles basses si l’humidité dépasse 85% pendant 48 heures.',
    },
    mais: {
      name: 'Maïs (Variété Locale / Hybride)',
      stage: 'Épiaison & Floraison mâle (J+55)',
      cycle: 'Cycle total : 105 jours • Système : Submersion / Raies ou Aspersion',
      actionTitle: 'Pic maximal de consommation en eau',
      actionDesc:
        'La floraison conditionne 60% du rendement final. Tout stress hydrique entraîne un avortement irréversible des soies. Assurez un apport continu.',
      sanitaryConseil:
        'Inspecter les cornets foliaires aux heures fraîches pour repérer d’éventuelles chenilles légionnaires.',
    },
  };

  const currentDay = daysData[selectedDayIdx];
  const currentCrop = cropsData[selectedCropKey];

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F5] text-stone-900 w-full transition-colors duration-200">
      {/* 1. TOP TICKER CONTEXTE SÉNÉGAL */}
      <aside className="bg-[#0C2B1E] text-stone-300 text-xs py-2 px-4 border-b border-white/10 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C8EF56] animate-pulse inline-block shadow-[0_0_8px_#C8EF56]" />
            <span className="font-medium text-stone-200">
              Sénégal • Réseau de prévision Open-Meteo & Référentiels ANACIM synchronisés
            </span>
          </div>
          <div className="flex items-center gap-4 text-stone-300 text-[11px] font-medium">
            <span>Campagne Agricole 2026 en cours</span>
            <span className="opacity-30">|</span>
            <a href="tel:338001212" className="flex items-center gap-1.5 text-white font-bold hover:text-[#C8EF56] transition-colors">
              <PhoneCall className="w-3.5 h-3.5 text-[#C8EF56]" />
              <span>Assistance paysanne : 33 800 12 12</span>
            </a>
          </div>
        </div>
      </aside>

      {/* 2. NAVBAR FLOTTANTE EN PILULE (STYLE DRIBBBLE AGROVIA) */}
      <div className="sticky top-3 z-50 px-3 sm:px-6 w-full max-w-7xl mx-auto">
        <header className="bg-white/90 backdrop-blur-md border border-[#123C2B]/10 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_10px_30px_-5px_rgba(12,43,30,0.08)]">
          {/* Logo Marque */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0C2B1E] flex items-center justify-center text-white shadow-xs">
              <Sprout className="w-5 h-5 text-[#C8EF56]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#0C2B1E] leading-none">
                AGRIMPACT
              </span>
              <span className="text-[9px] font-bold tracking-widest text-[#1E6B47] uppercase mt-0.5">
                SÉNÉGAL • TERROIR & DÉCISION
              </span>
            </div>
          </Link>

          {/* Navigation centrale en pilule */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#123C2B]/5 px-2 py-1 rounded-full border border-[#123C2B]/5 text-xs font-bold text-stone-600 shrink-0">
            <a href="#simulateur" className="px-3.5 py-1.5 rounded-full bg-white text-[#0C2B1E] shadow-xs font-black whitespace-nowrap shrink-0">
              ⚡ Simulateur
            </a>
            <a href="#agrimeteo" className="px-3.5 py-1.5 rounded-full hover:bg-white hover:text-[#0C2B1E] transition-all whitespace-nowrap shrink-0">
              AgriMétéo 14j
            </a>
            <a href="#agriconseil" className="px-3.5 py-1.5 rounded-full hover:bg-white hover:text-[#0C2B1E] transition-all whitespace-nowrap shrink-0">
              AgriConseil
            </a>
            <a href="#comment-ca-marche" className="px-3.5 py-1.5 rounded-full hover:bg-white hover:text-[#0C2B1E] transition-all whitespace-nowrap shrink-0">
              Comment ça marche
            </a>
            <a href="#tarifs" className="px-3.5 py-1.5 rounded-full hover:bg-white hover:text-[#0C2B1E] transition-all whitespace-nowrap shrink-0">
              Tarifs Wave & OM
            </a>
            <a href="#terroirs" className="px-3.5 py-1.5 rounded-full hover:bg-white hover:text-[#0C2B1E] transition-all whitespace-nowrap shrink-0">
              Nos Terroirs
            </a>
          </nav>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="text-xs font-bold text-stone-700 hover:text-[#0C2B1E] px-3 py-2 transition-colors hidden sm:inline-block whitespace-nowrap shrink-0"
            >
              Se connecter
            </Link>
            <Link
              href={saasDestination}
              className="px-4 py-2 bg-[#C8EF56] hover:bg-[#B8DF44] text-[#0C2B1E] text-xs font-black rounded-full shadow-[0_4px_14px_rgba(200,239,86,0.35)] hover:shadow-[0_6px_20px_rgba(200,239,86,0.5)] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="whitespace-nowrap">{profile ? 'Tableau de bord' : 'Accéder au SaaS'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#0C2B1E] hover:bg-stone-100 rounded-full shrink-0"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Menu Mobile Déroulant */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 bg-[#0C2B1E] text-white rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col gap-4 animate-fade-in">
            <a href="#simulateur" onClick={() => setMobileMenuOpen(false)} className="text-base font-black text-[#C8EF56] py-2 border-b border-white/10 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Tester le Simulateur Public</span>
            </a>
            <a href="#agrimeteo" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold py-2 border-b border-white/10">
              AgriMétéo 14 jours
            </a>
            <a href="#agriconseil" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold py-2 border-b border-white/10">
              AgriConseil & Stades
            </a>
            <a href="#comment-ca-marche" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold py-2 border-b border-white/10">
              Comment ça marche
            </a>
            <a href="#tarifs" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold py-2 border-b border-white/10">
              Tarifs Wave & Orange Money
            </a>
            <a href="#terroirs" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold py-2 border-b border-white/10">
              Les Terroirs du Sénégal
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link href={saasDestination} className="w-full py-3 bg-[#C8EF56] text-[#0C2B1E] text-center font-black rounded-xl text-sm">
                {profile ? 'Accéder au Tableau de bord' : 'Créer mon compte (Démo)'}
              </Link>
              <Link href="/login" className="w-full py-2.5 text-center font-bold text-stone-300 text-sm">
                Connexion exploitant
              </Link>
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 w-full">
        {/* 3. HERO SECTION IMMERSIVE (STYLE DRIBBBLE AGROVIA) */}
        <section className="pt-4 pb-12 px-3 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden min-h-[580px] sm:min-h-[660px] flex items-end bg-[#0C2B1E] shadow-[0_20px_48px_-12px_rgba(12,43,30,0.25)]">
            {/* Image de fond authentique sénégalaise */}
            <div className="absolute inset-0 w-full height-full z-1">
              <img
                src="/images/landing/hero.jpg"
                alt="Cultures maraîchères et céréalières florissantes au lever du jour au Sénégal"
                className="w-full h-full object-cover object-[center_35%] scale-[1.02]"
              />
              {/* Gradient de superposition sombre et chaud */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1C14]/95 via-[#0A1C14]/40 to-[#0A1C14]/20" />
            </div>

            {/* Cartes d'aperçu démonstration de l'interface en direct (Desktop) */}
            <div className="absolute top-8 right-8 z-10 hidden md:flex flex-col gap-3 max-w-[320px]">
              {/* Badge indicatif honnête */}
              <div className="self-end px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                Exemple illustratif • Terroir Niayes
              </div>

              {/* Carte 1 : Météo en direct Niayes */}
              <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-xl animate-float-subtle">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-1">
                  <span className="uppercase tracking-wider">Station Niayes (Kayar)</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Simulation</span>
                </div>
                <div className="text-2xl font-black text-[#0C2B1E] tracking-tight">
                  27°C <span className="text-sm font-semibold text-stone-500">• RH 84%</span>
                </div>
                <div className="text-[11px] text-stone-600 font-medium mt-1">
                  Vent 9 km/h (Calme) • Ciel voilé favorable aux cultures
                </div>
              </div>

              {/* Carte 2 : Alerte Sanitaire Mildiou */}
              <div className="bg-[#0C2B1E]/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-xl animate-float-subtle-2">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#C8EF56] uppercase tracking-wider">Vigilance Mildiou J+3</span>
                  <span className="px-2 py-0.5 bg-orange-600 text-white rounded-full text-[10px] font-extrabold">ORANGE</span>
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  Risque 86%
                </div>
                <div className="text-[11px] text-stone-300 mt-1">
                  Pression d&apos;infection maximale jeudi à l&apos;aube. Traiter avant la pluie.
                </div>
              </div>

              {/* Carte 3 : Fenêtre d'intervention optimale */}
              <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-xl hidden lg:block">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-1">
                  <span className="uppercase tracking-wider">Créneau de pulvérisation</span>
                  <span className="text-emerald-700 font-black text-[10px]">OPTIMAL ✓</span>
                </div>
                <div className="text-base font-black text-[#0C2B1E]">
                  Demain 06h00 – 09h30
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5">
                  Vent faible (&lt;10 km/h) • Zéro risque de lessivage à 24h
                </div>
              </div>
            </div>

            {/* Contenu textuel & CTA du Hero */}
            <div className="relative z-10 p-6 sm:p-12 lg:p-14 w-full flex flex-col justify-end">
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[#C8EF56] text-xs font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8EF56] shadow-[0_0_6px_#C8EF56]" />
                  Le 1er Copilote Décisionnel Agricole au Sénégal
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] max-w-3xl">
                Mieux comprendre.<br />
                Mieux décider.<br />
                <span className="font-serif-italic font-normal text-[#C8EF56]">Mieux cultiver.</span>
              </h1>

              <p className="text-stone-200 text-sm sm:text-base lg:text-lg max-w-2xl mt-4 leading-relaxed font-medium">
                AgriImpact transforme les données agro-climatiques locales et le stade exact de vos parcelles en recommandations concrètes : quand irriguer, quand traiter et comment sécuriser vos rendements.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mt-8 max-w-md sm:max-w-none">
                <a
                  href="#simulateur"
                  className="py-3.5 px-7 bg-[#C8EF56] hover:bg-[#B8DF44] text-[#0C2B1E] text-sm font-black rounded-full flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(200,239,86,0.4)] transition-all cursor-pointer"
                >
                  <span>Tester le Simulateur (Gratuit)</span>
                  <Sparkles className="w-4 h-4" />
                </a>
                <Link
                  href={saasDestination}
                  className="py-3.5 px-7 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all"
                >
                  <span>{profile ? 'Mon Tableau de bord' : 'Voir la Démo du Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Bas de hero : bandeau de réassurance */}
              <div className="mt-8 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-300 font-medium">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#C8EF56]" />
                  <span>Conçu pour les réalités maraîchères & céréalières sahéliennes</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>★ 4.9 sur le terroir sénégalais</span>
                  <span>•</span>
                  <span>Campagne Pilote 2026</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. BANDEAU DE CONFIANCE & ÉCOSYSTÈME SÉNÉGAL */}
        <section className="bg-white border-y border-stone-200/80 py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider max-w-[220px]">
              Ancré dans l&apos;écosystème agronomique & financier
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#0C2B1E]">
                <span>🇸🇳 ANACIM</span>
                <span className="text-[10px] text-stone-500 font-normal">Météo Nationale</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#0C2B1E]">
                <span>🌾 ISRA</span>
                <span className="text-[10px] text-stone-500 font-normal">Recherche Agronomique</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#0C2B1E]">
                <img src="/logos/wave.jpg" alt="Wave" className="w-5 h-5 rounded-sm object-cover" />
                <span>Wave Mobile Money</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#0C2B1E]">
                <img src="/logos/orange-money.png" alt="Orange Money" className="w-5 h-5 object-contain" />
                <span>Orange Money</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#0C2B1E]">
                <span>🌱 Terroirs Niayes & Fleuve</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4.5. SIMULATEUR AGROMÉTÉO INTERACTIF (AHA MOMENT PUBLIC) */}
        <section className="py-20 px-4 sm:px-6 bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200/80 dark:border-stone-800 scroll-mt-20" id="simulateur">
          <AgriSimulator />
        </section>

        {/* 5. SECTION PROBLÈME ÉDITORIALE */}
        <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full" id="probleme">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#123C2B]/10 text-[#1A543D] text-xs font-black uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            L&apos;asymétrie d&apos;information agricole
          </div>

          <p className="text-2xl sm:text-4xl font-black text-stone-900 leading-snug tracking-tight max-w-4xl mb-12">
            L&apos;agriculture sahélienne ne manque pas seulement de bras ou d&apos;intrants. Elle souffre avant tout d&apos;un{' '}
            <span className="font-serif-italic font-normal text-[#1A543D]">déficit d&apos;informations précises</span> au moment clé où se joue la récolte.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problème 1 */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="text-xs font-extrabold text-[#1E6B47] tracking-wider mb-3">
                  01 / DÉSYNCHRONISATION PLUVIOMÉTRIQUE
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-3">
                  Traitements lessivés & intrants gaspillés
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Appliquer un traitement phytosanitaire 4 heures avant une averse torrentielle non anticipée détruit son efficacité, pollue les sols et coûte jusqu&apos;à 35 000 FCFA par hectare en intrants perdus.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Perte moyenne de 30% du capital intrant</span>
              </div>
            </div>

            {/* Problème 2 */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="text-xs font-extrabold text-[#1E6B47] tracking-wider mb-3">
                  02 / ÉPIDÉMIOLOGIE INVISIBLE
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-3">
                  Attaques de mildiou fulgurantes
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Le mildiou incube en silence lors de nuits tièdes à forte hygrométrie (&gt;85%). Lorsque les taches jaunes apparaissent sur la tomate ou l&apos;oignon, la perte de rendement est déjà irréversible.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Jusqu&apos;à 60% de chute de rendement brut</span>
              </div>
            </div>

            {/* Problème 3 */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="text-xs font-extrabold text-[#1E6B47] tracking-wider mb-3">
                  03 / GESTION DE L&apos;EAU À L&apos;AVEUGLE
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-3">
                  Stress hydrique aux stades critiques
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Arroser de la même façon pendant le développement végétatif et pendant la nouaison ou la gynophorisation de l&apos;arachide provoque soit l&apos;asphyxie racinaire, soit l&apos;avortement des fleurs sous la canicule.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 p-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Chute de calibre & dépréciation marchande</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. SECTION SOLUTION & PIPELINE DÉCISIONNEL */}
        <section className="bg-[#F3EFE6] py-20 px-4 sm:px-6 w-full" id="solution">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8EF56] text-[#0C2B1E] text-xs font-black uppercase tracking-wider mb-3">
                La Réponse AgriImpact
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                De la donnée satellite brute à la décision au champ
              </h2>
              <p className="text-stone-600 text-sm sm:text-base mt-3">
                Une chaîne de valeur transparente et scientifique qui traduit des signaux météo complexes en consignes d&apos;action limpides.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs relative">
                <div className="w-8 h-8 rounded-full bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-xs mb-4">
                  01
                </div>
                <h4 className="text-base font-black text-[#0C2B1E] mb-2">Données Réelles</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Coordonnées GPS réelles de l&apos;exploitation, prévisions météo horaires certifiées Open-Meteo et référentiels ANACIM.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs relative">
                <div className="w-8 h-8 rounded-full bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-xs mb-4">
                  02
                </div>
                <h4 className="text-base font-black text-[#0C2B1E] mb-2">Modèle Biophysique</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Équations thermo-hygrométriques d&apos;infection fongique et coefficients de sensibilité FAO (Doorenbos & Kassam).
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs relative">
                <div className="w-8 h-8 rounded-full bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-xs mb-4">
                  03
                </div>
                <h4 className="text-base font-black text-[#0C2B1E] mb-2">Contexte Parcelle</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Culture exacte (Tomate, Oignon, Arachide, Maïs), variété, date de semis, surface et mode d&apos;irrigation.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs relative">
                <div className="w-8 h-8 rounded-full bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-xs mb-4">
                  04
                </div>
                <h4 className="text-base font-black text-[#0C2B1E] mb-2">Consigne Précise</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Alerte de vigilance couleur, créneau horaire sans vent pour traiter et recommandation hydrique du jour.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FOCUS PRODUIT AGRIMÉTÉO 14 JOURS (WIDGET INTERACTIF) */}
        <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full" id="agrimeteo">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Colonne gauche : Argumentaire */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-4">
                Composant 1 • AgriMétéo 14 Jours
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
                Anticipez les risques fongiques sur 14 jours, pas seulement le ciel du lendemain.
              </h2>

              <p className="text-stone-600 text-sm sm:text-base mt-4 leading-relaxed">
                Les bulletins météo télévisés parlent de pluie ou de soleil pour tout le pays. AgriMétéo calcule pour la latitude exacte de votre parcelle la combinaison critique de température, d&apos;humidité saturée et de vent.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center shrink-0 text-xs">
                    14j
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Projection Épidémiologique Continue</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Calcul quotidien de l&apos;indice d&apos;infection (0 à 100%) selon les lois thermiques et hygrométriques de la biologie végétale.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center shrink-0 text-xs">
                    <Wind className="w-5 h-5 text-emerald-800" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">28 Fenêtres de Pulvérisation Évaluées</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Deux créneaux analysés chaque jour (Matin 06h-10h et Soir 16h-19h) avec test strict du vent (&lt;15 km/h) et du risque d&apos;averse.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center shrink-0 text-xs">
                    <DollarSign className="w-5 h-5 text-emerald-800" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Chiffrage Économique en FCFA</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Simulation des pertes projetées et calcul du gain financier évitable par un traitement préventif au bon moment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite : Widget Démo Interactif */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xl">
                {/* Entête du widget */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">Parcelle Niayes • Tomate Plein Champ</div>
                      <div className="text-[10px] text-stone-500">Lat: 14.8912° N • Lon: -17.0215° W • Données Réelles</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Risque Jour</span>
                    <div
                      className="text-xl font-black leading-none"
                      style={{
                        color: currentDay.risk > 80 ? '#DC2626' : currentDay.risk > 50 ? '#EA580C' : '#059669',
                      }}
                    >
                      {currentDay.risk}%
                    </div>
                  </div>
                </div>

                {/* Bannière de vigilance dynamique */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between mb-5 ${
                    currentDay.vigilance === 'rouge'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : currentDay.vigilance === 'orange'
                      ? 'bg-orange-50 border-orange-200 text-orange-900'
                      : currentDay.vigilance === 'jaune'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                      style={{
                        backgroundColor:
                          currentDay.vigilance === 'rouge'
                            ? '#DC2626'
                            : currentDay.vigilance === 'orange'
                            ? '#EA580C'
                            : currentDay.vigilance === 'jaune'
                            ? '#D97706'
                            : '#059669',
                      }}
                    >
                      {currentDay.vigilance}
                    </span>
                    <span className="text-xs font-bold">{currentDay.label}</span>
                  </div>
                </div>

                {/* Graphique SVG Interactif */}
                <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-stone-200/80 mb-5">
                  <div className="flex justify-between items-center text-xs font-bold text-stone-700 mb-2">
                    <span>Courbe de Risque Mildiou (14 Jours)</span>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-emerald-700">• &lt;30% Calme</span>
                      <span className="text-amber-700">• &gt;50% Vigilance</span>
                      <span className="text-red-700">• &gt;80% Critique</span>
                    </div>
                  </div>

                  <svg viewBox="0 0 500 110" className="w-full h-24 overflow-visible">
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EA580C" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="80" x2="500" y2="80" stroke="#E5E7EB" strokeDasharray="3 3" />
                    <line x1="0" y1="45" x2="500" y2="45" stroke="#FED7AA" strokeDasharray="3 3" />
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#FEE2E2" strokeDasharray="3 3" />
                    <path
                      d="M 10 85 Q 70 75, 130 50 T 250 16 T 370 60 T 490 80 L 490 105 L 10 105 Z"
                      fill="url(#curveGrad)"
                    />
                    <path
                      d="M 10 85 Q 70 75, 130 50 T 250 16 T 370 60 T 490 80"
                      fill="none"
                      stroke="#EA580C"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx="250" cy="16" r="6" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
                  </svg>

                  {/* Sélecteur de jours cliquables J+1 à J+7 */}
                  <div className="grid grid-cols-7 gap-1.5 mt-3">
                    {daysData.map((d, idx) => (
                      <button
                        key={d.day}
                        onClick={() => setSelectedDayIdx(idx)}
                        className={`py-1.5 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                          selectedDayIdx === idx
                            ? 'bg-[#0C2B1E] text-white border-[#0C2B1E] shadow-sm'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">{d.day}</span>
                        <span
                          className="text-[11px] font-black block"
                          style={{
                            color:
                              selectedDayIdx === idx
                                ? '#C8EF56'
                                : d.risk > 80
                                ? '#DC2626'
                                : d.risk > 50
                                ? '#EA580C'
                                : '#059669',
                          }}
                        >
                          {d.risk}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Créneaux Matin / Soir */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex justify-between items-center text-xs font-bold text-stone-800 mb-1">
                      <span>Matin ({currentDay.slot1.time})</span>
                      <span
                        className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                        style={{
                          backgroundColor:
                            currentDay.slot1.status === 'optimale'
                              ? '#059669'
                              : currentDay.slot1.status === 'favorable'
                              ? '#2563EB'
                              : '#DC2626',
                        }}
                      >
                        {currentDay.slot1.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 flex gap-2">
                      <span>Vent : <strong>{currentDay.slot1.vent}</strong></span>
                      <span>Pluie : <strong>{currentDay.slot1.pluie}</strong></span>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex justify-between items-center text-xs font-bold text-stone-800 mb-1">
                      <span>Soir ({currentDay.slot2.time})</span>
                      <span
                        className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                        style={{
                          backgroundColor:
                            currentDay.slot2.status === 'optimale'
                              ? '#059669'
                              : currentDay.slot2.status === 'favorable'
                              ? '#2563EB'
                              : '#DC2626',
                        }}
                      >
                        {currentDay.slot2.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 flex gap-2">
                      <span>Vent : <strong>{currentDay.slot2.vent}</strong></span>
                      <span>Pluie : <strong>{currentDay.slot2.pluie}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. FOCUS PRODUIT AGRICONSEIL (SÉLECTEUR DE CULTURES SÉNÉGAL) */}
        <section className="bg-[#F3EFE6] py-20 px-4 sm:px-6 w-full" id="agriconseil">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Colonne gauche : Carte du conseil cultural interactif */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              {/* Onglets des cultures */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {(['oignon', 'tomate', 'arachide', 'mais'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCropKey(key)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCropKey === key
                        ? 'bg-[#0C2B1E] text-[#C8EF56] shadow-sm'
                        : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {key === 'oignon'
                      ? '🧅 Oignon'
                      : key === 'tomate'
                      ? '🍅 Tomate'
                      : key === 'arachide'
                      ? '🥜 Arachide'
                      : '🌽 Maïs'}
                  </button>
                ))}
              </div>

              <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
                  <div>
                    <h3 className="text-lg font-black text-stone-900">{currentCrop.name}</h3>
                    <span className="text-xs text-stone-500">{currentCrop.cycle}</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold">
                    {currentCrop.stage}
                  </span>
                </div>

                <div className="p-4 bg-[#FAF9F5] rounded-2xl border-l-4 border-emerald-600 mb-4">
                  <div className="text-xs font-black text-[#0C2B1E] uppercase tracking-wide mb-1">
                    {currentCrop.actionTitle}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {currentCrop.actionDesc}
                  </p>
                </div>

                <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-orange-900 tracking-wider block mb-0.5">
                    Consigne Sanitaire Immédiate
                  </span>
                  <p className="text-xs font-bold text-orange-950">
                    {currentCrop.sanitaryConseil}
                  </p>
                </div>
              </div>
            </div>

            {/* Colonne droite : Argumentaire */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8EF56] text-[#0C2B1E] text-xs font-black uppercase tracking-wider mb-4">
                Composant 2 • AgriConseil
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
                AgriMétéo analyse le ciel.<br />
                <span className="font-serif-italic font-normal text-[#1A543D]">AgriConseil décide au sol.</span>
              </h2>

              <p className="text-stone-600 text-sm sm:text-base mt-4 leading-relaxed">
                Savoir qu&apos;il va faire 34°C ne suffit pas. Ce qui compte pour l&apos;exploitant, c&apos;est de savoir si cette température met en danger son oignon en pleine bulbaison ou s&apos;il doit avancer son cycle d&apos;irrigation goutte-à-goutte à l&apos;aube.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-black text-xs shrink-0">
                    🌱
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Sensibilité Phénologique Dynamique</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Chaque variété possède un coefficient de réponse hydrique et thermique distinct selon son âge depuis le semis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-black text-xs shrink-0">
                    💧
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Adapté au Système d&apos;Arrosage</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Recommandations différenciées selon que votre parcelle fonctionne au goutte-à-goutte, par aspersion ou submersion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. SECTION COMMENT ÇA MARCHE */}
        <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full" id="comment-ca-marche">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123C2B]/10 text-[#1A543D] text-xs font-black uppercase tracking-wider mb-3">
              Simplicité Opérationnelle
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
              Quatre étapes pour sécuriser votre campagne
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-3">
              Aucun matériel coûteux à installer. Connectez vos parcelles en quelques minutes depuis votre téléphone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-lg mb-5 font-serif-italic">
                01
              </div>
              <h4 className="text-base font-black text-stone-900 mb-2">Créez votre exploitation</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Renseignez la localisation de vos terres au Sénégal (commune ou coordonnées GPS) et nommez votre exploitation.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-lg mb-5 font-serif-italic">
                02
              </div>
              <h4 className="text-base font-black text-stone-900 mb-2">Configurez vos parcelles</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Indiquez la culture (arachide, oignon, tomate, piment, maïs), la variété, la date de semis et la surface en hectares.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-lg mb-5 font-serif-italic">
                03
              </div>
              <h4 className="text-base font-black text-stone-900 mb-2">Calcul agrométéo continu</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Le moteur croise en continu les flux météo ouverts certifiés avec le stade de développement végétatif de chaque parcelle.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#0C2B1E] text-[#C8EF56] flex items-center justify-center font-black text-lg mb-5 font-serif-italic">
                04
              </div>
              <h4 className="text-base font-black text-stone-900 mb-2">Décidez avec sérénité</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Consultez votre conseil du jour, évitez les lessivages d&apos;intrants et suivez la rentabilité de votre récolte.
              </p>
            </div>
          </div>
        </section>

        {/* 9 BIS. SECTION MARKETING VITRINE : ASSISTANT IA 24/7 (Point 13) */}
        <section className="py-20 px-4 sm:px-6 w-full bg-[#FAF9F5] border-y border-stone-200/80 scroll-mt-20" id="assistant-ia">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0C2B1E] text-[#C8EF56] text-xs font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C8EF56]" />
                <span>Copilote Agronomique • Disponible 24/7</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#0C2B1E] tracking-tight">
                Une IA entraînée sur les terroirs sénégalais
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Réservée exclusivement aux producteurs abonnés à AgriImpact. Interrogez votre copilote à tout moment pour sécuriser vos arbitrages agronomiques et naviguer dans votre espace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Carte 1 : Diagnostic */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-emerald-600 hover:-translate-y-1 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-xl">
                  🔬
                </div>
                <h3 className="text-base font-bold text-stone-900">Diagnostic &amp; Posologies</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Identification des ravageurs (chenille légionnaire, cercosporiose, thrips) et calcul exact des dosages d&apos;intrants selon votre superficie.
                </p>
              </div>

              {/* Carte 2 : Fenêtres d'intervention */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-emerald-600 hover:-translate-y-1 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-800 flex items-center justify-center font-black text-xl">
                  🌦️
                </div>
                <h3 className="text-base font-bold text-stone-900">Fenêtres Météo 14 Jours</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Anticipation des créneaux de pulvérisation sans risque de lessivage par la pluie et gestion préventive du stress hydrique.
                </p>
              </div>

              {/* Carte 3 : Navigation SaaS */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-emerald-600 hover:-translate-y-1 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-xl">
                  ⚡
                </div>
                <h3 className="text-base font-bold text-stone-900">Navigation &amp; Copilote SaaS</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Demandez à l&apos;IA de vous guider dans le simulateur, d&apos;ajuster votre fiche d&apos;exploitation ou d&apos;analyser votre historique de récolte.
                </p>
              </div>

              {/* Carte 4 : Mode 100% Vocal */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:border-emerald-600 hover:-translate-y-1 transition-all space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-800 flex items-center justify-center font-black text-xl">
                  🎙️
                </div>
                <h3 className="text-base font-bold text-stone-900">100% Mains-Libres au Champ</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Dictez vos interrogations en marchant dans vos parcelles et écoutez les recommandations via la synthèse vocale intégrée.
                </p>
              </div>
            </div>

            {/* Bandeau d'accès restreint avec CTA */}
            <div className="p-6 rounded-3xl bg-[#0C2B1E] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-black uppercase text-[#C8EF56]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Accès Réservé au SaaS Connecté</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Prêt à activer votre assistant agronomique personnel ?
                </h4>
                <p className="text-xs text-stone-300">
                  L&apos;assistant IA s&apos;initialise automatiquement avec les coordonnées et les cultures de votre exploitation.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                <Link
                  href="/signup"
                  className="px-5 py-3 bg-[#C8EF56] hover:bg-[#B8DF44] text-[#0C2B1E] text-xs font-black rounded-full shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Créer mon compte exploitant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href="#tarifs"
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-colors whitespace-nowrap"
                >
                  Voir les formules
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 10. SECTION PRODUIT / APERÇU DASHBOARD SAAS */}
        <section className="bg-[#0C2B1E] text-white py-20 px-4 sm:px-6 w-full" id="produit">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#C8EF56] text-xs font-black uppercase tracking-wider mb-3">
                Interface Exploitant
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Un tableau de bord pensé pour la clarté et la décision
              </h2>
              <p className="text-stone-300 text-sm sm:text-base mt-3">
                Chaque chiffre affiché a une justification agronomique ou financière. Fini les graphiques indéchiffrables.
              </p>
            </div>

            {/* Cadre du mock dashboard */}
            <div className="bg-white text-stone-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/20">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                    🌾
                  </div>
                  <div>
                    <span className="text-sm font-black text-[#0C2B1E]">Exploitation Maraîchère de Kayar</span>
                    <span className="text-[10px] text-stone-500 block">3 parcelles actives • Région de Thiès</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  En ligne • Synchro 15 min
                </span>
              </div>

              {/* 4 cartes de rentabilité ROI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Perte Projetée</span>
                  <div className="text-2xl font-black text-red-600 mt-1">18.4%</div>
                  <span className="text-[10px] text-stone-500">~4 600 kg menacés</span>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Exposition Brute</span>
                  <div className="text-2xl font-black text-stone-900 mt-1">1 610 000 F</div>
                  <span className="text-[10px] text-stone-500">Cours 350 FCFA/kg</span>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Gain Évitable</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">1 320 200 F</div>
                  <span className="text-[10px] text-emerald-600 font-bold">82% de marge sauvée</span>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Ratio ROI</span>
                  <div className="text-2xl font-black text-[#1A543D] mt-1">15.1 x</div>
                  <span className="text-[10px] text-stone-500">Coût trait. 35k/ha</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link
                  href={saasDestination}
                  className="inline-flex items-center gap-2 py-3 px-6 bg-[#0C2B1E] text-[#C8EF56] font-black text-xs rounded-full hover:bg-[#123C2B] transition-all"
                >
                  <span>{profile ? 'Accéder à mon tableau de bord' : 'Tester la Démo du Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 11. SECTION EXPÉRIENCE MOBILE-FIRST */}
        <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123C2B]/10 text-[#1A543D] text-xs font-black uppercase tracking-wider mb-3">
              Conçu pour le terrain
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
              Une expérience pensée pour le smartphone au champ
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-3">
              Interface ultra-légère, lisible en plein soleil, adaptée aux réseaux mobiles 3G/4G du Sénégal avec synchronisation hors-ligne.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Mockup 1 */}
            <div className="w-[280px] bg-stone-900 p-3 rounded-[36px] shadow-2xl border-4 border-stone-800">
              <div className="bg-white rounded-[26px] p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-bold text-[#0C2B1E] border-b pb-2">
                  <span>AGRIMPACT</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500">Station Kayar</span>
                  <div className="text-2xl font-black text-[#0C2B1E]">27°C</div>
                  <span className="text-[10px] text-stone-600">Vent 9 km/h • Humidité 84%</span>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-orange-950">
                  <span className="text-[9px] font-black uppercase text-orange-700">VIGILANCE ORANGE</span>
                  <div className="text-xs font-bold mt-1">Risque Mildiou 86% J+3</div>
                  <p className="text-[10px] text-orange-800 mt-1">Fenêtre : mercredi 06h-09h30.</p>
                </div>
              </div>
            </div>

            {/* Mockup 2 */}
            <div className="w-[280px] bg-stone-900 p-3 rounded-[36px] shadow-2xl border-4 border-stone-800">
              <div className="bg-white rounded-[26px] p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-bold text-[#0C2B1E] border-b pb-2">
                  <span>Parcelle Oignon 1.5 Ha</span>
                  <span className="text-[10px] font-bold text-emerald-700">En cours</span>
                </div>
                <div className="bg-white border border-stone-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-stone-500">Stade cultural</span>
                  <div className="text-sm font-black text-[#0C2B1E]">Bulbaison (J+52)</div>
                  <span className="text-[10px] text-stone-600">Sensibilité modérée</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800">Gain évitable</span>
                  <div className="text-sm font-black text-emerald-900">+850 000 FCFA</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. SECTION ANCRAGE SÉNÉGAL & LES 4 TERROIRS */}
        <section className="bg-[#0C2B1E] text-white py-20 px-4 sm:px-6 w-full" id="terroirs">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#C8EF56] text-xs font-black uppercase tracking-wider mb-3">
                Territoire & Spécificités
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Conçu pour les 4 grands terroirs du Sénégal
              </h2>
              <p className="text-stone-300 text-sm sm:text-base mt-3">
                Chaque bassin agricole possède son équilibre microclimatique et ses vulnérabilités sanitaires.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all">
                <div className="text-2xl mb-3">📍</div>
                <h4 className="text-lg font-black text-white mb-1">Les Niayes</h4>
                <div className="text-xs font-bold text-[#C8EF56] uppercase mb-2">Oignon, Tomate, Piment</div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Zone côtière à forte hygrométrie et brouillards matinaux. Pression intense de mildiou nécessitant un timing précis.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all">
                <div className="text-2xl mb-3">📍</div>
                <h4 className="text-lg font-black text-white mb-1">Bassin Arachidier</h4>
                <div className="text-xs font-bold text-[#C8EF56] uppercase mb-2">Arachide, Mil, Niébé</div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Kaolack, Fatick, Kaffrine. Sensibilité aiguë à l&apos;installation des pluies et à la phase de gynophorisation.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all">
                <div className="text-2xl mb-3">📍</div>
                <h4 className="text-lg font-black text-white mb-1">Vallée du Fleuve</h4>
                <div className="text-xs font-bold text-[#C8EF56] uppercase mb-2">Riz irrigué, Tomate, Oignon</div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Saint-Louis, Podor, Matam. Chaleurs caniculaires (&gt;38°C), forte évapotranspiration et gestion de l&apos;irrigation par canaux.
                </p>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all">
                <div className="text-2xl mb-3">📍</div>
                <h4 className="text-lg font-black text-white mb-1">Casamance & Sud</h4>
                <div className="text-xs font-bold text-[#C8EF56] uppercase mb-2">Mangue, Anacarde, Riz</div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Pluviométrie abondante, forte biomasse. Vigilance accrue sur la pourriture racinaire et les attaques post-averse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 13. SECTION GRILLE TARIFAIRE OFFICIELLE AGRIMPACT (100% PAYANT SANS ESSAI GRATUIT) */}
        <PricingTable preselectedPlan="pro" />

        {/* 14. SECTION NOTRE VISION & PHILOSOPHIE */}
        <section className="bg-[#F3EFE6] py-20 px-4 sm:px-6 w-full">
          <div className="max-w-4xl mx-auto bg-white p-8 sm:p-14 rounded-3xl border border-stone-200 shadow-xl text-center">
            <div className="text-3xl mb-4">🌱</div>
            <blockquote className="font-serif-italic text-xl sm:text-3xl text-[#0C2B1E] leading-relaxed mb-6">
              « La technologie n&apos;a de valeur que si elle protège le labeur de l&apos;agriculteur et sécurise l&apos;alimentation de nos communautés. AgriImpact est né de la conviction que la précision agronomique doit être accessible au producteur de Kayar comme à celui de Podor. »
            </blockquote>
            <div className="font-bold text-stone-900 text-sm">L&apos;Équipe Fondatrice AgriImpact</div>
            <div className="text-xs text-stone-500 mt-0.5">Dakar • Thiès • Saint-Louis — Démarche de validation 2026</div>
          </div>
        </section>

        {/* 15. SECTION FOIRE AUX QUESTIONS (FAQ) */}
        <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123C2B]/10 text-[#1A543D] text-xs font-black uppercase tracking-wider mb-3">
              Questions Fréquentes
            </div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Tout ce que vous devez savoir
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Faut-il acheter des capteurs ou du matériel spécial ?",
                a: "Non, absolument aucun matériel n'est requis. AgriImpact exploite les flux météo satellites certifiés (Open-Meteo) et les données de l'ANACIM géolocalisées sur votre parcelle. Tout fonctionne directement sur votre smartphone.",
              },
              {
                q: "Comment s'effectue le paiement avec Wave ou Orange Money ?",
                a: "Le règlement s'effectue en quelques secondes depuis votre téléphone via un QR code ou un paiement direct sans frais bancaires cachés.",
              },
              {
                q: "Puis-je consulter mes conseils si la connexion est faible au champ ?",
                a: "Oui, AgriImpact met en mémoire les données du jour sur votre smartphone dès la première ouverture du matin pour vous permettre de travailler même hors réseau.",
              },
              {
                q: "Mes données de parcelles restent-elles confidentielles ?",
                a: "Absolument. Vos parcelles et historiques culturaux vous appartiennent exclusivement et sont protégés par des politiques d'isolation strictes (Row-Level Security PostgreSQL).",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-stone-900 flex justify-between items-center text-sm sm:text-base cursor-pointer hover:bg-stone-50"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-500 transition-transform ${
                      activeFaq === idx ? 'rotate-180 text-emerald-700' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 16. SECTION CTA FINAL IMMERSIF */}
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full mb-12">
          <div className="bg-gradient-to-br from-[#0C2B1E] via-[#123C2B] to-[#0A1C14] text-white rounded-[32px] p-8 sm:p-16 text-center shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#C8EF56] text-xs font-black uppercase tracking-wider mb-4">
                Campagne Agricole 2026
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Prêt à sécuriser vos récoltes et vos marges ?
              </h2>
              <p className="text-stone-300 text-sm sm:text-base mt-4 mb-8">
                Testez gratuitement AgriImpact sur votre première parcelle et rejoignez les exploitants pilotes au Sénégal.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href={saasDestination}
                  className="py-3.5 px-8 bg-[#C8EF56] hover:bg-[#B8DF44] text-[#0C2B1E] text-sm font-black rounded-full shadow-lg transition-all"
                >
                  {profile ? 'Accéder à mon tableau de bord' : 'Explorer la démo interactive'}
                </Link>
                <Link
                  href="/signup"
                  className="py-3.5 px-8 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold rounded-full transition-all"
                >
                  Créer mon exploitation
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 17. FOOTER COMPLET */}
      <footer className="bg-[#081710] text-stone-400 py-16 px-4 sm:px-6 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0C2B1E] flex items-center justify-center text-white">
                <Sprout className="w-4 h-4 text-[#C8EF56]" />
              </div>
              <span className="text-base font-black text-white tracking-tight">AGRIMPACT</span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              Le copilote agrométéorologique et décisionnel conçu pour sécuriser les récoltes et les marges des producteurs agricoles du Sénégal et du Sahel.
            </p>
            <div className="mt-4">
              <span className="inline-block px-2.5 py-1 rounded-md bg-white/10 text-[#C8EF56] text-[10px] font-bold">
                🇸🇳 Conçu au Sénégal • Campagne 2026
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] mb-4">Solutions</h4>
            <ul className="space-y-2.5">
              <li><a href="#agrimeteo" className="hover:text-white transition-colors">AgriMétéo 14 Jours</a></li>
              <li><a href="#agriconseil" className="hover:text-white transition-colors">AgriConseil Phénologique</a></li>
              <li><a href="#terroirs" className="hover:text-white transition-colors">Filière Oignon & Tomate</a></li>
              <li><a href="#terroirs" className="hover:text-white transition-colors">Arachide & Grandes Cultures</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] mb-4">Plateforme</h4>
            <ul className="space-y-2.5">
              <li><Link href={saasDestination} className="hover:text-white transition-colors">Tableau de bord</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion exploitant</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Créer une exploitation</Link></li>
              <li><a href="#tarifs" className="hover:text-white transition-colors">Forfaits Wave & OM</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] mb-4">Assistance</h4>
            <ul className="space-y-2.5">
              <li><a href="tel:338001212" className="text-white font-bold hover:text-[#C8EF56] transition-colors">33 800 12 12</a></li>
              <li><span>Dakar & Thiès, Sénégal</span></li>
              <li><span className="text-stone-500">contact@agrimpact.sn</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-[11px]">
          <div>© 2026 AgriImpact Sénégal. Tous droits réservés.</div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-stone-300">Tableau de bord</Link>
            <span>•</span>
            <a href="#tarifs" className="hover:text-stone-300">Tarification locale</a>
            <span>•</span>
            <a href="#probleme" className="hover:text-stone-300">Démarche agronomique</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
