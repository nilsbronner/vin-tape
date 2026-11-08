// Apparition douce des blocs .revele quand ils entrent dans l'écran.
export function initRevele() {
  const elements = document.querySelectorAll('.revele:not(.est-visible)');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('est-visible'));
    return;
  }
  const observateur = new IntersectionObserver((entrees) => {
    for (const entree of entrees) {
      if (entree.isIntersecting) {
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  elements.forEach((el) => observateur.observe(el));
}

export const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
