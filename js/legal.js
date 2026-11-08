import { chargerDonnees } from './donnees.js';
import { creer, ecrire, remplirTextes } from './contenu.js';
import { remplirPied } from './sections.js';

const { contenu } = await chargerDonnees();
const main = document.querySelector('[data-page]');
const page = contenu.legal?.[main.dataset.page];
if (page) {
  ecrire(main.querySelector('h1'), page.titre);
  const cible = main.querySelector('[data-legal]');
  for (const { titre, texte } of page.sections) {
    const section = creer('section');
    section.append(creer('h2', null, titre), creer('p', null, texte));
    cible.append(section);
  }
}
remplirPied(contenu);
remplirTextes(contenu, document.querySelector('.pied'));
