"use client";

import { useState } from "react";
import { Download, ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut, Hand, Columns2, RotateCcw, RotateCw, FileText } from "lucide-react";

interface FileViewerTabProps {
  fileName: string;
  highlightText: string;
}

const DUMMY_PAGES = ["Page 1", "Page 2", "Page 3", "Page 4", "Page 5", "Page 6", "Page 7", "Page 8"];

export function FileViewerTab({ fileName, highlightText }: FileViewerTabProps) {
  const [activePage, setActivePage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{fileName}</span>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground mr-1">Page</span>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs text-foreground font-medium px-1">[1] 25</span>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground ml-1">1 / 8</span>

        <div className="w-px h-4 bg-border mx-2" />

        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <Columns2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <Hand className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <Columns2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="w-px h-4 bg-border mx-2" />

        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent transition-colors">
          <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar - page list */}
        {sidebarOpen && (
          <div className="w-[200px] shrink-0 border-r border-border flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">File Details</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border bg-background">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Search...</span>
              </div>
            </div>

            {/* Page list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {DUMMY_PAGES.map((page, i) => (
                <button
                  key={i}
                  onClick={() => setActivePage(i)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-md transition-colors ${
                    activePage === i
                      ? "bg-[#00B894] text-white font-medium"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Drawing area */}
        <div className="flex-1 bg-[#f0f0f0] p-6 overflow-auto flex items-start justify-center">
          <div className="bg-white border border-border shadow-sm rounded-sm w-full max-w-[800px] min-h-[600px] p-8 relative">
            {/* Dummy spec content */}
            <div className="space-y-6">
              {/* Title block */}
              <div className="border-b-2 border-foreground pb-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">ELECTRICAL SPECIFICATIONS — SECTION 26 05 00</h3>
                <p className="text-xs text-muted-foreground mt-1">General Electrical Requirements — Burlington Store #01689</p>
              </div>

              {/* Spec content with highlighted section */}
              <div className="space-y-4 text-xs leading-relaxed text-foreground/80">
                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">1.01 SCOPE OF WORK</p>
                  <p>The Electrical Contractor (EC) shall furnish all labor, materials, equipment, and services required for a complete and operating electrical system as shown on drawings and specified herein.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">1.02 RELATED SECTIONS</p>
                  <p>Section 26 05 19 — Low-Voltage Electrical Power Conductors and Cables</p>
                  <p>Section 26 05 33 — Raceway and Boxes for Electrical Systems</p>
                  <p>Section 26 24 16 — Panelboards</p>
                  <p>Section 26 51 00 — Interior Lighting</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">2.01 LIGHTING CONTROLS</p>
                  <p className="mb-2">All interior lighting shall be controlled via the Building Automation System (BAS). The Lighting Control Panel (LCP1) shall be furnished by the BAS vendor and installed by the EC.</p>

                  {/* HIGHLIGHTED SECTION */}
                  <div className="relative">
                    <div className="absolute -inset-x-2 -inset-y-1 bg-yellow-200/60 rounded pointer-events-none" />
                    <p className="relative font-medium text-foreground">
                      {highlightText || "Dimming protocol shall be DALI for all open office zones per Drawing E-4, Note 7. Standard 0-10V dimming is permitted only in back-of-house and storage areas. All dimming signal wires shall be daisy-chained across fixtures in each zone."}
                    </p>
                  </div>

                  <p className="mt-2">Dedicated neutral conductors shall be provided on all dimming circuits. Shared neutrals are prohibited unless written approval is obtained from the engineer of record.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">2.02 BRANCH CIRCUITS</p>
                  <p>All 277V interior light fixtures shall be wired with #10 AWG branch circuits. All exterior wall-mounted fixtures shall be wired with #8 AWG branch circuits. Multi-wire branch circuits are prohibited unless written permission is obtained.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">2.03 CONDUIT REQUIREMENTS</p>
                  <p>Conduit below slab shall be rigid steel, IMC, PVC, or HDPE with minimum 3/4&quot; diameter. EMT is permitted above accessible ceilings only. Flexible metal conduit limited to 6&apos; maximum length for equipment connections.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase mb-1">2.04 SURGE PROTECTION</p>
                  <p>Surge Protection Device (SPD) shall be UL 1449 Fourth Edition, Type 1, with minimum 20kA nominal discharge current rating. SPD shall be installed at main distribution panel.</p>
                </div>
              </div>

              {/* Drawing reference box */}
              <div className="border border-foreground/20 p-3 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Drawing Reference</span>
                  <span className="text-xs font-mono font-bold text-foreground">E-4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
