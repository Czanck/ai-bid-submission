"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Paperclip,
  Loader2,
  Sparkles,
  Send,
  Trash2,
  Building2,
  Plus,
  Pencil,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Info,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { EnvelopeAnimation } from "./envelope-animation";
import { getFlag } from "@/lib/feature-flags";
import type {
  ModalStep,
  UploadedFile,
  AnalyzeBidResponse,
  RequirementStatus,
  BidReadinessScore,
  BidReadinessCheck,
} from "@/lib/types";

interface BidSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  gcName?: string;
  gcEmail?: string;
  projectId?: string;
  projectContext?: string;
}

const statusConfig: Record<
  RequirementStatus,
  { icon: typeof CheckCircle2; color: string; badgeVariant: "success" | "destructive" | "warning"; label: string }
> = {
  found: {
    icon: CheckCircle2,
    color: "text-success-foreground",
    badgeVariant: "success",
    label: "Found",
  },
  missing: {
    icon: XCircle,
    color: "text-destructive",
    badgeVariant: "destructive",
    label: "Missing",
  },
  "needs-action": {
    icon: AlertTriangle,
    color: "text-warning-foreground",
    badgeVariant: "warning",
    label: "Action Needed",
  },
};

const requirementHelp: Record<string, { title: string; steps: string[]; tip: string }> = {
  "gc-phone-call": {
    title: "How to complete the GC phone call",
    steps: [
      "Call the General Contractor at (888) 888-8888 before submitting",
      "Confirm your intent to bid and ask any clarifying questions",
      "Note the name of the person you spoke with and the date/time",
      "Reference the call in your bid submission cover letter",
    ],
    tip: "Try calling during business hours (8 AM – 5 PM). If you can't reach anyone, leave a voicemail with your company name and callback number.",
  },
  "submit-via-planhub": {
    title: "How to submit through PlanHub",
    steps: [
      "Ensure you are logged into your PlanHub account",
      "Navigate to this project and click 'Submit Bid'",
      "Upload your bid documents and fill in the required fields",
      "Review your submission and click the final Submit button",
    ],
    tip: "You're already on PlanHub! Submitting your bid here satisfies this requirement automatically.",
  },
};

const processingMessages = [
  "Extracting text from documents...",
  "Analyzing bid information...",
  "Checking special instructions...",
  "Generating submission template...",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function BidSubmissionModal({
  open,
  onOpenChange,
  projectName = "City Center Office Complex - Phase 2",
  gcName = "Turner Construction",
  gcEmail = "bids@turnerconstruction.com",
  projectId = "project1",
  projectContext,
}: BidSubmissionModalProps) {
  const applyTemplate = useCallback(
    (tpl: string) => {
      return tpl
        .replace(/\{\{GC Name\}\}/g, gcName)
        .replace(/\{\{Project Name\}\}/g, projectName)
        .replace(/\{\{Bid Amount\}\}/g, bidAmountRef.current || "$0.00")
        .replace(/\{\{Your Company\}\}/g, "Company X Electric")
        .replace(/\{\{Due Date\}\}/g, "03/23/2026")
        .replace(/\{\{Your Name\}\}/g, "Chase Zanck");
    },
    [gcName, projectName]
  );

  const [step, setStep] = useState<ModalStep>("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeBidResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);

  // Review form state
  const bidAmountRef = useRef("");
  const [bidAmount, setBidAmountRaw] = useState("");
  const setBidAmount = useCallback((val: string) => {
    bidAmountRef.current = val;
    setBidAmountRaw(val);
  }, []);
  const [messageBody, setMessageBody] = useState("");
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [shareWithGCs, setShareWithGCs] = useState(true);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccValue, setCcValue] = useState("");
  const [bccValue, setBccValue] = useState("");
  const [additionalTo, setAdditionalTo] = useState<string[]>([]);
  const [newToInput, setNewToInput] = useState("");
  const [showNewToInput, setShowNewToInput] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [helpExpandedId, setHelpExpandedId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImprovingBid, setIsImprovingBid] = useState(false);
  const [bidScore, setBidScore] = useState<BidReadinessScore | null>(null);
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [followUpResponse, setFollowUpResponse] = useState<string[] | null>(null);
  const followUpInputRef = useRef<HTMLInputElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Bid Readiness Check (feature-flagged)
  const [isReadinessChecking, setIsReadinessChecking] = useState(false);
  const [readinessCheck, setReadinessCheck] = useState<BidReadinessCheck | null>(null);
  const [readinessExpanded, setReadinessExpanded] = useState<boolean | null>(null); // null = unset, will default based on result
  const [requirementsExpanded, setRequirementsExpanded] = useState(true);
  const [messageTemplate, setMessageTemplate] = useState(
    "Dear {{GC Name}},\n\nPlease find attached our bid submission for {{Project Name}}.\n\nBid Summary:\n- Total Bid Amount: {{Bid Amount}}\n\nBest regards,\n{{Your Company}}"
  );
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [showEnvelopeAnimation, setShowEnvelopeAnimation] = useState(false);
  const [modalRect, setModalRect] = useState<DOMRect | null>(null);

  // Cycle processing messages
  useEffect(() => {
    if (step !== "processing") return;
    const interval = setInterval(() => {
      setProcessingMsgIndex((prev) => (prev + 1) % processingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  // Rotate follow-up placeholder text using AI-generated chips when available
  const defaultPlaceholders = [
    "Should I break out generator work separately?",
    "Am I missing any scope items?",
    "What exclusions should I add?",
    "Does my timeline look realistic?",
  ];
  const followUpPlaceholders = bidScore?.promptChips?.length ? bidScore.promptChips : defaultPlaceholders;

  useEffect(() => {
    if (!bidScore) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % followUpPlaceholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [bidScore, followUpPlaceholders.length]);

  // Reset state when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing during envelope animation
      if (!newOpen && showEnvelopeAnimation) return;
      if (!newOpen) {
        setTimeout(() => {
          setStep("upload");
          setFiles([]);
          setAnalysisResult(null);
          setError(null);
          setBidAmount("");
          setMessageBody("");
          setIsEmailConnected(false);
          setShareWithGCs(true);
          setProcessingMsgIndex(0);
          setShowEnvelopeAnimation(false);
          setModalRect(null);
          setShowCc(false);
          setShowBcc(false);
          setCcValue("");
          setBccValue("");
          setAdditionalTo([]);
          setNewToInput("");
          setShowNewToInput(false);
          setShowTemplateEditor(false);
          setHelpExpandedId(null);
          setRequirementsExpanded(true);
          setIsAnalyzing(false);
          setIsImprovingBid(false);
          setBidScore(null);
          setScoreBreakdownOpen(false);
          setFollowUpInput("");
          setIsFollowingUp(false);
          setFollowUpResponse(null);
          setIsReadinessChecking(false);
          setReadinessCheck(null);
          setReadinessExpanded(null);
        }, 300);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, showEnvelopeAnimation]
  );

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter((f) => {
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
      ];
      return validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });

    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        file,
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    ]);
    setError(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setStep("review");
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));
      formData.append("projectId", projectId);
      if (projectContext) formData.append("projectContext", projectContext);

      const response = await fetch("/api/analyze-bid", {
        method: "POST",
        body: formData,
      });

      // Safely parse the response — handle HTML error pages, timeouts, etc.
      let data: Record<string, unknown>;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        throw new Error(
          response.status === 504
            ? "Analysis timed out. Try uploading a smaller file."
            : `Server error (${response.status}). Please try again.`
        );
      }

      if (!response.ok) {
        throw new Error(
          (data.error as string) || `Analysis failed (${response.status})`
        );
      }

      const result = data as unknown as AnalyzeBidResponse;
      setAnalysisResult(result);
      setBidAmount(result.extractedData.bidAmount);
      setMessageBody(result.messageTemplate);
      const hasUnmet = result.checklist.some((c) => c.status === "needs-action" || c.status === "missing");
      setRequirementsExpanded(hasUnmet);
      setIsAnalyzing(false);

      // Auto-trigger bid analysis after document extraction completes
      const readinessCheckEnabled = getFlag("bid-readiness-check");

      if (readinessCheckEnabled) {
        // Feature-flagged: Bid Readiness Check (scope alignment)
        setIsReadinessChecking(true);
        setReadinessCheck(null);
        setReadinessExpanded(null);
        try {
          const checkForm = new FormData();
          files.forEach((f) => checkForm.append("files", f.file));
          checkForm.append("projectId", projectId);
          if (projectContext) checkForm.append("projectContext", projectContext);
          const checkRes = await fetch("/api/readiness-check", { method: "POST", body: checkForm });
          const checkData = await checkRes.json() as BidReadinessCheck;
          if (checkData.result) {
            setReadinessCheck(checkData);
            // "needs-review" => expanded by default, "looks-good" => collapsed by default
            setReadinessExpanded(checkData.result === "needs-review");
          }
        } catch {
          // Check failed silently — not critical to submission
        } finally {
          setIsReadinessChecking(false);
        }
      } else {
        // Default: Bid Readiness Score (original)
        setIsImprovingBid(true);
        setBidScore(null);
        try {
          const improveForm = new FormData();
          files.forEach((f) => improveForm.append("files", f.file));
          improveForm.append("projectId", projectId);
          if (projectContext) improveForm.append("projectContext", projectContext);
          const improveRes = await fetch("/api/improve-bid", { method: "POST", body: improveForm });
          const improveData = await improveRes.json() as BidReadinessScore;
          if (improveData.score !== undefined) {
            setBidScore(improveData);
          }
        } catch {
          // Score failed silently — not critical to submission
        } finally {
          setIsImprovingBid(false);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
      setIsAnalyzing(false);
      setStep("upload");
    }
  }, [files]);

  const handleImproveBid = useCallback(async () => {
    if (files.length === 0) return;
    setIsImprovingBid(true);
    setBidScore(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));
      formData.append("projectId", projectId);
      if (projectContext) formData.append("projectContext", projectContext);
      const response = await fetch("/api/improve-bid", { method: "POST", body: formData });
      const data = await response.json() as BidReadinessScore;
      if (data.score !== undefined) {
        setBidScore(data);
      }
    } catch {
      // Score failed silently
    } finally {
      setIsImprovingBid(false);
    }
  }, [files, projectId]);

  const handleFollowUp = useCallback(async () => {
    if (!followUpInput.trim() || files.length === 0) return;
    setIsFollowingUp(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f.file));
    formData.append("projectId", projectId);
    if (projectContext) formData.append("projectContext", projectContext);
    formData.append("followUp", followUpInput.trim());
    formData.append("context", bidScore ? `Score: ${bidScore.score}/100. ${bidScore.summary}. ${bidScore.dimensions.map(d => `${d.name}: ${d.score}/100 - ${d.explanation}`).join(". ")}` : "");
    setFollowUpInput("");
    try {
      const response = await fetch("/api/improve-bid", { method: "POST", body: formData });
      const data = await response.json() as { feedback?: string[] };
      setFollowUpResponse(data.feedback ?? ["I'm not sure. Try rephrasing your question."]);
    } catch {
      setFollowUpResponse(["Could not load a response. Please try again."]);
    } finally {
      setIsFollowingUp(false);
    }
  }, [files, projectId, followUpInput, bidScore]);

  const handleConnectEmail = useCallback(() => {
    setIsConnectingEmail(true);
    // Simulated OAuth flow
    setTimeout(() => {
      setIsEmailConnected(true);
      setIsConnectingEmail(false);
    }, 1500);
  }, []);

  const handleSubmit = useCallback(() => {
    // Capture modal rect before starting animation
    if (modalContentRef.current) {
      setModalRect(modalContentRef.current.getBoundingClientRect());
    }
    setShowEnvelopeAnimation(true);
  }, []);

  const handleEnvelopeComplete = useCallback(() => {
    setShowEnvelopeAnimation(false);
    setModalRect(null);
    setStep("submitted");
    setTimeout(() => {
      handleOpenChange(false);
    }, 2500);
  }, [handleOpenChange]);

  // DEV-ONLY: skip to review with mock data (progressive loading)
  const devSkipToReview = useCallback(() => {
    setBidAmount("");
    setMessageBody("");
    setFiles([{ file: new File([""], "bid.pdf", { type: "application/pdf" }), id: "test-1", name: "bid-proposal.pdf", size: 245000, type: "application/pdf" }]);
    setIsAnalyzing(true);
    setStep("review");

    // Simulate progressive population after AI processing delay
    setTimeout(() => {
      if (projectId === "project2") {
        setAnalysisResult({
          extractedData: {
            companyName: "Company X Electric",
            bidAmount: "$2,353,424.00",
            tradeBreakdown: [
              { trade: "Electrical Rough-In", amount: "$685,000" },
              { trade: "Panel Upgrades", amount: "$412,000" },
              { trade: "Fire Alarm", amount: "$298,000" },
              { trade: "Low Voltage / Data", amount: "$345,424" },
              { trade: "Emergency Generator Tie-In", amount: "$613,000" },
            ],
            certifications: { mbe: false, wbe: false, other: [] },
            bondInfo: { hasBidBond: false, bondingCapacity: "", bondCompany: "" },
            insuranceInfo: { hasGeneralLiability: true, coverageAmount: "$1,000,000", certificateProvided: true },
            contactInfo: { name: "Chase Zanck", email: "chase@companyxelectric.com", phone: "(512) 555-0199" },
          },
          messageTemplate: `Dear ${gcName},\n\nPlease find attached our bid submission for ${projectName}.\n\nBid Summary:\n- Total Bid Amount: $2,353,424.00\n\nBest regards,\nCompany X Electric`,
          checklist: [
            { id: "submit-via-planhub", label: "Submit via PlanHub", description: "Please submit all bids through PlanHub", status: "found" as const, detail: "Bid is being submitted through PlanHub" },
          ],
          confidence: 0.95,
        });
        setBidAmount("$2,353,424.00");
        setMessageBody(`Dear ${gcName},\n\nPlease find attached our bid submission for ${projectName}.\n\nTotal Bid Amount: $2,353,424.00\n\nBest regards,\nCompany X Electric`);
        setRequirementsExpanded(false); // all met
      } else {
        setAnalysisResult({
          extractedData: {
            companyName: "Acme Electrical Contractors",
            bidAmount: "$1,250,000",
            tradeBreakdown: [
              { trade: "Electrical Rough-In", amount: "$450,000" },
              { trade: "Lighting & Controls", amount: "$380,000" },
              { trade: "Fire Alarm", amount: "$220,000" },
              { trade: "Low Voltage", amount: "$200,000" },
            ],
            certifications: { mbe: true, wbe: false, other: [] },
            bondInfo: { hasBidBond: true, bondingCapacity: "$2,000,000", bondCompany: "Surety Bond Co." },
            insuranceInfo: { hasGeneralLiability: true, coverageAmount: "$2,000,000", certificateProvided: false },
            contactInfo: { name: "Chris Patterson", email: "chris@acmeelectric.com", phone: "(512) 555-0147" },
          },
          messageTemplate: "Dear Turner Construction,\n\nPlease find attached our bid for the City Center Office Complex - Phase 2 project.\n\nTotal Bid Amount: $1,250,000\n\nBest regards",
          checklist: [
            { id: "submit-via-planhub", label: "Submit via PlanHub", description: "Please submit all bids through PlanHub", status: "found" as const, detail: "Bid is being submitted through PlanHub" },
          ],
          confidence: 0.92,
        });
        setBidAmount("$1,250,000");
        setMessageBody("Dear Turner Construction,\n\nPlease find attached our bid.\n\nBest regards");
        setRequirementsExpanded(false);
      }
      setIsAnalyzing(false);

      const readinessCheckEnabled = getFlag("bid-readiness-check");

      if (readinessCheckEnabled) {
        // Mock readiness check
        setIsReadinessChecking(true);
        setReadinessCheck(null);
        setReadinessExpanded(null);
        setTimeout(() => {
          const mockCheck: BidReadinessCheck = projectId === "project2" ? {
            result: "looks-good",
            items: [
              { trade: "Electrical Rough-In", status: "aligned", detail: "Scope matches project specifications for 277/480V distribution and branch circuits." },
              { trade: "Fire Alarm", status: "aligned", detail: "NFPA 72 references and device counts align with project requirements." },
              { trade: "Low Voltage / Data", status: "aligned", detail: "Cabling scope covers CAT6A and fiber pathways as specified." },
              { trade: "Emergency Generator Tie-In", status: "aligned", detail: "Generator connection and ATS scope matches project mechanical schedule." },
              { trade: "Panel Upgrades", status: "aligned", detail: "Panel schedule and amperage ratings match specification requirements." },
            ],
            writingSummary: "Consider adding a brief executive summary at the top of your proposal and organizing scope items under clear subheadings to improve readability for the GC's estimating team.",
            promptChips: [
              "Should I add an exclusions section?",
              "Is my fire alarm scope specific enough?",
              "How should I format my trade breakdown?",
              "What certifications should I mention?",
            ],
          } : {
            result: "needs-review",
            items: [
              { trade: "Electrical Rough-In", status: "aligned", detail: "Branch circuit layout and panel schedule align with project electrical drawings." },
              { trade: "Lighting & Controls", status: "misaligned", detail: "Bid references standard 0-10V dimming but project specs require DALI controls for the open office areas.", fix: "Update your dimming control specification to include DALI protocol for open office zones (Drawing E-4, Note 7). You can keep 0-10V for back-of-house areas." },
              { trade: "Fire Alarm", status: "aligned", detail: "Device counts and NFPA 72 references align with project fire alarm drawings." },
              { trade: "Low Voltage", status: "missing", detail: "Project specs call for a dedicated AV conduit pathway to 12 conference rooms, but your bid does not address AV rough-in.", fix: "Add a line item for AV conduit rough-in to conference rooms per Drawing T-2. Include 1\" EMT with pull strings to each of the 12 locations noted on the reflected ceiling plan." },
            ],
            writingSummary: "Your proposal would benefit from a clear exclusions section and consistent formatting of scope items — several trades are described in paragraph form while others use bullet points.",
            promptChips: [
              "What DALI controls do the specs require?",
              "Where are the AV rough-in locations?",
              "What exclusions should I add?",
              "Should I break out access control separately?",
              "How can I improve my proposal formatting?",
            ],
          };
          setReadinessCheck(mockCheck);
          setReadinessExpanded(mockCheck.result === "needs-review");
          setIsReadinessChecking(false);
        }, 1500);
      } else {
        // Mock bid readiness score (original)
        setIsImprovingBid(true);
        setBidScore(null);
        setTimeout(() => {
          const mockScore: BidReadinessScore = projectId === "project2" ? {
            score: 82,
            status: "ready",
            confidence: "high",
            summary: "Bid package is well-structured with minor clarity improvements possible",
            dimensions: [
              { name: "Coverage", score: 85, explanation: "All major scope categories appear addressed for the medical retrofit.", findings: [
                { text: "Fire alarm scope references NFPA 72 but does not specify edition year.", severity: "info", source: "Proposal", cta: "Fix" },
                { text: "Emergency generator tie-in scope is included — good coverage for this project type.", severity: "info", source: "Proposal", },
              ]},
              { name: "Scope Clarity", score: 78, explanation: "Trade breakdown is clear but exclusions could be more specific.", findings: [
                { text: "No explicit exclusion list found — GCs may assume items are included that aren't.", severity: "warning", source: "Proposal", cta: "Fix" },
                { text: "Low voltage/data scope bundled at $345K — consider noting if it includes fiber vs. copper.", severity: "info", source: "Trade Breakdown", cta: "Ask AI" },
              ]},
              { name: "Consistency", score: 88, explanation: "Proposal language matches Austin, TX project details consistently.", findings: [
                { text: "Project references and location are consistent throughout.", severity: "info", source: "Proposal", },
              ]},
              { name: "Submission Clarity", score: 80, explanation: "Subject line and message clearly identify the bid.", findings: [
                { text: "Subject line includes project number and trade — should stand out in a GC inbox.", severity: "info", source: "Message", },
                { text: "Message body could mention key inclusions (fire alarm, generator) to help GC route to the right estimator.", severity: "info", source: "Message", cta: "Fix" },
              ]},
            ],
            promptChips: [
              "What exclusions should I add?",
              "Should I break out generator work separately?",
              "Is my fire alarm scope specific enough?",
              "How should I clarify low voltage vs. data?",
            ],
          } : {
            score: 74,
            status: "needs-review",
            confidence: "high",
            summary: "1 likely gap, 2 clarity issues to address before submission",
            dimensions: [
              { name: "Coverage", score: 70, explanation: "Core electrical scope is covered but prevailing wage documentation may be missing.", findings: [
                { text: "Prevailing wage project but no wage rate acknowledgment found in proposal.", severity: "warning", source: "Proposal", cta: "Fix" },
                { text: "Audio/visual wiring scope appears included — good for this project type.", severity: "info", source: "Proposal", },
              ]},
              { name: "Scope Clarity", score: 72, explanation: "Trade breakdown is present but exclusions section needs work.", findings: [
                { text: "No exclusions section found — GC may assume demolition, trenching, or patching is included.", severity: "warning", source: "Proposal", cta: "Fix" },
                { text: "Electronic access control is listed as a trade but not broken out in pricing.", severity: "info", source: "Trade Breakdown", cta: "Ask AI" },
              ]},
              { name: "Consistency", score: 80, explanation: "Proposal references match Minneapolis project details.", findings: [
                { text: "Project name and location references are consistent.", severity: "info", source: "Proposal", },
              ]},
              { name: "Submission Clarity", score: 76, explanation: "Message is functional but could be more descriptive.", findings: [
                { text: "Subject line is adequate but doesn't mention the specific trades being bid.", severity: "info", source: "Message", cta: "Fix" },
                { text: "Message body is generic — consider summarizing key scope inclusions for the GC.", severity: "info", source: "Message", cta: "Fix" },
              ]},
            ],
            promptChips: [
              "What prevailing wage docs do I need?",
              "What exclusions should I list?",
              "Should I break out access control pricing?",
              "How can I improve my subject line?",
            ],
          };
          setBidScore(mockScore);
          setIsImprovingBid(false);
        }, 1500);
      }
    }, 2500);
  }, [projectId, gcName, projectName]);

  const isLoading = step === "review" && isAnalyzing;

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={modalContentRef}
        className="!max-w-[min(900px,calc(100vw-2rem))] w-full h-[80vh] overflow-x-hidden overflow-y-auto p-0"
        showCloseButton={!showEnvelopeAnimation}
        style={showEnvelopeAnimation ? { opacity: 0, pointerEvents: "none" } : undefined}
      >
        <AnimatePresence mode="wait">
          {/* ===== UPLOAD STEP ===== */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6 overflow-x-hidden"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Submit Bid
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                {/* Drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-[8px] p-8 py-12 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? "border-success-border bg-success-surface"
                      : "border-border bg-card hover:border-muted-foreground"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">
                    Drop your bid files here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    or click to browse from your computer
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse Files
                  </Button>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV
                  </p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-3 rounded-[8px] bg-muted"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">
                            {f.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="mt-4 p-3 rounded-[8px] bg-destructive-surface border border-destructive-border">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Analyze button */}
                <Button
                  className="w-full mt-6"
                  size="lg"
                  disabled={files.length === 0}
                  onClick={handleAnalyze}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Documents with AI
                </Button>
                {/* DEV ONLY - remove later */}
                <Button
                  className="w-full mt-2"
                  size="sm"
                  variant="outline"
                  onClick={devSkipToReview}
                >
                  [DEV] Skip to Review
                </Button>
              </div>
            </motion.div>
          )}

          {/* ===== PROCESSING STEP ===== */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="p-6 flex flex-col items-center justify-center min-h-[300px]"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-ai-surface flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-ai-foreground" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-ai-border"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </motion.div>

              <h3 className="mt-6 text-lg font-semibold text-foreground">
                AI is preparing your bid
              </h3>

              <AnimatePresence mode="wait">
                <motion.p
                  key={processingMsgIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  {processingMessages[processingMsgIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="flex gap-1 mt-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-ai-border"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== REVIEW STEP ===== */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col min-h-[80vh]"
            >
              {/* Fixed header */}
              <div className="px-6 pt-6 pb-4 shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-xl">Review & Submit</DialogTitle>
                </DialogHeader>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 px-6 pb-4">
                <div className="space-y-5">
                  {/* To field */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="to" className="text-sm font-medium">
                        To
                      </Label>
                      <div className="flex items-center gap-2">
                        {!showCc && (
                          <button
                            onClick={() => setShowCc(true)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            CC
                          </button>
                        )}
                        {!showBcc && (
                          <button
                            onClick={() => setShowBcc(true)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            BCC
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-[8px] border border-input bg-muted/30 px-3 py-2 min-h-[42px]">
                      {/* Primary recipient pill */}
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-surface text-primary text-sm px-2.5 py-1">
                        {gcEmail}
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {}}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                      {/* Additional recipient pills */}
                      {additionalTo.map((email, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-md bg-success-surface text-primary text-sm px-2.5 py-1"
                        >
                          {email}
                          <button
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setAdditionalTo(additionalTo.filter((_, idx) => idx !== i))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {/* Inline input for new recipient */}
                      {showNewToInput ? (
                        <input
                          autoFocus
                          type="email"
                          value={newToInput}
                          onChange={(e) => setNewToInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newToInput.trim()) {
                              setAdditionalTo([...additionalTo, newToInput.trim()]);
                              setNewToInput("");
                              setShowNewToInput(false);
                            }
                            if (e.key === "Escape") {
                              setNewToInput("");
                              setShowNewToInput(false);
                            }
                          }}
                          onBlur={() => {
                            if (newToInput.trim()) {
                              setAdditionalTo([...additionalTo, newToInput.trim()]);
                            }
                            setNewToInput("");
                            setShowNewToInput(false);
                          }}
                          placeholder="Add email..."
                          className="bg-transparent outline-none text-sm min-w-[120px] flex-1"
                        />
                      ) : (
                        <button
                          onClick={() => setShowNewToInput(true)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CC field */}
                  {showCc && (
                    <div>
                      <Label htmlFor="cc" className="text-sm font-medium">
                        CC
                      </Label>
                      <Input
                        id="cc"
                        value={ccValue}
                        onChange={(e) => setCcValue(e.target.value)}
                        placeholder="Add CC recipients..."
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  {/* BCC field */}
                  {showBcc && (
                    <div>
                      <Label htmlFor="bcc" className="text-sm font-medium">
                        BCC
                      </Label>
                      <Input
                        id="bcc"
                        value={bccValue}
                        onChange={(e) => setBccValue(e.target.value)}
                        placeholder="Add BCC recipients..."
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  {/* Bid Amount */}
                  <div>
                    <Label htmlFor="bidAmount" className="text-sm font-medium">
                      Bid Amount
                    </Label>
                    {isLoading ? (
                      <Skeleton className="mt-1.5 h-11 w-full" />
                    ) : (
                      <Input
                        id="bidAmount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="$0.00"
                        className="mt-1.5 text-lg font-semibold"
                      />
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <Label htmlFor="subject" className="text-sm font-medium">
                      Subject
                    </Label>
                    {isLoading ? (
                      <Skeleton className="mt-1.5 h-10 w-full" />
                    ) : (
                      <Input
                        id="subject"
                        value={`${projectName} - Bid Submission`}
                        readOnly
                        className="mt-1.5 bg-muted/30"
                      />
                    )}
                  </div>

                  {/* Message Body */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message" className="text-sm font-medium">
                        Message
                      </Label>
                      {!isLoading && (
                        <button
                          onClick={() => setShowTemplateEditor(!showTemplateEditor)}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          {showTemplateEditor ? "Done editing" : "Customize template"}
                        </button>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="mt-1.5 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : showTemplateEditor ? (
                      <div className="mt-1.5 space-y-3">
                        {/* Variable chips */}
                        <div>
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                            Insert variable
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {[
                              { label: "GC Name", value: "{{GC Name}}" },
                              { label: "Project Name", value: "{{Project Name}}" },
                              { label: "Bid Amount", value: "{{Bid Amount}}" },
                              { label: "Your Company", value: "{{Your Company}}" },
                              { label: "Due Date", value: "{{Due Date}}" },
                              { label: "Your Name", value: "{{Your Name}}" },
                            ].map((v) => (
                              <button
                                key={v.label}
                                onClick={() => {
                                  const ta = templateTextareaRef.current;
                                  if (ta) {
                                    const start = ta.selectionStart;
                                    const end = ta.selectionEnd;
                                    const before = messageTemplate.slice(0, start);
                                    const after = messageTemplate.slice(end);
                                    const newVal = before + v.value + after;
                                    setMessageTemplate(newVal);
                                    // Apply template to message
                                    setMessageBody(applyTemplate(newVal));
                                    setTimeout(() => {
                                      ta.focus();
                                      ta.selectionStart = ta.selectionEnd = start + v.value.length;
                                    }, 0);
                                  } else {
                                    setMessageTemplate(messageTemplate + v.value);
                                    setMessageBody(applyTemplate(messageTemplate + v.value));
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-info-surface text-info-foreground border border-info-border hover:bg-info-surface/80 transition-colors"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Template editor */}
                        <Textarea
                          ref={templateTextareaRef}
                          value={messageTemplate}
                          onChange={(e) => {
                            setMessageTemplate(e.target.value);
                            setMessageBody(applyTemplate(e.target.value));
                          }}
                          rows={8}
                          className="font-mono text-sm"
                          placeholder="Write your template using {{Variable Name}} syntax..."
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Variables like {"{{GC Name}}"} will be replaced with actual values in the message above.
                        </p>
                      </div>
                    ) : (
                      <Textarea
                        id="message"
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        rows={6}
                        className="mt-1.5"
                      />
                    )}
                  </div>

                  {/* Documents & Requirements — combined section */}
                  <div className="rounded-[8px] border border-border">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-5 w-28 rounded-full" />
                      </div>
                      <div className="border-t border-border pt-3 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-36 rounded-full" />
                        </div>
                      </div>
                      <div className="border-t border-border pt-3 space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    </div>
                  ) : (
                  <>

                    {/* ===== Bid Readiness Check (feature-flagged) ===== */}
                    {(isReadinessChecking || readinessCheck !== null) && (
                      <div className="border-b border-border">
                        {isReadinessChecking ? (
                          <div className="px-4 py-4 bg-purple-50/30 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-purple-200 animate-pulse shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 rounded bg-purple-200 animate-pulse w-44" />
                                <div className="h-3 rounded bg-purple-100 animate-pulse w-56" />
                              </div>
                              <div className="h-7 w-28 rounded-full bg-purple-100 animate-pulse shrink-0" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-10 rounded-lg bg-purple-100 animate-pulse" />
                              <div className="h-10 rounded-lg bg-purple-100 animate-pulse" />
                              <div className="h-10 rounded-lg bg-purple-100 animate-pulse" />
                            </div>
                          </div>
                        ) : readinessCheck !== null ? (
                          <div className="bg-purple-50/30">
                            {/* Header row */}
                            <div className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-foreground">Bid Readiness Check</h3>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  readinessCheck.result === "looks-good"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {readinessCheck.result === "looks-good" ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5" /> Looks Good</>
                                  ) : (
                                    <><ShieldAlert className="h-3.5 w-3.5" /> Needs Review</>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Accordion: scope check breakdown */}
                            <div className="px-4 pb-1">
                              <button
                                onClick={() => setReadinessExpanded(!readinessExpanded)}
                                className="w-full flex items-center justify-between py-2"
                              >
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Scope Alignment ({readinessCheck.items.length} trade{readinessCheck.items.length !== 1 ? "s" : ""} checked)
                                </span>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${readinessExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>

                            <AnimatePresence>
                              {readinessExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-3 space-y-2">
                                    {readinessCheck.items.map((item, i) => (
                                      <div
                                        key={i}
                                        className={`rounded-lg border px-3 py-2.5 ${
                                          item.status === "aligned"
                                            ? "border-emerald-200 bg-emerald-50/50"
                                            : item.status === "misaligned"
                                            ? "border-red-200 bg-red-50/50"
                                            : "border-amber-200 bg-amber-50/50"
                                        }`}
                                      >
                                        <div className="flex items-start gap-2.5">
                                          <span className="shrink-0 mt-0.5">
                                            {item.status === "aligned" ? (
                                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : item.status === "misaligned" ? (
                                              <XCircle className="h-4 w-4 text-red-600" />
                                            ) : (
                                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            )}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-semibold text-foreground">{item.trade}</span>
                                              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                item.status === "aligned"
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : item.status === "misaligned"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }`}>
                                                {item.status === "aligned" ? "Aligned" : item.status === "misaligned" ? "Misaligned" : "Missing"}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                                            {item.fix && (
                                              <div className="mt-1.5 rounded-md bg-white/80 border border-red-100 px-2.5 py-2">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                  <Lightbulb className="h-3 w-3 text-red-500" />
                                                  <span className="text-[10px] font-semibold text-red-700">How to fix</span>
                                                </div>
                                                <p className="text-[11px] text-red-700 leading-snug">{item.fix}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Writing quality summary */}
                            {readinessCheck.writingSummary && (
                              <div className="px-4 pb-3">
                                <div className="flex items-start gap-2 rounded-lg bg-purple-100/50 border border-purple-200 px-3 py-2.5">
                                  <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-purple-700 leading-snug">{readinessCheck.writingSummary}</p>
                                </div>
                              </div>
                            )}

                            {/* Prompt chips */}
                            {readinessCheck.promptChips.length > 0 && (
                              <div className="px-4 pb-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {readinessCheck.promptChips.map((chip, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setFollowUpInput(chip);
                                        setTimeout(() => followUpInputRef.current?.focus(), 50);
                                      }}
                                      className="text-[10px] px-2 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 transition-colors"
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Follow-up response */}
                            {followUpResponse !== null && (
                              <div className="px-4 pb-2">
                                <div className="pt-2 border-t border-purple-200">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                    <span className="text-xs font-semibold text-purple-700">Follow-up</span>
                                  </div>
                                  <div className="space-y-1">
                                    {followUpResponse.map((line, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-purple-700">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                                        <span>{line}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Follow-up loading skeleton */}
                            {isFollowingUp && (
                              <div className="px-4 pb-3">
                                <div className="pt-2 border-t border-purple-200 space-y-2 animate-pulse">
                                  <div className="h-3 rounded bg-purple-200 w-3/4" />
                                  <div className="h-3 rounded bg-purple-200 w-1/2" />
                                </div>
                              </div>
                            )}

                            {/* Follow-up input */}
                            {!isFollowingUp && (
                              <div className="px-4 pb-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={followUpInputRef}
                                    value={followUpInput}
                                    onChange={(e) => setFollowUpInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleFollowUp(); }}
                                    placeholder={readinessCheck.promptChips[placeholderIndex % readinessCheck.promptChips.length] || "Ask about your bid..."}
                                    className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-purple-300 bg-white text-purple-900 placeholder-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors"
                                  />
                                  <button
                                    onClick={handleFollowUp}
                                    disabled={!followUpInput.trim()}
                                    className="flex items-center justify-center h-7 w-7 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-colors"
                                  >
                                    <Send className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* ===== Bid Readiness Score (original — when flag is off) ===== */}
                    {(isImprovingBid || bidScore !== null) && (
                      <div className="border-b border-border">
                        {isImprovingBid ? (
                          <div className="px-4 py-3 bg-purple-50/30 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg bg-purple-200 animate-pulse shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3.5 rounded bg-purple-200 animate-pulse w-32" />
                                <div className="h-3 rounded bg-purple-100 animate-pulse w-48" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="h-6 w-28 rounded-full bg-purple-100 animate-pulse" />
                              <div className="h-6 w-24 rounded-full bg-purple-100 animate-pulse" />
                              <div className="h-6 w-32 rounded-full bg-purple-100 animate-pulse" />
                            </div>
                          </div>
                        ) : bidScore !== null ? (
                          <div className="bg-purple-50/30">
                            {/* Score card */}
                            <div className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                {/* Score circle */}
                                <div className={`relative h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                                  bidScore.status === "ready" ? "bg-emerald-100 text-emerald-700" :
                                  bidScore.status === "needs-review" ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  <span className="text-lg font-bold leading-none">{bidScore.score}</span>
                                </div>
                                {/* Score details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-semibold text-foreground">Bid Readiness</span>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      bidScore.status === "ready" ? "bg-emerald-100 text-emerald-700" :
                                      bidScore.status === "needs-review" ? "bg-amber-100 text-amber-700" :
                                      "bg-red-100 text-red-700"
                                    }`}>
                                      {bidScore.status === "ready" ? "Ready" : bidScore.status === "needs-review" ? "Needs Review" : "High Risk"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Confidence: {bidScore.confidence === "high" ? "High" : bidScore.confidence === "medium" ? "Medium" : "Low"}
                                    </span>
                                    <div className="relative group">
                                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-2 rounded-md bg-foreground text-background text-[10px] leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                        This score reflects document coverage, scope clarity, and bid consistency. It does not assess pricing or perform takeoff.
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-snug">{bidScore.summary}</p>
                                </div>
                                {/* Breakdown toggle */}
                                <button
                                  onClick={() => setScoreBreakdownOpen(!scoreBreakdownOpen)}
                                  className="flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:text-purple-700 transition-colors shrink-0 mt-0.5"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                  Details
                                  <ChevronDown className={`h-3 w-3 transition-transform ${scoreBreakdownOpen ? "rotate-180" : ""}`} />
                                </button>
                              </div>

                              {/* Prompt chips */}
                              {bidScore.promptChips.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {bidScore.promptChips.map((chip, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setFollowUpInput(chip);
                                        setTimeout(() => followUpInputRef.current?.focus(), 50);
                                      }}
                                      className="text-[10px] px-2 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 transition-colors"
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Score breakdown — expandable */}
                            <AnimatePresence>
                              {scoreBreakdownOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-3 space-y-3">
                                    {bidScore.dimensions.map((dim, di) => (
                                      <div key={di} className="border border-purple-100 rounded-lg overflow-hidden">
                                        {/* Dimension header */}
                                        <div className="flex items-center justify-between px-3 py-2 bg-white/60">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-foreground">{dim.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 rounded-full bg-purple-100 overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all ${
                                                  dim.score >= 80 ? "bg-emerald-500" :
                                                  dim.score >= 50 ? "bg-amber-500" :
                                                  "bg-red-500"
                                                }`}
                                                style={{ width: `${dim.score}%` }}
                                              />
                                            </div>
                                            <span className={`text-xs font-bold min-w-[2rem] text-right ${
                                              dim.score >= 80 ? "text-emerald-600" :
                                              dim.score >= 50 ? "text-amber-600" :
                                              "text-red-600"
                                            }`}>{dim.score}</span>
                                          </div>
                                        </div>
                                        {/* Dimension explanation + findings */}
                                        <div className="px-3 pb-2 space-y-1.5">
                                          <p className="text-[11px] text-muted-foreground">{dim.explanation}</p>
                                          {dim.findings.map((f, fi) => (
                                            <div key={fi} className={`flex items-start gap-2 text-[11px] px-2 py-1.5 rounded ${
                                              f.severity === "risk" ? "bg-red-50 text-red-700" :
                                              f.severity === "warning" ? "bg-amber-50 text-amber-700" :
                                              "bg-slate-50 text-slate-600"
                                            }`}>
                                              <span className="shrink-0 mt-0.5">
                                                {f.severity === "risk" ? <TriangleAlert className="h-3 w-3" /> :
                                                 f.severity === "warning" ? <AlertTriangle className="h-3 w-3" /> :
                                                 <Info className="h-3 w-3" />}
                                              </span>
                                              <div className="flex-1 min-w-0">
                                                <span>{f.text}</span>
                                                <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wider opacity-60">{f.source}</span>
                                              </div>
                                              {f.cta && (
                                                <button
                                                  onClick={() => {
                                                    setFollowUpInput(f.text);
                                                    setTimeout(() => followUpInputRef.current?.focus(), 50);
                                                  }}
                                                  className="shrink-0 text-[10px] font-medium text-purple-600 hover:text-purple-700"
                                                >
                                                  {f.cta}
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Follow-up response */}
                            {followUpResponse !== null && (
                              <div className="px-4 pb-2">
                                <div className="pt-2 border-t border-purple-200">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                    <span className="text-xs font-semibold text-purple-700">Follow-up</span>
                                  </div>
                                  <div className="space-y-1">
                                    {followUpResponse.map((line, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-purple-700">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                                        <span>{line}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Follow-up loading skeleton */}
                            {isFollowingUp && (
                              <div className="px-4 pb-3">
                                <div className="pt-2 border-t border-purple-200 space-y-2 animate-pulse">
                                  <div className="h-3 rounded bg-purple-200 w-3/4" />
                                  <div className="h-3 rounded bg-purple-200 w-1/2" />
                                </div>
                              </div>
                            )}

                            {/* Follow-up input — always visible */}
                            {!isFollowingUp && (
                              <div className="px-4 pb-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={followUpInputRef}
                                    value={followUpInput}
                                    onChange={(e) => setFollowUpInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleFollowUp(); }}
                                    placeholder={followUpPlaceholders[placeholderIndex % followUpPlaceholders.length]}
                                    className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-purple-300 bg-white text-purple-900 placeholder-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors"
                                  />
                                  <button
                                    onClick={handleFollowUp}
                                    disabled={!followUpInput.trim()}
                                    className="flex items-center justify-center h-7 w-7 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-colors"
                                  >
                                    <Send className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Requirements badge — shown in attached files header when unmet */}
                    {(() => {
                      const allMet = analysisResult!.checklist.every((c) => c.status === "found");
                      const unmetCount = analysisResult!.checklist.filter((c) => c.status !== "found").length;
                      if (!allMet) {
                        return (
                          <div className="px-4 py-2 border-b border-border bg-amber-50/50">
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {unmetCount} requirement{unmetCount > 1 ? "s" : ""} need{unmetCount === 1 ? "s" : ""} action
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Attached files */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Attached Files
                        </span>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Upload className="h-3 w-3" />
                          Add files
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {files.map((f) => (
                          <div
                            key={f.id}
                            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm transition-colors hover:bg-destructive-surface hover:pr-8"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground group-hover:text-destructive-text shrink-0" />
                            <span className="truncate max-w-[150px] text-foreground group-hover:text-destructive-text">{f.name}</span>
                            <button
                              onClick={() => setFiles(files.filter((file) => file.id !== f.id))}
                              className="absolute right-2 hidden group-hover:flex items-center justify-center text-destructive-text hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Requirements checklist */}
                    <div className="px-4 py-3">
                      {(() => {
                        const allMet = analysisResult!.checklist.every((c) => c.status === "found");
                        return (
                          <>
                            <button
                              onClick={() => setRequirementsExpanded(!requirementsExpanded)}
                              className="w-full flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Special Instructions
                                </span>
                                {allMet && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />
                                )}
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform ${
                                  requirementsExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {requirementsExpanded && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  AI verified your documents against {gcName}&apos;s requirements
                                </p>
                                {analysisResult!.checklist.map((item) => {
                                  const config = statusConfig[item.status];
                                  const Icon = config.icon;
                                  const help = requirementHelp[item.id];
                                  const isUnmet = item.status === "needs-action" || item.status === "missing";
                                  const isHelpOpen = helpExpandedId === item.id;
                                  return (
                                    <div key={item.id}>
                                      <div className="flex items-start gap-3 p-3 rounded-[8px] bg-muted">
                                        <Icon
                                          className={`h-5 w-5 shrink-0 mt-0.5 ${config.color}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">
                                              {item.label}
                                            </span>
                                            <Badge variant={config.badgeVariant}>
                                              {config.label}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {item.detail}
                                          </p>
                                        </div>
                                        {isUnmet && help && (
                                          <button
                                            onClick={() =>
                                              setHelpExpandedId(isHelpOpen ? null : item.id)
                                            }
                                            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                              isHelpOpen
                                                ? "bg-warning-surface text-warning-foreground"
                                                : "bg-warning-surface/60 text-warning-foreground hover:bg-warning-surface"
                                            }`}
                                          >
                                            <Lightbulb className="h-3 w-3" />
                                            Help
                                          </button>
                                        )}
                                      </div>
                                      {/* Expandable help guidance */}
                                      {isHelpOpen && help && (
                                        <div className="mt-1 ml-8 rounded-[8px] border border-warning-border bg-warning-surface/30 p-4">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Lightbulb className="h-4 w-4 text-warning-foreground" />
                                            <span className="text-sm font-semibold text-foreground">
                                              {help.title}
                                            </span>
                                          </div>
                                          <div className="space-y-2.5">
                                            {help.steps.map((s, i) => (
                                              <div key={i} className="flex items-start gap-2.5">
                                                <span className="h-5 w-5 rounded-full bg-warning-surface flex items-center justify-center shrink-0 text-[11px] font-bold text-warning-foreground">
                                                  {i + 1}
                                                </span>
                                                <span className="text-sm text-foreground leading-snug">
                                                  {s}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="mt-3 rounded-md bg-warning-surface/60 p-2.5 flex items-start gap-2">
                                            <ArrowRight className="h-3.5 w-3.5 text-warning-foreground shrink-0 mt-0.5" />
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                              {help.tip}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                  )}
                  </div>

                  {/* Trade Breakdown */}
                  {isLoading ? (
                    <div>
                      <Label className="text-sm font-medium">Trade Breakdown</Label>
                      <div className="mt-1.5 rounded-[8px] border border-border">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className={`flex justify-between p-3 ${i > 0 ? "border-t border-border" : ""}`}>
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {analysisResult && analysisResult.extractedData.tradeBreakdown.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">
                        Trade Breakdown
                      </Label>
                      <div className="mt-1.5 rounded-[8px] border border-border">
                        {analysisResult.extractedData.tradeBreakdown.map(
                          (item, i) => (
                            <div
                              key={i}
                              className={`flex justify-between p-3 text-sm ${
                                i > 0 ? "border-t border-border" : ""
                              }`}
                            >
                              <span className="text-foreground">{item.trade}</span>
                              <span className="font-medium text-foreground">{item.amount}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Share toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Share with future GCs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Allow other GCs to see your bid profile
                      </p>
                    </div>
                    <Switch
                      checked={shareWithGCs}
                      onCheckedChange={setShareWithGCs}
                    />
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {!isEmailConnected ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>In-App Only</span>
                      </div>
                      <button
                        onClick={handleConnectEmail}
                        disabled={isConnectingEmail}
                        className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {isConnectingEmail ? "Connecting..." : "Connect email"}
                      </button>
                    </>
                  ) : (
                    <div className="relative group">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-surface text-primary text-sm font-medium">
                          <Mail className="h-3.5 w-3.5" />
                          Email + In-App
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Sending to GC via email and in-app
                        </span>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-foreground text-background text-xs leading-relaxed shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50">
                        GCs will receive your bid both in PlanHub and directly in their inbox as an email sent from you.
                        <div className="absolute top-full left-6 h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-foreground" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setStep("upload"); setBidScore(null); setScoreBreakdownOpen(false); setIsImprovingBid(false); setFollowUpInput(""); setIsFollowingUp(false); setFollowUpResponse(null); setIsReadinessChecking(false); setReadinessCheck(null); setReadinessExpanded(null); }}
                  >
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Bid
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== SUBMITTED STEP ===== */}
          {step === "submitted" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-6 flex flex-col items-center justify-center min-h-[300px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <div className="h-16 w-16 rounded-full bg-success-surface flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success-foreground" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-4"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  Bid Submitted Successfully
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your bid has been sent to {gcName}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {showEnvelopeAnimation && modalRect && (
        <EnvelopeAnimation
          modalRect={modalRect}
          onComplete={handleEnvelopeComplete}
        />
      )}
    </Dialog>
  );
}
