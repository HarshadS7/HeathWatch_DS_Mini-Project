"""
Records real traces from the native engine for the Structure Lab's default inputs.
They are used ONLY when the WebAssembly engine is not built yet (dev fallback),
and the UI labels them "recorded engine trace".

    python engine/record_fixtures.py
"""
import csv, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "engine", "build", "heatwatch_engine.exe" if os.name == "nt" else "heatwatch_engine")
SAMPLE = json.load(open(os.path.join(ROOT, "frontend", "src", "lib", "mock", "sample.json")))
ST = SAMPLE["stations"]
D = SAMPLE["dates"]

proc = subprocess.Popen([EXE], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
seq = 0
def call(op, payload, trace=False):
    global seq
    seq += 1
    proc.stdin.write(json.dumps({"id": f"rec{seq}", "op": op, "payload": payload, "trace": trace}) + "\n")
    proc.stdin.flush()
    r = json.loads(proc.stdout.readline())
    if not r["ok"]:
        raise RuntimeError(op + ": " + r["error"])
    return r

di = lambda iso: int(iso.replace("-", ""))
oid = lambda d, si: d * 100 + si + 1
def readings(sid, start, end):
    si = next(i for i, s in enumerate(ST) if s["id"] == sid)
    return [{"id": oid(d, si), "date": di(D[d]), "t": SAMPLE["temps"][d][si]} for d in range(D.index(start), D.index(end) + 1) if SAMPLE["temps"][d][si] is not None]

call("init", {"stations": [{k: s[k] for k in ("id", "name", "lat", "lon")} for s in ST], "queueCapacity": 24, "historyLimit": 30, "edgeKm": 450})
last = {}
for d in range(D.index("2024-05-27") + 1):  # replay up to the 2024 heatwave peak
    for si, s in enumerate(ST):
        t = SAMPLE["temps"][d][si]
        if t is None:
            continue
        while not call("ingest", {"obs": {"id": oid(d, si), "station": s["id"], "date": di(D[d]), "t": t}})["result"]["accepted"]:
            call("process", {"max": 24})
        last[s["id"]] = t
call("process", {"max": 999})

def tr(structure, op_label, r):
    return {"requestId": r["id"], "structure": structure, "op": op_label, "engineTimeMs": r.get("engineTimeMs", 0),
            "truncated": r["trace"]["truncated"], "source": "recorded", "steps": r["trace"]["steps"], "result": r["result"]}

F = {}
dl = readings("DEL", "2024-05-20", "2024-05-27")
F["list.demo"] = tr("list", "append", call("list.demo", {"limit": 5, "items": [{"id": x["id"], "stationId": "DEL", "date": x["date"], "temperatureC": x["t"]} for x in dl]}, True))
bst_rows = readings("DEL", "2024-05-13", "2024-05-27")
for order in ("balanced", "chronological"):
    F["bst.demo:" + order] = tr("bst", "range", call("bst.demo", {"readings": bst_rows, "order": order, "query": "range", "from": 20240520, "to": 20240524}, True))
best = max((s["id"] for s in ST), key=lambda k: call("hash.lookup", {"key": k})["result"]["probes"])
F["hash.lookup"] = tr("hash", "lookup", call("hash.lookup", {"key": best}, True))
hot = [k for k, t in last.items() if t >= 40]
for algo in ("bfs", "dfs"):
    F["graph.components:" + algo] = tr("graph", algo, call("graph.components", {"hot": hot, "algorithm": algo}, True))
sv = readings("DEL", "2024-05-16", "2024-05-27")
srt = call("sort.merge", {"values": sv, "key": "t"}, True)
F["sort.merge"] = tr("sort", "sort", srt)
sorted_vals = [{"id": v["id"], "date": int(v["date"].replace("-", "")), "t": v["t"]} for v in srt["result"]["sorted"]]
F["search.binary"] = tr("sort", "search", call("search.binary", {"values": sorted_vals, "key": "t", "target": sorted_vals[8]["t"]}, True))
F["stack.eval"] = tr("stack", "eval", call("stack.eval", {"expr": "(t - normal) * 2 + 1", "vars": {"t": 45.1, "normal": 40.5}}, True))
F["_meta"] = {"hashKey": best, "hot": hot}

out = os.path.join(ROOT, "frontend", "src", "lib", "mock", "fixtures.json")
json.dump(F, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
proc.stdin.close()
print({k: len(v["steps"]) for k, v in F.items() if k != "_meta"}, F["_meta"], "->", os.path.getsize(out) // 1024, "KB")
