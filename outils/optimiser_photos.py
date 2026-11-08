"""Optimise des photos originales (lourdes, dans /originals/, non versionné)
en WebP légers pour le site, dans /assets/img/ (ou un autre dossier).

Usage :
    python3 outils/optimiser_photos.py originals/carton-1.jpg [originals/carton-2.jpg ...]
    python3 outils/optimiser_photos.py --dossier assets/pieces/photos --largeur 1600 originals/IMG_1234.jpg

Chaque fichier devient <nom>-v1.webp (le suffixe -v1 sert au cache long :
pour remplacer une image, la régénérer avec --version v2 et mettre à jour le chemin).
Ne modifie jamais l'original. Prérequis : pip install pillow
"""
import argparse, os, sys
from PIL import Image, ImageOps

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIMITE_KO = 300

def optimiser(chemin, dossier, largeur, version, qualite):
    nom = os.path.splitext(os.path.basename(chemin))[0].lower().replace(' ', '-')
    im = ImageOps.exif_transpose(Image.open(chemin)).convert('RGB')
    im.thumbnail((largeur, largeur))
    os.makedirs(dossier, exist_ok=True)
    sortie = os.path.join(dossier, f'{nom}-{version}.webp')
    q = qualite
    while True:
        im.save(sortie, 'WEBP', quality=q, method=6)
        taille = os.path.getsize(sortie) // 1024
        if taille <= LIMITE_KO or q <= 50:
            break
        q -= 6
    chemin_site = '/' + os.path.relpath(sortie, RACINE).replace(os.sep, '/')
    print(f'{chemin_site}  {im.width}×{im.height}  {taille} Ko  (qualité {q})')
    return chemin_site

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('photos', nargs='+')
    ap.add_argument('--dossier', default=os.path.join(RACINE, 'assets', 'img'))
    ap.add_argument('--largeur', type=int, default=1600, help='plus grand côté, en pixels')
    ap.add_argument('--version', default='v1')
    ap.add_argument('--qualite', type=int, default=82)
    a = ap.parse_args()
    dossier = a.dossier if os.path.isabs(a.dossier) else os.path.join(RACINE, a.dossier)
    for p in a.photos:
        if not os.path.isfile(p):
            sys.exit(f'Introuvable : {p}')
        optimiser(p, dossier, a.largeur, a.version, a.qualite)
