// « L'idée » : la vraie façade, et au scroll les repères 1-2-3
// (haut-parleurs dans les bobines, fenêtre de bande, évent bass-reflex).
import { creer, ecrire } from './contenu.js';
import { mouvementReduit } from './revele.js';

const borne = (v) => Math.min(1, Math.max(0, v));
const plage = (p, debut, fin) => borne((p - debut) / (fin - debut));

export function initIdee({ contenu }) {
  const section = document.querySelector('[data-idee]');
  if (!section) return;
  const { phraseOuverture, etapes, connectique, facade } = contenu.idee;

  ecrire(section.querySelector('[data-phrase-ouverture]'),
    phraseOuverture.version === 'affirmation' ? phraseOuverture.affirmation : phraseOuverture.question);

  const visuel = section.querySelector('[data-idee-facade]');
  const img = document.createElement('img');
  img.src = facade.image;
  img.alt = facade.alt;
  img.width = 1400;
  img.height = 729;
  img.loading = 'lazy';
  img.decoding = 'async';
  visuel.append(img);
  // Repères positionnés en % de la façade (contenu.json → idee.facade.reperes)
  facade.reperes.forEach(([x, y], i) => {
    const r = creer('span', 'repere', String(i + 1));
    r.style.setProperty('--x', `${x}%`);
    r.style.setProperty('--y', `${y}%`);
    r.setAttribute('aria-hidden', 'true');
    visuel.append(r);
  });
  const reperes = [...visuel.querySelectorAll('.repere')];

  const ol = section.querySelector('[data-idee-etapes]');
  const items = etapes.map((texte) => { const li = creer('li', 'idee__etape', texte); ol.append(li); return li; });
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
    scene.style.setProperty('--phrase', plage(p, 0, 0.12).toFixed(3));
    scene.style.setProperty('--zoom', plage(p, 0.05, 0.35).toFixed(3));
    scene.style.setProperty('--conn', plage(p, 0.8, 0.92).toFixed(3));
    items.forEach((li, i) => {
      const actif = p >= 0.35 + i * 0.13;
      li.classList.toggle('est-active', actif);
      reperes[i]?.classList.toggle('est-active', actif);
    });
  };
  const demander = () => { if (!enAttente) { enAttente = true; requestAnimationFrame(maj); } };
  let actif = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !actif) {
      actif = true;
      window.addEventListener('scroll', demander, { passive: true });
      window.addEventListener('resize', demander);
      demander();
    } else if (!e.isIntersecting && actif) {
      actif = false;
      window.removeEventListener('scroll', demander);
      window.removeEventListener('resize', demander);
      maj();
    }
  }).observe(section);
  maj();
}
