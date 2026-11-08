"""Recadre, pour chaque pièce, sa vraie photo de face et de dos (photos originales
du 6 novembre, dans /originals/) et les enregistre en WebP pour la galerie de la fiche.

Usage : python3 outils/extraire_photos.py
Sortie : assets/pieces/photos/<pièce>-face-v1.webp et <pièce>-dos-v1.webp
Les cadrages partent des coins notés dans outils/pieces-photos.json.
"""
import json, os, sys
from PIL import Image, ImageOps
sys.path.insert(0, os.path.dirname(__file__))
from optimiser_photos import RACINE

ORIG = os.path.join(RACINE, 'originals')
SORTIE = os.path.join(RACINE, 'assets', 'pieces', 'photos')
MARGES = {'face': (0.12, 0.32, 0.12, 0.16), 'dos': (0.12, 0.55, 0.12, 0.16)}  # gauche, haut, droite, bas

def recadrer(photo, coins, marges, sortie):
    im = ImageOps.exif_transpose(Image.open(os.path.join(ORIG, photo + '.jpg'))).convert('RGB')
    xs, ys = [c[0] for c in coins], [c[1] for c in coins]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0, y1 - y0
    g, hh, d, b = marges
    boite = (max(0, int(x0 - g * w)), max(0, int(y0 - hh * h)), min(im.width, int(x1 + d * w)), min(im.height, int(y1 + b * h)))
    im = im.crop(boite)
    im.thumbnail((1600, 1600))
    im.save(sortie, 'WEBP', quality=80, method=6)
    return im.size, os.path.getsize(sortie) // 1024

if __name__ == '__main__':
    donnees = json.load(open(os.path.join(os.path.dirname(__file__), 'pieces-photos.json')))
    os.makedirs(SORTIE, exist_ok=True)
    for genre in ('face', 'dos'):
        for cle, info in donnees['faces' if genre == 'face' else 'dos'].items():
            chemin = os.path.join(SORTIE, f'{cle}-{genre}-v1.webp')
            taille, ko = recadrer(info['photo'], info['coins'], MARGES[genre], chemin)
            print(f'/assets/pieces/photos/{cle}-{genre}-v1.webp  {taille[0]}×{taille[1]}  {ko} Ko')
