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
from glb import Scene, face_boite, fusion, cylindre, boite_arrondie, prisme

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RACINE, 'originals')
SORTIE_TEX = os.path.join(RACINE, 'assets', 'pieces')
SORTIE_GLB = os.path.join(RACINE, 'assets', 'modeles')
VERSION = 'v4'

# Dimensions PROVISOIRES en mètres (à remplacer par les vraies mesures)
LARGEUR = 0.45
HAUTEUR = LARGEUR / 1.92        # proportion mesurée sur les photos de face
PROFONDEUR = 0.24               # caisson profond, à peu près aussi profond que haut
EPAISSEUR_FACADE = 0.02         # plaque de façade épaisse, bords arrondis
RAYON_FACADE = 0.006
RELIEF_CADRE = 0.0025           # cadre surélevé autour de l'étiquette (étiquette en retrait)
RELIEF_TRAPEZE = 0.004          # trapèze du bas, encore plus en avant

# Zones de la façade, en fraction de la largeur (u) et de la hauteur (v, depuis le haut),
# mesurées sur les photos redressées (même dessin pour toutes les pièces).
ETIQUETTE = {'u': (0.05, 0.95), 'v': (0.085, 0.735)}
TRAPEZE = [(0.225, 0.745), (0.775, 0.745), (0.80, 1.0), (0.20, 1.0)]
PIEDS = 0.008

TEINTES = {'blanc': (0.91, 0.90, 0.87), 'noir': (0.11, 0.11, 0.11)}
FACES_CAISSON = ('dessus', 'cotes', 'dos', 'dessous')

def lineaire(c):
    c = np.asarray(c, float)
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))

def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def teinte(nom, facade):
    """'blanc', 'noir', 'assorti' (= couleur de façade) ou '#rrggbb'."""
    if nom == 'assorti': return facade
    if nom in TEINTES: return TEINTES[nom]
    if isinstance(nom, str) and nom.startswith('#'): return hex_rgb(nom)
    raise ValueError(f'couleur de caisson inconnue : {nom}')

def caisson_par_face(config):
    """« caisson » de pieces.json : un nom (une seule couleur) ou un objet
    { "dessus": …, "cotes": …, "dos": …, "dessous": … } pour un caisson bicolore."""
    if isinstance(config, dict):
        base = config.get('cotes', 'blanc')
        return {f: config.get(f, base) for f in FACES_CAISSON}
    return {f: config for f in FACES_CAISSON}

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

def modele(cle, config_caisson, donnees):
    f = donnees['faces'][cle]
    face = redresser(f['photo'], f['coins'], 1536, 800)
    octets_face = jpeg(face)
    apercu = Image.fromarray(face); apercu.thumbnail((1400, 1400))
    apercu.save(os.path.join(SORTIE_TEX, f'face-{cle}-v1.webp'), 'WEBP', quality=82, method=6)
    couleur = couleur_facade(face)
    faces_caisson = caisson_par_face(config_caisson)

    s = Scene()
    m_face = s.materiau('facade-photo', texture=s.image(octets_face), rugosite=0.55)
    m_tranche = s.materiau('facade', lineaire(couleur), rugosite=0.5)
    m_noir = s.materiau('noir', lineaire((0.07, 0.07, 0.07)), rugosite=0.6, double=True)
    materiaux = {}
    def mat(nom_couleur):
        if nom_couleur not in materiaux:
            materiaux[nom_couleur] = s.materiau(f'caisson-{nom_couleur}', lineaire(teinte(nom_couleur, couleur)), rugosite=0.5)
        return materiaux[nom_couleur]

    W, H, D, e = LARGEUR, HAUTEUR, PROFONDEUR, EPAISSEUR_FACADE
    yc = PIEDS + H / 2
    # Façade : plaque épaisse aux bords arrondis, photo sur le devant
    plaque = boite_arrondie((0, yc, D / 2 - e / 2), (W, H, e), RAYON_FACADE)
    s.maillage('facade', [
        (*plaque['avant'], m_face),
        (*fusion([plaque[n] for n in ('arriere', 'gauche', 'droite', 'dessus', 'dessous')]), m_tranche),
    ])
    # Relief de la façade : cadre surélevé (l'étiquette paraît en retrait) et trapèze en avant
    z0 = D / 2
    mu, mv = RAYON_FACADE / W, RAYON_FACADE / H
    x_de = lambda u: -W / 2 + u * W
    y_de = lambda v: yc + H / 2 - v * H
    uv_de = lambda x, y: ((x + W / 2) / W, (yc + H / 2 - y) / H)
    eu, ev = ETIQUETTE['u'], ETIQUETTE['v']
    bandes = [((mu, mv), (1 - mu, ev[0])), ((mu, ev[1]), (1 - mu, 1 - mv)),
              ((mu, ev[0]), (eu[0], ev[1])), ((eu[1], ev[0]), (1 - mu, ev[1]))]
    m_flanc = s.materiau('facade-flanc', lineaire(tuple(c * 0.55 for c in couleur)), rugosite=0.6)
    avants, flancs = [], []
    for (u0, v0), (u1, v1) in bandes:
        contour = [(x_de(u0), y_de(v0)), (x_de(u1), y_de(v0)), (x_de(u1), y_de(v1)), (x_de(u0), y_de(v1))]
        a, f = prisme(contour, z0, z0 + RELIEF_CADRE, uv_de); avants.append(a); flancs.append(f)
    contour = [(x_de(u), y_de(min(v, 1 - mv))) for u, v in TRAPEZE]
    a, f = prisme(contour, z0 + RELIEF_CADRE, z0 + RELIEF_CADRE + RELIEF_TRAPEZE, uv_de); avants.append(a); flancs.append(f)
    s.maillage('facade-relief', [(*fusion(avants), m_face), (*fusion(flancs), m_flanc)])
    # Caisson, couleur réglable face par face
    # Caisson à fleur de la façade : même largeur, même hauteur, même arrondi
    lc, hc, pc = W, H, D - e
    caisson = boite_arrondie((0, yc, -D / 2 + pc / 2), (lc, hc, pc), RAYON_FACADE)
    groupes = {}
    for nom_face, cle_face in (('dessus', 'dessus'), ('gauche', 'cotes'), ('droite', 'cotes'), ('dessous', 'dessous'), ('avant', 'cotes')):
        groupes.setdefault(faces_caisson[cle_face], []).append(caisson[nom_face])
    prims = [(*fusion(morceaux), mat(nom)) for nom, morceaux in groupes.items()]
    # Dos : photo de cette pièce si elle existe, sinon photo d'un dos de même couleur
    dos = donnees.get('dos', {}).get(cle) or donnees.get('dos_par_couleur', {}).get(faces_caisson['dos'])
    if dos:
        t_dos = s.image(jpeg(redresser(dos['photo'], dos['coins'], 1024, 420), 82))
        prims.append((*caisson['arriere'], s.materiau('dos-photo', texture=t_dos, rugosite=0.5)))
    else:
        prims.append((*caisson['arriere'], mat(faces_caisson['dos'])))
    s.maillage('caisson', prims)
    # Module de réglages (basses, aigus, volume) centré sur le dessus, et pieds
    haut = PIEDS + H / 2 + hc / 2
    zr = -D / 2 + pc / 2
    morceaux = [face_boite((0, haut + 0.002, zr), (0.12, 0.004, 0.045), n) for n in FACES_TOUTES]
    for x, r in ((-0.03, 0.0095), (0.0, 0.0075), (0.026, 0.0075)):
        morceaux.append(cylindre(x, haut + 0.004, zr, r, 0.016))
    for sx in (-1, 1):
        for sz in (-1, 1):
            morceaux.append(cylindre(sx * (W / 2 - 0.04), 0, -D / 2 + pc / 2 + sz * (pc / 2 - 0.04), 0.012, PIEDS))
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
    catalogue = json.load(open(os.path.join(RACINE, 'pieces.json')))
    for piece in catalogue['pieces']:
        cle = f"{piece['couleur']}-{piece['version'].replace('-', '')}"
        if cle not in donnees['faces']:
            continue  # pas encore de photo de façade repérée
        chemin, taille = modele(cle, piece['caisson'], donnees)
        print(f'{os.path.relpath(chemin, RACINE)}  {taille // 1024} Ko')
