// Hero : les vraies pièces défilent en fondu, une par une.
import { aUnVisuel, numeroAffiche, nomCouleur, nomVersion, couleurHex } from './donnees.js';
import { mouvementReduit } from './revele.js';

const INTERVALLE = 3200;

export function initHero({ pieces, catalogue }) {
  const hero = document.querySelector('.hero');
  const cible = document.querySelector('[data-hero-visuel]');
  const legende = document.querySelector('[data-hero-legende]');
  const visibles = pieces.filter(aUnVisuel);
  if (!hero || !cible || !visibles.length) return;

  // La première image est déjà dans le HTML (affichage immédiat) : on la réutilise.
  const initiale = cible.querySelector('img');
  if (initiale && initiale.getAttribute('src') !== visibles[0].images.packshot) initiale.remove();
  const images = visibles.map((piece, i) => {
    if (i === 0 && initiale?.isConnected) return initiale;
    const img = document.createElement('img');
    img.src = piece.images.packshot;
    img.alt = i === 0 ? `Enceinte Vin’tape n° ${numeroAffiche(piece)}, ${nomCouleur(catalogue, piece)}, version ${nomVersion(catalogue, piece)}` : '';
    if (i > 0) img.setAttribute('aria-hidden', 'true');
    img.width = 951;
    img.height = 650;
    img.decoding = 'async';
    if (i === 0) img.fetchPriority = 'high';
    else img.loading = 'lazy';
    cible.append(img);
    return img;
  });

  let index = 0;
  const afficher = (i) => {
    images.forEach((img, k) => img.classList.toggle('est-active', k === i));
    const piece = visibles[i];
    document.documentElement.style.setProperty('--facade', couleurHex(catalogue, piece));
    if (legende) legende.textContent = `N° ${numeroAffiche(piece)}/24 · ${nomCouleur(catalogue, piece)} · ${nomVersion(catalogue, piece)}`;
  };
  afficher(0);
  if (mouvementReduit() || visibles.length < 2) return;

  let minuteur = null;
  let visible = true;
  const demarrer = () => {
    if (minuteur || !visible || document.hidden) return;
    minuteur = setInterval(() => { index = (index + 1) % visibles.length; afficher(index); }, INTERVALLE);
  };
  const arreter = () => { clearInterval(minuteur); minuteur = null; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? demarrer() : arreter(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : demarrer()));
  demarrer();
}
