import { expect, test } from 'vitest';
import { createHistory } from '../../docs/lib/history.js';

test('steps through entries, stopping at the oldest and at the empty newest', () => {
  const history = createHistory();
  history.add('pwd');
  history.add('ls');
  expect([-1, -1, -1, 1, 1, 1].map((delta) => history.step(delta))).toEqual(['ls', 'pwd', 'pwd', 'ls', '', '']);
});

test('ignores blank entries, and adding resets to the newest', () => {
  const history = createHistory();
  history.add('pwd');
  history.step(-1);
  history.add('   ');
  expect(history.step(-1)).toBe('pwd');
  expect(history.step(1)).toBe('');
});
