"use client"

import { useCallback, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

interface SubmitBidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubmitBidModal({ open, onOpenChange }: SubmitBidModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [])

  const handleFiles = (files: File[]) => {
    // TODO: handle uploaded files
    console.log("Files selected:", files)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Submit Bid
          </DialogTitle>
        </DialogHeader>

        <div className="p-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-4 rounded-[8px] border-2 border-dashed
              px-6 py-12 cursor-pointer transition-colors
              ${isDragging
                ? "border-success-border bg-success-surface"
                : "border-border bg-card hover:border-muted-foreground"
              }
            `}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                Drop your bid files here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse from your computer
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              Browse Files
            </Button>

            <p className="text-sm text-muted-foreground">
              Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
