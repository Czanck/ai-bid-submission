"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plus, Loader2 } from "lucide-react";
import type { StoredProject } from "@/lib/types";
import type { ProjectDisplay } from "@/lib/planhub-api";

const columnBadgeVariant: Record<string, "info" | "warning" | "success" | "neutral"> = {
  saved: "neutral",
  estimating: "warning",
  bidding: "info",
  submitted: "info",
  won: "success",
  lost: "neutral",
};

const columns = [
  { id: "saved", title: "Saved" },
  { id: "estimating", title: "Estimating" },
  { id: "bidding", title: "Bidding" },
  { id: "submitted", title: "Submitted" },
  { id: "won", title: "Won" },
  { id: "lost", title: "Lost" },
];

interface BidBoardProps {
  onProjectClick: (projectId: string) => void;
  onImportClick: () => void;
  storedProjects: StoredProject[];
  /** Live PlanHub projects — null means loading, ProjectDisplay means loaded */
  planhubProjects: { id: string; display: ProjectDisplay | null }[];
}

export function BidBoard({
  onProjectClick,
  onImportClick,
  storedProjects,
  planhubProjects,
}: BidBoardProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Bid Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage your active bids
          </p>
        </div>
        <Button onClick={onImportClick} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Import Project
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-6 bg-[var(--bg-surface,#F5F7F9)]">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((col) => {
            const planhubCards = col.id === "saved" ? planhubProjects : [];
            const dynamicCards = storedProjects.filter((p) => p.boardColumn === col.id);
            const totalCount = planhubCards.length + dynamicCards.length;

            return (
              <div
                key={col.id}
                className="flex-1 min-w-[220px] max-w-[280px] flex flex-col"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                  <Badge variant="neutral" className="text-[11px]">
                    {totalCount}
                  </Badge>
                </div>

                {/* Column body */}
                <div className="flex-1 rounded-lg p-2 space-y-3 min-h-[300px] bg-accent/40">
                  {/* PlanHub project cards (Bidding column only) */}
                  {planhubCards.map(({ id, display }) =>
                    display == null ? (
                      // Loading skeleton
                      <div
                        key={id}
                        className="bg-card border border-border rounded-lg p-4 flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        Loading {id}…
                      </div>
                    ) : (
                      <div
                        key={id}
                        onClick={() => onProjectClick(id)}
                        className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                      >
                        <Badge variant="neutral" className="mb-2.5">
                          Saved
                        </Badge>
                        <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {display.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bid Value: {display.projectValue}
                        </p>
                        {display.dueDate !== "—" && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-destructive font-medium">
                            <Calendar className="h-3 w-3" />
                            <span>DUE {display.dueDate}</span>
                          </div>
                        )}
                        {display.location && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{display.location}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectClick(id);
                          }}
                        >
                          View Project
                        </Button>
                      </div>
                    )
                  )}

                  {/* IndexedDB imported project cards */}
                  {dynamicCards.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onProjectClick(p.id)}
                      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                      <Badge
                        variant={columnBadgeVariant[p.boardColumn] || "neutral"}
                        className="mb-2.5"
                      >
                        {col.title}
                      </Badge>
                      <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bid Value: {p.projectValue}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-destructive font-medium">
                        <Calendar className="h-3 w-3" />
                        <span>DUE {p.dueDate}</span>
                      </div>
                      {p.location && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectClick(p.id);
                        }}
                      >
                        View Project
                      </Button>
                    </div>
                  ))}

                  {totalCount === 0 && (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      No projects
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
