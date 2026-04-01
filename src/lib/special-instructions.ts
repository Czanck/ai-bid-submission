export interface SpecialInstruction {
  id: string;
  category: "participation" | "process" | "financial" | "timing" | "insurance";
  requirement: string;
  searchHints: string[];
  actionRequired: string;
}

// Project 1 special instructions
export const specialInstructions: SpecialInstruction[] = [
  {
    id: "submit-via-planhub",
    category: "process",
    requirement: "Please submit all bids through PlanHub",
    searchHints: [
      "PlanHub",
      "online submission",
      "bid platform",
      "electronic submission",
    ],
    actionRequired:
      "Submit your bid through the PlanHub platform. Do not send bids via email or physical delivery.",
  },
];

// Project 2 special instructions
export const specialInstructions2: SpecialInstruction[] = [
  {
    id: "submit-via-planhub",
    category: "process",
    requirement: "Please submit all bids through PlanHub",
    searchHints: [
      "PlanHub",
      "online submission",
      "bid platform",
      "electronic submission",
    ],
    actionRequired:
      "Submit your bid through the PlanHub platform. Do not send bids via email or physical delivery.",
  },
];

export function getInstructionsPromptBlock(instructions?: SpecialInstruction[]): string {
  const list = (instructions || specialInstructions).filter(
    (inst) => inst.id !== "submit-via-planhub"
  );
  if (list.length === 0) return "(none — all requirements are automatically satisfied)";
  return list
    .map(
      (inst, i) =>
        `${i + 1}. [${inst.id}] ${inst.requirement}\n   Look for: ${inst.searchHints.join(", ")}\n   If not found: ${inst.actionRequired}`
    )
    .join("\n");
}
