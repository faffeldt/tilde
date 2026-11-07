import { createHistory } from './lib/history.js';
import { createShell } from './lib/shell.js';

const output = document.querySelector('#output');
const prompt = document.querySelector('#prompt');
const input = document.querySelector('#command');

const shell = createShell({
  fetchFile: (url) => fetch(url),
  navigate: (url) => {
    location.href = url;
  },
  clear: () => output.replaceChildren(),
  themes: globalThis.themes,
});
const history = createHistory();

function line(...children) {
  const node = document.createElement('div');
  node.append(...children);
  return node;
}

function render(item) {
  if (typeof item === 'string') return line(item);
  const anchor = document.createElement('a');
  anchor.href = item.link;
  anchor.textContent = item.link;
  return line(anchor);
}

const keepInputInView = () => input.scrollIntoView({ block: 'nearest' });

function echo(text) {
  const echoedPrompt = document.createElement('span');
  echoedPrompt.className = 'prompt';
  echoedPrompt.textContent = prompt.textContent;
  const entry = line(line(echoedPrompt, text));
  output.append(entry);
  keepInputInView();
  return entry;
}

async function execute(text) {
  const entry = echo(text);
  const result = shell.run(text);
  // Commands change the directory synchronously, so the next command already sees the new prompt.
  prompt.textContent = shell.prompt();
  entry.append(...(await result).map(render));
  keepInputInView();
}

function completeInput() {
  const caret = input.selectionStart;
  const completion = shell.complete(input.value.slice(0, caret));
  if (!completion) return;
  if (completion.replacement !== undefined) {
    input.setRangeText(completion.replacement, caret - completion.word.length, caret, 'end');
    return;
  }
  echo(input.value).append(line(completion.list.join('  ')));
  keepInputInView();
}

input.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !event.shiftKey) {
    // Shift+Tab stays native, so keyboard users can still leave the input.
    event.preventDefault();
    completeInput();
  } else if (event.key === 'Enter') {
    const text = input.value;
    input.value = '';
    history.add(text);
    execute(text);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    input.value = history.step(event.key === 'ArrowUp' ? -1 : 1);
  }
});

document.addEventListener('click', (event) => {
  // preventScroll: focusing must not move someone reading further up, or break their double-click selection.
  if (!event.target.closest('a') && getSelection().isCollapsed) input.focus({ preventScroll: true });
});

document.querySelector('#terminal').hidden = false;
prompt.textContent = shell.prompt();
output.append(
  ...[
    '$ ssh felix@tilde.failx.dev',
    "Welcome to tilde, Felix's home on the web.",
    `Last login: ${new Date().toDateString()}`,
    'Type help to list the commands, or read the source of this page with cat terminal.js and ls lib',
  ].map((text) => line(text)),
);
input.focus();
