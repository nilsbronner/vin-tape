// Chargement des deux fichiers de données. no-cache : une modification
// poussée sur main est visible au rechargement suivant.
async function charger(url) {
  const reponse = await fetch(url, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(`Impossible de charger ${url} (${reponse.status})`);
  return reponse.json();
}

export async function chargerDonnees() {
  const [contenu, catalogue] = await Promise.all([
    charger('/contenu.json'),
    charger('/pieces.json'),
  ]);
  const palette = catalogue.palette || {};
  const pieces = (catalogue.pieces || [])
    .slice()
    .sort((a, b) => a.numero - b.numero);
  return { contenu, palette, pieces };
}

export const estDisponible = (piece) => piece.statut === 'disponible';

export const numeroAffiche = (piece) => String(piece.numero).padStart(2, '0');

// Couleur hexadécimale d'une clé de palette (« menthe ») ou valeur brute (« #8fd3bc »).
export function couleur(palette, cle) {
  if (!cle) return '#888888';
  return palette[cle] || cle;
}

export function couleursPiece(palette, piece) {
  return {
    facade: couleur(palette, piece.couleurFacade),
    arriere: couleur(palette, piece.couleurArriere),
    etiquette: couleur(palette, piece.etiquette),
  };
}
