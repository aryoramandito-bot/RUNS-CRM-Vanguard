import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { SalesDashboard } from './SalesDashboard';
import type { SalesDeal, SalesDealStage, QuotationItem, Currency } from '../types/crm';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Building, 
  User, 
  Calendar, 
  FolderPlus, 
  Clock, 
  FileText, 
  Printer
} from 'lucide-react';

interface SalesFunnelProps {
  onDealWon?: (deal: SalesDeal) => void;
}

export const SalesFunnel: React.FC<SalesFunnelProps> = ({ onDealWon }) => {
  const { 
    companies, 
    contacts, 
    deals, 
    meetings, 
    addDeal, 
    updateDeal, 
    deleteDeal, 
    addMeetingLog, 
    deleteMeetingLog,
    projects,
    addProject,
    addContract
  } = useCRM();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'kanban' | 'dashboard'>('kanban');

  // Selected Deal Detail Sidebar
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeMobileStage, setActiveMobileStage] = useState<SalesDealStage>('Lead');
  const [subTab, setSubTab] = useState<'details' | 'meetings' | 'quotation'>('details');

  // Deal Modal States
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<SalesDeal | null>(null);

  // Promotion Modal States
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promotingDeal, setPromotingDeal] = useState<SalesDeal | null>(null);

  // Print Exporter Overlay State
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Deal Form States
  const [dealTitle, setDealTitle] = useState('');
  const [dealCompanyId, setDealCompanyId] = useState('');
  const [dealContactId, setDealContactId] = useState('');
  const [dealStage, setDealStage] = useState<SalesDealStage>('Lead');
  const [dealValue, setDealValue] = useState<number>(0);
  const [dealCurrency, setDealCurrency] = useState<Currency>('IDR');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [dealDesc, setDealDesc] = useState('');

  // Meeting Form States
  const [meetDate, setMeetDate] = useState('');
  const [meetTitle, setMeetTitle] = useState('');
  const [meetAttendees, setMeetAttendees] = useState('');
  const [meetNotes, setMeetNotes] = useState('');
  const [meetDocs, setMeetDocs] = useState('');

  // Quotation Item States
  const [qiDesc, setQiDesc] = useState('');
  const [qiQty, setQiQty] = useState<number>(1);
  const [qiPrice, setQiPrice] = useState<number>(0);

  // Promotion Form States
  const [promoProjCode, setPromoProjCode] = useState('');
  const [promoProjName, setPromoProjName] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoContractNo, setPromoContractNo] = useState('');

  const stages: SalesDealStage[] = ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

  // Formatting helpers
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

  // Select deal details
  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setSubTab('details');
  };

  // --- Deal CRUD ---
  const handleOpenAddDeal = () => {
    if (companies.length === 0) {
      alert('Please register at least one Client Company in Directory before logging deals.');
      return;
    }
    setEditingDeal(null);
    setDealTitle('');
    setDealCompanyId(companies[0].id);
    const relatedContacts = contacts.filter(c => c.companyId === companies[0].id);
    setDealContactId(relatedContacts[0]?.id || '');
    setDealStage('Lead');
    setDealValue(0);
    setDealCurrency('IDR');
    setDealCloseDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setDealDesc('');
    setIsDealModalOpen(true);
  };

  const handleOpenEditDeal = (deal: SalesDeal) => {
    setEditingDeal(deal);
    setDealTitle(deal.title);
    setDealCompanyId(deal.companyId);
    setDealContactId(deal.contactId);
    setDealStage(deal.stage);
    setDealValue(deal.value);
    setDealCurrency(deal.currency);
    setDealCloseDate(deal.estimatedCloseDate);
    setDealDesc(deal.description);
    setIsDealModalOpen(true);
  };

  const handleDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealCompanyId || !dealCloseDate) return;

    const data = {
      title: dealTitle.trim(),
      companyId: dealCompanyId,
      contactId: dealContactId,
      stage: dealStage,
      value: dealValue,
      currency: dealCurrency,
      estimatedCloseDate: dealCloseDate,
      description: dealDesc.trim()
    };

    if (editingDeal) {
      updateDeal(editingDeal.id, data);
    } else {
      addDeal(data);
    }
    setIsDealModalOpen(false);
  };

  const handleDeleteDeal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this deal? Meetings and quotations associated with it will be deleted.')) {
      deleteDeal(id);
      if (selectedDealId === id) setSelectedDealId(null);
    }
  };

  // --- Stage Transition Quick Actions ---
  const handleMoveStage = (deal: SalesDeal, nextStage: SalesDealStage) => {
    updateDeal(deal.id, { stage: nextStage });
    if (nextStage === 'Closed Won') {
      handleOpenPromoteModal(deal);
    }
  };

  // --- Meeting Log Sub-operations ---
  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId || !meetTitle.trim() || !meetDate) return;

    addMeetingLog({
      dealId: selectedDealId,
      meetingDate: meetDate,
      title: meetTitle.trim(),
      attendees: meetAttendees.split(',').map(a => a.trim()).filter(Boolean),
      notes: meetNotes.trim(),
      documents: meetDocs.split(',').map(d => d.trim()).filter(Boolean)
    });

    setMeetTitle('');
    setMeetAttendees('');
    setMeetNotes('');
    setMeetDocs('');
    setMeetDate(new Date().toISOString().split('T')[0]);
    alert('Meeting log registered successfully!');
  };

  // --- Quotation Builder Sub-operations ---
  const handleAddQuoteItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId || !qiDesc.trim() || qiQty <= 0) return;

    const deal = deals.find(d => d.id === selectedDealId);
    if (!deal) return;

    const newItem: QuotationItem = {
      id: `qi-${Math.random().toString(36).substring(2, 9)}`,
      description: qiDesc.trim(),
      quantity: qiQty,
      unitPrice: qiPrice
    };

    const updatedItems = [...deal.quotationItems, newItem];
    const totalQuoteValue = updatedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    updateDeal(deal.id, {
      quotationItems: updatedItems,
      value: totalQuoteValue // Sync deal value to quotation total automatically!
    });

    setQiDesc('');
    setQiQty(1);
    setQiPrice(0);
  };

  const handleDeleteQuoteItem = (itemId: string) => {
    if (!selectedDealId) return;
    const deal = deals.find(d => d.id === selectedDealId);
    if (!deal) return;

    const updatedItems = deal.quotationItems.filter(item => item.id !== itemId);
    const totalQuoteValue = updatedItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    updateDeal(deal.id, {
      quotationItems: updatedItems,
      value: totalQuoteValue
    });
  };

  const handleUpdateQuoteMeta = (fields: { quotationDate?: string; quotationExpiry?: string; quotationTerms?: string }) => {
    if (!selectedDealId) return;
    updateDeal(selectedDealId, fields);
  };

  // --- Deal to Master Project Promotion ---
  const handleOpenPromoteModal = (deal: SalesDeal) => {
    setPromotingDeal(deal);
    const comp = companies.find(c => c.id === deal.companyId);
    
    // Auto-generate project code from company / title
    const cleanCompName = (comp?.name || 'PRJ').toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setPromoProjCode(`${cleanCompName}-${randomCode}`);
    setPromoProjName(deal.title);
    setPromoStartDate(new Date().toISOString().split('T')[0]);
    setPromoEndDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPromoContractNo(`CNT/${cleanCompName}/${new Date().getFullYear()}/${randomCode}`);
    setIsPromoteModalOpen(true);
  };

  const handlePromoteConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingDeal || !promoProjCode || !promoProjName || !promoStartDate || !promoEndDate) return;

    // 1. Create the Master Project
    const tempProjId = `proj-${Math.random().toString(36).substring(2, 11)}`;
    addProject({
      companyId: promotingDeal.companyId,
      name: promoProjName,
      code: promoProjCode,
      budget: promotingDeal.value,
      currency: promotingDeal.currency,
      status: 'In Progress',
      startDate: promoStartDate,
      endDate: promoEndDate,
      description: `Promoted from Sales Deal: ${promotingDeal.title}. Scope: ${promotingDeal.description}`
    });

    // 2. Create the Contract and pre-fill SOW details
    addContract({
      projectId: projects.length > 0 ? projects[projects.length - 1].id : tempProjId, 
      title: `${promotingDeal.title} Service Contract`,
      contractNumber: promoContractNo || `CNT-${promoProjCode}`,
      type: 'Fixed Price',
      value: promotingDeal.value,
      currency: promotingDeal.currency,
      status: 'Active',
      signDate: promoStartDate,
      startDate: promoStartDate,
      endDate: promoEndDate
    });

    // 3. Mark Deal as Closed Won in Funnel
    updateDeal(promotingDeal.id, { stage: 'Closed Won' });

    alert(`Opportunity successfully promoted! Created Project "${promoProjName}" and Contract.`);
    setIsPromoteModalOpen(false);
    setSelectedDealId(null);
    if (onDealWon) onDealWon(promotingDeal);
  };

  // Filter deals
  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = companyFilter === 'All' || d.companyId === companyFilter;
    return matchesSearch && matchesCompany;
  });

  const selectedDeal = deals.find(d => d.id === selectedDealId);
  const selectedDealCompany = selectedDeal ? companies.find(c => c.id === selectedDeal.companyId) : null;
  const selectedDealContact = selectedDeal ? contacts.find(c => c.id === selectedDeal.contactId) : null;
  const dealMeetings = selectedDeal ? meetings.filter(m => m.dealId === selectedDeal.id) : [];

  // Quotation Totals
  const quotationSubtotal = selectedDeal?.quotationItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) || 0;
  const quotationTax = quotationSubtotal * 0.11; // 11% PPN standard Indonesia
  const quotationTotal = quotationSubtotal + quotationTax;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pre-Sales Funnel & Quotation Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Track potential opportunities, document client point of contact logs, build quotes, and promote to project deliverables.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleOpenAddDeal}>
            <Plus size={16} /> Add Sales Opportunity
          </button>
        </div>
      </div>

      {/* Sub Navigation Toggle Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setViewMode('kanban')}
          className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span>📋 Kanban Pipeline</span>
        </button>
        <button 
          onClick={() => setViewMode('dashboard')}
          className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span>📊 Pipeline Analytics</span>
        </button>
      </div>

      {viewMode === 'dashboard' ? (
        <SalesDashboard />
      ) : (
        <>
          {/* Filter panel */}
          <div 
            className="glass-panel" 
        style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} 
          />
          <input
            type="text"
            placeholder="Search active opportunities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter Company:</span>
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="form-select"
            style={{ width: '200px', padding: '0.5rem' }}
          >
            <option value="All">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main workspace layout */}
      <div className="funnel-layout-grid" style={{ display: 'grid', gridTemplateColumns: selectedDealId ? '1.5fr 1fr' : '1fr', gap: '1.5rem', flexGrow: 1, alignItems: 'stretch' }}>
        
        {/* Kanban Board Column */}
        <div 
          className={`glass-panel funnel-kanban-side ${selectedDealId ? 'has-selected' : ''}`}
          style={{ 
            padding: '1.5rem', 
            overflowX: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Opportunities pipeline</span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Total Pipeline: <strong>{deals.length} deals</strong></span>
            </div>
          </div>

          {/* Mobile stage switcher tabs */}
          <div className="mobile-stage-tabs no-print">
            {stages.map(st => (
              <button
                key={st}
                type="button"
                className={`mobile-stage-tab-btn ${activeMobileStage === st ? 'active' : ''}`}
                onClick={() => setActiveMobileStage(st)}
              >
                {st === 'Closed Won' ? 'Won' : st === 'Closed Lost' ? 'Lost' : st}
              </button>
            ))}
          </div>

          <div className="funnel-kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(180px, 1fr))', gap: '1rem', flexGrow: 1, alignItems: 'start' }}>
            {stages.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage);
              return (
                <div 
                  key={stage} 
                  className={`funnel-kanban-column ${activeMobileStage === stage ? 'mobile-active' : ''}`}
                  style={{ 
                    background: 'var(--bg-kanban-column)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '0.75rem',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{stage}</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '8px' }}>
                      {stageDeals.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '550px' }}>
                    {stageDeals.map(deal => {
                      const client = companies.find(c => c.id === deal.companyId);
                      const isSelected = selectedDealId === deal.id;
                      return (
                        <div 
                          key={deal.id}
                          className="glass-panel"
                          onClick={() => handleSelectDeal(deal.id)}
                          style={{
                            padding: '0.75rem',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-tertiary)',
                            border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid var(--border-glass)',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0.15rem 0' }}>{deal.title}</h4>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
                            <Building size={10} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {client ? client.name : 'Unknown Company'}
                            </span>
                          </div>

                          {/* Dedicated date tracking panel */}
                          <div style={{ 
                            marginTop: '0.4rem', 
                            padding: '0.35rem 0.5rem', 
                            background: 'rgba(0, 0, 0, 0.12)', 
                            borderRadius: '4px', 
                            fontSize: '0.62rem', 
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.15rem',
                            border: '1px solid rgba(255,255,255,0.02)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Initiated:</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDateDDMMMYY(deal.createdAt)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Last Meeting:</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {(() => {
                                  const dealMeets = meetings.filter(m => m.dealId === deal.id);
                                  if (dealMeets.length === 0) return '-';
                                  const sortedMeets = [...dealMeets].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
                                  return formatDateDDMMMYY(sortedMeets[0].meetingDate);
                                })()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Last Contact:</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {(() => {
                                  const dealMeets = meetings.filter(m => m.dealId === deal.id);
                                  if (dealMeets.length === 0) return formatDateDDMMMYY(deal.createdAt);
                                  const sortedMeets = [...dealMeets].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
                                  return formatDateDDMMMYY(sortedMeets[0].meetingDate);
                                })()}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: deal.currency === 'IDR' ? 'var(--text-primary)' : 'var(--accent-cyan)' }}>
                              {formatCurrency(deal.value, deal.currency)}
                            </span>
                          </div>

                          {/* Quick movement controls */}
                          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            {stage !== 'Closed Won' && stage !== 'Closed Lost' && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.6rem' }}
                                onClick={() => handleMoveStage(deal, 'Closed Won')}
                              >
                                Won
                              </button>
                            )}
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.6rem' }}
                              onClick={() => handleOpenEditDeal(deal)}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Deal Panel Sidebar */}
        {selectedDeal && (
          <div className="glass-panel funnel-details-side animate-slide-right" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Sidebar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-indigo)', fontWeight: 700 }}>Opportunity Details</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedDeal.title}</h3>
              </div>
              <button className="btn-icon" onClick={() => setSelectedDealId(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Sub Tabs switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>
              {(['details', 'meetings', 'quotation'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab)}
                  className="btn"
                  style={{
                    flex: 1,
                    background: subTab === tab ? 'rgba(255,255,255,0.04)' : 'transparent',
                    borderColor: subTab === tab ? 'var(--accent-indigo)' : 'transparent',
                    borderBottom: subTab === tab ? '2px solid var(--accent-indigo)' : 'none',
                    color: subTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    padding: '0.5rem 0'
                  }}
                >
                  {tab === 'details' && 'Overview'}
                  {tab === 'meetings' && `Meetings (${dealMeetings.length})`}
                  {tab === 'quotation' && 'Quotation'}
                </button>
              ))}
            </div>

            {/* Sub Tab Contents */}
            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '550px' }}>
              
              {/* DETAILS TAB */}
              {subTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Deal Stage</span>
                      <span className={`badge badge-${selectedDeal.stage.toLowerCase().replace(' ', '-')}`} style={{ marginTop: '0.25rem' }}>
                        {selectedDeal.stage}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Opportunity Budget</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: selectedDeal.currency === 'IDR' ? 'var(--text-primary)' : 'var(--accent-cyan)' }}>
                        {formatCurrency(selectedDeal.value, selectedDeal.currency)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Client Company</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                      <Building size={14} className="gradient-text" />
                      <span>{selectedDealCompany ? selectedDealCompany.name : 'Unknown Company'}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Client Point of Contact</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                      <User size={14} className="gradient-text" />
                      <span>
                        {selectedDealContact ? `${selectedDealContact.name} (${selectedDealContact.role})` : 'Unassigned POC'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Est. Close Date</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                      <Calendar size={14} className="gradient-text" />
                      <span>{selectedDeal.estimatedCloseDate}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>SOW Description</span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '0.25rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                      {selectedDeal.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                    {selectedDeal.stage !== 'Closed Won' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, gap: '0.35rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenPromoteModal(selectedDeal)}
                      >
                        <FolderPlus size={15} /> Promote to Project
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      style={{ color: 'var(--error)', borderColor: 'rgba(244,63,94,0.15)', fontSize: '0.8rem' }}
                      onClick={() => handleDeleteDeal(selectedDeal.id)}
                    >
                      Delete
                    </button>
                  </div>

                </div>
              )}

              {/* MEETINGS TAB */}
              {subTab === 'meetings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Meeting log feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Interaction History</span>
                    {dealMeetings.length > 0 ? (
                      dealMeetings.map(meet => (
                        <div 
                          key={meet.id} 
                          className="glass-panel"
                          style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 700 }}>{meet.title}</h4>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={10} /> {meet.meetingDate}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {meet.notes}
                          </p>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span>Who: <strong>{meet.attendees.join(', ')}</strong></span>
                          </div>
                          {meet.documents.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                              {meet.documents.map((doc, idx) => (
                                <span 
                                  key={idx} 
                                  style={{ 
                                    background: 'rgba(6, 182, 212, 0.05)', 
                                    color: 'var(--accent-cyan)', 
                                    padding: '0.15rem 0.4rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.65rem',
                                    border: '1px solid rgba(6, 182, 212, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <FileText size={9} /> {doc}
                                </span>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                            <button 
                              onClick={() => deleteMeetingLog(meet.id)}
                              className="btn-icon" 
                              style={{ padding: '0.15rem', color: 'var(--error)' }}
                              title="Delete log"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border-glass)', borderRadius: '4px' }}>
                        No meetings logged yet.
                      </div>
                    )}
                  </div>

                  {/* Add meeting log form */}
                  <form onSubmit={handleAddMeeting} className="glass-panel" style={{ padding: '1rem', border: '1px dashed var(--accent-indigo)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>Log New POC Meeting</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Meeting Date *</label>
                        <input
                          type="date"
                          required
                          value={meetDate}
                          onChange={e => setMeetDate(e.target.value)}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Agenda Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Scope Discovery"
                          value={meetTitle}
                          onChange={e => setMeetTitle(e.target.value)}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Attendees (comma separated) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Budi Santoso, Project Owner"
                        value={meetAttendees}
                        onChange={e => setMeetAttendees(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Discussion Notes (What) *</label>
                      <textarea
                        required
                        placeholder="Log meeting minutes, SOW modifications, decisions..."
                        value={meetNotes}
                        onChange={e => setMeetNotes(e.target.value)}
                        className="form-input"
                        rows={2}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', resize: 'vertical' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Related Documents (comma separated links)</label>
                      <input
                        type="text"
                        placeholder="e.g. SOW_Draft.docx, Proposal_Pricing.pdf"
                        value={meetDocs}
                        onChange={e => setMeetDocs(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{ padding: '0.4rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                    >
                      Save Meeting Log
                    </button>
                  </form>

                </div>
              )}

              {/* QUOTATION BUILDER TAB */}
              {subTab === 'quotation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Current quote list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Quotation Items</span>
                      {selectedDeal.quotationItems.length > 0 && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.25rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                          onClick={() => setIsPrintOpen(true)}
                        >
                          <Printer size={12} /> Exporter
                        </button>
                      )}
                    </div>

                    {selectedDeal.quotationItems.length > 0 ? (
                      <div className="table-container" style={{ border: '1px solid var(--border-glass)', borderRadius: '4px', background: 'rgba(0,0,0,0.1)' }}>
                        <table className="custom-table" style={{ fontSize: '0.75rem' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '0.5rem' }}>Item</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Price</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDeal.quotationItems.map(item => (
                              <tr key={item.id}>
                                <td style={{ padding: '0.5rem' }}>{item.description}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(item.unitPrice, selectedDeal.currency)}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                  <button 
                                    onClick={() => handleDeleteQuoteItem(item.id)}
                                    className="btn-icon" 
                                    style={{ padding: '0.15rem', color: 'var(--error)' }}
                                    title="Delete line"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 700 }}>
                              <td colSpan={2} style={{ padding: '0.5rem' }}>Subtotal</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(quotationSubtotal, selectedDeal.currency)}</td>
                              <td></td>
                            </tr>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              <td colSpan={2} style={{ padding: '0.5rem' }}>PPN (11%)</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(quotationTax, selectedDeal.currency)}</td>
                              <td></td>
                            </tr>
                            <tr style={{ background: 'rgba(99, 102, 241, 0.05)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-indigo)' }}>
                              <td colSpan={2} style={{ padding: '0.5rem' }}>Grand Total</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(quotationTotal, selectedDeal.currency)}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border-glass)', borderRadius: '4px' }}>
                        No items added to the quotation yet. Add proposal line items below.
                      </div>
                    )}
                  </div>

                  {/* Add quotation item form */}
                  <form onSubmit={handleAddQuoteItem} className="glass-panel" style={{ padding: '1rem', border: '1px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Add Line Item</span>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Description / Deliverable *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Professional Consultancy Module"
                        value={qiDesc}
                        onChange={e => setQiDesc(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Quantity *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={qiQty}
                          onChange={e => setQiQty(Number(e.target.value))}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Unit Price ({selectedDeal.currency}) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={qiPrice}
                          onChange={e => setQiPrice(Number(e.target.value))}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                    >
                      Append Line Item
                    </button>
                  </form>

                  {/* Quotation Metadata Settings */}
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Quotation Expiry & Terms</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Quote Date</label>
                        <input
                          type="date"
                          value={selectedDeal.quotationDate || ''}
                          onChange={e => handleUpdateQuoteMeta({ quotationDate: e.target.value })}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Expiry Date</label>
                        <input
                          type="date"
                          value={selectedDeal.quotationExpiry || ''}
                          onChange={e => handleUpdateQuoteMeta({ quotationExpiry: e.target.value })}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>Payment Terms & Conditions</label>
                      <textarea
                        placeholder="e.g. 30% Down Payment. Validity 30 days."
                        value={selectedDeal.quotationTerms || ''}
                        onChange={e => handleUpdateQuoteMeta({ quotationTerms: e.target.value })}
                        className="form-input"
                        rows={2}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </div>
        </>
      )}

      {/* DEAL CRUD MODAL */}
      {isDealModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingDeal ? 'Modify Sales Opportunity' : 'Log Sales Opportunity'}
              </h3>
              <button className="btn-icon" onClick={() => setIsDealModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDealSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label">Opportunity / Deal Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core System Integration License"
                    value={dealTitle}
                    onChange={e => setDealTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Client Company *</label>
                  <select
                    value={dealCompanyId}
                    onChange={e => {
                      setDealCompanyId(e.target.value);
                      const relatedContacts = contacts.filter(c => c.companyId === e.target.value);
                      setDealContactId(relatedContacts[0]?.id || '');
                    }}
                    className="form-select"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Client Contact (POC) *</label>
                  <select
                    value={dealContactId}
                    onChange={e => setDealContactId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select contact...</option>
                    {contacts.filter(c => c.companyId === dealCompanyId).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Opportunity Stage</label>
                    <select
                      value={dealStage}
                      onChange={e => setDealStage(e.target.value as SalesDealStage)}
                      className="form-select"
                    >
                      {stages.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Close Date *</label>
                    <input
                      type="date"
                      required
                      value={dealCloseDate}
                      onChange={e => setDealCloseDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Expected Deal Value *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={dealValue}
                      onChange={e => setDealValue(Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      value={dealCurrency}
                      onChange={e => setDealCurrency(e.target.value as Currency)}
                      className="form-select"
                    >
                      <option value="IDR">IDR (Rp)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">SOW Summary / Scope</label>
                  <textarea
                    placeholder="Enter project requirements, client request context..."
                    value={dealDesc}
                    onChange={e => setDealDesc(e.target.value)}
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDealModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDeal ? 'Save Changes' : 'Log Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTION TO MASTER PROJECT MODAL */}
      {isPromoteModalOpen && promotingDeal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderPlus size={18} className="gradient-text" /> Promote Opportunity to Post-Sales Delivery
              </h3>
              <button className="btn-icon" onClick={() => setIsPromoteModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePromoteConfirm}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(16, 185, 129, 0.25)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  This action will instantiate a <strong>Project Master Data</strong> and a corresponding <strong>Contract Agreement</strong> pre-filled with the Deal value ({formatCurrency(promotingDeal.value, promotingDeal.currency)}).
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Project Code *</label>
                    <input
                      type="text"
                      required
                      value={promoProjCode}
                      onChange={e => setPromoProjCode(e.target.value)}
                      className="form-input"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={promoProjName}
                      onChange={e => setPromoProjName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contract Reference Number *</label>
                  <input
                    type="text"
                    required
                    value={promoContractNo}
                    onChange={e => setPromoContractNo(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">SOW Start Date *</label>
                    <input
                      type="date"
                      required
                      value={promoStartDate}
                      onChange={e => setPromoStartDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Completion Date *</label>
                    <input
                      type="date"
                      required
                      value={promoEndDate}
                      onChange={e => setPromoEndDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPromoteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Master Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE QUOTATION EXPORTER DIALOG */}
      {isPrintOpen && selectedDeal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '850px', 
              background: 'white', 
              color: '#1e293b', 
              borderColor: '#cbd5e1', 
              animation: 'fadeIn 0.2s ease-out' 
            }}
          >
            {/* Control panel for Print / Close */}
            <div 
              className="no-print" 
              style={{ 
                padding: '1rem', 
                borderBottom: '1px solid #e2e8f0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: '#f8fafc' 
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Quotation Exporter PDF Preview</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.35rem' }} 
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#334155' }} 
                  onClick={() => setIsPrintOpen(false)}
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Print Sheet Area */}
            <div id="quotation-print-sheet" style={{ padding: '3.5rem', background: 'white', fontFamily: 'Inter, sans-serif' }}>
              
              {/* Top Banner Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>RUN SYSTEM</h1>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>VANGUARD SOLUTIONS</span>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    Gedung RUN System, Jl. Jend. Gatot Subroto<br />
                    Jakarta, Indonesia | info@runsystem.id
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', letterSpacing: '-0.02em', margin: 0 }}>QUOTATION</h2>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                    Ref: QTE/{selectedDeal.id.toUpperCase().substring(5)}/{new Date().getFullYear()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
                    Date: {selectedDeal.quotationDate || new Date().toISOString().split('T')[0]}<br />
                    Validity: {selectedDeal.quotationExpiry || '30 Days'}
                  </div>
                </div>
              </div>

              {/* Billing Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem', fontSize: '0.8rem', lineHeight: 1.45 }}>
                <div>
                  <span style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', marginBottom: '0.35rem' }}>Prepared For:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{selectedDealCompany ? selectedDealCompany.name : 'N/A'}</strong>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                    {selectedDealCompany?.address || 'Corporate Headquarters Address'}<br />
                    Email: {selectedDealCompany?.email || '-'}<br />
                    Phone: {selectedDealCompany?.phone || '-'}
                  </div>
                </div>
                <div>
                  <span style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', marginBottom: '0.35rem' }}>Attention Point of Contact:</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{selectedDealContact ? selectedDealContact.name : 'N/A'}</strong>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                    Role: {selectedDealContact?.role || 'Representative'}<br />
                    Direct Email: {selectedDealContact?.email || '-'}<br />
                    Direct Mobile: {selectedDealContact?.phone || '-'}
                  </div>
                </div>
              </div>

              {/* Scope summary */}
              <div style={{ marginBottom: '2.5rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', fontSize: '0.65rem', marginBottom: '0.35rem' }}>Project Scope Description:</span>
                <p style={{ color: '#334155', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  "{selectedDeal.description || 'System software customization, telemetry integration, and core user license deployment as discussed during discovery meetings.'}"
                </p>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', marginBottom: '2.5rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: 'white' }}>
                    <th style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>Description of Deliverables</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', width: '80px', fontWeight: 700 }}>Qty</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', width: '130px', fontWeight: 700 }}>Unit Price</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', width: '140px', fontWeight: 700 }}>Total ({selectedDeal.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDeal.quotationItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 0.8rem', color: '#334155' }}>
                        <strong>{idx + 1}. {item.description}</strong>
                      </td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(item.unitPrice, selectedDeal.currency)}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(item.quantity * item.unitPrice, selectedDeal.currency)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr>
                    <td colSpan={2} style={{ border: 'none' }}></td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Subtotal</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>
                      {formatCurrency(quotationSubtotal, selectedDeal.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ border: 'none' }}></td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>PPN Tax (11%)</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>
                      {formatCurrency(quotationTax, selectedDeal.currency)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #0f172a' }}>
                    <td colSpan={2} style={{ border: 'none' }}></td>
                    <td style={{ padding: '0.8rem 0.8rem', textAlign: 'right', color: '#6366f1', fontWeight: 800, fontSize: '0.9rem' }}>Grand Total</td>
                    <td style={{ padding: '0.8rem 0.8rem', textAlign: 'right', color: '#6366f1', fontWeight: 900, fontSize: '0.95rem' }}>
                      {formatCurrency(quotationTotal, selectedDeal.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Terms and Sign-off */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', fontSize: '0.75rem', marginTop: '2rem' }}>
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.4rem' }}>Terms & Conditions:</strong>
                  <p style={{ color: '#475569', lineHeight: 1.45, margin: 0, whiteSpace: 'pre-line' }}>
                    {selectedDeal.quotationTerms || '1. All prices are subject to 11% PPN tax.\n2. Payment terms: 50% DP on contract signature, 50% on UAT sign-off.\n3. Price quotation remains valid for 30 days.'}
                  </p>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: '120px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '3rem' }}>Authorized Signature</div>
                  <div style={{ width: '150px', borderBottom: '1px solid #94a3b8' }}></div>
                  <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.4rem' }}>RUN SYSTEM Vanguard CRM</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
