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
  try {
    localStorage.setItem('theme', name);
  } catch {
    // Storage can be blocked: the theme then still applies, until the next page load.
  }
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

// The terminal module reads this; it runs after this blocking script, so the page never paints the wrong theme.
globalThis.themes = { names: THEMES, current: currentTheme, save: saveTheme };
