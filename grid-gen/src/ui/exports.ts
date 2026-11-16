export function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  triggerDownload(blob, filename);
}

export function downloadPngFromCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  scale: 1 | 2 | 4 = 1,
): void {
  if (scale === 1) {
    canvas.toBlob((b) => {
      if (b) triggerDownload(b, filename);
    }, 'image/png');
    return;
  }
  const off = document.createElement('canvas');
  off.width = canvas.width * scale;
  off.height = canvas.height * scale;
  const ctx = off.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);
  off.toBlob((b) => {
    if (b) triggerDownload(b, filename);
  }, 'image/png');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
