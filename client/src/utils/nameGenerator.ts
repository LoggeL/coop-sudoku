const adjectives = [
  'Happy', 'Swift', 'Brave', 'Clever', 'Quiet', 'Bright', 'Golden', 'Silver',
  'Wild', 'Calm', 'Misty', 'Cool', 'Solar', 'Lunar', 'Arctic', 'Desert'
];

const animals = [
  'Tiger', 'Panda', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk',
  'Owl', 'Deer', 'Shark', 'Whale', 'Lynx', 'Raven', 'Seal', 'Otter'
];

export const generateName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
};
