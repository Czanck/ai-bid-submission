export interface SpecialInstruction {
  id: string;
  category: "participation" | "process" | "financial" | "timing" | "insurance";
  requirement: string;
  searchHints: string[];
  actionRequired: string;
}

export const specialInstructions: SpecialInstruction[] = [
  {
    id: "mbe-participation",
    category: "participation",
    requirement: "15% MBE participation requirement with documentation",
    searchHints: [
      "MBE",
      "minority business enterprise",
      "minority participation",
      "15%",
      "diversity",
      "MBE certification",
    ],
    actionRequired:
      "Provide MBE participation documentation showing at least 15% commitment",
  },
  {
    id: "gc-phone-call",
    category: "process",
    requirement: "Must call GC before submitting at (888) 888-8888",
    searchHints: [
      "pre-bid call",
      "phone",
      "contact GC",
      "call before",
      "888-888-8888",
    ],
    actionRequired:
      "Call the General Contractor at (888) 888-8888 before submitting your bid",
  },
  {
    id: "bid-bond",
    category: "financial",
    requirement: "Bid bond or bonding capacity letter required",
    searchHints: [
      "bid bond",
      "surety bond",
      "bonding capacity",
      "bonding letter",
      "surety company",
    ],
    actionRequired:
      "Include a bid bond or letter of bonding capacity from your surety company",
  },
  {
    id: "bid-deadline",
    category: "timing",
    requirement: "Bids due by 12:00 PM on due date",
    searchHints: [
      "due date",
      "deadline",
      "12:00 PM",
      "noon",
      "submission time",
      "bid due",
    ],
    actionRequired: "Ensure your bid is submitted before 12:00 PM on the due date",
  },
  {
    id: "general-liability",
    category: "insurance",
    requirement: "$2M general liability insurance with certificate required",
    searchHints: [
      "general liability",
      "insurance certificate",
      "$2,000,000",
      "$2M",
      "COI",
      "certificate of insurance",
      "liability coverage",
    ],
    actionRequired:
      "Provide a certificate of insurance showing $2M general liability coverage",
  },
];

export function getInstructionsPromptBlock(): string {
  return specialInstructions
    .map(
      (inst, i) =>
        `${i + 1}. [${inst.id}] ${inst.requirement}\n   Look for: ${inst.searchHints.join(", ")}\n   If not found: ${inst.actionRequired}`
    )
    .join("\n");
}
