/**
 * AGRIMPACT - ANIMATIONS JS
 * IntersectionObserver pour apparitions et transitions fluides
 */

document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer pour les éléments [data-reveal]
  const revealElements = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    // Repli direct si le navigateur est ancien
    revealElements.forEach((el) => el.classList.add('revealed'));
  }

  // Micro-mouvement léger des cartes flottantes selon la souris
  const heroCard = document.querySelector('.hero-card');
  const floatingWidgets = document.querySelector('.hero-floating-widgets');

  if (heroCard && floatingWidgets && window.innerWidth > 992) {
    heroCard.addEventListener('mousemove', (e) => {
      const rect = heroCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      floatingWidgets.style.transform = `translate(${x * 12}px, ${y * 12}px)`;
    });

    heroCard.addEventListener('mouseleave', () => {
      floatingWidgets.style.transform = 'translate(0px, 0px)';
      floatingWidgets.style.transition = 'transform 0.5s ease-out';
    });
  }
});
