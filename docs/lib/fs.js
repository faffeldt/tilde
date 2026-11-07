export const HOME = '/home/felix';

export const FILES = [
  'CNAME',
  'about.html',
  'blog/example-post.html',
  'blog/index.html',
  'index.html',
  'lib/complete.js',
  'lib/fs.js',
  'lib/history.js',
  'lib/ls.js',
  'lib/shell.js',
  'quit.js',
  'style.css',
  'terminal.js',
  'theme.js',
];

const PATHS = FILES.map((file) => `${HOME}/${file}`);

export function resolve(cwd, path) {
  let absolute = `${cwd}/${path}`;
  if (path.startsWith('/')) absolute = path;
  if (path === '~' || path.startsWith('~/')) absolute = HOME + path.slice(1);

  const parts = [];
  for (const part of absolute.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function listDir(path) {
  const prefix = path === '/' ? '/' : `${path}/`;
  const names = PATHS.filter((file) => file.startsWith(prefix)).map((file) => {
    const [name, ...rest] = file.slice(prefix.length).split('/');
    return rest.length > 0 ? `${name}/` : name;
  });
  return [...new Set(names)].sort();
}

export const isFile = (path) => PATHS.includes(path);
export const isDir = (path) => listDir(path).length > 0;
export const fileUrl = (path) => path.slice(HOME.length + 1);
export const displayPath = (path) => path.replace(HOME, '~');
