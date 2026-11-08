// Catalogue des 24 pièces : galerie horizontale, statut, réservation.
import { svgCassette, appliquerCouleurs } from './cassette.js';
import { couleursPiece, estDisponible, numeroAffiche, couleur } from './donnees.js';
import { creer, ecrire, typo } from './contenu.js';
import { choisir, surChoix } from './selection.js';

const LIEN_VALIDE = /^https:\/\/\S+$/;

export function descriptionPiece(piece) {
  return `n° ${numeroAffiche(piece)}, ${piece.format}, façade ${piece.couleurFacade}, arrière ${piece.couleurArriere}, étiquette ${piece.etiquette}`;
}

// Bouton « Réserver cette pièce » ou « Bientôt disponible ».
export function boutonReserver(piece, textes, { libelle } = {}) {
  if (!estDisponible(piece)) {
    const span = creer('span', 'bouton', textes.vendue);
    span.setAttribute('aria-disabled', 'true');
    return span;
  }
  if (LIEN_VALIDE.test(piece.lienPaiement || '')) {
    const a = creer('a', 'bouton', libelle || textes.reserver);
    a.href = piece.lienPaiement;
    a.rel = 'noopener';
    a.setAttribute('aria-label', `${typo(libelle || textes.reserver)} : ${descriptionPiece(piece)}`);
    return a;
  }
  const span = creer('span', 'bouton', textes.bientot);
  span.setAttribute('aria-disabled', 'true');
  return span;
}

function pastille(palette, cle, libelle) {
  const li = creer('li', 'pastille');
  const rond = creer('span', 'pastille__rond');
  rond.style.setProperty('--c', couleur(palette, cle));
  rond.setAttribute('aria-hidden', 'true');
  li.append(rond, creer('span', 'pastille__texte', `${libelle} : ${cle}`));
  return li;
}

function carte(piece, index, { palette, textes }) {
  const dispo = estDisponible(piece);
  const li = creer('li', `carte revele${dispo ? '' : ' carte--vendue'}`);
  li.style.setProperty('--i', index % 4);
  li.dataset.numero = piece.numero;

  const article = creer('article', 'carte__article');
  const idTitre = `carte-${piece.numero}`;
  article.setAttribute('aria-labelledby', idTitre);

  const visuel = creer('div', 'carte__visuel');
  appliquerCouleurs(visuel, couleursPiece(palette, piece));
  if (piece.images?.catalogue) {
    const img = document.createElement('img');
    img.src = piece.images.catalogue;
    img.alt = `Enceinte Vin’tape ${descriptionPiece(piece)}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 800;
    img.height = 512;
    visuel.append(img);
  } else {
    visuel.innerHTML = svgCassette({ numero: numeroAffiche(piece), format: piece.format });
  }
  if (!dispo) visuel.append(creer('span', 'carte__tampon', textes.vendue));

  const corps = creer('div', 'carte__corps');
  const titre = creer('h3', 'carte__titre');
  titre.id = idTitre;
  titre.append('N° ', numeroAffiche(piece), creer('span', null, '/24'));
  const statut = creer('p', `carte__statut carte__statut--${dispo ? 'dispo' : 'vendue'}`, dispo ? textes.disponible : textes.vendue);
  const entete = creer('div', 'carte__entete');
  entete.append(titre, creer('p', 'carte__format', piece.format));

  const couleurs = creer('ul', 'carte__couleurs');
  couleurs.append(
    pastille(palette, piece.couleurFacade, textes.libelleFacade),
    pastille(palette, piece.couleurArriere, textes.libelleArriere),
    pastille(palette, piece.etiquette, textes.libelleEtiquette),
  );

  const actions = creer('div', 'carte__actions');
  actions.append(boutonReserver(piece, textes));
  if (dispo) {
    const essayer = creer('button', 'bouton bouton--contour bouton--petit', textes.voirChezMoi);
    essayer.type = 'button';
    essayer.setAttribute('aria-label', `${typo(textes.voirChezMoi)} : pièce n° ${numeroAffiche(piece)}`);
    essayer.addEventListener('click', () => {
      choisir(piece, 'catalogue');
      document.getElementById('chez-moi')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    actions.append(essayer);
  }

  corps.append(entete, statut, couleurs, actions);
  article.append(visuel, corps);
  li.append(article);
  return li;
}

export function initCatalogue({ contenu, pieces, palette }) {
  const piste = document.querySelector('[data-catalogue]');
  if (!piste) return;
  const textes = contenu.catalogue;

  const fragment = document.createDocumentFragment();
  pieces.forEach((piece, i) => fragment.append(carte(piece, i, { palette, textes })));
  piste.textContent = '';
  piste.append(fragment);

  // Flèches et barre de progression « bande »
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
  piste.addEventListener('scroll', () => {
    if (!enAttente) { enAttente = true; requestAnimationFrame(maj); }
  }, { passive: true });
  window.addEventListener('resize', maj);
  maj();

  // Mise en avant de la pièce choisie ailleurs (module « voir chez moi »)
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
      if (!estDisponible(piece)) return;
      emplacement.append(boutonReserver(piece, textes, { libelle: `Réserver le n° ${numeroAffiche(piece)}` }));
    });
  }

  // Sélection par défaut : première pièce disponible
  const premiere = pieces.find(estDisponible) || pieces[0];
  if (premiere) choisir(premiere, 'defaut');
}
