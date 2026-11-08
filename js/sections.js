// Sections simples remplies depuis contenu.json : artiste,
// fiche technique, avis, contact, pied de page.
import { creer, contientMarqueur, ecrire } from './contenu.js';

export function remplirPortrait(contenu) {
  const figure = document.querySelector('[data-portrait]');
  if (!figure) return;
  const { src, alt } = contenu.histoire.portrait || {};
  figure.textContent = '';
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 800;
    img.height = 1000;
    figure.append(img);
  } else {
    const vide = creer('div', 'portrait-vide');
    vide.setAttribute('role', 'img');
    vide.setAttribute('aria-label', alt || 'Portrait à venir');
    vide.append(creer('span', 'portrait-vide__eaz', 'EAZ'), creer('span', 'portrait-vide__note', '[À REMPLIR] Portrait'));
    figure.append(vide);
  }
}

export function remplirFiche(contenu) {
  const dl = document.querySelector('[data-fiche]');
  if (!dl) return;
  dl.textContent = '';
  for (const { libelle, valeur } of contenu.ficheTechnique.chiffres || []) {
    const bloc = creer('div', 'fiche__ligne');
    bloc.append(creer('dt', null, libelle), creer('dd', null, valeur));
    dl.append(bloc);
  }
}

export function remplirAvis(contenu) {
  const ul = document.querySelector('[data-avis]');
  if (!ul) return;
  ul.textContent = '';
  contenu.avis.liste.forEach((avis, i) => {
    const li = creer('li', 'avis__carte revele');
    li.style.setProperty('--i', i);
    if (avis.video) {
      const video = document.createElement('video');
      video.src = avis.video;
      video.controls = true;
      video.preload = 'none';
      video.playsInline = true;
      if (avis.poster) video.poster = avis.poster;
      video.setAttribute('aria-label', `Avis vidéo de ${avis.auteur}`);
      li.append(video);
    }
    const bq = creer('blockquote');
    bq.append(creer('p', null, avis.texte));
    li.append(bq, creer('p', 'avis__auteur', avis.auteur));
    ul.append(li);
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function remplirContact(contenu) {
  const cible = document.querySelector('[data-contact]');
  if (!cible) return;
  const email = contenu.appel.contactEmail;
  cible.textContent = '';
  if (EMAIL.test(email)) {
    const a = creer('a', 'lien', email);
    a.href = `mailto:${email}`;
    cible.append(a);
  } else {
    ecrire(cible, email);
  }
}

export function remplirPied(contenu) {
  const liens = document.querySelector('[data-pied-liens]');
  const reseaux = document.querySelector('[data-pied-reseaux]');
  if (liens) {
    liens.textContent = '';
    for (const { texte, url } of contenu.piedDePage.liens || []) {
      const li = creer('li');
      const a = creer('a', 'lien', texte);
      a.href = url;
      li.append(a);
      liens.append(li);
    }
  }
  if (reseaux) {
    reseaux.textContent = '';
    for (const { nom, url } of contenu.piedDePage.reseaux || []) {
      if (!url || contientMarqueur(url)) continue;
      const li = creer('li');
      const a = creer('a', 'lien', nom);
      a.href = url;
      a.rel = 'noopener';
      li.append(a);
      reseaux.append(li);
    }
  }
}

export function remplirLivraison(contenu) {
  const l = contenu.livraison;
  const dl = document.querySelector('[data-livraison-liste]');
  const photos = document.querySelector('[data-livraison-photos]');
  if (!l || !dl) return;
  dl.textContent = '';
  for (const { libelle, valeur } of l.lignes || []) {
    const bloc = creer('div', 'fiche__ligne');
    bloc.append(creer('dt', null, libelle), creer('dd', null, valeur));
    dl.append(bloc);
  }
  if (!photos) return;
  photos.textContent = '';
  for (const { src, alt } of l.photos || []) {
    const figure = creer('figure', 'livraison__photo');
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 1200;
      img.height = 900;
      figure.append(img);
    } else {
      figure.classList.add('livraison__photo--vide');
      figure.append(creer('span', 'a-remplir', '[À REMPLIR]'), creer('span', null, l.photoAVenir));
    }
    photos.append(figure);
  }
}
