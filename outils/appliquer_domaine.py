"""Recopie l'adresse du site (contenu.json → "urlSite") partout où elle doit être
écrite en dur : balises canonical / Open Graph / Twitter / JSON-LD de index.html,
sitemap.xml et robots.txt. Un site statique sans build ne peut pas lire contenu.json
pour ces fichiers : on change donc l'adresse à un seul endroit, puis on lance ce script.

Usage : python3 outils/appliquer_domaine.py
"""
import json, os, re, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_SITEMAP = ['/', '/mentions-legales', '/cgv', '/confidentialite']

def lire(nom):
    return open(os.path.join(RACINE, nom), encoding='utf-8').read()

def ecrire(nom, texte):
    open(os.path.join(RACINE, nom), 'w', encoding='utf-8').write(texte)

url = json.loads(lire('contenu.json')).get('urlSite', '').rstrip('/')
if not re.fullmatch(r'https://[a-z0-9.-]+\.[a-z]{2,}', url):
    sys.exit(f'urlSite invalide dans contenu.json : « {url} » (attendu https://domaine.ext, sans chemin)')

index = lire('index.html')
m = re.search(r'<link rel="canonical" href="(https://[^/"]+)/?"', index)
if not m:
    sys.exit('balise canonical introuvable dans index.html')
ancienne = m.group(1)
nouveau = index.replace(ancienne, url)
ecrire('index.html', nouveau)
print(f'index.html : {index.count(ancienne)} occurrence(s) de {ancienne} → {url}')

ecrire('robots.txt', f'User-agent: *\nAllow: /\n\nSitemap: {url}/sitemap.xml\n')
lignes = '\n'.join(f'  <url><loc>{url}{p}</loc></url>' for p in PAGES_SITEMAP)
ecrire('sitemap.xml', f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{lignes}\n</urlset>\n')
print('robots.txt et sitemap.xml régénérés')
