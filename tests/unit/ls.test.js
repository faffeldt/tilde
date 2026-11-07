import { describe, expect, test } from 'vitest';
import { humanSize, longEntry, ls } from '../../docs/lib/ls.js';
import { fakeFetch } from './fake-fetch.js';

const HOME = '/home/felix';
const run = (command, { cwd = HOME, overrides } = {}) =>
  ls(command.split(' ').filter(Boolean), { cwd, fetchFile: fakeFetch(overrides) });

describe('ls', () => {
  test.each([
    ['', 'CNAME  about.html  blog/  index.html  lib/  quit.js  style.css  terminal.js  theme.js'],
    ['blog', 'example-post.html  index.html'],
    ['/', 'home/'],
    ['~/blog/index.html', 'index.html'],
    ['-a blog', './  ../  example-post.html  index.html'],
    ['-r blog', 'index.html  example-post.html'],
    ['-ar blog', 'index.html  example-post.html  ../  ./'],
    ['-r -a blog', 'index.html  example-post.html  ../  ./'],
    ['x', "ls: cannot access 'x': No such file or directory"],
    ['-x', "ls: invalid option -- 'x'"],
    ['--all', "ls: invalid option -- '-'"],
  ])('ls %s', async (args, expected) => {
    expect(await run(args)).toBe(expected);
  });

  test('lists relative to the working directory', async () => {
    expect(await run('..', { cwd: `${HOME}/blog` })).toContain('blog/');
  });

  test('-t sorts newest first, -r flips it', async () => {
    const overrides = {
      'blog/index.html': { modified: '2020-01-01' },
      'blog/example-post.html': { modified: '2024-01-01' },
    };
    expect(await run('-t blog', { overrides })).toBe('example-post.html  index.html');
    expect(await run('-tr blog', { overrides })).toBe('index.html  example-post.html');
  });

  test('-l prints one long entry per file with right aligned sizes', async () => {
    const overrides = { 'blog/index.html': { body: 'x'.repeat(1500) } };
    const lines = await run('-l blog', { overrides });
    expect(lines).toEqual([
      expect.stringMatching(/^-rw-r--r-- 1 felix felix {3}22 .* example-post\.html$/u),
      expect.stringMatching(/^-rw-r--r-- 1 felix felix 1500 .* index\.html$/u),
    ]);
  });

  test('-lh makes sizes human readable', async () => {
    const overrides = { 'style.css': { body: 'x'.repeat(1536) } };
    expect(await run('-lh style.css', { overrides })).toEqual([expect.stringContaining(' felix 1.5K ')]);
  });

  test('directories have a fixed size and their newest child time', async () => {
    const overrides = { 'blog/example-post.html': { modified: '2024-03-04T05:06:00' } };
    const [, blog] = await run('-la blog', { overrides });
    expect(blog).toBe(longEntry('../', new Date('2024-03-04T05:06:00').getTime(), '4096'));
  });

  test('a failed fetch or not OK response is an I/O error', async () => {
    expect(await run('-l style.css', { overrides: { 'style.css': 'fail' } })).toBe('ls: style.css: Input/output error');
    expect(await run('-t', { overrides: { 'style.css': { status: 404 } } })).toBe('ls: .: Input/output error');
  });
});

test.each([
  [0, '0'],
  [1023, '1023'],
  [1024, '1.0K'],
  [1536, '1.5K'],
  [1024 ** 2, '1.0M'],
  [5 * 1024 ** 3, '5.0G'],
])('humanSize(%i) = %s', (size, expected) => {
  expect(humanSize(size)).toBe(expected);
});

test('longEntry formats like ls -l', () => {
  const time = new Date('2024-03-04T05:06:00').getTime();
  expect(longEntry('blog/', time, '4096')).toBe('drwxr-xr-x 1 felix felix 4096 Mar 04 05:06 blog/');
  expect(longEntry('CNAME', time, '  17')).toBe('-rw-r--r-- 1 felix felix   17 Mar 04 05:06 CNAME');
});
