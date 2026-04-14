export const PLANHUB_PROJECT_IDS = [
  "121971",
  "121972",
  "121973",
  "121976",
  "121916",
] as const;

export type PlanhubProjectId = (typeof PLANHUB_PROJECT_IDS)[number];

export const PLANHUB_ID_SET = new Set<string>(PLANHUB_PROJECT_IDS);

export const dummyUser = {
  name: "Chase Zanck",
  initials: "CZ",
  email: "chase@companyxelectric.com",
  company: "Company X Electric",
};

export const navItems = {
  top: [
    { label: "Dashboard", icon: "LayoutDashboard", href: "#" },
  ],
  workspaceTop: [
    { label: "Network", icon: "Globe", href: "#" },
  ],
  workspaceBottom: [
    { label: "Bid Board", icon: "ClipboardList", href: "#", navId: "bidboard" },
    { label: "Takeoff", icon: "Ruler", href: "#" },
    { label: "Job Board", icon: "Briefcase", href: "#" },
  ],
  bottom: [
    { label: "Company Profile", icon: "Building2", href: "#" },
  ],
};
