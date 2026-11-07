import { describe, expect, test, vi } from 'vitest';
import { createShell } from '../../docs/lib/shell.js';
import { fakeFetch } from './fake-fetch.js';

const THEMES = ['tilde', 'nord', 'dracula'];

function setup({ overrides, random } = {}) {
  let theme = 'tilde';
  const deps = {
    fetchFile: fakeFetch(overrides),
    navigate: vi.fn(),
    clear: vi.fn(),
    themes: {
      names: THEMES,
      current: () => theme,
      save: vi.fn((name) => {
        theme = name;
      }),
    },
    random,
  };
  return { shell: createShell(deps), deps, theme: () => theme };
}

describe('prompt and directories', () => {
  test('cd changes the prompt and pwd, home by default', async () => {
    const { shell } = setup();
    expect(shell.prompt()).toBe('felix@tilde:~$ ');
    expect(await shell.run('cd blog')).toEqual([]);
    expect(shell.prompt()).toBe('felix@tilde:~/blog$ ');
    expect(await shell.run('pwd')).toEqual(['/home/felix/blog']);
    await shell.run('cd /home');
    expect(shell.prompt()).toBe('felix@tilde:/home$ ');
    await shell.run('cd');
    expect(await shell.run('pwd')).toEqual(['/home/felix']);
  });

  test('cd reports a file and a missing path without moving', async () => {
    const { shell } = setup();
    expect(await shell.run('cd style.css')).toEqual(['cd: style.css: Not a directory']);
    expect(await shell.run('cd x')).toEqual(['cd: x: No such file or directory']);
    expect(await shell.run('pwd')).toEqual(['/home/felix']);
  });

  test('cd moves before its result is awaited, so the next prompt is already right', async () => {
    const { shell } = setup();
    const pending = shell.run('cd blog');
    expect(shell.prompt()).toBe('felix@tilde:~/blog$ ');
    await pending;
  });

  test('blank input runs nothing, extra whitespace is ignored', async () => {
    const { shell } = setup();
    expect(await shell.run('   ')).toEqual([]);
    expect(await shell.run('  cd   blog  ')).toEqual([]);
    expect(shell.prompt()).toBe('felix@tilde:~/blog$ ');
  });
});

describe('cat', () => {
  test('prints files in order', async () => {
    const { shell } = setup();
    expect(await shell.run('cat CNAME blog/index.html')).toEqual(['CNAME', 'blog/index.html']);
  });

  test('reports directory, missing file, missing operand and I/O errors', async () => {
    const { shell } = setup({ overrides: { 'style.css': 'fail', 'theme.js': { status: 500, body: 'secret' } } });
    expect(await shell.run('cat blog')).toEqual(['cat: blog: Is a directory']);
    expect(await shell.run('cat x')).toEqual(['cat: x: No such file or directory']);
    expect(await shell.run('cat')).toEqual(['cat: missing file operand']);
    expect(await shell.run('cat style.css')).toEqual(['cat: style.css: Input/output error']);
    expect(await shell.run('cat theme.js')).toEqual(['cat: theme.js: Input/output error']);
  });

  test('resolves paths when run, not when the reads finish', async () => {
    const { shell } = setup();
    const pending = shell.run('cat index.html');
    await shell.run('cd blog');
    expect(await pending).toEqual(['index.html']);
  });
});

describe('open', () => {
  test('navigates to a file relative to the site root', async () => {
    const { shell, deps } = setup();
    await shell.run('cd blog');
    expect(await shell.run('open example-post.html')).toEqual([]);
    expect(deps.navigate).toHaveBeenCalledWith('blog/example-post.html');
  });

  test('reports directory, missing file and missing operand', async () => {
    const { shell, deps } = setup();
    expect(await shell.run('open blog')).toEqual(['open: blog: Is a directory']);
    expect(await shell.run('open x')).toEqual(['open: x: No such file or directory']);
    expect(await shell.run('open')).toEqual(['open: missing file operand']);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});

describe('whoami', () => {
  test('describes Felix and links GitHub', async () => {
    const { shell } = setup();
    const lines = await shell.run('whoami');
    expect(lines[0]).toBe('felix');
    expect(lines.at(-1)).toEqual({ link: 'https://github.com/faffeldt' });
  });

  test.each(['-v', '--verbose'])('%s opens the profile from any directory', async (flag) => {
    const { shell, deps } = setup();
    await shell.run('cd blog');
    await shell.run(`whoami ${flag}`);
    expect(deps.navigate).toHaveBeenCalledWith('about.html');
  });

  test('rejects unknown arguments', async () => {
    const { shell, deps } = setup();
    expect(await shell.run('whoami -x')).toEqual(['whoami: unrecognized argument: -x']);
    expect(await shell.run('whoami -v -v')).toEqual(['whoami: unrecognized argument: -v']);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});

describe('theme', () => {
  test('lists the themes and marks the current one', async () => {
    const { shell } = setup();
    expect(await shell.run('theme')).toEqual(['* tilde', '  nord', '  dracula']);
  });

  test('switches to a named theme, and reports an unknown one without switching', async () => {
    const { shell, theme } = setup();
    expect(await shell.run('theme nord')).toEqual([]);
    expect(theme()).toBe('nord');
    expect(await shell.run('theme x')).toEqual(['theme: x: No such theme']);
    expect(theme()).toBe('nord');
  });

  test.each([0, 0.99])('random never picks the current theme (random() = %f)', async (value) => {
    const { shell, theme } = setup({ random: () => value });
    const [picked] = await shell.run('theme random');
    expect(picked).not.toBe('tilde');
    expect(theme()).toBe(picked);
  });
});

test('help lists every command and links the repository', async () => {
  const { shell } = setup();
  const lines = await shell.run('help');
  const commands = ['help', 'whoami', 'pwd', 'ls', 'tree', 'cd', 'cat', 'open', 'theme', 'clear'];
  expect(lines.slice(0, -2)).toEqual(commands.map((name) => expect.stringMatching(new RegExp(`^${name} +\\S`, 'u'))));
  expect(lines.slice(-2)).toEqual(['source code:', { link: 'https://github.com/faffeldt/tilde' }]);
});

test('clear empties the output', async () => {
  const { shell, deps } = setup();
  expect(await shell.run('clear')).toEqual([]);
  expect(deps.clear).toHaveBeenCalledOnce();
});

test.each(['foo', 'constructor', '__proto__', 'toString'])('%s is not a command', async (name) => {
  const { shell } = setup();
  expect(await shell.run(name)).toEqual([`bash: ${name}: command not found`]);
});
