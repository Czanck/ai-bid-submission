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
  { icon: typeof CheckCircle2; color: string; badgeVariant: string; label: string }
> = {
  found: {
    icon: CheckCircle2,
    color: "text-green-600",
    badgeVariant: "bg-green-100 text-green-800 border-green-200",
    label: "Found",
  },
  missing: {
    icon: XCircle,
    color: "text-red-500",
    badgeVariant: "bg-red-100 text-red-800 border-red-200",
    label: "Missing",
  },
  "needs-action": {
    icon: AlertTriangle,
    color: "text-amber-500",
    badgeVariant: "bg-amber-100 text-amber-800 border-amber-200",
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
  const [shareWithGCs, setShareWithGCs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        }, 300);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Analysis failed (${response.status})`);
      }

      const result: AnalyzeBidResponse = await response.json();
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
    setStep("submitted");
    setTimeout(() => {
      handleOpenChange(false);
    }, 2500);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {/* ===== UPLOAD STEP ===== */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Submit Bid
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                {/* Drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 py-12 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
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
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gray-100">
                    <Upload className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-gray-800">
                    Drop your bid files here
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    or click to browse from your computer
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-lg bg-emerald-400 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse Files
                  </button>
                  <p className="mt-4 text-sm text-gray-400">
                    Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV
                  </p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
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
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
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
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/30"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </motion.div>

              <h3 className="mt-6 text-lg font-semibold">
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
                    className="h-2 w-2 rounded-full bg-primary"
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
              className="p-6"
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
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {isEmailConnected ? (
                      <span className="text-sm">
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
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 border-green-200"
                    >
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
                    <div className="mt-1.5 rounded-lg border">
                      {analysisResult.extractedData.tradeBreakdown.map(
                        (item, i) => (
                          <div
                            key={i}
                            className={`flex justify-between p-3 text-sm ${
                              i > 0 ? "border-t" : ""
                            }`}
                          >
                            <span>{item.trade}</span>
                            <span className="font-medium">{item.amount}</span>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-sm"
                      >
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{f.name}</span>
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
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                        >
                          <Icon
                            className={`h-5 w-5 shrink-0 mt-0.5 ${config.color}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {item.label}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.badgeVariant}`}
                              >
                                {config.label}
                              </span>
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
                    <p className="text-sm font-medium">
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
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-4"
              >
                <h3 className="text-lg font-semibold">
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
    </Dialog>
  );
}
