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

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
}
