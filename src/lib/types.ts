export type RequirementStatus = "found" | "missing" | "needs-action";

export interface RequirementCheck {
  id: string;
  label: string;
  description: string;
  status: RequirementStatus;
  detail: string;
}

export interface TradeItem {
  trade: string;
  amount: string;
}

export interface ExtractedBidData {
  companyName: string;
  bidAmount: string;
  tradeBreakdown: TradeItem[];
  certifications: {
    mbe: boolean;
    wbe: boolean;
    other: string[];
  };
  bondInfo: {
    hasBidBond: boolean;
    bondingCapacity: string;
    bondCompany: string;
  };
  insuranceInfo: {
    hasGeneralLiability: boolean;
    coverageAmount: string;
    certificateProvided: boolean;
  };
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface AnalyzeBidResponse {
  extractedData: ExtractedBidData;
  checklist: RequirementCheck[];
  messageTemplate: string;
  confidence: number;
}

export type ModalStep = "upload" | "processing" | "review" | "submitted";

export interface BidFinding {
  text: string;
  severity: "info" | "warning" | "risk";
  source: string;
  cta?: string;
}

export interface ScoreDimension {
  name: string;
  score: number;
  explanation: string;
  findings: BidFinding[];
}

export interface BidReadinessScore {
  score: number;
  status: "ready" | "needs-review" | "high-risk";
  confidence: "high" | "medium" | "low";
  confidenceNote?: string;
  summary: string;
  dimensions: ScoreDimension[];
  promptChips: string[];
}

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
}

// --- Bid Readiness Check (feature-flagged) ---

export interface ScopeCheckItem {
  trade: string;
  status: "aligned" | "misaligned" | "missing";
  detail: string;
  fix?: string;
}

export interface BidReadinessCheck {
  result: "looks-good" | "needs-review";
  items: ScopeCheckItem[];
  writingSummary: string;
  promptChips: string[];
}

// --- Stored / imported project types ---

export interface StoredProject {
  id: string;
  name: string;
  description: string;
  location: string;
  projectValue: string;
  projectSize: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  status: string;
  constructionType: string;
  projectType: string;
  buildingUse: string;
  sectorLaborStatus: string;
  trades: string[];
  totalTrades: number;
  /** AI-extracted context sent alongside bids for comparison */
  projectContext: string;
  /** Column on the bid board */
  boardColumn: "saved" | "estimating" | "bidding" | "submitted" | "won" | "lost";
  createdAt: number;
}

export interface StoredProjectFile {
  projectId: string;
  fileName: string;
  fileType: string;
  /** Extracted text content from the file */
  extractedText: string;
}

export interface ScanProjectResponse {
  project: Omit<StoredProject, "boardColumn" | "createdAt">;
  files: StoredProjectFile[];
}
