export const SIZE = 5;
export const MAX_NUMBER = 75;
export const FREE_INDEX = Math.floor((SIZE * SIZE) / 2);

export function generateBoard() {
  const nums = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  const board = nums.slice(0, SIZE * SIZE - 1);
  board.splice(FREE_INDEX, 0, null);
  return board;
}

export function initialMarked() {
  return new Set([FREE_INDEX]);
}

export function getLines() {
  const lines = [];
  for (let r = 0; r < SIZE; r++) {
    lines.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  }
  for (let c = 0; c < SIZE; c++) {
    lines.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  }
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + i));
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)));
  return lines;
}

export function getCompletedLines(marked) {
  return getLines().filter((line) => line.every((i) => marked.has(i)));
}
