# Images des pièces

Tant que ce dossier est vide, le site dessine chaque pièce en SVG avec ses couleurs (placeholder).

Pour chaque pièce, deux images optimisées (originaux lourds dans `/originals/`, jamais commités) :

| Usage | Nom conseillé | Format | Taille visée |
| --- | --- | --- | --- |
| Catalogue (photo de face, fond neutre) | `piece-07-v1.webp` | WebP, 1600 × 1024 px environ | moins de 300 Ko |
| « Voir chez moi » (détourée, fond transparent) | `piece-07-detouree-v1.webp` | WebP ou PNG transparent, 1200 px de large, cadrée au ras de l'objet | moins de 300 Ko |

Puis renseigner les chemins dans `pieces.json` :

```json
"images": { "catalogue": "/assets/pieces/piece-07-v1.webp", "detouree": "/assets/pieces/piece-07-detouree-v1.webp" }
```

Important : `/assets/` est servi avec un cache d'un an. Pour remplacer une image, changer son nom (`-v2`) au lieu d'écraser le fichier.
