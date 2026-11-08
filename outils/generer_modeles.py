"""Génère, à partir des photos de la pièce, la texture de façade (JPEG)
(WebP, pour la page) et le modèle 3D (.glb) utilisé par le module « Voir chez moi » (3D + réalité augmentée).

Usage : python3 outils/generer_modeles.py
Prérequis : pip install opencv-python-headless pillow numpy
Les photos originales doivent être dans /originals/ (non versionné).
"""
import io, json, os, sys
import numpy as np, cv2
from PIL import Image, ImageOps
sys.path.insert(0, os.path.dirname(__file__))
from glb import Scene, face_boite, fusion, cylindre

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RACINE, 'originals')
SORTIE_TEX = os.path.join(RACINE, 'assets', 'pieces')
SORTIE_GLB = os.path.join(RACINE, 'assets', 'modeles')
VERSION = 'v1'

# Dimensions PROVISOIRES en mètres (à remplacer par les vraies mesures)
LARGEUR = 0.45
HAUTEUR = LARGEUR / 1.92        # proportion mesurée sur les photos de face
PROFONDEUR = 0.20
EPAISSEUR_FACADE = 0.012
PIEDS = 0.008

CAISSONS = {'blanc': (0.91, 0.90, 0.87), 'noir': (0.11, 0.11, 0.11)}
PIECES = {
    # identifiant : caisson ('blanc', 'noir' ou 'assorti')
    'menthe-chrome': 'blanc', 'menthe-alga': 'noir', 'menthe-lownoise': 'assorti',
    'orange-chrome': 'blanc', 'orange-alga': 'noir', 'orange-lownoise': 'assorti',
    'vert-lownoise': 'assorti',
}

def lineaire(c):
    c = np.asarray(c, float)
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))

def redresser(photo, coins, w, h):
    im = np.array(ImageOps.exif_transpose(Image.open(os.path.join(ORIG, photo + '.jpg'))).convert('RGB'))
    M = cv2.getPerspectiveTransform(np.array(coins, np.float32),
                                    np.array([(0, 0), (w, 0), (w, h), (0, h)], np.float32))
    return cv2.warpPerspective(im, M, (w, h), flags=cv2.INTER_LANCZOS4)

def jpeg(arr, qualite=86):
    tampon = io.BytesIO()
    Image.fromarray(arr).save(tampon, 'JPEG', quality=qualite, optimize=True, progressive=False)
    return tampon.getvalue()

def couleur_facade(face):
    h, w = face.shape[:2]
    bande = face[int(h * .45):int(h * .6), int(w * .008):int(w * .025)].reshape(-1, 3)
    return tuple(np.median(bande, axis=0) / 255)

def modele(cle, caisson, donnees):
    f = donnees['faces'][cle]
    face = redresser(f['photo'], f['coins'], 1536, 800)
    octets_face = jpeg(face)
    apercu = Image.fromarray(face); apercu.thumbnail((1400, 1400))
    apercu.save(os.path.join(SORTIE_TEX, f'face-{cle}-{VERSION}.webp'), 'WEBP', quality=82, method=6)
    teinte = couleur_facade(face)
    corps = CAISSONS.get(caisson, teinte)

    s = Scene()
    t_face = s.image(octets_face)
    m_face = s.materiau('facade-photo', texture=t_face, rugosite=0.55)
    m_tranche = s.materiau('facade', lineaire(teinte), rugosite=0.5)
    m_corps = s.materiau('caisson', lineaire(corps), rugosite=0.45)
    m_noir = s.materiau('noir', lineaire((0.07, 0.07, 0.07)), rugosite=0.6, double=True)

    W, H, D, e = LARGEUR, HAUTEUR, PROFONDEUR, EPAISSEUR_FACADE
    yc = PIEDS + H / 2
    # Façade : plaque avant avec la photo
    centre_f, taille_f = (0, yc, D / 2 - e / 2), (W, H, e)
    s.maillage('facade', [
        (*face_boite(centre_f, taille_f, 'avant'), m_face),
        (*fusion([face_boite(centre_f, taille_f, n) for n in ('gauche', 'droite', 'dessus', 'dessous')]), m_tranche),
    ])
    # Caisson
    centre_c, taille_c = (0, yc, -e / 2), (W - 0.006, H - 0.006, D - e)
    prims = [(*fusion([face_boite(centre_c, taille_c, n) for n in ('gauche', 'droite', 'dessus', 'dessous')]), m_corps)]
    dos = donnees['dos'].get(caisson)
    if dos:
        t_dos = s.image(jpeg(redresser(dos['photo'], dos['coins'], 1024, 420), 82))
        m_dos = s.materiau('dos-photo', texture=t_dos, rugosite=0.45)
        prims.append((*face_boite(centre_c, taille_c, 'arriere'), m_dos))
    else:
        prims.append((*face_boite(centre_c, taille_c, 'arriere'), m_corps))
    s.maillage('caisson', prims)
    # Module de réglages (basses, aigus, volume) et pieds
    haut = PIEDS + H - 0.003
    zr = D / 2 - e - 0.055
    morceaux = [face_boite((0, haut + 0.003, zr), (0.11, 0.006, 0.034), n) for n in FACES_TOUTES]
    for x, r in ((-0.026, 0.0095), (0.002, 0.0075), (0.026, 0.0075)):
        morceaux.append(cylindre(x, haut + 0.006, zr, r, 0.016))
    for sx in (-1, 1):
        for sz in (-1, 1):
            morceaux.append(cylindre(sx * (W / 2 - 0.04), 0, sz * (D / 2 - 0.045), 0.012, PIEDS))
    pos, nor, ind = [], [], []
    for p, n, _uv, i in morceaux:
        base = len(pos); pos += p; nor += n; ind += [base + k for k in i]
    s.maillage('details', [(pos, nor, None, ind, m_noir)])
    chemin = os.path.join(SORTIE_GLB, f'{cle}-{VERSION}.glb')
    s.ecrire(chemin)
    return chemin, os.path.getsize(chemin)

FACES_TOUTES = ('avant', 'arriere', 'gauche', 'droite', 'dessus', 'dessous')

if __name__ == '__main__':
    os.makedirs(SORTIE_TEX, exist_ok=True); os.makedirs(SORTIE_GLB, exist_ok=True)
    donnees = json.load(open(os.path.join(os.path.dirname(__file__), 'pieces-photos.json')))
    for cle, caisson in PIECES.items():
        chemin, taille = modele(cle, caisson, donnees)
        print(f'{os.path.relpath(chemin, RACINE)}  {taille // 1024} Ko')
