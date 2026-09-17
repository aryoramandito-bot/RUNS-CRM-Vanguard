import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { Currency, ContractStageCategory, ContractStageStatus } from '../types/crm';
import { 
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
  invoiceDate: string | null;
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

  // Compile and consolidate Billing & Collection milestones from all contracts
  const milestones: VisualMilestone[] = [];

  // Helper to sanitize stage name for pairing (e.g. "Down Payment Billing" -> "Down Payment")
  const getBaseName = (name: string) => {
    return name.replace(/\s+(Billing|Collection|Invoice)$/i, '').trim();
  };

  contracts.forEach(c => {
    const p = projects.find(proj => proj.id === c.projectId);
    const cust = p ? companies.find(comp => comp.id === p.companyId) : null;
    
    // Filter financial stages with positive billing amounts
    const finStages = c.stages.filter(st => 
      (st.category === 'Billing' || st.category === 'Collection') && 
      st.billingAmount && 
      st.billingAmount > 0
    );

    const processedIds = new Set<string>();

    finStages.forEach(st => {
      if (processedIds.has(st.id)) return;

      const baseName = getBaseName(st.name);
      
      // Look for a paired stage (e.g. matching invoiceNumber or matching baseName + billingAmount)
      const pair = finStages.find(other => 
        other.id !== st.id && 
        !processedIds.has(other.id) &&
        (
          (st.invoiceNumber && other.invoiceNumber && st.invoiceNumber === other.invoiceNumber) ||
          (getBaseName(other.name) === baseName && Math.abs((st.billingAmount || 0) - (other.billingAmount || 0)) < 1)
        )
      );

      const mergedInvoiceNumber = st.invoiceNumber || (pair?.invoiceNumber) || null;
      const mergedInvoiceDate = st.invoiceDate || (pair?.invoiceDate) || null;
      const mergedPaymentRef = st.paymentReference || (pair?.paymentReference) || null;
      
      let mergedStatus: ContractStageStatus = st.status;
      let effectiveDueDate = st.dueDate;

      if (pair) {
        processedIds.add(pair.id);
        if (pair.status === 'Done' || st.status === 'Done') {
          mergedStatus = 'Done';
        } else if (pair.status === 'Active' || st.status === 'Active') {
          mergedStatus = 'Active';
        }
        // Prefer Collection stage due date for collection tracking
        effectiveDueDate = st.category === 'Collection' ? st.dueDate : (pair.dueDate || st.dueDate);
      }

      processedIds.add(st.id);

      milestones.push({
        contractId: c.id,
        contractTitle: c.title,
        currency: c.currency,
        stageId: st.id,
        stageName: baseName || st.name,
        category: pair ? 'Collection' : st.category,
        status: mergedStatus,
        dueDate: effectiveDueDate,
        invoiceDate: mergedInvoiceDate,
        billingAmount: st.billingAmount || 0,
        invoiceNumber: mergedInvoiceNumber,
        paymentReference: mergedPaymentRef,
        projectCode: p ? p.code : 'N/A',
        companyName: cust ? cust.name : 'N/A'
      });
    });
  });

  // Filter milestones based on user search and filters
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

  // ── Single-Card Progressive Column Classification ─────────────────────────

  // Helper: days elapsed from a date string to today
  const daysElapsed = (dateStr: string | null): number => {
    if (!dateStr) return 0;
    const diff = new Date(today).getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // 1. SETTLED & COLLECTED: Payment received / confirmed done
  const settledMilestones = filteredMilestones.filter(m =>
    m.status === 'Done' || !!m.paymentReference
  );

  // 2. COLLECTION OVERDUE: Invoiced, payment not yet received, and past due date
  const collectionOverdueMilestones = filteredMilestones.filter(m =>
    m.status !== 'Done' &&
    m.status !== 'Skipped' &&
    !m.paymentReference &&
    !!m.invoiceNumber &&
    m.dueDate &&
    m.dueDate < today
  );

  // 3. UNINVOICED (Billing Overdue): Invoicing due date passed, but no invoice issued yet
  const uninvoicedMilestones = filteredMilestones.filter(m =>
    m.status !== 'Done' &&
    m.status !== 'Skipped' &&
    !m.invoiceNumber &&
    m.dueDate &&
    m.dueDate < today
  );

  // 4. PIPELINE: Scheduled in future or on-track active milestones (no overdue invoice or payment)
  const pipelineMilestones = filteredMilestones.filter(m =>
    m.status !== 'Done' &&
    m.status !== 'Skipped' &&
    !m.paymentReference &&
    (!m.dueDate || m.dueDate >= today)
  );

  // Helper: sum IDR and USD amounts for a list of milestones
  const getTotals = (list: VisualMilestone[]) => {
    let idr = 0; let usd = 0;
    list.forEach(m => { if (m.currency === 'IDR') { idr += m.billingAmount; } else { usd += m.billingAmount; } });
    return { idr, usd };
  };

  const pipelineTotals = getTotals(pipelineMilestones);
  const uninvoicedTotals = getTotals(uninvoicedMilestones);
  const collectionOverdueTotals = getTotals(collectionOverdueMilestones);
  const settledTotals = getTotals(settledMilestones);

  const columnHeaders = [
    { id: 'pipeline',            title: 'Pipeline',             color: 'var(--text-secondary)', count: pipelineMilestones.length,          list: pipelineMilestones },
    { id: 'uninvoiced',          title: 'Uninvoiced',           color: 'var(--accent-indigo)',  count: uninvoicedMilestones.length,        list: uninvoicedMilestones },
    { id: 'collection-overdue',  title: 'Collection Overdue',   color: 'var(--error)',          count: collectionOverdueMilestones.length, list: collectionOverdueMilestones },
    { id: 'settled',             title: 'Settled & Collected',  color: 'var(--success)',        count: settledMilestones.length,           list: settledMilestones },
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
      <div className="collection-summary-grid">
        
        {/* Planned & Scheduled Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pipeline</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem' }}>
              {formatCurrency(pipelineTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(pipelineTotals.usd, 'USD')}
            </div>
          </div>
        </div>

        {/* Invoiced Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uninvoiced</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--accent-indigo)' }}>
              {formatCurrency(uninvoicedTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(uninvoicedTotals.usd, 'USD')}
            </div>
          </div>
        </div>

        {/* Overdue Total */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Collection Overdue</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--error)' }}>
              {formatCurrency(collectionOverdueTotals.idr, 'IDR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
              {formatCurrency(collectionOverdueTotals.usd, 'USD')}
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
                {col.id === 'collection-overdue' && <AlertCircle size={14} />}
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

                    {/* Days overdue badge — only on Collection Overdue column */}
                    {col.id === 'collection-overdue' && (() => {
                      const refDate = mile.invoiceDate || mile.dueDate;
                      const days = daysElapsed(refDate);
                      return days > 0 ? (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          fontSize: '0.62rem', fontWeight: 700,
                          color: days > 30 ? '#ff4d4d' : 'var(--warning)',
                          background: days > 30 ? 'rgba(255,77,77,0.1)' : 'rgba(245,158,11,0.1)',
                          border: `1px solid ${days > 30 ? 'rgba(255,77,77,0.25)' : 'rgba(245,158,11,0.25)'}`,
                          borderRadius: '6px', padding: '0.15rem 0.5rem', marginTop: '0.35rem'
                        }}>
                          <AlertCircle size={9} />
                          {days} {days === 1 ? 'day' : 'days'} since invoice{mile.invoiceDate ? '' : ' due date'}
                        </div>
                      ) : null;
                    })()}

                    {/* Billing Overdue badge — shown in Uninvoiced column when past due */}
                    {col.id === 'uninvoiced' && mile.dueDate && mile.dueDate < today && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.62rem', fontWeight: 700,
                        color: 'var(--warning)',
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '6px', padding: '0.15rem 0.5rem', marginTop: '0.35rem'
                      }}>
                        <AlertCircle size={9} />
                        Billing Overdue · Invoice not yet issued
                      </div>
                    )}

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
