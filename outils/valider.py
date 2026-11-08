"""Vérifie pieces.json (et le contenu lié) avant un commit. Ne modifie rien.

Usage : python3 outils/valider.py
Code de sortie 0 si tout est bon (avertissements possibles), 1 s'il y a des erreurs.
"""
import json, os, re, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSIONS = {'chrome', 'alga', 'low-noise'}
STATUTS = {'disponible', 'vendue'}
CAISSONS = {'blanc', 'noir', 'assorti'}
FACES_CAISSON = {'dessus', 'cotes', 'dos', 'dessous'}
FORMATS = {'60', '90'}

erreurs, avertissements = [], []
err = lambda m: erreurs.append(m)
avert = lambda m: avertissements.append(m)

def fichier_existe(chemin):
    return chemin.startswith('/') and os.path.isfile(os.path.join(RACINE, chemin.lstrip('/')))

def couleur_caisson_ok(c):
    return c in CAISSONS or (isinstance(c, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', c))

try:
    donnees = json.load(open(os.path.join(RACINE, 'pieces.json'), encoding='utf-8'))
except (OSError, json.JSONDecodeError) as e:
    sys.exit(f'ERREUR : pieces.json illisible ({e})')

palette = donnees.get('palette', {})
pieces = donnees.get('pieces', [])
if len(pieces) != 24:
    err(f'{len(pieces)} pièces au lieu de 24')

numeros = [p.get('numero') for p in pieces]
if sorted(n for n in numeros if isinstance(n, int)) != list(range(1, 25)):
    manquants = sorted(set(range(1, 25)) - set(n for n in numeros if isinstance(n, int)))
    doublons = sorted({n for n in numeros if numeros.count(n) > 1})
    err(f'numéros non conformes (attendu 1 à 24, uniques) — manquants : {manquants or "aucun"}, en double : {doublons or "aucun"}')

combinaisons = set()
for p in pieces:
    n = p.get('numero', '?')
    nom = f'pièce n° {n}'
    if not isinstance(n, int):
        err(f'{nom} : « numero » doit être un nombre entier')
    if p.get('couleur') not in palette:
        err(f'{nom} : couleur inconnue « {p.get("couleur")} » (connues : {", ".join(palette)})')
    if p.get('version') not in VERSIONS:
        err(f'{nom} : version inconnue « {p.get("version")} » (connues : {", ".join(sorted(VERSIONS))})')
    combinaisons.add((p.get('couleur'), p.get('version')))
    if p.get('statut') not in STATUTS:
        err(f'{nom} : statut « {p.get("statut")} » invalide (disponible ou vendue)')
    lien = p.get('lienPaiement', '')
    if lien and not re.fullmatch(r'https://\S+', lien):
        err(f'{nom} : lienPaiement doit être vide ou commencer par https://')
    if lien and not lien.startswith('https://buy.stripe.com/'):
        avert(f'{nom} : lienPaiement ne ressemble pas à un Payment Link Stripe ({lien})')
    if p.get('statut') == 'disponible' and not lien:
        avert(f'{nom} : pas encore de lien Stripe (affiche « Bientôt disponible »)')
    if str(p.get('format', '')) not in FORMATS:
        avert(f'{nom} : format manquant ou inconnu (« {p.get("format", "")} », attendu 60 ou 90)')
    c = p.get('caisson')
    if isinstance(c, dict):
        if not set(c) <= FACES_CAISSON or not all(couleur_caisson_ok(v) for v in c.values()):
            err(f'{nom} : caisson bicolore mal décrit ({c})')
    elif not couleur_caisson_ok(c):
        err(f'{nom} : caisson « {c} » invalide')
    for cle, chemin in [('images.packshot', (p.get('images') or {}).get('packshot', '')), ('modele3d', p.get('modele3d', ''))]:
        if chemin and not fichier_existe(chemin):
            err(f'{nom} : {cle} introuvable ({chemin})')
    photos = p.get('photos', [])
    if not isinstance(photos, list):
        err(f'{nom} : « photos » doit être une liste')
    else:
        for ph in photos:
            src = ph.get('src') if isinstance(ph, dict) else ph
            if not src or not fichier_existe(src):
                err(f'{nom} : photo introuvable ({src})')
            elif not src.endswith('.webp'):
                avert(f'{nom} : photo non WebP ({src})')

if len(combinaisons) != len(pieces):
    err('deux pièces ont la même couleur et la même version')

# Contenu lié
try:
    contenu = json.load(open(os.path.join(RACINE, 'contenu.json'), encoding='utf-8'))
    ft = contenu.get('ficheTechnique', {})
    dim = ft.get('dimensionsCm', {})
    if not all(isinstance(dim.get(k), (int, float)) for k in ('largeur', 'hauteur', 'profondeur')):
        avert('ficheTechnique.dimensionsCm incomplet : la 3D et la réalité augmentée utilisent des dimensions provisoires')
    if not isinstance(ft.get('poidsKg'), (int, float)):
        avert('ficheTechnique.poidsKg non renseigné')
except (OSError, json.JSONDecodeError) as e:
    err(f'contenu.json illisible ({e})')

for m in avertissements:
    print(f'  avertissement : {m}')
for m in erreurs:
    print(f'  ERREUR : {m}')
print(f'\n{len(pieces)} pièces · {len(erreurs)} erreur(s) · {len(avertissements)} avertissement(s)')
sys.exit(1 if erreurs else 0)
