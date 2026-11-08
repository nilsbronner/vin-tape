// Remplit la page à partir de contenu.json.
// - data-contenu="chemin.vers.texte"            → texte simple
// - data-contenu-paragraphes="chemin.vers.liste" → un <p> par entrée
// Les marqueurs [À REMPLIR] et [À VALIDER] sont mis en surbrillance.

const MARQUEUR = /(\[À (?:REMPLIR|VALIDER)\])/;

export function lire(objet, chemin) {
  return chemin.split('.').reduce((o, cle) => (o == null ? undefined : o[cle]), objet);
}

// Typographie française : espaces fines insécables et apostrophe courbe.
export function typo(texte) {
  return String(texte)
    .replace(/'/g, '’')
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ');
}

// Écrit un texte dans un élément, en balisant les marqueurs.
export function ecrire(element, texte) {
  element.textContent = '';
  if (texte == null) return;
  const morceaux = typo(texte).split(MARQUEUR);
  for (const morceau of morceaux) {
    if (!morceau) continue;
    if (MARQUEUR.test(morceau)) {
      const mark = document.createElement('mark');
      mark.className = 'a-remplir';
      mark.textContent = morceau;
      element.append(mark);
    } else {
      element.append(morceau);
    }
  }
}

export const contientMarqueur = (texte) => MARQUEUR.test(String(texte ?? ''));

export function remplirTextes(contenu, racine = document) {
  for (const el of racine.querySelectorAll('[data-contenu]')) {
    const valeur = lire(contenu, el.dataset.contenu);
    if (typeof valeur === 'string') ecrire(el, valeur);
  }
  for (const el of racine.querySelectorAll('[data-contenu-paragraphes]')) {
    const valeur = lire(contenu, el.dataset.contenuParagraphes);
    const liste = Array.isArray(valeur) ? valeur : [valeur];
    el.textContent = '';
    for (const texte of liste.filter(Boolean)) {
      const p = document.createElement('p');
      ecrire(p, texte);
      el.append(p);
    }
  }
}

export function creer(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte != null) ecrire(el, texte);
  return el;
}
