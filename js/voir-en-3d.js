// « Voir chez moi » : la pièce en 3D (modèle habillé des vraies photos)
// et, sur téléphone, en réalité augmentée à taille réelle
// (Quick Look sur iPhone, Scene Viewer / WebXR sur Android).
// La bibliothèque model-viewer (≈ 1 Mo) n'est chargée qu'à l'approche de la section.
import { aUn3D, estDisponible, numeroAffiche, resume, nomCouleur, nomVersion } from './donnees.js';
import { creer, ecrire, typo } from './contenu.js';
import { choisir, pieceCourante, surChoix } from './selection.js';
import { boutonReserver } from './catalogue.js';

const BIBLIOTHEQUE = '/assets/vendor/model-viewer-4.4.0.min.js';
// Dimensions du modèle généré par outils/generer_modeles.py (en cm)
const MODELE_CM = { largeur: 45, hauteur: 45 / 1.92, profondeur: 20 };

export function initVoirEn3D({ contenu, pieces, catalogue }) {
  const racine = document.querySelector('[data-v3d]');
  if (!racine) return;
  const textes = contenu.voirChezMoi;
  const scene = racine.querySelector('[data-v3d-scene]');
  const select = racine.querySelector('[data-v3d-select]');
  const zoneAR = racine.querySelector('[data-v3d-ar]');
  const zoneReserver = racine.querySelector('[data-v3d-reserver]');
  const avec3D = pieces.filter(aUn3D);
  if (!avec3D.length) { racine.hidden = true; return; }

  // Sélecteur de pièce
  for (const piece of avec3D) {
    const option = document.createElement('option');
    option.value = piece.numero;
    option.textContent = typo(`N° ${numeroAffiche(piece)} — ${resume(catalogue, piece)}${estDisponible(piece) ? '' : ' (vendue)'}`);
    select.append(option);
  }
  const parNumero = (n) => avec3D.find((p) => p.numero === Number(n));
  select.addEventListener('change', () => choisir(parNumero(select.value), 'v3d'));
  const decaler = (pas) => {
    const i = Math.max(0, avec3D.indexOf(parNumero(select.value)));
    choisir(avec3D[(i + pas + avec3D.length) % avec3D.length], 'v3d');
  };
  racine.querySelector('[data-v3d-prec]').addEventListener('click', () => decaler(-1));
  racine.querySelector('[data-v3d-suiv]').addEventListener('click', () => decaler(1));

  // Échelle : vraies dimensions si renseignées, sinon dimensions du modèle
  const dim = contenu.ficheTechnique?.dimensionsCm || {};
  const echelle = ['largeur', 'hauteur', 'profondeur'].map((k) => (dim[k] ? dim[k] / MODELE_CM[k] : 1));
  const note = racine.querySelector('[data-v3d-dimensions]');
  if (note) {
    ecrire(note, dim.largeur && dim.hauteur && dim.profondeur
      ? `${textes.dimensions} : ${dim.largeur} × ${dim.hauteur} × ${dim.profondeur} cm`
      : textes.dimensionsProvisoires);
  }

  // Visionneuse : poster (packshot) tout de suite, 3D à l'approche
  const mv = document.createElement('model-viewer');
  const attributs = {
    ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor',
    'camera-controls': '', 'touch-action': 'pan-y', 'auto-rotate': '', 'auto-rotate-delay': '2500',
    'rotation-per-second': '18deg', 'interaction-prompt': 'none', 'camera-orbit': '-28deg 76deg auto',
    'min-camera-orbit': 'auto 20deg auto', 'max-camera-orbit': 'auto 95deg auto',
    'shadow-intensity': '1.1', 'shadow-softness': '0.9', exposure: '1.05', 'environment-image': 'neutral',
    scale: echelle.join(' '), reveal: 'auto', loading: 'eager',
  };
  for (const [k, v] of Object.entries(attributs)) mv.setAttribute(k, v);
  mv.className = 'v3d__viewer';
  // Bouton AR intégré masqué : on utilise le nôtre, plus visible
  const boutonCache = document.createElement('span');
  boutonCache.slot = 'ar-button';
  boutonCache.hidden = true;
  mv.append(boutonCache);
  const poster = document.createElement('img');
  poster.className = 'v3d__poster';
  poster.alt = '';
  poster.width = 951;
  poster.height = 650;
  scene.append(poster, mv);

  let courant = null;
  function afficher(piece) {
    if (!piece || !aUn3D(piece)) return;
    courant = piece;
    select.value = piece.numero;
    mv.setAttribute('poster', piece.images?.packshot || '');
    if (!racine.classList.contains('v3d--pret')) poster.src = piece.images?.packshot || '';
    mv.setAttribute('src', piece.modele3d);
    mv.setAttribute('alt', typo(`Enceinte Vin’tape n° ${numeroAffiche(piece)} en 3D : ${nomCouleur(catalogue, piece)}, version ${nomVersion(catalogue, piece)}`));
    if (zoneReserver) {
      zoneReserver.textContent = '';
      zoneReserver.append(
        creer('p', 'v3d__choix', `N° ${numeroAffiche(piece)}/24${piece.format ? ` · ${piece.format}` : ''}`),
        boutonReserver(piece, contenu.catalogue, { description: resume(catalogue, piece) }),
      );
    }
  }

  // Réalité augmentée : notre bouton, ou une explication si l'appareil ne sait pas faire
  function majAR() {
    if (!zoneAR) return;
    zoneAR.textContent = '';
    if (mv.canActivateAR) {
      const bouton = creer('button', 'bouton bouton--ar', textes.boutonAR);
      bouton.type = 'button';
      bouton.addEventListener('click', () => mv.activateAR());
      zoneAR.append(bouton, creer('p', 'v3d__note', textes.conseilAR));
    } else {
      zoneAR.append(creer('p', 'v3d__sans-ar', textes.sansAR));
    }
  }

  let charge = false;
  async function chargerBibliotheque() {
    if (charge) return;
    charge = true;
    try {
      await import(BIBLIOTHEQUE);
      await customElements.whenDefined('model-viewer');
    } catch (erreur) {
      console.error('3D indisponible', erreur);
      racine.classList.add('v3d--sans-3d');
    }
  }
  mv.addEventListener('load', () => { racine.classList.add('v3d--pret'); majAR(); });
  new IntersectionObserver((entrees, obs) => {
    if (entrees.some((e) => e.isIntersecting)) { chargerBibliotheque(); obs.disconnect(); }
  }, { rootMargin: '900px 0px' }).observe(racine);

  surChoix((piece) => afficher(piece));
  const depart = (aUn3D(pieceCourante() || {}) && pieceCourante()) || avec3D.find(estDisponible) || avec3D[0];
  afficher(depart);
}
