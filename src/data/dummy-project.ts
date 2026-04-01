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
  id: "726TX2081",
  name: "Riverside Medical Center - Electrical Retrofit",
  dueDate: "04/10/2026",
  description:
    "Full electrical system retrofit for a 4-story, 86,400 SF medical office building including panel upgrades, emergency generator tie-ins, and nurse call system replacement.",
  location: "2200 WESTLAKE DR Austin, TX 78746",
  projectValue: "$2,350,424.00",
  projectSize: "86,400.00 SF",
  startDate: "06/15/2026",
  endDate: "02/28/2027",
  status: "GC and Sub Bidding",
  constructionType: "Private / Commercial",
  projectType: "Renovation / Retrofit",
  buildingUse: "Medical Office",
  sectorLaborStatus: "Open Shop",
  trades: [
    "Electrical Power",
    "Electrical Wiring / Installation",
    "Fire Alarm",
    "Low Voltage / Data",
    "Emergency Generator",
  ],
  totalTrades: 23,
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
    { label: "Bid Board", icon: "ClipboardList", href: "#" },
    { label: "Takeoff", icon: "Ruler", href: "#" },
    { label: "Job Board", icon: "Briefcase", href: "#" },
  ],
  bottom: [
    { label: "Company Profile", icon: "Building2", href: "#" },
  ],
};
