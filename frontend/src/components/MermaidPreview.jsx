import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { Check, Code2, Copy, Download, Maximize2, Minus, Plus, X } from 'lucide-react';
import { copyToClipboard, downloadBlob, exportSvgAsPng } from '../utils/export';

mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'strict', fontFamily: 'DM Sans, sans-serif', flowchart: { curve: 'basis', htmlLabels: false }, themeVariables: { primaryColor: '#eef0ff', primaryTextColor: '#1b2540', primaryBorderColor: '#8992ed', lineColor: '#8791b2', secondaryColor: '#e5f7f1', tertiaryColor: '#fff5e9', fontSize: '14px' } });

export default function MermaidPreview({ code, title }) {
  const [markup, setMarkup] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const hostRef = useRef(null);
  const renderId = useMemo(() => `dm-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    let cancelled = false;
    async function renderDiagram() {
      if (!code?.trim()) { setMarkup(''); setError('No diagram code was returned.'); return; }
      try {
        const { svg } = await mermaid.render(renderId, code);
        if (!cancelled) { setMarkup(DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })); setError(''); }
      } catch (err) {
        if (!cancelled) { setMarkup(''); setError(err?.message?.split('\n')[0] || 'This diagram could not be rendered.'); }
      }
    }
    renderDiagram();
    return () => { cancelled = true; };
  }, [code, renderId]);

  async function copyDiagramCode() {
    try { await copyToClipboard(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Clipboard access was blocked by this browser.'); }
  }

  function downloadSvg() {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    const clean = DOMPurify.sanitize(new XMLSerializer().serializeToString(svg), { USE_PROFILES: { svg: true, svgFilters: true } });
    downloadBlob(new Blob([clean], { type: 'image/svg+xml;charset=utf-8' }), 'datamind-diagram.svg');
  }

  return (
    <div className={`diagram-shell ${fullscreen ? 'diagram-fullscreen' : ''}`}>
      <div className="diagram-toolbar">
        <div className="diagram-title"><span className="live-dot" />{title || 'Diagram preview'}</div>
        <div className="diagram-actions">
          <button className="diagram-action" onClick={() => setShowCode((v) => !v)} title="Toggle Mermaid code"><Code2 size={15} /><span>Code</span></button>
          <button className="diagram-action" onClick={copyDiagramCode} title="Copy Mermaid source">{copied ? <Check size={15} /> : <Copy size={15} />}<span>{copied ? 'Copied' : 'Copy code'}</span></button>
          <button className="diagram-action" onClick={() => setZoom((v) => Math.max(0.55, +(v - 0.1).toFixed(2)))} title="Zoom out"><Minus size={15} /></button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
          <button className="diagram-action" onClick={() => setZoom((v) => Math.min(1.8, +(v + 0.1).toFixed(2)))} title="Zoom in"><Plus size={15} /></button>
          <button className="diagram-action" onClick={downloadSvg} title="Download SVG"><Download size={15} /><span>SVG</span></button>
          <button className="diagram-action" onClick={() => exportSvgAsPng(hostRef.current?.querySelector('svg')).catch((err) => setError(err.message))} title="Download PNG"><span>PNG</span></button>
          <button className="diagram-action" onClick={() => setFullscreen((v) => !v)} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <X size={15} /> : <Maximize2 size={15} />}</button>
        </div>
      </div>
      {showCode && <pre className="mermaid-code"><code>{code}</code></pre>}
      <div className="diagram-canvas" ref={hostRef}>
        {error ? <div className="diagram-error"><Code2 size={24} /><strong>Diagram preview unavailable</strong><p>{error}</p><small>You can still open Code and copy the Mermaid source.</small></div> : <div className="diagram-art" style={{ transform: `scale(${zoom})` }} dangerouslySetInnerHTML={{ __html: markup }} />}
      </div>
      {fullscreen && <button className="fullscreen-exit" onClick={() => setFullscreen(false)}>Exit fullscreen <X size={15} /></button>}
    </div>
  );
}
