import { describe, expect, test } from 'vitest';
import { commonPrefix, complete, completeFlags } from '../../docs/lib/complete.js';
import { createShell } from '../../docs/lib/shell.js';
import { fakeFetch } from './fake-fetch.js';

const THEMES = ['tilde', 'catppuccin-mocha', 'catppuccin-latte', 'dracula'];
const shell = createShell({
  fetchFile: fakeFetch(),
  navigate: () => undefined,
  clear: () => undefined,
  themes: { names: THEMES, current: () => 'tilde', save: () => undefined },
});

describe('completing the shell', () => {
  test.each([
    ['cl', 'clear '],
    ['  wh', 'whoami '],
    ['whoami --v', '--verbose '],
    ['cat bl', 'blog/'],
    ['cat blog/e', 'blog/example-post.html '],
    ['cat ~/st', '~/style.css '],
    ['cat /ho', '/home/'],
    ['ls ~', '~/'],
    ['ls ..', '../'],
    ['cd b', 'blog/'],
    ['ls -lart', '-larth '],
    ['ls -l sty', 'style.css '],
    ['cat blog/index.html ter', 'terminal.js '],
    ['theme dr', 'dracula '],
    ['theme ra', 'random '],
  ])('%j becomes %j', (before, replacement) => {
    expect(shell.complete(before)).toMatchObject({ replacement });
  });

  test.each([
    ['', 'cat cd clear help ls open pwd theme tree whoami'],
    ['c', 'cat cd clear'],
    ['cd ', 'blog/ lib/'],
    ['ls -', '-a -h -l -r -t'],
    ['ls -l', '-la -lh -lr -lt'],
    ['ls ', 'CNAME about.html blog/ index.html lib/ quit.js style.css terminal.js theme.js'],
    ['ls blog/', 'example-post.html index.html'],
    ['ls lib/', 'complete.js fs.js history.js ls.js shell.js tree.js'],
    ['theme catppuccin-', 'catppuccin-latte catppuccin-mocha'],
  ])('%j lists %s', (before, names) => {
    expect(shell.complete(before)).toEqual({ word: before.match(/\S*$/u)[0], list: names.split(' ') });
  });

  test.each(['xyz', 'cat xyz', 'cat cl', 'clear ', 'cat -', 'ls -x', 'ls -larth'])('%j has no match', (before) => {
    expect(shell.complete(before)).toBeNull();
  });
});

test('extends to the common prefix before listing', () => {
  const commands = new Map([['demo', { complete: () => ['alpha-one', 'alpha-two'] }]]);
  expect(complete(commands, 'demo a')).toEqual({ word: 'a', replacement: 'alpha-' });
  expect(complete(commands, 'demo alpha-')).toEqual({ word: 'alpha-', list: ['alpha-one', 'alpha-two'] });
});

test('completeFlags offers each unused flag once and rejects unknown ones', () => {
  expect(completeFlags('alr', '-')).toEqual(['-a', '-l', '-r']);
  expect(completeFlags('alr', '-ra')).toEqual(['-ral']);
  expect(completeFlags('alr', '-x')).toEqual([]);
});

test('commonPrefix', () => {
  expect(commonPrefix(['blog/', 'blog/index.html'])).toBe('blog/');
  expect(commonPrefix(['abc', 'abd', 'x'])).toBe('');
  expect(commonPrefix(['only'])).toBe('only');
});
