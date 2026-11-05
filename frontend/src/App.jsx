import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2,
  ChevronDown, Clock3, CloudUpload, Command, FileText, Filter,
  FolderKanban, FolderOpen, Gauge, History, LayoutDashboard, Lightbulb,
  Menu, Moon, Network, Plus, Search, Settings, ShieldCheck, Sparkles,
  Star, Sun, Trash2, WandSparkles, X, Zap,
} from 'lucide-react';
import ResultPanel from './components/ResultPanel';
import { FORMATS, SAMPLE_TEXT } from './data/formats';
import { getHealth, refineResult, transformFile, transformText } from './services/api';

const PROJECTS_KEY = 'datamind-projects-v3';
const HISTORY_KEY = 'datamind-history-v3';
const THEME_KEY = 'datamind-theme';
const MAX_HISTORY = 30;

const NAV = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'New transformation', icon: Plus },
  { label: 'My projects', icon: FolderKanban },
  { label: 'Templates', icon: BookOpen },
  { label: 'Favorites', icon: Star },
  { label: 'History', icon: History },
];

const TEMPLATE_COPY = {
  flowchart: 'Turn a process into a clean, readable visual sequence.',
  mindmap: 'Explore the central idea and its connected concepts.',
  structured_notes: 'Convert rough material into organized study notes.',
  infographic: 'Pull out the most important facts into visual cards.',
  timeline: 'Arrange milestones, events, and stages in order.',
  comparison_table: 'Compare important concepts side by side.',
  step_by_step: 'Create a practical, easy-to-follow action guide.',
  flashcards: 'Practice key ideas with question-and-answer cards.',
  summary: 'Condense long material into essential takeaways.',
  workflow: 'Map a repeatable process from start to finish.',
  mermaid: 'Generate editable Mermaid syntax for your diagrams.',
  presentation: 'Organize source material into a slide-by-slide outline.',
};

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function cleanExcerpt(value = '') {
  return String(value).replace(/[#>*`|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 145);
}

function LibraryView({ title, projects, onOpen, onDelete, onNew }) {
  const [query, setQuery] = useState('');
  const filtered = projects.filter((item) => `${item.title || ''} ${item.format || ''} ${item.content || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="library-view workspace-view">
      <div className="library-heading">
        <div><div className="eyebrow">YOUR WORKSPACE</div><h1>{title}</h1><p>Pick up where you left off. Your work is stored in this browser.</p></div>
        <button className="primary-button" onClick={onNew}><Plus size={15} /> New transformation</button>
      </div>
      <div className="library-toolbar">
        <label className="search-field"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} /></label>
        <span className="result-count"><Filter size={13} /> {filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span>
      </div>
      {filtered.length ? <div className="project-grid">{filtered.map((project) => <article className="project-card" key={project.id}>
        <div className="project-card-icon"><FileText size={18} /></div>
        <div className="project-card-body"><strong>{project.title || 'Untitled transformation'}</strong><span>{(project.format || 'notes').replaceAll('_', ' ')} · {formatDate(project.created_at)}</span><p>{cleanExcerpt(project.content)}</p></div>
        <div className="project-card-actions"><button className="text-button" onClick={() => onOpen(project)}>Open <ArrowRight size={13} /></button><button className="icon-button danger-button" title="Remove project" onClick={() => onDelete(project.id)}><Trash2 size={14} /></button></div>
      </article>)}</div> : <div className="library-empty"><div className="empty-orb"><FolderOpen size={25} /></div><h3>{query ? 'No matching work' : 'Nothing here yet'}</h3><p>{query ? 'Try another search term.' : 'Your saved transformations will appear here.'}</p>{!query && <button className="secondary-button" onClick={onNew}>Create your first transformation <ArrowRight size={14} /></button>}</div>}
    </section>
  );
}

function FormatCard({ item, selected, onClick, compact = false }) {
  const Icon = item.icon;
  return <button className={`format-card ${selected ? 'selected' : ''} ${compact ? 'template-card' : ''}`} onClick={onClick}>
    <span className="format-icon"><Icon size={17} /></span>
    <span className="format-copy"><strong>{item.label}</strong><small>{TEMPLATE_COPY[item.id] || item.description}</small></span>
    <span className="format-indicator" />
  </button>;
}

function OverviewView({ projects, history, health, onNew, onOpen, onTemplate, onNavigate }) {
  const favorites = projects.filter((project) => project.favorite).length;
  const latest = history.slice(0, 4);
  return <section className="overview-view workspace-view">
    <div className="overview-hero">
      <div><div className="eyebrow">YOUR KNOWLEDGE WORKSPACE</div><h1>Good work starts with clarity.</h1><p>Transform notes, research, and documents into knowledge you can actually use.</p><div className="overview-hero-actions"><button className="primary-button" onClick={onNew}><Sparkles size={15} /> Create transformation <ArrowRight size={15} /></button><button className="quiet-button" onClick={() => onNavigate('Templates')}>Explore templates <ArrowUpRight size={14} /></button></div></div>
      <div className="hero-illustration"><div className="hero-glow"/><div className="hero-orbit hero-orbit-a"/><div className="hero-orbit hero-orbit-b"/><div className="hero-core"><Sparkles size={28}/></div><span className="hero-float hero-float-a"><FileText size={16}/></span><span className="hero-float hero-float-b"><Network size={16}/></span><span className="hero-float hero-float-c"><BookOpen size={16}/></span></div>
    </div>
    <div className="stats-grid">
      <article className="stat-card"><span className="stat-icon purple"><WandSparkles size={17}/></span><div><small>Transformations</small><strong>{history.length}</strong><span>Created in this browser</span></div></article>
      <article className="stat-card"><span className="stat-icon teal"><FolderKanban size={17}/></span><div><small>Saved projects</small><strong>{projects.length}</strong><span>Ready to revisit</span></div></article>
      <article className="stat-card"><span className="stat-icon amber"><Star size={17}/></span><div><small>Favorites</small><strong>{favorites}</strong><span>Your quick-access work</span></div></article>
      <article className="stat-card"><span className={`stat-icon ${health?.status === 'offline' ? 'rose' : 'teal'}`}><Activity size={17}/></span><div><small>Workspace status</small><strong className="status-stat">{health?.status === 'offline' ? 'Local mode' : health?.mode === 'ai' ? 'AI connected' : 'Ready'}</strong><span>{health?.status === 'offline' ? 'Backend not reachable' : health?.mode === 'ai' ? 'Gemini provider available' : 'Fallback available'}</span></div></article>
    </div>
    <div className="overview-columns">
      <section className="overview-section"><div className="section-heading"><div><h2>Start with a format</h2><p>Choose the kind of result you want to create.</p></div><button className="text-button" onClick={() => onNavigate('Templates')}>All templates <ArrowRight size={13}/></button></div><div className="quick-template-grid">{FORMATS.slice(0, 4).map((item) => <FormatCard key={item.id} item={item} compact onClick={() => onTemplate(item.id)}/>)}</div></section>
      <section className="overview-section recent-section"><div className="section-heading"><div><h2>Recent activity</h2><p>Your latest transformations.</p></div><button className="text-button" onClick={() => onNavigate('History')}>View history <ArrowRight size={13}/></button></div>
        {latest.length ? <div className="recent-list">{latest.map((item) => <button className="recent-item" key={item.id} onClick={() => onOpen(item)}><span className="recent-icon"><FileText size={15}/></span><span className="recent-copy"><strong>{item.title || 'Untitled transformation'}</strong><small>{(item.format || 'notes').replaceAll('_', ' ')} · {formatDate(item.created_at)}</small></span><ArrowUpRight size={14}/></button>)}</div> : <div className="recent-empty"><Clock3 size={20}/><span>Your activity will show up here after your first transformation.</span></div>}
      </section>
    </div>
    <div className="trust-strip"><span><ShieldCheck size={15}/> API keys stay on your backend</span><span><Zap size={15}/> Automatic local fallback</span><span><Gauge size={15}/> Token-conscious requests</span></div>
  </section>;
}

function TemplatesView({ onChoose }) {
  return <section className="library-view workspace-view templates-view"><div className="library-heading"><div><div className="eyebrow">THE DATA MIND TOOLKIT</div><h1>Templates</h1><p>Choose an output format for the information you want to understand.</p></div></div><div className="all-template-grid">{FORMATS.map((item) => <div className="template-tile" key={item.id}><FormatCard item={item} compact onClick={() => onChoose(item.id)}/><p>{TEMPLATE_COPY[item.id] || item.description}</p><button className="template-use" onClick={() => onChoose(item.id)}>Use this format <ArrowRight size={13}/></button></div>)}</div></section>;
}

export default function App() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('flowchart');
  const [detail, setDetail] = useState('medium');
  const [language, setLanguage] = useState('English');
  const [complexity, setComplexity] = useState('beginner');
  const [audience, setAudience] = useState('students');
  const [visualStyle, setVisualStyle] = useState('professional');
  const [result, setResult] = useState(null);
  const [projects, setProjects] = useState(() => readStorage(PROJECTS_KEY));
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY));
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const sourcePanelRef = useRef(null);

  const options = useMemo(() => ({ format, detail, language, complexity, audience, visual_style: visualStyle }), [format, detail, language, complexity, audience, visualStyle]);
  const characterCount = input.length;
  const isLibrary = ['My projects', 'Favorites', 'History'].includes(activeNav);
  const visibleProjects = activeNav === 'Favorites' ? projects.filter((project) => project.favorite) : activeNav === 'History' ? history : projects;

  const addToHistory = useCallback((item) => {
    setHistory((current) => [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 40))); } catch { setError('Browser storage is full. Remove older saved projects to continue saving.'); }
  }, [projects]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY))); } catch { /* History is best-effort; it must not interrupt transformations. */ }
  }, [history]);

  useEffect(() => {
    let mounted = true;
    getHealth().then((data) => { if (mounted) setHealth(data); }).catch((err) => { if (mounted) setHealth({ status: 'offline', mode: 'offline', message: err.message }); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        startNew();
      } else if (!typing && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        startNew();
      } else if (event.key === 'Escape') {
        setMobileSidebar(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // startNew is intentionally stable in behavior; this listener is installed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(label) {
    setActiveNav(label);
    setMobileSidebar(false);
    setError('');
  }

  function updateSaved(item) {
    setProjects((current) => {
      const index = current.findIndex((project) => project.id === item.id);
      if (index < 0) return [{ ...item, saved: true }, ...current].slice(0, 40);
      const updated = [...current];
      updated[index] = { ...item, saved: true };
      return updated;
    });
  }

  function updateHistory(item) {
    addToHistory(item);
  }

  function handleResultChange(updated) {
    setResult(updated);
    updateHistory(updated);
    if (projects.some((project) => project.id === updated.id)) updateSaved(updated);
  }

  async function runTransformation(sourceOverride) {
    const sourceText = typeof sourceOverride === 'string' ? sourceOverride : input;
    if (!file && !sourceText.trim()) {
      setError('Add some text or upload a document to get started.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = file && sourceOverride === undefined ? await transformFile(file, options) : await transformText({ text: sourceText, ...options });
      const enriched = { ...payload, source_text: sourceText ? sourceText.slice(0, 40000) : (payload.source_text || ''), source_filename: payload.source_filename || file?.name || null, options_snapshot: options };
      setResult(enriched);
      updateHistory(enriched);
      setHealth((current) => ({ ...(current || {}), status: 'ok', mode: payload.mode || 'demo', provider: payload.mode === 'ai' ? 'Google Gemini' : 'Local fallback' }));
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
      const enriched = { ...refined, id: result.id, source_text: result.source_text || '', saved: result.saved, favorite: result.favorite };
      setResult(enriched);
      updateHistory(enriched);
      if (projects.some((project) => project.id === result.id)) updateSaved(enriched);
    } catch (err) {
      setError(err.message || 'Could not refine this result.');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!result) return;
    const saved = { ...result, saved: true };
    updateSaved(saved);
    setResult(saved);
    updateHistory(saved);
  }

  function toggleFavorite() {
    if (!result) return;
    const shouldSave = projects.some((project) => project.id === result.id) || !result.favorite;
    const updated = { ...result, favorite: !result.favorite, saved: result.saved || shouldSave };
    setResult(updated);
    updateHistory(updated);
    if (shouldSave) updateSaved(updated);
  }

  function acceptFile(selected) {
    if (!selected) return;
    const allowed = /\.(pdf|docx|txt|md|markdown)$/i.test(selected.name);
    if (!allowed) { setError('Choose a PDF, DOCX, TXT, or MD file.'); return; }
    if (selected.size > 8 * 1024 * 1024) { setError('The file is larger than 8 MB.'); return; }
    setFile(selected);
    setInput('');
    setError('');
    navigate('New transformation');
  }

  function selectFile(event) {
    acceptFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function startNew() {
    setActiveNav('New transformation');
    setResult(null);
    setInput('');
    setFile(null);
    setError('');
    setMobileSidebar(false);
  }

  function chooseTemplate(formatId) {
    setFormat(formatId);
    setActiveNav('New transformation');
    setInput((current) => current.trim() ? current : SAMPLE_TEXT);
    setFile(null);
    setResult(null);
    setError('');
    setMobileSidebar(false);
  }

  function openProject(project) {
    setResult(project);
    setInput(project.source_text || '');
    setFile(null);
    setFormat(project.format || 'structured_notes');
    if (project.options_snapshot) {
      setDetail(project.options_snapshot.detail || 'medium');
      setLanguage(project.options_snapshot.language || 'English');
      setComplexity(project.options_snapshot.complexity || 'beginner');
      setAudience(project.options_snapshot.audience || 'students');
      setVisualStyle(project.options_snapshot.visual_style || 'professional');
    }
    setActiveNav('New transformation');
    setMobileSidebar(false);
  }

  function removeProject(id) {
    setProjects((current) => current.filter((project) => project.id !== id));
    setHistory((current) => current.filter((item) => item.id !== id));
    if (result?.id === id) setResult(null);
  }

  async function regenerate() {
    const source = result?.source_text || input;
    if (!source?.trim()) {
      setError('The original source text is not available for this saved upload. Add the text again to regenerate.');
      return;
    }
    if (result?.format) setFormat(result.format);
    await runTransformation(source);
  }

  const title = activeNav === 'New transformation' ? 'Transformation studio' : activeNav;
  const isStudio = activeNav === 'New transformation';

  return <div className="app-shell">
    <aside className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={20} fill="currentColor" /></div><div className="brand-copy"><strong>DataMind</strong><span>KNOWLEDGE, ORGANIZED</span></div><button className="mobile-close icon-button" onClick={() => setMobileSidebar(false)} aria-label="Close navigation"><X size={17} /></button></div>
      <div className="workspace-switch"><span className="workspace-letter">D</span><span><strong>Personal workspace</strong><small>Free workspace</small></span><ChevronDown size={13} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">{NAV.map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => item.label === 'New transformation' ? startNew() : navigate(item.label)}><Icon size={16} /><span>{item.label}</span>{item.label === 'New transformation' && <kbd><Command size={10} /> K</kbd>}{item.label === 'My projects' && projects.length > 0 && <em className="nav-count">{projects.length}</em>}</button>; })}</nav>
      <div className="sidebar-promo"><div className="promo-icon"><Sparkles size={16} /></div><strong>Make complex simple.</strong><p>Turn your notes into something you can understand, share, and use.</p><button onClick={startNew}>Start creating <ArrowRight size={13} /></button></div>
      <div className="sidebar-bottom"><button className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={() => navigate('Settings')}><Settings size={16} /><span>Settings</span></button><button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span><span className={`toggle-track ${theme === 'light' ? 'on' : ''}`}><i /></span></button></div>
    </aside>
    {mobileSidebar && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileSidebar(false)} />}

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => setMobileSidebar(true)} aria-label="Open menu"><Menu size={18}/></button><span>Workspace</span><span className="slash">/</span><strong>{title}</strong></div><div className="topbar-actions"><div className={`connection-pill ${health?.mode === 'ai' ? 'connected' : health?.status === 'offline' ? 'offline' : ''}`} title={health?.message || health?.provider || ''}><span className="connection-dot"/>{health?.mode === 'ai' ? 'AI Connected' : health?.status === 'offline' ? 'API Offline · Local mode' : 'Local mode ready'}</div><button className="primary-button new-button" onClick={startNew}><Plus size={15}/> New transformation</button><div className="user-avatar" title="Personal workspace">D</div></div></header>

      {activeNav === 'Overview' && <OverviewView projects={projects} history={history} health={health} onNew={startNew} onOpen={openProject} onTemplate={chooseTemplate} onNavigate={navigate}/>}
      {isLibrary && <LibraryView title={activeNav} projects={visibleProjects} onOpen={openProject} onDelete={removeProject} onNew={startNew}/>}
      {activeNav === 'Templates' && <TemplatesView onChoose={chooseTemplate}/>}
      {activeNav === 'Settings' && <section className="library-view settings-view workspace-view"><div className="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Manage the local workspace experience and review service health.</p><div className="settings-card"><div><strong>Appearance</strong><span>Choose a comfortable workspace theme.</span></div><button className="secondary-button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</button></div><div className="settings-card"><div><strong>Backend connection</strong><span>{health?.status === 'offline' ? health.message : 'Health endpoint response'}</span></div><span className="setting-value">{health?.provider || (health?.status === 'offline' ? 'Offline' : 'Checking…')}</span></div><div className="settings-card"><div><strong>AI model</strong><span>Configured securely on the backend server.</span></div><span className="setting-value">{health?.model || 'Not available'}</span></div><div className="settings-card"><div><strong>Fallback protection</strong><span>Local transformations keep the workspace useful during provider outages.</span></div><span className="setting-value">{health?.fallback_enabled ? 'Enabled' : 'Not reported'}</span></div><div className="settings-card"><div><strong>Local data</strong><span>{projects.length} saved projects · {history.length} recent transformations</span></div><button className="secondary-button" onClick={() => { if (window.confirm('Delete all local DataMind projects and history from this browser?')) { setProjects([]); setHistory([]); setResult(null); } }}>Clear workspace data</button></div></section>}

      {isStudio && <div className="studio-layout">
        <section className="composer-column">
          <div className="page-intro"><div><div className="eyebrow">AI KNOWLEDGE WORKSPACE</div><h1>Transformation studio</h1><p>Turn complex information into clear, structured knowledge.</p></div><div className="intro-sparkle"><WandSparkles size={18}/></div></div>
          <div className={`panel source-panel ${dragging ? 'drag-active' : ''}`} ref={sourcePanelRef} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}>
            <div className="panel-heading"><div className="step-number">01</div><div><h2>Add your content</h2><p>Paste text or upload a document to get started.</p></div><span className="input-privacy"><ShieldCheck size={13}/> Private workspace</span></div>
            <textarea className="source-input" value={input} onChange={(event) => { setInput(event.target.value); if (file) setFile(null); setError(''); }} placeholder="Paste your notes, article, research, or any information here…" maxLength={40000}/>
            <div className="source-footer"><span>{characterCount.toLocaleString()} / 40,000 characters</span><div className="source-actions"><input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" hidden onChange={selectFile}/><button className="upload-button" onClick={() => fileInputRef.current?.click()}><CloudUpload size={14}/> Upload document</button><button className="sample-button" onClick={() => { setInput(SAMPLE_TEXT); setFile(null); setError(''); }}>Use sample</button></div></div>
            <div className="supported-types">Supported: PDF, DOCX, TXT, MD · Max 8 MB · Or drag a file into this panel</div>
            {file && <div className="selected-file"><FileText size={15}/><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small><button onClick={() => setFile(null)} aria-label="Remove file"><X size={14}/></button></div>}
          </div>
          <div className="panel output-panel">
            <div className="panel-heading"><div className="step-number">02</div><div><h2>Choose your output</h2><p>Pick the format that fits your goal.</p></div></div>
            <div className="format-grid">{FORMATS.map((item) => <FormatCard key={item.id} item={item} selected={format === item.id} onClick={() => setFormat(item.id)}/>)}</div>
            <div className="options-divider"/><div className="options-heading"><strong>Customize your result</strong><span>Optional preferences</span></div>
            <div className="select-grid"><label><span>Detail level</span><select value={detail} onChange={(e) => setDetail(e.target.value)}><option value="short">Short</option><option value="medium">Medium</option><option value="detailed">Detailed</option></select></label><label><span>Language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Hinglish</option></select></label><label><span>Complexity</span><select value={complexity} onChange={(e) => setComplexity(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label><span>Audience</span><select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="students">Students</option><option value="professionals">Professionals</option><option value="developers">Developers</option><option value="general users">General users</option></select></label></div>
            <label className="style-select"><span>Visual style</span><select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}><option value="professional">Professional</option><option value="minimal">Minimal</option><option value="colorful">Colorful</option></select></label>
            {error && !result && <div className="error-banner"><Activity size={15}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
            <button className="generate-button" onClick={() => runTransformation()} disabled={loading || (!file && !input.trim())}>{loading ? <><span className="button-spinner"/> Transforming your content…</> : <><Sparkles size={16}/> Generate transformation <ArrowRight size={16}/></>}</button>
            <p className="privacy-note">Your Gemini API key stays on the backend. Never add it to frontend files.</p>
          </div>
        </section>
        <section className="result-column">{error && result && <div className="error-banner result-error"><Activity size={15}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}{result ? <ResultPanel result={result} onChange={handleResultChange} onRefine={handleRefine} onRegenerate={regenerate} busy={loading} onSave={handleSave} saved={Boolean(result.saved)} onToggleFavorite={toggleFavorite}/> : <div className="result-placeholder"><div className="placeholder-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="placeholder-center"><Sparkles size={25}/></div><div className="art-node node-one"><FileText size={15}/></div><div className="art-node node-two"><Network size={15}/></div><div className="art-node node-three"><BookOpen size={15}/></div></div><h2>Your result will appear here</h2><p>Add your content, choose an output format, and let DataMind organize it into something useful.</p><div className="placeholder-features"><span><Check size={13}/> Clear written breakdown</span><span><Check size={13}/> Visual diagrams and cards</span><span><Check size={13}/> Export-ready results</span></div><button className="use-sample-link" onClick={() => { setInput(SAMPLE_TEXT); setFile(null); }}>Try a sample transformation <ArrowRight size={13}/></button></div>}</section>
      </div>}
    </main>
  </div>;
}
