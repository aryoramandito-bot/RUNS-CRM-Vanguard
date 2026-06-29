import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { Currency, ContractStageCategory, ContractStageStatus } from '../types/crm';
import { 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Building, 
  Clock,
  Search
} from 'lucide-react';

interface CollectionMonitorProps {
  onManageWorkflow: (contractId: string) => void;
}

interface VisualMilestone {
  contractId: string;
  contractTitle: string;
  currency: Currency;
  stageId: string;
  stageName: string;
  category: ContractStageCategory;
  status: ContractStageStatus;
  dueDate: string;
  billingAmount: number;
  invoiceNumber: string | null;
  paymentReference: string | null;
  projectCode: string;
  companyName: string;
}

export const CollectionMonitor: React.FC<CollectionMonitorProps> = ({ onManageWorkflow }) => {
  const { contracts, projects, companies } = useCRM();
  const today = new Date().toISOString().split('T')[0];

  // State for Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');

  // Helper formatting
  const formatCurrency = (val: number, curr: Currency) => {
    if (curr === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(val);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(val);
    }
  };

  // Compile all Billing & Collection milestones from all contracts
  const milestones: VisualMilestone[] = [];
  contracts.forEach(c => {
    const p = projects.find(proj => proj.id === c.projectId);
    const cust = p ? companies.find(comp => comp.id === p.companyId) : null;
    
    c.stages.forEach(st => {
      if (st.category === 'Billing' || st.category === 'Collection') {
        milestones.push({
          contractId: c.id,
          contractTitle: c.title,
          currency: c.currency,
          stageId: st.id,
          stageName: st.name,
          category: st.category,
          status: st.status,
          dueDate: st.dueDate,
          billingAmount: st.billingAmount || 0,
          invoiceNumber: st.invoiceNumber || null,
          paymentReference: st.paymentReference || null,
          projectCode: p ? p.code : 'N/A',
          companyName: cust ? cust.name : 'N/A'
        });
      }
    });
  });

  // Filter milestones based on state
  const filteredMilestones = milestones.filter(m => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      m.projectCode.toLowerCase().includes(query) ||
      m.stageName.toLowerCase().includes(query) ||
      m.companyName.toLowerCase().includes(query) ||
      (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(query));
      
    const company = companies.find(c => c.name === m.companyName);
    const matchesCompany = companyFilter === 'All' || (company && company.id === companyFilter);
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    const matchesCurrency = currencyFilter === 'All' || m.currency === currencyFilter;
    
    return matchesSearch && matchesCompany && matchesCategory && matchesCurrency;
  });

  // Columns classification logic:
  // 1. OVERDUE: Any billing or collection stage with status Active/Pending whose due date is in the past (< today)
  // 2. PLANNED / SCHEDULED: Category Billing/Collection, status Pending/Active, due date >= today
  // 3. INVOICED / AWAITING PAYMENT: Category Collection with status Active (or category Billing done but Collection is pending, but Collection status Active handles this beautifully)
  // 4. SETTLED / COLLECTED: Category Collection with status Done
  
  const overdueMilestones = filteredMilestones.filter(m => m.status !== 'Done' && m.status !== 'Skipped' && m.dueDate < today);
  
  const plannedMilestones = filteredMilestones.filter(m => 
    (m.status === 'Pending') && 
    m.dueDate >= today
  );

  const invoicedMilestones = filteredMilestones.filter(m => 
    m.status === 'Active' && 
    m.dueDate >= today
  );

  const settledMilestones = filteredMilestones.filter(m => 
    m.category === 'Collection' && 
    m.status === 'Done'
  );

  // Helper to calculate totals for a list of milestones
  const getTotals = (list: VisualMilestone[]) => {
    let idr = 0;
    let usd = 0;
    list.forEach(m => {
      if (m.currency === 'IDR') {
        idr += m.billingAmount;
      } else {
        usd += m.billingAmount;
      }
    });
    return { idr, usd };
  };

  const plannedTotals = getTotals(plannedMilestones);
  const invoicedTotals = getTotals(invoicedMilestones);
  const overdueTotals = getTotals(overdueMilestones);
  const settledTotals = getTotals(settledMilestones);

  const columnHeaders = [
    { id: 'planned', title: 'Planned & Scheduled', color: 'var(--text-secondary)', count: plannedMilestones.length, list: plannedMilestones },
    { id: 'invoiced', title: 'Invoiced (Awaiting)', color: 'var(--accent-indigo)', count: invoicedMilestones.length, list: invoicedMilestones },
    { id: 'overdue', title: 'Overdue Follow-up', color: 'var(--error)', count: overdueMilestones.length, list: overdueMilestones },
    { id: 'settled', title: 'Settled & Collected', color: 'var(--success)', count: settledMilestones.length, list: settledMilestones },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Collection Monitor</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Consolidated invoice tracking board. Monitor milestones from finalization to payment settlement.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flexGrow: 1 }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search code, milestone, company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', fontSize: '0.8rem' }}
            />
          </div>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="form-input"
            style={{ width: '180px', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
          >
            <option value="All">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="form-input"
            style={{ width: '150px', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
          >
            <option value="All">All Categories</option>
            <option value="Billing">Billing Only</option>
            <option value="Collection">Collection Only</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={e => setCurrencyFilter(e.target.value)}
            className="form-input"
            style={{ width: '140px', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
          >
            <option value="All">All Currencies</option>
            <option value="IDR">IDR Only</option>
            <option value="USD">USD Only</option>
          </select>

        </div>
      </div>

      {/* Financial Aggregates Bar - Summary Cards for each Kanban column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Planned & Scheduled Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planned & Scheduled</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem' }}>
              {formatCurrency(plannedTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(plannedTotals.usd, 'USD')}
            </div>
          </div>
        </div>

        {/* Invoiced Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoiced (Awaiting)</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--accent-indigo)' }}>
              {formatCurrency(invoicedTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(invoicedTotals.usd, 'USD')}
            </div>
          </div>
        </div>

        {/* Overdue Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue Follow-up</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--error)' }}>
              {formatCurrency(overdueTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(overdueTotals.usd, 'USD')}
            </div>
          </div>
        </div>

        {/* Settled & Collected Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Settled & Collected</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--success)' }}>
              {formatCurrency(settledTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(settledTotals.usd, 'USD')}
            </div>
          </div>
        </div>

      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board">
        {columnHeaders.map(col => (
          <div key={col.id} className="kanban-column">
            
            {/* Column Header */}
            <div className="kanban-column-header">
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: col.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {col.id === 'overdue' && <AlertCircle size={14} />}
                {col.id === 'settled' && <CheckCircle2 size={14} />}
                {col.title}
              </span>
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  background: 'rgba(255,255,255,0.04)', 
                  padding: '0.1rem 0.4rem', 
                  borderRadius: '10px', 
                  color: 'var(--text-secondary)',
                  fontWeight: 700 
                }}
              >
                {col.count}
              </span>
            </div>

            {/* Column Body Cards */}
            <div className="kanban-cards-list">
              {col.list.length > 0 ? (
                col.list.map(mile => (
                  <div 
                    key={mile.stageId} 
                    className="kanban-card"
                    onClick={() => onManageWorkflow(mile.contractId)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          background: 'rgba(255,255,255,0.04)', 
                          padding: '0.1rem 0.35rem', 
                          borderRadius: '4px',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace' 
                        }}
                      >
                        {mile.projectCode}
                      </span>
                      <span className={`badge badge-${mile.category.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>
                        {mile.category}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.825rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                      {mile.stageName}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.725rem', color: 'var(--text-secondary)', margin: '0.3rem 0' }}>
                      <Building size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mile.companyName}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2', fontSize: '0.7rem', color: col.id === 'overdue' ? 'var(--error)' : 'var(--text-muted)' }}>
                        <Calendar size={11} />
                        <span>{mile.dueDate}</span>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 800, 
                          color: mile.currency === 'IDR' ? 'var(--text-primary)' : 'var(--accent-cyan)' 
                        }}
                      >
                        {formatCurrency(mile.billingAmount, mile.currency)}
                      </span>
                    </div>

                    {mile.invoiceNumber && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        <FileText size={10} className="gradient-text" />
                        <span>Invoice: <strong>{mile.invoiceNumber}</strong></span>
                      </div>
                    )}
                    
                    {mile.paymentReference && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--success)', marginTop: '0.2rem' }}>
                        <CheckCircle2 size={10} />
                        <span>Ref: <strong>{mile.paymentReference}</strong></span>
                      </div>
                    )}

                  </div>
                ))
              ) : (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                  No milestones in this stage
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
