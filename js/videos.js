// Vidéos Vimeo « au clic » : tant que le visiteur n'a pas cliqué, aucune
// connexion à Vimeo (pas de cookie, pas d'appel externe). Au clic, le lecteur
// est chargé avec dnt=1 (« ne pas suivre »).
import { creer, typo } from './contenu.js';

// https://vimeo.com/123 · https://vimeo.com/123/abc · https://player.vimeo.com/video/123?h=abc
export function idVimeo(url) {
  const m = /^https:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?(?:\?h=([0-9a-f]+))?/i.exec(url || '');
  return m ? { id: m[1], h: m[2] || m[3] || '' } : null;
}

function lecteur({ id, h }, titre) {
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({ dnt: '1', autoplay: '1', title: '0', byline: '0', portrait: '0' });
  if (h) params.set('h', h);
  iframe.src = `https://player.vimeo.com/video/${id}?${params}`;
  iframe.title = typo(titre);
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  return iframe;
}

export function initVideos({ contenu }) {
  const textes = contenu.videos;
  if (!textes) return;
  document.querySelectorAll('[data-video]').forEach((zone) => {
    const video = textes[zone.dataset.video];
    if (!video) return;
    zone.textContent = '';
    const figure = creer('figure', 'video__cadre');
    const vimeo = idVimeo(video.url);
    if (!vimeo) {
      figure.classList.add('video__cadre--vide');
      figure.append(creer('span', 'a-remplir', '[À REMPLIR]'), creer('span', null, `${textes.aVenir} : ${video.titre}`));
      zone.append(figure);
      return;
    }
    const bouton = creer('button', 'video__lancer');
    bouton.type = 'button';
    bouton.setAttribute('aria-label', typo(`${textes.lancer} : ${video.titre}`));
    if (video.vignette && /^\/(?!\/)/.test(video.vignette)) {
      const img = document.createElement('img');
      img.src = video.vignette;
      img.alt = video.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      bouton.append(img);
    }
    bouton.append(creer('span', 'video__play'), creer('span', 'video__titre', video.titre));
    bouton.addEventListener('click', () => {
      figure.textContent = '';
      figure.append(lecteur(vimeo, video.titre));
    }, { once: true });
    figure.append(bouton);
    zone.append(figure, creer('p', 'video__note', textes.avertissement));
  });
}
