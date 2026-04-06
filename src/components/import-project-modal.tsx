"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Upload, FileText, X, Loader2, Sparkles } from "lucide-react";
import type { StoredProject, StoredProjectFile, ScanProjectResponse, UploadedFile } from "@/lib/types";
import { saveProject, saveProjectFiles } from "@/lib/project-store";
import { extractAllFiles } from "@/lib/extract-pdf-client";

interface ImportProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectImported: (project: StoredProject) => void;
}

const scanningMessages = [
  "Extracting text from documents...",
  "Analyzing project scope and specifications...",
  "Identifying trades and requirements...",
  "Building project profile...",
];

export function ImportProjectModal({ open, onOpenChange, onProjectImported }: ImportProjectModalProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const resetState = useCallback(() => {
    setFiles([]);
    setScanning(false);
    setScanError(null);
    setMessageIndex(0);
  }, []);

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/") || f.name.endsWith(".txt")
    );
    const uploaded: UploadedFile[] = accepted.map((f) => ({
      file: f,
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles((prev) => [...prev, ...uploaded]);
    setScanError(null);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setScanError(null);
    setMessageIndex(0);

    // Cycle through messages
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % scanningMessages.length);
    }, 2500);

    try {
      // Extract text from PDFs client-side — avoids sending huge binaries to the server
      const extracted = await extractAllFiles(files.map((f) => f.file));

      // Send only the extracted text as JSON (much smaller than raw PDFs)
      const res = await fetch("/api/scan-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: extracted }),
      });
      const data = await res.json();

      clearInterval(interval);

      if (!res.ok) {
        setScanError(data.error || "Failed to scan project files");
        setScanning(false);
        return;
      }

      const response = data as ScanProjectResponse;

      // Build stored project
      const storedProject: StoredProject = {
        ...response.project,
        boardColumn: "saved",
        createdAt: Date.now(),
      };

      // Persist to IndexedDB
      await saveProject(storedProject);
      await saveProjectFiles(
        response.files.map((f: StoredProjectFile) => ({
          projectId: storedProject.id,
          fileName: f.fileName,
          fileType: f.fileType,
          extractedText: f.extractedText,
        }))
      );

      // Navigate directly to the new project — no intermediary step
      setScanning(false);
      onProjectImported(storedProject);
      handleOpenChange(false);
    } catch (err) {
      clearInterval(interval);
      setScanError(err instanceof Error ? err.message : "An error occurred");
      setScanning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!scanning}>
        <DialogHeader>
          <DialogTitle>Import Project</DialogTitle>
          <DialogDescription>
            Upload project files (plans, specs, scope of work) and AI will create your project.
          </DialogDescription>
        </DialogHeader>

        {scanning ? (
          /* Scanning state */
          <div className="py-8 text-center space-y-4">
            <div className="relative mx-auto w-12 h-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Scanning project files...</p>
              <p className="text-xs text-muted-foreground mt-1 transition-opacity">
                {scanningMessages[messageIndex]}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Analyzing {files.length} file{files.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          /* Upload state */
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-file-input")?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground mt-2">
                Drop project files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, images, or text files (plans, specs, scope of work)
              </p>
              <input
                id="import-file-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {scanError && (
              <div className="px-3 py-2 bg-destructive-surface border border-destructive-border rounded-md text-sm text-destructive-text">
                {scanError}
              </div>
            )}

            {/* Scan button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleScan}
                disabled={files.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Scan with AI
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
