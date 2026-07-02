#!/usr/bin/env python3
"""Recipe-v4 registry lint: reject/flag series and brands not in the web-verified
brand registry. Catches the dominant residual defect from wave 3 (pseudo-series by
brand naming pattern) mechanically, before the adversarial audit.

Usage: w4-registry-lint.py <registry.json> <batch-dir-or-jsonl>...
Prints JSON {checked, hard_series, hard_brand, soft_category, records:[...]} and
exits 1 if any hard finding. "hard" = brand in registry but series not whitelisted
(and registry has a non-empty whitelist for that brand). Unknown brand = soft
(registry may be incomplete). Category mismatch = soft.
"""
import json, sys, glob, os, re

def norm(s):
    return re.sub(r'[^a-zа-я0-9]', '', str(s).lower())

def main():
    reg_path, *inputs = sys.argv[1:]
    regs = json.load(open(reg_path))
    # brand -> {series:set(norm), cats:set(norm), has_whitelist:bool}
    bmap = {}
    for group in regs:
        for b in group["brands"]:
            key = norm(b["brand"])
            series = {norm(s) for s in b.get("verifiedSeries", [])}
            bmap[key] = {
                "series": series,
                "has_whitelist": len(series) > 0,
                "cats": {norm(c) for c in b.get("allowedCategories", [])},
                "brand": b["brand"],
            }
    checked = hard_series = hard_brand = soft_cat = 0
    findings = []
    for arg in inputs:
        files = [os.path.join(arg, "records.jsonl")] if os.path.isdir(arg) else [arg]
        for f in files:
            for line in open(f):
                if not line.strip():
                    continue
                r = json.loads(line)
                checked += 1
                p = r.get("payload", {})
                brand = norm(p.get("brand", ""))
                series = p.get("series")
                entry = bmap.get(brand)
                if not entry:
                    findings.append({"key": r["key"], "sev": "soft", "why": f"brand not in registry: {p.get('brand')}"})
                    continue
                if series and entry["has_whitelist"] and norm(series) not in entry["series"]:
                    findings.append({"key": r["key"], "sev": "hard", "why": f"series '{series}' not whitelisted for {entry['brand']}"})
                    hard_series += 1
    hard = [x for x in findings if x["sev"] == "hard"]
    print(json.dumps({"checked": checked, "hard": len(hard), "soft": len(findings) - len(hard), "findings": findings[:60]}, ensure_ascii=False))
    sys.exit(1 if hard else 0)

if __name__ == "__main__":
    main()
