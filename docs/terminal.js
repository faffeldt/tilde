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

const terminal = document.getElementById('terminal');
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

const isFile = (path) => PATHS.includes(path);
const dirPrefix = (path) => (path === '/' ? '/' : `${path}/`);
const isDir = (path) => PATHS.some((file) => file.startsWith(dirPrefix(path)));
const fileUrl = (path) => path.slice(HOME.length + 1);

function listDir(path) {
  const prefix = dirPrefix(path);
  const names = PATHS.filter((file) => file.startsWith(prefix)).map((file) => {
    const [name, ...rest] = file.slice(prefix.length).split('/');
    return rest.length ? `${name}/` : name;
  });
  return [...new Set(names)].sort();
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function show(out, node) {
  out.append(node);
  input.scrollIntoView({ block: 'nearest' });
}

const print = (out, text) => show(out, element('div', text));

function printLink(out, url) {
  const link = element('a', url);
  link.href = url;
  const line = element('div');
  line.append(link);
  show(out, line);
}

function setCwd(path) {
  cwd = path;
  const shown = cwd === HOME || cwd.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd;
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
    run(out) {
      for (const [name, { description }] of COMMANDS) print(out, `${name.padEnd(8)}${description}`);
      print(out, 'source code:');
      printLink(out, 'https://github.com/faffeldt/tilde');
    },
  }],
  ['whoami', {
    description: 'describe Felix',
    run(out) {
      print(out, 'felix');
      print(out, 'I love to build. I focus on building complex things as simple as possible.');
      printLink(out, 'https://github.com/faffeldt');
    },
  }],
  ['pwd', { description: 'print the current directory', run: (out) => print(out, cwd) }],
  ['ls', {
    description: 'list a directory or file',
    run(out, [arg = '.']) {
      const path = resolve(arg);
      if (isFile(path)) print(out, path.split('/').pop());
      else if (isDir(path)) print(out, listDir(path).join('  '));
      else print(out, `ls: cannot access '${arg}': No such file or directory`);
    },
  }],
  ['cd', {
    description: 'change directory, home by default',
    run(out, [arg = '~']) {
      const path = resolve(arg);
      if (isDir(path)) setCwd(path);
      else if (isFile(path)) print(out, `cd: ${arg}: Not a directory`);
      else print(out, `cd: ${arg}: No such file or directory`);
    },
  }],
  ['cat', {
    description: 'print files',
    async run(out, args) {
      if (!args.length) print(out, 'cat: missing file operand');
      // Promise.all starts every read now: a later cd must not change what these paths resolve to.
      for (const text of await Promise.all(args.map(readFile))) print(out, text);
    },
  }],
  ['open', {
    description: 'open a file in the browser',
    run(out, [arg]) {
      if (arg === undefined) return print(out, 'open: missing file operand');
      const path = resolve(arg);
      if (isFile(path)) location.href = fileUrl(path);
      else if (isDir(path)) print(out, `open: ${arg}: Is a directory`);
      else print(out, `open: ${arg}: No such file or directory`);
    },
  }],
  ['clear', { description: 'empty the output', run: () => output.replaceChildren() }],
]);

function execute(line) {
  const echoedPrompt = element('span', prompt.textContent);
  echoedPrompt.className = 'prompt';
  const echo = element('div');
  echo.append(echoedPrompt, element('span', line));
  const out = element('div');
  output.append(out);
  show(out, echo);

  const [name, ...args] = line.trim().split(/\s+/);
  if (!name) return;
  const command = COMMANDS.get(name);
  if (command) command.run(out, args);
  else print(out, `bash: ${name}: command not found`);
}

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const line = input.value;
    input.value = '';
    if (line.trim()) history.push(line);
    historyIndex = history.length;
    execute(line);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const step = event.key === 'ArrowUp' ? -1 : 1;
    historyIndex = Math.min(Math.max(historyIndex + step, 0), history.length);
    input.value = history[historyIndex] ?? '';
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('a') && getSelection().isCollapsed) input.focus();
});

terminal.hidden = false;
setCwd(HOME);
print(output, '$ ssh felix@tilde.failx.dev');
print(output, "Welcome to tilde, Felix's home on the web.");
print(output, `Last login: ${new Date().toDateString()}`);
print(output, 'Type help to list the commands, or read the source of this page with cat terminal.js');
input.focus();
