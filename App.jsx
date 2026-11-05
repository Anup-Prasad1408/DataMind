import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, Check, ChevronDown, Clock3,
  CloudUpload, Command, FileText, FolderKanban, History,
  LayoutDashboard, Menu, Moon, Plus, Search, Settings,
  Sparkles, Star, Sun, WandSparkles, X,
} from 'lucide-react';
import ResultPanel from './components/ResultPanel';
import { FORMATS, SAMPLE_TEXT } from './data/formats';
import { getHealth, refineResult, transformFile, transformText } from './services/api';

const STORAGE_KEY = 'datamind-projects-v2';
const NAV = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'New transformation', icon: Plus },
  { label: 'My projects', icon: FolderKanban },
  { label: 'Templates', icon: BookOpen },
  { label: 'Favorites', icon: Star },
  { label: 'History', icon: History },
];

function readProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function LibraryView({ title, projects, onOpen, onDelete, onNew }) {
  return (
    <section className="library-view">
      <div className="library-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>{title}</h1><p>Open a saved transformation and continue where you left off.</p></div><button className="primary-button" onClick={onNew}><Plus size={15} /> New transformation</button></div>
      {projects.length ? <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><div className="project-card-icon"><FileText size={18} /></div><div className="project-card-body"><strong>{project.title || 'Untitled transformation'}</strong><span>{project.format?.replaceAll('_', ' ')} · {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Saved'}</span><p>{(project.content || '').replace(/[#>*`]/g, '').slice(0, 125)}</p></div><div className="project-card-actions"><button className="text-button" onClick={() => onOpen(project)}>Open <ArrowRight size={13} /></button><button className="icon-button danger-button" title="Delete" onClick={() => onDelete(project.id)}><X size={14} /></button></div></article>)}</div> : <div className="library-empty"><div className="empty-orb"><FolderKanban size={25} /></div><h3>Nothing here yet</h3><p>Your saved transformations will appear here.</p><button className="secondary-button" onClick={onNew}>Create your first transformation <ArrowRight size={14} /></button></div>}
    </section>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('New transformation');
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('flowchart');
  const [detail, setDetail] = useState('medium');
  const [language, setLanguage] = useState('English');
  const [complexity, setComplexity] = useState('beginner');
  const [audience, setAudience] = useState('students');
  const [visualStyle, setVisualStyle] = useState('professional');
  const [result, setResult] = useState(null);
  const [projects, setProjects] = useState(readProjects);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('datamind-theme') || 'dark');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const fileInputRef = useRef(null);

  const options = useMemo(() => ({ format, detail, language, complexity, audience, visual_style: visualStyle }), [format, detail, language, complexity, audience, visualStyle]);
  const characterCount = input.length;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('datamind-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, 30)));
  }, [projects]);

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setHealth({ status: 'offline', mode: 'offline', message: err.message }));
  }, []);

  function updateSaved(item) {
    setProjects((current) => {
      const index = current.findIndex((p) => p.id === item.id);
      if (index < 0) return [item, ...current].slice(0, 30);
      const updated = [...current];
      updated[index] = item;
      return updated;
    });
  }

  function handleResultChange(updated) {
    setResult(updated);
    if (projects.some((project) => project.id === updated.id)) updateSaved(updated);
  }

  async function runTransformation() {
    if (!file && !input.trim()) {
      setError('Enter some text or upload a document to get started.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = file
        ? await transformFile(file, options)
        : await transformText({ text: input, ...options });
      setResult(payload);
      if (payload.source_filename) setError('');
      setHealth((current) => ({ ...(current || {}), status: 'ok', mode: payload.mode, provider: payload.mode === 'ai' ? 'Google Gemini' : 'Local fallback' }));
    } catch (err) {
      setError(err.message || 'Transformation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefine(instruction) {
    if (!result) return;
    setLoading(true);
    setError('');
    try {
      const refined = await refineResult({ result, instruction, language, complexity });
      setResult(refined);
      if (projects.some((project) => project.id === refined.id)) updateSaved(refined);
    } catch (err) {
      setError(err.message || 'Could not refine this result.');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!result) return;
    updateSaved({ ...result, saved: true });
    setResult((current) => ({ ...current, saved: true }));
  }

  function toggleFavorite() {
    if (!result) return;
    const updated = { ...result, favorite: !result.favorite };
    setResult(updated);
    updateSaved(updated);
  }

  function selectFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const allowed = /\.(pdf|docx|txt|md|markdown)$/i.test(selected.name);
    if (!allowed) {
      setError('Choose a PDF, DOCX, TXT or MD file.');
      event.target.value = '';
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      setError('The file is larger than 8 MB.');
      event.target.value = '';
      return;
    }
    setFile(selected);
    setInput('');
    setError('');
  }

  function startNew() {
    setActiveNav('New transformation');
    setResult(null);
    setInput('');
    setFile(null);
    setError('');
    setMobileSidebar(false);
  }

  function openProject(project) {
    setResult(project);
    setActiveNav('New transformation');
    setMobileSidebar(false);
  }

  function removeProject(id) {
    setProjects((current) => current.filter((project) => project.id !== id));
    if (result?.id === id) setResult(null);
  }

  const filteredProjects = activeNav === 'Favorites'
    ? projects.filter((project) => project.favorite)
    : activeNav === 'History'
      ? projects
      : projects;
  const isLibrary = ['My projects', 'Favorites', 'History'].includes(activeNav);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark"><Sparkles size={20} fill="currentColor" /></div><div className="brand-copy"><strong>DataMind</strong><span>KNOWLEDGE, ORGANIZED</span></div><button className="mobile-close icon-button" onClick={() => setMobileSidebar(false)}><X size={17} /></button></div>
        <button className="workspace-switch"><span className="workspace-letter">D</span><span><strong>Personal workspace</strong><small>Free workspace</small></span><ChevronDown size={13} /></button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => { if (item.label === 'Templates') { setActiveNav('New transformation'); setInput(SAMPLE_TEXT); } else { setActiveNav(item.label); } setMobileSidebar(false); }}><Icon size={16} /><span>{item.label}</span>{item.label === 'New transformation' && <kbd><Command size={10} /> K</kbd>}</button>;
          })}
        </nav>
        <div className="sidebar-promo"><div className="promo-icon"><Sparkles size={16} /></div><strong>Make complex simple.</strong><p>Turn your notes into something you can actually use.</p><button onClick={startNew}>Start creating <ArrowRight size={13} /></button></div>
        <div className="sidebar-bottom"><button className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => setActiveNav('Settings')}><Settings size={16} /><span>Settings</span></button><button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span><span className={`toggle-track ${theme === 'light' ? 'on' : ''}`}><i /></span></button></div>
      </aside>
      {mobileSidebar && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileSidebar(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileSidebar(true)}><Menu size={18} /></button><span>Workspace</span><span className="slash">/</span><strong>{activeNav === 'New transformation' || activeNav === 'Overview' ? 'Transformation studio' : activeNav}</strong></div>
          <div className="topbar-actions"><div className={`connection-pill ${health?.mode === 'ai' ? 'connected' : health?.status === 'offline' ? 'offline' : ''}`}><span className="connection-dot" />{health?.mode === 'ai' ? 'AI Connected' : health?.status === 'offline' ? 'API Offline' : 'Local mode'}</div><button className="primary-button new-button" onClick={startNew}><Plus size={15} /> New transformation</button><div className="user-avatar" title="Personal workspace">AP</div></div>
        </header>

        {isLibrary ? (
          <LibraryView title={activeNav} projects={filteredProjects} onOpen={openProject} onDelete={removeProject} onNew={startNew} />
        ) : activeNav === 'Settings' ? (
          <section className="library-view settings-view"><div className="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Configure the workspace appearance and review backend connection details.</p><div className="settings-card"><div><strong>Appearance</strong><span>Choose a comfortable workspace theme.</span></div><button className="secondary-button" onClick={() => setTheme((v) => v === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</button></div><div className="settings-card"><div><strong>Backend connection</strong><span>{health?.status === 'offline' ? 'Backend is not responding.' : 'Health endpoint response.'}</span></div><span className="setting-value">{health?.provider || health?.message || 'Checking…'}</span></div><div className="settings-card"><div><strong>AI model</strong><span>Configured on the backend server.</span></div><span className="setting-value">{health?.model || 'Not available'}</span></div><div className="settings-card"><div><strong>Fallback mode</strong><span>Local generation helps keep the workspace usable when Gemini is unavailable.</span></div><span className="setting-value">{health?.fallback_enabled ? 'Enabled' : 'Not reported'}</span></div></section>
        ) : (
          <div className="studio-layout">
            <section className="composer-column">
              <div className="page-intro"><div><div className="eyebrow">AI KNOWLEDGE WORKSPACE</div><h1>Transformation studio</h1><p>Turn complex information into clear, structured knowledge.</p></div><div className="intro-sparkle"><WandSparkles size={18} /></div></div>

              <div className="panel source-panel">
                <div className="panel-heading"><div className="step-number">01</div><div><h2>Add your content</h2><p>Paste text or upload a document to get started.</p></div></div>
                <textarea className="source-input" value={input} onChange={(event) => { setInput(event.target.value); if (file) setFile(null); }} placeholder="Paste your notes, article, research, or any information here…" maxLength={40000} />
                <div className="source-footer"><span>{characterCount.toLocaleString()} / 40,000 characters</span><div className="source-actions"><input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" hidden onChange={selectFile} /><button className="upload-button" onClick={() => fileInputRef.current?.click()}><CloudUpload size={14} /> Upload document</button><button className="sample-button" onClick={() => { setInput(SAMPLE_TEXT); setFile(null); setError(''); }}>Use sample</button></div></div>
                <div className="supported-types">Supported: PDF, DOCX, TXT, MD · Max 8 MB</div>
                {file && <div className="selected-file"><FileText size={15} /><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small><button onClick={() => setFile(null)} aria-label="Remove file"><X size={14} /></button></div>}
              </div>

              <div className="panel output-panel">
                <div className="panel-heading"><div className="step-number">02</div><div><h2>Choose your output</h2><p>Pick the format that fits your goal.</p></div></div>
                <div className="format-grid">{FORMATS.map((item) => { const Icon = item.icon; return <button key={item.id} className={`format-card ${format === item.id ? 'selected' : ''}`} onClick={() => setFormat(item.id)}><span className="format-icon"><Icon size={17} /></span><span className="format-copy"><strong>{item.label}</strong><small>{item.description}</small></span><span className="format-indicator" /></button>; })}</div>
                <div className="options-divider" />
                <div className="options-heading"><strong>Customize your result</strong><span>Optional preferences</span></div>
                <div className="select-grid">
                  <label><span>Detail level</span><select value={detail} onChange={(e) => setDetail(e.target.value)}><option value="short">Short</option><option value="medium">Medium</option><option value="detailed">Detailed</option></select></label>
                  <label><span>Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Hinglish</option></select></label>
                  <label><span>Complexity</span><select value={complexity} onChange={(e) => setComplexity(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
                  <label><span>Audience</span><select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="students">Students</option><option value="professionals">Professionals</option><option value="developers">Developers</option><option value="general users">General users</option></select></label>
                </div>
                <label className="style-select"><span>Visual style</span><select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}><option value="professional">Professional</option><option value="minimal">Minimal</option><option value="colorful">Colorful</option></select></label>
                {error && <div className="error-banner"><Activity size={15} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
                <button className="generate-button" onClick={runTransformation} disabled={loading || (!file && !input.trim())}>{loading ? <><span className="button-spinner" /> Transforming your content…</> : <><Sparkles size={16} /> Generate transformation <ArrowRight size={16} /></>}</button>
                <p className="privacy-note">Your Gemini API key stays on the backend. Never add it to frontend files.</p>
              </div>
            </section>

            <section className="result-column">
              {result ? (
                <ResultPanel result={result} onChange={handleResultChange} onRefine={handleRefine} onRegenerate={runTransformation} busy={loading} onSave={handleSave} saved={Boolean(result.saved)} onToggleFavorite={toggleFavorite} />
              ) : (
                <div className="result-placeholder"><div className="placeholder-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="placeholder-center"><Sparkles size={25} /></div><div className="art-node node-one"><FileText size={15} /></div><div className="art-node node-two"><NetworkIcon /></div><div className="art-node node-three"><BookOpen size={15} /></div></div><h2>Your result will appear here</h2><p>Add your content, choose an output format, and let DataMind organize it into something useful.</p><div className="placeholder-features"><span><Check size={13} /> Clear written breakdown</span><span><Check size={13} /> Visual diagrams</span><span><Check size={13} /> Exportable results</span></div><button className="use-sample-link" onClick={() => { setInput(SAMPLE_TEXT); setFile(null); }}>Try a sample transformation <ArrowRight size={13} /></button></div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function NetworkIcon() {
  return <FolderKanban size={15} />;
}
