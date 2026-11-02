// HeatWatch engine: request dispatcher + operation traces.
// Protocol: request {"id","op","payload"} -> response {"id","ok","result","trace"|"error"}.
#include "engine.hpp"

#include <chrono>
#include <vector>

#include "json.hpp"
#include "structures.hpp"

using json::Value;
using json::Writer;

namespace hw {
namespace {

// ---------------------------------------------------------------- trace infra
std::string q(const std::string& s) { Writer w; w.str(s); return w.str(); }
std::string num(double d) { Writer w; w.num(d); return w.str(); }
using Fields = std::vector<std::pair<std::string, std::string>>;  // key -> raw JSON
std::string obj(const Fields& f) {
    Writer w;
    w.obj();
    for (auto& kv : f) w.key(kv.first).raw(kv.second);
    w.endObj();
    return w.str();
}

struct Trace {
    bool on = false;
    bool truncated = false;
    std::vector<std::string> steps;
    Fields counters;
    static const size_t CAP = 800;
    void count(const std::string& k, double v) {
        for (auto& c : counters) if (c.first == k) { c.second = num(v); return; }
        counters.push_back({k, num(v)});
    }
    void add(const Fields& event, int line, const std::string& note, const Fields& vars, const std::string& state) {
        if (!on) return;
        if (steps.size() >= CAP) { truncated = true; return; }
        steps.push_back(obj({{"event", obj(event)}, {"line", num(line)}, {"note", q(note)}, {"vars", obj(vars)}, {"counters", obj(counters)}, {"state", state}}));
    }
    std::string json() const {
        std::string s = "{\"truncated\":" + std::string(truncated ? "true" : "false") + ",\"steps\":[";
        for (size_t i = 0; i < steps.size(); i++) s += (i ? "," : "") + steps[i];
        return s + "]}";
    }
};

std::string fmt1(double t) { char b[16]; std::snprintf(b, sizeof b, "%.1f", t); return b; }
std::string dateStr(int d) { char b[16]; std::snprintf(b, sizeof b, "%04d-%02d-%02d", d / 10000, d / 100 % 100, d % 100); return b; }

// ---------------------------------------------------------------- engine state
struct Item { std::string id, station; double t = 0; int date = 0; int obsId = 0; };

struct State {
    StationArray stations;
    HashTable index{7};
    Graph graph;
    CircularQueue<Reading> ingest{24};
    History* history = nullptr;  // one list per station
    BST* trees = nullptr;        // one BST per station
    int historyLimit = 30;
    long accepted = 0, rejected = 0, processed = 0;
    std::vector<std::pair<std::pair<int, int>, double>> edges;  // for the response only
    ~State() { delete[] history; delete[] trees; }
} *S = nullptr;

// ---------------------------------------------------------------- snapshots
std::string readingJson(const Reading& r) {
    return obj({{"id", q("o" + std::to_string(r.id))}, {"stationId", q(S ? S->stations.items[r.station].id : "")}, {"date", q(dateStr(r.date))}, {"temperatureC", num(r.t)}});
}
std::string itemJson(const Item& it) { return obj({{"id", q(it.id)}, {"stationId", q(it.station)}, {"temperatureC", num(it.t)}}); }

// front/rear/count overrides (-1 = actual) let a trace show the state at each pseudo-code line
template <typename T, typename F>
std::string queueSnap(const CircularQueue<T>& cq, F itemToJson, int front = -1, int rear = -1, int count = -1) {
    std::string slots = "[";
    for (int i = 0; i < cq.capacity(); i++) slots += (i ? "," : "") + (cq.occupied(i) ? itemToJson(cq.at(i)) : std::string("null"));
    slots += "]";
    return obj({{"capacity", num(cq.capacity())}, {"front", num(front < 0 ? cq.front : front)}, {"rear", num(rear < 0 ? cq.rear : rear)}, {"count", num(count < 0 ? cq.count : count)}, {"slots", slots}});
}
std::string queueStats() {
    auto& g = S->ingest;
    return obj({{"capacity", num(g.capacity())}, {"count", num(g.count)}, {"front", num(g.front)}, {"rear", num(g.rear)}, {"accepted", num(S->accepted)}, {"rejected", num(S->rejected)}, {"processed", num(S->processed)}});
}

std::string bstNodeId(const BST::Node* n) { return n ? "n" + std::to_string(n->r.id) : ""; }
// bounded snapshot: first 63 nodes in BFS order
std::string bstSnap(const BST& t) {
    std::string nodes = "[";
    if (t.root) {
        CircularQueue<const BST::Node*> qq(64);
        qq.enqueue(t.root);
        int k = 0;
        const BST::Node* n;
        while (k < 63 && qq.dequeue(n)) {
            nodes += (k++ ? "," : "") + obj({{"id", q(bstNodeId(n))}, {"key", q(dateStr(n->r.date))}, {"t", num(n->r.t)}, {"l", n->l ? q(bstNodeId(n->l)) : "null"}, {"r", n->r_ ? q(bstNodeId(n->r_)) : "null"}});
            if (n->l) qq.enqueue(n->l);
            if (n->r_) qq.enqueue(n->r_);
        }
    }
    nodes += "]";
    return obj({{"root", t.root ? q(bstNodeId(t.root)) : "null"}, {"size", num(t.size)}, {"height", num(t.height())}, {"nodes", nodes}});
}

std::string hashSnap(const HashTable& h) {
    std::string b = "[";
    for (int i = 0; i < h.cap; i++) {
        b += (i ? "," : "") + std::string("[");
        int k = 0;
        for (auto* n = h.buckets[i]; n; n = n->next) b += (k++ ? "," : "") + q(n->key);
        b += "]";
    }
    b += "]";
    return obj({{"capacity", num(h.cap)}, {"size", num(h.size)}, {"collisions", num(h.collisions)}, {"loadFactor", num(h.loadFactor())}, {"buckets", b}});
}

int stationIndex(const std::string& id) { int v = -1; S->index.find(id, v); return v; }

// ---------------------------------------------------------------- operations
std::string opInit(const Value& p) {
    delete S;
    S = new State();
    const Value& st = p["stations"];
    S->historyLimit = p["historyLimit"].integer(30);
    S->ingest.reset(p["queueCapacity"].integer(24));
    for (size_t i = 0; i < st.size(); i++) {
        Station s{st[i]["id"].str(), st[i]["name"].str(), st[i]["lat"].num(), st[i]["lon"].num()};
        if (!S->stations.add(s)) throw std::runtime_error("duplicate or too many stations: " + s.id);
        S->index.insert(s.id, S->stations.size - 1);
    }
    int n = S->stations.size;
    S->graph.n = n;
    S->history = new History[n];
    S->trees = new BST[n];
    for (int i = 0; i < n; i++) S->history[i].limit = S->historyLimit;
    double edgeKm = p["edgeKm"].num(450);
    std::string edges = "[";
    for (int a = 0; a < n; a++)
        for (int b = a + 1; b < n; b++) {
            auto& A = S->stations.items[a]; auto& B = S->stations.items[b];
            double km = haversineKm(A.lat, A.lon, B.lat, B.lon);
            if (km <= edgeKm) {
                S->graph.addEdge(a, b, km);
                edges += (edges.size() > 1 ? "," : "") + obj({{"a", q(A.id)}, {"b", q(B.id)}, {"km", num(std::round(km))}});
            }
        }
    edges += "]";
    return obj({{"stations", num(n)}, {"edges", edges}, {"hash", hashSnap(S->index)}});
}

std::string opIngest(const Value& p) {
    const Value& o = p["obs"];
    int si = stationIndex(o["station"].str());
    if (si < 0) throw std::runtime_error("unknown station " + o["station"].str());
    Reading r{o["id"].integer(), si, o["date"].integer(), o["t"].num()};
    bool ok = S->ingest.enqueue(r);
    ok ? S->accepted++ : S->rejected++;
    return obj({{"accepted", ok ? "true" : "false"}, {"queue", queueStats()}});
}

std::string opProcess(const Value& p) {
    int max = p["max"].integer(16);
    std::string out = "[";
    Reading r;
    int k = 0;
    while (k < max && S->ingest.dequeue(r)) {
        S->history[r.station].append(r);
        S->trees[r.station].insert(r);
        S->processed++;
        out += (k++ ? "," : "") + obj({{"id", num(r.id)}, {"station", q(S->stations.items[r.station].id)}, {"date", num(r.date)}, {"t", num(r.t)}});
    }
    out += "]";
    return obj({{"processed", out}, {"queue", queueStats()}});
}

std::string opQueueState(const Value&) { return obj({{"state", queueSnap(S->ingest, readingJson)}, {"stats", queueStats()}}); }

// Rebuild indexes after reload from persisted, date-sorted readings
std::string opRebuild(const Value& p) {
    const Value& rows = p["obs"];
    int n = S->stations.size;
    std::vector<std::vector<Reading>> per(n);
    for (size_t i = 0; i < rows.size(); i++) {
        int si = stationIndex(rows[i]["station"].str());
        if (si >= 0) per[si].push_back({rows[i]["id"].integer(), si, rows[i]["date"].integer(), rows[i]["t"].num()});
    }
    std::string heights = "{";
    for (int s = 0; s < n; s++) {
        S->history[s].clear();
        for (auto& r : per[s]) S->history[s].append(r);
        S->trees[s].buildBalanced(per[s].data(), (int)per[s].size());
        S->processed += per[s].size();
        heights += (s ? "," : "") + q(S->stations.items[s].id) + ":" + num(S->trees[s].height());
    }
    heights += "}";
    return obj({{"rebuilt", num(rows.size())}, {"heights", heights}});
}

std::string opHistory(const Value& p) {
    int si = stationIndex(p["station"].str());
    if (si < 0) throw std::runtime_error("unknown station");
    std::string nodes = "[";
    int k = 0;
    for (auto* n = S->history[si].head; n; n = n->next) nodes += (k++ ? "," : "") + readingJson(n->r);
    nodes += "]";
    return obj({{"size", num(S->history[si].size)}, {"limit", num(S->history[si].limit)}, {"nodes", nodes}});
}

// ---- queue demo (separate small queue so the live pipeline is untouched)
std::string opQueueDemo(const Value& p, Trace& tr) {
    CircularQueue<Item> cq(p["capacity"].integer(8));
    const Value& ops = p["ops"];
    const Value& items = p["items"];
    size_t next = 0;
    int enq = 0, deq = 0, rej = 0;
    auto snap = [&](int f = -1, int r = -1, int c = -1) { return queueSnap(cq, itemJson, f, r, c); };
    auto vars = [&](int f = -1, int r = -1, int c = -1) {
        return Fields{{"front", num(f < 0 ? cq.front : f)}, {"rear", num(r < 0 ? cq.rear : r)}, {"count", num(c < 0 ? cq.count : c)}, {"capacity", num(cq.capacity())}};
    };
    auto counters = [&] { tr.count("enqueued", enq); tr.count("dequeued", deq); tr.count("rejected", rej); };
    counters();
    tr.add({{"type", q("init")}, {"op", q("enqueue")}}, 0, "Empty queue: capacity " + std::to_string(cq.capacity()) + ", front = rear = count = 0.", vars(), snap());
    for (size_t i = 0; i < ops.size(); i++) {
        if (ops[i].str() == "E") {
            if (next >= items.size()) throw std::runtime_error("not enough items for enqueue ops");
            Item it{items[next]["id"].str(), items[next]["stationId"].str(), items[next]["temperatureC"].num()};
            next++;
            std::string ij = itemJson(it);
            tr.add({{"type", q("call")}, {"op", q("enqueue")}, {"item", ij}}, 1, "enqueue(" + it.station + " " + fmt1(it.t) + " °C)", vars(), snap());
            if (cq.full()) {
                rej++; counters();
                tr.add({{"type", q("reject_full")}, {"op", q("enqueue")}, {"item", ij}}, 3, "count == capacity (" + std::to_string(cq.capacity()) + ") → reading rejected. Nothing is overwritten.", vars(), snap());
                continue;
            }
            tr.add({{"type", q("check")}, {"op", q("enqueue")}, {"item", ij}}, 2, "count " + std::to_string(cq.count) + " < capacity " + std::to_string(cq.capacity()) + " → space available.", vars(), snap());
            int slot = cq.rear, before = cq.count;
            cq.enqueue(it);  // the real operation; the next steps show it line by line
            tr.add({{"type", q("write")}, {"op", q("enqueue")}, {"slot", num(slot)}, {"item", ij}}, 5, "Write reading into slot[" + std::to_string(slot) + "] (rear).", vars(-1, slot, before), snap(-1, slot, before));
            bool wrap = cq.rear < slot;
            tr.add({{"type", q(wrap ? "wrap" : "advance_rear")}, {"op", q("enqueue")}, {"from", num(slot)}, {"to", num(cq.rear)}}, 6,
                   "rear = (" + std::to_string(slot) + " + 1) mod " + std::to_string(cq.capacity()) + " = " + std::to_string(cq.rear) + (wrap ? " → wraps around to the start." : "."), vars(-1, -1, before), snap(-1, -1, before));
            enq++; counters();
            tr.add({{"type", q("count")}, {"op", q("enqueue")}}, 7, "count = " + std::to_string(cq.count) + ".", vars(), snap());
        } else {
            tr.add({{"type", q("call")}, {"op", q("dequeue")}}, 1, "dequeue()", vars(), snap());
            if (cq.empty()) {
                tr.add({{"type", q("reject_empty")}, {"op", q("dequeue")}}, 2, "count == 0 → queue empty, nothing to remove.", vars(), snap());
                continue;
            }
            int slot = cq.front;
            Item it = cq.at(slot);
            std::string ij = itemJson(it);
            tr.add({{"type", q("read")}, {"op", q("dequeue")}, {"slot", num(slot)}, {"item", ij}}, 3, "Read slot[" + std::to_string(slot) + "] (front): " + it.station + " " + fmt1(it.t) + " °C.", vars(), snap());
            Item out;
            int before = cq.count;
            cq.dequeue(out);  // the real operation; the next steps show it line by line
            tr.add({{"type", q("clear")}, {"op", q("dequeue")}, {"slot", num(slot)}, {"item", ij}}, 4, "Clear slot[" + std::to_string(slot) + "].", vars(slot, -1, before), snap(slot, -1, before));
            bool wrap = cq.front < slot;
            tr.add({{"type", q(wrap ? "wrap" : "advance_front")}, {"op", q("dequeue")}, {"from", num(slot)}, {"to", num(cq.front)}, {"item", ij}}, 5,
                   "front = (" + std::to_string(slot) + " + 1) mod " + std::to_string(cq.capacity()) + " = " + std::to_string(cq.front) + (wrap ? " → wraps around." : "."), vars(-1, -1, before), snap(-1, -1, before));
            deq++; counters();
            tr.add({{"type", q("count")}, {"op", q("dequeue")}, {"item", ij}}, 6, "count = " + std::to_string(cq.count) + ". Reading handed to the consumer.", vars(), snap());
        }
    }
    return obj({{"enqueued", num(enq)}, {"dequeued", num(deq)}, {"rejected", num(rej)}});
}

// ---- hash lookup with trace
std::string opHashLookup(const Value& p, Trace& tr) {
    std::string key = p["key"].str();
    HashTable& h = S->index;
    int probes = 0;
    unsigned hv = HashTable::hashOf(key);
    int b = h.bucketOf(key);
    tr.count("probes", 0);
    tr.add({{"type", q("hash")}, {"op", q("lookup")}, {"key", q(key)}, {"h", num(hv)}, {"bucket", num(b)}}, 2,
           "h(\"" + key + "\") = " + std::to_string(hv) + " mod " + std::to_string(h.cap) + " = bucket " + std::to_string(b) + ".", {{"key", q(key)}, {"bucket", num(b)}}, hashSnap(h));
    int pos = 0;
    for (auto* n = h.buckets[b]; n; n = n->next, pos++) {
        probes++;
        tr.count("probes", probes);
        bool hit = n->key == key;
        tr.add({{"type", q(hit ? "found" : "probe_chain")}, {"op", q("lookup")}, {"bucket", num(b)}, {"pos", num(pos)}, {"node", q(n->key)}}, hit ? 5 : 4,
               hit ? "Chain node " + std::to_string(pos) + " holds \"" + key + "\" → found." : "Chain node " + std::to_string(pos) + " is \"" + n->key + "\" ≠ \"" + key + "\" → follow next (collision).",
               {{"key", q(key)}, {"bucket", num(b)}, {"pos", num(pos)}}, hashSnap(h));
        if (hit) return obj({{"found", "true"}, {"index", num(n->value)}, {"probes", num(probes)}});
    }
    tr.add({{"type", q("miss")}, {"op", q("lookup")}, {"bucket", num(b)}}, 6, "End of chain → \"" + key + "\" not present.", {{"key", q(key)}, {"bucket", num(b)}}, hashSnap(h));
    return obj({{"found", "false"}, {"probes", num(probes)}});
}

// ---- BST range query with pruning
void rangeRec(BST::Node* n, int from, int to, Trace& tr, std::string& out, int& visited, int& cmps, int& emitted, const std::string& snap) {
    if (!n) return;
    visited++;
    cmps += 2;
    tr.count("visited", visited); tr.count("comparisons", cmps);
    std::string id = bstNodeId(n), key = dateStr(n->r.date);
    Fields v{{"cur", q(id)}, {"key", q(key)}, {"from", q(dateStr(from))}, {"to", q(dateStr(to))}};
    tr.add({{"type", q("visit")}, {"op", q("range")}, {"node", q(id)}}, 2, "Visit " + key + ".", v, snap);
    if (n->r.date > from) rangeRec(n->l, from, to, tr, out, visited, cmps, emitted, snap);
    else if (n->l) tr.add({{"type", q("prune")}, {"op", q("range")}, {"node", q(bstNodeId(n->l))}}, 3, key + " ≤ from → whole left subtree is before the range; skipped.", v, snap);
    if (n->r.date >= from && n->r.date <= to) {
        emitted++; tr.count("emitted", emitted);
        out += (out.size() > 1 ? "," : "") + readingJson(n->r);
        tr.add({{"type", q("emit")}, {"op", q("range")}, {"node", q(id)}}, 5, key + " is inside the range → output " + fmt1(n->r.t) + " °C.", v, snap);
    }
    if (n->r.date < to) rangeRec(n->r_, from, to, tr, out, visited, cmps, emitted, snap);
    else if (n->r_) tr.add({{"type", q("prune")}, {"op", q("range")}, {"node", q(bstNodeId(n->r_))}}, 6, key + " ≥ to → whole right subtree is after the range; skipped.", v, snap);
}

std::string bstRangeOn(BST& t, const Value& p, Trace& tr) {
    std::string out = "[", snap = bstSnap(t);
    int visited = 0, cmps = 0, emitted = 0;
    rangeRec(t.root, p["from"].integer(), p["to"].integer(), tr, out, visited, cmps, emitted, snap);
    out += "]";
    return obj({{"rows", out}, {"visited", num(visited)}, {"comparisons", num(cmps)}, {"height", num(t.height())}, {"size", num(t.size)}});
}

std::string bstSearchOn(BST& t, const Value& p, Trace& tr) {
    int target = p["date"].integer();
    std::string snap = bstSnap(t);
    int cmps = 0;
    for (BST::Node* n = t.root; n;) {
        cmps++;
        tr.count("comparisons", cmps);
        std::string id = bstNodeId(n), key = dateStr(n->r.date);
        Fields v{{"cur", q(id)}, {"key", q(key)}, {"target", q(dateStr(target))}};
        if (n->r.date == target) {
            tr.add({{"type", q("found")}, {"op", q("search")}, {"node", q(id)}}, 3, key + " == target → found (" + fmt1(n->r.t) + " °C).", v, snap);
            return obj({{"found", "true"}, {"reading", readingJson(n->r)}, {"comparisons", num(cmps)}, {"height", num(t.height())}});
        }
        bool left = target < n->r.date;
        tr.add({{"type", q(left ? "go_left" : "go_right")}, {"op", q("search")}, {"node", q(id)}}, left ? 4 : 5, dateStr(target) + (left ? " < " : " > ") + key + " → go " + (left ? "left." : "right."), v, snap);
        n = left ? n->l : n->r_;
    }
    tr.add({{"type", q("miss")}, {"op", q("search")}}, 6, "Reached an empty child → not found.", {{"target", q(dateStr(target))}}, snap);
    return obj({{"found", "false"}, {"comparisons", num(cmps)}, {"height", num(t.height())}});
}


BST& liveTree(const Value& p) {
    int si = stationIndex(p["station"].str());
    if (si < 0) throw std::runtime_error("unknown station");
    return S->trees[si];
}

// Fresh BST from the given readings, inserted chronologically (shows skew) or rebuilt balanced; then a traced query.
std::string opBstDemo(const Value& p, Trace& tr) {
    const Value& rows = p["readings"];
    std::vector<Reading> a;
    for (size_t i = 0; i < rows.size(); i++) a.push_back({rows[i]["id"].integer(), 0, rows[i]["date"].integer(), rows[i]["t"].num()});
    for (size_t i = 1; i < a.size(); i++)  // insertion sort by (date, id) — input is tiny and almost sorted
        for (size_t j = i; j > 0 && BST::cmp(a[j].date, a[j].id, a[j - 1].date, a[j - 1].id) < 0; j--) std::swap(a[j], a[j - 1]);
    BST t;
    if (p["order"].str("balanced") == "balanced") t.buildBalanced(a.data(), (int)a.size());
    else for (auto& x : a) t.insert(x);
    std::string res = p["query"].str("range") == "search" ? bstSearchOn(t, p, tr) : bstRangeOn(t, p, tr);
    return obj({{"query", res}, {"height", num(t.height())}, {"size", num(t.size)}, {"order", q(p["order"].str("balanced"))}});
}

// ---- graph traversal over hot vertices
std::string opComponents(const Value& p, Trace& tr) {
    int n = S->stations.size;
    bool hot[Graph::MAXV] = {}, seen[Graph::MAXV] = {};
    const Value& h = p["hot"];
    for (size_t i = 0; i < h.size(); i++) { int si = stationIndex(h[i].str()); if (si >= 0) hot[si] = true; }
    bool dfs = p["algorithm"].str("bfs") == "dfs";
    std::string order = "[", comps = "[";
    int ordN = 0, compN = 0, visits = 0, edgesSeen = 0;
    auto sid = [&](int i) { return q(S->stations.items[i].id); };
    auto state = [&](const std::string& frontier) {
        std::string vis = "[";
        int k = 0;
        for (int i = 0; i < n; i++) if (seen[i]) vis += (k++ ? "," : "") + sid(i);
        return obj({{"visited", vis + "]"}, {"frontier", frontier}, {"order", order + "]"}, {"components", comps + "]"}});
    };
    for (int s = 0; s < n; s++) {
        if (!hot[s] || seen[s]) continue;
        std::string comp = "[";
        int cn = 0;
        CircularQueue<int> fq(Graph::MAXV);
        Stack<int> fs(Graph::MAXV * Graph::MAXV);
        auto put = [&](int v) { dfs ? (void)fs.push(v) : (void)fq.enqueue(v); };
        auto take = [&](int& v) { return dfs ? fs.pop(v) : fq.dequeue(v); };
        auto frontierJson = [&] {
            std::string f = "[";
            if (dfs) for (int i = fs.size() - 1; i >= 0; i--) f += (f.size() > 1 ? "," : "") + sid(fs.at(i));
            else for (int i = 0, j = fq.front; i < fq.count; i++, j = (j + 1) % fq.capacity()) f += (f.size() > 1 ? "," : "") + sid(fq.at(j));
            return f + "]";
        };
        seen[s] = true;
        put(s);
        tr.add({{"type", q("start")}, {"op", q(dfs ? "dfs" : "bfs")}, {"v", sid(s)}}, 2, "New component from " + S->stations.items[s].name + ".", {{"component", num(compN)}}, state(frontierJson()));
        int v;
        while (take(v)) {
            visits++; tr.count("visited", visits); tr.count("edges", edgesSeen);
            order += (ordN++ ? "," : "") + sid(v);
            comp += (cn++ ? "," : "") + sid(v);
            tr.add({{"type", q("visit")}, {"op", q(dfs ? "dfs" : "bfs")}, {"v", sid(v)}}, 4, "Visit " + S->stations.items[v].name + ".", {{"v", sid(v)}}, state(frontierJson()));
            for (auto* e = S->graph.adj[v]; e; e = e->next) {
                edgesSeen++; tr.count("edges", edgesSeen);
                int w = e->to;
                if (!hot[w]) continue;  // induced subgraph: only hot vertices
                if (seen[w]) {
                    tr.add({{"type", q("skip_visited")}, {"op", q(dfs ? "dfs" : "bfs")}, {"u", sid(v)}, {"v", sid(w)}}, 6, S->stations.items[w].name + " already visited.", {{"v", sid(v)}, {"w", sid(w)}}, state(frontierJson()));
                    continue;
                }
                seen[w] = true;
                put(w);
                tr.add({{"type", q("explore_edge")}, {"op", q(dfs ? "dfs" : "bfs")}, {"u", sid(v)}, {"v", sid(w)}}, 7,
                       S->stations.items[v].name + " — " + S->stations.items[w].name + " (" + std::to_string((int)e->km) + " km): mark visited, add to " + (dfs ? "stack." : "queue."), {{"v", sid(v)}, {"w", sid(w)}}, state(frontierJson()));
            }
        }
        comps += (compN++ ? "," : "") + comp + "]";
        tr.add({{"type", q("component_done")}, {"op", q(dfs ? "dfs" : "bfs")}}, 8, "Component " + std::to_string(compN) + " complete (" + std::to_string(cn) + " cells).", {{"component", num(compN - 1)}}, state("[]"));
    }
    return obj({{"order", order + "]"}, {"components", comps + "]"}});
}

// ---- Exp 7: merge sort + binary search
struct Rec { int id; int date; double t; };
double keyOf(const Rec& r, bool byTemp) { return byTemp ? r.t : r.date; }
bool lessEq(const Rec& a, const Rec& b, bool byTemp) {  // stable, id tie-break
    double x = keyOf(a, byTemp), y = keyOf(b, byTemp);
    return x != y ? x < y : a.id <= b.id;
}
std::string arrJson(const Rec* a, int n) {
    std::string s = "[";
    for (int i = 0; i < n; i++) s += (i ? "," : "") + obj({{"id", num(a[i].id)}, {"date", q(dateStr(a[i].date))}, {"t", num(a[i].t)}});
    return s + "]";
}
void mergeSort(Rec* a, Rec* aux, int lo, int hi, int n, bool byTemp, Trace& tr, long& cmps, long& writes) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    tr.add({{"type", q("split")}, {"op", q("sort")}, {"lo", num(lo)}, {"mid", num(mid)}, {"hi", num(hi)}}, 3, "Split [" + std::to_string(lo) + ".." + std::to_string(hi) + "] at " + std::to_string(mid) + ".", {{"lo", num(lo)}, {"mid", num(mid)}, {"hi", num(hi)}}, arrJson(a, n));
    mergeSort(a, aux, lo, mid, n, byTemp, tr, cmps, writes);
    mergeSort(a, aux, mid + 1, hi, n, byTemp, tr, cmps, writes);
    for (int k = lo; k <= hi; k++) aux[k] = a[k];
    int i = lo, j = mid + 1;
    for (int k = lo; k <= hi; k++) {
        if (i > mid) a[k] = aux[j++];
        else if (j > hi) a[k] = aux[i++];
        else {
            cmps++; tr.count("comparisons", cmps);
            a[k] = lessEq(aux[i], aux[j], byTemp) ? aux[i++] : aux[j++];
        }
        writes++; tr.count("writes", writes);
        tr.add({{"type", q("write")}, {"op", q("sort")}, {"k", num(k)}, {"lo", num(lo)}, {"hi", num(hi)}}, 7, "Write " + fmt1(keyOf(a[k], byTemp)) + " to position " + std::to_string(k) + ".", {{"k", num(k)}, {"i", num(i)}, {"j", num(j)}}, arrJson(a, n));
    }
    tr.add({{"type", q("merge_done")}, {"op", q("sort")}, {"lo", num(lo)}, {"hi", num(hi)}}, 8, "[" + std::to_string(lo) + ".." + std::to_string(hi) + "] is now sorted.", {{"lo", num(lo)}, {"hi", num(hi)}}, arrJson(a, n));
}
std::vector<Rec> readRecs(const Value& v) {
    std::vector<Rec> r;
    for (size_t i = 0; i < v.size(); i++) r.push_back({v[i]["id"].integer(), v[i]["date"].integer(), v[i]["t"].num()});
    return r;
}
std::string opSort(const Value& p, Trace& tr) {
    std::vector<Rec> a = readRecs(p["values"]), aux(a.size());
    bool byTemp = p["key"].str("t") == "t";
    long cmps = 0, writes = 0;
    int n = (int)a.size();
    tr.count("comparisons", 0); tr.count("writes", 0);
    tr.add({{"type", q("init")}, {"op", q("sort")}}, 1, "Unsorted snapshot of " + std::to_string(n) + " readings.", {}, arrJson(a.data(), n));
    if (n) mergeSort(a.data(), aux.data(), 0, n - 1, n, byTemp, tr, cmps, writes);
    return obj({{"sorted", arrJson(a.data(), n)}, {"comparisons", num(cmps)}, {"writes", num(writes)}});
}
std::string opBinarySearch(const Value& p, Trace& tr) {
    std::vector<Rec> a = readRecs(p["values"]);
    bool byTemp = p["key"].str("t") == "t";
    double target = p["target"].num();
    int lo = 0, hi = (int)a.size() - 1, probes = 0;
    std::string arr = arrJson(a.data(), (int)a.size());
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        probes++; tr.count("probes", probes);
        double k = keyOf(a[mid], byTemp);
        Fields v{{"lo", num(lo)}, {"mid", num(mid)}, {"hi", num(hi)}, {"target", num(target)}};
        if (k == target) {
            tr.add({{"type", q("bs_found")}, {"op", q("search")}, {"mid", num(mid)}}, 4, "a[" + std::to_string(mid) + "] = " + fmt1(k) + " == target → found.", v, arr);
            return obj({{"found", "true"}, {"index", num(mid)}, {"probes", num(probes)}});
        }
        bool right = k < target;
        tr.add({{"type", q("bs_probe")}, {"op", q("search")}, {"lo", num(lo)}, {"mid", num(mid)}, {"hi", num(hi)}}, right ? 5 : 6,
               "a[" + std::to_string(mid) + "] = " + fmt1(k) + (right ? " < target → search right half." : " > target → search left half."), v, arr);
        right ? lo = mid + 1 : hi = mid - 1;
    }
    tr.add({{"type", q("bs_miss")}, {"op", q("search")}}, 7, "lo > hi → target not present.", {{"lo", num(lo)}, {"hi", num(hi)}, {"target", num(target)}}, arr);
    return obj({{"found", "false"}, {"probes", num(probes)}});
}

// ---- Exp 2: linked list append with bounded history (demo copy, live lists untouched)
std::string opListDemo(const Value& p, Trace& tr) {
    History h;
    h.limit = p["limit"].integer(5);
    const Value& items = p["items"];
    std::vector<std::string> sidOf;  // reading id -> station id (for labels)
    auto nodeId = [](const History::Node* n) { return n ? "o" + std::to_string(n->r.id) : std::string(); };
    auto label = [&](const Reading& r) { return S ? S->stations.items[r.station].id : std::string(""); };
    auto snap = [&](const History::Node* pendingNode) {
        std::string nodes = "[";
        int k = 0;
        for (auto* n = h.head; n; n = n->next)
            nodes += (k++ ? "," : "") + obj({{"id", q(nodeId(n))}, {"stationId", q(label(n->r))}, {"date", q(dateStr(n->r.date))}, {"temperatureC", num(n->r.t)}, {"next", n->next ? q(nodeId(n->next)) : "null"}});
        nodes += "]";
        return obj({{"head", h.head ? q(nodeId(h.head)) : "null"}, {"tail", h.tail ? q(nodeId(h.tail)) : "null"}, {"size", num(h.size)}, {"limit", num(h.limit)}, {"nodes", nodes},
                    {"pending", pendingNode ? obj({{"id", q(nodeId(pendingNode))}, {"stationId", q(label(pendingNode->r))}, {"date", q(dateStr(pendingNode->r.date))}, {"temperatureC", num(pendingNode->r.t)}}) : "null"}});
    };
    auto vars = [&] { return Fields{{"head", h.head ? q(nodeId(h.head)) : "null"}, {"tail", h.tail ? q(nodeId(h.tail)) : "null"}, {"size", num(h.size)}, {"limit", num(h.limit)}}; };
    int appended = 0, evicted = 0;
    tr.count("appended", 0);
    tr.count("evicted", 0);
    tr.add({{"type", q("init")}, {"op", q("append")}}, 0, "Empty list: head = tail = null, limit " + std::to_string(h.limit) + ".", vars(), snap(nullptr));
    for (size_t i = 0; i < items.size(); i++) {
        int si = S ? stationIndex(items[i]["stationId"].str()) : -1;
        Reading r{items[i]["id"].integer(), si < 0 ? 0 : si, items[i]["date"].integer(), items[i]["temperatureC"].num()};
        History::Node ghost{r, nullptr};
        tr.add({{"type", q("call")}, {"op", q("append")}}, 1, "append(" + fmt1(r.t) + " °C on " + dateStr(r.date) + ")", vars(), snap(nullptr));
        tr.add({{"type", q("new_node")}, {"op", q("append")}, {"node", q(nodeId(&ghost))}}, 2, "Allocate a new node.", vars(), snap(&ghost));
        bool wasEmpty = h.head == nullptr;
        int before = h.size;
        std::string oldHead = nodeId(h.head);
        h.append(r);  // the real operation (append + bounded eviction); steps below show it line by line
        appended++;
        tr.count("appended", appended);
        tr.add({{"type", q(wasEmpty ? "first" : "link")}, {"op", q("append")}, {"node", q(nodeId(h.tail))}}, wasEmpty ? 3 : 4,
               wasEmpty ? "List was empty → head and tail both point to the new node." : "Old tail.next → new node; tail moves to it. O(1).", vars(), snap(nullptr));
        if (before + 1 > h.limit) {
            evicted++;
            tr.count("evicted", evicted);
            tr.add({{"type", q("evict")}, {"op", q("append")}, {"node", q(oldHead)}}, 7,
                   "size would exceed limit " + std::to_string(h.limit) + " → oldest node removed, head moves to head.next. O(1).", vars(), snap(nullptr));
        } else {
            tr.add({{"type", q("size")}, {"op", q("append")}}, 5, "size = " + std::to_string(h.size) + ".", vars(), snap(nullptr));
        }
    }
    return obj({{"appended", num(appended)}, {"evicted", num(evicted)}, {"size", num(h.size)}});
}

// ---- Exp 3: formula -> postfix (operator stack) -> value (value stack)
std::string opStackEval(const Value& p, Trace& tr) {
    std::string expr = p["expr"].str();
    const Value& vars = p["vars"];
    // tokenise: numbers, allowlisted variables, + - * / ( ); unary minus becomes "~"
    std::vector<std::string> tok;
    const std::string opsChars = "+-*/()";
    for (size_t i = 0; i < expr.size();) {
        char c = expr[i];
        if (c == ' ') { i++; continue; }
        if ((c >= '0' && c <= '9') || c == '.') {
            size_t j = i;
            while (j < expr.size() && ((expr[j] >= '0' && expr[j] <= '9') || expr[j] == '.')) j++;
            tok.push_back(expr.substr(i, j - i));
            i = j;
        } else if ((c >= 'a' && c <= 'z') || c == '_') {
            size_t j = i;
            while (j < expr.size() && ((expr[j] >= 'a' && expr[j] <= 'z') || expr[j] == '_')) j++;
            std::string name = expr.substr(i, j - i);
            if (!vars.has(name)) throw std::runtime_error("unknown variable " + name);
            tok.push_back(name);
            i = j;
        } else if (opsChars.find(c) != std::string::npos) {
            bool unary = c == '-' && (tok.empty() || tok.back() == "(" || tok.back() == "+" || tok.back() == "-" || tok.back() == "*" || tok.back() == "/" || tok.back() == "~");
            tok.push_back(unary ? "~" : std::string(1, c));
            i++;
        } else throw std::runtime_error(std::string("unexpected symbol ") + c);
    }
    if (tok.empty()) throw std::runtime_error("empty expression");
    auto prec = [](const std::string& o) { return o == "~" ? 3 : (o == "*" || o == "/") ? 2 : (o == "+" || o == "-") ? 1 : 0; };
    auto isOp = [](const std::string& t) { return t == "+" || t == "-" || t == "*" || t == "/" || t == "~"; };
    auto isVar = [](const std::string& t) { return (t[0] >= 'a' && t[0] <= 'z') || t[0] == '_'; };
    Stack<std::string> ops(128);
    std::vector<std::string> out;
    auto list = [](const std::vector<std::string>& v) {
        std::string s = "[";
        for (size_t i = 0; i < v.size(); i++) s += (i ? "," : "") + q(v[i]);
        return s + "]";
    };
    std::string tokens = list(tok);
    auto opsJson = [&] {
        std::string s = "[";
        for (int i = 0; i < ops.size(); i++) s += (i ? "," : "") + q(ops.at(i));
        return s + "]";
    };
    auto snap = [&](int pos, const std::string& values, const std::string& phase) {
        return obj({{"phase", q(phase)}, {"tokens", phase == "eval" ? list(out) : tokens}, {"pos", num(pos)}, {"ops", opsJson()}, {"output", list(out)}, {"values", values}});
    };
    int pushes = 0, pops = 0;
    tr.count("pushes", 0);
    tr.count("pops", 0);
    for (size_t i = 0; i < tok.size(); i++) {
        const std::string& t = tok[i];
        Fields v{{"token", q(t)}};
        if (!isOp(t) && t != "(" && t != ")") {
            out.push_back(t);
            tr.add({{"type", q("output")}, {"op", q("postfix")}, {"token", q(t)}}, 2, "Operand " + t + " → output.", v, snap((int)i, "[]", "postfix"));
        } else if (t == "(") {
            ops.push(t);
            tr.count("pushes", ++pushes);
            tr.add({{"type", q("push_op")}, {"op", q("postfix")}, {"token", q(t)}}, 3, "( → push on the operator stack.", v, snap((int)i, "[]", "postfix"));
        } else if (t == ")") {
            std::string top;
            while (ops.peek(top) && top != "(") {
                ops.pop(top);
                tr.count("pops", ++pops);
                out.push_back(top);
                tr.add({{"type", q("pop_op")}, {"op", q("postfix")}, {"token", q(top)}}, 4, "Pop " + top + " to output until (.", v, snap((int)i, "[]", "postfix"));
            }
            if (!ops.pop(top)) throw std::runtime_error("unbalanced )");
            tr.count("pops", ++pops);
            tr.add({{"type", q("pop_paren")}, {"op", q("postfix")}}, 4, "Discard the matching (.", v, snap((int)i, "[]", "postfix"));
        } else {
            std::string top;
            while (t != "~" && ops.peek(top) && top != "(" && prec(top) >= prec(t)) {
                ops.pop(top);
                tr.count("pops", ++pops);
                out.push_back(top);
                tr.add({{"type", q("pop_op")}, {"op", q("postfix")}, {"token", q(top)}}, 5, top + " has precedence ≥ " + t + " → pop to output.", v, snap((int)i, "[]", "postfix"));
            }
            ops.push(t);
            tr.count("pushes", ++pushes);
            tr.add({{"type", q("push_op")}, {"op", q("postfix")}, {"token", q(t)}}, 5, "Push operator " + t + ".", v, snap((int)i, "[]", "postfix"));
        }
    }
    std::string top;
    while (ops.pop(top)) {
        if (top == "(") throw std::runtime_error("unbalanced (");
        tr.count("pops", ++pops);
        out.push_back(top);
        tr.add({{"type", q("pop_op")}, {"op", q("postfix")}, {"token", q(top)}}, 6, "End of input → pop " + top + " to output.", {}, snap((int)tok.size(), "[]", "postfix"));
    }
    Stack<double> val(128);
    auto valsJson = [&] {
        std::string s = "[";
        for (int i = 0; i < val.size(); i++) s += (i ? "," : "") + num(val.at(i));
        return s + "]";
    };
    for (size_t i = 0; i < out.size(); i++) {
        const std::string& t = out[i];
        if (!isOp(t)) {
            double x = isVar(t) ? vars[t].num() : std::atof(t.c_str());
            val.push(x);
            tr.add({{"type", q("push_val")}, {"op", q("eval")}, {"token", q(t)}}, 2, "Push " + t + " = " + fmt1(x) + ".", {{"token", q(t)}}, snap((int)i, valsJson(), "eval"));
            continue;
        }
        double a = 0, b = 0, r;
        if (!val.pop(b) || (t != "~" && !val.pop(a))) throw std::runtime_error("malformed expression");
        if (t == "~") r = -b;
        else if (t == "+") r = a + b;
        else if (t == "-") r = a - b;
        else if (t == "*") r = a * b;
        else {
            if (b == 0) throw std::runtime_error("division by zero");
            r = a / b;
        }
        if (!std::isfinite(r)) throw std::runtime_error("non-finite result");
        val.push(r);
        tr.add({{"type", q("apply")}, {"op", q("eval")}, {"token", q(t)}}, 3, t == "~" ? "Negate " + fmt1(b) + " → " + fmt1(r) + "." : fmt1(a) + " " + t + " " + fmt1(b) + " = " + fmt1(r) + ".",
               {{"token", q(t)}}, snap((int)i, valsJson(), "eval"));
    }
    double res;
    if (!val.pop(res) || !val.empty()) throw std::runtime_error("malformed expression");
    tr.add({{"type", q("result")}, {"op", q("eval")}}, 4, "Result = " + fmt1(res) + " (custom demonstration score).", {{"result", num(res)}}, snap((int)out.size(), "[" + num(res) + "]", "eval"));
    return obj({{"postfix", list(out)}, {"value", num(res)}});
}

}  // namespace

std::string handle(const std::string& request) {
    std::string id = "null";
    try {
        Value req = json::parse(request);
        id = q(req["id"].str());
        std::string op = req["op"].str();
        const Value& p = req["payload"];
        Trace tr;
        tr.on = req["trace"].type == Value::Bool && req["trace"].b;
        if (op != "init" && op != "queue.demo" && op != "sort.merge" && op != "search.binary" && op != "stack.eval" && op != "bst.demo" && !S) throw std::runtime_error("engine not initialised");
        auto t0 = std::chrono::steady_clock::now();
        std::string result;
        if (op == "init") result = opInit(p);
        else if (op == "ingest") result = opIngest(p);
        else if (op == "process") result = opProcess(p);
        else if (op == "queue.state") result = opQueueState(p);
        else if (op == "rebuild") result = opRebuild(p);
        else if (op == "history") result = opHistory(p);
        else if (op == "queue.demo") result = opQueueDemo(p, tr);
        else if (op == "list.demo") result = opListDemo(p, tr);
        else if (op == "stack.eval") result = opStackEval(p, tr);
        else if (op == "hash.lookup") result = opHashLookup(p, tr);
        else if (op == "hash.state") result = hashSnap(S->index);
        else if (op == "bst.range") result = bstRangeOn(liveTree(p), p, tr);
        else if (op == "bst.search") result = bstSearchOn(liveTree(p), p, tr);
        else if (op == "bst.demo") result = opBstDemo(p, tr);
        else if (op == "bst.state") { int si = stationIndex(p["station"].str()); if (si < 0) throw std::runtime_error("unknown station"); result = bstSnap(S->trees[si]); }
        else if (op == "graph.components") result = opComponents(p, tr);
        else if (op == "sort.merge") result = opSort(p, tr);
        else if (op == "search.binary") result = opBinarySearch(p, tr);
        else throw std::runtime_error("unknown op: " + op);
        double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
        std::string out = "{\"id\":" + id + ",\"ok\":true,\"engineTimeMs\":" + num(ms) + ",\"result\":" + result;
        if (tr.on) out += ",\"trace\":" + tr.json();
        return out + "}";
    } catch (const std::exception& e) {
        return "{\"id\":" + id + ",\"ok\":false,\"error\":" + q(e.what()) + "}";
    }
}

}  // namespace hw
