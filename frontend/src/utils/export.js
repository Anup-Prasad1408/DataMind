export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

export async function exportSvgAsPng(svgElement, filename = 'datamind-diagram.png') {
  if (!svgElement) throw new Error('Diagram is not ready to export.');
  const clone = svgElement.cloneNode(true);
  const box = svgElement.getBoundingClientRect();
  const width = Math.max(800, Math.ceil(box.width || 800));
  const height = Math.max(500, Math.ceil(box.height || 500));
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgText = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is not available in this browser.');
    context.scale(2, 2);
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create PNG file.');
    downloadBlob(blob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
