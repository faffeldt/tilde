import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const disk = (file) => readFileSync(`docs/${file}`, 'utf8');
const input = (page) => page.getByRole('textbox', { name: 'Command' });
const log = (page) => page.getByRole('log');
const promptText = (page) => page.locator('#prompt').textContent();
const currentTheme = (page) => page.locator('html').getAttribute('data-theme');
const background = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const [dark, light] = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (light + 0.05) / (dark + 0.05);
}

async function run(page, command) {
  await input(page).fill(command);
  await input(page).press('Enter');
}

async function expectOutput(page, command, expected) {
  await run(page, 'clear');
  const prompt = await promptText(page);
  await run(page, command);
  await expect(log(page)).toHaveText(`${prompt}${command} ${expected}`, { useInnerText: true });
}

async function expectExactText(page, expected) {
  await expect.poll(() => log(page).textContent()).toBe(expected);
}

test.describe('with JS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('greets like an SSH login without showing an IP', async ({ page }) => {
    await expect(log(page)).toContainText('ssh felix@tilde.failx.dev');
    await expect(log(page)).toContainText('Welcome');
    await expect(log(page)).toContainText(`Last login: ${new Date().toDateString()}`);
    await expect(log(page)).toContainText('help');
    await expect(log(page)).toContainText('cat terminal.js');
    expect(await log(page).textContent()).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });

  test('offers a focused, mobile friendly input', async ({ page }) => {
    await expect(input(page)).toBeFocused();
    await expect(input(page)).toHaveAttribute('autocapitalize', 'off');
    await expect(input(page)).toHaveAttribute('autocorrect', 'off');
    await expect(input(page)).toHaveAttribute('spellcheck', 'false');
    await expect(input(page)).toHaveAttribute('autocomplete', 'off');
    const fontSize = await input(page).evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('clicking the terminal focuses the input, unless text gets selected', async ({ page }) => {
    await input(page).blur();
    await log(page).click();
    await expect(input(page)).toBeFocused();

    await input(page).blur();
    const box = await log(page).boundingBox();
    await page.mouse.move(box.x + 1, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 5);
    await page.mouse.up();
    await expect(input(page)).not.toBeFocused();
  });

  test('clicking while scrolled up keeps the reading position', async ({ page }) => {
    await run(page, 'cat terminal.js');
    await expect(log(page)).toContainText('input.focus();');
    await page.evaluate(() => scrollTo(0, 0));
    await log(page).click({ position: { x: 1, y: 1 } });
    await expect(input(page)).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('empty command only echoes the prompt', async ({ page }) => {
    await expectOutput(page, '', '');
  });

  test('keeps the input in view after long output', async ({ page }) => {
    await run(page, 'cat terminal.js');
    await expect(log(page)).toContainText('const FILES');
    await expect(input(page)).toBeInViewport();
  });

  test('prompt follows cd, with home displayed as ~', async ({ page }) => {
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:~$');
    await run(page, 'cd blog');
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:~/blog$');
    await run(page, 'cd /home');
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:/home$');
  });

  test('pwd prints the full path', async ({ page }) => {
    await expectOutput(page, 'pwd', '/home/felix');
    await run(page, 'cd blog');
    await expectOutput(page, 'pwd', '/home/felix/blog');
  });

  test('ls lists home, a path, a file and reports a missing path', async ({ page }) => {
    await expectOutput(page, 'ls', 'CNAME blog/ index.html style.css terminal.js theme.js');
    await expectOutput(page, 'ls blog', 'example-post.html index.html');
    await expectOutput(page, 'ls /', 'home/');
    await expectOutput(page, 'ls ~/blog/index.html', 'index.html');
    await expectOutput(page, 'ls x', "ls: cannot access 'x': No such file or directory");
    await expectOutput(page, 'ls -la', "ls: cannot access '-la': No such file or directory");
  });

  test('cd resolves .., ~, no argument, / and reports file and missing', async ({ page }) => {
    const expectCwd = (path) => expectOutput(page, 'pwd', path);

    await run(page, 'cd blog');
    await run(page, 'cd ..');
    await expectCwd('/home/felix');
    await run(page, 'cd /');
    await expectCwd('/');
    await run(page, 'cd ..');
    await expectCwd('/');
    await run(page, 'cd ~/blog');
    await expectCwd('/home/felix/blog');
    await run(page, 'cd ./..');
    await expectCwd('/home/felix');
    await run(page, 'cd /');
    await run(page, 'cd');
    await expectCwd('/home/felix');
    await run(page, 'cd /');
    await run(page, 'cd ~');
    await expectCwd('/home/felix');

    await expectOutput(page, 'cd style.css', 'cd: style.css: Not a directory');
    await expectOutput(page, 'cd x', 'cd: x: No such file or directory');
  });

  test('cat prints files byte-exact, in order', async ({ page }) => {
    for (const file of ['blog/example-post.html', 'terminal.js']) {
      await run(page, 'clear');
      await run(page, `cat ${file}`);
      await expectExactText(page, `felix@tilde:~$ cat ${file}${disk(file)}`);
    }

    await run(page, 'clear');
    await run(page, 'cat CNAME style.css');
    await expectExactText(page, `felix@tilde:~$ cat CNAME style.css${disk('CNAME')}${disk('style.css')}`);
  });

  test('cat reports directory, missing file and missing operand', async ({ page }) => {
    await expectOutput(page, 'cat blog', 'cat: blog: Is a directory');
    await expectOutput(page, 'cat x', 'cat: x: No such file or directory');
    await expectOutput(page, 'cat', 'cat: missing file operand');
  });

  test('cat reports a failed fetch and a not OK response', async ({ page }) => {
    await page.route('**/style.css', (route) => route.abort());
    await expectOutput(page, 'cat style.css', 'cat: style.css: Input/output error');
    await page.route('**/style.css', (route) => route.fulfill({ status: 500, body: 'secret' }));
    await expectOutput(page, 'cat style.css', 'cat: style.css: Input/output error');
  });

  test('cat output lands below its own command when another was entered meanwhile', async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/CNAME', async (route) => {
      await gate;
      await route.continue();
    });

    await run(page, 'clear');
    await run(page, 'cat CNAME');
    await run(page, 'pwd');
    await expect(log(page)).toContainText('/home/felix');
    release();
    await expectExactText(page, `felix@tilde:~$ cat CNAME${disk('CNAME')}felix@tilde:~$ pwd/home/felix`);
  });

  test('open shows the rendered post and its breadcrumb returns to the terminal', async ({ page }) => {
    await run(page, 'open blog/example-post.html');
    await expect(page).toHaveURL(/\/blog\/example-post\.html$/);
    await expect(page.getByRole('heading', { name: 'Example post' })).toBeVisible();
    await page.getByRole('link', { name: 'felix@tilde ~' }).click();
    await expect(input(page)).toBeFocused();
  });

  test('open reports directory, missing file and missing operand', async ({ page }) => {
    await expectOutput(page, 'open blog', 'open: blog: Is a directory');
    await expectOutput(page, 'open x', 'open: x: No such file or directory');
    await expectOutput(page, 'open', 'open: missing file operand');
  });

  test('clear empties the output', async ({ page }) => {
    await run(page, 'clear');
    await expect(log(page)).toHaveText('');
  });

  test('help lists every command and links the repository', async ({ page }) => {
    await run(page, 'help');
    const text = await log(page).innerText();
    for (const command of ['help', 'whoami', 'pwd', 'ls', 'cd', 'cat', 'open', 'theme', 'clear']) {
      expect(text).toMatch(new RegExp(`^${command} +\\S`, 'm'));
    }
    const repository = 'https://github.com/faffeldt/tilde';
    await expect(page.getByRole('link', { name: repository })).toHaveAttribute('href', repository);
  });

  test('whoami describes Felix and links GitHub', async ({ page }) => {
    const github = 'https://github.com/faffeldt';
    const description = 'I love to build. I focus on building complex things as simple as possible.';
    await expectOutput(page, 'whoami', `felix ${description} ${github}`);
    await expect(page.getByRole('link', { name: github })).toHaveAttribute('href', github);
  });

  test('theme lists the themes and marks the current one', async ({ page }) => {
    await run(page, 'clear');
    await run(page, 'theme');
    const lines = (await log(page).innerText()).split('\n').slice(1);
    const themes = await page.evaluate('THEMES');
    expect(lines).toEqual(themes.map((name, index) => `${index === 0 ? '*' : ' '} ${name}`));
  });

  test('theme switches colors, and reports an unknown name without switching', async ({ page }) => {
    const before = await background(page);
    await expectOutput(page, 'theme github-light', '');
    expect(await currentTheme(page)).toBe('github-light');
    expect(await background(page)).not.toBe(before);

    await expectOutput(page, 'theme x', 'theme: x: No such theme');
    expect(await currentTheme(page)).toBe('github-light');
  });

  test('theme random always picks another theme and reports it', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      const before = await currentTheme(page);
      await run(page, 'clear');
      await run(page, 'theme random');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme', before);
      await expect(log(page)).toContainText(await currentTheme(page));
    }
  });

  test('the theme survives a reload and reaches the blog', async ({ page }) => {
    await run(page, 'theme nord');
    const nord = await background(page);
    await page.reload();
    expect(await currentTheme(page)).toBe('nord');
    await page.goto('/blog/');
    expect(await background(page)).toBe(nord);
  });

  test('an outdated saved theme falls back to the default', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('theme', 'gone'));
    await page.reload();
    expect(await currentTheme(page)).toBe('tilde');
  });

  test('themes still apply when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    await page.reload();
    await expectOutput(page, 'theme nord', '');
    expect(await currentTheme(page)).toBe('nord');
  });

  test('every theme is defined and readable', async ({ page }) => {
    const themes = await page.evaluate('THEMES');
    const palettes = new Set();
    for (const theme of themes) {
      await page.evaluate((name) => applyTheme(name), theme);
      const colors = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          ['bg', 'text', 'muted', 'link', 'prompt', 'code-bg', 'mark']
            .map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
        );
      });
      palettes.add(JSON.stringify(colors));
      for (const [foreground, back] of [
        ['text', 'bg'],
        ['muted', 'bg'],
        ['link', 'bg'],
        ['prompt', 'bg'],
        ['text', 'code-bg'],
        ['text', 'mark'],
      ]) {
        expect(contrast(colors[foreground], colors[back]), `${theme}: ${foreground} on ${back}`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
    // A listed theme without a CSS block would silently inherit the default palette.
    expect(palettes.size).toBe(themes.length);
  });

  test('arrow keys walk the command history', async ({ page }) => {
    await run(page, 'pwd');
    await run(page, 'ls');
    for (const [key, value] of [
      ['ArrowUp', 'ls'],
      ['ArrowUp', 'pwd'],
      ['ArrowUp', 'pwd'],
      ['ArrowDown', 'ls'],
      ['ArrowDown', ''],
    ]) {
      await input(page).press(key);
      await expect(input(page)).toHaveValue(value);
    }
  });

  test('unknown and inherited names are not commands', async ({ page }) => {
    for (const name of ['foo', 'constructor', '__proto__', 'toString']) {
      await expectOutput(page, name, `bash: ${name}: command not found`);
    }
  });

  test('HTML typed as a command renders literally and does not execute', async ({ page }) => {
    const html = '<img src=x onerror=window.pwned=1>';
    await expectOutput(page, html, 'bash: <img: command not found');
    await expect(log(page).locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  });

  test('output wraps without horizontal scrolling at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await run(page, 'cat terminal.js');
    await expect(log(page)).toContainText('const FILES');
    const overflow = await page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.documentElement;
      return scrollWidth - clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('file list equals the files in docs/ without dotfiles', async ({ page }) => {
    const files = execFileSync('git', ['ls-files', 'docs'])
      .toString()
      .trim()
      .split('\n')
      .filter((file) => !/\/\./.test(file))
      .map((file) => file.replace('docs/', ''));
    expect((await page.evaluate('FILES')).sort()).toEqual(files.sort());
  });
});

test.describe('without JS', () => {
  test.use({ javaScriptEnabled: false });

  test('shows Felix plus working links, without the placeholder or the terminal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Felix' })).toBeVisible();
    await expect(page.getByText('Placeholder')).toHaveCount(0);
    await expect(input(page)).toBeHidden();
    await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/faffeldt');
    await page.getByRole('link', { name: 'blog' }).click();
    await expect(page.getByRole('heading', { name: 'Blog' })).toBeVisible();
  });
});
