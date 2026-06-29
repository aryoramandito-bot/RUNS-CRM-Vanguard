import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { ClipboardList, CheckCircle } from 'lucide-react';

interface QuickMeetingLogProps {
  onLogSaved: () => void;
}

export const QuickMeetingLog: React.FC<QuickMeetingLogProps> = ({ onLogSaved }) => {
  const { deals, addMeetingLog } = useCRM();
  
  const [dealId, setDealId] = useState('');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendeesInput, setAttendeesInput] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealId || !title.trim() || !meetingDate || !notes.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    const attendees = attendeesInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    addMeetingLog({
      dealId,
      meetingDate,
      title: title.trim(),
      attendees,
      notes: notes.trim(),
      documents: []
    });

    setStatusMsg('Meeting log saved successfully!');
    
    // Reset Form
    setDealId('');
    setTitle('');
    setAttendeesInput('');
    setNotes('');
    
    setTimeout(() => {
      setStatusMsg('');
      onLogSaved(); // redirect
    }, 1500);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList className="gradient-text" size={28} /> Write Meeting Log
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Quickly log a meeting outcome for any active pre-sales opportunity.
        </p>
      </div>

      {statusMsg && (
        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Select Sales Opportunity *</label>
            <select
              required
              value={dealId}
              onChange={e => setDealId(e.target.value)}
              className="form-select"
              style={{ padding: '0.75rem', fontSize: '0.9rem', width: '100%' }}
            >
              <option value="">-- Select Active Deal --</option>
              {deals
                .filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
                .map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Meeting Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Technical Scope Alignment or OBD Demo"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="form-input"
              style={{ padding: '0.75rem', fontSize: '0.9rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Meeting Date *</label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="form-input"
              style={{ padding: '0.75rem', fontSize: '0.9rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Attendees (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Budi, Ani, Internal Architect"
              value={attendeesInput}
              onChange={e => setAttendeesInput(e.target.value)}
              className="form-input"
              style={{ padding: '0.75rem', fontSize: '0.9rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Discussion Notes & Outcomes *</label>
            <textarea
              required
              placeholder="Detail client feedback, next action items, and quotation request details..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-input"
              rows={6}
              style={{ padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
          >
            Save Meeting Log
          </button>
        </form>
      </div>
    </div>
  );
};
