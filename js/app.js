import { chargerDonnees, estDisponible } from './donnees.js';
import { remplirTextes } from './contenu.js';
import {
  remplirPortrait, remplirPartenaires, remplirFiche, remplirAvis, remplirContact, remplirPied,
} from './sections.js';
import { initRevele } from './revele.js';
import { injecterStyle } from './cassette.js';
import { initHero } from './hero.js';
import { initIdee } from './idee.js';
import { initCatalogue } from './catalogue.js';

function majCompteurs(pieces) {
  const n = pieces.filter(estDisponible).length;
  document.querySelectorAll('[data-compteur]').forEach((el) => { el.textContent = n; });
}

function initEntete() {
  const entete = document.querySelector('[data-entete]');
  if (!entete) return;
  const maj = () => entete.classList.toggle('est-defile', window.scrollY > 40);
  window.addEventListener('scroll', maj, { passive: true });
  maj();
}

async function demarrer() {
  document.documentElement.classList.add('js');
  initEntete();
  let donnees;
  try {
    donnees = await chargerDonnees();
  } catch (erreur) {
    console.error(erreur);
    document.documentElement.classList.add('erreur-donnees');
    return;
  }
  const { contenu, pieces, palette } = donnees;
  injecterStyle();
  remplirTextes(contenu);
  remplirPortrait(contenu);
  remplirPartenaires(contenu);
  remplirFiche(contenu);
  remplirAvis(contenu);
  remplirContact(contenu);
  remplirPied(contenu);
  majCompteurs(pieces);
  initHero({ pieces, palette });
  initIdee({ contenu, pieces, palette });
  initCatalogue({ contenu, pieces, palette });
  initRevele();
}

demarrer();
