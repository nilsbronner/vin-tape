// Rend les visuels « packshot » (fond transparent) à partir des modèles 3D.
// Usage : lancer un serveur à la racine (python3 -m http.server 8123), puis
//   node outils/packshots.js
// Prérequis : Playwright + Chromium, Python 3 avec Pillow (recadrage et WebP).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const { pieces } = JSON.parse(fs.readFileSync(path.join(racine, 'pieces.json')));
const base = process.env.BASE || 'http://localhost:8123';

(async () => {
  const navigateur = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await navigateur.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(`${base}/404.html`);
  await page.addScriptTag({ type: 'module', url: '/assets/vendor/model-viewer-4.4.0.min.js' });
  for (const piece of pieces.filter((p) => p.modele3d)) {
    const cle = path.basename(piece.modele3d).replace(/-v\d+\.glb$/, '');
    await page.evaluate((src) => {
      document.body.innerHTML = `<model-viewer id="mv" src="${src}" camera-orbit="-28deg 76deg 100%" field-of-view="22deg" shadow-intensity="1.1" shadow-softness="0.9" exposure="1.05" environment-image="neutral" interaction-prompt="none" style="width:1400px;height:1000px"></model-viewer>`;
      document.body.style.background = 'transparent';
    }, piece.modele3d);
    await page.waitForFunction(() => document.getElementById('mv').loaded, null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    const png = path.join(require('os').tmpdir(), `packshot-${cle}.png`);
    await page.screenshot({ path: png, omitBackground: true });
    const sortie = path.join(racine, 'assets', 'pieces', `packshot-${cle}-v1.webp`);
    execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(png)}).convert('RGBA')
bb = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox(); p = 24
im = im.crop((max(0,bb[0]-p), max(0,bb[1]-p), min(im.width,bb[2]+p), min(im.height,bb[3]+p)))
im.thumbnail((1200, 1200)); im.save(${JSON.stringify(sortie)}, 'WEBP', quality=86, method=6)`]);
    console.log(path.relative(racine, sortie));
  }
  await navigateur.close();
})();
