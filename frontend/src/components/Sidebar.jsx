import { motion } from 'framer-motion';
import {
  Sparkles, LayoutDashboard, Plus, FolderKanban, Shapes, Star, History,
  Settings, Moon, Sun, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'studio', label: 'New transformation', icon: Plus },
  { id: 'projects', label: 'My projects', icon: FolderKanban },
  { id: 'templates', label: 'Templates', icon: Shapes },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'history', label: 'History', icon: History },
];

export default function Sidebar({ activePage, onNavigate, dark, onTheme, collapsed, onCollapse, mobileOpen, onMobileClose }) {
  return (
    <>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={onMobileClose} />}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.4} /></div>
          {!collapsed && <div className="brand-name">Data<span>Mind</span><small>KNOWLEDGE, ORGANIZED</small></div>}
          <button className="icon-button sidebar-close mobile-only" aria-label="Close menu" onClick={onMobileClose}><X size={18} /></button>
          <button className="icon-button sidebar-collapse desktop-only" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onCollapse}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        </div>

        {!collapsed && <div className="workspace-switch"><div className="workspace-avatar">D</div><div><strong>Personal workspace</strong><small>Free workspace</small></div><span className="workspace-chevron">⌄</span></div>}
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activePage === id ? 'active' : ''}`} onClick={() => { onNavigate(id); onMobileClose?.(); }} title={collapsed ? label : undefined}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {id === 'studio' && !collapsed && <kbd>⌘ K</kbd>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={15} /></div><strong>Make complex simple.</strong><p>Turn your notes into something you can actually use.</p><button onClick={() => onNavigate('studio')}>Start creating <span>→</span></button></div>}
          <button className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')} title={collapsed ? 'Settings' : undefined}><Settings size={18} /><span>Settings</span></button>
          <button className="nav-item theme-switch" onClick={onTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun size={18} /> : <Moon size={18} />}<span>{dark ? 'Light appearance' : 'Dark appearance'}</span><span className={`toggle-track ${dark ? 'on' : ''}`}><i /></span></button>
          <div className="profile-row"><div className="profile-avatar">G</div>{!collapsed && <div className="profile-copy"><strong>Guest user</strong><small>Local workspace</small></div>}<span className="profile-menu">•••</span></div>
        </div>
      </aside>
    </>
  );
}
