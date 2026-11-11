// Compte à rebours jusqu'au lancement des commandes définitives (contenu.json → lancement).
import { creer, ecrire } from './contenu.js';

const deux = (n) => String(n).padStart(2, '0');

export function initRebours({ contenu }) {
  const bloc = document.querySelector('[data-rebours]');
  const compteur = bloc?.querySelector('[data-rebours-compteur]');
  const l = contenu.lancement;
  const cible = Date.parse(l?.date || '');
  if (!bloc || !compteur || Number.isNaN(cible)) { bloc?.remove(); return; }

  // Cases jours / heures / minutes / secondes
  const cases = {};
  compteur.textContent = '';
  for (const cle of ['jours', 'heures', 'minutes', 'secondes']) {
    const c = creer('span', 'rebours__case');
    const v = creer('span', 'rebours__valeur', '00');
    c.append(v, creer('span', 'rebours__unite', l.unites[cle]));
    compteur.append(c);
    cases[cle] = v;
  }

  let minuteur = null;
  const maj = () => {
    const reste = cible - Date.now();
    if (reste <= 0) {
      clearInterval(minuteur);
      compteur.remove();
      bloc.classList.add('rebours--ouvert');
      ecrire(bloc.querySelector('.rebours__titre'), l.ouvert);
      return;
    }
    const s = Math.floor(reste / 1000);
    const valeurs = { jours: Math.floor(s / 86400), heures: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, secondes: s % 60 };
    for (const [k, v] of Object.entries(valeurs)) cases[k].textContent = k === 'jours' ? String(v) : deux(v);
    // Version lisible pour les lecteurs d'écran (sans annonce à chaque seconde)
    compteur.setAttribute('aria-label', `${valeurs.jours} jours, ${valeurs.heures} heures et ${valeurs.minutes} minutes avant le lancement`);
  };
  maj();
  minuteur = setInterval(maj, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) maj(); });
}
