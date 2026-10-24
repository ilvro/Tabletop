import './ui/styles.css';

const presentationId = new URLSearchParams(location.search).get('presentation');
const launch = presentationId
  ? import('./app/presentation-window.js').then(({ startPresentation }) => startPresentation(document.getElementById('app'), presentationId))
  : import('./app/application.js').then(({ startApplication }) => startApplication());

launch.catch((error) => {
  console.error(error);
  const panel = document.createElement('div');
  panel.className = 'fatal-error';
  const title = document.createElement('h1'); title.textContent = 'Não foi possível abrir o Tabletop';
  const text = document.createElement('p'); text.textContent = error.message;
  const button = document.createElement('button'); button.textContent = 'Tentar novamente'; button.onclick = () => location.reload();
  panel.append(title, text, button); document.getElementById('app').replaceChildren(panel);
});
