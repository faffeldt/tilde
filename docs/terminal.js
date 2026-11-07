const HOME = '/home/felix';
const FILES = [
  'CNAME',
  'about.html',
  'blog/example-post.html',
  'blog/index.html',
  'index.html',
  'quit.js',
  'style.css',
  'terminal.js',
  'theme.js',
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

async function stat(path) {
  if (isDir(path)) {
    const children = await Promise.all(listDir(path).map((name) => stat(resolve(`${path}/${name}`))));
    return { size: 4096, time: Math.max(...children.map(({ time }) => time)) };
  }
  const response = await fetch(fileUrl(path));
  if (!response.ok) throw new Error(response.statusText);
  // blob, not Content-Length: compressed responses report their compressed size.
  const { size } = await response.blob();
  return { size, time: Date.parse(response.headers.get('Last-Modified')) || 0 };
}

function humanSize(size) {
  if (size < 1024) return `${size}`;
  const exponent = Math.floor(Math.log2(size) / 10);
  return `${(size / 1024 ** exponent).toFixed(1)}${' KMG'[exponent]}`;
}

function longEntry(
  name,
  time,
  size,
) {
  const date = new Date(time);
  return [
    name.endsWith('/') ? 'drwxr-xr-x' : '-rw-r--r--',
    '1 felix felix',
    size,
    date.toDateString().slice(4, 10),
    date.toTimeString().slice(0, 5),
    name,
  ].join(' ');
}

const LS_FLAGS = 'alrth';

async function listFiles(args) {
  const flags = args.filter((arg) => /^-./.test(arg)).map((arg) => arg.slice(1)).join('');
  const invalid = [...flags].find((flag) => !LS_FLAGS.includes(flag));
  if (invalid) return `ls: invalid option -- '${invalid}'`;

  const [arg = '.'] = args.filter((arg) => !/^-./.test(arg));
  const path = resolve(arg);
  let entries;
  if (isFile(path)) {
    entries = [{ name: path.split('/').pop(), path }];
  } else if (isDir(path)) {
    const names = [...(flags.includes('a') ? ['./', '../'] : []), ...listDir(path)];
    entries = names.map((name) => ({ name, path: resolve(`${path}/${name}`) }));
  } else {
    return `ls: cannot access '${arg}': No such file or directory`;
  }

  if (flags.includes('l') || flags.includes('t')) {
    try {
      entries = await Promise.all(entries.map(async (entry) => ({ ...entry, stats: await stat(entry.path) })));
    } catch {
      return `ls: ${arg}: Input/output error`;
    }
  }
  if (flags.includes('t')) entries.sort((a, b) => b.stats.time - a.stats.time);
  if (flags.includes('r')) entries.reverse();

  if (!flags.includes('l')) return entries.map(({ name }) => name).join('  ');
  const sizes = entries.map(({ stats }) => (flags.includes('h') ? humanSize(stats.size) : `${stats.size}`));
  const width = Math.max(...sizes.map((size) => size.length));
  return entries.map(({ name, stats }, index) => longEntry(
    name,
    stats.time,
    sizes[index].padStart(width),
  ));
}

function completePath(word) {
  const [, dir = '', name] = word.match(/^(.*\/)?(.*)$/);
  if (word === '~' || name === '.' || name === '..') return [`${word}/`];
  return listDir(resolve(dir)).map((entry) => dir + entry);
}

const completeDir = (word) => completePath(word).filter((candidate) => candidate.endsWith('/'));

function completeFlags(
  flags,
  word,
) {
  const used = word.slice(1);
  if ([...used].some((flag) => !flags.includes(flag))) return [];
  return [...flags].filter((flag) => !used.includes(flag)).map((flag) => word + flag);
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
    description: 'describe Felix; -v or --verbose opens the full profile',
    complete: () => ['-v', '--verbose'],
    run(args) {
      if (args.length === 1 && (args[0] === '-v' || args[0] === '--verbose')) {
        location.href = fileUrl(`${HOME}/about.html`);
        return;
      }
      if (args.length) return `whoami: unrecognized argument: ${args[0]}`;
      return [
        'felix',
        'I love to build. I focus on building complex things as simple as possible.',
        'Software engineer working across systems programming and backend/infra tooling.',
        'Use whoami -v to read more.',
        link('https://github.com/faffeldt'),
      ];
    },
  }],
  ['pwd', { description: 'print the current directory', run: () => cwd }],
  ['ls', {
    description: `list a directory or file, flags: ${[...LS_FLAGS].map((flag) => `-${flag}`).join(' ')}`,
    flags: LS_FLAGS,
    complete: completePath,
    run: listFiles,
  }],
  ['cd', {
    description: 'change directory, home by default',
    complete: completeDir,
    run([arg = '~']) {
      const path = resolve(arg);
      if (isFile(path)) return `cd: ${arg}: Not a directory`;
      if (!isDir(path)) return `cd: ${arg}: No such file or directory`;
      setCwd(path);
    },
  }],
  ['cat', {
    description: 'print files',
    complete: completePath,
    run(args) {
      if (!args.length) return 'cat: missing file operand';
      // Promise.all starts every read now: a later cd must not change what these paths resolve to.
      return Promise.all(args.map(readFile));
    },
  }],
  ['open', {
    description: 'open a file in the browser',
    complete: completePath,
    run([arg]) {
      if (arg === undefined) return 'open: missing file operand';
      const path = resolve(arg);
      if (isDir(path)) return `open: ${arg}: Is a directory`;
      if (!isFile(path)) return `open: ${arg}: No such file or directory`;
      location.href = fileUrl(path);
    },
  }],
  ['theme', {
    description: 'list themes, or switch to a named or random one',
    complete: () => [...THEMES, 'random'],
    run([arg]) {
      if (arg === undefined) {
        return THEMES.map((name) => `${name === currentTheme() ? '*' : ' '} ${name}`);
      }
      if (arg === 'random') {
        const others = THEMES.filter((name) => name !== currentTheme());
        const picked = others[Math.floor(Math.random() * others.length)];
        saveTheme(picked);
        return picked;
      }
      if (!THEMES.includes(arg)) return `theme: ${arg}: No such theme`;
      saveTheme(arg);
    },
  }],
  ['clear', { description: 'empty the output', run: () => output.replaceChildren() }],
]);

const keepInputInView = () => input.scrollIntoView({ block: 'nearest' });

function echo(text) {
  const echoedPrompt = document.createElement('span');
  echoedPrompt.className = 'prompt';
  echoedPrompt.textContent = prompt.textContent;
  const entry = line(line(
    echoedPrompt,
    text,
  ));
  output.append(entry);
  keepInputInView();
  return entry;
}

async function execute(text) {
  const entry = echo(text);
  const [name, ...args] = text.trim().split(/\s+/);
  if (!name) return;
  const command = COMMANDS.get(name);
  const result = command ? await command.run(args) : `bash: ${name}: command not found`;
  entry.append(...[result ?? []].flat().map((item) => line(item)));
  keepInputInView();
}

function candidates(
  before,
  word,
) {
  if (before.trim() === word) return [...COMMANDS.keys()];
  const command = COMMANDS.get(before.trim().split(/\s+/)[0]);
  if (command?.flags && word.startsWith('-')) {
    return completeFlags(
      command.flags,
      word,
    );
  }
  return command?.complete?.(word) ?? [];
}

function commonPrefix(words) {
  return words.reduce((prefix, word) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === word[length]) length += 1;
    return prefix.slice(0, length);
  });
}

function completeInput() {
  const caret = input.selectionStart;
  const before = input.value.slice(0, caret);
  const word = before.match(/\S*$/)[0];
  const matches = candidates(
    before,
    word,
  ).filter((candidate) => candidate.startsWith(word)).sort();
  if (!matches.length) return;

  const prefix = commonPrefix(matches);
  const isDone = matches.length === 1 && !prefix.endsWith('/');
  if (prefix !== word || isDone) {
    input.setRangeText(
      isDone ? `${prefix} ` : prefix,
      caret - word.length,
      caret,
      'end',
    );
    return;
  }

  const entry = echo(input.value);
  const names = matches.map((match) => match.slice(match.lastIndexOf('/', match.length - 2) + 1));
  entry.append(line(names.join('  ')));
  keepInputInView();
}

input.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    // Shift+Tab stays native, so keyboard users can still leave the input.
    event.preventDefault();
    completeInput();
  } else if (event.key === 'Enter') {
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
