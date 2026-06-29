import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { ContractStage, ContractStageCategory, ContractStageStatus, Currency } from '../types/crm';
import { 
  CheckCircle2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  FileText, 
  DollarSign, 
  Info,
  Clock,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

interface FlowMonitorProps {
  selectedContractId: string;
  onBackToList?: () => void;
}

export const FlowMonitor: React.FC<FlowMonitorProps> = ({ selectedContractId, onBackToList }) => {
  const { contracts, projects, updateContractStage, addCustomStage, deleteContractStage, reorderContractStages } = useCRM();

  // Active Contract State
  const [activeContractId, setActiveContractId] = useState<string>(selectedContractId);
  const contract = contracts.find(c => c.id === activeContractId);
  const project = contract ? projects.find(p => p.id === contract.projectId) : null;

  // Selected Stage for Detail Editing
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Form States for Editing Stage Details
  const [stageNotes, setStageNotes] = useState('');
  const [stageStatus, setStageStatus] = useState<ContractStageStatus>('Pending');
  const [stageDueDate, setStageDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billingAmount, setBillingAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');

  // Form States for Adding Custom Stage
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<ContractStageCategory>('Execution');
  const [customDueDate, setCustomDueDate] = useState('');
  const [insertAfterId, setInsertAfterId] = useState('');

  // Load stage details when selected
  const handleSelectStage = (stage: ContractStage) => {
    setSelectedStageId(stage.id);
    setStageNotes(stage.notes || '');
    setStageStatus(stage.status);
    setStageDueDate(stage.dueDate);
    setInvoiceNumber(stage.invoiceNumber || '');
    setBillingAmount(stage.billingAmount || 0);
    setPaymentReference(stage.paymentReference || '');
  };

  const handleSaveStageDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !selectedStageId) return;

    updateContractStage(contract.id, selectedStageId, {
      notes: stageNotes,
      status: stageStatus,
      dueDate: stageDueDate,
      invoiceNumber: invoiceNumber || null,
      billingAmount: billingAmount || null,
      paymentReference: paymentReference || null,
    });

    alert('Stage status and logs updated successfully.');
    setSelectedStageId(null);
  };

  const handleAddCustomStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !customName.trim() || !customDueDate) return;

    addCustomStage(
      contract.id,
      {
        name: customName.trim(),
        description: customDesc.trim(),
        category: customCategory,
        status: 'Pending',
        dueDate: customDueDate,
        completedDate: null,
        invoiceNumber: null,
        billingAmount: customCategory === 'Billing' || customCategory === 'Collection' ? 0 : null,
        paymentReference: null,
        notes: '',
      },
      insertAfterId || undefined
    );

    // Reset Form
    setCustomName('');
    setCustomDesc('');
    setCustomCategory('Execution');
    setCustomDueDate('');
    setInsertAfterId('');
    setIsAddingCustom(false);
    alert('Custom project stage successfully added to this contract workflow!');
  };

  const handleDeleteStage = (stageId: string) => {
    if (!contract) return;
    if (contract.stages.length <= 1) {
      alert('A contract must retain at least one stage in its workflow lifecycle.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this stage from this project contract?')) {
      deleteContractStage(contract.id, stageId);
      if (selectedStageId === stageId) setSelectedStageId(null);
    }
  };

  const handleMoveStageUp = (index: number) => {
    if (!contract || index === 0) return;
    const reordered = [...contract.stages];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;
    reorderContractStages(contract.id, reordered);
  };

  const handleMoveStageDown = (index: number) => {
    if (!contract || index === contract.stages.length - 1) return;
    const reordered = [...contract.stages];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;
    reorderContractStages(contract.id, reordered);
  };

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

  if (!contract) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--error)' }}>Contract Not Found</h3>
        <select 
          value={activeContractId} 
          onChange={e => setActiveContractId(e.target.value)}
          className="form-select"
          style={{ width: '300px', margin: '1rem auto' }}
        >
          <option value="">Select a contract...</option>
          {contracts.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back Button & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBackToList && (
            <button 
              className="btn btn-secondary" 
              onClick={onBackToList}
              style={{ padding: '0.5rem', borderRadius: '50%' }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Contract Flow Monitor</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Customizable project workflow timeline for tracking finalization, billing, and cash collection.
            </p>
          </div>
        </div>

        {/* Contract Selector */}
        <select
          value={activeContractId}
          onChange={e => {
            setActiveContractId(e.target.value);
            setSelectedStageId(null);
          }}
          className="form-select"
          style={{ width: '320px' }}
        >
          {contracts.map(c => (
            <option key={c.id} value={c.id}>{c.title} ({c.contractNumber})</option>
          ))}
        </select>
      </div>

      {/* Contract & Project Summary Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          background: 'var(--bg-secondary)',
          borderLeft: '4px solid var(--accent-indigo)'
        }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contract Number</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem', fontFamily: 'monospace' }}>{contract.contractNumber}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Parent Project</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem' }}>{project ? `${project.name} (${project.code})` : 'N/A'}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Book Value</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem', color: contract.currency === 'IDR' ? 'var(--text-primary)' : 'var(--accent-cyan)' }}>
            {formatCurrency(contract.value, contract.currency)}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Workflow Type</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem' }}>{contract.type}</div>
        </div>
      </div>

      {/* Timeline & Detail Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Timeline representation */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Active Lifecycle Stages</span>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.3rem' }}
              onClick={() => setIsAddingCustom(true)}
            >
              <Plus size={14} /> Custom Stage
            </button>
          </div>

          {/* Timeline Node Flow */}
          <div className="timeline-flow">
            {contract.stages.map((stage, idx) => {
              const isSelected = selectedStageId === stage.id;
              
              return (
                <div key={stage.id} className="timeline-node">
                  {/* Glowing connector bullet */}
                  <div className={`timeline-bullet ${stage.status}`} />

                  {/* Stage Card */}
                  <div 
                    className={`timeline-content-card ${stage.status === 'Active' ? 'Active' : ''}`}
                    onClick={() => handleSelectStage(stage)}
                    style={{ 
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent-indigo)' : 'var(--border-glass)',
                      boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{stage.name}</h4>
                          <span className={`badge badge-${stage.status.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>
                            {stage.status}
                          </span>
                          <span className={`badge badge-${stage.category.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>
                            {stage.category}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {stage.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <div>Due: {stage.dueDate}</div>
                          {stage.completedDate && <div style={{ color: 'var(--success)' }}>Done: {stage.completedDate}</div>}
                        </div>
                        
                        {/* Order & Delete Options */}
                        <div 
                          style={{ display: 'flex', gap: '0.15rem' }} 
                          onClick={e => e.stopPropagation()} // Stop clicking button from opening editing form
                        >
                          <button 
                            className="btn-icon" 
                            style={{ padding: '0.2rem' }}
                            onClick={() => handleMoveStageUp(idx)}
                            disabled={idx === 0}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ padding: '0.2rem' }}
                            onClick={() => handleMoveStageDown(idx)}
                            disabled={idx === contract.stages.length - 1}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ padding: '0.2rem', color: 'var(--error)' }}
                            onClick={() => handleDeleteStage(stage.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Invoicing info pill in Card */}
                    {(stage.invoiceNumber || (stage.billingAmount && stage.billingAmount > 0)) && (
                      <div style={{ marginTop: '0.6rem', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {stage.invoiceNumber && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FileText size={11} className="gradient-text" />
                            <span>Inv: <strong>{stage.invoiceNumber}</strong></span>
                          </div>
                        )}
                        {stage.billingAmount && stage.billingAmount > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <DollarSign size={11} style={{ color: 'var(--success)' }} />
                            <span>Value: <strong>{formatCurrency(stage.billingAmount, contract.currency)}</strong></span>
                          </div>
                        )}
                        {stage.paymentReference && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={11} style={{ color: 'var(--success)' }} />
                            <span>Ref: <strong>{stage.paymentReference}</strong></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Logged Stage Notes */}
                    {stage.notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '0.5rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        "{stage.notes}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Pane: Editing active stage or adding custom stage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Edit Stage Details Form */}
          {selectedStageId ? (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--accent-indigo)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Update Stage Log</span>
                <button className="btn-icon" onClick={() => setSelectedStageId(null)}>
                  <Clock size={16} /> Close
                </button>
              </div>

              <form onSubmit={handleSaveStageDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Stage Status</label>
                  <select
                    value={stageStatus}
                    onChange={e => setStageStatus(e.target.value as ContractStageStatus)}
                    className="form-select"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Done">Completed (Done)</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    required
                    value={stageDueDate}
                    onChange={e => setStageDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Billing/Collection Fields (Conditional) */}
                {((contract.stages.find(s => s.id === selectedStageId)?.category === 'Billing') || 
                  (contract.stages.find(s => s.id === selectedStageId)?.category === 'Collection')) && (
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Invoicing & Collection Data</span>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Invoice Number</label>
                      <input
                        type="text"
                        placeholder="e.g. INV/2026/042"
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Billing Amount ({contract.currency})</label>
                      <input
                        type="number"
                        min={0}
                        value={billingAmount}
                        onChange={e => setBillingAmount(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      />
                    </div>

                    {contract.stages.find(s => s.id === selectedStageId)?.category === 'Collection' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Ref / Bank Receipt</label>
                        <input
                          type="text"
                          placeholder="e.g. TRF-BCA-98754"
                          value={paymentReference}
                          onChange={e => setPaymentReference(e.target.value)}
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Internal Audit Notes</label>
                  <textarea
                    placeholder="Log progress comments, legal hurdles or bank transfer delays..."
                    value={stageNotes}
                    onChange={e => setStageNotes(e.target.value)}
                    className="form-input"
                    rows={3}
                    style={{ fontSize: '0.8rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedStageId(null)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Save Log
                  </button>
                </div>

              </form>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Info size={20} style={{ color: 'var(--accent-indigo)', marginBottom: '0.5rem' }} />
              <div>Click any stage card on the timeline to log progress, invoice details, or update completion status.</div>
            </div>
          )}

          {/* Add Custom Stage Form */}
          {isAddingCustom && (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px dashed var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={14} className="gradient-text" /> Insert Project Stage
                </span>
                <button className="btn-icon" onClick={() => setIsAddingCustom(false)}>
                  <Trash2 size={16} /> Close
                </button>
              </div>

              <form onSubmit={handleAddCustomStage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Stage Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design Prototype Signoff"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="form-input"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    placeholder="Explain requirements of this step..."
                    value={customDesc}
                    onChange={e => setCustomDesc(e.target.value)}
                    className="form-input"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category</label>
                    <select
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value as ContractStageCategory)}
                      className="form-select"
                      style={{ padding: '0.45rem', fontSize: '0.85rem' }}
                    >
                      <option value="Drafting">Drafting</option>
                      <option value="Signing">Signing</option>
                      <option value="Execution">Execution</option>
                      <option value="Billing">Billing</option>
                      <option value="Collection">Collection</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={customDueDate}
                      onChange={e => setCustomDueDate(e.target.value)}
                      className="form-input"
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Insert After Stage</label>
                  <select
                    value={insertAfterId}
                    onChange={e => setInsertAfterId(e.target.value)}
                    className="form-select"
                    style={{ padding: '0.45rem', fontSize: '0.85rem' }}
                  >
                    <option value="">Append at the end</option>
                    {contract.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsAddingCustom(false)}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Add Stage
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
