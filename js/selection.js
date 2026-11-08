// Pièce sélectionnée, partagée entre le catalogue, « voir chez moi »
// et l'appel à l'action final.
const EVENEMENT = 'vintape:piece';
let courante = null;

export function choisir(piece, origine = '') {
  if (!piece || piece === courante) return;
  courante = piece;
  document.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { piece, origine } }));
}

export const pieceCourante = () => courante;

export function surChoix(rappel) {
  document.addEventListener(EVENEMENT, (e) => rappel(e.detail.piece, e.detail.origine));
}
