// Module « Voir chez moi » : l'enceinte posée sur une photo du visiteur.
// Tout se passe dans le navigateur (canvas) : la photo n'est jamais envoyée.
import { imageCassette } from './cassette.js';
import { couleursPiece, estDisponible, numeroAffiche } from './donnees.js';
import { creer, typo } from './contenu.js';
import { choisir, pieceCourante, surChoix } from './selection.js';
import { boutonReserver } from './catalogue.js';

const PHOTO_MAX = 2400;        // px : les grandes photos sont réduites
const TAILLE_MIN = 0.06;       // largeur de l'enceinte, en fraction de la photo
const TAILLE_MAX = 0.9;
const borne = (v, min, max) => Math.min(max, Math.max(min, v));

export function initVoirChezMoi({ contenu, pieces, palette }) {
  const racine = document.querySelector('[data-vcm]');
  const canvas = racine?.querySelector('[data-vcm-canvas]');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const scene = racine.querySelector('.vcm__scene');
  const select = racine.querySelector('[data-vcm-select]');
  const taille = racine.querySelector('[data-vcm-taille]');
  const btnExemple = racine.querySelector('[data-vcm-exemple]');
  const zoneReserver = racine.querySelector('[data-vcm-reserver]');
  const largeurCm = contenu.ficheTechnique?.largeurReelleCm;

  const etat = {
    fond: null,                // { image, w, h } ou null (scène d'exemple)
    piece: null,
    image: null,               // image de l'enceinte
    ratio: 256 / 400,          // hauteur / largeur de l'image de l'enceinte
    obj: { x: 0.5, y: 0.5, l: 0.3 },
    cssW: 0, cssH: 0, dpr: 1,
    survol: false,
    pointeurs: new Map(),
    geste: null,
  };

  // --- Options du sélecteur de pièce ----------------------------------------
  for (const piece of pieces) {
    const option = document.createElement('option');
    option.value = piece.numero;
    option.textContent = `N° ${numeroAffiche(piece)} — ${piece.couleurFacade} / ${piece.couleurArriere} / ${piece.etiquette}${estDisponible(piece) ? '' : ' (vendue)'}`;
    select.append(option);
  }
  const parNumero = (n) => pieces.find((p) => p.numero === Number(n));
  select.addEventListener('change', () => choisir(parNumero(select.value), 'vcm'));
  const decaler = (pas) => {
    const i = pieces.indexOf(etat.piece);
    choisir(pieces[(i + pas + pieces.length) % pieces.length], 'vcm');
  };
  racine.querySelector('[data-vcm-prec]').addEventListener('click', () => decaler(-1));
  racine.querySelector('[data-vcm-suiv]').addEventListener('click', () => decaler(1));

  // --- Images des pièces (détourage fourni, sinon dessin SVG) ---------------
  const cache = new Map();
  function imagePiece(piece) {
    if (!cache.has(piece.numero)) {
      const src = piece.images?.detouree;
      const promesse = src
        ? new Promise((ok, ko) => { const img = new Image(); img.onload = () => ok(img); img.onerror = ko; img.src = src; })
        : imageCassette({ couleurs: couleursPiece(palette, piece), numero: numeroAffiche(piece), format: piece.format });
      cache.set(piece.numero, promesse.catch(() => imageCassette({ couleurs: couleursPiece(palette, piece) })));
    }
    return cache.get(piece.numero);
  }

  async function afficherPiece(piece) {
    if (!piece) return;
    etat.piece = piece;
    select.value = piece.numero;
    const img = await imagePiece(piece);
    if (etat.piece !== piece) return; // une autre pièce a été choisie entre-temps
    etat.image = img;
    etat.ratio = (img.naturalHeight || img.height) / (img.naturalWidth || img.width) || etat.ratio;
    majReserver();
    majLibelle();
    dessiner();
  }

  function majReserver() {
    if (!zoneReserver || !etat.piece) return;
    zoneReserver.textContent = '';
    const piece = etat.piece;
    zoneReserver.append(
      creer('p', 'vcm__choix', `N° ${numeroAffiche(piece)}/24 · ${piece.format}`),
      boutonReserver(piece, contenu.catalogue),
    );
  }

  function majLibelle() {
    if (!etat.piece) return;
    const ou = etat.fond ? 'sur ta photo' : 'sur un meuble d’exemple';
    canvas.setAttribute('aria-label', typo(`Aperçu : enceinte n° ${numeroAffiche(etat.piece)} posée ${ou}`));
  }

  // --- Mise en page du canvas -----------------------------------------------
  function mettreEnPage() {
    const ratioFond = etat.fond ? etat.fond.w / etat.fond.h : 4 / 3;
    const largeurDispo = scene.clientWidth;
    const hauteurMax = Math.max(260, window.innerHeight * 0.72);
    let w = largeurDispo;
    let h = w / ratioFond;
    if (h > hauteurMax) { h = hauteurMax; w = h * ratioFond; }
    etat.cssW = Math.round(w);
    etat.cssH = Math.round(h);
    etat.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(etat.cssW * etat.dpr);
    canvas.height = Math.round(etat.cssH * etat.dpr);
    canvas.style.width = `${etat.cssW}px`;
    canvas.style.height = `${etat.cssH}px`;
    dessiner();
  }

  // Rectangle de l'enceinte en pixels CSS
  function boite() {
    const w = etat.obj.l * etat.cssW;
    const h = w * etat.ratio;
    const cx = etat.obj.x * etat.cssW;
    const cy = etat.obj.y * etat.cssH;
    return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
  }

  // Position de départ : posée sur le meuble d'exemple, ou centrée sur la photo
  function positionInitiale() {
    if (etat.fond) {
      etat.obj = { x: 0.5, y: 0.55, l: 0.3 };
    } else {
      const l = 0.28;
      const hFraction = (l * etat.cssW * etat.ratio) / (etat.cssH || 1);
      etat.obj = { x: 0.5, y: 0.6 - hFraction / 2 - 0.004, l };
    }
    taille.value = Math.round(etat.obj.l * 100);
  }

  // --- Dessin ---------------------------------------------------------------
  function dessinerExemple(w, h) {
    const mur = ctx.createLinearGradient(0, 0, 0, h);
    mur.addColorStop(0, '#46403a');
    mur.addColorStop(1, '#2c2824');
    ctx.fillStyle = mur;
    ctx.fillRect(0, 0, w, h);
    // cadre au mur
    ctx.strokeStyle = 'rgba(243,239,230,.18)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(w * 0.62, h * 0.12, w * 0.2, h * 0.26);
    ctx.fillStyle = 'rgba(243,239,230,.05)';
    ctx.fillRect(w * 0.64, h * 0.145, w * 0.16, h * 0.21);
    // sol
    ctx.fillStyle = '#1f1c19';
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    // buffet
    const haut = h * 0.6;
    ctx.fillStyle = '#7a5539';
    ctx.fillRect(w * 0.12, haut, w * 0.76, h * 0.2);
    ctx.fillStyle = '#93684a';
    ctx.fillRect(w * 0.11, haut - h * 0.018, w * 0.78, h * 0.022);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (const fx of [0.37, 0.63]) ctx.fillRect(w * fx, haut + h * 0.02, Math.max(1, w * 0.003), h * 0.16);
    ctx.fillStyle = '#5a3f2b';
    for (const fx of [0.15, 0.83]) ctx.fillRect(w * fx, haut + h * 0.2, w * 0.02, h * 0.07);
    // mention
    ctx.fillStyle = 'rgba(243,239,230,.45)';
    ctx.font = `500 ${Math.max(11, w * 0.018)}px "DM Mono", ui-monospace, monospace`;
    ctx.fillText('EXEMPLE — CHARGE TA PHOTO', w * 0.03, h * 0.95);
  }

  function dessinerOmbre(b) {
    const rx = b.w * 0.5;
    const ry = Math.max(4, b.h * 0.08);
    ctx.save();
    ctx.translate(b.cx, b.y + b.h * 0.97);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,.5)');
    g.addColorStop(0.6, 'rgba(0,0,0,.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function dessinerEchelle(b) {
    const y = Math.min(etat.cssH - 18, b.y + b.h + 16);
    const texte = largeurCm ? `${String(largeurCm).replace('.', ',')} cm` : 'largeur réelle : à renseigner';
    ctx.save();
    ctx.strokeStyle = 'rgba(243,239,230,.85)';
    ctx.fillStyle = 'rgba(243,239,230,.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y);
    ctx.moveTo(b.x, y - 5); ctx.lineTo(b.x, y + 5);
    ctx.moveTo(b.x + b.w, y - 5); ctx.lineTo(b.x + b.w, y + 5);
    ctx.stroke();
    ctx.font = '500 12px "DM Mono", ui-monospace, monospace';
    const tw = ctx.measureText(texte).width;
    ctx.fillStyle = 'rgba(18,18,17,.8)';
    ctx.fillRect(b.cx - tw / 2 - 6, y - 9, tw + 12, 18);
    ctx.fillStyle = largeurCm ? '#f3efe6' : '#ffd866';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(texte, b.cx, y + 0.5);
    ctx.restore();
  }

  function dessinerPoignees(b) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(243,239,230,.7)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f3c43b';
    ctx.strokeStyle = '#121211';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x + b.w + 6, b.y + b.h + 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function dessiner({ interface: ui = true } = {}) {
    const { cssW: w, cssH: h, dpr } = etat;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (etat.fond) ctx.drawImage(etat.fond.image, 0, 0, w, h);
    else dessinerExemple(w, h);
    if (!etat.image) return;
    const b = boite();
    dessinerOmbre(b);
    ctx.drawImage(etat.image, b.x, b.y, b.w, b.h);
    if (ui || largeurCm) dessinerEchelle(b);
    const actif = etat.survol || etat.geste || document.activeElement === canvas;
    if (ui && actif) dessinerPoignees(b);
  }

  // --- Interactions ---------------------------------------------------------
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const surPoignee = (p) => {
    const b = boite();
    return Math.hypot(p.x - (b.x + b.w + 6), p.y - (b.y + b.h + 6)) < 24;
  };
  const dedans = (p) => {
    const b = boite();
    return p.x >= b.x - 8 && p.x <= b.x + b.w + 8 && p.y >= b.y - 8 && p.y <= b.y + b.h + 8;
  };
  const fixerTaille = (l) => {
    etat.obj.l = borne(l, TAILLE_MIN, TAILLE_MAX);
    taille.value = Math.round(etat.obj.l * 100);
  };
  const deplacerVers = (cx, cy) => {
    etat.obj.x = borne(cx / etat.cssW, 0, 1);
    etat.obj.y = borne(cy / etat.cssH, 0, 1);
  };

  function demarrerGeste() {
    const pts = [...etat.pointeurs.values()];
    const b = boite();
    if (pts.length >= 2) {
      const [a, c] = pts;
      etat.geste = {
        type: 'pince',
        dist: Math.hypot(a.x - c.x, a.y - c.y) || 1,
        l: etat.obj.l,
        milieu: { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 },
        centre: { x: b.cx, y: b.cy },
      };
    } else if (pts.length === 1) {
      const p = pts[0];
      if (surPoignee(p)) {
        etat.geste = { type: 'taille', dist: Math.hypot(p.x - b.cx, p.y - b.cy) || 1, l: etat.obj.l };
      } else if (dedans(p)) {
        etat.geste = { type: 'deplacer', dx: p.x - b.cx, dy: p.y - b.cy };
      } else {
        etat.geste = null;
      }
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    const p = point(e);
    if (etat.pointeurs.size === 0 && !dedans(p) && !surPoignee(p)) return;
    canvas.setPointerCapture?.(e.pointerId);
    etat.pointeurs.set(e.pointerId, p);
    demarrerGeste();
    e.preventDefault();
    dessiner();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = point(e);
    if (!etat.pointeurs.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        const auDessus = dedans(p) || surPoignee(p);
        canvas.style.cursor = surPoignee(p) ? 'nwse-resize' : auDessus ? 'grab' : 'default';
        if (auDessus !== etat.survol) { etat.survol = auDessus; dessiner(); }
      }
      return;
    }
    etat.pointeurs.set(e.pointerId, p);
    const g = etat.geste;
    if (!g) return;
    const b = boite();
    if (g.type === 'deplacer') {
      canvas.style.cursor = 'grabbing';
      deplacerVers(p.x - g.dx, p.y - g.dy);
    } else if (g.type === 'taille') {
      fixerTaille(g.l * (Math.hypot(p.x - b.cx, p.y - b.cy) / g.dist));
    } else if (g.type === 'pince') {
      const [a, c] = [...etat.pointeurs.values()];
      fixerTaille(g.l * (Math.hypot(a.x - c.x, a.y - c.y) / g.dist));
      const milieu = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      deplacerVers(g.centre.x + milieu.x - g.milieu.x, g.centre.y + milieu.y - g.milieu.y);
    }
    dessiner();
  });

  const finPointeur = (e) => {
    if (!etat.pointeurs.delete(e.pointerId)) return;
    demarrerGeste();
    if (!etat.pointeurs.size) {
      etat.geste = null;
      canvas.style.cursor = etat.survol ? 'grab' : 'default';
    }
    dessiner();
  };
  canvas.addEventListener('pointerup', finPointeur);
  canvas.addEventListener('pointercancel', finPointeur);
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && !etat.pointeurs.size && etat.survol) { etat.survol = false; dessiner(); }
  });

  canvas.addEventListener('wheel', (e) => {
    if (!dedans(point(e))) return;
    e.preventDefault();
    fixerTaille(etat.obj.l * Math.exp(-e.deltaY * 0.0015));
    dessiner();
  }, { passive: false });

  canvas.addEventListener('keydown', (e) => {
    const pas = e.shiftKey ? 0.05 : 0.01;
    const actions = {
      ArrowLeft: () => { etat.obj.x = borne(etat.obj.x - pas, 0, 1); },
      ArrowRight: () => { etat.obj.x = borne(etat.obj.x + pas, 0, 1); },
      ArrowUp: () => { etat.obj.y = borne(etat.obj.y - pas, 0, 1); },
      ArrowDown: () => { etat.obj.y = borne(etat.obj.y + pas, 0, 1); },
      '+': () => fixerTaille(etat.obj.l * 1.05),
      '=': () => fixerTaille(etat.obj.l * 1.05),
      '-': () => fixerTaille(etat.obj.l / 1.05),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
    dessiner();
  });
  canvas.addEventListener('focus', () => dessiner());
  canvas.addEventListener('blur', () => dessiner());

  taille.addEventListener('input', () => { fixerTaille(Number(taille.value) / 100); dessiner(); });

  // --- Photo du visiteur ----------------------------------------------------
  async function chargerPhoto(fichier) {
    if (!fichier || !fichier.type.startsWith('image/')) return;
    const url = URL.createObjectURL(fichier);
    try {
      const img = await new Promise((ok, ko) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = ko;
        i.src = url;
      });
      let image = img;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const echelle = Math.min(1, PHOTO_MAX / Math.max(w, h));
      if (echelle < 1) {
        w = Math.round(w * echelle);
        h = Math.round(h * echelle);
        image = document.createElement('canvas');
        image.width = w;
        image.height = h;
        image.getContext('2d').drawImage(img, 0, 0, w, h);
      }
      etat.fond = { image, w, h };
      btnExemple.hidden = false;
      mettreEnPage();
      positionInitiale();
      majLibelle();
      dessiner();
      canvas.focus({ preventScroll: true });
    } catch (erreur) {
      console.error('Photo illisible', erreur);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  for (const input of racine.querySelectorAll('[data-vcm-camera], [data-vcm-fichier]')) {
    input.addEventListener('change', () => {
      chargerPhoto(input.files?.[0]);
      input.value = '';
    });
  }

  // Bouton appareil photo : seulement sur écran tactile
  const etiquetteCamera = racine.querySelector('[data-vcm-camera-label]');
  const tactile = window.matchMedia('(pointer: coarse)');
  const majCamera = () => { etiquetteCamera.hidden = !tactile.matches; };
  tactile.addEventListener?.('change', majCamera);
  majCamera();

  btnExemple.addEventListener('click', () => {
    etat.fond = null;
    btnExemple.hidden = true;
    mettreEnPage();
    positionInitiale();
    majLibelle();
    dessiner();
  });

  racine.querySelector('[data-vcm-recentrer]').addEventListener('click', () => {
    positionInitiale();
    dessiner();
  });

  racine.querySelector('[data-vcm-enregistrer]').addEventListener('click', () => {
    dessiner({ interface: false });
    canvas.toBlob((blob) => {
      dessiner();
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vintape-${etat.piece ? numeroAffiche(etat.piece) : 'apercu'}-chez-moi.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });

  // --- Démarrage ------------------------------------------------------------
  new ResizeObserver(() => mettreEnPage()).observe(scene);
  surChoix((piece) => afficherPiece(piece));
  mettreEnPage();
  positionInitiale();
  const depart = pieceCourante() || pieces.find(estDisponible) || pieces[0];
  afficherPiece(depart).then(() => { positionInitiale(); dessiner(); });
  if (document.fonts?.ready) document.fonts.ready.then(() => dessiner());
}
