#!/usr/bin/env python3
"""
Fidato - Feature Coverage Analyzer
Scans each main module's source files, extracts the features/functionality
present, and detects gaps (CRUD vs read-only, missing export/automation,
missing data flows) for future product improvements.
Output: docs/feature-coverage-report.md
"""
import os
import re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = os.path.join(ROOT, "src", "app", "(app)")
COMP_DIR = os.path.join(ROOT, "src", "components")

MODULES = {
    "dashboard":   ("dashboard",     ["page.tsx"]),
    "leads":       ("leads",         ["page.tsx", "LeadsClient.tsx"]),
    "clients":     ("clients",       ["page.tsx", "ClientsClient.tsx"]),
    "pnl":         ("pnl",           ["page.tsx", "PnLClient.tsx"]),
    "content-hub": ("content-hub",   ["page.tsx", "ContentHubClient.tsx"]),
    "recruitment": ("recruitment",   ["page.tsx", "RecruitmentClient.tsx"]),
    "database":    ("database",      ["page.tsx", "DatabaseClient.tsx"]),
    "transactions":("transactions",  ["page.tsx", "TransactionsClient.tsx"]),
}

# keyword -> feature label map
FEATURE_KEYWORDS = {
    "create":        "create",
    "insert":        "create",
    "update":        "update",
    "handleUpdate":  "update",
    "delete":        "delete",
    "remove":        "delete",
    "select":        "read",
    "search":        "search",
    "filter":        "filter",
    "export":        "export",
    "download":      "export",
    "csv":           "csv-import/export",
    "import":        "csv-import/export",
    "xlsx":          "csv-import/export",
    "automation":    "automation",
    "cadence":       "followup-cadence",
    "schedule":      "followup-cadence",
    "webhook":       "webhook/automation",
    "chart":         "chart",
    "report":        "report",
    "breakdown":     "breakdown",
    "share":         "share",
    "whatsapp":      "whatsapp",
    "email":         "email",
    "activity_log":  "activity-log",
    "note":          "notes",
    "task":          "task",
    "reminder":      "reminder",
    "template":      "templates",
    "settings":      "settings",
    "notification":  "notification",
    "kanban":        "kanban",
    "dupe":          "dupe-detection",
}

# ideal core features per module
EXPECTED = {
    "dashboard":   ["kpis", "chart", "recent-activity", "followup-cadence"],
    "leads":       ["create", "update", "delete", "read",
                    "csv-import/export", "followup-cadence", "kanban",
                    "dupe-detection", "activity-log", "whatsapp"],
    "clients":     ["create", "update", "delete", "read", "search",
                    "activity-log", "export"],
    "pnl":         ["create", "update", "delete", "export", "chart"],
    "content-hub": ["create", "update", "delete", "templates", "share",
                    "whatsapp", "email", "activity-log"],
    "recruitment": ["create", "update", "delete", "search", "activity-log"],
    "database":    ["read", "export", "search", "report", "csv-import/export"],
}

EXTRA_COMPONENTS = {
    "leads":       ["KanbanBoard.tsx", "ImportLeadsModal.tsx", "FollowUpCadence.tsx",
                    "LeadModal.tsx", "WonConversionModal.tsx", "leads/ImportLeadsModal.tsx"],
    "content-hub": ["ShareLinkModal.tsx", "TemplateModal.tsx", "UseTemplateModal.tsx"],
    "dashboard":   ["StatCard.tsx", "RevenueChart.tsx", "LeadSourceChart.tsx",
                    "RecentActivity.tsx", "TodayFollowUps.tsx"],
}


def read(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return "// ERROR reading: %s" % e


def analyze_module(name, rel_dir, files):
    content = ""
    listing = []
    for fn in files:
        full = os.path.join(APP_DIR, rel_dir, fn)
        listing.append(fn)
        content += "\n/* FILE: %s */\n" % fn + read(full)

    found = defaultdict(int)
    for kw, label in FEATURE_KEYWORDS.items():
        cnt = len(re.findall(r"\b" + re.escape(kw) + r"\b", content, flags=re.I))
        # fold in related components
        for comp in EXTRA_COMPONENTS.get(name, []):
            cpath = os.path.join(COMP_DIR, comp)
            if os.path.exists(cpath):
                cnt += len(re.findall(r"\b" + re.escape(kw) + r"\b",
                                      read(cpath), flags=re.I))
        if cnt > 0:
            found[label] += cnt

    markers = {
        "uses supabase": "createClient" in content or "supabase" in content.lower(),
        "server-render": "force-dynamic" in content,
        "has modal": bool(re.search(r"(<Modal|modalOpen|setModalOpen)", content)),
        "has export": bool(re.search(r"(export|download|toCSV|toCsv|Blob)", content, re.I)),
    }
    return listing, dict(found), markers, len(content)


def detect_gaps(name, feats):
    gaps = []
    present = set(feats.keys())
    for feat in EXPECTED.get(name, []):
        if feat not in present:
            gaps.append(feat)
    # targeted gap notes
    if name == "clients" and "activity-log" not in present:
        gaps.append("client interaction history / activity log")
    if name == "pnl" and "export" not in present:
        gaps.append("PnL export to CSV/XLSX for tax filing")
    if name == "dashboard":
        gaps.append("global quick-search across leads/clients/recruits")
    if name == "content-hub" and "report" not in present:
        gaps.append("share-link open/click analytics")
    seen = set()
    uniq = []
    for g in gaps:
        if g not in seen:
            seen.add(g)
            uniq.append(g)
    return uniq


def main():
    report_lines = []
    report_lines.append("# Fidato - Feature Coverage Report\n")
    report_lines.append(
        "> Generated by `scripts/feature_coverage.py`. Analyzes the source of each "
        "main product module to map current coverage and flag gaps for future product "
        "improvements (referencing the live product at `/sites/Fidato`).\n")
    summary = []
    for name, (rel_dir, files) in MODULES.items():
        listing, feats, markers, size = analyze_module(name, rel_dir, files)
        gaps = detect_gaps(name, feats)
        report_lines.append("\n## Module: `%s`" % name)
        report_lines.append("- **Files analyzed:** %s (+ related `components/`), ~%d chars"
                            % (", ".join("`%s`" % f for f in listing), size))
        report_lines.append("- **Supabase-backed / server data:** %s" % markers["uses supabase"])
        report_lines.append("- **Server-rendered (force-dynamic):** %s" % markers["server-render"])
        if feats:
            top = sorted(feats.items(), key=lambda kv: -kv[1])[:10]
            report_lines.append("- **Detected features** (keyword hits):")
            for label, cnt in top:
                report_lines.append("  - `%s` (%d)" % (label, cnt))
        else:
            report_lines.append("- **Detected features:** none found")
        if gaps:
            report_lines.append("- **Gaps / improvement candidates:**")
            for g in gaps:
                report_lines.append("  - ! %s" % g)
        else:
            report_lines.append("- **Gaps:** none detected (strong module)")
        summary.append((name, len(feats), len(gaps)))

    report_lines.append("\n\n## Coverage Summary\n")
    report_lines.append("| Module | Feature signals | Flags (gaps) |")
    report_lines.append("|--------|----------------|--------------|")
    for name, nfeat, ngap in summary:
        report_lines.append("| %s | %d | %d |" % (name, nfeat, ngap))

    report_lines.append("\n\n## Recommended Next Work (prioritized)\n")
    report_lines.append("1. **Clients - add interaction history / activity log** "
                        "(mostly CRUD + Google-Sheets sync today).")
    report_lines.append("2. **Dashboard - add global quick-search** across leads/clients/recruits.")
    report_lines.append("3. **PnL & Database - one-click CSV/XLSX export + audit snapshot.**")
    report_lines.append("4. **Content-Hub - track share-link open/click analytics.**")
    report_lines.append("\n---\n*Auto-generated report. Re-run `python scripts/feature_coverage.py` to refresh.*")

    out_path = os.path.join(ROOT, "docs", "feature-coverage-report.md")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    print("Report written to docs/feature-coverage-report.md")
    print("\n=== FEATURE SIGNAL COUNTS BY MODULE ===")
    for name, nfeat, ngap in summary:
        print("%-14s features=%3d gaps=%d" % (name, nfeat, ngap))


if __name__ == "__main__":
    main()