// Card furniture: a generic EMV chip, plus empty logo and network-mark slots.
// Drop your own SVG path data into logo.d / visa.d to brand the card.
window.FURNITURE = {
  logo: {
    // your logo here (SVG path data)
    x: 518.10, y: 14.14, w: 263.57, h: 46.50, vb: '0 0 207 37',
    d: [],
  },
  visa: {
    x: 599, y: 421.47, w: 172.01, h: 55.87, vb: '0 0 173 56',
    d: []} ${a.h / +a.vb.split(' ')[3]})">${inner}</g>`;
  const logo = g(F.logo, F.logo.d.map((d) => `<path d="${d}" fill="${color}"/>`).join(''));
  const visa = g(F.visa, F.visa.d.map((d) => `<path d="${d}" fill="${color}" fill-rule="evenodd"/>`).join(''));
  const chip = opts.chip === false ? '' : g(F.chip, `<path d="${F.chip.plate}" fill="#DEE0D9"/><path d="${F.chip.lines}" fill="${opts.chipInk || '#000'}"/>`);
  return `<g id="furniture">${chip}${logo}${visa}</g>`;
};
