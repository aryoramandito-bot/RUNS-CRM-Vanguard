import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Database, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Copy,
  Check,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';

export const DatabaseSync: React.FC = () => {
  const { 
    sheetUrl, setSheetUrl, 
    isSyncing, autoSync, setAutoSync, 
    syncFromSheets, syncToSheets,
    tursoUrl, setTursoUrl,
    tursoToken, setTursoToken,
    syncFromTurso, syncToTurso
  } = useCRM();
  
  const [urlInput, setUrlInput] = useState(sheetUrl);
  const [copiedScript, setCopiedScript] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Turso local inputs
  const [tursoUrlInput, setTursoUrlInput] = useState(tursoUrl);
  const [tursoTokenInput, setTursoTokenInput] = useState(tursoToken);
  const [copiedTursoSchema, setCopiedTursoSchema] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'turso' | 'sheets'>('turso');

  // Password Protection States
  const [passwordInput, setPasswordInput] = useState('');
  const [passError, setPassError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [hasPulled, setHasPulled] = useState(() => {
    return localStorage.getItem('vanguard_has_pulled') === 'true';
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '12345') {
      setIsAuthenticated(true);
    } else {
      setPassError('Incorrect password. Access denied.');
    }
  };

  // Idle inactivity lock timer (5 minutes timeout)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsAuthenticated(false);
        setPasswordInput('');
        setSyncResult({ type: 'error', message: 'Session locked due to inactivity. Please enter password again.' });
      }, 5 * 60 * 1000); // 5 minutes inactivity timeout
    };

    resetTimer();

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setSheetUrl(urlInput.trim());
    setSyncResult({ type: 'success', message: 'URL saved successfully. You can now execute a Sync operation.' });
  };

  const handlePull = async () => {
    if (!sheetUrl) {
      setSyncResult({ type: 'error', message: 'Please save a valid Google Apps Script Web App URL first.' });
      return;
    }
    
    if (window.confirm('Pulling from Google Sheets will overwrite your current local database data. Do you wish to proceed?')) {
      const res = await syncFromSheets();
      if (res.success) {
        setHasPulled(true);
        setSyncResult({ type: 'success', message: res.message });
      } else {
        setSyncResult({ type: 'error', message: res.message });
      }
    }
  };

  const handlePush = async () => {
    if (!urlInput) {
      setSyncResult({ type: 'error', message: 'Please provide a valid Google Apps Script Web App URL.' });
      return;
    }

    if (window.confirm('Pushing to Google Sheets will overwrite the sheets in your Google spreadsheet. Do you wish to proceed?')) {
      // Pass urlInput directly in case they haven't saved it yet
      const res = await syncToSheets(urlInput.trim());
      if (res.success) {
        setSheetUrl(urlInput.trim()); // Save URL on successful connection
        setSyncResult({ type: 'success', message: res.message });
      } else {
        setSyncResult({ type: 'error', message: res.message });
      }
    }
  };

  const handleSaveTurso = (e: React.FormEvent) => {
    e.preventDefault();
    setTursoUrl(tursoUrlInput.trim());
    setTursoToken(tursoTokenInput.trim());
    setSyncResult({ type: 'success', message: 'Turso SQLite configuration saved successfully!' });
  };

  const handleTursoPull = async () => {
    if (!tursoUrl) {
      setSyncResult({ type: 'error', message: 'Please save a valid Turso Database URL first.' });
      return;
    }

    if (window.confirm('Pulling from Turso will overwrite your current local database data. Do you wish to proceed?')) {
      const res = await syncFromTurso();
      if (res.success) {
        setHasPulled(true);
        setSyncResult({ type: 'success', message: res.message });
      } else {
        setSyncResult({ type: 'error', message: res.message });
      }
    }
  };

  const handleTursoPush = async () => {
    if (!tursoUrlInput || !tursoTokenInput) {
      setSyncResult({ type: 'error', message: 'Please provide a valid Turso URL and Auth Token.' });
      return;
    }

    if (window.confirm('Pushing to Turso will overwrite all data in your Turso cloud database. Do you wish to proceed?')) {
      const res = await syncToTurso(tursoUrlInput.trim(), tursoTokenInput.trim());
      if (res.success) {
        setTursoUrl(tursoUrlInput.trim());
        setTursoToken(tursoTokenInput.trim());
        setSyncResult({ type: 'success', message: res.message });
      } else {
        setSyncResult({ type: 'error', message: res.message });
      }
    }
  };

  // Google Apps Script source code
  const appsScriptCode = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function getSheetData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    return rows;
  }
  
  var state = {
    companies: getSheetData("Companies").map(function(c) {
      c.status = c.status || "Active";
      return c;
    }),
    contacts: getSheetData("Contacts").map(function(c) {
      c.status = c.status || "Active";
      return c;
    }),
    projects: getSheetData("Projects").map(function(p) {
      if (p.customerId && !p.companyId) {
        p.companyId = p.customerId;
        delete p.customerId;
      }
      p.budget = Number(p.budget) || 0;
      return p;
    }),
    contracts: getSheetData("Contracts").map(function(c) {
      if (c.stages) {
        try { c.stages = JSON.parse(c.stages); } catch(err) { c.stages = []; }
      } else { c.stages = []; }
      c.value = Number(c.value) || 0;
      return c;
    }),
    templates: getSheetData("Templates").map(function(t) {
      if (t.stages) {
        try { t.stages = JSON.parse(t.stages); } catch(err) { t.stages = []; }
      } else { t.stages = []; }
      return t;
    }),
    deals: getSheetData("Deals").map(function(d) {
      d.value = Number(d.value) || 0;
      if (d.quotationItems) {
        try { d.quotationItems = JSON.parse(d.quotationItems); } catch(err) { d.quotationItems = []; }
      } else {
        d.quotationItems = [];
      }
      return d;
    }),
    meetings: getSheetData("Meetings").map(function(m) {
      if (m.attendees) {
        try { m.attendees = JSON.parse(m.attendees); } catch(err) { m.attendees = []; }
      } else {
        m.attendees = [];
      }
      if (m.documents) {
        try { m.documents = JSON.parse(m.documents); } catch(err) { m.documents = []; }
      } else {
        m.documents = [];
      }
      return m;
    })
  };
  
  return ContentService.createTextOutput(JSON.stringify(state))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var postData = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function writeToSheet(sheetName, headers, items, formatFn) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clearContents();
    }
    
    sheet.appendRow(headers);
    if (items.length === 0) return;
    
    var rows = items.map(function(item) {
      return formatFn(item);
    });
    
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  writeToSheet("Companies", 
    ["id", "name", "industry", "email", "phone", "address", "status", "dateAdded"],
    postData.companies || [],
    function(c) {
      return [c.id, c.name, c.industry, c.email, c.phone, c.address, c.status, c.dateAdded];
    }
  );
  
  writeToSheet("Contacts", 
    ["id", "companyId", "name", "email", "phone", "status", "role", "dateAdded"],
    postData.contacts || [],
    function(c) {
      return [c.id, c.companyId, c.name, c.email, c.phone, c.status, c.role, c.dateAdded];
    }
  );
  
  writeToSheet("Projects",
    ["id", "companyId", "name", "code", "budget", "currency", "status", "startDate", "endDate", "description"],
    postData.projects || [],
    function(p) {
      return [p.id, p.companyId, p.name, p.code, Number(p.budget) || 0, p.currency, p.status, p.startDate, p.endDate, p.description];
    }
  );
  
  writeToSheet("Contracts",
    ["id", "projectId", "title", "contractNumber", "type", "value", "currency", "status", "signDate", "startDate", "endDate", "stages"],
    postData.contracts || [],
    function(c) {
      return [c.id, c.projectId, c.title, c.contractNumber, c.type, Number(c.value) || 0, c.currency, c.status, c.signDate, c.startDate, c.endDate, JSON.stringify(c.stages)];
    }
  );
  
  writeToSheet("Templates",
    ["contractType", "stages"],
    postData.templates || [],
    function(t) {
      return [t.contractType, JSON.stringify(t.stages)];
    }
  );

  writeToSheet("Deals",
    ["id", "companyId", "contactId", "title", "stage", "value", "currency", "estimatedCloseDate", "description", "createdAt", "quotationItems", "quotationDate", "quotationExpiry", "quotationTerms"],
    postData.deals || [],
    function(d) {
      return [d.id, d.companyId, d.contactId, d.title, d.stage, Number(d.value) || 0, d.currency, d.estimatedCloseDate, d.description, d.createdAt, JSON.stringify(d.quotationItems || []), d.quotationDate || "", d.quotationExpiry || "", d.quotationTerms || ""];
    }
  );

  writeToSheet("Meetings",
    ["id", "dealId", "meetingDate", "title", "attendees", "notes", "documents"],
    postData.meetings || [],
    function(m) {
      return [m.id, m.dealId, m.meetingDate, m.title, JSON.stringify(m.attendees || []), m.notes, JSON.stringify(m.documents || [])];
    }
  );
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const tursoSqlSchema = `-- SQLite / libSQL Database Setup Script for RUN System Vanguard CRM
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT,
  dateAdded TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT,
  role TEXT,
  dateAdded TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  name TEXT NOT NULL,
  code TEXT,
  budget REAL,
  currency TEXT,
  status TEXT,
  startDate TEXT,
  endDate TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  title TEXT NOT NULL,
  contractNumber TEXT,
  type TEXT,
  value REAL,
  currency TEXT,
  status TEXT,
  signDate TEXT,
  startDate TEXT,
  endDate TEXT,
  stages TEXT
);

CREATE TABLE IF NOT EXISTS templates (
  contractType TEXT PRIMARY KEY,
  stages TEXT
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  companyId TEXT,
  contactId TEXT,
  title TEXT NOT NULL,
  stage TEXT,
  value REAL,
  currency TEXT,
  estimatedCloseDate TEXT,
  description TEXT,
  createdAt TEXT,
  quotationItems TEXT,
  quotationDate TEXT,
  quotationExpiry TEXT,
  quotationTerms TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  dealId TEXT,
  meetingDate TEXT,
  title TEXT NOT NULL,
  attendees TEXT,
  notes TEXT,
  documents TEXT
);`;

  const copyTursoSchemaToClipboard = () => {
    navigator.clipboard.writeText(tursoSqlSchema);
    setCopiedTursoSchema(true);
    setTimeout(() => setCopiedTursoSchema(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
          <Database size={40} className="gradient-text" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Database Lock</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Authorized personnel only. Please enter the master password to access database settings.
          </p>
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              placeholder="Enter password"
              value={passwordInput}
              onChange={e => {
                setPasswordInput(e.target.value);
                setPassError('');
              }}
              className="form-input"
              style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.2rem' }}
              autoFocus
            />
            {passError && (
              <span style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600 }}>{passError}</span>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Unlock Settings
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Database Integration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Connect RUN System Vanguard to a serverless SQLite database (Turso) or a Google Sheets spreadsheet for cloud data persistence.
        </p>
      </div>

      <div className="sync-layout-grid">
        
        {/* Left Side: Setup & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Turso Database Settings Card */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} className="gradient-text" /> Turso SQLite Database Settings
            </h3>
            
            <form onSubmit={handleSaveTurso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Turso Database URL (libSQL / HTTP)</label>
                <input
                  type="text"
                  placeholder="libsql://your-db-name.turso.io"
                  value={tursoUrlInput}
                  onChange={e => setTursoUrlInput(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Database Auth Token</label>
                <input
                  type="password"
                  placeholder="Enter Turso auth token"
                  value={tursoTokenInput}
                  onChange={e => setTursoTokenInput(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  disabled={!tursoUrlInput || !tursoTokenInput || isSyncing}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  Save Config
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleTursoPush}
                  disabled={!tursoUrlInput || !tursoTokenInput || isSyncing || !hasPulled}
                  style={{ gap: '0.35rem', padding: '0.55rem 1rem', fontSize: '0.8rem', opacity: (!tursoUrlInput || !tursoTokenInput || isSyncing || !hasPulled) ? 0.5 : 1 }}
                  title={!hasPulled ? "Please perform a Pull operation first to link database state" : "Push current database to Turso"}
                >
                  <ArrowUpCircle size={15} /> 
                  {isSyncing ? 'Syncing...' : 'Push to Turso'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleTursoPull}
                  disabled={!tursoUrl || !tursoToken || isSyncing}
                  style={{ gap: '0.35rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  <ArrowDownCircle size={15} /> 
                  {isSyncing ? 'Syncing...' : 'Pull from Turso'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Google Sheets Sync Settings Card */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} className="gradient-text" /> Google Sheets Sync Settings
            </h3>
            
            <form onSubmit={handleSaveUrl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Google Apps Script Web App URL</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  disabled={!urlInput || isSyncing}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  Save URL
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePush}
                  disabled={!urlInput || isSyncing || !hasPulled}
                  style={{ gap: '0.35rem', padding: '0.55rem 1rem', fontSize: '0.8rem', opacity: (!urlInput || isSyncing || !hasPulled) ? 0.5 : 1 }}
                  title={!hasPulled ? "Please perform a Pull operation first to link database state" : "Push current database to Google Sheets"}
                >
                  <ArrowUpCircle size={15} /> 
                  {isSyncing ? 'Syncing...' : 'Push to Sheets'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handlePull}
                  disabled={!sheetUrl || isSyncing}
                  style={{ gap: '0.35rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '0.55rem 1rem', fontSize: '0.8rem' }}
                >
                  <ArrowDownCircle size={15} /> 
                  {isSyncing ? 'Syncing...' : 'Pull from Sheets'}
                </button>
              </div>
            </form>

            {!hasPulled && (
              <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--accent-amber)', borderRadius: '8px', color: 'var(--accent-amber)', fontSize: '0.75rem', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span><strong>Security Lock:</strong> You must click <strong>Pull</strong> first to link this device's cache to the cloud before you can push updates.</span>
              </div>
            )}

            <div style={{ 
              marginTop: '1.25rem', 
              paddingTop: '1.25rem', 
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block' }}>Real-time Auto-Sync</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automatically save changes to your active database in the background.</span>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={e => setAutoSync(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: autoSync ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.08)',
                  transition: '0.3s',
                  borderRadius: '24px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '16px', width: '16px',
                    left: autoSync ? '25px' : '4px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            {/* Sync Results Feedback */}
            {syncResult.type && (
              <div 
                style={{ 
                  marginTop: '1.25rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid',
                  background: syncResult.type === 'success' ? 'var(--success-glow)' : 'var(--error-glow)',
                  color: syncResult.type === 'success' ? 'var(--success)' : 'var(--error)',
                  borderColor: syncResult.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
                }}
              >
                {syncResult.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                <span>{syncResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Setup Instructions & Code Copy Block */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Tab Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', gap: '1rem' }}>
            <button
              onClick={() => setRightPanelTab('turso')}
              style={{
                background: 'transparent',
                border: 'none',
                color: rightPanelTab === 'turso' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                borderBottom: rightPanelTab === 'turso' ? '2px solid var(--accent-indigo)' : 'none',
                paddingBottom: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Turso SQLite Setup
            </button>
            <button
              onClick={() => setRightPanelTab('sheets')}
              style={{
                background: 'transparent',
                border: 'none',
                color: rightPanelTab === 'sheets' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                borderBottom: rightPanelTab === 'sheets' ? '2px solid var(--accent-indigo)' : 'none',
                paddingBottom: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Google Sheets Setup
            </button>
          </div>

          {rightPanelTab === 'turso' ? (
            <>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Turso SQLite Database Setup</h4>
                <ol style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', lineHeight: 1.45 }}>
                  <li>Create a free account at <strong>turso.tech</strong>.</li>
                  <li>Create a database called <code>vanguard-crm</code> via CLI or dashboard.</li>
                  <li>Copy the SQL setup script below and execute it inside the Turso SQL Editor to build the schema tables.</li>
                  <li>Get your DB URL (<code>libsql://...</code>) and generate a new Auth Token.</li>
                  <li>Paste the credentials on the left, and click <strong>Push to Turso</strong> to seed your database!</li>
                </ol>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Turso SQL Setup Schema</span>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.3rem' }}
                  onClick={copyTursoSchemaToClipboard}
                >
                  {copiedTursoSchema ? (
                    <>
                      <Check size={12} style={{ color: 'var(--success)' }} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy SQL
                    </>
                  )}
                </button>
              </div>

              <pre 
                style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '0.65rem', 
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  maxHeight: '220px',
                  overflow: 'auto',
                  border: '1px solid var(--border-glass)',
                  whiteSpace: 'pre'
                }}
              >
                {tursoSqlSchema}
              </pre>
            </>
          ) : (
            <>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Google Sheets Spreadsheet Setup</h4>
                <ol style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', lineHeight: 1.45 }}>
                  <li>Create a new spreadsheet on Google Sheets.</li>
                  <li>Open <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Copy the Google Apps Script code below and paste it into the script editor.</li>
                  <li>Click <strong>Deploy &gt; New Deployment</strong>, choose type <strong>Web App</strong>.</li>
                  <li>Configure <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>.</li>
                  <li>Authorize the script permissions and copy the generated Web App URL.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Apps Script JavaScript Code</span>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.3rem' }}
                  onClick={copyToClipboard}
                >
                  {copiedScript ? (
                    <>
                      <Check size={12} style={{ color: 'var(--success)' }} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <pre 
                style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '0.65rem', 
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  maxHeight: '220px',
                  overflow: 'auto',
                  border: '1px solid var(--border-glass)',
                  whiteSpace: 'pre'
                }}
              >
                {appsScriptCode}
              </pre>
            </>
          )}

          <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.15)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <Info size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ lineHeight: 1.4 }}>
              <strong>Hybrid Core:</strong> You can configure both Turso and Google Sheets. Turso is optimal for blazing-fast cloud performance. Google Sheets works perfectly as a secondary manual backup export tool!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
