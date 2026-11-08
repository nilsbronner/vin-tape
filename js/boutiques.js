// « Où le voir » : boutiques qui exposent ou vendent Vin'tape (boutiques.json).
// La section reste masquée si le fichier est vide, absent ou illisible.
import { creer, typo } from './contenu.js';

const LIEN = /^https:\/\/\S+$/;
const LOGO_LOCAL = /^\/(?!\/)\S+\.(webp|png|jpe?g|svg|avif)$/i; // fichiers du site uniquement
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateLisible(texte) {
  const m = DATE.exec(texte || '');
  if (!m) return '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function carte(boutique, textes, index) {
  const enVente = boutique.statut === 'en vente';
  const li = creer('li', 'boutique revele');
  li.style.setProperty('--i', index % 3);
  const article = creer('article', 'boutique__carte');
  const idTitre = `boutique-${index}`;
  article.setAttribute('aria-labelledby', idTitre);

  const tete = creer('div', 'boutique__tete');
  if (LOGO_LOCAL.test(boutique.logo || '')) {
    const img = document.createElement('img');
    img.src = boutique.logo;
    img.alt = '';
    img.width = 64;
    img.height = 64;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'boutique__logo';
    tete.append(img);
  } else {
    const initiale = creer('span', 'boutique__logo boutique__logo--initiale', (boutique.nom || '?').trim().charAt(0).toUpperCase());
    initiale.setAttribute('aria-hidden', 'true');
    tete.append(initiale);
  }
  const titres = creer('div');
  const h3 = creer('h3', 'boutique__nom', boutique.nom);
  h3.id = idTitre;
  titres.append(h3);
  if (boutique.ville) titres.append(creer('p', 'boutique__ville', boutique.ville));
  tete.append(titres);

  const badge = creer('p', `boutique__statut boutique__statut--${enVente ? 'vente' : 'expose'}`, enVente ? textes.enVente : textes.expose);
  article.append(tete, badge);

  if (boutique.adresse) {
    const adresse = document.createElement('address');
    adresse.className = 'boutique__adresse';
    adresse.textContent = typo(boutique.adresse);
    article.append(adresse);
  }
  const depuis = dateLisible(boutique.datesDebut);
  if (depuis) article.append(creer('p', 'boutique__date', `${textes.depuis} ${depuis}`));

  if (LIEN.test(boutique.lien || '')) {
    const a = creer('a', 'lien boutique__lien', textes.lienSite);
    a.href = boutique.lien;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', typo(`${textes.lienSite} ${boutique.nom} (nouvel onglet)`));
    article.append(a);
  }
  li.append(article);
  return li;
}

export async function initBoutiques({ contenu }) {
  const section = document.querySelector('[data-boutiques]');
  const liste = section?.querySelector('[data-boutiques-liste]');
  if (!section || !liste) return;
  let boutiques = [];
  try {
    const reponse = await fetch('/boutiques.json', { cache: 'no-cache' });
    if (reponse.ok) boutiques = (await reponse.json()).boutiques || [];
  } catch (erreur) {
    console.error('boutiques.json illisible', erreur);
  }
  boutiques = boutiques.filter((b) => b && b.nom && (b.statut === 'expose' || b.statut === 'en vente'));
  if (!boutiques.length) { section.hidden = true; return; }
  liste.textContent = '';
  boutiques.forEach((b, i) => liste.append(carte(b, contenu.ouLeVoir, i)));
  section.hidden = false;
}
