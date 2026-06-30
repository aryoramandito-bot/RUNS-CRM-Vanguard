import { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SalesFunnel } from './components/SalesFunnel';
import { CustomerMaster } from './components/CustomerMaster';
import { ProjectMaster } from './components/ProjectMaster';
import { ContractMaster } from './components/ContractMaster';
import { WorkflowConfig } from './components/WorkflowConfig';
import { FlowMonitor } from './components/FlowMonitor';
import { CollectionMonitor } from './components/CollectionMonitor';
import { DatabaseSync } from './components/DatabaseSync';
import { QuickMeetingLog } from './components/QuickMeetingLog';
import { Menu, Database, AlertTriangle, RefreshCw } from 'lucide-react';

function CRMAppContent() {
  const {
    hasInitialized,
    syncError,
    retryInitialPull,
    setTursoUrl,
    setTursoToken,
    setSheetUrl
  } = useCRM();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeContractFlowId, setActiveContractFlowId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('vanguard_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vanguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Switch tabs & clear details view
  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
    setActiveContractFlowId(null); // Clear active detail view
  };

  const handleManageWorkflow = (contractId: string) => {
    setActiveContractFlowId(contractId);
  };

  const renderActiveView = () => {
    // If we are monitoring a specific contract flow, display it as detail overlay
    if (activeContractFlowId) {
      return (
        <FlowMonitor 
          selectedContractId={activeContractFlowId} 
          onBackToList={() => setActiveContractFlowId(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onViewContract={handleManageWorkflow} />;
      case 'funnel':
        return <SalesFunnel onDealWon={() => setActiveTab('projects')} />;
      case 'customers':
        return <CustomerMaster />;
      case 'projects':
        return <ProjectMaster />;
      case 'contracts':
        return <ContractMaster onManageWorkflow={handleManageWorkflow} />;
      case 'workflows':
        return <WorkflowConfig />;
      case 'collections':
        return <CollectionMonitor onManageWorkflow={handleManageWorkflow} />;
      case 'sync':
        return <DatabaseSync />;
      case 'quick-log':
        return <QuickMeetingLog onLogSaved={() => setActiveTab('funnel')} />;
      default:
        return <Dashboard onViewContract={handleManageWorkflow} />;
    }
  };

  if (!hasInitialized) {
    if (syncError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '2rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '440px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'var(--accent-amber)' }} />
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Database Sync Failure</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.45 }}>
                Vanguard could not pull the latest database state. To prevent data corruption or overwriting updates from other devices, access is locked.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              color: 'var(--error)',
              fontFamily: 'monospace',
              width: '100%',
              textAlign: 'left',
              wordBreak: 'break-all'
            }}>
              Error: {syncError}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                onClick={retryInitialPull}
                className="btn btn-primary"
                style={{ width: '100%', gap: '0.5rem', justifyContent: 'center' }}
              >
                <RefreshCw size={15} /> Retry Connection
              </button>
              <button 
                onClick={() => {
                  if (window.confirm("Disconnecting from the database will revert you back to local sandbox mode. Stored credentials will be cleared. Do you wish to proceed?")) {
                    setTursoUrl('');
                    setTursoToken('');
                    setSheetUrl('');
                    // Reload page to start cleanly in sandbox
                    window.location.reload();
                  }
                }}
                className="btn btn-secondary"
                style={{ width: '100%', color: 'var(--error)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              >
                Disconnect & Run Offline
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div className="animate-fade-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Database size={40} className="gradient-text" style={{ animation: 'pulse 1.5s infinite' }} />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Synchronizing Database</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
              Fetching latest cloud state to link your session...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Header Bar */}
      <header className="mobile-header no-print">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="mobile-title">
          <span style={{ fontWeight: 800 }}>RUN SYSTEM</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', marginLeft: '0.5rem', fontWeight: 700 }}>VANGUARD</span>
        </div>
      </header>

      {/* Sidebar navigation wrapped for mobile drawer */}
      <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''} no-print`}>
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            handleSetTab(tab);
            setIsSidebarOpen(false);
          }} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {renderActiveView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <CRMProvider>
      <CRMAppContent />
    </CRMProvider>
  );
}

export default App;
