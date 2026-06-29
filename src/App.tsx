import { useState, useEffect } from 'react';
import { CRMProvider } from './context/CRMContext';
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

function CRMAppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
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
      default:
        return <Dashboard onViewContract={handleManageWorkflow} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleSetTab} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

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
