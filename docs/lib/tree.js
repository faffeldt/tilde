import { isDir, listDir, resolve } from './fs.js';

const LEVEL = /^[1-9]\d*$/u;
const TRAILING_SLASH = /\/$/u;

function branches(path, prefix, depth, counts) {
  if (depth === 0) return [];
  const names = listDir(path);
  return names.flatMap((name, index) => {
    const isLast = index === names.length - 1;
    const isDirectory = name.endsWith('/');
    counts[isDirectory ? 'dirs' : 'files'] += 1;
    const line = `${prefix}${isLast ? '└── ' : '├── '}${name.replace(TRAILING_SLASH, '')}`;
    if (!isDirectory) return [line];
    return [line, ...branches(resolve(path, name), `${prefix}${isLast ? '    ' : '│   '}`, depth - 1, counts)];
  });
}

export function tree(args, { cwd }) {
  let depth = Number.POSITIVE_INFINITY;
  const operands = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '-L') {
      index += 1;
      if (args[index] === undefined) return 'tree: Missing argument to -L option.';
      if (!LEVEL.test(args[index])) return 'tree: Invalid level, must be greater than 0.';
      depth = Number(args[index]);
    } else if (arg.startsWith('-')) {
      return `tree: Invalid argument -\`${arg.slice(1)}'.`;
    } else {
      operands.push(arg);
    }
  }

  const [arg = '.'] = operands;
  const path = resolve(cwd, arg);
  if (!isDir(path)) return [`${arg}  [error opening dir]`, '', '0 directories, 0 files'];

  const counts = { dirs: 0, files: 0 };
  const lines = branches(path, '', depth, counts);
  const { dirs, files } = counts;
  return [arg, ...lines, '', `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`];
}
