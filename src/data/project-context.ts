// Extracted project context from real project files.
// This text is sent to the AI alongside the user's bid so the model can
// compare the bid against actual project requirements.

export const project1Context = `
PROJECT: Burlington Store #01689 — Renovation / Remodel
LOCATION: 13173 Cortez Boulevard, Brooksville, FL 34613
PROJECT #: 125107
ARCHITECT/ENGINEER: 3150 Holcomb Bridge Road, Norcross, GA 30071 (404-330-9798), FL COA #31459
ISSUE DATE: 03/14/2025 (Revision 1: 04/14/25, Revision 2: 05/09/25)
TYPE: Retail store renovation (existing Burlington store)
PLAN SET: 42 sheets — Architectural, Mechanical, Electrical, Plumbing, Fire Alarm

=== ELECTRICAL SCOPE (PRIMARY TRADE) ===
- Existing 600A 277/480V 3-phase 4-wire main service disconnect with 800A current-limited fuses
- Main Distribution Panel (MDP): 600A MCB, 277/480V 3PH 4W, 65K AIC
- Panel HA: 400A (lighting/power)
- Panel LA: 225A (lighting/power)
- Panel C: 225A (existing, relocated to electrical room)
- Panel CR: 60A
- Transformer T2: 75kVA (existing, relocated to electrical room)
- Lighting Control Panel (LCP1) with contactors — furnished by BAS vendor, installed by EC
- All 277V interior light fixtures on #10 branch circuits
- All exterior wall-mounted fixtures on #8 branch circuits
- Dedicated neutral on all dimming circuits, no shared neutrals
- Multi-wire circuits prohibited unless written permission obtained
- 0-10V dimming signal wires daisy-chained across all sales floor fixtures
- Surge Protection Device (SPD): UL 1449 Fourth Edition, Type 1, 20kA min nominal discharge
- KWH/phase loss meters furnished by EMS vendor, installed by EC
- Conduit below slab: rigid steel, IMC, PVC, or HDPE (min 3/4")
- All fire-rated penetrations sealed per UL design

=== LIGHTING ===
- LED fixtures throughout (Columbia, Lithonia, RAB, others per schedule)
- Type A/AE: Columbia MPS-8T-940-HL-FW-EDU-BRL (8ft LED, sales floor)
- Emergency battery backup ballasts wired ahead of controls
- Night lights and exit signs bypass all control
- Rows of fixtures controlled alternately, wired to separate panels for 50/50 distribution
- Exterior: wall packs (HA-38), front canopy lights (HA-29)
- Sign circuits dedicated 20A per sign location

=== BUILDING AUTOMATION SYSTEM (BAS) ===
- BAS Vendor: NexRev (BACnet over IP/MSTP)
- EC provides all conduit, boxes, and line-voltage wiring
- BAS vendor provides low-voltage wiring and BAS equipment
- Lighting/dimming control panels furnished by BAS vendor, installed by EC
- EC must coordinate with BAS vendor prior to bidding
- EC present during 2-day commissioning
- BAS override display panel in manager's office
- Lighting control levels: Employee (50% sales floor), Customer (alternate rows), Security (exterior), Parking (photocell)

=== MECHANICAL / HVAC (for coordination) ===
- Lennox national account — RTUs: LGH120 (10-ton), LGH036 (3-ton), LGH048 (4-ton)
- Exhaust fans: Greenheck G-095-VG, G-090-VG
- Ceiling fans: Berko/Qmark 48021K
- Unit heaters: gas-fired
- EC provides power connections to all HVAC equipment
- EC provides 120V to RTU convenience outlets
- EC provides conduit for control wiring from unit heaters to sensors and BAS controllers
- Fire life safety contractor interlocks RTUs with fire alarm

=== FIRE ALARM ===
- Field-provided and field-installed smoke detectors in RTU return duct upstream of outdoor air intake
- Fire alarm interlocking for all RTUs and ceiling fans

=== KEY REQUIREMENTS FOR BIDDERS ===
- Visit site prior to submitting bid; no extra compensation for failure to observe conditions
- Coordinate with BAS vendor (NexRev) prior to bidding for conduit, wiring, and control requirements
- Coordinate with Lennox national accounts for HVAC equipment lead times
- Verify existing circuiting, spare breakers, spaces, and existing equipment prior to commencing work
- 3rd-party commissioning (CxA) required — trades must be present during inspection
- All submittals electronic (PDF via email)
- Provide O&M manuals, warranty letters, and balancing reports
- Balance loads to within 10% between phases
- Questions to engineer prior to award of contract
`.trim();

export const project2Context = `
PROJECT: The Boulevard Retail — Buildings 3 & 4 (Core & Shell)
LOCATION: 13001 Bass Lake Road, Plymouth, MN
OWNER: SPRC Land Ventures LLC (Scannell Properties)
GC COORDINATION: Ryan Companies (6497 City West Parkway, Eden Prairie, MN 55344)
TYPE: New Construction — Retail Shell Buildings
DATE: March 2026

=== PROJECT OVERVIEW ===
Two retail shell buildings with two future tenant spaces:
- Future Tenant A: ~3,600 SF
- Future Tenant B: ~1,500 SF
Total building with common areas, mechanical room, site work

=== ELECTRICAL SCOPE ===
6.1 Electrical service:
- One (1) separately metered 200A house panel for common areas (mechanical room, exterior lighting, irrigation)
- Tenant A (+/-3,600 SF): One (1) separately metered, dedicated 600A, 3-phase, 4-wire, 120/208V service and panel (circuit breaker type, min 42 breakers accepting 150A breaker)
- Tenant B (+/-1,500 SF): One (1) 200A, 120/208V, 3-phase, 4-wire service metered to 200A fused disconnect and 200A/42-circuit main panel, plus 100A/30-circuit subpanel. Dedicated 20A circuit per exterior sign location with manually programmable 7-day time clock
- Electrical meters, disconnects, and feeders for all services
- Electrical connections to HVAC units, duplex outlets at rooftop equipment, two (2) duplex outlets in mechanical room (GFI if required)
- Electrical outlets for exterior building signage with timer/photocell control
- Site pole lights, exterior building-mounted lights, emergency egress lighting (per code or plan design, whichever more stringent) on separate dedicated shell house panel with timer/photocell

7.0 Signage:
- All conduit, power (120V), structural support for building signage
- Each tenant space: dedicated 20A circuit for exterior signage
- Min 2'x2' accessible access area for electrical/sign installation per tenant

10.0 Telephone/Cable/Internet:
- TCI conduit (2-4" pipes) from property line to mechanical room
- 2-4" pipes from exterior service box to each tenant space with pull cord
- Conduit in straightest path, bends not exceeding 45 degrees
- 4x4 fire-retardant plywood backboard for phone termination

13.0 Lighting:
- LED lighting in mechanical room on house panel
- Minimal temp lighting in each tenant space

=== HVAC (for electrical coordination) ===
- Tenant A: Three (3) dual-stage high-efficiency RTUs (~1 ton per 250 SF), natural gas reheat
- Tenant B: Two (2) 5-ton HVAC units (1 ton per 150 SF)
- Electric unit heater in shell mechanical room
- HVAC units: structural supports, roof curbs, power wiring, gas connections, control wiring, start-up
- Tenant A: mini split condensing units on roof — curbing and flashing required

=== STRUCTURAL / BUILDING ===
- Exterior walls: masonry or metal stud (16" OC) with insulation for 5/8" drywall
- Roof: TPO or EPDM (60 mil min), 20-year warranty, 1/4" per foot slope minimum
- Fire-rated demising walls (min 6", 20ga, 16" OC, STC 60)
- Storefront: complete exterior glazing system, Low-E glass

=== BULLETIN #1 (03/25/2026) ===
ALT Structural Framing System:
- Alternate all-steel framed building option (5 additional steel beams, 4 additional steel columns, min 3 HSS tube braces)
- HSS 6x6x5/16 for brace sizing (budgeting purposes)
- Price as alternate from base structural system

ALT Weather Barrier:
- Alternate for fluid-applied weather barrier in lieu of Tyvek Commercial wrap
- DuPont Tyvek Fluid Applied WB

** Bidders must acknowledge Bulletin #1 in their bid **

=== GEOTECHNICAL ===
- Braun Intertec evaluation (Project B2201284)
- Soil corrections performed: unsuitable soils removed and replaced
- Building pads at finished floor elevation 957 feet
- Mass grading by Designing Earth Contracting, Inc.

=== KEY REQUIREMENTS FOR BIDDERS ===
- Acknowledge Bulletin #1 in bid
- Provide alternates for structural framing and weather barrier
- Coordinate roof-top unit locations with future tenants
- All penetrations through fire-rated assemblies must be sealed
- Water testing coordination with Owner's building envelope consultant
`.trim();
