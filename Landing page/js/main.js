/**
 * AGRIMPACT - MAIN JS
 * Navigation, interactions et comportement global
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. NAVBAR SCROLL EFFECT ---
  const navbar = document.querySelector('.navbar-floating');
  const handleScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- 2. MOBILE MENU DRAWER ---
  const burgerBtn = document.querySelector('.nav-burger');
  const closeBtn = document.querySelector('.mobile-drawer-close');
  const drawer = document.querySelector('.mobile-drawer');
  const drawerLinks = document.querySelectorAll('.mobile-drawer-link');

  function openDrawer() {
    if (drawer) {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (drawer) {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  drawerLinks.forEach((link) => link.addEventListener('click', closeDrawer));

  // Fermer la modal si on clique en dehors
  if (drawer) {
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeDrawer();
    });
  }

  // --- 3. COMMUTATEUR DE PRIX (MENSUEL / ANNUEL) ---
  const billingToggle = document.getElementById('billingToggle');
  const pricePro = document.getElementById('pricePro');
  const priceCoop = document.getElementById('priceCoop');
  const periodLabels = document.querySelectorAll('.pricing-period-label');

  if (billingToggle && pricePro && priceCoop) {
    billingToggle.addEventListener('change', () => {
      const isAnnual = billingToggle.checked;
      if (isAnnual) {
        // -20% sur l'annuel : 5 900 -> 4 700 F/mois, 54 900 -> 43 900 F/mois
        pricePro.textContent = '4 700';
        priceCoop.textContent = '43 900';
        periodLabels.forEach((lbl) => (lbl.textContent = 'FCFA / mois (facturé annuellement)'));
      } else {
        pricePro.textContent = '5 900';
        priceCoop.textContent = '54 900';
        periodLabels.forEach((lbl) => (lbl.textContent = 'FCFA / mois'));
      }
    });
  }

  // --- 4. ACCORDEON FOIRE AUX QUESTIONS (FAQ) ---
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        // Fermer les autres
        faqItems.forEach((other) => other.classList.remove('active'));
        if (!isOpen) item.classList.add('active');
      });
    }
  });
});
