"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BidSubmissionModal } from "@/components/bid-submission-modal";
import { BidBoard } from "@/components/bid-board";
import { AskAiPanel } from "@/components/ask-ai-panel";
import { FileViewerTab } from "@/components/file-viewer-tab";
import { ImportProjectModal } from "@/components/import-project-modal";
import { PlanHubShell } from "@/components/planhub-shell";
import { PLANHUB_PROJECT_IDS, PLANHUB_ID_SET } from "@/data/dummy-project";
import { getAllProjects } from "@/lib/project-store";
import type { StoredProject } from "@/lib/types";
import { getFlag } from "@/lib/feature-flags";
import { getSession, clearSession, getInitials, getDisplayName } from "@/lib/auth";
import type { PlanhubSession } from "@/lib/auth";
import { getLeadDetails, mapLeadToDisplay, mapLeadToGcList } from "@/lib/planhub-api";
import type { ProjectDisplay, GcDisplay } from "@/lib/planhub-api";
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
  CheckCircle2,
  Package,
  Truck,
  Clock,
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
  const router = useRouter();
  const [session, setSession] = useState<PlanhubSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSession(s);
      setAuthChecked(true);
    }
  }, [router]);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [openFileTabs, setOpenFileTabs] = useState<{ id: string; name: string; trade: string; detail: string }[]>([]);
  const fileTabCounter = useRef(0);
  const bidFooterRef = useRef<HTMLDivElement>(null);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [gcExpanded, setGcExpanded] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string>(PLANHUB_PROJECT_IDS[0]);
  const [activeView, setActiveView] = useState<"project" | "bidboard">("bidboard");

  // Dynamic (imported) projects
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dynamicProject, setDynamicProject] = useState<StoredProject | null>(null);

  // Load stored projects from IndexedDB on mount
  useEffect(() => {
    getAllProjects().then(setStoredProjects).catch(console.error);
  }, []);

  async function handleLogout() {
    const token = session?.auth_token;
    clearSession();
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken: token }),
      }).catch(() => {});
    }
    router.replace("/login");
  }

  const user = session
    ? {
        name: getDisplayName(session.email),
        initials: getInitials(session.email),
      }
    : undefined;

  const isDynamic =
    dynamicProject !== null &&
    activeView === "project" &&
    !PLANHUB_ID_SET.has(activeProject);

  // Live PlanHub project data (keyed by project ID)
  const [liveProjects, setLiveProjects] = useState<
    Record<string, { project: ProjectDisplay; gcList: GcDisplay[] } | null>
  >({});
  // Track which IDs we've already initiated a fetch for
  const fetchedIds = useRef<Set<string>>(new Set());

  // Fetch all 5 projects once session is available
  useEffect(() => {
    if (!session) return;
    PLANHUB_PROJECT_IDS.forEach((projectId) => {
      if (fetchedIds.current.has(projectId)) return;
      fetchedIds.current.add(projectId);
      getLeadDetails(projectId, session.auth_token).then((lead) => {
        setLiveProjects((prev) => ({
          ...prev,
          [projectId]: lead
            ? { project: mapLeadToDisplay(lead), gcList: mapLeadToGcList(lead) }
            : null,
        }));
      });
    });
  }, [session]);

  const liveData = PLANHUB_ID_SET.has(activeProject)
    ? liveProjects[activeProject]
    : undefined;

  // undefined → still loading; null → fetch failed; object → loaded
  const isLoadingProject =
    PLANHUB_ID_SET.has(activeProject) &&
    activeView === "project" &&
    liveData === undefined;

  // Placeholder shown while loading so TypeScript stays happy downstream
  const LOADING_PROJECT: ProjectDisplay = {
    id: activeProject,
    name: `Project ${activeProject}`,
    dueDate: "—", description: "", location: "",
    projectValue: "—", projectSize: "—",
    startDate: "—", endDate: "—", status: "—",
    constructionType: "—", projectType: "—",
    buildingUse: "—", sectorLaborStatus: "—",
    trades: [], totalTrades: 0,
  };

  const displayProject = isDynamic
    ? dynamicProject!
    : (liveData?.project ?? LOADING_PROJECT);
  const displayGcList = isDynamic ? [] : (liveData?.gcList ?? []);

  const handleNavClick = (navId: string) => {
    if (navId === "bidboard") {
      setActiveView("bidboard");
      setDynamicProject(null);
      setAskAiOpen(false);
    } else if (PLANHUB_ID_SET.has(navId)) {
      setActiveView("project");
      setActiveProject(navId);
      setDynamicProject(null);
      setActiveTab("overview");
      setShowAllTrades(false);
      setGcExpanded(null);
      setModalOpen(false);
      setAskAiOpen(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    if (PLANHUB_ID_SET.has(projectId)) {
      handleNavClick(projectId);
    } else {
      // Imported (IndexedDB) project
      const found = storedProjects.find((p) => p.id === projectId);
      if (found) {
        setDynamicProject(found);
        setActiveView("project");
        setActiveProject(projectId);
        setActiveTab("overview");
        setShowAllTrades(false);
        setGcExpanded(null);
        setModalOpen(false);
      }
    }
  };

  const handleProjectImported = (project: StoredProject) => {
    setStoredProjects((prev) => [...prev, project]);
    setDynamicProject(project);
    setActiveView("project");
    setActiveProject(project.id);
    setActiveTab("overview");
  };

  const handleOpenSource = (trade: string, detail: string) => {
    // Generate a dummy spec file name from the trade
    const specNames: Record<string, string> = {
      "Lighting & Controls": "26 51 00 Interior Lighting Specs.pdf",
      "Low Voltage": "27 10 00 Structured Cabling Specs.pdf",
      "Electrical Rough-In": "26 05 00 General Electrical Specs.pdf",
      "Fire Alarm": "28 31 00 Fire Detection Specs.pdf",
    };
    const fileName = specNames[trade] || `${trade} Specifications.pdf`;
    const id = `file-${fileTabCounter.current++}`;
    // Don't re-open if same trade is already open
    const existing = openFileTabs.find(t => t.trade === trade);
    if (existing) {
      setActiveTab(existing.id);
      return;
    }
    setOpenFileTabs(prev => [...prev, { id, name: fileName, trade, detail }]);
    setActiveTab(id);
  };

  const handleCloseFileTab = (tabId: string) => {
    setOpenFileTabs(prev => prev.filter(t => t.id !== tabId));
    // If we're closing the active tab, go back to submit-bid
    if (activeTab === tabId) {
      setActiveTab("submit-bid");
    }
  };

  const footer = activeTab === "track-bid" || activeTab.startsWith("file-") ? undefined
    : activeTab === "submit-bid" ? (
      <div ref={bidFooterRef} className="shrink-0" />
    ) : (
    <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-end gap-3 shrink-0">
      {!isDynamic && (
        <>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive-surface">
            <X className="h-4 w-4 mr-1.5" />
            Decline
          </Button>
          <Button variant="outline">
            <Check className="h-4 w-4 mr-1.5" />
            Intend to Bid
          </Button>
        </>
      )}
      <Button onClick={() => {
        if (getFlag("tabular-submission")) {
          setActiveTab("submit-bid");
        } else {
          setModalOpen(true);
        }
      }}>
        <Send className="h-4 w-4 mr-1.5" />
        Submit Bid
      </Button>
    </div>
  );

  if (!authChecked) return null;

  return (
    <PlanHubShell
      footer={activeView === "project" ? footer : undefined}
      rightPanel={activeView === "project" ? (
        <AskAiPanel
          open={askAiOpen}
          onClose={() => setAskAiOpen(false)}
          projectId={isDynamic ? dynamicProject.id : activeProject}
          projectContext={isDynamic ? dynamicProject.projectContext : undefined}
        />
      ) : undefined}
      onNavClick={handleNavClick}
      activeProject={activeView === "project" && !isDynamic ? activeProject : undefined}
      activeView={activeView}
      user={user}
      onLogout={handleLogout}
      projectNavItems={PLANHUB_PROJECT_IDS.map((id) => ({
        id,
        label: liveProjects[id]?.project?.name ?? id,
      }))}
    >
      {activeView === "bidboard" ? (
        <>
          <BidBoard
            onProjectClick={handleProjectClick}
            onImportClick={() => setImportModalOpen(true)}
            storedProjects={storedProjects}
            planhubProjects={PLANHUB_PROJECT_IDS.map((id) => ({
              id,
              display: liveProjects[id]?.project ?? null,
            }))}
          />
          <ImportProjectModal
            open={importModalOpen}
            onOpenChange={setImportModalOpen}
            onProjectImported={handleProjectImported}
          />
        </>
      ) : (
      <>
      {/* Project Header */}
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {isDynamic ? displayProject.name : `${activeProject} - ${displayProject.name}`}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span>Due: {displayProject.dueDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setAskAiOpen(!askAiOpen)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors ${
                askAiOpen
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
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
        <div className="flex gap-0">
          {(activeTab === "submit-bid" || activeTab.startsWith("file-")) && (
            <button
              onClick={() => setActiveTab("submit-bid")}
              className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "submit-bid"
                  ? "border-[#00B894] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Submit Bid
            </button>
          )}
          {bidSubmitted && (
            <button
              onClick={() => setActiveTab("track-bid")}
              className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "track-bid"
                  ? "border-[#00B894] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Track Bid
            </button>
          )}
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-[#00B894] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "files"
                ? "border-[#00B894] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Files
          </button>
          {/* Open file tabs */}
          {openFileTabs.map((ft) => (
            <div
              key={ft.id}
              className={`group relative flex items-center gap-1 py-3 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === ft.id
                  ? "border-[#00B894] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(ft.id)}
            >
              <span className="truncate max-w-[140px]">{ft.name.replace(".pdf", "").slice(0, 16)}...</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseFileTab(ft.id); }}
                className="h-4 w-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all ml-0.5 shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {/* Submit Bid — stays mounted (hidden) when file tab is open so user doesn't lose progress */}
      {(activeTab === "submit-bid" || activeTab.startsWith("file-")) && (
        <div className={`bg-[var(--bg-surface,#F5F7F9)] h-full ${activeTab !== "submit-bid" ? "hidden" : ""}`}>
          <BidSubmissionModal
            open={true}
            onOpenChange={() => setActiveTab("overview")}
            projectName={isDynamic ? displayProject.name : `${activeProject} - ${displayProject.name}`}
            gcName={displayGcList[0]?.name ?? "General Contractor"}
            gcEmail={displayGcList[0]?.email || "bids@contractor.com"}
            projectId={isDynamic ? dynamicProject.id : activeProject}
            projectContext={isDynamic ? dynamicProject.projectContext : undefined}
            mode="page"
            footerPortalRef={bidFooterRef}
            onOpenSource={handleOpenSource}
            onSubmitComplete={() => {
              setBidSubmitted(true);
              setActiveTab("track-bid");
            }}
          />
        </div>
      )}
      {/* File viewer tabs */}
      {openFileTabs.map((ft) => (
        <div key={ft.id} className={`h-full ${activeTab !== ft.id ? "hidden" : ""}`}>
          <FileViewerTab fileName={ft.name} highlightText={ft.detail} />
        </div>
      ))}
      {activeTab === "track-bid" ? (
        <div className="p-6 bg-[var(--bg-surface,#F5F7F9)]">
          <BidTracker projectName={isDynamic ? displayProject.name : `${activeProject} - ${displayProject.name}`} gcName={displayGcList[0]?.name ?? "General Contractor"} />
        </div>
      ) : activeTab === "overview" ? (
        <div className="p-6 bg-[var(--bg-surface,#F5F7F9)]">
          {isLoadingProject && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <div className="h-3 w-3 rounded-full border-2 border-[#00B894] border-t-transparent animate-spin" />
              Loading project data…
            </div>
          )}
          <div className="flex gap-6 items-start">
            {/* Left column */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* About */}
              <SectionCard
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                title="About This Project"
              >
                <p className="text-sm text-foreground leading-relaxed">
                  {displayProject.description}
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
                    value={displayProject.projectValue}
                  />
                  <DetailRow
                    label="Project Size"
                    value={displayProject.projectSize}
                  />
                  <DetailRow
                    label="Project Start Date"
                    value={displayProject.startDate}
                  />
                  <DetailRow
                    label="Project End Date"
                    value={displayProject.endDate}
                  />
                  <DetailRow
                    label="Project Status"
                    value={displayProject.status}
                  />
                  <DetailRow
                    label="Construction Type"
                    value={displayProject.constructionType}
                  />
                  <DetailRow
                    label="Project Type"
                    value={displayProject.projectType}
                  />
                  <DetailRow
                    label="Building Use"
                    value={displayProject.buildingUse}
                  />
                  <DetailRow
                    label="Sector Labor Status"
                    value={displayProject.sectorLaborStatus}
                  />
                </div>
              </SectionCard>

              {/* Trades Needed */}
              <SectionCard
                icon={<Tag className="h-4 w-4 text-muted-foreground" />}
                title="Trades Needed"
              >
                <div className="flex flex-wrap gap-2">
                  {displayProject.trades.map((trade) => (
                    <span
                      key={trade}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success-surface text-success-foreground border border-success-border"
                    >
                      <Check className="h-3 w-3" />
                      {trade}
                    </span>
                  ))}
                </div>
                {!isDynamic && !showAllTrades && displayProject.totalTrades > displayProject.trades.length && (
                  <button
                    onClick={() => setShowAllTrades(true)}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    + Show {displayProject.totalTrades - displayProject.trades.length}{" "}
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
                  displayProject.location ? (
                    <a
                      href={`https://maps.google.com/maps?q=${encodeURIComponent(displayProject.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View full map
                    </a>
                  ) : undefined
                }
              >
                <p className="text-sm text-foreground mb-3">
                  {displayProject.location || "Location TBD"}
                </p>
                {displayProject.location ? (
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(displayProject.location)}&output=embed`}
                    className="w-full h-48 rounded-lg border border-border"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg bg-accent border border-border flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Location TBD</p>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* General Contractors — only for hardcoded projects */}
              {!isDynamic ? (
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
                    {displayGcList.map((gc) => (
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
              ) : (
                <SectionCard
                  icon={
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  }
                  title="General Contractors"
                >
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No GC information available for imported projects yet.
                  </div>
                </SectionCard>
              )}
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
        projectName={isDynamic ? displayProject.name : `${activeProject} - ${displayProject.name}`}
        gcName={displayGcList[0]?.name ?? "General Contractor"}
        gcEmail={displayGcList[0]?.email || "bids@contractor.com"}
        projectId={isDynamic ? dynamicProject.id : activeProject}
        projectContext={isDynamic ? dynamicProject.projectContext : undefined}
      />

      </>
      )}
    </PlanHubShell>
  );
}

function BidTracker({ projectName, gcName }: { projectName: string; gcName: string }) {
  const confirmationId = useMemo(
    () => "BID-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    []
  );
  const submittedTime = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    []
  );

  const steps = [
    { label: "Bid Submitted", description: "Your bid has been submitted successfully", time: "Just now", icon: CheckCircle2, done: true },
    { label: "Received by GC", description: `${gcName} has received your bid package`, time: "Estimated: 1-2 hours", icon: Package, done: false },
    { label: "Under Review", description: "Your bid is being reviewed by the project team", time: "Estimated: 2-5 business days", icon: Clock, done: false },
    { label: "Decision Made", description: "The GC will notify you of their decision", time: "Estimated: 1-2 weeks", icon: Truck, done: false },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success header */}
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-success-surface flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-success-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Bid Submitted Successfully</h2>
        <p className="text-sm text-muted-foreground mt-1">{projectName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Submitted to {gcName}</p>
      </div>

      {/* Tracking timeline */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-6">Bid Status</h3>
        <div className="space-y-0">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex gap-4">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    s.done ? "bg-success-surface" : "bg-muted"
                  }`}>
                    <Icon className={`h-4 w-4 ${s.done ? "text-success-foreground" : "text-muted-foreground"}`} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-12 ${s.done ? "bg-success-foreground/30" : "bg-border"}`} />
                  )}
                </div>
                {/* Content */}
                <div className="pt-1 pb-4">
                  <p className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  <p className={`text-xs mt-1 ${s.done ? "text-success-foreground font-medium" : "text-muted-foreground"}`}>{s.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Confirmation #</p>
          <p className="text-sm font-mono font-medium text-foreground mt-1">{confirmationId}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-sm font-medium text-foreground mt-1">{submittedTime}</p>
        </div>
      </div>
    </div>
  );
}
