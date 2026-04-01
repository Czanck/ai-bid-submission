export const dummyProject = {
  id: "125107",
  name: "Burlington #01689 — Renovation / Remodel",
  dueDate: "06/15/2025",
  description:
    "Full interior renovation of an existing Burlington retail store including electrical, HVAC, fire alarm, lighting controls, and BAS integration. 42-sheet bid set covering architectural, mechanical, electrical, plumbing, and fire alarm.",
  location: "13173 CORTEZ BOULEVARD Brooksville, FL 34613",
  projectValue: "$1,850,000.00",
  projectSize: "28,000.00 SF",
  startDate: "08/01/2025",
  endDate: "01/15/2026",
  status: "GC and Sub Bidding",
  constructionType: "Private / Commercial",
  projectType: "Renovation / Remodel",
  buildingUse: "Retail Store",
  sectorLaborStatus: "Open Shop",
  trades: [
    "Electrical Power",
    "Electrical Wiring / Installation",
    "Lighting / Controls",
    "Fire Alarm",
    "Low Voltage / BAS",
  ],
  totalTrades: 34,
};

export const project2 = {
  id: "3445",
  name: "The Boulevard Retail — Core & Shell",
  dueDate: "04/10/2026",
  description:
    "New construction of retail shell buildings (Buildings 3 & 4) with two future tenant spaces (~3,600 SF and ~1,500 SF). Scope includes site work, structure, MEP core, storefront, roofing, and full electrical service for each tenant.",
  location: "13001 BASS LAKE ROAD Plymouth, MN 55441",
  projectValue: "$4,200,000.00",
  projectSize: "5,100.00 SF",
  startDate: "06/15/2026",
  endDate: "02/28/2027",
  status: "GC and Sub Bidding",
  constructionType: "Private / Commercial",
  projectType: "New Construction",
  buildingUse: "Retail",
  sectorLaborStatus: "Open Shop",
  trades: [
    "Electrical Power",
    "Electrical Wiring / Installation",
    "Fire Alarm",
    "Low Voltage / Data",
    "HVAC",
    "Plumbing",
  ],
  totalTrades: 42,
};

export const dummyUser = {
  name: "Chase Zanck",
  initials: "CZ",
  email: "chase@companyxelectric.com",
  company: "Company X Electric",
};

export const gcList = [
  {
    name: "Westbrook Construction Group",
    email: "bids@westbrookcg.com",
    phone: "3526889200",
    status: "BIDDING" as const,
    dueDate: "06/13/2025 2:00 PM",
    hasSpecialInstructions: true,
  },
];

export const gcList2 = [
  {
    name: "SolidRock Enterprises",
    email: "bids@solidrockent.com",
    phone: "5124889100",
    status: "BIDDING" as const,
    dueDate: "04/08/2026 2:00 PM",
    hasSpecialInstructions: true,
  },
  {
    name: "Meridian Builders Group",
    email: "preconstruction@meridianbg.com",
    phone: "5129017432",
    status: "BIDDING" as const,
    dueDate: "04/10/2026 5:00 PM",
    hasSpecialInstructions: false,
  },
];

export const navItems = {
  top: [
    { label: "Dashboard", icon: "LayoutDashboard", href: "#" },
    { label: "The BLVD Retail", icon: "FolderKanban", href: "#", navId: "project2" },
  ],
  workspace: [
    { label: "Network", icon: "Globe", href: "#" },
    { label: "Burlington #01689", icon: "Search", href: "#", active: true, navId: "project1" },
    { label: "Bid Board", icon: "ClipboardList", href: "#", navId: "bidboard" },
    { label: "Takeoff", icon: "Ruler", href: "#" },
    { label: "Job Board", icon: "Briefcase", href: "#" },
  ],
  bottom: [
    { label: "Company Profile", icon: "Building2", href: "#" },
  ],
};
