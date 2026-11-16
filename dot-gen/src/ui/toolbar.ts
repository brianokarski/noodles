import { svgStringToPngBlob } from '../renderers/png';

export type ToolbarDeps = {
  getSvgString: () => string;
  getCanvasSize: () => { width: number; height: number };
  getFilenameBase: () => string;
};

export function buildToolbar(host: HTMLElement, deps: ToolbarDeps): void {
  host.innerHTML = '';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy link';
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy link'), 1200);
    } catch {
      copyBtn.textContent = 'Failed';
      setTimeout(() => (copyBtn.textContent = 'Copy link'), 1200);
    }
  };
  host.appendChild(copyBtn);

  const svgBtn = document.createElement('button');
  svgBtn.textContent = 'Download SVG';
  svgBtn.onclick = () => {
    const s = deps.getSvgString();
    const blob = new Blob([s], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `${deps.getFilenameBase()}.svg`);
  };
  host.appendChild(svgBtn);

  const pngBtn = document.createElement('button');
  pngBtn.textContent = 'Download PNG';
  pngBtn.onclick = async () => {
    const size = deps.getCanvasSize();
    pngBtn.disabled = true;
    pngBtn.textContent = 'Rendering…';
    try {
      const blob = await svgStringToPngBlob(deps.getSvgString(), size.width, size.height);
      triggerDownload(blob, `${deps.getFilenameBase()}.png`);
    } finally {
      pngBtn.disabled = false;
      pngBtn.textContent = 'Download PNG';
    }
  };
  host.appendChild(pngBtn);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
