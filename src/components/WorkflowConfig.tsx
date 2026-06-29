import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { WorkflowStageTemplate, ContractStageCategory } from '../types/crm';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  ChevronRight,
  Info
} from 'lucide-react';

export const WorkflowConfig: React.FC = () => {
  const { templates, updateTemplateStages, addNewTemplateType } = useCRM();

  // Selected Template
  const [selectedType, setSelectedType] = useState<string>(templates[0]?.contractType || '');

  // Active Stages Editing State (cloned from selected template)
  const activeTemplate = templates.find(t => t.contractType === selectedType);
  const [editedStages, setEditedStages] = useState<WorkflowStageTemplate[]>([]);
  const [lastSelectedType, setLastSelectedType] = useState<string>('');

  // Handle template selection change and clone stages
  if (selectedType && selectedType !== lastSelectedType && activeTemplate) {
    setEditedStages([...activeTemplate.stages]);
    setLastSelectedType(selectedType);
  }

  // Adding Custom Template Type State
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);

  // New Stage Inputs State
  const [newStageName, setNewStageName] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<ContractStageCategory>('Execution');
  const [newStageRelativeDays, setNewStageRelativeDays] = useState<number>(10);

  const handleAddNewType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    addNewTemplateType(newTypeName.trim());
    setSelectedType(newTypeName.trim());
    setNewTypeName('');
    setIsAddingType(false);
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newStage: WorkflowStageTemplate = {
      name: newStageName.trim(),
      description: newStageDesc.trim(),
      category: newStageCategory,
      relativeDays: newStageRelativeDays,
    };

    setEditedStages(prev => [...prev, newStage]);
    
    // Clear inputs
    setNewStageName('');
    setNewStageDesc('');
    setNewStageCategory('Execution');
    setNewStageRelativeDays(10);
  };

  const handleDeleteStage = (index: number) => {
    setEditedStages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedStages(prev => {
      const cloned = [...prev];
      const temp = cloned[index];
      cloned[index] = cloned[index - 1];
      cloned[index - 1] = temp;
      return cloned;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === editedStages.length - 1) return;
    setEditedStages(prev => {
      const cloned = [...prev];
      const temp = cloned[index];
      cloned[index] = cloned[index + 1];
      cloned[index + 1] = temp;
      return cloned;
    });
  };

  const handleSaveChanges = () => {
    if (!selectedType) return;
    updateTemplateStages(selectedType, editedStages);
    alert(`Successfully saved master stages configuration for contract type: "${selectedType}"`);
  };

  const categories: ContractStageCategory[] = [
    'Drafting',
    'Signing',
    'Execution',
    'Billing',
    'Collection',
    'Completed'
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Master Workflow & Contract Stage Templates</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Configure standard processes, sequential stages, and default collection milestones per contract category.
        </p>
      </div>

      <div className="workflow-config-grid">
        
        {/* Left Side: Template Contract Types List */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Contract Types</span>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.2rem' }}
              onClick={() => setIsAddingType(true)}
            >
              <Plus size={14} /> New Type
            </button>
          </div>

          {isAddingType && (
            <form onSubmit={handleAddNewType} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-glass)' }}>
              <input
                type="text"
                placeholder="e.g. Service Level SLA"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                className="form-input"
                required
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setIsAddingType(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {templates.map(t => {
              const isSelected = t.contractType === selectedType;
              return (
                <button
                  key={t.contractType}
                  onClick={() => setSelectedType(t.contractType)}
                  className="btn"
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.85rem' }}>{t.contractType}</span>
                  <ChevronRight size={14} style={{ color: isSelected ? 'var(--accent-indigo)' : 'var(--text-muted)' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Template Configuration Details */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {selectedType ? (
            <>
              {/* Template Title & Save Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    Standard Stages for: <span className="gradient-text">{selectedType}</span>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', marginTop: '0.15rem' }}>
                    Standard templates automatically populate when creating contracts of this type.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={handleSaveChanges} style={{ gap: '0.4rem' }}>
                  <Save size={16} /> Save Changes
                </button>
              </div>

              {/* Stage Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {editedStages.length > 0 ? (
                  editedStages.map((stage, idx) => (
                    <div 
                      key={idx}
                      className="glass-panel"
                      style={{ 
                        padding: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.01)',
                        gap: '1rem'
                      }}
                    >
                      {/* Left: Sequence index & metadata */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: 'var(--bg-tertiary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{stage.name}</span>
                            <span className={`badge badge-${stage.category.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                              {stage.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {stage.description || 'No description added.'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timeline offset, movement & delete actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right', minWidth: '90px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Relative Timeline</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>T + {stage.relativeDays} Days</span>
                        </div>

                        {/* Order manipulation */}
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            style={{ opacity: idx === 0 ? 0.3 : 1 }}
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === editedStages.length - 1}
                            style={{ opacity: idx === editedStages.length - 1 ? 0.3 : 1 }}
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleDeleteStage(idx)}
                            style={{ color: 'var(--error)' }}
                            title="Delete Stage"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No stages configured for this template. Use the form below to add stages.
                  </div>
                )}
              </div>

              {/* Add New Stage Form */}
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(99, 102, 241, 0.02)', 
                  borderStyle: 'dashed', 
                  borderColor: 'rgba(99, 102, 241, 0.25)' 
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={16} className="gradient-text" /> Add Stage to Template
                </h4>
                
                <form onSubmit={handleAddStage}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stage Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UAT Sign-off or Invoice Generation"
                        value={newStageName}
                        onChange={e => setNewStageName(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Relative Offset (Days from Sign) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={newStageRelativeDays}
                        onChange={e => setNewStageRelativeDays(Number(e.target.value))}
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Description / Work Scope</label>
                      <input
                        type="text"
                        placeholder="Detail the deliverable or requirement of this stage..."
                        value={newStageDesc}
                        onChange={e => setNewStageDesc(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Category</label>
                      <select
                        value={newStageCategory}
                        onChange={e => setNewStageCategory(e.target.value as ContractStageCategory)}
                        className="form-select"
                        style={{ padding: '0.5rem' }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', gap: '0.3rem' }}>
                      <Plus size={14} /> Append Stage
                    </button>
                  </div>
                </form>
              </div>

              {/* Explanatory Info Box */}
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                <Info size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <h5 style={{ fontWeight: 700, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>Relative Offsets & Invoicing</h5>
                  <p style={{ lineHeight: 1.4 }}>
                    The "Relative Offset" dictates how many days after the contract start date this stage is expected to complete.
                    Choosing <strong>Billing</strong> or <strong>Collection</strong> categories enables the billing amount tracker for invoicing.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No contract template categories available. Create one to begin.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
