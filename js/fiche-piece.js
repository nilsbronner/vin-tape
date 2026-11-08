// Fiche d'une pièce : fenêtre (<dialog>) ouverte depuis le catalogue ou par
// un lien direct #piece-07. Galerie : vraies photos d'abord, puis le rendu 3D.
import {
  estDisponible, numeroAffiche, nomCouleur, nomEtiquette, nomCaisson, couleurHex, resume, aUn3D,
} from './donnees.js';
import { creer, ecrire, typo } from './contenu.js';
import { choisir } from './selection.js';
import { boutonReserver } from './catalogue.js';

const ancre = (piece) => `piece-${numeroAffiche(piece)}`;

export function ligneDimensions(contenu) {
  const { dimensionsCm: d = {}, poidsKg } = contenu.ficheTechnique || {};
  const dims = d.largeur && d.hauteur && d.profondeur
    ? `${d.largeur} × ${d.hauteur} × ${d.profondeur} cm (l × h × p)` : '';
  const poids = typeof poidsKg === 'number' ? `${String(poidsKg).replace('.', ',')} kg` : '';
  return { dims, poids };
}

export function initFichePiece({ contenu, pieces, catalogue }) {
  const textes = contenu.fichePiece;
  const dialog = document.createElement('dialog');
  dialog.className = 'fiche-piece';
  dialog.setAttribute('aria-labelledby', 'fiche-piece-titre');
  document.body.append(dialog);
  let courante = null;

  function images(piece) {
    const liste = (piece.photos || []).map((p) => ({ src: p.src || p, alt: p.alt || '', type: 'photo' }));
    if (piece.images?.packshot) liste.push({ src: piece.images.packshot, alt: textes.rendu, type: 'rendu' });
    return liste;
  }

  function construire(piece) {
    dialog.textContent = '';
    dialog.style.setProperty('--facade', couleurHex(catalogue, piece));
    const desc = `Enceinte Vin’tape n° ${numeroAffiche(piece)}, ${resume(catalogue, piece)}`;

    const fermer = creer('button', 'fiche-piece__fermer', '×');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', textes.fermer);
    fermer.addEventListener('click', () => dialog.close());

    // Galerie
    const galerie = creer('div', 'fiche-piece__galerie');
    const principale = document.createElement('img');
    principale.className = 'fiche-piece__image';
    principale.decoding = 'async';
    const vignettes = creer('div', 'fiche-piece__vignettes');
    const liste = images(piece);
    const montrer = (i) => {
      const im = liste[i];
      principale.src = im.src;
      principale.alt = typo(`${desc} — ${im.alt}`);
      principale.classList.toggle('est-rendu', im.type === 'rendu');
      vignettes.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    };
    liste.forEach((im, i) => {
      const b = creer('button', 'fiche-piece__vignette');
      b.type = 'button';
      b.setAttribute('aria-label', typo(`${textes.voirImage} ${i + 1} : ${im.alt}`));
      const v = document.createElement('img');
      v.src = im.src; v.alt = ''; v.loading = 'lazy'; v.decoding = 'async';
      b.append(v);
      b.addEventListener('click', () => montrer(i));
      vignettes.append(b);
    });
    galerie.append(principale);
    if (liste.length > 1) galerie.append(vignettes);
    if (liste.length) montrer(0);

    // Informations
    const infos = creer('div', 'fiche-piece__infos');
    const titre = creer('h2', 'fiche-piece__titre');
    titre.id = 'fiche-piece-titre';
    titre.append('N° ', numeroAffiche(piece), creer('span', null, '/24'));
    const dispo = estDisponible(piece);
    const statut = creer('p', `carte__statut carte__statut--${dispo ? 'dispo' : 'vendue'}`, dispo ? contenu.catalogue.disponible : contenu.catalogue.vendue);
    const dl = creer('dl', 'fiche-piece__details');
    const { dims, poids } = ligneDimensions(contenu);
    const lignes = [
      [textes.couleur, nomCouleur(catalogue, piece)],
      [textes.etiquette, nomEtiquette(catalogue, piece)],
      [textes.caisson, nomCaisson(catalogue, piece).replace(/^caisson /, '').replace(/^./, (c) => c.toUpperCase())],
      [textes.format, piece.format ? `C${piece.format}` : '[À REMPLIR]'],
      [textes.dimensions, dims || '[À VALIDER]'],
      [textes.poids, poids || '[À VALIDER]'],
      [textes.prix, `${contenu.appel.prix}, ${contenu.appel.tva}`],
    ];
    for (const [k, v] of lignes) {
      if (!v) continue;
      const bloc = creer('div');
      bloc.append(creer('dt', null, k), creer('dd', null, v));
      dl.append(bloc);
    }
    const actions = creer('div', 'fiche-piece__actions');
    actions.append(boutonReserver(piece, contenu.catalogue, { description: resume(catalogue, piece) }));
    if (aUn3D(piece)) {
      const voir = creer('button', 'bouton bouton--contour', contenu.catalogue.voir3d);
      voir.type = 'button';
      voir.addEventListener('click', () => {
        choisir(piece, 'fiche');
        dialog.close();
        document.getElementById('chez-moi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      actions.append(voir);
    }
    infos.append(titre, statut, dl, actions);
    dialog.append(fermer, galerie, infos);
  }

  function ouvrir(piece, { majAncre = true } = {}) {
    courante = piece;
    construire(piece);
    if (!dialog.open) dialog.showModal();
    if (majAncre) history.replaceState(null, '', `#${ancre(piece)}`);
  }

  dialog.addEventListener('close', () => {
    if (location.hash.startsWith('#piece-')) history.replaceState(null, '', location.pathname + location.search);
    const carte = courante && document.querySelector(`.carte[data-numero="${courante.numero}"] .carte__ouvrir`);
    carte?.focus({ preventScroll: true });
  });
  // Clic sur le fond : fermer
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  const depuisAncre = () => {
    const m = /^#piece-(\d{1,2})$/.exec(location.hash);
    const piece = m && pieces.find((p) => p.numero === Number(m[1]));
    if (piece) {
      document.getElementById('catalogue')?.scrollIntoView({ block: 'start' });
      ouvrir(piece, { majAncre: false });
    }
  };
  window.addEventListener('hashchange', depuisAncre);
  depuisAncre();

  return { ouvrir };
}
