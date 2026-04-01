"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dummyProject, project2 } from "@/data/dummy-project";
import { Calendar, MapPin } from "lucide-react";

interface ProjectCard {
  project: typeof dummyProject;
  projectId: "project1" | "project2";
  badgeLabel: string;
  badgeVariant: "info" | "warning" | "success" | "neutral";
  buttonLabel: string;
  buttonVariant: "default" | "outline";
}

const columns: {
  id: string;
  title: string;
  cards: ProjectCard[];
}[] = [
  { id: "saved", title: "Saved", cards: [] },
  {
    id: "estimating",
    title: "Estimating",
    cards: [
      {
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

export function BidBoard({
  onProjectClick,
}: {
  onProjectClick: (projectId: "project1" | "project2") => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Bid Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track and manage your active bids
        </p>
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
                  {col.cards.length}
                </Badge>
              </div>

              {/* Column body */}
              <div className="flex-1 rounded-lg p-2 space-y-3 min-h-[300px] bg-accent/40">
                {col.cards.map((card) => (
                  <div
                    key={card.projectId}
                    onClick={() => onProjectClick(card.projectId)}
                    className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    {/* Badge */}
                    <Badge variant={card.badgeVariant} className="mb-2.5">
                      {card.badgeLabel}
                    </Badge>

                    {/* Project name */}
                    <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {card.project.name}
                    </h4>

                    {/* Project value */}
                    <p className="text-xs text-muted-foreground mt-1">
                      Bid Value: {card.project.projectValue}
                    </p>

                    {/* Due date */}
                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-destructive font-medium">
                      <Calendar className="h-3 w-3" />
                      <span>DUE {card.project.dueDate}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{card.project.location}</span>
                    </div>

                    {/* Action button */}
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
                ))}

                {col.cards.length === 0 && (
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
