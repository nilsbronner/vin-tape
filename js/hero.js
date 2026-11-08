// Hero : la cassette passe d'une pièce à l'autre, bobines en rotation.
import { svgCassette, appliquerCouleurs, majEtiquette } from './cassette.js';
import { couleursPiece, numeroAffiche } from './donnees.js';
import { mouvementReduit } from './revele.js';

const INTERVALLE = 2800;

export function initHero({ pieces, palette }) {
  const hero = document.querySelector('.hero');
  const cible = document.querySelector('[data-hero-cassette]');
  const legende = document.querySelector('[data-hero-legende]');
  if (!hero || !cible || !pieces.length) return;

  cible.innerHTML = svgCassette({ classe: 'k7--tourne', numero: numeroAffiche(pieces[0]), format: pieces[0].format });
  const svg = cible.querySelector('svg');

  let index = 0;
  const afficher = (i) => {
    const piece = pieces[i];
    appliquerCouleurs(document.documentElement, couleursPiece(palette, piece));
    majEtiquette(svg, { numero: numeroAffiche(piece), format: piece.format });
    if (legende) {
      legende.textContent = `N° ${numeroAffiche(piece)}/24 · ${piece.couleurFacade} / ${piece.couleurArriere} / ${piece.etiquette}`;
    }
  };
  afficher(0);

  if (mouvementReduit()) {
    svg.classList.remove('k7--tourne');
    return;
  }

  let minuteur = null;
  let visible = true;
  const demarrer = () => {
    if (minuteur || !visible || document.hidden) return;
    minuteur = setInterval(() => {
      index = (index + 1) % pieces.length;
      afficher(index);
    }, INTERVALLE);
  };
  const arreter = () => { clearInterval(minuteur); minuteur = null; };

  new IntersectionObserver(([entree]) => {
    visible = entree.isIntersecting;
    svg.classList.toggle('k7--tourne', visible);
    visible ? demarrer() : arreter();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : demarrer()));
  demarrer();
}
