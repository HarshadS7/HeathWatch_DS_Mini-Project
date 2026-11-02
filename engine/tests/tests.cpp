// Core algorithm checks (PROJECT.md › Verification). Build: see engine/build.sh
#include <cstdio>
#include <string>

#include "engine.hpp"
#include "structures.hpp"

static int fails = 0, passes = 0;
#define CHECK(c)                                                         \
    do {                                                                 \
        if (c) passes++;                                                 \
        else { fails++; std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #c); } \
    } while (0)

using namespace hw;

static void queueTests() {
    CircularQueue<int> q(3);
    int x;
    CHECK(!q.dequeue(x));                                  // empty removal
    CHECK(q.enqueue(1) && q.enqueue(2) && q.enqueue(3));
    CHECK(!q.enqueue(4));                                  // full insertion rejected
    CHECK(q.dequeue(x) && x == 1);
    CHECK(q.enqueue(4) && q.rear == 1);                    // wraparound
    for (int round = 0; round < 5; round++) {              // repeated fill/drain
        while (q.dequeue(x)) {}
        CHECK(q.empty() && q.count == 0);
        for (int i = 0; i < 3; i++) CHECK(q.enqueue(i));
        CHECK(q.full());
    }
    CHECK(q.dequeue(x) && x == 0);                         // FIFO preserved across wraps
}

static void listTests() {
    History h;
    h.limit = 3;
    CHECK(h.head == nullptr && h.size == 0);
    h.append({1, 0, 20240101, 30});
    CHECK(h.head == h.tail && h.size == 1);                // one node
    for (int i = 2; i <= 5; i++) h.append({i, 0, 20240100 + i, 30});
    CHECK(h.size == 3 && h.head->r.id == 3 && h.tail->r.id == 5);  // oldest removed
    h.clear();
    CHECK(h.head == nullptr && h.tail == nullptr);
}

static void bstTests() {
    BST t;
    int d[] = {20240510, 20240505, 20240520, 20240501, 20240507, 20240515, 20240525};
    for (int i = 0; i < 7; i++) CHECK(t.insert({i + 1, 0, d[i], 40}));
    CHECK(!t.insert({1, 0, 20240510, 40}));                // duplicate key
    CHECK(t.insert({99, 0, 20240510, 41}));                // equal date, different id
    CHECK(t.height() == 4);
    CHECK(t.remove(20240501, 4) == 0);                     // leaf
    CHECK(t.remove(20240520, 3) == 2);                     // two children
    CHECK(t.remove(20240505, 2) == 1);                     // one child
    CHECK(t.remove(20240101, 1) == -1);                    // missing key
    BST skew;                                              // chronological insertion -> skewed
    for (int i = 0; i < 20; i++) skew.insert({i, 0, 20240101 + i, 30});
    CHECK(skew.height() == 20);
    Reading sorted[20];
    for (int i = 0; i < 20; i++) sorted[i] = {i, 0, 20240101 + i, 30};
    skew.buildBalanced(sorted, 20);
    CHECK(skew.height() == 5 && skew.size == 20);          // balanced rebuild after restart
}

static void hashTests() {
    HashTable h(3);
    int v;
    CHECK(!h.find("DEL", v));                              // absent
    const char* ids[] = {"DEL", "JAI", "JDH", "AMD", "BOM", "PNQ", "NAG", "BHO"};
    for (int i = 0; i < 8; i++) CHECK(h.insert(ids[i], i));
    CHECK(!h.insert("DEL", 9));                            // duplicate
    CHECK(h.cap > 3 && h.loadFactor() <= 0.75);            // resized
    for (int i = 0; i < 8; i++) CHECK(h.find(ids[i], v) && v == i);  // entries survive rehash
    CHECK(h.remove("BOM") && !h.find("BOM", v) && h.size == 7);
    HashTable c(1);                                        // deliberate collisions: one bucket
    c.insert("A", 1);
    c.insert("B", 2);
    CHECK(c.collisions >= 1 || c.cap > 1);
}

static bool has(const std::string& s, const std::string& sub) { return s.find(sub) != std::string::npos; }

static void protocolTests() {
    {
        std::string rd = R"("readings":[{"id":1,"date":20240501,"t":40},{"id":2,"date":20240502,"t":41},{"id":3,"date":20240503,"t":42},{"id":4,"date":20240504,"t":43},{"id":5,"date":20240505,"t":44},{"id":6,"date":20240506,"t":45},{"id":7,"date":20240507,"t":46}])";
        std::string chrono = handle(R"({"id":"b1","op":"bst.demo","trace":true,"payload":{"order":"chronological","query":"search","date":20240507,)" + rd + "}}");
        std::string bal = handle(R"({"id":"b2","op":"bst.demo","trace":true,"payload":{"order":"balanced","query":"search","date":20240507,)" + rd + "}}");
        CHECK(has(chrono, R"("height":7)") && has(chrono, R"("comparisons":7)"));  // skewed: O(n)
        CHECK(has(bal, R"("height":3)") && has(bal, R"("comparisons":3)"));        // balanced: O(log n)
        std::string rng = handle(R"({"id":"b3","op":"bst.demo","trace":true,"payload":{"order":"balanced","query":"range","from":20240503,"to":20240505,)" + rd + "}}");
        CHECK(has(rng, "prune") && has(rng, R"("emitted":3)"));
    }
    // 4 stations: three close together (Delhi, Jaipur, Lucknow), one far (Chennai)
    std::string init = R"({"id":"1","op":"init","payload":{"queueCapacity":2,"edgeKm":450,"stations":[
        {"id":"DEL","name":"Delhi","lat":28.6,"lon":77.2},{"id":"JAI","name":"Jaipur","lat":26.9,"lon":75.8},
        {"id":"LKO","name":"Lucknow","lat":26.85,"lon":80.95},{"id":"MAA","name":"Chennai","lat":13.08,"lon":80.27}]}})";
    std::string r = handle(init);
    CHECK(has(r, "\"ok\":true") && has(r, "\"stations\":4"));
    CHECK(has(handle(R"({"id":"2","op":"ingest","payload":{"obs":{"id":1,"station":"DEL","date":20240527,"t":45.1}}})"), "\"accepted\":true"));
    handle(R"({"id":"3","op":"ingest","payload":{"obs":{"id":2,"station":"JAI","date":20240527,"t":47.2}}})");
    r = handle(R"({"id":"4","op":"ingest","payload":{"obs":{"id":3,"station":"MAA","date":20240527,"t":38}}})");
    CHECK(has(r, "\"accepted\":false") && has(r, "\"rejected\":1"));  // overflow is explicit
    r = handle(R"({"id":"5","op":"process","payload":{"max":10}})");
    CHECK(has(r, "\"processed\":2"));
    r = handle(R"({"id":"6","op":"graph.components","trace":true,"payload":{"hot":["DEL","JAI","MAA"],"algorithm":"bfs"}})");
    CHECK(has(r, R"("components":[["DEL","JAI"],["MAA"]])"));          // isolated hot station is its own component
    r = handle(R"({"id":"7","op":"hash.lookup","trace":true,"payload":{"key":"XYZ"}})");
    CHECK(has(r, "\"found\":false") && has(r, "\"miss\""));
    r = handle(R"({"id":"8","op":"sort.merge","trace":true,"payload":{"key":"t","values":[{"id":1,"date":1,"t":40},{"id":2,"date":2,"t":38},{"id":3,"date":3,"t":40},{"id":4,"date":4,"t":35}]}})");
    CHECK(has(r, R"("sorted":[{"id":4,"date":"0000-00-04","t":35},{"id":2,"date":"0000-00-02","t":38},{"id":1,)"));  // stable for equal keys
    r = handle(R"({"id":"9","op":"search.binary","trace":true,"payload":{"key":"t","target":36,"values":[{"id":1,"date":1,"t":35},{"id":2,"date":2,"t":38}]}})");
    CHECK(has(r, "\"found\":false"));
    r = handle(R"({"id":"10","op":"queue.demo","trace":true,"payload":{"capacity":2,"ops":["E","E","E","D"],"items":[{"id":"a","stationId":"DEL","temperatureC":40},{"id":"b","stationId":"JAI","temperatureC":41},{"id":"c","stationId":"LKO","temperatureC":42}]}})");
    CHECK(has(r, "\"rejected\":1") && has(r, "reject_full") && has(r, "\"dequeued\":1"));
    CHECK(has(handle(R"({"id":"11","op":"nope"})"), "\"ok\":false"));
    r = handle(R"({"id":"12","op":"stack.eval","trace":true,"payload":{"expr":"-(t - 40) * 2 + 1","vars":{"t":45}}})");
    CHECK(has(r, R"("value":-9)") && has(r, R"("postfix":["t","40","-","~","2","*","1","+"])"));  // unary minus + precedence
    CHECK(has(handle(R"x({"id":"13","op":"stack.eval","payload":{"expr":"t / (1 - 1)","vars":{"t":3}}})x"), "division by zero"));
    CHECK(has(handle(R"({"id":"14","op":"stack.eval","payload":{"expr":"(t + 1","vars":{"t":3}}})"), "\"ok\":false"));
    CHECK(has(handle(R"({"id":"15","op":"stack.eval","payload":{"expr":"x + 1","vars":{"t":3}}})"), "unknown variable"));
    CHECK(has(handle(R"({"id":"16","op":"stack.eval","payload":{"expr":"2 * 3 - 4 / 2","vars":{}}})"), R"("value":4)"));
    r = handle(R"({"id":"17","op":"list.demo","trace":true,"payload":{"limit":2,"items":[{"id":1,"stationId":"DEL","date":20240501,"temperatureC":40},{"id":2,"stationId":"DEL","date":20240502,"temperatureC":41},{"id":3,"stationId":"DEL","date":20240503,"temperatureC":42}]}})");
    CHECK(has(r, R"("evicted":1)") && has(r, R"("size":2)"));
    CHECK(has(handle("{bad json"), "\"ok\":false"));
}

int main() {
    queueTests();
    listTests();
    bstTests();
    hashTests();
    protocolTests();
    std::printf("%d passed, %d failed\n", passes, fails);
    return fails ? 1 : 0;
}
