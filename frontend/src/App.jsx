import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Clock3,
  FileText, Filter, FolderOpen, LayoutGrid, LoaderCircle,
  Plus, Search, ShieldCheck, Sparkles, Star, UploadCloud, X, Zap,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import FormatPicker from './components/FormatPicker';
import ResultPanel from './components/ResultPanel';
import { FORMATS, TEMPLATES } from './data/formats';
import { getHealth, refineResult, transformFile, transformText } from './services/api';
import { readProjects, removeProject, upsertProject } from './utils/storage';

const DEFAULT_INPUT = 'Machine Learning is a branch of Artificial Intelligence. It allows computers to learn patterns from data and make predictions. The main types are supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labelled data, unsupervised learning finds patterns in unlabelled data, and reinforcement learning learns through rewards and feedback.';
const DEFAULT_SETTINGS = { detail: 'medium', language: 'English', complexity: 'beginner', audience: 'students', visual_style: 'professional' };

function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('datamind.theme') === 'dark');
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [format, setFormat] = useState('flowchart');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [result, setResult] = useState(null);
  const [projects, setProjects] = useState(() => readProjects());
  const [health, setHealth] = useState({ status: 'checking', mode: 'unknown' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [mobileFormatOpen, setMobileFormatOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('datamind.theme', dark ? 'dark' : 'light');
  }, [dark]);

  const refreshHealth = useCallback(async () => {
    try { const data = await getHealth(); setHealth({ status: 'online', mode: data.mode, provider: data.provider, model: data.model }); }
    catch { setHealth({ status: 'offline', mode: 'unknown' }); }
  }, []);

  useEffect(() => { refreshHealth(); }, [refreshHealth]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setActivePage('studio'); }
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.format}`.toLowerCase().includes(search.toLowerCase())), [projects, search]);
  const favorites = useMemo(() => projects.filter((project) => project.favorite), [projects]);
  const savedCount = projects.length;
  const activeFormat = FORMATS.find((item) => item.id === format) || FORMATS[0];

  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2600); }

  function startNew() {
    setResult(null); setInput(''); setSelectedFile(null); setError(''); setFormat('flowchart'); setSettings(DEFAULT_SETTINGS); setActivePage('studio');
  }

  function openProject(project) {
    setResult(project.result || project);
    setInput(project.sourceText || '');
    setFormat(project.format || project.result?.format || 'summary');
    setSelectedFile(null); setError(''); setActivePage('studio');
  }

  function saveCurrentProject() {
    if (!result) return;
    const existing = projects.find((item) => item.id === result.id);
    const project = { ...result, sourceText: input, favorite: result.favorite ?? existing?.favorite ?? false };
    const updated = upsertProject(project);
    setProjects(updated);
    setResult(project);
    notify('Project saved in this browser');
  }

  function toggleFavorite() {
    if (!result) return;
    const updatedResult = { ...result, favorite: !result.favorite };
    setResult(updatedResult);
    const updated = upsertProject({ ...updatedResult, sourceText: input });
    setProjects(updated);
    notify(updatedResult.favorite ? 'Added to favorites' : 'Removed from favorites');
  }

  async function generate() {
    if (!selectedFile && !input.trim()) { setError('Add some text or choose a document before generating.'); return; }
    setBusy(true); setError('');
    try {
      const payload = selectedFile
        ? await transformFile(selectedFile, { format, ...settings })
        : await transformText({ text: input, format, ...settings });
      setResult(payload);
      setActivePage('studio');
      setHealth((current) => ({ ...current, status: 'online', mode: payload.mode }));
    } catch (err) { setError(err.message || 'Transformation failed. Please try again.'); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    if (!input.trim() && !selectedFile) { notify('Original input is not available. Add it again to regenerate.'); return; }
    await generate();
  }

  async function handleRefine(instruction) {
    if (!result) return;
    setBusy(true); setError('');
    try {
      const updated = await refineResult({ instruction, result, language: settings.language, complexity: settings.complexity });
      setResult(updated);
      notify(updated.mode === 'ai' ? 'Result refined with Gemini' : 'Demo refinement applied');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function chooseTemplate(template) {
    setInput(template.prompt); setFormat(template.format); setSelectedFile(null); setResult(null); setError(''); setActivePage('studio');
  }

  function handleDeleteProject(id) {
    const updated = removeProject(id); setProjects(updated); notify('Project deleted from this browser');
  }

  const pageMotion = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 }, transition: { duration: 0.2 } };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} dark={dark} onTheme={() => setDark((v) => !v)} collapsed={collapsed} onCollapse={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className={`main-area ${collapsed ? 'main-expanded' : ''}`}>
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><LayoutGrid size={19} /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activePage === 'studio' ? 'Transformation studio' : activePage.charAt(0).toUpperCase() + activePage.slice(1)}</strong></div></div>
          <div className="topbar-right"><div className={`connection-pill ${health.status}`}><span />{health.status === 'checking' ? 'Checking API' : health.status === 'online' ? (health.mode === 'ai' ? 'AI connected' : 'Demo mode') : 'API offline'}</div><button className="topbar-new" onClick={startNew}><Plus size={16} />New transformation</button><div className="topbar-avatar">G</div></div>
        </header>

        <div className="page-content">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && <motion.div key="dashboard" {...pageMotion}>
              <section className="welcome-hero"><div className="hero-copy"><div className="hero-kicker"><span className="hero-kicker-dot" /> YOUR PERSONAL KNOWLEDGE WORKSPACE</div><h1>Make sense of <span>everything.</span></h1><p>Turn scattered information into clear ideas, beautiful diagrams, and knowledge that sticks.</p><div className="hero-actions"><button className="primary-button large" onClick={startNew}>Start transforming <ArrowRight size={17} /></button><button className="hero-link" onClick={() => setActivePage('templates')}>Explore templates <ArrowUpRight size={15} /></button></div><div className="hero-trust"><span><ShieldCheck size={14} /> Private in this browser</span><span><Zap size={14} /> 12 output formats</span></div></div><div className="hero-visual" aria-hidden="true"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-center"><Sparkles size={35} /></div><div className="visual-chip chip-one"><GitIcon />Flowchart</div><div className="visual-chip chip-two"><BookOpen size={14} />Structured notes</div><div className="visual-chip chip-three"><Activity size={14} />Mind map</div><div className="visual-node node-one" /><div className="visual-node node-two" /><div className="visual-node node-three" /></div></section>

              <div className="section-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h2>Everything starts with an idea</h2></div><button className="text-button" onClick={() => setActivePage('projects')}>View all projects <ArrowRight size={14} /></button></div>
              <div className="stats-grid"><StatCard icon={FolderOpen} label="Saved projects" value={savedCount} note="Stored in this browser" tone="purple" /><StatCard icon={Star} label="Favorites" value={favorites.length} note="Your go-to transformations" tone="amber" /><StatCard icon={Clock3} label="Output formats" value="12" note="One idea, many ways to learn" tone="mint" /><StatCard icon={Activity} label="API status" value={health.status === 'online' ? 'Connected' : health.status === 'checking' ? 'Checking' : 'Offline'} note={health.mode === 'ai' ? 'Gemini AI enabled' : 'Demo mode available'} tone="blue" /> </div>

              <div className="section-heading templates-heading"><div><div className="eyebrow">QUICK START</div><h2>Pick a starting point</h2><p>Try a template or bring your own information.</p></div></div>
              <div className="quick-template-grid">{TEMPLATES.slice(0, 4).map((template, index) => { const FormatIcon = FORMATS.find((item) => item.id === template.format)?.icon || FileText; return <button className="quick-template" key={template.title} onClick={() => chooseTemplate(template)}><span className={`quick-template-icon tone-${index}`}><FormatIcon size={19} /></span><strong>{template.title}</strong><small>{template.category}</small><ArrowUpRight className="quick-template-arrow" size={16} /></button>; })}</div>

              <div className="section-heading recent-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Recent projects</h2></div><button className="text-button" onClick={() => setActivePage('history')}>See history <ArrowRight size={14} /></button></div>
              {projects.length ? <div className="project-list">{projects.slice(0, 4).map((project) => <ProjectRow key={project.id} project={project} onOpen={() => openProject(project)} onDelete={() => handleDeleteProject(project.id)} />)}</div> : <EmptyState icon={FolderOpen} title="Your workspace is ready" description="Your saved transformations will show up here. Start with a topic or a template." action="Create your first project" onAction={startNew} />}
            </motion.div>}

            {activePage === 'studio' && <motion.div key="studio" {...pageMotion}>
              <PageHeader eyebrow="TRANSFORMATION STUDIO" title="What are we making today?" description="Add your information, choose a format, and let DataMind organize the thinking." action={<div className="studio-mode-note"><span className={health.status === 'online' ? 'status-dot' : 'status-dot muted'} />{health.mode === 'ai' ? 'Gemini AI ready' : 'Demo mode available'}</div>} />
              <div className="studio-layout">
                <section className="input-column">
                  <div className="panel-card input-card"><div className="panel-card-heading"><div><span className="step-number">01</span><div><h3>Your source material</h3><p>Paste text or upload a document</p></div></div><span className="optional-label">REQUIRED</span></div>
                    <textarea className="source-textarea" value={input} onChange={(event) => { setInput(event.target.value); setSelectedFile(null); }} placeholder="Paste your raw data, topic, notes, or information here..." maxLength={40000} />
                    <div className="input-footer"><span>{input.length.toLocaleString()} / 40,000 characters</span><div className="input-tools"><label className="upload-label"><UploadCloud size={15} />{selectedFile ? selectedFile.name : 'Upload document'}<input type="file" accept=".pdf,.txt,.md,.docx" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setSelectedFile(file); setInput(''); setError(''); } event.target.value = ''; }} /></label><button className="subtle-tool" onClick={() => { setInput(DEFAULT_INPUT); setSelectedFile(null); }}>Use sample</button></div></div>
                    {selectedFile && <div className="selected-file"><FileText size={15} /><span>{selectedFile.name}</span><small>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</small><button onClick={() => setSelectedFile(null)} aria-label="Remove file"><X size={14} /></button></div>}
                    <div className="supported-files">Supported: PDF, DOCX, TXT, MD · Max 8 MB</div>
                  </div>

                  <div className="panel-card format-card"><div className="panel-card-heading"><div><span className="step-number">02</span><div><h3>Choose your output</h3><p>Pick the format that fits your goal</p></div></div><button className="text-button format-mobile-toggle" onClick={() => setMobileFormatOpen((v) => !v)}>{mobileFormatOpen ? 'Hide' : 'Show'} formats <ChevronDown size={14} /></button></div><div className={mobileFormatOpen ? '' : 'mobile-format-collapse'}><FormatPicker value={format} onChange={setFormat} compact /></div><div className="selected-format-note"><span className="selected-check"><Check size={12} /></span><strong>{activeFormat.label}</strong><span>{activeFormat.description}</span></div></div>

                  <div className="panel-card settings-card"><button className="settings-heading" onClick={() => setShowAdvanced((v) => !v)}><div><span className="step-number">03</span><div><h3>Customize your result</h3><p>Choose the level of detail and style</p></div></div><ChevronDown className={showAdvanced ? 'rotate-chevron' : ''} size={18} /></button>{showAdvanced && <div className="settings-grid"><SettingSelect label="Detail level" value={settings.detail} onChange={(value) => setSettings((s) => ({ ...s, detail: value }))} options={['short', 'medium', 'detailed']} /><SettingSelect label="Language" value={settings.language} onChange={(value) => setSettings((s) => ({ ...s, language: value }))} options={['English', 'Hindi', 'Hinglish']} /><SettingSelect label="Complexity" value={settings.complexity} onChange={(value) => setSettings((s) => ({ ...s, complexity: value }))} options={['beginner', 'intermediate', 'advanced']} /><SettingSelect label="Target audience" value={settings.audience} onChange={(value) => setSettings((s) => ({ ...s, audience: value }))} options={['students', 'professionals', 'developers', 'general users']} /><SettingSelect label="Visual style" value={settings.visual_style} onChange={(value) => setSettings((s) => ({ ...s, visual_style: value }))} options={['minimal', 'professional', 'colorful']} /></div>}</div>

                  {error && <div className="error-banner"><X size={16} />{error}</div>}
                  <button className="generate-button" onClick={generate} disabled={busy || (!input.trim() && !selectedFile)}>{busy ? <><LoaderCircle className="spin" size={18} />Transforming your information...</> : <><Sparkles size={18} />Generate transformation <ArrowRight size={17} /></>}</button>
                  <p className="privacy-note"><ShieldCheck size={13} /> Your input is processed by the configured backend. Avoid uploading confidential information.</p>
                </section>

                <section className="output-column">{result ? <ResultPanel result={result} onChange={setResult} onRefine={handleRefine} onRegenerate={regenerate} busy={busy} onSave={saveCurrentProject} saved={projects.some((item) => item.id === result.id)} onToggleFavorite={toggleFavorite} /> : <div className="output-empty"><div className="empty-illustration"><div className="empty-paper paper-back" /><div className="empty-paper paper-front"><div /><div /><div /><span><Sparkles size={20} /></span></div><div className="empty-spark spark-a">✦</div><div className="empty-spark spark-b">✧</div></div><span className="eyebrow">YOUR CANVAS</span><h3>Your ideas, made clearer.</h3><p>Your transformed content will appear here. Choose an output format and generate your first result.</p><div className="output-empty-points"><span><Check size={14} /> Easy to edit</span><span><Check size={14} /> Ready to export</span><span><Check size={14} /> Made to understand</span></div></div>}</section>
              </div>
            </motion.div>}

            {['projects', 'favorites', 'history'].includes(activePage) && <motion.div key={activePage} {...pageMotion}>
              <PageHeader eyebrow="YOUR LIBRARY" title={activePage === 'favorites' ? 'Favorite transformations' : activePage === 'history' ? 'Transformation history' : 'My projects'} description="Your saved work lives in this browser. Open a project to continue editing." action={<button className="primary-button" onClick={startNew}><Plus size={16} />New project</button>} />
              <div className="library-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search your projects..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ F</kbd></div><div className="library-count"><Filter size={15} />{(activePage === 'favorites' ? filteredProjects.filter((p) => p.favorite) : filteredProjects).length} items</div></div>
              <div className="project-list spacious">{(activePage === 'favorites' ? filteredProjects.filter((p) => p.favorite) : filteredProjects).map((project) => <ProjectRow key={project.id} project={project} onOpen={() => openProject(project)} onDelete={() => handleDeleteProject(project.id)} />)}</div>
              {(activePage === 'favorites' ? filteredProjects.filter((p) => p.favorite) : filteredProjects).length === 0 && <EmptyState icon={activePage === 'favorites' ? Star : FolderOpen} title={activePage === 'favorites' ? 'No favorites yet' : 'No saved projects found'} description={search ? 'Try another search term.' : 'Save a transformation from the studio and it will appear here.'} action="Create a transformation" onAction={startNew} />}
              <p className="storage-disclaimer"><ShieldCheck size={14} /> Saved locally in this browser. Clearing browser data may remove these projects.</p>
            </motion.div>}

            {activePage === 'templates' && <motion.div key="templates" {...pageMotion}><PageHeader eyebrow="TEMPLATE GALLERY" title="A head start for every idea" description="Choose a ready-made example, then customize it with your own content." action={<span className="template-count">{TEMPLATES.length} STARTER TEMPLATES</span>} /><div className="template-categories"><span className="category-pill active">All templates</span><span className="category-pill">Computer Science</span><span className="category-pill">Technology</span><span className="category-pill">Research</span><span className="category-pill">Business</span><span className="category-pill">Education</span></div><div className="template-gallery">{TEMPLATES.map((template, index) => { const icon = FORMATS.find((item) => item.id === template.format)?.icon || FileText; const Icon = icon; return <article className="template-card" key={template.title}><div className={`template-art template-art-${index % 4}`}><div className="template-art-lines"><i /><i /><i /><i /></div><div className="template-art-badge"><Icon size={19} /></div></div><div className="template-card-body"><span>{template.category}</span><h3>{template.title}</h3><p>{template.prompt}</p><button className="template-use" onClick={() => chooseTemplate(template)}>Use template <ArrowRight size={14} /></button></div></article>; })}</div></motion.div>}

            {activePage === 'settings' && <motion.div key="settings" {...pageMotion}><PageHeader eyebrow="PREFERENCES" title="Settings" description="Manage how DataMind looks and connects." /><div className="settings-page-grid"><section className="panel-card preferences-card"><div className="preference-row"><div><strong>Appearance</strong><p>Choose your workspace theme.</p></div><div className="segmented"><button className={!dark ? 'active' : ''} onClick={() => setDark(false)}>Light</button><button className={dark ? 'active' : ''} onClick={() => setDark(true)}>Dark</button></div></div><div className="preference-row"><div><strong>API connection</strong><p>Backend status and generation mode.</p></div><div className="connection-detail"><span className={`connection-dot ${health.status}`} />{health.status === 'online' ? (health.mode === 'ai' ? 'Gemini enabled' : 'Demo mode') : health.status === 'checking' ? 'Checking...' : 'Offline'}<button className="text-button" onClick={refreshHealth}>Refresh</button></div></div><div className="preference-row"><div><strong>Workspace storage</strong><p>Projects are saved in local browser storage.</p></div><span className="local-badge"><ShieldCheck size={14} />Local only</span></div><div className="preference-row"><div><strong>DataMind version</strong><p>Guest MVP · React + FastAPI</p></div><span className="version-label">v1.0.0</span></div></section><section className="panel-card about-card"><div className="about-logo"><Sparkles size={22} /></div><h3>DataMind</h3><p>Turn Raw Data Into Clear Understanding.</p><div className="about-divider" /><div className="about-detail"><span>Frontend</span><strong>React + Vite</strong></div><div className="about-detail"><span>Backend</span><strong>Python FastAPI</strong></div><div className="about-detail"><span>AI provider</span><strong>{health.mode === 'ai' ? 'Google Gemini' : 'Local demo engine'}</strong></div></section></div></motion.div>}
          </AnimatePresence>
        </div>
        <footer className="app-footer"><span>© 2026 DataMind</span><span>Turn Raw Data Into Clear Understanding.</span><span>Built for curious minds <Sparkles size={12} /></span></footer>
      </main>
      {toast && <div className="toast-message"><Check size={15} />{toast}</div>}
    </div>
  );
}

function SettingSelect({ label, value, onChange, options }) {
  return <label className="setting-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option} key={option}>{option.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select></label>;
}

function ProjectRow({ project, onOpen, onDelete }) {
  const FormatIcon = FORMATS.find((item) => item.id === project.format)?.icon || FileText;
  return <article className="project-row"><div className="project-file-icon"><FormatIcon size={18} /></div><button className="project-row-main" onClick={onOpen}><strong>{project.title || 'Untitled transformation'}</strong><span>{FORMATS.find((item) => item.id === project.format)?.label || 'Transformation'} · {project.mode === 'ai' ? 'Gemini AI' : 'Demo'}</span></button><span className="project-date">{new Date(project.updatedAt || project.createdAt || project.created_at || Date.now()).toLocaleDateString()}</span>{project.favorite && <Star className="project-star" size={15} fill="currentColor" />}<button className="project-open" onClick={onOpen} aria-label="Open project"><ArrowUpRight size={17} /></button><button className="project-delete" onClick={onDelete} aria-label="Delete project"><X size={16} /></button></article>;
}

function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return <div className="empty-state"><div><Icon size={23} /></div><h3>{title}</h3><p>{description}</p>{action && <button className="secondary-button" onClick={onAction}>{action} <ArrowRight size={14} /></button>}</div>;
}

function GitIcon() { return <span className="git-icon">⌘</span>; }
