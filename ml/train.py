"""
Next-day maximum temperature model for HeatWatch.

Data   : data/sample/observations.csv (IMD gridded daily Tmax, 16 cells, 2015-2025)
Target : Tmax on day d+1 for the same station (only when d-6 .. d+1 are consecutive)
Inputs : t0..t3 (today and 3 previous days), 7-day trailing mean, day-of-year sin/cos
Split  : chronological - train 2015-2022, validation 2023, test 2024-2025
Model  : linear regression (standardised inputs, fit on train only) vs persistence baseline
Output : frontend/public/model.json (coefficients + evaluation), read by the browser.
"""
import csv, datetime, json, os
from collections import defaultdict

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES = ["t0", "t1", "t2", "t3", "mean7", "doy_sin", "doy_cos"]

series = defaultdict(list)
for r in csv.DictReader(open(os.path.join(ROOT, "data", "sample", "observations.csv"))):
    series[r["station_id"]].append((datetime.date.fromisoformat(r["observed_at"]), float(r["temperature_c"])))

rows = []  # (station, target_date, features, target, persistence)
for sid, s in series.items():
    s.sort()
    for i in range(6, len(s) - 1):
        window = s[i - 6 : i + 2]
        if (window[-1][0] - window[0][0]).days != 7:  # gap: do not treat as consecutive
            continue
        t = [v for _, v in window[:-1]][::-1]  # t[0] = today
        target_date, y = window[-1]
        doy = target_date.timetuple().tm_yday
        f = [t[0], t[1], t[2], t[3], sum(t) / 7, np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)]
        rows.append((sid, target_date, f, y, t[0]))

def split(lo, hi):
    sel = [r for r in rows if lo <= r[1].year <= hi]
    return sel, np.array([r[2] for r in sel]), np.array([r[3] for r in sel]), np.array([r[4] for r in sel])

train, Xtr, ytr, _ = split(2015, 2022)
val, Xva, yva, pva = split(2023, 2023)
test, Xte, yte, pte = split(2024, 2025)

scaler = StandardScaler().fit(Xtr)  # fitted on training data only
model = LinearRegression().fit(scaler.transform(Xtr), ytr)
mae = lambda a, b: float(np.mean(np.abs(a - b)))

pred_te = model.predict(scaler.transform(Xte))
per_station = {}
for sid in sorted(series):
    idx = [i for i, r in enumerate(test) if r[0] == sid]
    per_station[sid] = {"n": len(idx), "model": round(mae(pred_te[idx], yte[idx]), 3), "persistence": round(mae(pte[idx], yte[idx]), 3)}

report = {
    "version": "linreg-1",
    "features": FEATURES,
    "mean": scaler.mean_.round(6).tolist(),
    "std": scaler.scale_.round(6).tolist(),
    "coef": model.coef_.round(6).tolist(),
    "intercept": round(float(model.intercept_), 6),
    "evaluation": {
        "target": "next-day maximum temperature (°C)",
        "split": {"train": "2015–2022", "validation": "2023", "test": "2024–2025"},
        "samples": {"train": len(train), "validation": len(val), "test": len(test)},
        "validation": {"model": round(mae(model.predict(scaler.transform(Xva)), yva), 3), "persistence": round(mae(pva, yva), 3)},
        "test": {"model": round(mae(pred_te, yte), 3), "persistence": round(mae(pte, yte), 3)},
        "perStation": per_station,
    },
}
out = os.path.join(ROOT, "frontend", "public", "model.json")
json.dump(report, open(out, "w"), indent=1, ensure_ascii=False)
e = report["evaluation"]
print(f"samples {e['samples']}")
print(f"validation MAE  model {e['validation']['model']}  persistence {e['validation']['persistence']}")
print(f"test MAE        model {e['test']['model']}  persistence {e['test']['persistence']}")
print("->", out)
