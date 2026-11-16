// Palette families
// Atelier-muted: warm grays, dusty pastels, ochre/olive, lavender + sage.
// Each palette: bg, ink (dark), accents (dot colors), pop (high-contrast accent)

const PALETTES = {
  brand: [
    {
      name: 'big-green-system',
      bg: '#BAC0B4',
      ink: '#000000',
      accents: ['#00FF73', '#0B1D18', '#133121', '#2DC92F', '#3F8256', '#57C851', '#BAFFCC', '#C7FFC1', '#D8FCB2', '#F9F8F4', '#FFFFFF'],
      pop: '#00FF73',
    },
    {
      name: 'final-green-system',
      bg: '#F1FFE3',
      ink: '#131F31',
      accents: ['#00FF73', '#00FFE6', '#161D0B', '#2A4900', '#4A4F23', '#98FF6B', '#C3E0FD', '#D9FFB1'],
      pop: '#00FF73',
    },
    {
      name: 'aqua-lime-pop',
      bg: '#6C7D2B',
      ink: '#458E54',
      accents: ['#34B6C4', '#74A9D4', '#9F92CF', '#61B2D4', '#7BC48B', '#37C7CC', '#36A307', '#03B400'],
      pop: '#89D28A',
    },
    {
      name: 'reference-aqua11',
      bg: '#6B7737',
      ink: '#4B862A',
      accents: ['#2FA513', '#5DB9B8', '#5E9A79', '#749EC4', '#7BBA82', '#7E95B7', '#88ADBF', '#9ABB6A', '#A088D4'],
      pop: '#2FA513',
    },
    {
      name: 'soft-gray',
      bg: '#bdb4b1',
      ink: '#1c1c34',
      accents: ['#f395d2', '#b8c4f0', '#cbf2e0', '#cabd2c', '#c4a87a', '#9b88e7', '#e89386'],
      pop: '#ee65d2',
    },
    {
      name: 'mint-lavender',
      bg: '#bdb4b1',
      ink: '#1c1c34',
      accents: ['#cbf2e0', '#9b88e7', '#cabd2c', '#dde6cc', '#b8c4f0'],
      pop: '#9b88e7',
    },
    {
      name: 'tan-yellow',
      bg: '#bdb4b1',
      ink: '#1c1c34',
      accents: ['#c4a87a', '#cabd2c', '#dde6cc', '#ee65d2'],
      pop: '#ee65d2',
    },
    {
      name: 'olive',
      bg: '#7d7d3f',
      ink: '#1c1c34',
      accents: ['#a290e0', '#dde6cc', '#e3a5a8', '#cbf2e0', '#cabd2c'],
      pop: '#dde6cc',
    },
    {
      name: 'sage-mute',
      bg: '#7e8580',
      ink: '#1a1a35',
      accents: ['#dde6cc', '#cbf2e0', '#b8c4f0', '#9b88e7'],
      pop: '#dde6cc',
    },
    {
      name: 'greys',
      bg: '#a5a5a4',
      ink: '#1c1c34',
      accents: ['#2c2c2e', '#4a4a4c', '#6e6e6f', '#c8c8c6', '#e8e8e5'],
      pop: '#1c1c34',
    },
  ],
};

function pickPalette(rng, group) {
  const all = PALETTES.brand;
  if (group === 'random' || !group) return rng.pick(all);
  const found = all.find(p => p.name === group);
  return found || rng.pick(all);
}
