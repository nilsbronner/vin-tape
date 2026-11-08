// Hero : les vraies pièces défilent en fondu, une par une.
// Seules la pièce affichée et la suivante sont chargées (performance).
import { aUnVisuel, numeroAffiche, nomCouleur, nomVersion, couleurHex } from './donnees.js';
import { mouvementReduit } from './revele.js';

const INTERVALLE = 3200;

export function initHero({ pieces, catalogue }) {
  const hero = document.querySelector('.hero');
  const cible = document.querySelector('[data-hero-visuel]');
  const legende = document.querySelector('[data-hero-legende]');
  const visibles = pieces.filter(aUnVisuel);
  if (!hero || !cible || !visibles.length) return;

  const images = new Array(visibles.length);
  // La première image est déjà dans le HTML (affichage immédiat) : on la réutilise.
  const initiale = cible.querySelector('img');
  if (initiale && initiale.getAttribute('src') === visibles[0].images.packshot) images[0] = initiale;
  else initiale?.remove();

  const image = (i) => {
    if (!images[i]) {
      const piece = visibles[i];
      const img = document.createElement('img');
      img.src = piece.images.packshot;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.width = 951;
      img.height = 650;
      img.decoding = 'async';
      cible.append(img);
      images[i] = img;
    }
    return images[i];
  };

  let index = 0;
  const afficher = (i) => {
    const active = image(i);
    images.forEach((img) => img?.classList.toggle('est-active', img === active));
    const piece = visibles[i];
    document.documentElement.style.setProperty('--facade', couleurHex(catalogue, piece));
    if (legende) legende.textContent = `N° ${numeroAffiche(piece)}/24 · ${nomCouleur(catalogue, piece)} · ${nomVersion(catalogue, piece)}`;
  };
  afficher(0);
  if (mouvementReduit() || visibles.length < 2) return;

  let minuteur = null;
  let visible = true;
  const suivante = () => (index + 1) % visibles.length;
  const demarrer = () => {
    if (minuteur || !visible || document.hidden) return;
    image(suivante()); // précharge la prochaine
    minuteur = setInterval(() => {
      index = suivante();
      afficher(index);
      image(suivante());
    }, INTERVALLE);
  };
  const arreter = () => { clearInterval(minuteur); minuteur = null; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? demarrer() : arreter(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : demarrer()));
  // Le défilement démarre après le chargement de la page, pour ne pas gêner l'affichage initial.
  if (document.readyState === 'complete') demarrer();
  else window.addEventListener('load', demarrer, { once: true });
}
