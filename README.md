# Delta Gemunupura DBMS — Agile Sprint Structure

**Source project:** `delta-gemunupura-dbms-2026`  
**Sprint window:** 30 June 2026 – 4 July 2026  
**Integration hub:** Mahima (Examination — Main Developer)

## Team assignments

| Member | Role | Module folder |
|--------|------|---------------|
| **Mahima** | Start-Up Manager & Main Developer | `Mahima_Examination/` |
| **Charuni** | Project Manager | `Charuni_Staff/` |
| **Tharindu** | Quality Manager | `Tharindu_Students/` |
| **Minuri** | Risk Manager | `Minuri_Inventory/` |
| **Dulanjali** | Schedule Manager | `Dulanjali_Timetable/` |

## Folder layout

Each module folder contains five daily sub-folders:

```
Agile/
├── Mahima_Examination/
│   ├── 2026-06-30/   ← baseline module transfer (Day 1)
│   ├── 2026-07-01/
│   ├── 2026-07-02/
│   ├── 2026-07-03/
│   └── 2026-07-04/
├── Charuni_Staff/
│   └── … (same dates)
├── Tharindu_Students/
│   └── …
├── Minuri_Inventory/
│   └── …
└── Dulanjali_Timetable/
    └── …
```

## Workflow

1. **Day 1 (2026-06-30):** All existing module source files live in each member's `2026-06-30/` folder, preserving paths relative to the main repo (`app/`, `components/`, `lib/`, `public/`, `types/`).
2. **Days 2–5:** New or changed files go into the matching date folder. Update `DAILY_LOG.md` in that folder every day.
3. **Integration:** Charuni, Tharindu, Minuri, and Dulanjali align their modules with Mahima's Examination hub. See [INTEGRATION.md](./INTEGRATION.md).

## Merging back into the main app

When integrating daily work into `delta-gemunupura-dbms-2026`:

```text
Agile/<Member>_<Module>/<date>/app/        →  app/
Agile/<Member>_<Module>/<date>/components/ →  components/
Agile/<Member>_<Module>/<date>/lib/        →  lib/
```

Mahima's `types/`, `firestore.rules`, and `firestore.indexes.json` are the shared contracts all modules must respect.

## Daily logs

Every date folder has a `DAILY_LOG.md` template. Record tasks, files changed, integration notes, and blockers there.
