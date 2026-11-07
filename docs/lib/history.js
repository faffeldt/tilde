export function createHistory() {
  const entries = [];
  let index = 0;
  return {
    add(text) {
      if (text.trim()) entries.push(text);
      index = entries.length;
    },
    step(delta) {
      index = Math.min(Math.max(index + delta, 0), entries.length);
      return entries[index] ?? '';
    },
  };
}
