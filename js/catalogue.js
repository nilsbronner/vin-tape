// Catalogue des 24 pièces : galerie horizontale, statut, réservation.
import {
  estDisponible, numeroAffiche, nomCouleur, nomEtiquette, nomCaisson, couleurHex, resume, aUnVisuel, aUn3D,
} from './donnees.js';
import { creer, typo } from './contenu.js';
import { choisir, surChoix } from './selection.js';

const LIEN_VALIDE = /^https:\/\/\S+$/;

// Bouton « Réserver cette pièce », « Bientôt disponible » ou « Vendue ».
export function boutonReserver(piece, textes, { libelle, description = '' } = {}) {
  if (!estDisponible(piece)) {
    const span = creer('span', 'bouton', textes.vendue);
    span.setAttribute('aria-disabled', 'true');
    return span;
  }
  if (LIEN_VALIDE.test(piece.lienPaiement || '')) {
    const a = creer('a', 'bouton', libelle || textes.reserver);
    a.href = piece.lienPaiement;
    a.rel = 'noopener';
    a.setAttribute('aria-label', typo(`${libelle || textes.reserver} : n° ${numeroAffiche(piece)}${description ? `, ${description}` : ''}`));
    return a;
  }
  const span = creer('span', 'bouton', textes.bientot);
  span.setAttribute('aria-disabled', 'true');
  return span;
}

function carte(piece, index, { catalogue, textes }) {
  const dispo = estDisponible(piece);
  const li = creer('li', `carte revele${dispo ? '' : ' carte--vendue'}`);
  li.style.setProperty('--i', index % 4);
  li.style.setProperty('--facade', couleurHex(catalogue, piece));
  li.dataset.numero = piece.numero;

  const article = creer('article', 'carte__article');
  const idTitre = `carte-${piece.numero}`;
  article.setAttribute('aria-labelledby', idTitre);

  const visuel = creer('div', 'carte__visuel');
  if (aUnVisuel(piece)) {
    const img = document.createElement('img');
    img.src = piece.images.packshot;
    img.alt = `Enceinte Vin’tape n° ${numeroAffiche(piece)} : ${resume(catalogue, piece)}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 951;
    img.height = 650;
    visuel.append(img);
  } else {
    visuel.classList.add('carte__visuel--vide');
    visuel.append(creer('span', 'carte__a-venir', textes.photoAVenir));
  }
  if (!dispo) visuel.append(creer('span', 'carte__tampon', textes.vendue));

  const corps = creer('div', 'carte__corps');
  const titre = creer('h3', 'carte__titre');
  titre.id = idTitre;
  titre.append('N° ', numeroAffiche(piece), creer('span', null, '/24'));
  const entete = creer('div', 'carte__entete');
  entete.append(titre);
  if (piece.format) entete.append(creer('p', 'carte__format', piece.format));

  const statut = creer('p', `carte__statut carte__statut--${dispo ? 'dispo' : 'vendue'}`, dispo ? textes.disponible : textes.vendue);

  const details = creer('ul', 'carte__details');
  const ligneCouleur = creer('li', 'pastille');
  const rond = creer('span', 'pastille__rond');
  rond.setAttribute('aria-hidden', 'true');
  ligneCouleur.append(rond, creer('span', null, nomCouleur(catalogue, piece)));
  details.append(ligneCouleur, creer('li', null, `Étiquette ${nomEtiquette(catalogue, piece)}`));
  if (nomCaisson(catalogue, piece)) details.append(creer('li', null, nomCaisson(catalogue, piece)));

  const actions = creer('div', 'carte__actions');
  actions.append(boutonReserver(piece, textes, { description: resume(catalogue, piece) }));
  if (dispo && aUn3D(piece)) {
    const voir = creer('button', 'bouton bouton--contour bouton--petit', textes.voir3d);
    voir.type = 'button';
    voir.setAttribute('aria-label', typo(`${textes.voir3d} : pièce n° ${numeroAffiche(piece)}`));
    voir.addEventListener('click', () => {
      choisir(piece, 'catalogue');
      document.getElementById('chez-moi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    actions.append(voir);
  }

  corps.append(entete, statut, details, actions);
  article.append(visuel, corps);
  li.append(article);
  return li;
}

export function initCatalogue({ contenu, pieces, catalogue }) {
  const piste = document.querySelector('[data-catalogue]');
  if (!piste) return;
  const textes = contenu.catalogue;

  const fragment = document.createDocumentFragment();
  pieces.forEach((piece, i) => fragment.append(carte(piece, i, { catalogue, textes })));
  piste.textContent = '';
  piste.append(fragment);

  const prec = document.querySelector('[data-cat-prec]');
  const suiv = document.querySelector('[data-cat-suiv]');
  const progression = document.querySelector('[data-cat-progression]');
  const pas = () => (piste.querySelector('.carte')?.getBoundingClientRect().width || 300) + 16;
  prec?.addEventListener('click', () => piste.scrollBy({ left: -pas() * 2, behavior: 'smooth' }));
  suiv?.addEventListener('click', () => piste.scrollBy({ left: pas() * 2, behavior: 'smooth' }));

  let enAttente = false;
  const maj = () => {
    enAttente = false;
    const max = piste.scrollWidth - piste.clientWidth;
    const ratio = max > 0 ? piste.scrollLeft / max : 0;
    if (progression) progression.style.transform = `scaleX(${Math.max(0.04, ratio)})`;
    if (prec) prec.disabled = piste.scrollLeft <= 2;
    if (suiv) suiv.disabled = piste.scrollLeft >= max - 2;
  };
  piste.addEventListener('scroll', () => { if (!enAttente) { enAttente = true; requestAnimationFrame(maj); } }, { passive: true });
  window.addEventListener('resize', maj);
  maj();

  surChoix((piece) => {
    piste.querySelectorAll('.carte').forEach((c) => c.classList.toggle('est-choisie', Number(c.dataset.numero) === piece.numero));
  });

  // Appel à l'action final : réserver la pièce sélectionnée
  const actionsAppel = document.querySelector('[data-appel-actions]');
  if (actionsAppel) {
    const emplacement = creer('div', 'appel__selection');
    actionsAppel.append(emplacement);
    surChoix((piece) => {
      emplacement.textContent = '';
      if (estDisponible(piece)) {
        emplacement.append(boutonReserver(piece, textes, { libelle: `Réserver le n° ${numeroAffiche(piece)}`, description: resume(catalogue, piece) }));
      }
    });
  }

  const premiere = pieces.find((p) => estDisponible(p) && aUn3D(p)) || pieces.find(estDisponible) || pieces[0];
  if (premiere) choisir(premiere, 'defaut');
}
