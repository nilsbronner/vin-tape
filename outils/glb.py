"""Écriture minimale de fichiers glTF binaires (.glb), sans dépendance."""
import json, struct, math

class Scene:
    def __init__(self):
        self.bin = bytearray()
        self.vues, self.accesseurs, self.maillages, self.noeuds = [], [], [], []
        self.materiaux, self.textures, self.images = [], [], []

    def _vue(self, data, cible=None):
        while len(self.bin) % 4: self.bin += b'\0'
        vue = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if cible: vue['target'] = cible
        self.bin += data
        self.vues.append(vue)
        return len(self.vues) - 1

    def _accesseur(self, valeurs, type_, comp=5126, cible=34962):
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[type_]
        fmt = '<' + ('f' if comp == 5126 else 'H') * (len(valeurs) * n)
        plat = [c for v in valeurs for c in (v if n > 1 else (v,))]
        acc = {'bufferView': self._vue(struct.pack(fmt, *plat), cible), 'componentType': comp,
               'count': len(valeurs), 'type': type_}
        if type_ == 'VEC3':
            acc['min'] = [min(v[i] for v in valeurs) for i in range(3)]
            acc['max'] = [max(v[i] for v in valeurs) for i in range(3)]
        self.accesseurs.append(acc)
        return len(self.accesseurs) - 1

    def image(self, octets, mime='image/jpeg'):
        self.images.append({'bufferView': self._vue(octets), 'mimeType': mime})
        self.textures.append({'source': len(self.images) - 1, 'sampler': 0})
        return len(self.textures) - 1

    def materiau(self, nom, couleur=(1, 1, 1), texture=None, rugosite=0.6, metal=0.0, double=False):
        pbr = {'baseColorFactor': [*couleur, 1.0], 'metallicFactor': metal, 'roughnessFactor': rugosite}
        if texture is not None: pbr['baseColorTexture'] = {'index': texture}
        m = {'name': nom, 'pbrMetallicRoughness': pbr}
        if double: m['doubleSided'] = True
        self.materiaux.append(m)
        return len(self.materiaux) - 1

    def maillage(self, nom, primitives):
        """primitives : liste de (positions, normales, uvs|None, indices, materiau)"""
        prims = []
        for pos, nor, uv, ind, mat in primitives:
            att = {'POSITION': self._accesseur(pos, 'VEC3'), 'NORMAL': self._accesseur(nor, 'VEC3')}
            if uv: att['TEXCOORD_0'] = self._accesseur(uv, 'VEC2')
            prims.append({'attributes': att, 'indices': self._accesseur(ind, 'SCALAR', 5123, 34963), 'material': mat})
        self.maillages.append({'name': nom, 'primitives': prims})
        self.noeuds.append({'name': nom, 'mesh': len(self.maillages) - 1})

    def ecrire(self, chemin):
        while len(self.bin) % 4: self.bin += b'\0'
        doc = {
            'asset': {'version': '2.0', 'generator': 'vintape/outils/glb.py'},
            'scene': 0, 'scenes': [{'nodes': list(range(len(self.noeuds)))}],
            'nodes': self.noeuds, 'meshes': self.maillages, 'materials': self.materiaux,
            'accessors': self.accesseurs, 'bufferViews': self.vues,
            'buffers': [{'byteLength': len(self.bin)}],
        }
        if self.images:
            doc.update(images=self.images, textures=self.textures,
                       samplers=[{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}])
        js = json.dumps(doc, separators=(',', ':')).encode()
        js += b' ' * ((4 - len(js) % 4) % 4)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(chemin, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942)); f.write(self.bin)

# --- Formes -------------------------------------------------------------------
FACES = {  # normale, axes (u, v) de la face
    'avant':   ((0, 0, 1),  (1, 0, 0),  (0, -1, 0)),
    'arriere': ((0, 0, -1), (-1, 0, 0), (0, -1, 0)),
    'gauche':  ((-1, 0, 0), (0, 0, 1),  (0, -1, 0)),
    'droite':  ((1, 0, 0),  (0, 0, -1), (0, -1, 0)),
    'dessus':  ((0, 1, 0),  (1, 0, 0),  (0, 0, 1)),
    'dessous': ((0, -1, 0), (1, 0, 0),  (0, 0, -1)),
}

def face_boite(centre, taille, nom):
    """Une face de pavé : 4 sommets, uv 0-1 (haut-gauche = 0,0)."""
    n, u, v = FACES[nom]
    demi = [t / 2 for t in taille]
    c = [centre[i] + n[i] * demi[i] for i in range(3)]
    du = [u[i] * demi[i] for i in range(3)]
    dv = [v[i] * demi[i] for i in range(3)]
    pos = []
    for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        pos.append(tuple(c[i] + su * du[i] + sv * dv[i] for i in range(3)))
    uv = [(0, 0), (1, 0), (1, 1), (0, 1)]
    return pos, [n] * 4, uv, [0, 2, 1, 0, 3, 2]

def fusion(morceaux):
    pos, nor, uv, ind = [], [], [], []
    for p, n, u, i in morceaux:
        base = len(pos)
        pos += p; nor += n; uv += (u or [(0, 0)] * len(p)); ind += [base + k for k in i]
    return pos, nor, uv, ind

def cylindre(cx, cy, cz, r, h, seg=28):
    """Cylindre vertical posé en (cx, cy, cz)."""
    pos, nor, ind = [], [], []
    for k in range(seg + 1):
        a = 2 * math.pi * k / seg
        x, z = math.cos(a), math.sin(a)
        pos += [(cx + r * x, cy, cz + r * z), (cx + r * x, cy + h, cz + r * z)]
        nor += [(x, 0, z), (x, 0, z)]
    for k in range(seg):
        a, b = 2 * k, 2 * k + 2
        ind += [a, a + 1, b, b, a + 1, b + 1]
    centre = len(pos); pos.append((cx, cy + h, cz)); nor.append((0, 1, 0))
    for k in range(seg + 1):
        a = 2 * math.pi * k / seg
        pos.append((cx + r * math.cos(a), cy + h, cz + r * math.sin(a))); nor.append((0, 1, 0))
    for k in range(seg):
        ind += [centre, centre + 2 + k, centre + 1 + k]
    return pos, nor, None, ind

def boite_arrondie(centre, taille, rayon, n=6):
    """Pavé aux arêtes arrondies. Renvoie {nom_face: (positions, normales, uvs, indices)}.
    Les uv de chaque face vont de 0 à 1 (haut-gauche = 0,0), comme face_boite."""
    demi = [t / 2 for t in taille]
    r = min(rayon, *[d * 0.99 for d in demi])
    def echantillons(h):
        bande = [(h - r) + r * k / n for k in range(n + 1)]
        return [-x for x in reversed(bande)] + bande[1:]
    faces = {}
    for nom, (nv, uv_, vv) in FACES.items():
        axe_n = next(i for i in range(3) if nv[i]); s_n = nv[axe_n]
        axe_u = next(i for i in range(3) if uv_[i]); s_u = uv_[axe_u]
        axe_v = next(i for i in range(3) if vv[i]); s_v = vv[axe_v]
        au, av = echantillons(demi[axe_u]), echantillons(demi[axe_v])
        pos, nor, uvs = [], [], []
        for b in av:
            for a in au:
                p = [0.0, 0.0, 0.0]
                p[axe_n] = s_n * demi[axe_n]
                p[axe_u] = s_u * a
                p[axe_v] = s_v * b
                inner = [max(-(demi[i] - r), min(demi[i] - r, p[i])) for i in range(3)]
                d = [p[i] - inner[i] for i in range(3)]
                l = math.sqrt(sum(x * x for x in d)) or 1.0
                nn = [x / l for x in d]
                pos.append(tuple(centre[i] + inner[i] + r * nn[i] for i in range(3)))
                nor.append(tuple(nn))
                uvs.append(((a + demi[axe_u]) / (2 * demi[axe_u]), (b + demi[axe_v]) / (2 * demi[axe_v])))
        ind, cu = [], len(au)
        for j in range(len(av) - 1):
            for i in range(cu - 1):
                p00, p10 = j * cu + i, j * cu + i + 1
                p01, p11 = p00 + cu, p10 + cu
                ind += [p00, p11, p10, p00, p01, p11]
        faces[nom] = (pos, nor, uvs, ind)
    return faces

def prisme(contour, z_arriere, z_avant, uv_de=None):
    """Prisme droit à base convexe (contour en x, y, dans l'ordre horaire vu de face).
    Renvoie (face avant : pos, nor, uv, ind), (flancs : pos, nor, None, ind).
    uv_de(x, y) donne les coordonnées de texture de la face avant."""
    def oriente(pos, ind, normale):
        sortie = []
        for k in range(0, len(ind), 3):
            a, b, c = (pos[i] for i in ind[k:k + 3])
            u = [b[i] - a[i] for i in range(3)]; v = [c[i] - a[i] for i in range(3)]
            n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
            tri = ind[k:k + 3]
            sortie += tri if sum(n[i] * normale[i] for i in range(3)) >= 0 else [tri[0], tri[2], tri[1]]
        return sortie
    # face avant (éventail)
    pos = [(x, y, z_avant) for x, y in contour]
    ind = []
    for k in range(1, len(contour) - 1):
        ind += [0, k, k + 1]
    avant = (pos, [(0, 0, 1)] * len(pos), [uv_de(x, y) for x, y in contour] if uv_de else None, oriente(pos, ind, (0, 0, 1)))
    # flancs
    fp, fn, fi = [], [], []
    n = len(contour)
    for k in range(n):
        (ax, ay), (bx, by) = contour[k], contour[(k + 1) % n]
        dx, dy = bx - ax, by - ay
        l = math.hypot(dx, dy) or 1.0
        normale = (-dy / l, dx / l, 0.0)
        base = len(fp)
        quad = [(ax, ay, z_avant), (bx, by, z_avant), (bx, by, z_arriere), (ax, ay, z_arriere)]
        fp += quad; fn += [normale] * 4
        fi += oriente(fp, [base, base + 1, base + 2, base, base + 2, base + 3], normale)
    return avant, (fp, fn, None, fi)
