# Solar Quotation OS — Complete Workflow

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SOLAR QUOTATION OS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │   Customer    │   │  Sales Team  │   │   Company Admin   │   │
│  │   (WhatsApp)  │   │  (Dashboard) │   │   (Dashboard)     │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                   │                     │              │
│         ▼                   ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CORE ENGINE                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │   │
│  │  │ WhatsApp │ │Quotation│ │  Lead    │ │  Price    │  │   │
│  │  │   AI     │ │ Engine  │ │  CRM     │ │ Database  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Roles

| Role | Access |
|------|--------|
| **Admin (Company Owner)** | Full dashboard, price management, team management, reports |
| **Salesperson** | Lead management, quotation creation, follow-ups |
| **Customer** | WhatsApp bot interaction, receives quotation PDF |

---

## Workflow 1: Admin Setup (One-Time + Ongoing)

```
Admin registers company
        │
        ▼
┌─────────────────────┐
│  Company Profile     │
│  - Company name      │
│  - Logo              │
│  - Contact info      │
│  - Address           │
│  - GST/tax info      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Add Team Members    │
│  - Salesperson 1     │
│  - Salesperson 2     │
│  - etc.              │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Configure Product Catalog          │
│                                     │
│  SOLAR PANELS                       │
│  ├── Brand: JA Solar                │
│  ├── Model: JAM72S30-585/MR        │
│  ├── Wattage: 585W                  │
│  ├── Price: Rs 28,000               │
│  └── Status: Active                 │
│                                     │
│  INVERTERS                          │
│  ├── Brand: Growatt                 │
│  ├── Model: SPH6000TL3-XP          │
│  ├── Type: Hybrid / On-grid / Off   │
│  ├── Capacity: 6kW                  │
│  ├── Price: Rs 185,000              │
│  └── Status: Active                 │
│                                     │
│  BATTERIES                          │
│  ├── Brand: Growatt                 │
│  ├── Model: 51.2V 100Ah             │
│  ├── Type: Lithium                  │
│  ├── Price: Rs 210,000              │
│  └── Status: Active                 │
│                                     │
│  ACCESSORIES                        │
│  ├── Mounting Structure (per kW)    │
│  ├── DC Cable (per meter)           │
│  ├── AC Cable (per meter)           │
│  ├── Distribution Box               │
│  ├── Surge Protection Device        │
│  ├── Earthing Kit                   │
│  └── Lightning Arrester             │
│                                     │
│  SERVICES                           │
│  ├── Installation (per kW)          │
│  ├── Transportation (flat/variable) │
│  └── Commissioning                  │
│                                     │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Configure Pricing Rules            │
│                                     │
│  - Company margin (%)               │
│  - Discount allowed (%)             │
│  - Tax rate (GST %)                 │
│  - Labor cost per kW                │
│  - Minimum quotation value          │
│                                     │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Configure Quotation Template       │
│                                     │
│  - Header (logo, company info)      │
│  - System recommendation section    │
│  - Itemized cost breakdown          │
│  - Terms & conditions               │
│  - Validity period (e.g. 15 days)   │
│  - Footer (bank details, signature) │
│                                     │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  Configure Sizing Rules             │
│                                     │
│  IF consumption < 300 kWh/month     │
│    → Recommend 3kW system           │
│                                     │
│  IF consumption 300-600 kWh/month   │
│    → Recommend 5-6kW system         │
│                                     │
│  IF consumption 600-1000 kWh/month  │
│    → Recommend 8-10kW system        │
│                                     │
│  IF consumption > 1000 kWh/month    │
│    → Recommend 10kW+ / commercial   │
│                                     │
│  (Admin can customize these rules)  │
│                                     │
└─────────────────────────────────────┘
          │
          ▼
      ✅ READY
```

### Price Update Workflow (Ongoing)

```
Admin receives new price list from suppliers
        │
        ▼
Admin updates prices in dashboard
        │
        ├──→ Panel price changed
        ├──→ Inverter price changed
        └──→ Accessory price changed
        │
        ▼
System logs the change:
  - Who changed
  - What changed
  - Old price → New price
  - Timestamp
        │
        ▼
Future quotations automatically use new prices
(Existing unpaid quotations remain at old price until admin decides)
```

---

## Workflow 2: Customer Journey (WhatsApp)

```
Customer sends message on WhatsApp:
  "I want to install solar panels"
  "Mujhe solar lagwana hai"
  "Solar ke rates kya hain?"
        │
        ▼
┌─────────────────────────────────────────┐
│  AI GREETING                            │
│                                         │
│  "Assalam o Alaikum! ☀️                 │
│   Welcome to [Company Name].            │
│   I'll help you find the perfect        │
│   solar solution for your home.         │
│                                         │
│   First, could you share your           │
│   latest electricity bill?              │
│   You can upload a photo or PDF."       │
│                                         │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   Uploads bill         Types manually
        │                   │
        ▼                   ▼
┌─────────────────┐  ┌──────────────────┐
│  OCR EXTRACTION │  │  ASK DETAILS     │
│                 │  │                  │
│  Extract:       │  │  "What was your  │
│  - Name         │  │   average monthly │
│  - Meter #      │  │   electricity     │
│  - Units used   │  │   bill?"          │
│  - Bill date    │  │                  │
│  - Connection   │  └────────┬─────────┘
│    type         │           │
└────────┬────────┘           │
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────┐
│  DATA CAPTURE PHASE                      │
│                                          │
│  System asks remaining questions:        │
│                                          │
│  1. "What is your monthly consumption   │
│      in units (kWh)?"                    │
│                                          │
│  2. "Where is your property located?     │
│      (City)"                             │
│                                          │
│  3. "What is your available roof area?   │
│      (Approximate sq. feet)"             │
│                                          │
│  4. "What is your budget range?"         │
│      a) Under Rs 500K                   │
│      b) Rs 500K - 1M                   │
│      c) Rs 1M - 2M                     │
│      d) Rs 2M+                          │
│      e) Not sure yet                    │
│                                          │
│  5. "What type of system do you prefer?" │
│      a) On-grid (no battery)            │
│      b) Hybrid (with battery)           │
│      c) Off-grid (full backup)          │
│      d) Not sure — recommend me         │
│                                          │
│  6. "Do you want battery backup?"        │
│      a) Yes, full backup                │
│      b) Yes, partial (essential loads)  │
│      c) No backup needed                │
│                                          │
│  7. "What major appliances do you run?"  │
│      (AC, fridge, washer, pump, etc.)   │
│                                          │
│  8. "Any panel brand preference?"        │
│      a) No preference                   │
│      b) JA Solar / Canadian / Jinko etc │
│                                          │
│  9. "Any inverter brand preference?"     │
│      a) No preference                   │
│      b) Growatt / Huawei / Sungrow etc  │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  AI QUALIFICATION                        │
│                                          │
│  System validates:                       │
│  ✅ Consumption data is valid            │
│  ✅ Location is serviceable              │
│  ✅ Budget is realistic for requirements │
│  ✅ Roof area is sufficient              │
│                                          │
│  IF invalid → ask clarifying questions   │
│  IF valid → proceed to quotation        │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  AI RESPONSE:                            │
│                                          │
│  "Thank you! Based on your information:  │
│                                          │
│   📊 Monthly consumption: ~600 kWh      │
│   📍 Location: Lahore                    │
│   🏠 Roof area: 1200 sq ft              │
│   💰 Budget: Rs 1M - 2M                │
│   ⚡ Preference: Hybrid                 │
│                                          │
│   I'm preparing your personalized       │
│   solar quotation. This will take       │
│   just a moment..."                      │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         [QUOTATION ENGINE]
         (Workflow 3 below)
                  │
                  ▼
┌─────────────────────────────────────────┐
│  QUOTATION DELIVERY                      │
│                                          │
│  AI sends:                               │
│                                          │
│  "Here's your solar proposal ☀️"        │
│                                          │
│  [Quotation PDF attached]               │
│                                          │
│  "Recommended: 6kW Hybrid System        │
│   Estimated monthly savings: Rs 25,000  │
│   Payback period: ~3.5 years            │
│                                          │
│   Would you like to:                    │
│   1️⃣ Talk to our sales team            │
│   2️⃣ Schedule a site visit             │
│   3️⃣ Ask questions                     │
│   4️⃣ Get a revised quotation"          │
│                                          │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼──────────┬──────────────┐
        │         │          │              │
        ▼         ▼          ▼              ▼
   Talk to    Schedule    Ask questions  Revised
   sales      site visit                 quotation
        │         │          │              │
        ▼         ▼          ▼              ▼
   [Assigned   [Booked    [AI answers    [Re-run
    to sales    in CRM]    or escalates]  quotation
    person]                            with changes]
```

---

## Workflow 3: Quotation Engine

```
Receives qualified customer data
        │
        ▼
┌─────────────────────────────────────────┐
│  SYSTEM SIZING                           │
│                                          │
│  Input:                                  │
│  - Monthly consumption: 600 kWh         │
│  - System type: Hybrid                  │
│  - Location: Lahore (peak sun: 5-6 hrs) │
│                                          │
│  Calculation:                            │
│  - Daily consumption: 600/30 = 20 kWh   │
│  - Required system: 20/5.5 = ~3.6 kW   │
│  - With buffer (1.2x): ~4.3 kW         │
│  - Nearest standard: 5kW or 6kW         │
│                                          │
│  Selected: 6kW Hybrid System            │
│  (rounded up for future expansion)      │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  COMPONENT SELECTION                     │
│                                          │
│  Panels:                                │
│  - 6kW / 585W = 10.25 panels           │
│  - Round up: 11 panels                  │
│  - Actual capacity: 11 × 585 = 6.435 kW│
│                                          │
│  Inverter:                              │
│  - Matched: 6kW Hybrid Inverter         │
│  - Brand: Growatt SPH6000TL3           │
│                                          │
│  Battery:                               │
│  - For hybrid: 1 × 51.2V 100Ah         │
│  - (or as per customer preference)      │
│                                          │
│  Structure:                             │
│  - 11 panels × mounting kit            │
│  - Type: Tilted (optimal for Lahore)   │
│                                          │
│  Cables:                                │
│  - DC: ~30 meters (panel to inverter)  │
│  - AC: ~15 meters (inverter to DB)     │
│                                          │
│  Protection:                            │
│  - DC Distribution Box                 │
│  - AC Distribution Box                 │
│  - Surge Protection Device             │
│  - DC Fuses                            │
│  - AC Breaker                          │
│                                          │
│  Other:                                │
│  - Earthing kit (2 rods)               │
│  - Lightning arrester                  │
│  - Cable trays/conduits                │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  COST CALCULATION                        │
│                                          │
│  ┌────────────────────┬───────┬────────┐│
│  │ Item               │ Qty   │ Cost   ││
│  ├────────────────────┼───────┼────────┤│
│  │ 585W Solar Panel   │ 11    │ 308,000││
│  │ 6kW Hybrid Inverter│ 1     │ 185,000││
│  │ 51.2V 100Ah Battery│ 1     │ 210,000││
│  │ Mounting Structure │ 1 set │  65,000││
│  │ DC Cable (30m)     │ 30m   │  12,000││
│  │ AC Cable (15m)     │ 15m   │   7,500││
│  │ DC Distribution Box│ 1     │   8,000││
│  │ AC Distribution Box│ 1     │  12,000││
│  │ Surge Protection   │ 2     │   6,000││
│  │ Earthing Kit       │ 1 set │   5,000││
│  │ Lightning Arrester │ 1     │   4,000││
│  │ Cable Trays        │ 1 lot │   8,000││
│  ├────────────────────┼───────┼────────┤│
│  │ Equipment Subtotal │       │ 830,500││
│  ├────────────────────┼───────┼────────┤│
│  │ Installation Labor │ 6 kW  │  60,000││
│  │ Transportation     │ 1     │  15,000││
│  │ Commissioning      │ 1     │  10,000││
│  ├────────────────────┼───────┼────────┤│
│  │ Services Subtotal  │       │  85,000││
│  ├────────────────────┼───────┼────────┤│
│  │ Subtotal           │       │ 915,500││
│  │ Company Margin (8%)│       │  73,240││
│  │ GST (17%)          │       │ 167,875││
│  ├────────────────────┼───────┼────────┤│
│  │ TOTAL              │       │1,156,615│
│  └────────────────────┴───────┴────────┘│
│                                          │
│  Monthly savings estimate: Rs 25,000    │
│  Annual savings: Rs 300,000             │
│  Payback period: ~3.9 years            │
│  System warranty: 25 years (panels)    │
│  Inverter warranty: 10 years           │
│  Battery warranty: 10 years            │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  GENERATE PDF QUOTATION                  │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │  [COMPANY LOGO]                 │    │
│  │  [Company Name]                 │    │
│  │  [Contact Details]              │    │
│  │  [GST #: xxxxxxx]               │    │
│  ├─────────────────────────────────┤    │
│  │  QUOTATION                      │    │
│  │  Ref: QT-2026-0042             │    │
│  │  Date: 14 Sep 2026             │    │
│  │  Valid Until: 29 Sep 2026      │    │
│  ├─────────────────────────────────┤    │
│  │  CLIENT DETAILS                 │    │
│  │  Name: [Customer]              │    │
│  │  Location: [City]              │    │
│  │  Consumption: [Units]/month    │    │
│  ├─────────────────────────────────┤    │
│  │  RECOMMENDED SYSTEM             │    │
│  │  Type: 6kW Hybrid              │    │
│  │                                 │    │
│  │  [System diagram/image]        │    │
│  │                                 │    │
│  │  Solar Panels: 11 × 585W      │    │
│  │  Total Capacity: 6.435 kW     │    │
│  │  Inverter: 6kW Hybrid         │    │
│  │  Battery: 5.12 kWh            │    │
│  ├─────────────────────────────────┤    │
│  │  COST BREAKDOWN                 │    │
│  │  [Itemized table]              │    │
│  │  Total: Rs 1,156,615          │    │
│  ├─────────────────────────────────┤    │
│  │  SAVINGS PROJECTION             │    │
│  │  Monthly: Rs 25,000           │    │
│  │  Annual: Rs 300,000           │    │
│  │  Payback: ~3.9 years          │    │
│  ├─────────────────────────────────┤    │
│  │  TERMS & CONDITIONS             │    │
│  │  1. Quotation valid 15 days    │    │
│  │  2. 50% advance required       │    │
│  │  3. Installation: 3-5 days     │    │
│  │  4. [Other terms]              │    │
│  ├─────────────────────────────────┤    │
│  │  [Bank Details]                │    │
│  │  [Signature]                   │    │
│  └─────────────────────────────────┘    │
│                                          │
└─────────────────────────────────────────┘
```

---

## Workflow 4: Lead CRM Pipeline

```
                    ┌──────────┐
                    │   NEW    │
                    │  (Auto)  │
                    └────┬─────┘
                         │
                    Bot collects info
                    & generates quote
                         │
                         ▼
                ┌─────────────────┐
                │   QUALIFIED     │
                │  (Auto)         │
                │                 │
                │ Bill uploaded   │
                │ Details taken   │
                │ Quote ready     │
                └────────┬────────┘
                         │
                   Quote generated
                   & sent to customer
                         │
                         ▼
                ┌─────────────────┐
                │    QUOTED       │
                │  (Auto)         │
                │                 │
                │ PDF delivered   │
                │ via WhatsApp    │
                └────────┬────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌──────────┐
        │INTERESTED│ │NO      │ │NEGOTIATION│
        │          │ │RESPONSE│ │           │
        │Customer  │ │        │ │Customer   │
        │says yes  │ │3 days  │ │wants      │
        │or asks   │ │silence │ │discount   │
        │questions │ │        │ │or changes │
        └────┬─────┘ └───┬────┘ └─────┬─────┘
             │            │            │
             │       AI follow-up      │
             │       sequence          │
             │            │            │
             ▼            ▼            ▼
        ┌─────────────────────────────────┐
        │         NEGOTIATING             │
        │                                 │
        │  Salesperson engaged            │
        │  Adjusting quotation if needed  │
        │  Site visit scheduled           │
        └───────────────┬─────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
     ┌──────────────┐    ┌──────────────┐
     │     WON      │    │     LOST     │
     │              │    │              │
     │ Deposit paid │    │ Customer     │
     │ Installation │    │ declined     │
     │ scheduled    │    │              │
     └──────┬───────┘    │ Reason:      │
            │            │ - Too        │
            │            │   expensive  │
            │            │ - Changed    │
            │            │   mind       │
            │            │ - Went with  │
            │            │   competitor │
            │            └──────────────┘
            ▼
     ┌──────────────┐
     │  INSTALLED   │
     │              │
     │ System live  │
     │ Commissioned │
     │ Warranty     │
     │ starts       │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  COMPLETED   │
     │              │
     │ Post-install │
     │ follow-up    │
     │ Referral ask │
     └──────────────┘
```

---

## Workflow 5: Automated Follow-Up Engine

```
Quote sent to customer
        │
        ▼
┌─────────────────────────────────────────┐
│  FOLLOW-UP SEQUENCE STARTS              │
│                                          │
│  Day 0: Quotation delivered ✓           │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  DAY 1 — Check-in                       │
│                                          │
│  "Hi [Name], hope you're well!          │
│   Just wanted to check if you had       │
│   a chance to review your solar         │
│   proposal? Happy to answer any         │
│   questions."                           │
│                                          │
│  ┌──────────┐                           │
│  │Customer  │                           │
│  │responded?│                           │
│  └────┬─────┘                           │
│       │                                  │
│   YES │    NO → Continue sequence       │
│       ▼                                  │
│  Update lead status                     │
│  Log conversation                      │
│                                          │
└─────────────────┬───────────────────────┘
                  │ (if no response)
                  ▼
┌─────────────────────────────────────────┐
│  DAY 3 — Value add                      │
│                                          │
│  "Hi [Name], here's a quick             │
│   calculation of your expected          │
│   savings with the proposed system:     │
│                                          │
│   💡 Current bill: ~Rs 45,000/month    │
│   ☀️ After solar: ~Rs 15,000/month     │
│   💰 Monthly savings: Rs 30,000        │
│   📅 Annual savings: Rs 3,60,000       │
│                                          │
│   Would love to discuss further."       │
│                                          │
└─────────────────┬───────────────────────┘
                  │ (if no response)
                  ▼
┌─────────────────────────────────────────┐
│  DAY 5 — Urgency / social proof         │
│                                          │
│  "Hi [Name], just a heads up —          │
│   we have a batch of panels reserved    │
│   at current pricing. Prices may        │
│   adjust next month.                    │
│                                          │
│   Also, we recently installed a         │
│   similar system for a family in        │
│   [Area]. They're saving Rs 28K/month.  │
│                                          │
│   Would you like to lock in your        │
│   system at today's rates?"             │
│                                          │
└─────────────────┬───────────────────────┘
                  │ (if no response)
                  ▼
┌─────────────────────────────────────────┐
│  DAY 7 — Alert to salesperson           │
│                                          │
│  🔔 NOTIFICATION TO SALESPERSON:        │
│                                          │
│  "⚠️ [Customer Name] hasn't responded   │
│   in 6 days.                            │
│                                          │
│   Lead temperature: Warm → Cooling      │
│   Quotation sent: 7 days ago            │
│   Last interaction: 5 days ago          │
│                                          │
│   Recommended action:                   │
│   📞 Call customer directly             │
│   📧 Send WhatsApp voice note           │
│   🏠 Schedule site visit"              │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  DAY 14 — Final attempt                 │
│                                          │
│  "Hi [Name], we haven't heard from you  │
│   in a while. No worries at all!        │
│                                          │
│   Just wanted to let you know your      │
│   quotation is ready whenever you are.  │
│   If your requirements have changed,    │
│   I'd be happy to prepare a new         │
│   proposal.                             │
│                                          │
│   Feel free to reach out anytime.       │
│   Wishing you all the best! ☀️"        │
│                                          │
│  Lead status → DORMANT                  │
│                                          │
└─────────────────────────────────────────┘
```

---

## Workflow 6: Site Visit & Installation (Post-Sale)

```
Customer says YES / Deposit received
        │
        ▼
┌─────────────────────────────────────────┐
│  SITE VISIT SCHEDULED                    │
│                                          │
│  Salesperson assigns:                    │
│  - Date & time                          │
│  - Technical team member                │
│  - Site address                         │
│  - Customer contact                     │
│                                          │
│  CRM status → "Site Visit Scheduled"    │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  SITE ASSESSMENT                         │
│                                          │
│  Technical team visits and checks:       │
│  ✅ Roof condition & angle              │
│  ✅ Shading analysis                    │
│  ✅ Electrical panel capacity           │
│  ✅ Wiring distance                     │
│  ✅ Structural load capacity            │
│  ✅ Confirm system sizing               │
│                                          │
│  Upload photos to CRM                   │
│  Any adjustments → update quotation     │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  FINAL QUOTATION CONFIRMED               │
│                                          │
│  - Final amount confirmed               │
│  - Payment terms agreed                 │
│  - Installation date set                │
│  - Contract signed                      │
│                                          │
│  CRM status → "Contract Signed"         │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  INSTALLATION                            │
│                                          │
│  Day 1: Structure mounting              │
│  Day 2: Panel installation              │
│  Day 3: Inverter + battery setup        │
│  Day 4: Wiring (DC + AC)               │
│  Day 5: Protection systems + earthing   │
│                                          │
│  CRM status → "Under Installation"      │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  COMMISSIONING                           │
│                                          │
│  ✅ System testing                      │
│  ✅ Grid connection (if on-grid/hybrid) │
│  ✅ Net metering application            │
│  ✅ Performance verification            │
│  ✅ Customer walkthrough                │
│  ✅ Handover documentation              │
│                                          │
│  CRM status → "Installed"               │
│                                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  POST-INSTALLATION                       │
│                                          │
│  Day 7: Follow-up call                  │
│  Day 30: Performance check              │
│  Day 90: Maintenance reminder           │
│  Day 180: Service review                │
│                                          │
│  Ask for:                               │
│  ⭐ Google review                       │
│  📢 Referral                            │
│  📸 Testimonial (with permission)       │
│                                          │
│  CRM status → "Completed"               │
│                                          │
└─────────────────────────────────────────┘
```

---

## Workflow 7: Admin Dashboard Real-Time View

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                              │
│                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  NEW LEADS  │ │  QUOTED     │ │  WON        │            │
│  │     12      │ │     8       │ │     3       │            │
│  │  this week  │ │  pending    │ │  this month │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  PIPELINE VALUE                                       │    │
│  │                                                       │    │
│  │  New:         Rs 4.2M  (12 leads)                    │    │
│  │  Quoted:      Rs 8.6M  (8 quotes)                   │    │
│  │  Negotiating: Rs 3.1M  (5 deals)                    │    │
│  │  Won:         Rs 4.2M  (3 deals)                    │    │
│  │  ─────────────────────────────────────               │    │
│  │  Total Pipeline: Rs 20.1M                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  SALES TEAM PERFORMANCE                               │    │
│  │                                                       │    │
│  │  Ahmed:   5 leads → 3 quoted → 1 won  (20% conv)    │    │
│  │  Usman:   4 leads → 2 quoted → 1 won  (25% conv)    │    │
│  │  Bilal:   3 leads → 3 quoted → 1 won  (33% conv)    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  PRICE ALERTS                                         │    │
│  │                                                       │    │
│  │  ⚠️ Panel prices increased 8% last month             │    │
│  │  📊 Quotation values trending up                     │    │
│  │  💡 Consider adjusting margins                       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  RECENT ACTIVITY                                      │    │
│  │                                                       │    │
│  │  10:32  New lead: Ali (WhatsApp)                     │    │
│  │  10:15  Quote sent: Rs 1.2M (6kW Hybrid)            │    │
│  │  09:48  Follow-up: Ahmed (3 days since quote)        │    │
│  │  09:30  Price update: Inverter 6kW → Rs 185K        │    │
│  │  09:15  Site visit completed: Usman's client         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
CUSTOMER (WhatsApp)
    │
    │ Bill upload / messages
    ▼
WHATSAPP AI
    │
    │ Extracted data + answers
    ▼
LEAD CRM ←────────────── ADMIN (prices, rules)
    │                         │
    │ Customer requirements    │ Live pricing
    ▼                         ▼
QUOTATION ENGINE ◄────── PRICE DATABASE
    │
    │ Calculated costs
    ▼
PDF GENERATOR
    │
    │ Professional quotation
    ▼
WHATSAPP AI
    │
    │ Delivers to customer
    ▼
CUSTOMER receives quote
    │
    │ Response
    ▼
LEAD CRM (status update)
    │
    │ Notifications
    ▼
SALESPERSON (dashboard)
    │
    │ Actions
    ▼
FOLLOW-UP ENGINE
    │
    │ Automated messages
    ▼
CUSTOMER (follow-up)
    │
    │ Decision
    ▼
PIPELINE UPDATE ──→ ADMIN DASHBOARD
```

---

## System States

### Lead States
| State | Description |
|-------|-------------|
| `NEW` | Just entered via WhatsApp or manual entry |
| `BILL_UPLOADED` | Customer uploaded electricity bill |
| `QUALIFYING` | AI is collecting information |
| `QUALIFIED` | All info collected, ready for quotation |
| `QUOTED` | Quotation generated and sent |
| `INTERESTED` | Customer responded positively |
| `NEGOTIATING` | Discussing terms / price / changes |
| `SITE_VISIT_SCHEDULED` | Technical visit booked |
| `SITE_VISIT_DONE` | Assessment complete |
| `CONTRACT_SIGNED` | Deal confirmed, payment received |
| `UNDER_INSTALLATION` | Work in progress |
| `INSTALLED` | System live, commissioning done |
| `COMPLETED` | Post-installation follow-up done |
| `DORMANT` | No response after follow-ups |
| `LOST` | Customer declined (with reason) |

### Quotation States
| State | Description |
|-------|-------------|
| `DRAFT` | Being generated |
| `SENT` | Delivered to customer |
| `VIEWED` | Customer opened/viewed (if trackable) |
| `ACCEPTED` | Customer approved |
| `REVISION_REQUESTED` | Customer wants changes |
| `EXPIRED` | Validity period over |
| `ACCEPTED_WITH_CHANGES` | Modified version approved |

---

## API Endpoints (Preview)

```
POST   /api/auth/register          — Company registration
POST   /api/auth/login             — Login
GET    /api/auth/me                — Current user

GET    /api/products               — List all products
POST   /api/products               — Add product
PUT    /api/products/:id           — Update product
DELETE /api/products/:id           — Remove product
PUT    /api/products/prices/bulk   — Bulk price update

GET    /api/leads                  — List leads
POST   /api/leads                  — Create lead
GET    /api/leads/:id              — Lead detail
PUT    /api/leads/:id              — Update lead
GET    /api/leads/:id/activity     — Lead activity log

POST   /api/quotations/generate    — Generate quotation
GET    /api/quotations/:id         — Get quotation
GET    /api/quotations/:id/pdf     — Download PDF
PUT    /api/quotations/:id/revise  — Revise quotation

POST   /api/webhooks/whatsapp      — WhatsApp webhook
POST   /api/webhooks/whatsapp/media — Bill upload handler

GET    /api/dashboard/stats        — Dashboard statistics
GET    /api/dashboard/pipeline     — Pipeline data
GET    /api/dashboard/team         — Team performance

GET    /api/reports/conversion     — Conversion reports
GET    /api/reports/revenue        — Revenue reports
GET    /api/reports/pricing        — Pricing history
```
