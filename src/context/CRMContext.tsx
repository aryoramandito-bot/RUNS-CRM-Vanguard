import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  ClientCompany,
  ClientContact,
  Project,
  Contract,
  ContractStage,
  WorkflowTemplate,
  SalesDeal,
  SalesDealStage,
  MeetingLog,
} from '../types/crm';
import { createClient } from '@libsql/client/web';

interface CRMContextType {
  companies: ClientCompany[];
  contacts: ClientContact[];
  projects: Project[];
  contracts: Contract[];
  templates: WorkflowTemplate[];
  deals: SalesDeal[];
  meetings: MeetingLog[];
  
  // Google Sheet Integration
  sheetUrl: string;
  setSheetUrl: (url: string) => void;
  isSyncing: boolean;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  syncFromSheets: () => Promise<{ success: boolean; message: string }>;
  syncToSheets: (targetUrl?: string) => Promise<{ success: boolean; message: string }>;

  // Turso Integration
  tursoUrl: string;
  setTursoUrl: (url: string) => void;
  tursoToken: string;
  setTursoToken: (token: string) => void;
  syncFromTurso: () => Promise<{ success: boolean; message: string }>;
  syncToTurso: (
    targetUrl?: string, 
    targetToken?: string, 
    overrides?: {
      companies?: ClientCompany[];
      contacts?: ClientContact[];
      projects?: Project[];
      contracts?: Contract[];
      templates?: WorkflowTemplate[];
      deals?: SalesDeal[];
      meetings?: MeetingLog[];
    }
  ) => Promise<{ success: boolean; message: string }>;
  lastSyncTime: string;
  hasInitialized: boolean;
  syncError: string | null;
  retryInitialPull: () => Promise<void>;

  // Company Operations
  addCompany: (company: Omit<ClientCompany, 'id' | 'dateAdded'>) => void;
  updateCompany: (id: string, company: Partial<ClientCompany>) => void;
  deleteCompany: (id: string) => void;

  // Contact Operations
  addContact: (contact: Omit<ClientContact, 'id' | 'dateAdded'>) => void;
  updateContact: (id: string, contact: Partial<ClientContact>) => void;
  deleteContact: (id: string) => void;
  
  // Project Operations
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Contract Operations
  addContract: (contract: Omit<Contract, 'id' | 'stages'>) => void;
  updateContract: (id: string, contract: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  
  // Contract Stages & Workflow Customization Operations
  updateContractStage: (contractId: string, stageId: string, stage: Partial<ContractStage>) => void;
  addCustomStage: (contractId: string, stage: Omit<ContractStage, 'id'>, insertAfterId?: string) => void;
  deleteContractStage: (contractId: string, stageId: string) => void;
  reorderContractStages: (contractId: string, reorderedStages: ContractStage[]) => void;
  
  // Workflow Template Configuration (Master Data)
  updateTemplateStages: (contractType: string, stages: WorkflowTemplate['stages']) => void;
  addNewTemplateType: (contractType: string) => void;

  // Sales Deal Operations
  addDeal: (deal: Omit<SalesDeal, 'id' | 'createdAt' | 'quotationItems'>) => void;
  updateDeal: (id: string, deal: Partial<SalesDeal>) => void;
  deleteDeal: (id: string) => void;

  // Meeting Log Operations
  addMeetingLog: (meeting: Omit<MeetingLog, 'id'>) => void;
  updateMeetingLog: (id: string, meeting: Partial<MeetingLog>) => void;
  deleteMeetingLog: (id: string) => void;

  // Sales Pipeline Probabilities Config
  stageProbabilities: Record<SalesDealStage, number>;
  updateStageProbabilities: (probs: Record<SalesDealStage, number>) => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

// Helper for unique ID generation
const generateId = () => Math.random().toString(36).substring(2, 11);

// Seed Data
const defaultTemplates: WorkflowTemplate[] = [
  {
    contractType: 'Fixed Price',
    stages: [
      { name: 'Initial Briefing & Drafting', description: 'Gather requirements and draft contract SOW', category: 'Drafting', relativeDays: 5 },
      { name: 'Legal & Procurement Review', description: 'Internal and external compliance review', category: 'Drafting', relativeDays: 10 },
      { name: 'Contract Signing', description: 'Formal signing by both stakeholders', category: 'Signing', relativeDays: 15 },
      { name: 'Down Payment Billing', description: 'Issue 30% Down Payment Invoice', category: 'Billing', relativeDays: 20 },
      { name: 'Down Payment Collection', description: 'Track payment for Down Payment Invoice', category: 'Collection', relativeDays: 25 },
      { name: 'Implementation & Customization', description: 'Execution of project deliverables', category: 'Execution', relativeDays: 60 },
      { name: 'UAT & Delivery Sign-off', description: 'User Acceptance Testing and project handover', category: 'Execution', relativeDays: 75 },
      { name: 'Final Billing Milestone', description: 'Issue 70% Final Invoice', category: 'Billing', relativeDays: 80 },
      { name: 'Final Collection & Project Closure', description: 'Track final collection and close out contract', category: 'Collection', relativeDays: 90 },
    ],
  },
  {
    contractType: 'Retainer / Monthly Service',
    stages: [
      { name: 'SLA Drafting', description: 'Establish service level agreements', category: 'Drafting', relativeDays: 5 },
      { name: 'Agreement Signing', description: 'Sign the monthly support contract', category: 'Signing', relativeDays: 10 },
      { name: 'Month 1 Invoice Dispatch', description: 'First month fee invoicing', category: 'Billing', relativeDays: 15 },
      { name: 'Month 1 Fee Collection', description: 'Collect first month payment', category: 'Collection', relativeDays: 25 },
      { name: 'Service Support Kick-off', description: 'Begin active monthly support cycle', category: 'Execution', relativeDays: 30 },
      { name: 'Month 2 Invoice Dispatch', description: 'Second month support invoicing', category: 'Billing', relativeDays: 45 },
      { name: 'Month 2 Fee Collection', description: 'Collect second month payment', category: 'Collection', relativeDays: 55 },
      { name: 'Quarterly Review & Evaluation', description: 'Evaluate support performance metrics', category: 'Completed', relativeDays: 90 },
    ],
  },
  {
    contractType: 'Time & Materials (T&M)',
    stages: [
      { name: 'Rate Card Definition', description: 'Agree on hourly/daily role-based rates', category: 'Drafting', relativeDays: 5 },
      { name: 'Contract Agreement Signature', description: 'Formal sign-off on T&M framework', category: 'Signing', relativeDays: 12 },
      { name: 'Phase 1 Sprint Execution', description: 'Actively log timesheets for Sprint 1', category: 'Execution', relativeDays: 30 },
      { name: 'Sprint 1 Timesheet Approval', description: 'Get client approval on logged hours', category: 'Execution', relativeDays: 35 },
      { name: 'Sprint 1 Invoicing', description: 'Invoice approved Sprint 1 hours', category: 'Billing', relativeDays: 40 },
      { name: 'Sprint 1 Payment Collection', description: 'Collect payment for Sprint 1', category: 'Collection', relativeDays: 50 },
      { name: 'Final Project Report & Handover', description: 'Compile timesheet summaries and close project', category: 'Completed', relativeDays: 60 },
    ],
  },
  {
    contractType: 'Quarterly Managed Service',
    stages: [
      { name: 'Initial Briefing & Drafting', description: 'Gather requirements and draft contract SOW', category: 'Drafting', relativeDays: 5 },
      { name: 'Legal & Procurement Review', description: 'Internal and external compliance review', category: 'Drafting', relativeDays: 10 },
      { name: 'Contract Signing', description: 'Formal signing by both stakeholders', category: 'Signing', relativeDays: 15 },
      { name: 'Q1 Billing Invoice', description: 'Issue Q1 Billing Invoice', category: 'Billing', relativeDays: 180 },
      { name: 'Q1 Billing Invoice Collection', description: 'Q1 Billing Invoice Collection', category: 'Collection', relativeDays: 195 },
      { name: 'Q2 Billing Invoice', description: 'Issue Q2 Billing Invoice', category: 'Billing', relativeDays: 270 },
      { name: 'Q2 Billing Invoice Collection', description: 'Q2 Billing Invoice Collection', category: 'Collection', relativeDays: 285 },
      { name: 'Q3 Billing Invoice', description: 'Issue Q3 Billing Invoice', category: 'Billing', relativeDays: 360 },
      { name: 'Q3 Billing Invoice Collection', description: 'Q3 Billing Invoice Collection', category: 'Collection', relativeDays: 375 },
      { name: 'Q4 Billing Invoice', description: 'Issue Q4 Billing Invoice', category: 'Billing', relativeDays: 450 },
      { name: 'Q4 Billing Invoice Collection', description: 'Q4 Billing Invoice Collection', category: 'Collection', relativeDays: 465 },
      { name: 'Final Deliverable & Project Closure', description: 'Laporan ATS & BA Penyelesaian Pekerjaan Managed Service ATS', category: 'Execution', relativeDays: 375 },
    ],
  },
];

const seedCompanies: ClientCompany[] = [
  {
    id: 'comp-1',
    name: 'PT Telkom Indonesia Tbk',
    industry: 'Telecommunications',
    email: 'info@telkom.co.id',
    phone: '+62 21-5215111',
    address: 'Jl. Jend. Gatot Subroto Kav. 52, Jakarta',
    status: 'Active',
    dateAdded: '2026-01-10',
  },
  {
    id: 'comp-2',
    name: 'PT Astra International Tbk',
    industry: 'Automotive & Manufacturing',
    email: 'contact@astra.co.id',
    phone: '+62 21-6522555',
    address: 'Jl. Gaya Motor Raya No. 8, Sunter II, Jakarta',
    status: 'Active',
    dateAdded: '2026-02-05',
  },
  {
    id: 'comp-3',
    name: 'Singapore Tech Solutions Pte Ltd',
    industry: 'Technology Services',
    email: 'sales@singtech.sg',
    phone: '+65 6789 0123',
    address: '10 Anson Road, International Plaza, Singapore',
    status: 'Active',
    dateAdded: '2026-03-01',
  },
];

const seedContacts: ClientContact[] = [
  {
    id: 'cont-1',
    companyId: 'comp-1',
    name: 'Budi Santoso',
    email: 'budi.santoso@telkom.co.id',
    phone: '+62 811-2345-678',
    status: 'Active',
    role: 'IT Enterprise Manager',
    dateAdded: '2026-01-15',
  },
  {
    id: 'cont-2',
    companyId: 'comp-2',
    name: 'Siti Rahma',
    email: 'siti.rahma@astra.co.id',
    phone: '+62 812-9876-543',
    status: 'Active',
    role: 'Head of Procurement',
    dateAdded: '2026-02-10',
  },
  {
    id: 'cont-3',
    companyId: 'comp-3',
    name: 'Marcus Chen',
    email: 'marcus.chen@singtech.sg',
    phone: '+65 9123 4567',
    status: 'Active',
    role: 'Managing Director',
    dateAdded: '2026-03-05',
  },
];

const seedProjects: Project[] = [
  {
    id: 'proj-1',
    companyId: 'comp-1',
    name: 'Core ERP Integration Project',
    code: 'TEL-ERP-2026',
    budget: 4500000000, // 4.5 Billion IDR
    currency: 'IDR',
    status: 'In Progress',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    description: 'Integration of enterprise resource planning module with legacy inventory database system.',
  },
  {
    id: 'proj-2',
    companyId: 'comp-2',
    name: 'IoT Fleet Telematics System',
    code: 'AST-IOT-2026',
    budget: 150000, // 150k USD
    currency: 'USD',
    status: 'Planning',
    startDate: '2026-07-01',
    endDate: '2027-02-28',
    description: 'Deployment of GPS tracking and fuel diagnostics IoT sensors across logistics fleets.',
  },
  {
    id: 'proj-3',
    companyId: 'comp-3',
    name: 'Cloud Data Migration Phase 2',
    code: 'STS-MIG-2026',
    budget: 850000000, // 850 Million IDR
    currency: 'IDR',
    status: 'Completed',
    startDate: '2026-02-01',
    endDate: '2026-05-30',
    description: 'Migration of database clusters from on-premise hardware to cloud virtual instances.',
  },
];

const seedContracts: Contract[] = [
  {
    id: 'cont-1',
    projectId: 'proj-1',
    title: 'Vanguard ERP Integration Service Agreement',
    contractNumber: 'CNT/TEL/2026/06/001',
    type: 'Fixed Price',
    value: 4500000000,
    currency: 'IDR',
    status: 'Active',
    signDate: '2026-05-25',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    stages: [
      {
        id: 'stage-1-1',
        name: 'Initial Briefing & Drafting',
        description: 'Gather requirements and draft contract SOW',
        category: 'Drafting',
        status: 'Done',
        dueDate: '2026-06-06',
        completedDate: '2026-06-04',
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: 'Briefing completed successfully. Client requirements collected and detailed SOW drafted.',
      },
      {
        id: 'stage-1-2',
        name: 'Legal & Procurement Review',
        description: 'Internal and external compliance review',
        category: 'Drafting',
        status: 'Done',
        dueDate: '2026-06-11',
        completedDate: '2026-06-05',
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: 'Legal department approved with minor adjustments in warranty clause.',
      },
      {
        id: 'stage-1-3',
        name: 'Contract Signing',
        description: 'Formal signing by both stakeholders',
        category: 'Signing',
        status: 'Done',
        dueDate: '2026-06-16',
        completedDate: '2026-06-06',
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: 'Digitally signed via DocuSign by directors of both parties.',
      },
      {
        id: 'stage-1-4',
        name: 'Down Payment Billing',
        description: 'Issue 30% Down Payment Invoice',
        category: 'Billing',
        status: 'Done',
        dueDate: '2026-06-21',
        completedDate: '2026-06-07',
        invoiceNumber: 'INV/2026/TEL/042',
        billingAmount: 1350000000, // 30% of 4.5B
        paymentReference: null,
        notes: 'Issued invoice INV/2026/TEL/042 for Down Payment (Rp 1.350.000.000). sent to finance dept.',
      },
      {
        id: 'stage-1-5',
        name: 'Down Payment Collection',
        description: 'Track payment for Down Payment Invoice',
        category: 'Collection',
        status: 'Active',
        dueDate: '2026-06-26',
        completedDate: null,
        invoiceNumber: 'INV/2026/TEL/042',
        billingAmount: 1350000000,
        paymentReference: '',
        notes: 'Invoice received by client finance. Awaiting bank transfer approval.',
      },
      {
        id: 'stage-1-6',
        name: 'Implementation & Customization',
        description: 'Execution of project deliverables',
        category: 'Execution',
        status: 'Pending',
        dueDate: '2026-10-01',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: 'Development will kick off as soon as down payment is confirmed.',
      },
      {
        id: 'stage-1-7',
        name: 'UAT & Delivery Sign-off',
        description: 'User Acceptance Testing and project handover',
        category: 'Execution',
        status: 'Pending',
        dueDate: '2026-11-15',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-1-8',
        name: 'Final Billing Milestone',
        description: 'Issue 70% Final Invoice',
        category: 'Billing',
        status: 'Pending',
        dueDate: '2026-11-20',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 3150000000, // 70% of 4.5B
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-1-9',
        name: 'Final Collection & Project Closure',
        description: 'Track final collection and close out contract',
        category: 'Collection',
        status: 'Pending',
        dueDate: '2026-12-31',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 3150000000,
        paymentReference: null,
        notes: '',
      },
    ],
  },
  {
    id: 'cont-2',
    projectId: 'proj-2',
    title: 'IoT Telematics Equipment & Integration SOW',
    contractNumber: 'CNT/AST/2026/06/002',
    type: 'Fixed Price',
    value: 150000,
    currency: 'USD',
    status: 'Draft',
    signDate: '2026-06-01',
    startDate: '2026-07-01',
    endDate: '2027-02-28',
    stages: [
      {
        id: 'stage-2-1',
        name: 'Initial Briefing & Drafting',
        description: 'Gather requirements and draft contract SOW',
        category: 'Drafting',
        status: 'Active',
        dueDate: '2026-07-06',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: 'Currently drafting hardware procurement schedules and shipping log terms.',
      },
      {
        id: 'stage-2-2',
        name: 'Legal & Procurement Review',
        description: 'Internal and external compliance review',
        category: 'Drafting',
        status: 'Pending',
        dueDate: '2026-07-11',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-3',
        name: 'Contract Signing',
        description: 'Formal signing by both stakeholders',
        category: 'Signing',
        status: 'Pending',
        dueDate: '2026-07-16',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-4',
        name: 'Hardware Deposit Invoice',
        description: 'Issue 50% deposit for hardware procurement',
        category: 'Billing',
        status: 'Pending',
        dueDate: '2026-07-21',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 75000,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-5',
        name: 'Hardware Deposit Collection',
        description: 'Collect 50% hardware deposit',
        category: 'Collection',
        status: 'Pending',
        dueDate: '2026-07-26',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 75000,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-6',
        name: 'Hardware Shipping & Installation',
        description: 'Shipping telematics units and vehicle installation',
        category: 'Execution',
        status: 'Pending',
        dueDate: '2026-11-01',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-7',
        name: 'UAT Sign-off',
        description: 'Sign-off on active tracking dashboard metrics',
        category: 'Execution',
        status: 'Pending',
        dueDate: '2027-01-15',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: null,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-8',
        name: 'Final Billing Milestone',
        description: 'Issue remaining 50% invoice',
        category: 'Billing',
        status: 'Pending',
        dueDate: '2027-01-20',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 75000,
        paymentReference: null,
        notes: '',
      },
      {
        id: 'stage-2-9',
        name: 'Final Collection',
        description: 'Collect outstanding project balance',
        category: 'Collection',
        status: 'Pending',
        dueDate: '2027-02-28',
        completedDate: null,
        invoiceNumber: null,
        billingAmount: 75000,
        paymentReference: null,
        notes: '',
      },
    ],
  },
];

const seedDeals: SalesDeal[] = [
  {
    id: 'deal-1',
    companyId: 'comp-1',
    contactId: 'cont-1',
    title: 'ERP Custom License Expansion',
    stage: 'Proposal',
    value: 1200000000,
    currency: 'IDR',
    estimatedCloseDate: '2026-08-15',
    description: 'Procurement of additional core ERP licenses for the finance subsidiary.',
    createdAt: '2026-06-10',
    quotationItems: [
      { id: 'qi-1', description: 'Core ERP License - Professional User', quantity: 20, unitPrice: 45000000 },
      { id: 'qi-2', description: 'Core ERP License - Standard User', quantity: 50, unitPrice: 6000000 }
    ],
    quotationDate: '2026-06-15',
    quotationExpiry: '2026-07-15',
    quotationTerms: '50% DP, 50% on Delivery. Validity 30 days.'
  },
  {
    id: 'deal-2',
    companyId: 'comp-2',
    contactId: 'cont-2',
    title: 'Smart Fleet Telematics Phase 2',
    stage: 'Negotiation',
    value: 85000,
    currency: 'USD',
    estimatedCloseDate: '2026-07-20',
    description: 'Hardware supply and system integration for 300 logistics vehicles.',
    createdAt: '2026-05-20',
    quotationItems: [
      { id: 'qi-3', description: 'Fleet OBD-II Telematics Tracker Unit', quantity: 300, unitPrice: 200 },
      { id: 'qi-4', description: 'Cloud Subscription & Fleet Platform (1 Year)', quantity: 300, unitPrice: 50 },
      { id: 'qi-5', description: 'Installation & Fleet Setup Service', quantity: 1, unitPrice: 10000 }
    ],
    quotationDate: '2026-05-25',
    quotationExpiry: '2026-07-25',
    quotationTerms: 'Net 30 days from delivery.'
  }
];

const seedMeetings: MeetingLog[] = [
  {
    id: 'meet-1',
    dealId: 'deal-1',
    meetingDate: '2026-06-12',
    title: 'Subsidiary Scope Clarification',
    attendees: ['Budi Santoso', 'Internal Sales Team'],
    notes: 'Clarified user counts. Client requested 20 professional licenses and 50 standard licenses. Agreed to submit quotation by June 15.',
    documents: ['Telkom_ subsidiary_user_mapping.xlsx']
  },
  {
    id: 'meet-2',
    dealId: 'deal-2',
    meetingDate: '2026-06-02',
    title: 'IoT Telematics Hardware Pitch',
    attendees: ['Siti Rahma', 'Internal Solution Architect'],
    notes: 'Presented fleet OBD tracker catalog. Client is satisfied with standard OBD-II hardware features. Requested payment terms clarification.',
    documents: ['OBD2_Tracker_Specs.pdf', 'Vanguard_Fleet_Pitch_v2.pdf']
  }
];

const cleanDatesInObject = <T,>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDatesInObject(item)) as unknown as T;
  }
  
  const copy = { ...obj } as any;
  for (const key in copy) {
    if (Object.prototype.hasOwnProperty.call(copy, key)) {
      const val = copy[key];
      if (typeof val === 'string') {
        // Matches ISO dates like "2026-02-26T17:00:00.000Z" or "2026-02-26T17:00:00"
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          copy[key] = val.split('T')[0];
        }
      } else if (val && typeof val === 'object') {
        copy[key] = cleanDatesInObject(val);
      }
    }
  }
  return copy;
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shouldBypassCache = (): boolean => {
    const tursoSaved = localStorage.getItem('vanguard_turso_url');
    const sheetsSaved = localStorage.getItem('vanguard_sheets_url');
    const activeTursoUrl = tursoSaved !== null ? tursoSaved : 'libsql://runs-vanguard-crm-aryoramandito.aws-ap-northeast-1.turso.io';
    const activeSheetsUrl = sheetsSaved !== null ? sheetsSaved : 'https://script.google.com/macros/s/AKfycby0n9ubHy9zkLk47U4dzyzGrCE9hueKKWfgWGU04CWWuN-pPD7dwaHEJoISBgwzPdu38Q/exec';
    return !!(activeTursoUrl || activeSheetsUrl);
  };

  const [companies, setCompaniesState] = useState<ClientCompany[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_companies');
    // Migration check: check if old vanguard_customers exists and contains company data
    if (!saved) {
      const oldCustomers = localStorage.getItem('vanguard_customers');
      if (oldCustomers) {
        try {
          const parsed = cleanDatesInObject(JSON.parse(oldCustomers));
          // Map old Customer data into ClientCompany structure
          const migrated: ClientCompany[] = parsed.map((cust: any) => ({
            id: `comp-${generateId()}`, // Give it a company ID
            name: cust.company || cust.name,
            industry: cust.industry || 'Other',
            email: cust.email || '',
            phone: cust.phone || '',
            address: '',
            status: cust.status || 'Active',
            dateAdded: cust.dateAdded || new Date().toISOString().split('T')[0]
          }));
          return cleanDatesInObject(migrated);
        } catch(e) {}
      }
    }
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedCompanies);
  });

  const [contacts, setContactsState] = useState<ClientContact[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_contacts');
    // Migration check: if old customers exist, we can migrate them as contacts too
    if (!saved) {
      const oldCustomers = localStorage.getItem('vanguard_customers');
      if (oldCustomers && companies.length > 0) {
        try {
          const parsed = cleanDatesInObject(JSON.parse(oldCustomers));
          const migrated: ClientContact[] = parsed.map((cust: any) => {
            const comp = companies.find(c => c.name === cust.company);
            return {
              id: cust.id,
              companyId: comp ? comp.id : (companies[0]?.id || ''),
              name: cust.name,
              email: cust.email || '',
              phone: cust.phone || '',
              status: cust.status || 'Active',
              role: 'Contact Representative',
              dateAdded: cust.dateAdded || new Date().toISOString().split('T')[0]
            };
          });
          return cleanDatesInObject(migrated);
        } catch(e) {}
      }
    }
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedContacts);
  });

  const [projects, setProjectsState] = useState<Project[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_projects');
    if (saved) {
      try {
        const parsed = cleanDatesInObject(JSON.parse(saved));
        // Rename customerId to companyId if present in storage project entries
        return parsed.map((p: any) => {
          if (p.customerId && !p.companyId) {
            return { ...p, companyId: p.customerId, customerId: undefined };
          }
          return p;
        });
      } catch(e) {}
    }
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedProjects);
  });

  const [contracts, setContractsState] = useState<Contract[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_contracts');
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedContracts);
  });

  const [templates, setTemplatesState] = useState<WorkflowTemplate[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_templates');
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(defaultTemplates);
  });

  const [deals, setDealsState] = useState<SalesDeal[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_deals');
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedDeals);
  });

  const [meetings, setMeetingsState] = useState<MeetingLog[]>(() => {
    if (shouldBypassCache()) return [];

    const saved = localStorage.getItem('vanguard_meetings');
    return saved ? cleanDatesInObject(JSON.parse(saved)) : cleanDatesInObject(seedMeetings);
  });

  const saveAndPushState = async (updates: {
    companies?: ClientCompany[];
    contacts?: ClientContact[];
    projects?: Project[];
    contracts?: Contract[];
    templates?: WorkflowTemplate[];
    deals?: SalesDeal[];
    meetings?: MeetingLog[];
  }) => {
    if (tursoUrl && tursoToken) {
      await syncToTurso(tursoUrl, tursoToken, updates);
    } else if (sheetUrl) {
      const payload = {
        companies: updates.companies || companies,
        contacts: updates.contacts || contacts,
        projects: updates.projects || projects,
        contracts: updates.contracts || contracts,
        templates: updates.templates || templates,
        deals: updates.deals || deals,
        meetings: updates.meetings || meetings,
      };
      setIsSyncing(true);
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
        setIsSyncing(false);
        updateTimestamp();
      } catch (e) {
        setIsSyncing(false);
        console.error("Failed to push to Sheets:", e);
      }
    }
  };

  // Write-through wrappers — always push to DB immediately on any CRUD mutation
  const setCompanies = (val: ClientCompany[] | ((prev: ClientCompany[]) => ClientCompany[])) => {
    const next = typeof val === 'function' ? val(companies) : val;
    setCompaniesState(next);
    saveAndPushState({ companies: next });
  };

  const setContacts = (val: ClientContact[] | ((prev: ClientContact[]) => ClientContact[])) => {
    const next = typeof val === 'function' ? val(contacts) : val;
    setContactsState(next);
    saveAndPushState({ contacts: next });
  };

  const setProjects = (val: Project[] | ((prev: Project[]) => Project[])) => {
    const next = typeof val === 'function' ? val(projects) : val;
    setProjectsState(next);
    saveAndPushState({ projects: next });
  };

  const setContracts = (val: Contract[] | ((prev: Contract[]) => Contract[])) => {
    const next = typeof val === 'function' ? val(contracts) : val;
    setContractsState(next);
    saveAndPushState({ contracts: next });
  };

  const setTemplates = (val: WorkflowTemplate[] | ((prev: WorkflowTemplate[]) => WorkflowTemplate[])) => {
    const next = typeof val === 'function' ? val(templates) : val;
    setTemplatesState(next);
    saveAndPushState({ templates: next });
  };

  const setDeals = (val: SalesDeal[] | ((prev: SalesDeal[]) => SalesDeal[])) => {
    const next = typeof val === 'function' ? val(deals) : val;
    setDealsState(next);
    saveAndPushState({ deals: next });
  };

  const setMeetings = (val: MeetingLog[] | ((prev: MeetingLog[]) => MeetingLog[])) => {
    const next = typeof val === 'function' ? val(meetings) : val;
    setMeetingsState(next);
    saveAndPushState({ meetings: next });
  };

  const [stageProbabilities, setStageProbabilities] = useState<Record<SalesDealStage, number>>(() => {
    const saved = localStorage.getItem('vanguard_stage_probs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {}
    }
    return {
      'Lead': 10,
      'Qualification': 30,
      'Proposal': 50,
      'Negotiation': 80,
      'Closed Won': 100,
      'Closed Lost': 0
    };
  });

  // Google Sheet Integration state
  const [sheetUrl, setSheetUrlState] = useState<string>(() => {
    return localStorage.getItem('vanguard_sheets_url') || 'https://script.google.com/macros/s/AKfycby0n9ubHy9zkLk47U4dzyzGrCE9hueKKWfgWGU04CWWuN-pPD7dwaHEJoISBgwzPdu38Q/exec';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [autoSync, setAutoSyncState] = useState<boolean>(() => {
    return localStorage.getItem('vanguard_auto_sync') !== 'false';
  });
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const setAutoSync = (val: boolean) => {
    setAutoSyncState(val);
    localStorage.setItem('vanguard_auto_sync', val ? 'true' : 'false');
  };



  const setSheetUrl = (url: string) => {
    setSheetUrlState(url);
    localStorage.setItem('vanguard_sheets_url', url);
  };

  // Turso Integration State
  const [tursoUrl, setTursoUrlState] = useState<string>(() => {
    const val = localStorage.getItem('vanguard_turso_url');
    // Fall back to hardcoded default if missing OR empty string
    return (val !== null && val.trim() !== '') ? val.trim() : 'libsql://runs-vanguard-crm-aryoramandito.aws-ap-northeast-1.turso.io';
  });
  const [tursoToken, setTursoTokenState] = useState<string>(() => {
    const val = localStorage.getItem('vanguard_turso_token');
    // Fall back to hardcoded default if missing OR empty string
    return (val !== null && val.trim() !== '') ? val.trim() : 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI3OTg0MzAsImlkIjoiMDE5ZjE2MjUtYTQwMS03MzY4LWIwNTEtNGNkNGZiZDA4ZjU2Iiwia2lkIjoiN1ROMUFUclFnTGtiRDAxUzVRQUsyS1QxZXQ4cHZjLVd4bkJhUEN3UTdlbyIsInJpZCI6IjUxN2I0Yzg5LWNkMjEtNDZiNi05ODY1LWE3NTI0YzU0NmEwYiJ9.XVYu41CGLIYW5LvdMohufmfKmzRC798WyGmJYi8S7oRXzqC7J16zHR7chFNSkKeHR_uX4cTI8ASLVVl6ZO10Bg';
  });

  const setTursoUrl = (url: string) => {
    setTursoUrlState(url);
    localStorage.setItem('vanguard_turso_url', url);
  };

  const setTursoToken = (token: string) => {
    setTursoTokenState(token);
    localStorage.setItem('vanguard_turso_token', token);
  };

  const [lastSyncTime, setLastSyncTimeState] = useState<string>(() => {
    return localStorage.getItem('vanguard_last_sync_time') || '';
  });

  const updateTimestamp = () => {
    const timestamp = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true
    }).replace(',', '');
    setLastSyncTimeState(timestamp);
    localStorage.setItem('vanguard_last_sync_time', timestamp);
  };

  const getTursoClient = (url = tursoUrl, token = tursoToken) => {
    if (!url || !token) return null;
    try {
      return createClient({
        url: url.trim(),
        authToken: token.trim()
      });
    } catch (e) {
      console.error("Failed to initialize Turso client:", e);
      return null;
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('vanguard_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('vanguard_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('vanguard_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('vanguard_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem('vanguard_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('vanguard_deals', JSON.stringify(deals));
  }, [deals]);

  useEffect(() => {
    localStorage.setItem('vanguard_meetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem('vanguard_stage_probs', JSON.stringify(stageProbabilities));
  }, [stageProbabilities]);

  // Initial auto-pull from Turso / Sheets on mount if credentials exist
  useEffect(() => {
    const initPull = async () => {
      if ((tursoUrl && tursoToken) || sheetUrl) {
        setSyncError(null);
        try {
          const res = (tursoUrl && tursoToken) ? await syncFromTurso() : await syncFromSheets();
          if (res.success) {
            setHasInitialized(true);
          } else {
            setSyncError(res.message);
          }
        } catch (err: any) {
          setSyncError(err.message || 'Unknown database connection error');
        }
      } else {
        // No database configured, run in local sandbox immediately
        setHasInitialized(true);
      }
    };
    initPull();
  }, []);

  const retryInitialPull = async () => {
    setSyncError(null);
    setHasInitialized(false);
    if ((tursoUrl && tursoToken) || sheetUrl) {
      try {
        const res = (tursoUrl && tursoToken) ? await syncFromTurso() : await syncFromSheets();
        if (res.success) {
          setHasInitialized(true);
        } else {
          setSyncError(res.message);
        }
      } catch (err: any) {
        setSyncError(err.message || 'Unknown database connection error');
      }
    } else {
      setHasInitialized(true);
    }
  };

  // Sync pull from Google Sheets
  const syncFromSheets = async (): Promise<{ success: boolean; message: string }> => {
    if (!sheetUrl) return { success: false, message: 'Google Sheets Apps Script URL is not configured.' };
    
    setIsSyncing(true);
    try {
      const response = await fetch(sheetUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const cleanData = cleanDatesInObject(data);
      
      // Update local states directly (raw setters — must NOT go through write-through wrappers)
      if (cleanData.companies) setCompaniesState(cleanData.companies);
      if (cleanData.contacts) setContactsState(cleanData.contacts);
      if (cleanData.projects) setProjectsState(cleanData.projects);
      if (cleanData.contracts) setContractsState(cleanData.contracts);
      if (cleanData.templates) setTemplatesState(cleanData.templates);
      if (cleanData.deals) setDealsState(cleanData.deals);
      if (cleanData.meetings) setMeetingsState(cleanData.meetings);
      
      localStorage.setItem('vanguard_has_pulled', 'true');
      setIsSyncing(false);

      updateTimestamp();
      return { success: true, message: 'Successfully pulled database state from Google Sheets!' };
    } catch (error: any) {
      setIsSyncing(false);
      return { success: false, message: `Failed to pull from Google Sheets: ${error.message}` };
    }
  };

  // Sync push to Google Sheets
  const syncToSheets = async (targetUrl?: string): Promise<{ success: boolean; message: string }> => {
    const url = targetUrl || sheetUrl;
    if (!url) return { success: false, message: 'Google Sheets Apps Script URL is not configured.' };

    setIsSyncing(true);
    try {
      const payload = {
        companies,
        contacts,
        projects,
        contracts,
        templates,
        deals,
        meetings,
      };

      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resText = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(resText);
      } catch (e) {
        resJson = { success: true };
      }

      setIsSyncing(false);
      if (resJson.success) {
        updateTimestamp();
        return { success: true, message: 'Successfully pushed database state to Google Sheets!' };
      } else {
        return { success: false, message: 'Apps Script reported failure writing to sheets.' };
      }
    } catch (error: any) {
      setIsSyncing(false);
      return { success: false, message: `Failed to push to Google Sheets: ${error.message}` };
    }
  };

  // Sync pull from Turso SQLite
  const syncFromTurso = async (): Promise<{ success: boolean; message: string }> => {
    const client = getTursoClient();
    if (!client) return { success: false, message: 'Turso URL or Auth Token is not configured.' };

    setIsSyncing(true);
    try {
      const results = await client.batch([
        "SELECT * FROM companies;",
        "SELECT * FROM contacts;",
        "SELECT * FROM projects;",
        "SELECT * FROM contracts;",
        "SELECT * FROM templates;",
        "SELECT * FROM deals;",
        "SELECT * FROM meetings;"
      ], "read");

      // Parse results
      const dbCompanies = results[0].rows as unknown as any[];
      const dbContacts = results[1].rows as unknown as any[];
      const dbProjects = results[2].rows as unknown as any[];
      const dbContracts = results[3].rows as unknown as any[];
      const dbTemplates = results[4].rows as unknown as any[];
      const dbDeals = results[5].rows as unknown as any[];
      const dbMeetings = results[6].rows as unknown as any[];

      // Map values and handle JSON strings
      const parsedCompanies = dbCompanies.map(c => ({
        id: String(c.id),
        name: String(c.name),
        industry: c.industry ? String(c.industry) : '',
        email: c.email ? String(c.email) : '',
        phone: c.phone ? String(c.phone) : '',
        address: c.address ? String(c.address) : '',
        status: c.status ? String(c.status) as any : 'Active',
        dateAdded: c.dateAdded ? String(c.dateAdded) : new Date().toISOString()
      }));

      const parsedContacts = dbContacts.map(c => ({
        id: String(c.id),
        companyId: String(c.companyId),
        name: String(c.name),
        email: c.email ? String(c.email) : '',
        phone: c.phone ? String(c.phone) : '',
        status: c.status ? String(c.status) as any : 'Active',
        role: c.role ? String(c.role) : '',
        dateAdded: c.dateAdded ? String(c.dateAdded) : new Date().toISOString()
      }));

      const parsedProjects = dbProjects.map(p => ({
        id: String(p.id),
        companyId: String(p.companyId),
        name: String(p.name),
        code: p.code ? String(p.code) : '',
        budget: Number(p.budget) || 0,
        currency: p.currency ? String(p.currency) as any : 'IDR',
        status: p.status ? String(p.status) as any : 'Planning',
        startDate: p.startDate ? String(p.startDate) : '',
        endDate: p.endDate ? String(p.endDate) : '',
        description: p.description ? String(p.description) : ''
      }));

      const parsedContracts = dbContracts.map(c => {
        let parsedStages = [];
        if (c.stages) {
          try {
            parsedStages = typeof c.stages === 'string' ? JSON.parse(c.stages) : c.stages;
          } catch (e) {
            console.error("Failed to parse stages JSON:", e);
          }
        }
        return {
          id: String(c.id),
          projectId: String(c.projectId),
          title: String(c.title),
          contractNumber: c.contractNumber ? String(c.contractNumber) : '',
          type: c.type ? String(c.type) : 'Fixed Price',
          value: Number(c.value) || 0,
          currency: c.currency ? String(c.currency) as any : 'IDR',
          status: c.status ? String(c.status) as any : 'Active',
          signDate: c.signDate ? String(c.signDate) : '',
          startDate: c.startDate ? String(c.startDate) : '',
          endDate: c.endDate ? String(c.endDate) : '',
          stages: parsedStages
        };
      });

      const parsedTemplates = dbTemplates.map(t => {
        let parsedStages = [];
        if (t.stages) {
          try {
            parsedStages = typeof t.stages === 'string' ? JSON.parse(t.stages) : t.stages;
          } catch (e) {
            console.error("Failed to parse template stages JSON:", e);
          }
        }
        return {
          contractType: String(t.contractType),
          stages: parsedStages
        };
      });

      const parsedDeals = dbDeals.map(d => {
        let parsedQuotationItems = [];
        if (d.quotationItems) {
          try {
            parsedQuotationItems = typeof d.quotationItems === 'string' ? JSON.parse(d.quotationItems) : d.quotationItems;
          } catch (e) {
            console.error("Failed to parse quotation items JSON:", e);
          }
        }
        return {
          id: String(d.id),
          companyId: String(d.companyId),
          contactId: String(d.contactId),
          title: String(d.title),
          stage: String(d.stage) as any,
          value: Number(d.value) || 0,
          currency: d.currency ? String(d.currency) as any : 'IDR',
          estimatedCloseDate: d.estimatedCloseDate ? String(d.estimatedCloseDate) : '',
          description: d.description ? String(d.description) : '',
          createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
          quotationItems: parsedQuotationItems,
          quotationDate: d.quotationDate ? String(d.quotationDate) : undefined,
          quotationExpiry: d.quotationExpiry ? String(d.quotationExpiry) : undefined,
          quotationTerms: d.quotationTerms ? String(d.quotationTerms) : undefined
        };
      });

      const parsedMeetings = dbMeetings.map(m => {
        let parsedAttendees = [];
        if (m.attendees) {
          try {
            parsedAttendees = typeof m.attendees === 'string' ? JSON.parse(m.attendees) : m.attendees;
          } catch (e) {
            console.error("Failed to parse attendees JSON:", e);
          }
        }
        let parsedDocuments = [];
        if (m.documents) {
          try {
            parsedDocuments = typeof m.documents === 'string' ? JSON.parse(m.documents) : m.documents;
          } catch (e) {
            console.error("Failed to parse documents JSON:", e);
          }
        }
        return {
          id: String(m.id),
          dealId: String(m.dealId),
          meetingDate: String(m.meetingDate),
          title: String(m.title),
          notes: m.notes ? String(m.notes) : '',
          attendees: parsedAttendees,
          documents: parsedDocuments
        };
      });

      // Update local states directly (raw setters — must NOT go through write-through wrappers)
      setCompaniesState(parsedCompanies);
      setContactsState(parsedContacts);
      setProjectsState(parsedProjects);
      setContractsState(parsedContracts);
      setTemplatesState(parsedTemplates);
      setDealsState(parsedDeals);
      setMeetingsState(parsedMeetings);

      localStorage.setItem('vanguard_has_pulled', 'true');
      setIsSyncing(false);

      updateTimestamp();
      return { success: true, message: 'Successfully pulled database state from Turso SQLite!' };
    } catch (error: any) {
      setIsSyncing(false);
      return { success: false, message: `Failed to pull from Turso: ${error.message}` };
    }
  };

  // Sync push to Turso SQLite
  const syncToTurso = async (
    targetUrl = tursoUrl, 
    targetToken = tursoToken,
    overrides?: {
      companies?: ClientCompany[];
      contacts?: ClientContact[];
      projects?: Project[];
      contracts?: Contract[];
      templates?: WorkflowTemplate[];
      deals?: SalesDeal[];
      meetings?: MeetingLog[];
    }
  ): Promise<{ success: boolean; message: string }> => {
    const client = getTursoClient(targetUrl, targetToken);
    if (!client) return { success: false, message: 'Turso URL or Auth Token is not configured.' };

    setIsSyncing(true);
    try {
      const statements: any[] = [];
      const shouldWriteAll = !overrides;

      // Companies
      if (shouldWriteAll || overrides?.companies) {
        const list = overrides?.companies || companies;
        statements.push("DELETE FROM companies;");
        list.forEach(c => {
          statements.push({
            sql: "INSERT INTO companies (id, name, industry, email, phone, address, status, dateAdded) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            args: [c.id, c.name, c.industry, c.email, c.phone, c.address, c.status, c.dateAdded]
          });
        });
      }

      // Contacts
      if (shouldWriteAll || overrides?.contacts) {
        const list = overrides?.contacts || contacts;
        statements.push("DELETE FROM contacts;");
        list.forEach(c => {
          statements.push({
            sql: "INSERT INTO contacts (id, companyId, name, email, phone, status, role, dateAdded) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            args: [c.id, c.companyId, c.name, c.email, c.phone, c.status, c.role, c.dateAdded]
          });
        });
      }

      // Projects
      if (shouldWriteAll || overrides?.projects) {
        const list = overrides?.projects || projects;
        statements.push("DELETE FROM projects;");
        list.forEach(p => {
          statements.push({
            sql: "INSERT INTO projects (id, companyId, name, code, budget, currency, status, startDate, endDate, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            args: [p.id, p.companyId, p.name, p.code, p.budget, p.currency, p.status, p.startDate, p.endDate, p.description]
          });
        });
      }

      // Contracts
      if (shouldWriteAll || overrides?.contracts) {
        const list = overrides?.contracts || contracts;
        statements.push("DELETE FROM contracts;");
        list.forEach(c => {
          statements.push({
            sql: "INSERT INTO contracts (id, projectId, title, contractNumber, type, value, currency, status, signDate, startDate, endDate, stages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            args: [c.id, c.projectId, c.title, c.contractNumber, c.type, c.value, c.currency, c.status, c.signDate, c.startDate, c.endDate, JSON.stringify(c.stages)]
          });
        });
      }

      // Templates
      if (shouldWriteAll || overrides?.templates) {
        const list = overrides?.templates || templates;
        statements.push("DELETE FROM templates;");
        list.forEach(t => {
          statements.push({
            sql: "INSERT INTO templates (contractType, stages) VALUES (?, ?);",
            args: [t.contractType, JSON.stringify(t.stages)]
          });
        });
      }

      // Deals
      if (shouldWriteAll || overrides?.deals) {
        const list = overrides?.deals || deals;
        statements.push("DELETE FROM deals;");
        list.forEach(d => {
          statements.push({
            sql: "INSERT INTO deals (id, companyId, contactId, title, stage, value, currency, estimatedCloseDate, description, createdAt, quotationItems, quotationDate, quotationExpiry, quotationTerms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            args: [d.id, d.companyId, d.contactId, d.title, d.stage, d.value, d.currency, d.estimatedCloseDate, d.description, d.createdAt, JSON.stringify(d.quotationItems || []), d.quotationDate || "", d.quotationExpiry || "", d.quotationTerms || ""]
          });
        });
      }

      // Meetings
      if (shouldWriteAll || overrides?.meetings) {
        const list = overrides?.meetings || meetings;
        statements.push("DELETE FROM meetings;");
        list.forEach(m => {
          statements.push({
            sql: "INSERT INTO meetings (id, dealId, meetingDate, title, attendees, notes, documents) VALUES (?, ?, ?, ?, ?, ?, ?);",
            args: [m.id, m.dealId, m.meetingDate, m.title, JSON.stringify(m.attendees || []), m.notes || "", JSON.stringify(m.documents || [])]
          });
        });
      }

      if (statements.length > 0) {
        await client.batch(statements, "write");
      }
      setIsSyncing(false);
      updateTimestamp();
      return { success: true, message: 'Successfully pushed database state to Turso SQLite!' };
    } catch (error: any) {
      setIsSyncing(false);
      return { success: false, message: `Failed to push to Turso: ${error.message}` };
    }
  };



  // Periodic background sync & Window focus sync
  useEffect(() => {
    if (!hasInitialized || !autoSync) return;
    if (!tursoUrl && !sheetUrl) return;

    const handleFocus = () => {
      if (!isSyncing && document.visibilityState === 'visible') {
        console.log("Window focused: running background database sync pull...");
        if (tursoUrl && tursoToken) {
          syncFromTurso();
        } else if (sheetUrl) {
          syncFromSheets();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    const interval = setInterval(() => {
      if (!isSyncing && document.visibilityState === 'visible') {
        console.log("Interval triggered: running background database sync pull...");
        if (tursoUrl && tursoToken) {
          syncFromTurso();
        } else if (sheetUrl) {
          syncFromSheets();
        }
      }
    }, 15000); // 15 seconds polling interval

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [hasInitialized, autoSync, tursoUrl, tursoToken, sheetUrl, isSyncing]);

  // --- Company Operations ---
  const addCompany = (companyData: Omit<ClientCompany, 'id' | 'dateAdded'>) => {
    const newCompany: ClientCompany = {
      ...companyData,
      id: `comp-${generateId()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setCompanies(prev => [...prev, newCompany]);
  };

  const updateCompany = (id: string, updatedFields: Partial<ClientCompany>) => {
    setCompanies(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updatedFields } : c))
    );
  };

  const deleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    // Optionally alert the user that contacts linked to this company will need re-association
  };

  // --- Contact Operations ---
  const addContact = (contactData: Omit<ClientContact, 'id' | 'dateAdded'>) => {
    const newContact: ClientContact = {
      ...contactData,
      id: `cont-${generateId()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setContacts(prev => [...prev, newContact]);
  };

  const updateContact = (id: string, updatedFields: Partial<ClientContact>) => {
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updatedFields } : c))
    );
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // --- Project Operations ---
  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${generateId()}`,
    };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, updatedFields: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updatedFields } : p))
    );
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // --- Contract Operations ---
  const addContract = (contractData: Omit<Contract, 'id' | 'stages'>) => {
    const contractId = `cont-${generateId()}`;
    const template = templates.find(t => t.contractType === contractData.type);
    
    const instantiatedStages: ContractStage[] = template
      ? template.stages.map((st, idx) => {
          const contractStart = new Date(contractData.startDate);
          contractStart.setDate(contractStart.getDate() + st.relativeDays);
          const dueDateStr = contractStart.toISOString().split('T')[0];
          
          return {
            id: `stage-${generateId()}`,
            name: st.name,
            description: st.description,
            category: st.category,
            status: idx === 0 ? 'Active' : 'Pending',
            dueDate: dueDateStr,
            completedDate: null,
            invoiceNumber: null,
            billingAmount: st.category === 'Billing' || st.category === 'Collection' ? 0 : null,
            paymentReference: null,
            notes: '',
          };
        })
      : [];

    const newContract: Contract = {
      ...contractData,
      id: contractId,
      stages: instantiatedStages,
    };
    setContracts(prev => [...prev, newContract]);
  };

  const updateContract = (id: string, updatedFields: Partial<Contract>) => {
    setContracts(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updatedFields } : c))
    );
  };

  const deleteContract = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  // --- Stage Operations ---
  const updateContractStage = (contractId: string, stageId: string, updatedFields: Partial<ContractStage>) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        
        const newStages = c.stages.map(st => {
          if (st.id !== stageId) return st;
          
          const updatedStage = { ...st, ...updatedFields };
          
          if (updatedFields.status === 'Done' && st.status !== 'Done') {
            updatedStage.completedDate = new Date().toISOString().split('T')[0];
          } else if (updatedFields.status && updatedFields.status !== 'Done') {
            updatedStage.completedDate = null;
          }
          
          return updatedStage;
        });

        const currentStageIndex = c.stages.findIndex(st => st.id === stageId);
        if (updatedFields.status === 'Done' && currentStageIndex !== -1 && currentStageIndex < newStages.length - 1) {
          const nextStage = newStages[currentStageIndex + 1];
          if (nextStage.status === 'Pending') {
            nextStage.status = 'Active';
          }
        }
        
        return {
          ...c,
          stages: newStages,
        };
      })
    );
  };

  const addCustomStage = (contractId: string, stageData: Omit<ContractStage, 'id'>, insertAfterId?: string) => {
    const newStage: ContractStage = {
      ...stageData,
      id: `stage-${generateId()}`,
    };

    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        
        const newStages = [...c.stages];
        if (insertAfterId) {
          const index = newStages.findIndex(st => st.id === insertAfterId);
          if (index !== -1) {
            newStages.splice(index + 1, 0, newStage);
          } else {
            newStages.push(newStage);
          }
        } else {
          newStages.push(newStage);
        }
        
        return {
          ...c,
          stages: newStages,
        };
      })
    );
  };

  const deleteContractStage = (contractId: string, stageId: string) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        return {
          ...c,
          stages: c.stages.filter(st => st.id !== stageId),
        };
      })
    );
  };

  const reorderContractStages = (contractId: string, reorderedStages: ContractStage[]) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.id !== contractId) return c;
        return {
          ...c,
          stages: reorderedStages,
        };
      })
    );
  };

  // --- Template Configurations (Master Data) ---
  const updateTemplateStages = (contractType: string, updatedStages: WorkflowTemplate['stages']) => {
    setTemplates(prev =>
      prev.map(t => (t.contractType === contractType ? { ...t, stages: updatedStages } : t))
    );
  };

  const addNewTemplateType = (contractType: string) => {
    if (templates.some(t => t.contractType.toLowerCase() === contractType.toLowerCase())) return;
    
    const newTemplate: WorkflowTemplate = {
      contractType,
      stages: [
        { name: 'Initial Drafting', description: 'Draft contract scope', category: 'Drafting', relativeDays: 7 },
        { name: 'Contract Agreement Signature', description: 'Sign the contract documents', category: 'Signing', relativeDays: 14 },
        { name: 'Completion Audit', description: 'Perform final validation check', category: 'Completed', relativeDays: 30 }
      ],
    };
    setTemplates(prev => [...prev, newTemplate]);
  };

  // --- Sales Deal Operations ---
  const addDeal = (dealData: Omit<SalesDeal, 'id' | 'createdAt' | 'quotationItems'>) => {
    const newDeal: SalesDeal = {
      ...dealData,
      id: `deal-${generateId()}`,
      createdAt: new Date().toISOString().split('T')[0],
      quotationItems: []
    };
    setDeals(prev => [...prev, newDeal]);
  };

  const updateDeal = (id: string, updatedFields: Partial<SalesDeal>) => {
    setDeals(prev =>
      prev.map(d => (d.id === id ? { ...d, ...updatedFields } : d))
    );
  };

  const deleteDeal = (id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id));
    // Cascade delete meeting logs
    setMeetings(prev => prev.filter(m => m.dealId !== id));
  };

  // --- Meeting Log Operations ---
  const addMeetingLog = (meetingData: Omit<MeetingLog, 'id'>) => {
    const newMeeting: MeetingLog = {
      ...meetingData,
      id: `meet-${generateId()}`
    };
    setMeetings(prev => [...prev, newMeeting]);
  };

  const updateMeetingLog = (id: string, updatedFields: Partial<MeetingLog>) => {
    setMeetings(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updatedFields } : m))
    );
  };

  const deleteMeetingLog = (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
  };

  const updateStageProbabilities = (probs: Record<SalesDealStage, number>) => {
    setStageProbabilities(probs);
  };

  return (
    <CRMContext.Provider
      value={{
        companies,
        contacts,
        projects,
        contracts,
        templates,
        deals,
        meetings,
        sheetUrl,
        setSheetUrl,
        isSyncing,
        autoSync,
        setAutoSync,
        syncFromSheets,
        syncToSheets,
        tursoUrl,
        setTursoUrl,
        tursoToken,
        setTursoToken,
        syncFromTurso,
        syncToTurso,
        lastSyncTime,
        hasInitialized,
        syncError,
        retryInitialPull,
        addCompany,
        updateCompany,
        deleteCompany,
        addContact,
        updateContact,
        deleteContact,
        addProject,
        updateProject,
        deleteProject,
        addContract,
        updateContract,
        deleteContract,
        updateContractStage,
        addCustomStage,
        deleteContractStage,
        reorderContractStages,
        updateTemplateStages,
        addNewTemplateType,
        addDeal,
        updateDeal,
        deleteDeal,
        addMeetingLog,
        updateMeetingLog,
        deleteMeetingLog,
        stageProbabilities,
        updateStageProbabilities,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
