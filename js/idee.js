// « L'idée » : au scroll, la cassette devient enceinte.
// La progression (0 → 1) est écrite dans des variables CSS : --phrase, --hp
// (haut-parleurs), --annot (repères) et --conn (ligne de connectique).
import { svgCassette, appliquerCouleurs } from './cassette.js';
import { couleursPiece } from './donnees.js';
import { creer, ecrire } from './contenu.js';
import { mouvementReduit } from './revele.js';

const borne = (v) => Math.min(1, Math.max(0, v));
const plage = (p, debut, fin) => borne((p - debut) / (fin - debut));

export function initIdee({ contenu, pieces, palette }) {
  const section = document.querySelector('[data-idee]');
  if (!section) return;
  const { phraseOuverture, etapes, connectique } = contenu.idee;

  ecrire(section.querySelector('[data-phrase-ouverture]'),
    phraseOuverture.version === 'affirmation' ? phraseOuverture.affirmation : phraseOuverture.question);

  const cassette = section.querySelector('[data-idee-cassette]');
  cassette.innerHTML = svgCassette({ annotations: true, format: 'C90' });
  const modele = pieces.find((p) => p.couleurFacade === 'orange') || pieces[0];
  if (modele) appliquerCouleurs(cassette, couleursPiece(palette, modele));

  const ol = section.querySelector('[data-idee-etapes]');
  const items = etapes.map((texte) => {
    const li = creer('li', 'idee__etape', texte);
    ol.append(li);
    return li;
  });

  const ul = section.querySelector('[data-idee-connectique]');
  for (const texte of connectique) ul.append(creer('li', null, texte));

  if (mouvementReduit()) return; // état final affiché d'emblée (CSS)

  section.classList.add('idee--anime');
  const scene = section.querySelector('.idee__scene');
  let enAttente = false;

  const maj = () => {
    enAttente = false;
    const rect = section.getBoundingClientRect();
    const course = rect.height - window.innerHeight;
    const p = course > 0 ? borne(-rect.top / course) : 1;
    const hp = plage(p, 0.18, 0.5);
    scene.style.setProperty('--phrase', plage(p, 0, 0.12).toFixed(3));
    scene.style.setProperty('--hp', hp.toFixed(3));
    scene.style.setProperty('--annot', plage(p, 0.5, 0.6).toFixed(3));
    scene.style.setProperty('--conn', plage(p, 0.78, 0.9).toFixed(3));
    items.forEach((li, i) => li.classList.toggle('est-active', p >= 0.52 + i * 0.08));
  };
  const demander = () => {
    if (!enAttente) { enAttente = true; requestAnimationFrame(maj); }
  };

  let actif = false;
  new IntersectionObserver(([entree]) => {
    if (entree.isIntersecting && !actif) {
      actif = true;
      window.addEventListener('scroll', demander, { passive: true });
      window.addEventListener('resize', demander);
      demander();
    } else if (!entree.isIntersecting && actif) {
      actif = false;
      window.removeEventListener('scroll', demander);
      window.removeEventListener('resize', demander);
      maj();
    }
  }).observe(section);
  maj();
}
