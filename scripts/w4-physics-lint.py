#!/usr/bin/env python3
"""Pre-audit physics lint for W4 catalog batches.

Per-family value-range and consistency invariants (judge's lesson from wave 2:
78% of hard rejects were mechanical unit bugs catchable before the adversarial
audit). Usage: w4-physics-lint.py <batch-dir-or-jsonl>...
Exits 1 if any violation; prints JSON report {checked, violations:[...]}.
"""
import json, sys, glob, os

def num(a, *keys):
    for k in keys:
        v = a.get(k)
        if isinstance(v, (int, float)):
            return float(v)
    return None

def check(fam, key, a, label):
    v = []
    def bad(rule): v.append(rule)
    if fam == "interior_doors":
        w, h = num(a, "width_mm"), num(a, "height_mm")
        if w and not (400 <= w <= 1200): bad(f"width_mm={w}")
        if h and not (1800 <= h <= 2400): bad(f"height_mm={h}")
    elif fam == "radiators_heating":
        s, p = num(a, "sections"), num(a, "heat_output_w")
        if s and p and s >= 2 and not (80 <= p / s <= 250): bad(f"w_per_section={p/s:.0f}")
        if p and p > 5000: bad(f"heat_output_w={p}")
    elif fam == "water_heaters":
        t = str(a.get("heater_type", ""))
        p, vol = num(a, "power_kw"), num(a, "volume_l")
        if "накопит" in t and p and p > 6: bad(f"storage power_kw={p}")
        if "проточ" in t and p and p < 3: bad(f"tankless power_kw={p}")
        if vol and not (5 <= vol <= 300): bad(f"volume_l={vol}")
    elif fam == "laundry_appliances":
        spin, load = num(a, "spin_rpm"), num(a, "load_kg")
        if spin and not (600 <= spin <= 1800): bad(f"spin_rpm={spin}")
        if load and not (3 <= load <= 15): bad(f"load_kg={load}")
    elif fam == "smart_home_devices":
        f_ = num(a, "frequency_mhz")
        if f_ and f_ not in (868, 2400, 5000): bad(f"frequency_mhz={f_}")
    elif fam == "cables_wires":
        s = num(a, "section_mm2")
        if s and s not in (0.5, 0.75, 1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0): bad(f"section_mm2={s}")
        c = num(a, "cores")
        if c and not (1 <= c <= 5): bad(f"cores={c}")
    elif fam == "measuring_tools":
        r, acc = num(a, "range_m"), num(a, "accuracy_mm")
        if r and r > 300: bad(f"range_m={r}")
        if acc and acc > 10: bad(f"accuracy_mm={acc}")
    elif fam == "tv_audio":
        d = num(a, "diagonal_inch")
        if d and not (10 <= d <= 100): bad(f"diagonal_inch={d}")
    elif fam == "fasteners":
        dmm, lmm = num(a, "diameter_mm"), num(a, "length_mm")
        if dmm and not (1 <= dmm <= 24): bad(f"diameter_mm={dmm}")
        if lmm and not (6 <= lmm <= 400): bad(f"length_mm={lmm}")
    elif fam == "dry_mixes":
        w = num(a, "weight_kg")
        if w and not (1 <= w <= 50): bad(f"weight_kg={w}")
    elif fam == "insulation":
        d = num(a, "density_kg_m3")
        if d and not (8 <= d <= 250): bad(f"density_kg_m3={d}")
    elif fam == "windows_glazing":
        ch = num(a, "chambers")
        if ch and not (2 <= ch <= 8): bad(f"chambers={ch}")
    # generic: any *_mm/_cm negative or zero
    for k, val in a.items():
        if isinstance(val, (int, float)) and val <= 0 and any(k.endswith(s) for s in ("_mm", "_cm", "_m", "_kg", "_w", "_kw", "_l")):
            bad(f"{k}={val} nonpositive")
    return v

def main():
    checked = 0
    violations = []
    for arg in sys.argv[1:]:
        files = [os.path.join(arg, "records.jsonl")] if os.path.isdir(arg) else [arg]
        for f in files:
            for line in open(f):
                if not line.strip():
                    continue
                r = json.loads(line)
                checked += 1
                a = r.get("payload", {}).get("attributes", {})
                for rule in check(r.get("familyKey", ""), r["key"], a, r["labels"]["default"]):
                    violations.append({"key": r["key"], "family": r.get("familyKey"), "rule": rule})
    print(json.dumps({"checked": checked, "violations": violations}, ensure_ascii=False))
    sys.exit(1 if violations else 0)

if __name__ == "__main__":
    main()
