"""Génère une épingle Pinterest verticale (1000 × 1500) pour chaque pièce
qui a un packshot : fond #F3EEE4, pièce centrée, « Vin'tape · N° xx » en bas.

Usage : python3 outils/generer_epingles.py
Sortie : assets/epingles/vintape-<numéro>-<pièce>-v1.webp
À relancer après un changement de numérotation (pieces.json) ou de packshot.
Prérequis : pip install pillow
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'assets', 'epingles')
VERSION = 'v1'
L, H = 1000, 1500
FOND = (243, 238, 228)
TEXTE = (34, 31, 27)
DISCRET = (106, 99, 88)

def police(fichier, taille, poids=None):
    f = ImageFont.truetype(os.path.join(RACINE, 'assets', 'fonts', fichier), taille)
    if poids:
        try:
            f.set_variation_by_axes([poids])
        except Exception:
            pass
    return f

def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def epingle(piece, palette, noms_versions):
    packshot = os.path.join(RACINE, piece['images']['packshot'].lstrip('/'))
    toile = Image.new('RGB', (L, H), FOND)
    # halo doux de la couleur de la pièce
    halo = Image.new('RGB', (L, H), hex_rgb(palette.get(piece['couleur'], '#c9c2b4')))
    masque = Image.new('L', (L, H), 0)
    ImageDraw.Draw(masque).ellipse((L * -0.1, H * 0.18, L * 1.1, H * 0.78), fill=70)
    from PIL import ImageFilter
    masque = masque.filter(ImageFilter.GaussianBlur(120))
    toile.paste(halo, (0, 0), masque)
    # pièce centrée
    im = Image.open(packshot).convert('RGBA')
    largeur = int(L * 0.86)
    im = im.resize((largeur, int(im.height * largeur / im.width)), Image.LANCZOS)
    toile.paste(im, ((L - im.width) // 2, int(H * 0.47 - im.height / 2)), im)
    d = ImageDraw.Draw(toile)
    # textes
    titre = f"Vin’tape · N° {piece['numero']:02d}"
    f_titre = police('big-shoulders-display-v1.woff2', 118, 800)
    f_sous = police('dm-mono-500-v1.woff2', 30)
    w = d.textlength(titre.upper(), font=f_titre)
    d.text(((L - w) / 2, H - 300), titre.upper(), font=f_titre, fill=TEXTE)
    version = noms_versions.get(piece['version'], {}).get('nom', piece['version'])
    sous = f"{piece['couleur']} · {version}".upper()
    w = d.textlength(sous, font=f_sous)
    d.text(((L - w) / 2, H - 150), sous, font=f_sous, fill=DISCRET)
    haut = 'PREMIÈRE ÉDITION · 24 PIÈCES · EAZ'
    w = d.textlength(haut, font=f_sous)
    d.text(((L - w) / 2, 110), haut, font=f_sous, fill=DISCRET)
    nom = f"vintape-{piece['numero']:02d}-{piece['couleur']}-{piece['version'].replace('-', '')}-{VERSION}.webp"
    chemin = os.path.join(SORTIE, nom)
    toile.save(chemin, 'WEBP', quality=86, method=6)
    return chemin

if __name__ == '__main__':
    donnees = json.load(open(os.path.join(RACINE, 'pieces.json'), encoding='utf-8'))
    os.makedirs(SORTIE, exist_ok=True)
    for f in os.listdir(SORTIE):  # repart d'un dossier propre (la numérotation peut changer)
        if f.endswith('.webp'):
            os.remove(os.path.join(SORTIE, f))
    n = 0
    for piece in donnees['pieces']:
        if piece.get('images', {}).get('packshot'):
            chemin = epingle(piece, donnees.get('palette', {}), donnees.get('versions', {}))
            print(f'{os.path.relpath(chemin, RACINE)}  {os.path.getsize(chemin) // 1024} Ko')
            n += 1
    print(f'{n} épingles')
