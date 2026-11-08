// Dessin SVG de la cassette-enceinte, piloté par variables.
//
// Les couleurs passent par des propriétés CSS personnalisées :
//   --facade, --arriere, --etiquette, --etiquette-texte
// et l'état « enceinte » par --hp (0 = cassette, 1 = haut-parleurs visibles).
// Le même dessin sert au hero, à l'idée, au catalogue, au module
// « voir chez moi » et servira au futur configurateur.

export const LARGEUR = 400;
export const HAUTEUR = 256;

// Règles de style du dessin : injectées une fois dans la page et recopiées
// dans les SVG autonomes (rendus en image pour le canvas).
const STYLE_K7 = `
.k7-facade{fill:var(--facade)}
.k7-arriere{fill:var(--arriere)}
.k7-etiquette{fill:var(--etiquette)}
.k7-facade,.k7-arriere,.k7-etiquette,.k7-etq-texte{transition:fill .9s ease}
.k7-etq-texte{fill:var(--etiquette-texte,#1d1d1c)}
.k7-etq-ligne{stroke:var(--etiquette-texte,#1d1d1c);opacity:.28}
.k7-rotor{transform-box:fill-box;transform-origin:center}
.k7--tourne .k7-rotor{animation:k7-tourne 2.6s linear infinite}
.k7--tourne .k7-bobine-d .k7-rotor{animation-duration:1.9s}
@keyframes k7-tourne{to{transform:rotate(-360deg)}}
.k7-bande{opacity:calc(1 - var(--hp,0))}
.k7-hp{opacity:var(--hp,0);transform-box:fill-box;transform-origin:center;transform:scale(calc(.55 + .45 * var(--hp,0)))}
.k7-event{opacity:var(--hp,0)}
.k7-annot{opacity:var(--annot,0);transition:opacity .4s ease}
.k7-txt{font-family:"DM Mono",ui-monospace,Menlo,monospace;font-weight:500}
.k7-titre{font-family:"Big Shoulders Display","Arial Narrow",sans-serif;font-weight:800}
`;

let styleInjecte = false;
export function injecterStyle() {
  if (styleInjecte || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = STYLE_K7;
  document.head.append(style);
  styleInjecte = true;
}

// Texte sombre ou clair selon la luminosité de l'étiquette.
export function texteSur(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#1d1d1c';
  const n = parseInt(m[1], 16);
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal(n >> 16) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return l > 0.28 ? '#1d1d1c' : '#f3efe6';
}

export function variablesCouleurs({ facade, arriere, etiquette }) {
  return {
    '--facade': facade,
    '--arriere': arriere,
    '--etiquette': etiquette,
    '--etiquette-texte': texteSur(etiquette),
  };
}

export function appliquerCouleurs(element, couleurs) {
  for (const [cle, valeur] of Object.entries(variablesCouleurs(couleurs))) {
    element.style.setProperty(cle, valeur);
  }
}

function bobine(cx, cy, rayonBande, cote) {
  const dents = Array.from({ length: 6 }, (_, i) => {
    const a = i * 60;
    return `<rect x="${cx - 1.6}" y="${cy - 9}" width="3.2" height="4.5" rx="1" transform="rotate(${a} ${cx} ${cy})"/>`;
  }).join('');
  return `
  <g class="k7-bobine-${cote}">
    <circle class="k7-bande" cx="${cx}" cy="${cy}" r="${rayonBande}" fill="#4a3427"/>
    <circle class="k7-bande" cx="${cx}" cy="${cy}" r="${rayonBande - 3}" fill="none" stroke="#5c4232" stroke-width="1"/>
    <g class="k7-rotor">
      <circle cx="${cx}" cy="${cy}" r="15" fill="#ebe6da"/>
      <circle cx="${cx}" cy="${cy}" r="9.5" fill="#0d0d0c"/>
      <g fill="#ebe6da">${dents}</g>
    </g>
    <g class="k7-hp">
      <circle cx="${cx}" cy="${cy}" r="30" fill="#151514" stroke="#34332f" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="24" fill="#232220"/>
      <circle cx="${cx}" cy="${cy}" r="18" fill="#1a1a18" stroke="#3a3935" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="8.5" fill="#3b3a36"/>
      <ellipse cx="${cx - 3}" cy="${cy - 3.5}" rx="3.5" ry="2.2" fill="#fff" opacity=".18"/>
    </g>
  </g>`;
}

function marqueur(x, y, n) {
  return `<g class="k7-annot"><circle cx="${x}" cy="${y}" r="11" fill="#f3c43b"/><text class="k7-txt" x="${x}" y="${y + 4.5}" font-size="13" text-anchor="middle" fill="#121211">${n}</text></g>`;
}

/**
 * Renvoie le code SVG d'une cassette.
 * @param {object} o
 * @param {number|string} [o.numero]   numéro affiché sur l'étiquette (« 07 »)
 * @param {string} [o.format]          « C60 » ou « C90 »
 * @param {string} [o.label]           texte alternatif ; absent = décoratif
 * @param {boolean} [o.annotations]    marqueurs 1-2-3 de la section « l'idée »
 * @param {object} [o.couleurs]        { facade, arriere, etiquette } pour un SVG autonome
 * @param {number} [o.largeur]         largeur en px d'un SVG autonome
 * @param {string} [o.classe]
 */
export function svgCassette({
  numero = '', format = '', label = '', annotations = false, couleurs = null, largeur = null, classe = '',
} = {}) {
  const autonome = Boolean(couleurs);
  const vars = autonome
    ? Object.entries(variablesCouleurs(couleurs)).map(([k, v]) => `${k}:${v}`).join(';') + ';--hp:0'
    : '';
  const attributsTaille = largeur ? ` width="${largeur}" height="${Math.round((largeur * HAUTEUR) / LARGEUR)}"` : '';
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  const numeroTexte = numero !== '' ? `N° ${numero}/24` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}"${attributsTaille} class="k7 ${classe}" ${a11y}${autonome ? ` style="${vars}"` : ''}>
  ${autonome ? `<style>${STYLE_K7}</style>` : ''}
  <rect class="k7-arriere" x="8" y="10" width="392" height="246" rx="17"/>
  <rect class="k7-facade" x="0" y="0" width="392" height="246" rx="17"/>
  <rect x=".75" y=".75" width="390.5" height="244.5" rx="16.5" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>
  <g fill="#000" fill-opacity=".28">
    <circle cx="15" cy="15" r="4.5"/><circle cx="377" cy="15" r="4.5"/>
    <circle cx="15" cy="231" r="4.5"/><circle cx="377" cy="231" r="4.5"/>
  </g>
  <rect class="k7-etiquette" x="24" y="18" width="344" height="146" rx="8"/>
  <text class="k7-etq-texte k7-titre" x="40" y="47" font-size="22" letter-spacing="1">VIN’TAPE</text>
  <text class="k7-etq-texte k7-txt k7-numero" x="352" y="45" font-size="13" text-anchor="end" letter-spacing="1">${numeroTexte}</text>
  <line class="k7-etq-ligne" x1="40" y1="56" x2="352" y2="56" stroke-width="1.2"/>
  <text class="k7-etq-texte k7-titre" x="40" y="152" font-size="26">A</text>
  <text class="k7-etq-texte k7-txt k7-format" x="352" y="151" font-size="13" text-anchor="end" letter-spacing="1">${format}</text>
  <rect x="88" y="66" width="216" height="64" rx="32" fill="#0d0d0c"/>
  <rect x="180" y="89" width="32" height="18" rx="3" fill="#000" stroke="#ebe6da" stroke-opacity=".22"/>
  <g class="k7-event">
    <rect x="178" y="86" width="36" height="24" rx="12" fill="#050505" stroke="#3a3935" stroke-width="2"/>
    <rect x="184" y="92" width="24" height="12" rx="6" fill="#000"/>
  </g>
  ${bobine(140, 98, 29, 'g')}
  ${bobine(252, 98, 21, 'd')}
  <path d="M110 246 L127 194 H265 L282 246 Z" fill="#000" fill-opacity=".16" stroke="#fff" stroke-opacity=".1"/>
  <g fill="#0d0d0c">
    <circle cx="150" cy="226" r="5.5"/><circle cx="242" cy="226" r="5.5"/>
    <rect x="171" y="216" width="9" height="9" rx="1.5"/><rect x="212" y="216" width="9" height="9" rx="1.5"/>
  </g>
  <circle cx="196" cy="233" r="4" fill="#000" fill-opacity=".3"/>
  ${annotations ? marqueur(140, 176, 1) + marqueur(318, 98, 2) + marqueur(196, 176, 3) : ''}
</svg>`;
}

// Met à jour le numéro et le format d'un SVG déjà dans la page.
export function majEtiquette(svg, { numero, format }) {
  const n = svg.querySelector('.k7-numero');
  const f = svg.querySelector('.k7-format');
  if (n) n.textContent = numero !== '' ? `N° ${numero}/24` : '';
  if (f) f.textContent = format || '';
}

// Image (pour canvas) d'une cassette aux couleurs données.
export function imageCassette({ couleurs, numero, format, largeur = 800 }) {
  const code = svgCassette({ couleurs, numero, format, largeur });
  const url = URL.createObjectURL(new Blob([code], { type: 'image/svg+xml' }));
  return new Promise((resoudre, rejeter) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { resoudre(img); URL.revokeObjectURL(url); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rejeter(e); };
    img.src = url;
  });
}
