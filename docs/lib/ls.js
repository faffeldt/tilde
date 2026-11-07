import { fileUrl, isDir, isFile, listDir, resolve } from './fs.js';

export const LS_FLAGS = 'alrth';
const DIR_SIZE = 4096;
const KIBI = 1024;

async function stat(path, fetchFile) {
  if (isDir(path)) {
    const children = await Promise.all(listDir(path).map((name) => stat(resolve(path, name), fetchFile)));
    return { size: DIR_SIZE, time: Math.max(...children.map(({ time }) => time)) };
  }
  const response = await fetchFile(fileUrl(path));
  if (!response.ok) throw new Error(response.statusText);
  // blob, not Content-Length: compressed responses report their compressed size.
  const { size } = await response.blob();
  return { size, time: Date.parse(response.headers.get('Last-Modified')) || 0 };
}

export function humanSize(size) {
  if (size < KIBI) return `${size}`;
  const exponent = Math.floor(Math.log2(size) / Math.log2(KIBI));
  return `${(size / KIBI ** exponent).toFixed(1)}${' KMG'[exponent]}`;
}

export function longEntry(name, time, size) {
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

const FLAG = /^-./u;
const isFlag = (arg) => FLAG.test(arg);

function entriesOf(path, showAll) {
  if (isFile(path)) return [{ name: path.split('/').pop(), path }];
  if (!isDir(path)) return null;
  const names = [...(showAll ? ['./', '../'] : []), ...listDir(path)];
  return names.map((name) => ({ name, path: resolve(path, name) }));
}

export async function ls(args, { cwd, fetchFile }) {
  const flags = args
    .filter(isFlag)
    .map((option) => option.slice(1))
    .join('');
  const invalid = [...flags].find((flag) => !LS_FLAGS.includes(flag));
  if (invalid) return `ls: invalid option -- '${invalid}'`;

  const [arg = '.'] = args.filter((candidate) => !isFlag(candidate));
  let entries = entriesOf(resolve(cwd, arg), flags.includes('a'));
  if (!entries) return `ls: cannot access '${arg}': No such file or directory`;

  if (flags.includes('l') || flags.includes('t')) {
    try {
      entries = await Promise.all(
        entries.map(async (entry) => ({ ...entry, stats: await stat(entry.path, fetchFile) })),
      );
    } catch {
      return `ls: ${arg}: Input/output error`;
    }
  }
  if (flags.includes('t')) entries.sort((a, b) => b.stats.time - a.stats.time);
  if (flags.includes('r')) entries.reverse();

  if (!flags.includes('l')) return entries.map(({ name }) => name).join('  ');
  const sizes = entries.map(({ stats }) => (flags.includes('h') ? humanSize(stats.size) : `${stats.size}`));
  const width = Math.max(...sizes.map((size) => size.length));
  return entries.map(({ name, stats }, index) => longEntry(name, stats.time, sizes[index].padStart(width)));
}
