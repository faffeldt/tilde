import { complete, completeDir, completePath } from './complete.js';
import { displayPath, fileUrl, HOME, isDir, isFile, resolve } from './fs.js';
import { LS_FLAGS, ls } from './ls.js';

const REPOSITORY = 'https://github.com/faffeldt/tilde';
const GITHUB = 'https://github.com/faffeldt';
const NAME_WIDTH = 8;
const WHITESPACE = /\s+/u;

async function readFile(shell, arg) {
  const path = resolve(shell.cwd, arg);
  if (isDir(path)) return `cat: ${arg}: Is a directory`;
  if (!isFile(path)) return `cat: ${arg}: No such file or directory`;
  try {
    const response = await shell.fetchFile(fileUrl(path));
    if (response.ok) return await response.text();
  } catch {
    // A failed fetch reports like a not OK response.
  }
  return `cat: ${arg}: Input/output error`;
}

function setTheme({ themes, random }, arg) {
  if (arg === undefined) return themes.names.map((name) => `${name === themes.current() ? '*' : ' '} ${name}`);
  if (arg === 'random') {
    const others = themes.names.filter((name) => name !== themes.current());
    const picked = others[Math.floor(random() * others.length)];
    themes.save(picked);
    return picked;
  }
  if (!themes.names.includes(arg)) return `theme: ${arg}: No such theme`;
  themes.save(arg);
}

// A command returns a line, a list of lines, or nothing; a line is text or { link: url }.
// `shell` is the state of one terminal: its cwd plus the browser effects passed to createShell.
const COMMANDS = new Map([
  [
    'help',
    {
      description: 'list all commands',
      run: () => [
        ...[...COMMANDS].map(([name, { description }]) => `${name.padEnd(NAME_WIDTH)}${description}`),
        'source code:',
        { link: REPOSITORY },
      ],
    },
  ],
  [
    'whoami',
    {
      description: 'describe Felix; -v or --verbose opens the full profile',
      complete: () => ['-v', '--verbose'],
      run(args, shell) {
        if (args.length === 1 && (args[0] === '-v' || args[0] === '--verbose')) {
          shell.navigate(fileUrl(`${HOME}/about.html`));
          return;
        }
        if (args.length > 0) return `whoami: unrecognized argument: ${args[0]}`;
        return [
          'felix',
          'I love to build. I focus on building complex things as simple as possible.',
          'Software engineer working across systems programming and backend/infra tooling.',
          'Use whoami -v to read more.',
          { link: GITHUB },
        ];
      },
    },
  ],
  ['pwd', { description: 'print the current directory', run: (_args, shell) => shell.cwd }],
  [
    'ls',
    {
      description: `list a directory or file, flags: ${[...LS_FLAGS].map((flag) => `-${flag}`).join(' ')}`,
      flags: LS_FLAGS,
      complete: completePath,
      run: ls,
    },
  ],
  [
    'cd',
    {
      description: 'change directory, home by default',
      complete: completeDir,
      run([arg = '~'], shell) {
        const path = resolve(shell.cwd, arg);
        if (isFile(path)) return `cd: ${arg}: Not a directory`;
        if (!isDir(path)) return `cd: ${arg}: No such file or directory`;
        shell.cwd = path;
      },
    },
  ],
  [
    'cat',
    {
      description: 'print files',
      complete: completePath,
      run(args, shell) {
        if (args.length === 0) return 'cat: missing file operand';
        // Promise.all starts every read now: a later cd must not change what these paths resolve to.
        return Promise.all(args.map((arg) => readFile(shell, arg)));
      },
    },
  ],
  [
    'open',
    {
      description: 'open a file in the browser',
      complete: completePath,
      run([arg], shell) {
        if (arg === undefined) return 'open: missing file operand';
        const path = resolve(shell.cwd, arg);
        if (isDir(path)) return `open: ${arg}: Is a directory`;
        if (!isFile(path)) return `open: ${arg}: No such file or directory`;
        shell.navigate(fileUrl(path));
      },
    },
  ],
  [
    'theme',
    {
      description: 'list themes, or switch to a named or random one',
      complete: (_word, shell) => [...shell.themes.names, 'random'],
      run: ([arg], shell) => setTheme(shell, arg),
    },
  ],
  ['clear', { description: 'empty the output', run: (_args, shell) => shell.clear() }],
]);

export function createShell({ fetchFile, navigate, clear, themes, random = Math.random }) {
  const shell = { cwd: HOME, fetchFile, navigate, clear, themes, random };
  return {
    prompt: () => `felix@tilde:${displayPath(shell.cwd)}$ `,
    async run(text) {
      const [name, ...args] = text.trim().split(WHITESPACE);
      if (!name) return [];
      const command = COMMANDS.get(name);
      const result = command ? await command.run(args, shell) : `bash: ${name}: command not found`;
      return [result ?? []].flat();
    },
    complete: (before) => complete(COMMANDS, before, shell),
  };
}
