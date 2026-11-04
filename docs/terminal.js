const HOME = '/home/felix';
const FILES = [
  'CNAME',
  'blog/example-post.html',
  'blog/index.html',
  'index.html',
  'style.css',
  'terminal.js',
];
const PATHS = FILES.map((file) => `${HOME}/${file}`);

const output = document.getElementById('output');
const prompt = document.getElementById('prompt');
const input = document.getElementById('command');

const history = [];
let historyIndex = 0;
let cwd = HOME;

function resolve(path) {
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

function listDir(path) {
  const prefix = path === '/' ? '/' : `${path}/`;
  const names = PATHS.filter((file) => file.startsWith(prefix)).map((file) => {
    const [name, ...rest] = file.slice(prefix.length).split('/');
    return rest.length ? `${name}/` : name;
  });
  return [...new Set(names)].sort();
}

const isFile = (path) => PATHS.includes(path);
const isDir = (path) => listDir(path).length > 0;
const fileUrl = (path) => path.slice(HOME.length + 1);

function line(...children) {
  const node = document.createElement('div');
  node.append(...children);
  return node;
}

function link(url) {
  const node = document.createElement('a');
  node.href = url;
  node.textContent = url;
  return node;
}

function setCwd(path) {
  cwd = path;
  const shown = cwd.replace(
    HOME,
    '~',
  );
  prompt.textContent = `felix@tilde:${shown}$ `;
}

async function readFile(arg) {
  const path = resolve(arg);
  if (isDir(path)) return `cat: ${arg}: Is a directory`;
  if (!isFile(path)) return `cat: ${arg}: No such file or directory`;
  try {
    const response = await fetch(fileUrl(path));
    if (response.ok) return await response.text();
  } catch {}
  return `cat: ${arg}: Input/output error`;
}

const COMMANDS = new Map([
  ['help', {
    description: 'list all commands',
    run: () => [
      ...[...COMMANDS].map(([name, { description }]) => `${name.padEnd(8)}${description}`),
      'source code:',
      link('https://github.com/faffeldt/tilde'),
    ],
  }],
  ['whoami', {
    description: 'describe Felix',
    run: () => [
      'felix',
      'I love to build. I focus on building complex things as simple as possible.',
      link('https://github.com/faffeldt'),
    ],
  }],
  ['pwd', { description: 'print the current directory', run: () => cwd }],
  ['ls', {
    description: 'list a directory or file',
    run([arg = '.']) {
      const path = resolve(arg);
      if (isFile(path)) return path.split('/').pop();
      if (isDir(path)) return listDir(path).join('  ');
      return `ls: cannot access '${arg}': No such file or directory`;
    },
  }],
  ['cd', {
    description: 'change directory, home by default',
    run([arg = '~']) {
      const path = resolve(arg);
      if (isFile(path)) return `cd: ${arg}: Not a directory`;
      if (!isDir(path)) return `cd: ${arg}: No such file or directory`;
      setCwd(path);
    },
  }],
  ['cat', {
    description: 'print files',
    run(args) {
      if (!args.length) return 'cat: missing file operand';
      // Promise.all starts every read now: a later cd must not change what these paths resolve to.
      return Promise.all(args.map(readFile));
    },
  }],
  ['open', {
    description: 'open a file in the browser',
    run([arg]) {
      if (arg === undefined) return 'open: missing file operand';
      const path = resolve(arg);
      if (isDir(path)) return `open: ${arg}: Is a directory`;
      if (!isFile(path)) return `open: ${arg}: No such file or directory`;
      location.href = fileUrl(path);
    },
  }],
  ['clear', { description: 'empty the output', run: () => output.replaceChildren() }],
]);

const keepInputInView = () => input.scrollIntoView({ block: 'nearest' });

async function execute(text) {
  const echoedPrompt = document.createElement('span');
  echoedPrompt.className = 'prompt';
  echoedPrompt.textContent = prompt.textContent;
  const entry = line(line(
    echoedPrompt,
    text,
  ));
  output.append(entry);
  keepInputInView();

  const [name, ...args] = text.trim().split(/\s+/);
  if (!name) return;
  const command = COMMANDS.get(name);
  const result = command ? await command.run(args) : `bash: ${name}: command not found`;
  entry.append(...[result ?? []].flat().map((item) => line(item)));
  keepInputInView();
}

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const text = input.value;
    input.value = '';
    if (text.trim()) history.push(text);
    historyIndex = history.length;
    execute(text);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const step = event.key === 'ArrowUp' ? -1 : 1;
    historyIndex = Math.min(
      Math.max(
        historyIndex + step,
        0,
      ),
      history.length,
    );
    input.value = history[historyIndex] ?? '';
  }
});

document.addEventListener('click', (event) => {
  // preventScroll: focusing must not move someone reading further up, or break their double-click selection.
  if (!event.target.closest('a') && getSelection().isCollapsed) input.focus({ preventScroll: true });
});

document.getElementById('terminal').hidden = false;
setCwd(HOME);
output.append(...[
  '$ ssh felix@tilde.failx.dev',
  "Welcome to tilde, Felix's home on the web.",
  `Last login: ${new Date().toDateString()}`,
  'Type help to list the commands, or read the source of this page with cat terminal.js',
].map((text) => line(text)));
input.focus();
