import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { Project, ProjectStatus, Currency } from '../types/crm';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Calendar, 
  ChevronRight,
  User,
  AlertTriangle
} from 'lucide-react';

export const ProjectMaster: React.FC = () => {
  const { projects, companies, addProject, updateProject, deleteProject } = useCRM();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [budget, setBudget] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [status, setStatus] = useState<ProjectStatus>('Planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenAddModal = () => {
    if (companies.length === 0) {
      alert('Please register at least one Client Company in Directory before creating a project.');
      return;
    }
    setEditingProject(null);
    setName('');
    setCode('');
    setCompanyId(companies[0].id);
    setBudget(0);
    setCurrency('IDR');
    setStatus('Planning');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setCode(project.code);
    setCompanyId(project.companyId);
    setBudget(project.budget);
    setCurrency(project.currency);
    setStatus(project.status);
    setStartDate(project.startDate);
    setEndDate(project.endDate);
    setDescription(project.description);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !companyId || !startDate || !endDate) return;

    const projectData = {
      companyId,
      name,
      code,
      budget,
      currency,
      status,
      startDate,
      endDate,
      description,
    };

    if (editingProject) {
      updateProject(editingProject.id, projectData);
    } else {
      addProject(projectData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? Contracts linked to this project will lose their parent project linkage.')) {
      deleteProject(id);
    }
  };

  // Helper formatting
  const formatCurrency = (value: number, curr: Currency) => {
    if (curr === 'IDR') {
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

  // Filter & Search Logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === 'All' || p.companyId === companyFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesCompany && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Project Master Data</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Track client project schedules, master budgets (IDR / USD), and operational status.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={16} /> Add Project
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
            placeholder="Search project name, code, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Company Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Company:</span>
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: '150px', padding: '0.5rem' }}
            >
              <option value="All">All Statuses</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredProjects.map(project => {
            const client = companies.find(c => c.id === project.companyId);
            
            return (
              <div 
                key={project.id} 
                className="glass-panel glass-panel-hover" 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                {/* Project Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                        fontWeight: 700
                      }}
                    >
                      {project.code}
                    </span>
                    <span className={`badge badge-${project.status.toLowerCase().replace(' ', '-')}`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.4rem 0' }}>{project.name}</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                    <User size={13} />
                    <span>{client ? client.name : 'Unknown Company'}</span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4, height: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Project Footer Stats */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Project Budget</span>
                    <span 
                      style={{ 
                        fontSize: '1rem', 
                        fontWeight: 800, 
                        color: project.currency === 'IDR' ? 'var(--text-primary)' : 'var(--accent-cyan)' 
                      }}
                    >
                      {formatCurrency(project.budget, project.currency)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} />
                      <span>{project.startDate}</span>
                    </div>
                    <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} />
                      <span>{project.endDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button 
                      onClick={() => handleOpenEditModal(project)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem', color: 'var(--error)', borderColor: 'rgba(244, 63, 94, 0.15)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }} className="glass-panel">
          <AlertTriangle size={24} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
          <div>No projects found. Register projects and link them to clients.</div>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingProject ? 'Edit Project Master Data' : 'Register New Project'}
              </h3>
              <button className="btn-icon" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. ERP Integration Phase 1"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Code *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="e.g. ERP-01"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Client Company *</label>
                  <select
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    className="form-select"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.industry})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Budget Value *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={budget}
                      onChange={e => setBudget(Number(e.target.value))}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Project Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Enter details about scope of work, stakeholders, etc."
                      className="form-input"
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ProjectStatus)}
                    className="form-select"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? 'Save Changes' : 'Register Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
