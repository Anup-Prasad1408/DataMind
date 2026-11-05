export async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(value ?? ''));
  const area = document.createElement('textarea');
  area.value = String(value ?? '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Clipboard copy failed.');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text ?? ''], { type }), filename);
}

export async function exportSvgAsPng(svgElement) {
  if (!svgElement) throw new Error('No rendered diagram is available.');
  const clone = svgElement.cloneNode(true);
  const box = svgElement.getBoundingClientRect();
  const width = Math.max(600, Math.ceil(box.width || 900));
  const height = Math.max(400, Math.ceil(box.height || 600));
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an image canvas.');
    context.scale(2, 2);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG conversion failed.');
    downloadBlob(blob, 'datamind-diagram.png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
