import { chargerDonnees, estDisponible } from './donnees.js';
import { remplirTextes } from './contenu.js';
import {
  remplirPortrait, remplirFiche, remplirLivraison, remplirAvis, remplirContact, remplirPied,
} from './sections.js';
import { initRevele } from './revele.js';
import { initHero } from './hero.js';
import { initIdee } from './idee.js';
import { initCatalogue } from './catalogue.js';
import { initVoirEn3D } from './voir-en-3d.js';
import { initBoutiques } from './boutiques.js';
import { initFichePiece } from './fiche-piece.js';
import { initVideos } from './videos.js';
import { initRebours } from './rebours.js';

function majCompteurs(pieces) {
  const n = pieces.filter(estDisponible).length;
  document.querySelectorAll('[data-compteur]').forEach((el) => { el.textContent = n; });
}

// Numérote les pistes visibles dans l'ordre (A1, A2… B1, B2…) :
// une section masquée (ex. « Où le voir » sans boutique) ne laisse pas de trou.
function renumeroterPistes() {
  const compteurs = {};
  document.querySelectorAll('.piste').forEach((el) => {
    if (el.closest('[hidden]')) return;
    const face = (el.textContent.trim().match(/^[A-Z]/) || [''])[0];
    if (!face) return;
    compteurs[face] = (compteurs[face] || 0) + 1;
    el.textContent = `${face}${compteurs[face]}`;
  });
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
  const { contenu, pieces, catalogue } = donnees;
  remplirTextes(contenu);
  remplirPortrait(contenu);
  remplirFiche(contenu);
  remplirLivraison(contenu);
  initVideos({ contenu });
  remplirAvis(contenu);
  remplirContact(contenu);
  remplirPied(contenu);
  majCompteurs(pieces);
  initHero({ pieces, catalogue });
  initRebours({ contenu });
  initIdee({ contenu });
  const fiche = initFichePiece({ contenu, pieces, catalogue });
  initCatalogue({ contenu, pieces, catalogue, ouvrirFiche: fiche.ouvrir });
  initVoirEn3D({ contenu, pieces, catalogue });
  await initBoutiques({ contenu });
  renumeroterPistes();
  initRevele();
}

demarrer();
