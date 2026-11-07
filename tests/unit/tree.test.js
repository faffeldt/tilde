import { expect, test } from 'vitest';
import { tree } from '../../docs/lib/tree.js';

const HOME = '/home/felix';
const run = (command, cwd = HOME) => tree(command.split(' ').filter(Boolean), { cwd });

test('prints nested directories with a summary', () => {
  expect(run('blog')).toEqual(['blog', '├── example-post.html', '└── index.html', '', '0 directories, 2 files']);
  expect(run('/home')).toEqual(
    expect.arrayContaining(['└── felix', '    ├── CNAME', '    ├── blog', '    │   ├── example-post.html']),
  );
});

test('-L limits the depth', () => {
  expect(run('-L 1 /')).toEqual(['/', '└── home', '', '1 directory, 0 files']);
  expect(run('/ -L 2')).toEqual(['/', '└── home', '    └── felix', '', '2 directories, 0 files']);
});

test('defaults to the working directory', () => {
  expect(run('', `${HOME}/blog`)[0]).toBe('.');
});

test.each([
  ['-L', 'tree: Missing argument to -L option.'],
  ['-L 0', 'tree: Invalid level, must be greater than 0.'],
  ['-L x', 'tree: Invalid level, must be greater than 0.'],
  ['-x', "tree: Invalid argument -`x'."],
])('tree %s', (args, expected) => {
  expect(run(args)).toBe(expected);
});

test.each(['x', 'style.css'])('%s is not a directory', (arg) => {
  expect(run(arg)).toEqual([`${arg}  [error opening dir]`, '', '0 directories, 0 files']);
});
