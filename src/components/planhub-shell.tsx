"use client";

import { useState } from "react";
import { FeatureFlagsModal } from "@/components/feature-flags-modal";
import {
  LayoutDashboard,
  FolderKanban,
  Globe,
  Search,
  ClipboardList,
  Ruler,
  Briefcase,
  Building2,
  ChevronDown,
  Headphones,
  MessageSquare,
  Activity,
  Users,
  Plus,
} from "lucide-react";
import { dummyUser, navItems } from "@/data/dummy-project";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FolderKanban,
  Globe,
  Search,
  ClipboardList,
  Ruler,
  Briefcase,
  Building2,
  Users,
};

function NavItem({
  item,
  onClick,
}: {
  item: { label: string; icon: string; href: string; active?: boolean; navId?: string };
  onClick?: (navId: string) => void;
}) {
  const Icon = iconMap[item.icon];
  return (
    <a
      href={item.href}
      onClick={(e) => {
        if (item.navId && onClick) {
          e.preventDefault();
          onClick(item.navId);
        }
      }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
        item.active
          ? "bg-[#00B894] text-white"
          : "text-[var(--sidebar-accent-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
      }`}
    >
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
      <span>{item.label}</span>
    </a>
  );
}

export function PlanHubShell({
  children,
  footer,
  onNavClick,
  activeProject,
  activeView,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  onNavClick?: (navId: string) => void;
  activeProject?: string;
  activeView?: string;
}) {
  const [flagsOpen, setFlagsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FeatureFlagsModal open={flagsOpen} onOpenChange={setFlagsOpen} />
      {/* Sidebar */}
      <aside className="flex flex-col w-[200px] bg-[var(--sidebar)] text-white shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-1.5 px-4 h-14">
          <div className="h-7 w-7 rounded-full bg-[#00B894] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[11px]">p</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight">
            plan<span className="text-[#00B894]">Hub</span>
            <span className="text-[10px] text-[var(--sidebar-accent-foreground)] ml-0.5 font-normal">
              2.0
            </span>
          </span>
        </div>

        {/* + Add New button */}
        <div className="px-3 mb-2">
          <button className="w-full flex items-center justify-center gap-1.5 h-9 rounded-md border border-[var(--sidebar-border)] text-sm font-medium text-[var(--sidebar-accent-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
            <Plus className="h-4 w-4" />
            Add New
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </button>
        </div>

        {/* Top nav */}
        <nav className="px-2 space-y-0.5">
          {navItems.top.map((item) => (
            <NavItem
              key={item.label}
              item={{
                ...item,
                active: item.navId ? item.navId === activeProject || item.navId === activeView : (item as { active?: boolean }).active,
              }}
              onClick={onNavClick}
            />
          ))}
        </nav>

        {/* Workspace section */}
        <div className="px-4 mt-5 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--sidebar-accent-foreground)] opacity-50">
            Workspace
          </span>
        </div>
        <nav className="px-2 space-y-0.5 flex-1">
          {navItems.workspace.map((item) => (
            <NavItem
              key={item.label}
              item={{
                ...item,
                active: item.navId ? item.navId === activeProject || item.navId === activeView : (item as { active?: boolean }).active,
              }}
              onClick={onNavClick}
            />
          ))}
        </nav>

        {/* Invite Your Team CTA */}
        <div className="px-3 mb-2">
          <div className="rounded-lg bg-[#00B894] p-3 cursor-pointer hover:bg-[#009F7F] transition-colors">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">
                Invite Your Team
              </span>
            </div>
            <p className="text-[11px] text-white/80 mt-0.5">
              Maximize your 3 free seats
            </p>
          </div>
        </div>

        {/* Company Profile */}
        <nav className="px-2 mb-2">
          {navItems.bottom.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)]">
          <div className="text-[10px] font-semibold text-[var(--sidebar-accent-foreground)]">
            PlanHub Enterprise
          </div>
          <div className="text-[10px] text-[var(--sidebar-accent-foreground)] opacity-50">
            Project access in 94 regions
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="h-7 w-7 rounded-md bg-[var(--sidebar-accent)] flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5 text-[var(--sidebar-accent-foreground)]" />
            </div>
            <span className="text-xs text-[var(--sidebar-foreground)] truncate">
              {dummyUser.company}
            </span>
          </div>
          <button
            onClick={() => setFlagsOpen(true)}
            className="mt-2 w-full h-7 rounded-md bg-[#00B894] text-[11px] font-medium text-white hover:bg-[#009F7F] transition-colors"
          >
            Feature Flags
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border bg-card flex items-center justify-end px-4 shrink-0 gap-1">
          <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">
            <Headphones className="h-3.5 w-3.5" />
            Support
          </button>
          <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">
            <MessageSquare className="h-3.5 w-3.5" />
            Messages
          </button>
          <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">
            <Activity className="h-3.5 w-3.5" />
            Activity
          </button>
          <button className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-[#00B894] text-xs font-medium text-white hover:bg-[#009F7F] transition-colors ml-1">
            <span className="text-yellow-300 text-sm">🔥</span>
            Pricing
          </button>
          <div className="flex items-center gap-2 ml-2 cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-[#00B894] flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {dummyUser.initials}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {dummyUser.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </header>

        {/* Content + optional footer */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 overflow-y-auto">{children}</main>
          {footer && footer}
        </div>
      </div>
    </div>
  );
}
