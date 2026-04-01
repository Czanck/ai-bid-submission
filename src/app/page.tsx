"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BidSubmissionModal } from "@/components/bid-submission-modal";
import { BidBoard } from "@/components/bid-board";
import { PlanHubShell } from "@/components/planhub-shell";
import { dummyProject, project2, gcList, gcList2 } from "@/data/dummy-project";
import {
  Calendar,
  Sparkles,
  Share2,
  Bookmark,
  Bell,
  FileText,
  ClipboardList,
  MapPin,
  BarChart3,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Tag,
  Send,
  Building2,
} from "lucide-react";

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">
        {value}
      </span>
    </div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "files">("overview");
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [gcExpanded, setGcExpanded] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<"project1" | "project2">("project1");
  const [activeView, setActiveView] = useState<"project" | "bidboard">("bidboard");

  const currentProject = activeProject === "project1" ? dummyProject : project2;
  const currentGcList = activeProject === "project1" ? gcList : gcList2;

  const handleNavClick = (navId: string) => {
    if (navId === "bidboard") {
      setActiveView("bidboard");
    } else if (navId === "project1" || navId === "project2") {
      setActiveView("project");
      setActiveProject(navId);
      setActiveTab("overview");
      setShowAllTrades(false);
      setGcExpanded(null);
      setModalOpen(false);
    }
  };

  const footer = (
    <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-end gap-3 shrink-0">
      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive-surface">
        <X className="h-4 w-4 mr-1.5" />
        Decline
      </Button>
      <Button variant="outline">
        <Check className="h-4 w-4 mr-1.5" />
        Intend to Bid
      </Button>
      <Button onClick={() => setModalOpen(true)}>
        <Send className="h-4 w-4 mr-1.5" />
        Submit Bid
      </Button>
    </div>
  );

  return (
    <PlanHubShell
      footer={activeView === "project" ? footer : undefined}
      onNavClick={handleNavClick}
      activeProject={activeView === "project" ? activeProject : undefined}
      activeView={activeView}
    >
      {activeView === "bidboard" ? (
        <BidBoard
          onProjectClick={(projectId) => {
            setActiveProject(projectId);
            setActiveView("project");
            setActiveTab("overview");
            setShowAllTrades(false);
            setGcExpanded(null);
          }}
        />
      ) : (
      <>
      {/* Project Header */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {currentProject.id} - {currentProject.name}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due: {currentProject.dueDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </button>
            <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
              <Bookmark className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors relative">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-[#00B894] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "files"
                ? "border-[#00B894] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Files
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" ? (
        <div className="p-6 bg-[var(--bg-surface,#F5F7F9)]">
          <div className="flex gap-6 items-start">
            {/* Left column */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* About */}
              <SectionCard
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                title="About This Project"
              >
                <p className="text-sm text-foreground leading-relaxed">
                  {currentProject.description}
                </p>
              </SectionCard>

              {/* Project Details */}
              <SectionCard
                icon={
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                }
                title="Project Details"
              >
                <div>
                  <DetailRow
                    label="Project Value"
                    value={currentProject.projectValue}
                  />
                  <DetailRow
                    label="Project Size"
                    value={currentProject.projectSize}
                  />
                  <DetailRow
                    label="Project Start Date"
                    value={currentProject.startDate}
                  />
                  <DetailRow
                    label="Project End Date"
                    value={currentProject.endDate}
                  />
                  <DetailRow
                    label="Project Status"
                    value={currentProject.status}
                  />
                  <DetailRow
                    label="Construction Type"
                    value={currentProject.constructionType}
                  />
                  <DetailRow
                    label="Project Type"
                    value={currentProject.projectType}
                  />
                  <DetailRow
                    label="Building Use"
                    value={currentProject.buildingUse}
                  />
                  <DetailRow
                    label="Sector Labor Status"
                    value={currentProject.sectorLaborStatus}
                  />
                </div>
              </SectionCard>

              {/* Trades Needed */}
              <SectionCard
                icon={<Tag className="h-4 w-4 text-muted-foreground" />}
                title="Trades Needed"
              >
                <div className="flex flex-wrap gap-2">
                  {currentProject.trades.map((trade) => (
                    <span
                      key={trade}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success-surface text-success-foreground border border-success-border"
                    >
                      <Check className="h-3 w-3" />
                      {trade}
                    </span>
                  ))}
                </div>
                {!showAllTrades && (
                  <button
                    onClick={() => setShowAllTrades(true)}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    + Show {currentProject.totalTrades - currentProject.trades.length}{" "}
                    more
                  </button>
                )}
              </SectionCard>

              {/* Market Intelligence */}
              <SectionCard
                icon={
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                }
                title="Market Intelligence"
              >
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Market data for this project area coming soon.
                </div>
              </SectionCard>
            </div>

            {/* Right column */}
            <div className="w-[380px] shrink-0 space-y-5">
              {/* Project Location */}
              <SectionCard
                icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                title="Project Location"
                action={
                  <button className="text-xs font-medium text-primary hover:underline">
                    View full map
                  </button>
                }
              >
                <p className="text-sm text-foreground mb-3">
                  {currentProject.location}
                </p>
                {/* Map placeholder */}
                <div className="w-full h-48 rounded-lg bg-accent border border-border flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minneapolis, MN
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* General Contractors */}
              <SectionCard
                icon={
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                }
                title="General Contractors"
              >
                {/* Filter */}
                <div className="mb-4">
                  <button className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors">
                    <span>All Bidding Statuses</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* GC cards */}
                <div className="space-y-3">
                  {currentGcList.map((gc) => (
                    <div
                      key={gc.name}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {gc.name}
                            </h3>
                            <span className="text-yellow-500 text-sm">🏅</span>
                          </div>
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-primary">
                              <Mail className="h-3 w-3" />
                              <span>{gc.email}</span>
                              <Send className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-primary">
                              <Phone className="h-3 w-3" />
                              <span>{gc.phone}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2.5">
                            <Badge variant="success" className="gap-1">
                              <Check className="h-2.5 w-2.5" />
                              {gc.status}
                            </Badge>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              DUE {gc.dueDate}
                            </span>
                          </div>
                          {gc.hasSpecialInstructions && (
                            <button
                              onClick={() =>
                                setGcExpanded(
                                  gcExpanded === gc.name ? null : gc.name
                                )
                              }
                              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ChevronRight
                                className={`h-3 w-3 transition-transform ${
                                  gcExpanded === gc.name ? "rotate-90" : ""
                                }`}
                              />
                              Special Instructions
                            </button>
                          )}
                          {gcExpanded === gc.name && (
                            <div className="mt-2 text-xs text-muted-foreground bg-accent rounded-md p-2.5">
                              Contact before submitting. MBE participation
                              required.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-[var(--bg-surface,#F5F7F9)]">
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No files uploaded yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Project files will appear here once uploaded.
            </p>
          </div>
        </div>
      )}

      <BidSubmissionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectName={`${currentProject.id} - ${currentProject.name}`}
        gcName={currentGcList[0].name}
        gcEmail={currentGcList[0].email}
        projectId={activeProject}
      />
      </>
      )}
    </PlanHubShell>
  );
}
