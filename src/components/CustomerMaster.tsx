import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import type { ClientCompany, ClientContact, CustomerStatus } from '../types/crm';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Mail,
  Phone,
  Building,
  Briefcase,
  Users,
  MapPin,
  UserCheck
} from 'lucide-react';

export const CustomerMaster: React.FC = () => {
  const { 
    companies, 
    contacts, 
    addCompany, 
    updateCompany, 
    deleteCompany, 
    addContact, 
    updateContact, 
    deleteContact 
  } = useCRM();

  // Sub-Tab Switcher State: 'contacts' or 'companies'
  const [subTab, setSubTab] = useState<'contacts' | 'companies'>('contacts');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All'); // For Companies
  const [companyFilter, setCompanyFilter] = useState('All'); // For Contacts

  // Modal States
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ClientCompany | null>(null);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);

  // Company Form States
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compStatus, setCompStatus] = useState<CustomerStatus>('Active');

  // Contact Form States
  const [contName, setContName] = useState('');
  const [contCompanyId, setContCompanyId] = useState('');
  const [contEmail, setContEmail] = useState('');
  const [contPhone, setContPhone] = useState('');
  const [contRole, setContRole] = useState('');
  const [contStatus, setContStatus] = useState<CustomerStatus>('Active');

  // Extract unique industries for filtering
  const industries = ['All', ...Array.from(new Set(companies.map(c => c.industry)))];

  // --- Company Modal Actions ---
  const handleOpenAddCompany = () => {
    setEditingCompany(null);
    setCompName('');
    setCompIndustry('');
    setCompEmail('');
    setCompPhone('');
    setCompAddress('');
    setCompStatus('Active');
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (company: ClientCompany) => {
    setEditingCompany(company);
    setCompName(company.name);
    setCompIndustry(company.industry);
    setCompEmail(company.email);
    setCompPhone(company.phone);
    setCompAddress(company.address);
    setCompStatus(company.status);
    setIsCompanyModalOpen(true);
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;

    const companyData = {
      name: compName.trim(),
      industry: compIndustry.trim() || 'Other',
      email: compEmail.trim(),
      phone: compPhone.trim(),
      address: compAddress.trim(),
      status: compStatus,
    };

    if (editingCompany) {
      updateCompany(editingCompany.id, companyData);
    } else {
      addCompany(companyData);
    }
    setIsCompanyModalOpen(false);
  };

  const handleDeleteCompany = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company? Linked contacts and projects will lose their company parent association.')) {
      deleteCompany(id);
    }
  };

  // --- Contact Modal Actions ---
  const handleOpenAddContact = () => {
    if (companies.length === 0) {
      alert('Please register at least one Client Company before adding a contact.');
      return;
    }
    setEditingContact(null);
    setContName('');
    setContCompanyId(companies[0].id);
    setContEmail('');
    setContPhone('');
    setContRole('');
    setContStatus('Active');
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (contact: ClientContact) => {
    setEditingContact(contact);
    setContName(contact.name);
    setContCompanyId(contact.companyId);
    setContEmail(contact.email);
    setContPhone(contact.phone);
    setContRole(contact.role);
    setContStatus(contact.status);
    setIsContactModalOpen(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contName.trim() || !contCompanyId) return;

    const contactData = {
      companyId: contCompanyId,
      name: contName.trim(),
      email: contEmail.trim(),
      phone: contPhone.trim(),
      role: contRole.trim() || 'Representative',
      status: contStatus,
    };

    if (editingContact) {
      updateContact(editingContact.id, contactData);
    } else {
      addContact(contactData);
    }
    setIsContactModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Are you sure you want to delete this client contact?')) {
      deleteContact(id);
    }
  };

  // Filter & Search Logic
  const filteredContacts = contacts.filter(c => {
    const comp = companies.find(comp => comp.id === c.companyId);
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comp?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === 'All' || c.companyId === companyFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesCompany && matchesStatus;
  });

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = industryFilter === 'All' || c.industry === industryFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesIndustry && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>RUN System Vanguard Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage client corporate accounts and individual contact representatives.
          </p>
        </div>
        
        {subTab === 'contacts' ? (
          <button className="btn btn-primary" onClick={handleOpenAddContact}>
            <Plus size={16} /> Add Client Contact
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleOpenAddCompany}>
            <Plus size={16} /> Add Client Company
          </button>
        )}
      </div>

      {/* Sub-Tabs switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => {
            setSubTab('contacts');
            setSearchQuery('');
            setStatusFilter('All');
          }}
          className="btn"
          style={{
            background: subTab === 'contacts' ? 'rgba(255,255,255,0.06)' : 'transparent',
            borderColor: subTab === 'contacts' ? 'var(--accent-indigo)' : 'transparent',
            borderBottom: subTab === 'contacts' ? '2px solid var(--accent-indigo)' : 'none',
            color: subTab === 'contacts' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Users size={16} /> Client Contacts
        </button>
        <button
          onClick={() => {
            setSubTab('companies');
            setSearchQuery('');
            setStatusFilter('All');
          }}
          className="btn"
          style={{
            background: subTab === 'companies' ? 'rgba(255,255,255,0.06)' : 'transparent',
            borderColor: subTab === 'companies' ? 'var(--accent-indigo)' : 'transparent',
            borderBottom: subTab === 'companies' ? '2px solid var(--accent-indigo)' : 'none',
            color: subTab === 'companies' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Building size={16} /> Client Companies
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
            placeholder={subTab === 'contacts' ? "Search contacts, company, emails..." : "Search companies, industries..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Conditional filter based on subTab */}
          {subTab === 'contacts' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter Company:</span>
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                className="form-select"
                style={{ width: '180px', padding: '0.5rem' }}
              >
                <option value="All">All Companies</option>
                {companies.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Industry:</span>
              <select
                value={industryFilter}
                onChange={e => setIndustryFilter(e.target.value)}
                className="form-select"
                style={{ width: '160px', padding: '0.5rem' }}
              >
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          )}

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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Tables Grid */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        
        {subTab === 'contacts' ? (
          /* Client Contacts Table */
          filteredContacts.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Contact Person</th>
                    <th>Linked Company</th>
                    <th>Contact Details</th>
                    <th>Role / Designation</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => {
                    const comp = companies.find(c => c.id === contact.companyId);
                    return (
                      <tr key={contact.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{contact.name}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Building size={13} /> {comp ? comp.name : 'Unassociated Company'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                              <Mail size={12} /> {contact.email}
                            </div>
                            {contact.phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                                <Phone size={12} /> {contact.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <UserCheck size={14} className="gradient-text" />
                            <span>{contact.role}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${contact.status.toLowerCase()}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {contact.dateAdded}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleOpenEditContact(contact)}
                              className="btn-icon" 
                              title="Edit Contact"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteContact(contact.id)}
                              className="btn-icon" 
                              title="Delete Contact"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={16} />
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No client contacts found matching filters.
            </div>
          )
        ) : (
          /* Client Companies Table */
          filteredCompanies.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Industry Sector</th>
                    <th>Company Contacts</th>
                    <th>HQ Address</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map(company => {
                    const compContacts = contacts.filter(c => c.companyId === company.id);
                    return (
                      <tr key={company.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{company.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                              <span>{company.email}</span>
                              {company.phone && <span>• {company.phone}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <Briefcase size={14} className="gradient-text" />
                            <span>{company.industry}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {compContacts.length > 0 ? (
                              <span>{compContacts.map(c => c.name).join(', ')}</span>
                            ) : (
                              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No contacts added</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {company.address ? (
                              <>
                                <MapPin size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{company.address}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${company.status.toLowerCase()}`}>
                            {company.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {company.dateAdded}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleOpenEditCompany(company)}
                              className="btn-icon" 
                              title="Edit Company"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCompany(company.id)}
                              className="btn-icon" 
                              title="Delete Company"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={16} />
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
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No client companies found matching filters.
            </div>
          )
        )}

      </div>

      {/* Client Company CRUD Modal */}
      {isCompanyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingCompany ? 'Edit Company Profile' : 'Register New Client Company'}
              </h3>
              <button className="btn-icon" onClick={() => setIsCompanyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCompanySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={e => setCompName(e.target.value)}
                    placeholder="e.g. PT Telekom Indonesia Tbk"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Industry Sector</label>
                    <input
                      type="text"
                      value={compIndustry}
                      onChange={e => setCompIndustry(e.target.value)}
                      placeholder="e.g. Telecommunications, Finance"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={compStatus}
                      onChange={e => setCompStatus(e.target.value as CustomerStatus)}
                      className="form-select"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Corporate Email</label>
                    <input
                      type="email"
                      value={compEmail}
                      onChange={e => setCompEmail(e.target.value)}
                      placeholder="e.g. contact@company.com"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Corporate Phone</label>
                    <input
                      type="text"
                      value={compPhone}
                      onChange={e => setCompPhone(e.target.value)}
                      placeholder="e.g. +62 21..."
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">HQ Address</label>
                  <textarea
                    value={compAddress}
                    onChange={e => setCompAddress(e.target.value)}
                    placeholder="Enter corporate office street details..."
                    className="form-input"
                    rows={2}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompanyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCompany ? 'Save Changes' : 'Register Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Contact CRUD Modal */}
      {isContactModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingContact ? 'Edit Contact Person' : 'Register New Contact Representative'}
              </h3>
              <button className="btn-icon" onClick={() => setIsContactModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Associated Client Company *</label>
                  <select
                    value={contCompanyId}
                    onChange={e => setContCompanyId(e.target.value)}
                    className="form-select"
                  >
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.industry})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Full Name *</label>
                    <input
                      type="text"
                      required
                      value={contName}
                      onChange={e => setContName(e.target.value)}
                      placeholder="e.g. Budi Santoso"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role / Job Title</label>
                    <input
                      type="text"
                      value={contRole}
                      onChange={e => setContRole(e.target.value)}
                      placeholder="e.g. IT Director, Consultant"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contEmail}
                      onChange={e => setContEmail(e.target.value)}
                      placeholder="e.g. representative@email.com"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Phone</label>
                    <input
                      type="text"
                      value={contPhone}
                      onChange={e => setContPhone(e.target.value)}
                      placeholder="e.g. +62 811..."
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={contStatus}
                    onChange={e => setContStatus(e.target.value as CustomerStatus)}
                    className="form-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsContactModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingContact ? 'Save Changes' : 'Register Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
