// Types mirrored from ph-client-demo-bid-submission's planhub-api.service.ts

export interface LeadDetail {
  id: number;
  name: string;
  bid_due_date: string | null;
  description: string | null;
  project_value: number | null;
  project_size: number | null;
  start_date: string | null;
  end_date: string | null;
  project_status: string | null;
  construction_type: string | null;
  project_type: string | null;
  building_use: string | null;
  sector_labor_status: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  trades: string[];
  gc_company: {
    id: number;
    name: string;
    logo: string | null;
  } | null;
}

export interface ProjectDisplay {
  id: string;
  name: string;
  dueDate: string;
  description: string;
  location: string;
  projectValue: string;
  projectSize: string;
  startDate: string;
  endDate: string;
  status: string;
  constructionType: string;
  projectType: string;
  buildingUse: string;
  sectorLaborStatus: string;
  trades: string[];
  totalTrades: number;
}

export interface GcDisplay {
  name: string;
  email: string;
  phone: string;
  status: "BIDDING";
  dueDate: string;
  hasSpecialInstructions: boolean;
}

// Module-level trade name cache (persists across calls within a session)
let tradeNameCache: Map<number, string> | null = null;

async function getTradeNameMap(authToken: string): Promise<Map<number, string>> {
  if (tradeNameCache) return tradeNameCache;
  try {
    const res = await fetch("/api/planhub/get-trades", {
      headers: { Authorization: `auth_token ${authToken}` },
    });
    const data = await res.json();
    const map = new Map<number, string>();
    for (const category of data.result ?? []) {
      for (const t of category.sub_trades ?? []) {
        map.set(t.id, t.name);
      }
    }
    tradeNameCache = map;
    return map;
  } catch {
    return new Map();
  }
}

export async function getLeadDetails(
  projectId: string | number,
  authToken: string,
): Promise<LeadDetail | null> {
  try {
    const [res, tradeMap] = await Promise.all([
      fetch("/api/planhub/get-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `auth_token ${authToken}`,
        },
        body: JSON.stringify({ project_id: Number(projectId), track_project_view: false }),
      }),
      getTradeNameMap(authToken),
    ]);

    const data = await res.json();
    const r = data.result;
    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      bid_due_date: r.bid_due_date ?? null,
      description: r.description ?? null,
      project_value: r.value != null ? parseFloat(r.value) : null,
      project_size:
        r.square_footage != null
          ? parseFloat(String(r.square_footage).replace(/,/g, ""))
          : null,
      start_date: r.start_date ?? null,
      end_date: r.end_date ?? null,
      project_status: r.status ?? null,
      construction_type: r.construction_types?.[0] ?? null,
      project_type: r.types?.[0] ?? null,
      building_use: r.sub_construction_types?.[0] ?? null,
      sector_labor_status: r.sectors?.[0] ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      state: r.short_code ?? null,
      zipcode: r.zipcode ?? null,
      trades: ((r.sub_trades as number[]) ?? [])
        .map((id: number) => tradeMap.get(id))
        .filter((n): n is string => !!n),
      gc_company: r.company_name
        ? { id: r.id_company, name: r.company_name, logo: r.company_logo ?? null }
        : null,
    };
  } catch (err) {
    console.error("[getLeadDetails]", err);
    return null;
  }
}

// --- Mapping helpers ---

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSize(value: number | null): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} SF`;
}

function buildLocation(lead: LeadDetail): string {
  return [lead.address, lead.city, lead.state, lead.zipcode].filter(Boolean).join(", ");
}

export function mapLeadToDisplay(lead: LeadDetail): ProjectDisplay {
  return {
    id: String(lead.id),
    name: lead.name,
    dueDate: lead.bid_due_date ?? "—",
    description: lead.description ?? "",
    location: buildLocation(lead),
    projectValue: formatCurrency(lead.project_value),
    projectSize: formatSize(lead.project_size),
    startDate: lead.start_date ?? "—",
    endDate: lead.end_date ?? "—",
    status: lead.project_status ?? "—",
    constructionType: lead.construction_type ?? "—",
    projectType: lead.project_type ?? "—",
    buildingUse: lead.building_use ?? "—",
    sectorLaborStatus: lead.sector_labor_status ?? "—",
    trades: lead.trades,
    totalTrades: lead.trades.length,
  };
}

export function mapLeadToGcList(lead: LeadDetail): GcDisplay[] {
  if (!lead.gc_company) return [];
  return [
    {
      name: lead.gc_company.name,
      email: "",
      phone: "",
      status: "BIDDING" as const,
      dueDate: lead.bid_due_date ?? "—",
      hasSpecialInstructions: false,
    },
  ];
}
