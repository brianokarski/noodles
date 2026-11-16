// Stipple Filter
// Plugin main thread: reads selection, stores API key, writes stipple SVG back.

figma.showUI(__html__, { width: 960, height: 680, themeColors: true });

const API_KEY_STORAGE = 'openai-api-key';

async function sendSelectionImage() {
  const sel = figma.currentPage.selection;

  // Find the first node with an image fill
  const node = sel.find(n => 'fills' in n && Array.isArray(n.fills) &&
    n.fills.some(f => f.type === 'IMAGE' && f.imageHash));

  if (!node) {
    figma.ui.postMessage({ type: 'no-selection' });
    return;
  }

  const imageFill = node.fills.find(f => f.type === 'IMAGE' && f.imageHash);
  const image = figma.getImageByHash(imageFill.imageHash);
  if (!image) {
    figma.ui.postMessage({ type: 'no-selection' });
    return;
  }

  const bytes = await image.getBytesAsync();

  figma.ui.postMessage({
    type: 'selection-image',
    bytes,
    sourceNodeId: node.id,
    sourceWidth: node.width,
    sourceHeight: node.height,
  });
}

figma.on('selectionchange', sendSelectionImage);
sendSelectionImage();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-api-key') {
    const key = await figma.clientStorage.getAsync(API_KEY_STORAGE);
    figma.ui.postMessage({ type: 'api-key', key: key || '' });
    return;
  }

  if (msg.type === 'set-api-key') {
    await figma.clientStorage.setAsync(API_KEY_STORAGE, msg.key || '');
    figma.ui.postMessage({ type: 'api-key-saved' });
    return;
  }

  if (msg.type === 'apply-stipple') {
    try {
      const svgNode = figma.createNodeFromSvg(msg.svg);
      svgNode.name = 'Stipple';

      // Position: next to source node if known, else viewport center
      if (msg.sourceNodeId) {
        const source = await figma.getNodeByIdAsync(msg.sourceNodeId);
        if (source && 'x' in source) {
          svgNode.x = source.x + source.width + 40;
          svgNode.y = source.y;
          if (msg.sourceWidth && msg.sourceHeight) {
            svgNode.resize(msg.sourceWidth, msg.sourceHeight);
          }
        }
      } else {
        svgNode.x = figma.viewport.center.x - svgNode.width / 2;
        svgNode.y = figma.viewport.center.y - svgNode.height / 2;
      }

      figma.currentPage.selection = [svgNode];
      figma.viewport.scrollAndZoomIntoView([svgNode]);
      figma.ui.postMessage({ type: 'applied' });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }
    return;
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
