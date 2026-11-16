import { DotScene } from '../generators/types';

const NS = 'http://www.w3.org/2000/svg';

export function renderSvg(
  scene: DotScene,
  canvas: { width: number; height: number },
  background: string,
): SVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
  svg.setAttribute('width', String(canvas.width));
  svg.setAttribute('height', String(canvas.height));

  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(canvas.width));
  bg.setAttribute('height', String(canvas.height));
  bg.setAttribute('fill', background);
  svg.appendChild(bg);

  if (scene.edges) {
    for (const e of scene.edges) {
      const a = scene.dots[e.a];
      const b = scene.dots[e.b];
      if (!a || !b) continue;
      const stroke = e.stroke ?? '#000';
      const width = e.width ?? 1;
      const dash = e.dashed ? `${width * 2} ${width * 3}` : null;
      if (e.curve && e.curve !== 0) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const nx = -dy / len;
        const ny = dx / len;
        const offset = len * e.curve * 0.5;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`);
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', String(width));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('fill', 'none');
        if (dash) path.setAttribute('stroke-dasharray', dash);
        svg.appendChild(path);
      } else {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-width', String(width));
        line.setAttribute('stroke-linecap', 'round');
        if (dash) line.setAttribute('stroke-dasharray', dash);
        svg.appendChild(line);
      }
    }
  }

  for (const d of scene.dots) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(d.x));
    c.setAttribute('cy', String(d.y));
    c.setAttribute('r', String(d.r));
    c.setAttribute('fill', d.color);
    svg.appendChild(c);
  }

  return svg;
}

export function sceneToSvgString(
  scene: DotScene,
  canvas: { width: number; height: number },
  background: string,
): string {
  const el = renderSvg(scene, canvas, background);
  return new XMLSerializer().serializeToString(el);
}
