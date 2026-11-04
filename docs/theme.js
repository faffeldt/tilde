const THEMES = [
  'tilde',
  'github-light',
  'dracula',
  'nord',
  'gruvbox-dark',
  'gruvbox-light',
  'solarized-dark',
  'solarized-light',
  'catppuccin-mocha',
  'catppuccin-latte',
];

const currentTheme = () => document.documentElement.dataset.theme;

function applyTheme(name) {
  document.documentElement.dataset.theme = name;
}

function saveTheme(name) {
  applyTheme(name);
  // Storage can be blocked: the theme then still applies, until the next page load.
  try {
    localStorage.setItem('theme', name);
  } catch {}
}

function savedTheme() {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
}

const saved = savedTheme();
applyTheme(THEMES.includes(saved) ? saved : THEMES[0]);
