"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BidSubmissionModal } from "@/components/bid-submission-modal";
import { FileText, Building2, Calendar, MapPin } from "lucide-react";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                PH
              </span>
            </div>
            <span className="font-semibold text-lg">PlanHub</span>
          </div>
          <span className="text-sm text-muted-foreground">
            AI Bid Submission Demo
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full">
          {/* Project Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Invitation to Bid
                </p>
                <h1 className="mt-2 text-xl font-semibold">
                  City Center Office Complex - Phase 2
                </h1>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Turner Construction</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Atlanta, GA</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: April 15, 2026</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>CSI Division 26</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t">
              <h2 className="text-sm font-medium mb-2">
                Special Instructions
              </h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>- 15% MBE participation requirement with documentation</li>
                <li>
                  - Must call GC before submitting at (888) 888-8888
                </li>
                <li>- Bid bond or bonding capacity letter required</li>
                <li>- Bids due by 12:00 PM on due date</li>
                <li>
                  - $2M general liability insurance with certificate required
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              className="w-full mt-6"
              onClick={() => setModalOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Submit Bid
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            This is a prototype demo. Upload any bid PDF to see AI-powered
            document analysis in action.
          </p>
        </div>
      </main>

      <BidSubmissionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectName="City Center Office Complex - Phase 2"
        gcName="Turner Construction"
        gcEmail="bids@turnerconstruction.com"
      />
    </div>
  );
}
