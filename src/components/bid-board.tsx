"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dummyProject, project2 } from "@/data/dummy-project";
import { Calendar, MapPin, Plus } from "lucide-react";
import type { StoredProject } from "@/lib/types";

const columnBadgeVariant: Record<string, "info" | "warning" | "success" | "neutral"> = {
  saved: "neutral",
  estimating: "warning",
  bidding: "info",
  submitted: "info",
  won: "success",
  lost: "neutral",
};

interface HardcodedCard {
  kind: "hardcoded";
  project: typeof dummyProject;
  projectId: string;
  badgeLabel: string;
  badgeVariant: "info" | "warning" | "success" | "neutral";
  buttonLabel: string;
  buttonVariant: "default" | "outline";
}

interface DynamicCard {
  kind: "dynamic";
  project: StoredProject;
}

type CardItem = HardcodedCard | DynamicCard;

const hardcodedColumns: { id: string; title: string; cards: HardcodedCard[] }[] = [
  { id: "saved", title: "Saved", cards: [] },
  {
    id: "estimating",
    title: "Estimating",
    cards: [
      {
        kind: "hardcoded",
        project: project2,
        projectId: "project2",
        badgeLabel: "Estimating",
        badgeVariant: "warning",
        buttonLabel: "View Takeoff",
        buttonVariant: "outline",
      },
    ],
  },
  {
    id: "bidding",
    title: "Bidding",
    cards: [
      {
        kind: "hardcoded",
        project: dummyProject,
        projectId: "project1",
        badgeLabel: "Bidding",
        badgeVariant: "info",
        buttonLabel: "Submit Bid",
        buttonVariant: "default",
      },
    ],
  },
  { id: "submitted", title: "Submitted", cards: [] },
  { id: "won", title: "Won", cards: [] },
  { id: "lost", title: "Lost", cards: [] },
];

interface BidBoardProps {
  onProjectClick: (projectId: string) => void;
  onImportClick: () => void;
  storedProjects: StoredProject[];
}

export function BidBoard({ onProjectClick, onImportClick, storedProjects }: BidBoardProps) {
  // Merge dynamic projects into columns
  const columns = hardcodedColumns.map((col) => {
    const dynamicCards: DynamicCard[] = storedProjects
      .filter((p) => p.boardColumn === col.id)
      .map((p) => ({ kind: "dynamic" as const, project: p }));
    return {
      ...col,
      allCards: [...col.cards, ...dynamicCards] as CardItem[],
    };
  });

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
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex-1 min-w-[220px] max-w-[280px] flex flex-col"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {col.title}
                </h3>
                <Badge variant="neutral" className="text-[11px]">
                  {col.allCards.length}
                </Badge>
              </div>

              {/* Column body */}
              <div className="flex-1 rounded-lg p-2 space-y-3 min-h-[300px] bg-accent/40">
                {col.allCards.map((card) => {
                  if (card.kind === "hardcoded") {
                    return (
                      <div
                        key={card.projectId}
                        onClick={() => onProjectClick(card.projectId)}
                        className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                      >
                        <Badge variant={card.badgeVariant} className="mb-2.5">
                          {card.badgeLabel}
                        </Badge>
                        <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {card.project.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bid Value: {card.project.projectValue}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-destructive font-medium">
                          <Calendar className="h-3 w-3" />
                          <span>DUE {card.project.dueDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{card.project.location}</span>
                        </div>
                        <Button
                          variant={card.buttonVariant}
                          size="sm"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectClick(card.projectId);
                          }}
                        >
                          {card.buttonLabel}
                        </Button>
                      </div>
                    );
                  }

                  // Dynamic card
                  const p = card.project;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onProjectClick(p.id)}
                      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                      <Badge variant={columnBadgeVariant[p.boardColumn] || "neutral"} className="mb-2.5">
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
                  );
                })}

                {col.allCards.length === 0 && (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    No projects
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
