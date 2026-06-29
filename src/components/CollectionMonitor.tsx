import React from 'react';
import { useCRM } from '../context/CRMContext';
import type { Currency, ContractStageCategory, ContractStageStatus } from '../types/crm';
import { 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Building, 
  UserCheck
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
          invoiceNumber: st.invoiceNumber,
          paymentReference: st.paymentReference,
          projectCode: p ? p.code : 'N/A',
          companyName: cust ? cust.name : 'N/A'
        });
      }
    });
  });

  // Columns classification logic:
  // 1. OVERDUE: Any billing or collection stage with status Active/Pending whose due date is in the past (< today)
  // 2. PLANNED / SCHEDULED: Category Billing/Collection, status Pending/Active, due date >= today
  // 3. INVOICED / AWAITING PAYMENT: Category Collection with status Active (or category Billing done but Collection is pending, but Collection status Active handles this beautifully)
  // 4. SETTLED / COLLECTED: Category Collection with status Done
  
  const overdueMilestones = milestones.filter(m => m.status !== 'Done' && m.status !== 'Skipped' && m.dueDate < today);
  
  const plannedMilestones = milestones.filter(m => 
    (m.status === 'Pending') && 
    m.dueDate >= today
  );

  const invoicedMilestones = milestones.filter(m => 
    m.status === 'Active' && 
    m.dueDate >= today
  );

  const settledMilestones = milestones.filter(m => 
    m.category === 'Collection' && 
    m.status === 'Done'
  );

  // Financial aggregates
  let totalBilledIDR = 0;
  let totalBilledUSD = 0;
  let totalCollectedIDR = 0;
  let totalCollectedUSD = 0;

  milestones.forEach(m => {
    if (m.currency === 'IDR') {
      if (m.category === 'Billing' && m.status === 'Done') totalBilledIDR += m.billingAmount;
      if (m.category === 'Collection' && m.status === 'Done') totalCollectedIDR += m.billingAmount;
    } else {
      if (m.category === 'Billing' && m.status === 'Done') totalBilledUSD += m.billingAmount;
      if (m.category === 'Collection' && m.status === 'Done') totalCollectedUSD += m.billingAmount;
    }
  });

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

      {/* Financial Aggregates Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Total Invoiced IDR */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoiced IDR</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem' }}>{formatCurrency(totalBilledIDR, 'IDR')}</div>
          </div>
        </div>

        {/* Total Collected IDR */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Collected IDR</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--success)' }}>{formatCurrency(totalCollectedIDR, 'IDR')}</div>
          </div>
        </div>

        {/* Total Invoiced USD */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoiced USD</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--accent-cyan)' }}>{formatCurrency(totalBilledUSD, 'USD')}</div>
          </div>
        </div>

        {/* Total Collected USD */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Collected USD</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--success)' }}>{formatCurrency(totalCollectedUSD, 'USD')}</div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: col.id === 'overdue' ? 'var(--error)' : 'var(--text-muted)' }}>
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
