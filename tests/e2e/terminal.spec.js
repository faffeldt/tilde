import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const disk = (file) => readFileSync(`docs/${file}`, 'utf8');
const input = (page) => page.getByRole('textbox', { name: 'Command' });
const log = (page) => page.getByRole('log');
const promptText = (page) => page.locator('#prompt').textContent();
const currentTheme = (page) => page.locator('html').getAttribute('data-theme');
const background = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/giu).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
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
    await expect(log(page)).toContainText('cat terminal.js and ls lib');
    expect(await log(page).textContent()).not.toMatch(/\d+\.\d+\.\d+\.\d+/u);
  });

  test('offers a focused, mobile friendly input', async ({ page }) => {
    await expect(input(page)).toBeFocused();
    await expect(input(page)).toHaveAttribute('autocapitalize', 'off');
    await expect(input(page)).toHaveAttribute('autocorrect', 'off');
    await expect(input(page)).toHaveAttribute('spellcheck', 'false');
    await expect(input(page)).toHaveAttribute('autocomplete', 'off');
    const fontSize = await input(page).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
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
    await expect(log(page)).toContainText('createShell');
    await expect(input(page)).toBeInViewport();
  });

  test('prompt follows cd, with home displayed as ~', async ({ page }) => {
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:~$');
    await run(page, 'cd blog');
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:~/blog$');
    await run(page, 'cd /home');
    await expect(page.locator('#prompt')).toHaveText('felix@tilde:/home$');
  });

  test('ls lists the working directory', async ({ page }) => {
    await run(page, 'cd blog');
    await expectOutput(page, 'ls', 'example-post.html index.html');
  });

  test('ls -l prints exact sizes, -h makes them human readable', async ({ page }) => {
    const size = Buffer.byteLength(disk('terminal.js'));
    await run(page, 'ls -l terminal.js');
    await expect(log(page)).toContainText(
      new RegExp(`-rw-r--r-- 1 felix felix ${size} \\w{3} \\d{2} \\d{2}:\\d{2} terminal\\.js`, 'u'),
    );
    await run(page, 'ls -lh terminal.js');
    await expect(log(page)).toContainText(`felix ${(size / 1024).toFixed(1)}K `);
    await run(page, 'ls -l');
    await expect(log(page)).toContainText(/drwxr-xr-x 1 felix felix +4096 .* blog\//u);
    await run(page, 'ls -la');
    await expect(log(page)).toContainText(/drwxr-xr-x 1 felix felix +4096 .* \.\.\//u);
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

  test('open shows the profile and returns to the terminal', async ({ page }) => {
    await run(page, 'open about.html');
    await expect(page.getByRole('heading', { name: "Hi, I'm Felix" })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selected experience' })).toBeVisible();
    await page.keyboard.press('q');
    await expect(input(page)).toBeFocused();
  });

  test('open shows the rendered post and its breadcrumb returns to the terminal', async ({ page }) => {
    await run(page, 'open blog/example-post.html');
    await expect(page).toHaveURL(/\/blog\/example-post\.html$/u);
    await expect(page.getByRole('heading', { name: 'Example post' })).toBeVisible();
    await page.getByRole('link', { name: 'felix@tilde ~' }).click();
    await expect(input(page)).toBeFocused();
  });

  for (const key of ['q', 'Escape']) {
    test(`${key} goes back to the terminal from an opened post`, async ({ page }) => {
      await run(page, 'open blog/example-post.html');
      await expect(page.getByText('press q or esc to quit')).toBeVisible();
      await page.keyboard.press(key);
      await expect(input(page)).toBeFocused();
      await page.goForward();
      await expect(page).toHaveURL(/\/blog\/example-post\.html$/u);
    });
  }

  test('quitting leads to the terminal when it did not open the page', async ({ page }) => {
    await run(page, 'open blog/index.html');
    await page.getByRole('link', { name: 'Example post' }).click();
    await expect(page).toHaveURL(/\/blog\/example-post\.html$/u);
    await page.keyboard.press('q');
    await expect(input(page)).toBeFocused();

    await page.goto('/blog/example-post.html');
    await page.keyboard.press('Escape');
    await expect(input(page)).toBeFocused();
  });

  test('pressing q twice during a slow load still stops at the terminal', async ({ page }) => {
    await run(page, 'open blog/index.html');
    await page.getByRole('link', { name: 'felix@tilde ~' }).click();
    await run(page, 'open blog/example-post.html');
    await expect(page.getByRole('heading', { name: 'Example post' })).toBeVisible();
    await page.route(/:\d+\/$/u, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.keyboard.press('q');
    await page.keyboard.press('q');
    await expect(input(page)).toBeFocused();
    await expect(page).toHaveURL(/:\d+\/$/u);
  });

  test('browser shortcuts with q do not quit', async ({ page }) => {
    await run(page, 'open blog/example-post.html');
    await expect(page.getByRole('heading', { name: 'Example post' })).toBeVisible();
    await page.keyboard.press('Alt+q');
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(page).toHaveURL(/\/blog\/example-post\.html$/u);
  });

  test('clear empties the output', async ({ page }) => {
    await run(page, 'clear');
    await expect(log(page)).toHaveText('');
  });

  test('help lists every command and links the repository', async ({ page }) => {
    await run(page, 'help');
    const text = await log(page).innerText();
    for (const command of ['help', 'whoami', 'pwd', 'ls', 'cd', 'cat', 'open', 'theme', 'clear']) {
      expect(text).toMatch(new RegExp(`^${command} +\\S`, 'mu'));
    }
    const repository = 'https://github.com/faffeldt/tilde';
    await expect(page.getByRole('link', { name: repository })).toHaveAttribute('href', repository);
  });

  test('whoami describes Felix and links GitHub', async ({ page }) => {
    const github = 'https://github.com/faffeldt';
    const description = 'I love to build. I focus on building complex things as simple as possible.';
    await expectOutput(
      page,
      'whoami',
      `felix ${description} Software engineer working across systems programming and backend/infra tooling. Use whoami -v to read more. ${github}`,
    );
    await expect(page.getByRole('link', { name: github })).toHaveAttribute('href', github);
  });

  for (const flag of ['-v', '--verbose']) {
    test(`whoami ${flag} opens the profile and returns to the terminal`, async ({ page }) => {
      await run(page, 'cd blog');
      await run(page, `whoami ${flag}`);
      await expect(page).toHaveURL(/\/about\.html$/u);
      await expect(page.getByRole('heading', { name: "Hi, I'm Felix" })).toBeVisible();
      await page.keyboard.press('q');
      await expect(input(page)).toBeFocused();
    });
  }

  test('theme lists the themes and marks the current one', async ({ page }) => {
    await run(page, 'clear');
    await run(page, 'theme');
    const lines = (await log(page).innerText()).split('\n').slice(1);
    const themes = await page.evaluate(() => globalThis.themes.names);
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

  test('theme random picks another theme and reports it', async ({ page }) => {
    await run(page, 'clear');
    await run(page, 'theme random');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'tilde');
    await expect(log(page)).toContainText(await currentTheme(page));
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
      Object.defineProperty(globalThis, 'localStorage', {
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
    const themes = await page.evaluate(() => globalThis.themes.names);
    const palettes = new Set();
    for (const theme of themes) {
      await page.evaluate((name) => {
        document.documentElement.dataset.theme = name;
      }, theme);
      const colors = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          ['bg', 'text', 'muted', 'link', 'prompt', 'code-bg', 'mark'].map((name) => [
            name,
            style.getPropertyValue(`--${name}`).trim(),
          ]),
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
        expect(contrast(colors[foreground], colors[back]), `${theme}: ${foreground} on ${back}`).toBeGreaterThanOrEqual(
          4.5,
        );
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

  test('tab completes commands, paths and flags', async ({ page }) => {
    for (const [typed, completed] of [
      ['cl', 'clear '],
      ['cat bl', 'cat blog/'],
      ['cat blog/index.html ter', 'cat blog/index.html terminal.js '],
      ['theme dr', 'theme dracula '],
    ]) {
      await input(page).fill(typed);
      await input(page).press('Tab');
      await expect(input(page)).toHaveValue(completed);
    }
  });

  test('tab lists ambiguous matches sorted, and keeps the input', async ({ page }) => {
    for (const [typed, expected] of [
      ['c', 'cat cd clear'],
      ['ls blog/', 'example-post.html index.html'],
    ]) {
      await run(page, 'clear');
      await input(page).fill(typed);
      await input(page).press('Tab');
      await expect(input(page)).toHaveValue(typed);
      await expect(log(page)).toHaveText(`felix@tilde:~$ ${typed} ${expected}`.replace(/\s+/gu, ' '), {
        useInnerText: true,
      });
    }
  });

  test('tab does nothing without a match', async ({ page }) => {
    await run(page, 'clear');
    for (const typed of ['xyz', 'ls -x']) {
      await input(page).fill(typed);
      await input(page).press('Tab');
      await expect(input(page)).toHaveValue(typed);
    }
    await expect(log(page)).toHaveText('');
  });

  test('tab completes at the caret and keeps what follows it', async ({ page }) => {
    await input(page).fill('cat st index.html');
    await input(page).evaluate((element) => element.setSelectionRange(6, 6));
    await input(page).press('Tab');
    await expect(input(page)).toHaveValue('cat style.css  index.html');
    expect(await input(page).evaluate((element) => element.selectionStart)).toBe(14);
  });

  test('shift+tab leaves the input', async ({ page }) => {
    await input(page).press('Shift+Tab');
    await expect(input(page)).not.toBeFocused();
  });

  test('HTML typed as a command renders literally and does not execute', async ({ page }) => {
    const html = '<img src=x onerror=globalThis.pwned=1>';
    await expectOutput(page, html, 'bash: <img: command not found');
    await expect(log(page).locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.pwned)).toBeUndefined();
  });

  test('output wraps without horizontal scrolling at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await run(page, 'cat terminal.js');
    await expect(log(page)).toContainText('createShell');
    const overflow = await page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.documentElement;
      return scrollWidth - clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
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
    await expect(page.getByText('press q or esc to quit')).toHaveCount(0);
  });
});
