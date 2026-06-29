import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  TrendingUp, 
  DollarSign, 
  Sliders, 
  AlertTriangle, 
  Award,
  Layers,
  Percent
} from 'lucide-react';
import type { SalesDealStage, Currency } from '../types/crm';

export const SalesDashboard: React.FC = () => {
  const { deals, meetings, companies, stageProbabilities, updateStageProbabilities } = useCRM();
  const [showConfig, setShowConfig] = useState(false);

  // Helper currency formatting
  const formatCurrency = (val: number, curr: Currency) => {
    if (curr === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(val);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(val);
    }
  };

  const formatDateDDMMMYY = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // 1. Calculations & Metrics
  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  const closedWonDeals = deals.filter(d => d.stage === 'Closed Won');
  const closedLostDeals = deals.filter(d => d.stage === 'Closed Lost');
  
  // Total Open Pipeline
  let totalPipelineIDR = 0;
  let totalPipelineUSD = 0;
  
  // Weighted Open Pipeline
  let weightedPipelineIDR = 0;
  let weightedPipelineUSD = 0;

  activeDeals.forEach(d => {
    const probability = stageProbabilities[d.stage] ?? 0;
    const weightedVal = d.value * (probability / 100);
    
    if (d.currency === 'IDR') {
      totalPipelineIDR += d.value;
      weightedPipelineIDR += weightedVal;
    } else {
      totalPipelineUSD += d.value;
      weightedPipelineUSD += weightedVal;
    }
  });

  // Average Deal Size
  const openCount = activeDeals.length;
  
  const idrDeals = deals.filter(d => d.currency === 'IDR' && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  const avgDealSizeIDR = idrDeals.length > 0 ? (idrDeals.reduce((acc, d) => acc + d.value, 0) / idrDeals.length) : 0;
  
  const usdDeals = deals.filter(d => d.currency === 'USD' && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  const avgDealSizeUSD = usdDeals.length > 0 ? (usdDeals.reduce((acc, d) => acc + d.value, 0) / usdDeals.length) : 0;

  // Win/Loss Ratio
  const totalClosed = closedWonDeals.length + closedLostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((closedWonDeals.length / totalClosed) * 100) : 0;

  // 2. Horizontal Funnel Breakdown (Stage by Stage counts and values)
  const funnelStages: { stage: SalesDealStage; count: number; valIDR: number; valUSD: number }[] = [
    { stage: 'Lead', count: 0, valIDR: 0, valUSD: 0 },
    { stage: 'Qualification', count: 0, valIDR: 0, valUSD: 0 },
    { stage: 'Proposal', count: 0, valIDR: 0, valUSD: 0 },
    { stage: 'Negotiation', count: 0, valIDR: 0, valUSD: 0 }
  ];

  funnelStages.forEach(fs => {
    const stageDeals = activeDeals.filter(d => d.stage === fs.stage);
    fs.count = stageDeals.length;
    stageDeals.forEach(d => {
      if (d.currency === 'IDR') fs.valIDR += d.value;
      else fs.valUSD += d.value;
    });
  });

  // Max value in any stage for chart scaling
  const maxStageValIDR = Math.max(...funnelStages.map(fs => fs.valIDR + (fs.valUSD * 16000)), 1);

  // 3. Stagnant Deals Check
  // Stagnant = Open stage, created > 30 days ago, and last meeting > 14 days ago (or no meetings)
  const stagnantDeals = activeDeals.filter(d => {
    const createdDate = new Date(d.createdAt);
    const ageDays = (new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
    
    const dealMeets = meetings.filter(m => m.dealId === d.id);
    const sortedMeets = [...dealMeets].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
    const lastMeetingDate = sortedMeets[0] ? new Date(sortedMeets[0].meetingDate) : null;
    
    const daysSinceMeeting = lastMeetingDate 
      ? (new Date().getTime() - lastMeetingDate.getTime()) / (1000 * 3600 * 24)
      : ageDays; // Fallback to age if no meetings logged yet

    return ageDays > 30 && daysSinceMeeting > 14;
  });

  // 4. Top Opportunities (normalized to IDR for comparison: 1 USD = 16k IDR)
  const topDeals = [...activeDeals]
    .sort((a, b) => {
      const valA = a.currency === 'USD' ? a.value * 16000 : a.value;
      const valB = b.currency === 'USD' ? b.value * 16000 : b.value;
      return valB - valA;
    })
    .slice(0, 5);

  // Probability config slider handler
  const handleProbabilityChange = (stage: SalesDealStage, val: number) => {
    const newProbs = { ...stageProbabilities, [stage]: val };
    updateStageProbabilities(newProbs);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Configuration Slider Panel Switch */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowConfig(!showConfig)} 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
        >
          <Sliders size={14} /> 
          {showConfig ? 'Hide Probability Weights' : 'Configure Stage Weights'}
        </button>
      </div>

      {/* Sliders Configuration Dropdown */}
      {showConfig && (
        <div className="glass-panel animate-slide-down" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Percent size={16} className="gradient-text" /> Pipeline Weight Settings
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Adjust the expected close-probability (%) for each stage. These values scale the Weighted Pipeline metrics below.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {(['Lead', 'Qualification', 'Proposal', 'Negotiation'] as SalesDealStage[]).map(stage => (
              <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700 }}>{stage}</span>
                  <span style={{ color: 'var(--accent-indigo)', fontWeight: 800 }}>{stageProbabilities[stage]}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={stageProbabilities[stage]} 
                  onChange={e => handleProbabilityChange(stage, Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: 'var(--accent-indigo)',
                    cursor: 'pointer'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* KPI 1: Raw Open Pipeline */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Pipeline Value</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatCurrency(totalPipelineIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatCurrency(totalPipelineUSD, 'USD')}</div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
            From {openCount} active opportunities
          </span>
        </div>

        {/* KPI 2: Weighted Pipeline */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Weighted Value (KPI)</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatCurrency(weightedPipelineIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatCurrency(weightedPipelineUSD, 'USD')}</div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
            Probability adjusted forecast
          </span>
        </div>

        {/* KPI 3: Average Deal Size */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Average Deal Size</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatCurrency(avgDealSizeIDR, 'IDR')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatCurrency(avgDealSizeUSD, 'USD')}</div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
            Avg value of open listings
          </span>
        </div>

        {/* KPI 4: Win/Loss Ratio */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Deal Win Ratio</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{winRate}%</div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'block' }}>
            {closedWonDeals.length} Won / {closedLostDeals.length} Lost
          </span>
        </div>

      </div>

      {/* Main Charts & Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Horizontal Funnel stage bars */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
            Pipeline Volume by Stage
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {funnelStages.map(fs => {
              const combinedValueIDR = fs.valIDR + (fs.valUSD * 16000);
              const percentageWidth = Math.min(Math.max((combinedValueIDR / maxStageValIDR) * 100, 8), 100);
              
              return (
                <div key={fs.stage} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{fs.stage}</span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '6px', fontSize: '0.65rem' }}>
                        {fs.count} {fs.count === 1 ? 'deal' : 'deals'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fs.valIDR > 0 && <div style={{ color: 'var(--text-primary)' }}>{formatCurrency(fs.valIDR, 'IDR')}</div>}
                      {fs.valUSD > 0 && <div style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem' }}>{formatCurrency(fs.valUSD, 'USD')}</div>}
                      {fs.valIDR === 0 && fs.valUSD === 0 && <div style={{ color: 'var(--text-muted)' }}>Rp 0</div>}
                    </div>
                  </div>

                  {/* Glass Progress Bar Wrapper */}
                  <div style={{ height: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${percentageWidth}%`, 
                        background: fs.stage === 'Lead' ? 'linear-gradient(90deg, #64748b, #94a3b8)' :
                                    fs.stage === 'Qualification' ? 'linear-gradient(90deg, #0284c7, #38bdf8)' :
                                    fs.stage === 'Proposal' ? 'linear-gradient(90deg, #6366f1, #818cf8)' :
                                    'linear-gradient(90deg, #ec4899, #f472b6)', 
                        borderRadius: '5px',
                        boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Win/Loss Split Donut & Pipeline Health */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
            Pipeline Health Check
          </h3>

          {/* Stagnant Deals Warning Panel */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: stagnantDeals.length > 0 ? 'var(--error)' : 'var(--success)', marginBottom: '0.75rem' }}>
              <AlertTriangle size={16} /> 
              <span>Stagnant Opportunities ({stagnantDeals.length})</span>
            </div>

            {stagnantDeals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {stagnantDeals.map(d => {
                  const company = companies.find(c => c.id === d.companyId);
                  return (
                    <div 
                      key={d.id} 
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        background: 'rgba(244, 63, 94, 0.03)', 
                        border: '1px solid rgba(244, 63, 94, 0.15)', 
                        borderRadius: '6px',
                        fontSize: '0.7rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{d.title}</span>
                        <span style={{ color: 'var(--error)' }}>{formatDateDDMMMYY(d.createdAt)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        <span>{company ? company.name : 'Unknown Company'}</span>
                        <span>Stagnant &gt; 30 Days</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Excellent! All active sales deals have had recent interactions logged.
              </p>
            )}
          </div>

          {/* Ratio Breakdowns */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '0.75rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Closed Won</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{closedWonDeals.length}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-glass)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Closed Lost</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--error)' }}>{closedLostDeals.length}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-glass)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Open Deals</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>{openCount}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Top Open Opportunities Leaderboard */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
          Top Active Opportunities (IDR-Normalized)
        </h3>

        {topDeals.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Opportunity Title</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Client Company</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Stage</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Raw Value</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Weighted Value</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Last Meeting Date</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map(d => {
                  const company = companies.find(c => c.id === d.companyId);
                  const probability = stageProbabilities[d.stage] ?? 0;
                  const weightedVal = d.value * (probability / 100);
                  
                  const dealMeets = meetings.filter(m => m.dealId === d.id);
                  const sortedMeets = [...dealMeets].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
                  const lastMeetStr = sortedMeets[0] ? formatDateDDMMMYY(sortedMeets[0].meetingDate) : '-';

                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{d.title}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {company ? company.name : 'Unknown Company'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge badge-info`} style={{ fontSize: '0.65rem' }}>{d.stage}</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(d.value, d.currency)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>
                        {formatCurrency(weightedVal, d.currency)}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                        {lastMeetStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No active deals registered in the pipeline.
          </p>
        )}
      </div>

    </div>
  );
};
