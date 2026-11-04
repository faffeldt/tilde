const header = document.querySelector('header');
const terminalUrl = header.querySelector('a').href;

let quitting = false;
addEventListener('pageshow', () => {
  quitting = false;
});

function quit() {
  // A second back during a slow load would overshoot the terminal, maybe off the site.
  if (quitting) return;
  quitting = true;
  // Going back restores the terminal from the browser's cache, with its scrollback and working directory.
  if (document.referrer === terminalUrl) history.back();
  else location.href = terminalUrl;
}

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'q' || event.key === 'Escape') quit();
});

const hint = document.createElement('small');
hint.textContent = 'press q or esc to quit';
header.append(hint);
