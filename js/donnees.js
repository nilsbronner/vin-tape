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
  const pieces = (catalogue.pieces || []).slice().sort((a, b) => a.numero - b.numero);
  return { contenu, catalogue, pieces };
}

export const estDisponible = (piece) => piece.statut === 'disponible';

export const numeroAffiche = (piece) => String(piece.numero).padStart(2, '0');

const majuscule = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

export function nomCouleur(catalogue, piece) {
  return catalogue.nomsCouleurs?.[piece.couleur] || majuscule(piece.couleur);
}

export function couleurHex(catalogue, piece) {
  return catalogue.palette?.[piece.couleur] || '#c9c2b4';
}

export function nomVersion(catalogue, piece) {
  return catalogue.versions?.[piece.version]?.nom || majuscule(piece.version);
}

// « Chrome B », « Super Colour, face 2 », « Low-Noise 1 »
export function nomEtiquette(catalogue, piece) {
  const nom = nomVersion(catalogue, piece);
  if (!piece.marque) return nom;
  return piece.version === 'alga' ? `${nom}, face ${piece.marque}` : `${nom} ${piece.marque}`;
}

export function nomCaisson(catalogue, piece) {
  return catalogue.caissons?.[piece.caisson] || '';
}

// « Menthe · Chrome · caisson blanc · 60 »
export function resume(catalogue, piece) {
  return [nomCouleur(catalogue, piece), nomVersion(catalogue, piece), nomCaisson(catalogue, piece), piece.format]
    .filter(Boolean).join(' · ');
}

export const aUnVisuel = (piece) => Boolean(piece.images?.packshot);
export const aUn3D = (piece) => Boolean(piece.modele3d);
