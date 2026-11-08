# Visuels des pièces

| Fichier | Rôle | Origine |
| --- | --- | --- |
| `packshot-<pièce>-v1.webp` | Visuel du catalogue et du hero, fond transparent | Rendu du modèle 3D (vue 3/4) |
| `face-<pièce>-v1.webp` | Façade redressée (section « L'idée ») | `outils/generer_modeles.py` à partir des photos |

Les modèles 3D sont dans `assets/modeles/<pièce>-v1.glb`.

`/assets/` est servi avec un cache d'un an : pour remplacer un fichier, changer son nom (`-v2`) et mettre à jour `pieces.json`, au lieu d'écraser le fichier.

Taille visée : moins de 300 Ko par image (les packshots font environ 45 Ko, les façades environ 60 Ko, les modèles environ 180 Ko).
