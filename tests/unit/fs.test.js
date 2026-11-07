import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { displayPath, FILES, fileUrl, isDir, isFile, listDir, resolve } from '../../docs/lib/fs.js';

describe('resolve', () => {
  test.each([
    ['/home/felix', 'blog', '/home/felix/blog'],
    ['/home/felix/blog', '..', '/home/felix'],
    ['/home/felix/blog', './..', '/home/felix'],
    ['/', '..', '/'],
    ['/', '~', '/home/felix'],
    ['/', '~/blog/', '/home/felix/blog'],
    ['/home/felix', '/home', '/home'],
    ['/home/felix', './/blog//index.html', '/home/felix/blog/index.html'],
    ['/home/felix', 'x~', '/home/felix/x~'],
  ])('%s + %s = %s', (cwd, path, expected) => {
    expect(resolve(cwd, path)).toBe(expected);
  });
});

test('listDir marks directories with a slash, sorted and unique', () => {
  expect(listDir('/')).toEqual(['home/']);
  expect(listDir('/home/felix/blog')).toEqual(['example-post.html', 'index.html']);
  expect(listDir('/home/felix')).toContain('lib/');
  expect(listDir('/home/felix/blog/index.html')).toEqual([]);
});

test('files and directories are told apart', () => {
  expect(isFile('/home/felix/style.css')).toBe(true);
  expect(isDir('/home/felix/style.css')).toBe(false);
  expect(isDir('/home')).toBe(true);
  expect(isFile('/home/felix/blog')).toBe(false);
  expect(isDir('/home/felix/bl')).toBe(false);
});

test('paths map to relative URLs and prompt paths', () => {
  expect(fileUrl('/home/felix/blog/index.html')).toBe('blog/index.html');
  expect(displayPath('/home/felix/blog')).toBe('~/blog');
  expect(displayPath('/home')).toBe('/home');
});

test('FILES equals the files in docs/ without dotfiles', () => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'docs'])
    .toString()
    .trim()
    .split('\n')
    .filter((file) => !/\/\./u.test(file))
    .map((file) => file.replace('docs/', ''));
  expect([...FILES].sort()).toEqual(files.sort());
});
