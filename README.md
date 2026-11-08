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
- **Accroche** : `"accroche"`. Les pistes non retenues sont dans `"accrochesAlternatives"`.
- **Phrase d'ouverture de « L'idée »** : `"idee.phraseOuverture.version"` vaut `"question"` ou `"affirmation"`.
- **Vraies dimensions** : `"ficheTechnique.dimensionsCm"` (largeur, hauteur, profondeur en cm). Le modèle 3D et la réalité augmentée s'y ajustent automatiquement. Tant qu'elles sont vides, le site affiche des dimensions provisoires (environ 45 × 23 × 20 cm) marquées « à valider ».
- **Repères de la section « L'idée »** : `"idee.facade.reperes"` (positions en % sur la photo de façade).
- **Portrait** : `"histoire.portrait.src"` (par exemple `/assets/img/portrait-eaz-v1.webp`).
- **Avis vidéo** : `"video"` et `"poster"` de chaque avis (chemins vers des fichiers du dépôt).
- **Contact** : `"appel.contactEmail"`. Dès qu'il s'agit d'une vraie adresse, il devient un lien mailto.
- **Réseaux** : `"piedDePage.reseaux"`. Un réseau dont l'URL est vide n'est pas affiché.

Les balises du `<head>` de `index.html` (titre, description, Open Graph) sont à modifier à la main si l'accroche change.

## Changer le statut d'une pièce

Dans **`pieces.json`**, chercher la pièce par son `"numero"` et passer `"statut"` à `"vendue"` (ou `"disponible"`). Le compteur « x/24 disponibles », le catalogue, le grisé et les boutons se mettent à jour seuls.

La collection a été déduite des photos du 6 novembre : 8 couleurs × 3 versions (`"chrome"` caisson blanc, `"alga"` étiquette Super Colour caisson noir, `"low-noise"` caisson assorti). **La numérotation est provisoire**, et la 8e couleur n'apparaît sur aucune photo : corriger `numero`, `couleur`, `format` (`"60"` ou `"90"`) avant le lancement.

## Ajouter un lien Stripe

Créer un Payment Link dans Stripe pour la pièce, puis le coller dans `"lienPaiement"` :

```json
"lienPaiement": "https://buy.stripe.com/xxxxxxxx"
```

Tant que le champ est vide, la pièce affiche « Bientôt disponible ». Le lien doit commencer par `https://`.

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
| `contenu.json`, `pieces.json` | Textes et données des pièces |
| `css/vintape.css` | Styles (mobile first) |
| `js/app.js` | Point d'entrée |
| `js/hero.js`, `js/idee.js`, `js/catalogue.js`, `js/voir-en-3d.js` | Une section chacun |
| `outils/` | Génération des textures et modèles 3D à partir des photos (hors site) |
| `js/contenu.js`, `js/sections.js` | Remplissage des textes |
| `assets/` | Polices, images. Cache d'un an : changer le nom d'un fichier (`-v2`) pour le remplacer |

Les fichiers CSS, JS et JSON ne sont pas en cache long : une modification est visible au rechargement.
