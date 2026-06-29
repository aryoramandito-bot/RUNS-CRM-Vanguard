import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { Contract, ContractStatus, Currency } from '../types/crm';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  FileSignature, 
  Activity, 
  Layers
} from 'lucide-react';

interface ContractMasterProps {
  onManageWorkflow: (contractId: string) => void;
}

export const ContractMaster: React.FC<ContractMasterProps> = ({ onManageWorkflow }) => {
  const { contracts, projects, templates, addContract, updateContract, deleteContract, companies } = useCRM();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Form States
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [type, setType] = useState('');
  const [value, setValue] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [status, setStatus] = useState<ContractStatus>('Draft');
  const [signDate, setSignDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleOpenAddModal = () => {
    if (projects.length === 0) {
      alert('Please register at least one Project in Project Master Data before creating a contract.');
      return;
    }
    if (templates.length === 0) {
      alert('No contract type templates configured. Set up templates in Workflow Config first.');
      return;
    }
    setEditingContract(null);
    setProjectId(projects[0].id);
    setTitle('');
    setContractNumber('');
    setType(templates[0].contractType);
    setValue(0);
    setCurrency('IDR');
    setStatus('Draft');
    setSignDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setProjectId(contract.projectId);
    setTitle(contract.title);
    setContractNumber(contract.contractNumber);
    setType(contract.type);
    setValue(contract.value);
    setCurrency(contract.currency);
    setStatus(contract.status);
    setSignDate(contract.signDate);
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !title || !contractNumber || !type || !startDate || !endDate) return;

    const contractData = {
      projectId,
      title,
      contractNumber,
      type,
      value,
      currency,
      status,
      signDate,
      startDate,
      endDate,
    };

    if (editingContract) {
      // Direct edits on basic properties (preserve existing workflow stages)
      updateContract(editingContract.id, contractData);
    } else {
      // New contract instantiates workflow stages automatically
      addContract(contractData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contract? This will permanently erase the contract and all logged workflow/collection stages.')) {
      deleteContract(id);
    }
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

  // Filter & Search Logic
  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Contracts per Project Master</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Assign contract agreements to projects, track value, and initiate customizable workflows.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={16} /> Add Contract
        </button>
      </div>

      {/* Search and Filters panel */}
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
        {/* Search */}
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
            placeholder="Search contract title, reference number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Contract Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="form-select"
              style={{ width: '180px', padding: '0.5rem' }}
            >
              <option value="All">All Types</option>
              {templates.map(t => (
                <option key={t.contractType} value={t.contractType}>{t.contractType}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: '130px', padding: '0.5rem' }}
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Review">Review</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

        </div>
      </div>

      {/* Contracts Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {filteredContracts.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Contract Details</th>
                  <th>Parent Project</th>
                  <th>Type & Value</th>
                  <th>Timeline Status</th>
                  <th>Flow Progress</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map(contract => {
                  const proj = projects.find(p => p.id === contract.projectId);
                  
                  // Stage calculations
                  const totalStages = contract.stages.length;
                  const doneStages = contract.stages.filter(s => s.status === 'Done' || s.status === 'Skipped').length;
                  const progressPct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;
                  
                  const activeStage = contract.stages.find(s => s.status === 'Active');

                  return (
                    <tr key={contract.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{contract.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Ref: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{contract.contractNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {proj ? `${proj.name} (${proj.code})` : 'Orphan Project'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {contract.type}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: contract.currency === 'IDR' ? 'var(--text-secondary)' : 'var(--accent-cyan)', fontWeight: 700, marginTop: '0.15rem' }}>
                            {formatCurrency(contract.value, contract.currency)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span className={`badge badge-${contract.status.toLowerCase()}`}>
                            {contract.status}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Signed: {contract.signDate}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ width: '130px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            <span>Progress</span>
                            <span style={{ fontWeight: 700 }}>{progressPct}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${progressPct}%`, 
                                height: '100%', 
                                background: progressPct === 100 ? 'var(--success)' : 'var(--accent-indigo)',
                                borderRadius: '2px' 
                              }} 
                            />
                          </div>
                          {activeStage && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Next: {activeStage.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            onClick={() => onManageWorkflow(contract.id)}
                            className="btn btn-secondary" 
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              fontSize: '0.75rem', 
                              gap: '0.3rem',
                              borderColor: 'rgba(99, 102, 241, 0.3)',
                              background: 'rgba(99, 102, 241, 0.05)'
                            }}
                            title="Monitor and customize stages"
                          >
                            <Activity size={14} className="gradient-text" /> Flow Monitor
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(contract)}
                            className="btn-icon" 
                            title="Edit Contract Properties"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(contract.id)}
                            className="btn-icon" 
                            title="Delete Contract"
                            style={{ color: 'var(--error)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <FileSignature size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
            <div>No contracts recorded yet. Create a contract to monitor its collection milestones.</div>
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingContract ? 'Edit Contract Settings' : 'Create Project Contract'}
              </h3>
              <button className="btn-icon" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                
                <div className="form-group">
                  <label className="form-label">Contract Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Master Services Agreement Phase 2"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contract Number / Reference *</label>
                    <input
                      type="text"
                      required
                      value={contractNumber}
                      onChange={e => setContractNumber(e.target.value)}
                      placeholder="e.g. CNT/XYZ/2026/001"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contract Type (Template Flow) *</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value)}
                      className="form-select"
                      disabled={!!editingContract} // Cannot change template workflow after creation to prevent stage corruptions
                    >
                      {templates.map(t => (
                        <option key={t.contractType} value={t.contractType}>{t.contractType}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Master Project *</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="form-select"
                  >
                    {projects.map(p => {
                      const c = companies.find(comp => comp.id === p.companyId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.code}] - {c ? c.name : 'N/A'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contract Value *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={value}
                      onChange={e => setValue(Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value as Currency)}
                      className="form-select"
                    >
                      <option value="IDR">IDR (Rp)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Sign Date *</label>
                    <input
                      type="date"
                      required
                      value={signDate}
                      onChange={e => setSignDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contract Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ContractStatus)}
                    className="form-select"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Review">Review</option>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                {!editingContract && (
                  <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(99, 102, 241, 0.25)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Layers size={22} style={{ color: 'var(--accent-indigo)' }} />
                    <div>
                      <strong>Note:</strong> Creating this contract will automatically instantiate default lifecycle workflow stages for <strong>{type}</strong>. You can customize them later.
                    </div>
                  </div>
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingContract ? 'Save Settings' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
