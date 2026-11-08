# Vin'tape

Site one-page de **Vin'tape**, première édition de 24 enceintes-cassettes uniques, œuvre de l'artiste plasticien EAZ.

Site 100 % statique : HTML, CSS et JavaScript vanilla, sans build ni dépendance. Vercel le déploie tel quel.

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Un serveur est nécessaire car le site charge `contenu.json` et `pieces.json` ; ouvrir `index.html` en double-cliquant ne marche pas.

## Modifier les textes

Tous les textes sont dans **`contenu.json`** : accroche, histoire, savoir-faire, fiche technique, avis, contact, pied de page, pages légales.

- `[À REMPLIR]` : texte manquant. `[À VALIDER]` : info à confirmer. Les deux s'affichent en surbrillance jaune sur le site tant qu'ils sont là.
- **Accroche** : un seul champ, `"accroche"`. Pour en changer, y copier l'une des phrases de `"accrochesPossibles"` (et mettre à jour `og:description` dans `index.html`).
- **Origine** : `"savoirFaire.origine"` et la ligne « Origine » de la fiche technique. Ne jamais écrire « Fabriqué en France » ni « Made in France » dans les textes du site (la mention imprimée sur les étiquettes des pièces reste telle quelle).
- **Phrase d'ouverture de « L'idée »** : `"idee.phraseOuverture.version"` vaut `"question"` ou `"affirmation"`.
- **Vraies dimensions et poids** : voir « Fiche d'une pièce et vraies photos » plus bas.
- **Repères de la section « L'idée »** : `"idee.facade.reperes"` (positions en % sur la photo de façade).
- **Portrait** : `"histoire.portrait.src"` (par exemple `/assets/img/portrait-eaz-v1.webp`).
- **Avis vidéo** : `"video"` et `"poster"` de chaque avis (chemins vers des fichiers du dépôt).
- **Contact** : `"appel.contactEmail"`. Dès qu'il s'agit d'une vraie adresse, il devient un lien mailto.
- **Réseaux** : `"piedDePage.reseaux"`. Un réseau dont l'URL est vide n'est pas affiché.

Les balises du `<head>` de `index.html` (titre, description, Open Graph) sont à modifier à la main si l'accroche change.

## Changer le statut d'une pièce

Voir « Après une vente : passer la pièce en « vendue » » plus bas.

Les 24 pièces ont été identifiées sur les photos du 6 novembre : 8 couleurs (menthe, sauge, orange, vert, bleu, rouge, violet, jaune) × 3 versions (`"chrome"` caisson blanc, `"alga"` étiquette Super Colour caisson noir, `"low-noise"` caisson assorti). Format, étiquette (`marque`) et caisson viennent des photos. **La numérotation reste provisoire** : corriger `numero` avant le lancement.

## Vérifier les données avant de publier

```bash
python3 outils/valider.py
```

Le script contrôle `pieces.json` sans rien modifier : 24 pièces, numéros uniques de 1 à 24, couleurs et versions connues, statut `disponible` ou `vendue`, `lienPaiement` vide ou en `https://`, fichiers d'images et de modèles présents. Il signale aussi les formats manquants, les pièces sans lien Stripe et les dimensions non renseignées. À lancer après chaque modification de `pieces.json`, en particulier quand la vraie numérotation arrive.

## Fiche d'une pièce et vraies photos

Un clic sur une pièce du catalogue ouvre sa fiche : galerie (vraies photos d'abord, puis le rendu 3D), étiquette, caisson, format, dimensions, poids, prix, réservation et accès à la 3D. Chaque fiche a un lien direct partageable : `https://…/#piece-07`.

Les vraies photos sont dans le champ `"photos"` de chaque pièce (`pieces.json`) :

```json
"photos": [
  { "src": "/assets/pieces/photos/rouge-alga-face-v1.webp", "alt": "Photo de face" }
]
```

Pour en ajouter : original dans `/originals/`, puis `python3 outils/optimiser_photos.py --dossier assets/pieces/photos originals/IMG_1234.jpg`, puis ajouter la ligne dans `"photos"`. Les photos de face et de dos actuelles sont recadrées depuis les photos du 6 novembre par `outils/extraire_photos.py`.

**Dimensions et poids** : `contenu.json` → `"ficheTechnique.dimensionsCm"` (largeur, hauteur, profondeur en cm) et `"ficheTechnique.poidsKg"`. Ils remplissent la fiche technique et les fiches des pièces, et règlent l'échelle de la 3D et de la réalité augmentée.

## Livraison et paiement

Textes dans `contenu.json` → `"livraison"` : une ligne par sujet (prix, paiement, expédition, emballage, transporteur, frais). Les frais de livraison sont `[À DÉFINIR]` : remplacer la valeur de la ligne « Frais de livraison » quand les tarifs DHL / UPS sont fixés.

**Photos du carton** : déposer les originaux dans `/originals/` (jamais commités), puis :

```bash
python3 outils/optimiser_photos.py originals/carton-1.jpg originals/carton-2.jpg
```

Le script crée `assets/img/carton-1-v1.webp` et `carton-2-v1.webp` (WebP, 1600 px, moins de 300 Ko). Renseigner ensuite leurs chemins dans `"livraison.photos[].src"`. Le même outil sert pour toutes les photos réelles (option `--dossier`).

## Ajouter une boutique (section « Où le voir »)

La section « Où le voir » s'affiche après le catalogue dès que **`boutiques.json`** contient au moins une boutique. Tant que la liste est vide, elle reste invisible.

Ajouter un objet dans la liste `"boutiques"` :

```json
{
  "boutiques": [
    {
      "nom": "Nom de la boutique",
      "ville": "Strasbourg",
      "adresse": "12 rue Exemple\n67000 Strasbourg",
      "lien": "https://site-de-la-boutique.fr",
      "logo": "/assets/boutiques/nom-de-la-boutique-v1.webp",
      "statut": "en vente",
      "datesDebut": "2026-12-02"
    }
  ]
}
```

| Champ | Obligatoire | Règle |
| --- | --- | --- |
| `nom` | oui | Nom affiché |
| `statut` | oui | `"expose"` (badge « Exposé ici ») ou `"en vente"` (badge « En vente ici ») ; toute autre valeur masque la boutique |
| `ville`, `adresse` | non | `\n` dans l'adresse = retour à la ligne |
| `lien` | non | Doit commencer par `https://` ; s'ouvre dans un nouvel onglet |
| `logo` | non | Fichier **du site** uniquement, dans `/assets/boutiques/` (WebP ou PNG carré, environ 128 px, moins de 50 Ko). Un logo hébergé ailleurs est ignoré. Sans logo, l'initiale s'affiche |
| `datesDebut` | non | Format `AAAA-MM-JJ`, affiché « Depuis le 2 décembre 2026 » |

Les textes de la section (titre, intro, badges) sont dans `contenu.json` → `"ouLeVoir"`. Les numéros de piste (B1, B2…) se recalculent seuls selon les sections visibles.

## Paiement : un lien Stripe par pièce

Chaque pièce a son propre **Payment Link** Stripe, collé dans `"lienPaiement"` de `pieces.json`. Il n'y a aucune clé Stripe dans le dépôt, et il ne doit jamais y en avoir : le site se contente d'envoyer vers la page de paiement hébergée par Stripe.

Créer le lien dans le tableau de bord Stripe (Liens de paiement → Nouveau) :

1. Produit : « Vin'tape n° 07 » (un produit par pièce), prix 850 € TTC.
2. Dans les options du lien, **limiter le nombre de paiements à 1** (« Limit the number of payments » / « Limiter le nombre de paiements »). Après le premier paiement, Stripe désactive le lien : une pièce unique ne peut pas être vendue deux fois.
3. Activer la collecte de l'adresse de livraison et du téléphone (nécessaires pour DHL ou UPS).
4. Copier l'URL (`https://buy.stripe.com/…`) dans la pièce :

```json
"lienPaiement": "https://buy.stripe.com/xxxxxxxx"
```

Tant que le champ est vide, la pièce affiche « Bientôt disponible ». `python3 outils/valider.py` vérifie que chaque lien commence par `https://`.

### Après une vente : passer la pièce en « vendue »

Le site ne reçoit aucune notification de Stripe : la mise à jour est **manuelle**. Dès qu'un paiement arrive, dans `pieces.json`, passer la pièce en `"statut": "vendue"`, puis :

```bash
python3 outils/valider.py
git add pieces.json
git commit -m "Passe la pièce 07 en vendue"
git push origin main
```

Le compteur « x/24 disponibles », le catalogue (pièce grisée, tampon « Vendue ») et la fiche se mettent à jour au déploiement suivant. Le lien Stripe limité à un paiement protège entre-temps contre une double vente.

## Photos, visuels et modèles 3D

Chaque pièce a, dans `pieces.json` :
- `"images.packshot"` : le visuel détouré du catalogue et du hero (WebP transparent) ;
- `"modele3d"` : le modèle 3D (`.glb`) utilisé par « Chez toi, en vrai » et la réalité augmentée.

Ils sont fabriqués à partir des vraies photos par `outils/generer_modeles.py` (façade redressée et plaquée sur un caisson aux bonnes proportions). Pour ajouter une pièce : mettre ses photos dans `/originals/` (ignoré par git), noter les 4 coins de sa façade dans `outils/pieces-photos.json`, l'ajouter à `PIECES` dans le script, puis :

```bash
python3 outils/generer_modeles.py
```

Les packshots sont des rendus du modèle 3D (voir `assets/pieces/LISEZMOI.md`). Sans visuel, la carte affiche « Photo à venir ».

La réalité augmentée marche sur iPhone (Quick Look) et Android (Scene Viewer ou WebXR). Sur ordinateur, on fait tourner la pièce en 3D. La bibliothèque `assets/vendor/model-viewer-4.4.0.min.js` (Google, licence Apache 2.0) n'est chargée qu'à l'approche de la section.

## Publier

```bash
git add -A
git commit -m "Passe la pièce 07 en vendue"
git push origin main
```

Chaque push sur `main` déploie en production. Chaque branche ou pull request a sa propre URL de preview Vercel.

## À faire avant le lancement

- Remplacer `https://vintape.vercel.app` par le vrai domaine dans `index.html` (canonical, Open Graph, JSON-LD), `robots.txt` et `sitemap.xml`.
- Retirer tous les marqueurs `[À REMPLIR]` et `[À VALIDER]` : `grep -rn "À REMPLIR\|À VALIDER" contenu.json`.
- Remplacer les données de test de `pieces.json`.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure des 9 sections |
| `contenu.json`, `pieces.json`, `boutiques.json` | Textes, pièces, boutiques |
| `css/vintape.css` | Styles (mobile first) |
| `js/app.js` | Point d'entrée |
| `js/hero.js`, `js/idee.js`, `js/catalogue.js`, `js/boutiques.js`, `js/voir-en-3d.js` | Une section chacun |
| `outils/` | Génération des textures et modèles 3D à partir des photos (hors site) |
| `js/contenu.js`, `js/sections.js` | Remplissage des textes |
| `assets/` | Polices, images. Cache d'un an : changer le nom d'un fichier (`-v2`) pour le remplacer |

Les fichiers CSS, JS et JSON ne sont pas en cache long : une modification est visible au rechargement.
