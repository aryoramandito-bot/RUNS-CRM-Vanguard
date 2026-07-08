import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileSignature, 
  Sliders, 
  DollarSign,
  TrendingUp,
  Database,
  Sun,
  Moon,
  ClipboardList,
  LogOut
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, toggleTheme }) => {
  const { sheetUrl, tursoUrl, lastSyncTime } = useCRM();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'funnel', label: 'Sales Funnel', icon: TrendingUp },
    { id: 'quick-log', label: 'Write Log', icon: ClipboardList },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'contracts', label: 'Contracts', icon: FileSignature },
    { id: 'workflows', label: 'Workflow Config', icon: Sliders },
    { id: 'collections', label: 'Collections', icon: DollarSign },
    { id: 'sync', label: 'Database Sync', icon: Database },
  ];

  return (
    <aside 
      className="glass-panel" 
      style={{
        width: '260px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0',
        borderLeft: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        zIndex: 10,
        flexShrink: 0
      }}
    >
      <div 
        style={{
          padding: '2rem 1.5rem',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div 
          style={{
            background: 'var(--accent-gradient)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}
        >
          <TrendingUp size={20} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>RUN SYSTEM</h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.1em' }}>VANGUARD CRM</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '0.8rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                textAlign: 'left'
              }}
            >
              <Icon 
                size={18} 
                style={{ 
                  color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                  filter: isActive ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))' : 'none'
                }} 
              />
              <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div 
        style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid var(--border-glass)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}
      >
        {/* Day/Night Toggle Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Visual Mode</span>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '20px',
              fontSize: '0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid var(--border-glass)',
              cursor: 'pointer',
              background: 'var(--bg-btn-secondary)',
              color: 'var(--text-primary)'
            }}
            title={theme === 'dark' ? 'Switch to Day Visual' : 'Switch to Night Visual'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={12} style={{ color: 'var(--warning)' }} />
                <span>Day Mode</span>
              </>
            ) : (
              <>
                <Moon size={12} style={{ color: 'var(--accent-indigo)' }} />
                <span>Night Mode</span>
              </>
            )}
          </button>
        </div>

        <div>Workspace: <strong>{tursoUrl ? 'Turso SQLite' : sheetUrl ? 'Google Sheets' : 'Local Sandbox'}</strong></div>
        <div style={{ color: (tursoUrl || sheetUrl) ? 'var(--success)' : 'var(--accent-indigo)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <span>{(tursoUrl || sheetUrl) ? '● Sync Connected' : 'Active workspace: IDR/USD'}</span>
          {lastSyncTime && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Updated: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Logged-in user panel */}
        {user && (
          <div style={{
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-glass)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(34,211,238,0.3))',
                border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-indigo)',
                flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
                background: user.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                color: user.role === 'admin' ? 'var(--accent-indigo)' : 'var(--text-muted)',
                border: `1px solid ${user.role === 'admin' ? 'rgba(99,102,241,0.3)' : 'var(--border-glass)'}`,
              }}>
                {user.role}
              </span>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  gap: '0.3rem', fontSize: '0.7rem', padding: '0.2rem 0.4rem',
                  borderRadius: 'var(--radius-sm)', transition: 'all 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--error)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
