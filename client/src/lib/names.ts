const adjectives = [
  'Swift', 'Brave', 'Clever', 'Quiet', 'Bright', 'Golden', 'Cosmic', 'Lucky',
  'Wild', 'Calm', 'Misty', 'Neon', 'Solar', 'Lunar', 'Arctic', 'Velvet',
];

const animals = [
  'Tiger', 'Panda', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lynx', 'Hawk',
  'Owl', 'Otter', 'Raven', 'Koala', 'Gecko', 'Moose', 'Bison', 'Heron',
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export const randomName = () => `${pick(adjectives)} ${pick(animals)}`;

const NAME_KEY = 'coop-sudoku:name';

export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || randomName();
  } catch {
    return randomName();
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage may be blocked (private mode); the name just won't be remembered
  }
}
