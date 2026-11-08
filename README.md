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
- **Échelle du module « Voir chez moi »** : `"ficheTechnique.largeurReelleCm"` (nombre, par exemple `26.5`). Tant que la valeur est `null`, le repère affiche « à renseigner ».
- **Portrait** : `"histoire.portrait.src"` (par exemple `/assets/img/portrait-eaz-v1.webp`).
- **Avis vidéo** : `"video"` et `"poster"` de chaque avis (chemins vers des fichiers du dépôt).
- **Contact** : `"appel.contactEmail"`. Dès qu'il s'agit d'une vraie adresse, il devient un lien mailto.
- **Réseaux** : `"piedDePage.reseaux"`. Un réseau dont l'URL est vide n'est pas affiché.

Les balises du `<head>` de `index.html` (titre, description, Open Graph) sont à modifier à la main si l'accroche change.

## Changer le statut d'une pièce

Dans **`pieces.json`**, chercher la pièce par son `"numero"` et passer `"statut"` à `"vendue"` (ou `"disponible"`). Le compteur « x/24 disponibles », le catalogue, le grisé et les boutons se mettent à jour seuls.

Les 24 entrées actuelles sont des **données de test** : corriger les combinaisons de couleurs (`couleurFacade`, `couleurArriere`, `etiquette`), le `format` (`"C60"` ou `"C90"`) et les statuts avant le lancement. Les couleurs sont des clés de la `"palette"` en haut du fichier ; on peut en ajouter ou ajuster leur code hexadécimal.

## Ajouter un lien Stripe

Créer un Payment Link dans Stripe pour la pièce, puis le coller dans `"lienPaiement"` :

```json
"lienPaiement": "https://buy.stripe.com/xxxxxxxx"
```

Tant que le champ est vide, la pièce affiche « Bientôt disponible ». Le lien doit commencer par `https://`.

## Ajouter les photos des pièces

Voir `assets/pieces/LISEZMOI.md`. En résumé : photos optimisées en WebP (moins de 300 Ko), chemins dans `"images"` de `pieces.json`. Sans image, le site dessine la pièce en SVG avec ses couleurs. Les originaux lourds vont dans `/originals/`, ignoré par git.

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
| `js/cassette.js` | Dessin SVG de la cassette, couleurs en variables CSS (`--facade`, `--arriere`, `--etiquette`) : base du futur configurateur |
| `js/hero.js`, `js/idee.js`, `js/catalogue.js`, `js/voir-chez-moi.js` | Une section chacun |
| `js/contenu.js`, `js/sections.js` | Remplissage des textes |
| `assets/` | Polices, images. Cache d'un an : changer le nom d'un fichier (`-v2`) pour le remplacer |

Les fichiers CSS, JS et JSON ne sont pas en cache long : une modification est visible au rechargement.
