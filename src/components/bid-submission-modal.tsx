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
import type {
  ModalStep,
  UploadedFile,
  AnalyzeBidResponse,
  RequirementStatus,
} from "@/lib/types";

interface BidSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  gcName?: string;
  gcEmail?: string;
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
}: BidSubmissionModalProps) {
  const [step, setStep] = useState<ModalStep>("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeBidResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingMsgIndex, setProcessingMsgIndex] = useState(0);

  // Review form state
  const [bidAmount, setBidAmount] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [shareWithGCs, setShareWithGCs] = useState(true);

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
          setShareWithGCs(false);
          setProcessingMsgIndex(0);
          setShowEnvelopeAnimation(false);
          setModalRect(null);
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

    setStep("processing");
    setError(null);
    setProcessingMsgIndex(0);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));

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
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again."
      );
      setStep("upload");
    }
  }, [files]);

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

  // DEV-ONLY: skip to review with mock data
  const devSkipToReview = useCallback(() => {
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
        { id: "1", label: "MBE Participation (15%)", description: "MBE documentation required", status: "found" as const, detail: "Documentation included showing 16.2% MBE participation" },
        { id: "2", label: "Bid Bond", description: "Bid bond or bonding capacity letter", status: "found" as const, detail: "Bid bond document detected in uploads" },
        { id: "3", label: "Insurance Certificate", description: "$2M general liability insurance", status: "needs-action" as const, detail: "$2M liability certificate not found" },
        { id: "4", label: "Bid Deadline", description: "Bids due by 12:00 PM", status: "found" as const, detail: "Submission before 12:00 PM deadline" },
      ],
      confidence: 0.92,
    });
    setBidAmount("$1,250,000");
    setMessageBody("Dear Turner Construction,\n\nPlease find attached our bid.\n\nBest regards");
    setFiles([{ file: new File([""], "bid.pdf", { type: "application/pdf" }), id: "test-1", name: "bid-proposal.pdf", size: 245000, type: "application/pdf" }]);
    setStep("review");
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={modalContentRef}
        className="!max-w-[min(900px,calc(100vw-2rem))] w-full h-[80vh] overflow-y-auto overflow-x-hidden p-0"
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
          {step === "review" && analysisResult && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6 overflow-x-hidden"
            >
              <DialogHeader>
                <DialogTitle className="text-xl">Review & Submit</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI has analyzed your bid for{" "}
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>
                </p>
              </DialogHeader>

              <div className="mt-6 space-y-5">
                {/* Email Connection */}
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-muted">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {isEmailConnected ? (
                      <span className="text-sm text-foreground">
                        Connected as{" "}
                        <span className="font-medium">you@company.com</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Connect your email to send directly
                      </span>
                    )}
                  </div>
                  {!isEmailConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectEmail}
                      disabled={isConnectingEmail}
                    >
                      {isConnectingEmail ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect Email"
                      )}
                    </Button>
                  )}
                  {isEmailConnected && (
                    <Badge variant="success">
                      Connected
                    </Badge>
                  )}
                </div>

                {/* To field */}
                <div>
                  <Label htmlFor="to" className="text-sm font-medium">
                    To
                  </Label>
                  <Input
                    id="to"
                    value={`${gcName} <${gcEmail}>`}
                    readOnly
                    className="mt-1.5 bg-muted/30"
                  />
                </div>

                {/* Bid Amount */}
                <div>
                  <Label htmlFor="bidAmount" className="text-sm font-medium">
                    Bid Amount
                  </Label>
                  <Input
                    id="bidAmount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="$0.00"
                    className="mt-1.5 text-lg font-semibold"
                  />
                </div>

                {/* Trade Breakdown */}
                {analysisResult.extractedData.tradeBreakdown.length > 0 && (
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

                {/* Message Body */}
                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={6}
                    className="mt-1.5"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm"
                      >
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px] text-foreground">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Requirements Checklist */}
                <div>
                  <Label className="text-sm font-medium">
                    Special Instructions Check
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI verified your documents against {gcName}&apos;s
                    requirements
                  </p>
                  <div className="mt-3 space-y-2">
                    {analysisResult.checklist.map((item) => {
                      const config = statusConfig[item.status];
                      const Icon = config.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-[8px] bg-muted"
                        >
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
                        </div>
                      );
                    })}
                  </div>
                </div>

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

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("upload")}
                  >
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Bid
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
