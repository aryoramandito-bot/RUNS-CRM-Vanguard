export type Currency = 'IDR' | 'USD';

export type CustomerStatus = 'Active' | 'Inactive';

export interface ClientCompany {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  dateAdded: string;
}

export interface ClientContact {
  id: string;
  companyId: string; // References ClientCompany.id
  name: string; // Contact Person Name
  email: string;
  phone: string;
  status: CustomerStatus;
  dateAdded: string;
  role: string; // e.g. IT Manager, CFO
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  companyId: string; // References ClientCompany.id
  name: string;
  code: string;
  budget: number;
  currency: Currency;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  description: string;
}

export type ContractStatus = 'Draft' | 'Review' | 'Active' | 'Expired' | 'Terminated';

export type ContractStageCategory = 'Drafting' | 'Signing' | 'Execution' | 'Billing' | 'Collection' | 'Completed';

export type ContractStageStatus = 'Pending' | 'Active' | 'Done' | 'Skipped';

export interface ContractStage {
  id: string;
  name: string;
  description: string;
  category: ContractStageCategory;
  status: ContractStageStatus;
  dueDate: string;
  completedDate: string | null;
  invoiceNumber: string | null; // For Billing/Collection
  invoiceDate: string | null;   // For Billing/Collection
  billingAmount: number | null; // For Billing/Collection
  paymentReference: string | null; // For Collection
  notes: string;
}

export interface Contract {
  id: string;
  projectId: string;
  title: string;
  contractNumber: string;
  type: string; // e.g. 'Fixed Price', 'Retainer', 'T&M'
  value: number;
  currency: Currency;
  status: ContractStatus;
  signDate: string;
  startDate: string;
  endDate: string;
  stages: ContractStage[];
}

export interface WorkflowStageTemplate {
  name: string;
  description: string;
  category: ContractStageCategory;
  relativeDays: number; // Days from contract start date
}

export interface WorkflowTemplate {
  contractType: string;
  stages: WorkflowStageTemplate[];
}

export type SalesDealStage = 'Lead' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesDeal {
  id: string;
  companyId: string; // References ClientCompany.id
  contactId: string; // Primary Point of Contact (ClientContact.id)
  title: string;
  stage: SalesDealStage;
  value: number;
  currency: Currency;
  estimatedCloseDate: string;
  description: string;
  createdAt: string;
  // Quotation data
  quotationItems: QuotationItem[];
  quotationDate?: string;
  quotationExpiry?: string;
  quotationTerms?: string;
}

export interface MeetingLog {
  id: string;
  dealId: string; // References SalesDeal.id
  meetingDate: string;
  title: string; // Meeting agenda/title
  attendees: string[]; // List of attendees (POC names)
  notes: string; // Summary of discussion
  documents: string[]; // Related document links/filenames discussed
}

export interface CRMState {
  companies: ClientCompany[];
  contacts: ClientContact[];
  projects: Project[];
  contracts: Contract[];
  templates: WorkflowTemplate[];
  deals: SalesDeal[];
  meetings: MeetingLog[];
}

