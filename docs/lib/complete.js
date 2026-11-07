import { listDir, resolve } from './fs.js';

const DIR_AND_NAME = /^(?<dir>.*\/)?(?<name>.*)$/u;
const LAST_WORD = /\S*$/u;
const WHITESPACE = /\s+/u;

export function completePath(word, { cwd }) {
  const { dir = '', name } = word.match(DIR_AND_NAME).groups;
  if (word === '~' || name === '.' || name === '..') return [`${word}/`];
  return listDir(resolve(cwd, dir)).map((entry) => dir + entry);
}

export const completeDir = (word, shell) => completePath(word, shell).filter((candidate) => candidate.endsWith('/'));

export function completeFlags(flags, word) {
  const used = word.slice(1);
  if ([...used].some((flag) => !flags.includes(flag))) return [];
  return [...flags].filter((flag) => !used.includes(flag)).map((flag) => word + flag);
}

export function commonPrefix(words) {
  return words.reduce((prefix, word) => {
    let length = 0;
    while (length < prefix.length && prefix[length] === word[length]) length += 1;
    return prefix.slice(0, length);
  });
}

function candidates(commands, before, word, shell) {
  if (before.trim() === word) return [...commands.keys()];
  const [name] = before.trim().split(WHITESPACE);
  const command = commands.get(name);
  if (command?.flags && word.startsWith('-')) return completeFlags(command.flags, word);
  return command?.complete?.(word, shell) ?? [];
}

// `before` is the input up to the caret; its last word is replaced, or the ambiguous names are listed.
export function complete(commands, before, shell) {
  const [word] = before.match(LAST_WORD);
  const matches = candidates(commands, before, word, shell)
    .filter((candidate) => candidate.startsWith(word))
    .sort();
  if (matches.length === 0) return null;

  const prefix = commonPrefix(matches);
  const isDone = matches.length === 1 && !prefix.endsWith('/');
  if (prefix !== word || isDone) return { word, replacement: isDone ? `${prefix} ` : prefix };
  return { word, list: matches.map((match) => match.slice(match.lastIndexOf('/', match.length - 2) + 1)) };
}
