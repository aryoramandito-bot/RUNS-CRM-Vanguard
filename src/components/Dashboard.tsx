import React from 'react';
import { useCRM } from '../context/CRMContext';
import type { Currency } from '../types/crm';
import { 
  Briefcase, 
  DollarSign, 
  Clock, 
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Calendar,
  Users
} from 'lucide-react';

export const Dashboard: React.FC<{ onViewContract: (contractId: string) => void }> = ({ onViewContract }) => {
  const { companies, contacts, projects, contracts, deals, meetings } = useCRM();

  // Helper formatting
  const formatCurrency = (value: number, currency: Currency) => {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
  };

  // Metrics calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const planningProjects = projects.filter(p => p.status === 'Planning').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  // Sales Funnel metrics
  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  
  let pipelineValueIDR = 0;
  let pipelineValueUSD = 0;
  activeDeals.forEach(d => {
    if (d.currency === 'IDR') {
      pipelineValueIDR += d.value;
    } else {
      pipelineValueUSD += d.value;
    }
  });

  const wonDealsCount = deals.filter(d => d.stage === 'Closed Won').length;
  const lostDealsCount = deals.filter(d => d.stage === 'Closed Lost').length;
  const closedDealsTotal = wonDealsCount + lostDealsCount;
  const dealWinRate = closedDealsTotal > 0 ? Math.round((wonDealsCount / closedDealsTotal) * 100) : 0;

  let totalValueIDR = 0;
  let totalValueUSD = 0;
  let collectedIDR = 0;
  let collectedUSD = 0;

  contracts.forEach(c => {
    if (c.currency === 'IDR') {
      totalValueIDR += c.value;
    } else {
      totalValueUSD += c.value;
    }

    c.stages.forEach(st => {
      // Cash collection is tracked on stages categorized as 'Collection' that are 'Done'
      if (st.category === 'Collection' && st.status === 'Done') {
        const amt = st.billingAmount || 0;
        if (c.currency === 'IDR') {
          collectedIDR += amt;
        } else {
          collectedUSD += amt;
        }
      }
    });
  });

  let outstandingIDR = 0;
  let outstandingUSD = 0;

  contracts.forEach(c => {
    c.stages.forEach(st => {
      if (st.status === 'Active') {
        const amt = st.billingAmount || 0;
        if (c.currency === 'IDR') {
          outstandingIDR += amt;
        } else {
          outstandingUSD += amt;
        }
      }
    });
  });

  // Active / Overdue stages for monitoring alerts
  const today = new Date().toISOString().split('T')[0];
  const criticalMilestones: { contractTitle: string; contractId: string; stageName: string; dueDate: string; isOverdue: boolean }[] = [];

  contracts.forEach(c => {
    c.stages.forEach(st => {
      if (st.status === 'Active') {
        const isOverdue = st.dueDate < today;
        criticalMilestones.push({
          contractTitle: c.title,
          contractId: c.id,
          stageName: st.name,
          dueDate: st.dueDate,
          isOverdue,
        });
      }
    });
  });

  // Sort critical milestones: overdue first, then by due date
  criticalMilestones.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  // Project Status Percentages for SVG Donut
  const progressPercent = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const activePercent = totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0;
  const planningPercent = totalProjects > 0 ? Math.round((planningProjects / totalProjects) * 100) : 0;

  // IDR / USD progress bars
  const progressIDR = totalValueIDR > 0 ? Math.round((collectedIDR / totalValueIDR) * 100) : 0;
  const progressUSD = totalValueUSD > 0 ? Math.round((collectedUSD / totalValueUSD) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dashboard Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Real-time pipeline, customer metrics, and contract collection monitoring.
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
          <Calendar size={14} className="gradient-text" />
          <span>Local Time: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid: 5 Metric Cards */}
      <div className="dashboard-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* Metric 0: Sales Pipeline */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sales Opportunities</span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatCurrency(pipelineValueIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatCurrency(pipelineValueUSD, 'USD')}</div>
          </div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
            Win Rate: {dealWinRate}% ({wonDealsCount} Won)
          </div>
        </div>
        
        {/* Metric 1: Active Projects */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Projects Lifecycle</span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
              <Briefcase size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>{activeProjects}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>active / {totalProjects} total</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div><span style={{ color: 'var(--info)', fontWeight: 700 }}>●</span> {planningProjects} Planning</div>
            <div><span style={{ color: 'var(--success)', fontWeight: 700 }}>●</span> {completedProjects} Done</div>
          </div>
        </div>

        {/* Metric 2: Total Contract Value */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Contract Book</span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatCurrency(totalValueIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatCurrency(totalValueUSD, 'USD')}</div>
          </div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {contracts.length} active contract lines
          </div>
        </div>

        {/* Metric 3: Collected Revenue */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cash Collected</span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(collectedIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.95rem', color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(collectedUSD, 'USD')}</div>
          </div>
          <div style={{ marginTop: '0.8rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--success)' }}>{progressIDR}% IDR</span>
            <span style={{ color: 'var(--success)' }}>{progressUSD}% USD</span>
          </div>
        </div>

        {/* Metric 4: Outstanding Collections */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Outstanding Collection</span>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{formatCurrency(outstandingIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.95rem', color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(outstandingUSD, 'USD')}</div>
          </div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Unbilled and pending collection stages
          </div>
        </div>

      </div>

      {/* Main Grid: Charts & Analytics / Action list */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Left Section: Progress & Pipelines */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Collection Pipelines</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* IDR Pipeline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>IDR Currency Collection ({progressIDR}% Met)</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(collectedIDR, 'IDR')} / {formatCurrency(totalValueIDR, 'IDR')}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progressIDR}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
                    borderRadius: '4px',
                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)'
                  }} 
                />
              </div>
            </div>

            {/* USD Pipeline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>USD Currency Collection ({progressUSD}% Met)</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(collectedUSD, 'USD')} / {formatCurrency(totalValueUSD, 'USD')}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progressUSD}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-indigo) 100%)',
                    borderRadius: '4px',
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)'
                  }} 
                />
              </div>
            </div>
            
            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Client Base</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {companies.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Cos</span> / {contacts.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Conts</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Total Projects</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalProjects}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Active Contracts</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  {contracts.filter(c => c.status === 'Active').length}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Section: Project Status Donut SVG */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Project Breakdown</h3>
          
          {totalProjects > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1.5rem' }}>
              {/* Donut SVG */}
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="4.2" />
                  
                  {/* Active Segment */}
                  <circle 
                    cx="21" cy="21" r="15.91549430918954" fill="transparent" 
                    stroke="var(--accent-indigo)" strokeWidth="4.5" 
                    strokeDasharray={`${activePercent} ${100 - activePercent}`} 
                    strokeDashoffset="25" 
                  />
                  
                  {/* Completed Segment */}
                  <circle 
                    cx="21" cy="21" r="15.91549430918954" fill="transparent" 
                    stroke="var(--success)" strokeWidth="4.5" 
                    strokeDasharray={`${progressPercent} ${100 - progressPercent}`} 
                    strokeDashoffset={`${125 - activePercent}`} 
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalProjects}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)' }} />
                    <span>In Progress</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{activeProjects} ({activePercent}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                    <span>Completed</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{completedProjects} ({progressPercent}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--info)' }} />
                    <span>Planning</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{planningProjects} ({planningPercent}%)</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No projects recorded yet.
            </div>
          )}
        </div>

      </div>

      {/* Critical Stage Alerts & Monitoring Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="gradient-text" />
          <h3 style={{ fontSize: '1.1rem' }}>Active Workflow & Billing Monitoring Alerts</h3>
        </div>

        {criticalMilestones.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {criticalMilestones.slice(0, 5).map((milestone, idx) => (
              <div 
                key={idx} 
                className="glass-panel"
                style={{ 
                  padding: '1rem 1.25rem', 
                  background: milestone.isOverdue ? 'rgba(244, 63, 94, 0.03)' : 'rgba(255,255,255,0.01)',
                  borderColor: milestone.isOverdue ? 'rgba(244, 63, 94, 0.15)' : 'var(--border-glass)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div 
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '50%', 
                      background: milestone.isOverdue ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                      color: milestone.isOverdue ? 'var(--error)' : 'var(--accent-indigo)' 
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{milestone.stageName}</span>
                      {milestone.isOverdue && (
                        <span className="badge badge-error" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>Overdue</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Contract: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{milestone.contractTitle}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: milestone.isOverdue ? 'var(--error)' : 'var(--text-primary)' }}>
                      {milestone.dueDate}
                    </div>
                  </div>
                  <button 
                    onClick={() => onViewContract(milestone.contractId)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                  >
                    Manage Flow <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            All active workflow tasks are on track. No alerts triggered!
          </div>
        )}
      </div>

      {/* Recent Point of Contact Interaction Logs */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Users size={18} className="gradient-text" />
          <h3 style={{ fontSize: '1.1rem' }}>Recent Client Point of Contact Interactions</h3>
        </div>

        {meetings.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {meetings.slice(0, 4).map((meet) => {
              const deal = deals.find(d => d.id === meet.dealId);
              return (
                <div 
                  key={meet.id} 
                  className="glass-panel"
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.01)',
                    borderColor: 'var(--border-glass)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{meet.meetingDate}</span>
                    {deal && (
                      <span className="badge badge-info" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>
                        {deal.title}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{meet.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, flexGrow: 1 }}>
                    {meet.notes.substring(0, 100)}{meet.notes.length > 100 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span>Attendees: <strong>{meet.attendees.join(', ')}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No meeting interactions logged. Visit Sales Funnel to log client meetings.
          </div>
        )}
      </div>

    </div>
  );
};
