// HeatWatch assessed data structures — all hand-written (no std::queue/list/map/unordered_map/sort).
#pragma once
#include <cmath>
#include <string>

namespace hw {

struct Reading {
    int id = 0;
    int station = -1;   // index into the station array
    int date = 0;       // yyyymmdd
    double t = 0;       // daily max temperature, deg C
};

// Exp 1 — array of structures
struct Station {
    std::string id, name;
    double lat = 0, lon = 0;
};

struct StationArray {
    static const int CAP = 64;
    Station items[CAP];
    int size = 0;
    bool add(const Station& s) {
        if (size == CAP) return false;
        for (int i = 0; i < size; i++)
            if (items[i].id == s.id) return false;  // duplicate id
        items[size++] = s;
        return true;
    }
};

// Exp 4 — circular queue, counter method (rear = next insertion slot)
template <typename T>
class CircularQueue {
    T* slots = nullptr;
    bool* used = nullptr;
    int cap = 0;

   public:
    int front = 0, rear = 0, count = 0;
    explicit CircularQueue(int capacity = 8) { reset(capacity); }
    ~CircularQueue() { delete[] slots; delete[] used; }
    CircularQueue(const CircularQueue&) = delete;
    CircularQueue& operator=(const CircularQueue&) = delete;
    void reset(int capacity) {
        delete[] slots; delete[] used;
        cap = capacity < 1 ? 1 : capacity;
        slots = new T[cap];
        used = new bool[cap];
        for (int i = 0; i < cap; i++) used[i] = false;
        front = rear = count = 0;
    }
    int capacity() const { return cap; }
    bool empty() const { return count == 0; }
    bool full() const { return count == cap; }
    bool enqueue(const T& x) {
        if (full()) return false;  // explicit rejection, never overwrite
        slots[rear] = x;
        used[rear] = true;
        rear = (rear + 1) % cap;
        count++;
        return true;
    }
    bool dequeue(T& out) {
        if (empty()) return false;
        out = slots[front];
        used[front] = false;
        front = (front + 1) % cap;
        count--;
        return true;
    }
    bool occupied(int i) const { return used[i]; }
    const T& at(int i) const { return slots[i]; }
};

// Exp 3 — array stack (DFS frontier, formula operators/values)
template <typename T>
class Stack {
    T* data;
    int cap, n = 0;

   public:
    explicit Stack(int capacity = 64) : data(new T[capacity]), cap(capacity) {}
    ~Stack() { delete[] data; }
    Stack(const Stack&) = delete;
    Stack& operator=(const Stack&) = delete;
    bool push(const T& x) { if (n == cap) return false; data[n++] = x; return true; }
    bool pop(T& out) { if (!n) return false; out = data[--n]; return true; }
    bool peek(T& out) const { if (!n) return false; out = data[n - 1]; return true; }
    bool empty() const { return n == 0; }
    int size() const { return n; }
    const T& at(int i) const { return data[i]; }  // 0 = bottom
};

// Exp 2 — bounded singly linked list with head/tail (recent history per station)
class History {
   public:
    struct Node { Reading r; Node* next = nullptr; };
    Node *head = nullptr, *tail = nullptr;
    int size = 0, limit = 30;
    ~History() { clear(); }
    void clear() {
        while (head) { Node* n = head->next; delete head; head = n; }
        tail = nullptr; size = 0;
    }
    // O(1) append at tail; O(1) removal of the oldest at head when at the limit
    void append(const Reading& r) {
        Node* n = new Node{r, nullptr};
        if (!head) head = tail = n;
        else { tail->next = n; tail = n; }
        size++;
        if (size > limit) {
            Node* old = head;
            head = head->next;
            delete old;
            size--;
        }
    }
};

// Exp 5 — BST keyed by (date, id); counts comparisons
class BST {
   public:
    struct Node { Reading r; Node *l = nullptr, *r_ = nullptr; };
    Node* root = nullptr;
    int size = 0;
    ~BST() { clear(root); root = nullptr; }
    static int cmp(int d1, int id1, int d2, int id2) {
        if (d1 != d2) return d1 < d2 ? -1 : 1;
        if (id1 != id2) return id1 < id2 ? -1 : 1;
        return 0;
    }
    bool insert(const Reading& x, int* comparisons = nullptr) {
        Node** p = &root;
        while (*p) {
            if (comparisons) (*comparisons)++;
            int c = cmp(x.date, x.id, (*p)->r.date, (*p)->r.id);
            if (c == 0) return false;  // duplicate key
            p = c < 0 ? &(*p)->l : &(*p)->r_;
        }
        *p = new Node{x};
        size++;
        return true;
    }
    // removes key; returns the deletion case (0 leaf, 1 one child, 2 two children) or -1 if absent
    int remove(int date, int id) {
        Node** p = &root;
        while (*p && cmp(date, id, (*p)->r.date, (*p)->r.id) != 0)
            p = cmp(date, id, (*p)->r.date, (*p)->r.id) < 0 ? &(*p)->l : &(*p)->r_;
        if (!*p) return -1;
        Node* n = *p;
        int kase;
        if (!n->l || !n->r_) {
            kase = (n->l || n->r_) ? 1 : 0;
            *p = n->l ? n->l : n->r_;
            delete n;
        } else {
            kase = 2;
            Node** s = &n->r_;  // inorder successor: leftmost of right subtree
            while ((*s)->l) s = &(*s)->l;
            Node* succ = *s;
            n->r = succ->r;
            *s = succ->r_;
            delete succ;
        }
        size--;
        return kase;
    }
    int height() const { return h(root); }
    // rebuild a balanced shape from sorted readings (restart recovery)
    void buildBalanced(const Reading* sorted, int n) {
        clear(root);
        root = build(sorted, 0, n - 1);
        size = n;
    }
    void clear(Node* n) { if (!n) return; clear(n->l); clear(n->r_); delete n; }

   private:
    static int h(const Node* n) { if (!n) return 0; int a = h(n->l), b = h(n->r_); return 1 + (a > b ? a : b); }
    static Node* build(const Reading* a, int lo, int hi) {
        if (lo > hi) return nullptr;
        int mid = (lo + hi) / 2;
        Node* n = new Node{a[mid]};
        n->l = build(a, lo, mid - 1);
        n->r_ = build(a, mid + 1, hi);
        return n;
    }
};

// Exp 8 — hash table with separate chaining (station id -> station index)
class HashTable {
   public:
    struct Node { std::string key; int value; Node* next; };
    Node** buckets = nullptr;
    int cap = 0, size = 0, collisions = 0;
    explicit HashTable(int capacity = 7) { init(capacity); }
    ~HashTable() { destroy(); }
    HashTable(const HashTable&) = delete;
    HashTable& operator=(const HashTable&) = delete;
    // polynomial rolling hash, base 31
    static unsigned hashOf(const std::string& k) {
        unsigned h = 0;
        for (unsigned char c : k) h = h * 31u + c;
        return h;
    }
    int bucketOf(const std::string& k) const { return (int)(hashOf(k) % (unsigned)cap); }
    double loadFactor() const { return (double)size / cap; }
    bool insert(const std::string& k, int v) {
        int b = bucketOf(k);
        for (Node* n = buckets[b]; n; n = n->next)
            if (n->key == k) return false;
        if (buckets[b]) collisions++;
        buckets[b] = new Node{k, v, buckets[b]};
        size++;
        if (loadFactor() > 0.75) resize(cap * 2 + 1);
        return true;
    }
    bool find(const std::string& k, int& out, int* probes = nullptr) const {
        for (Node* n = buckets[bucketOf(k)]; n; n = n->next) {
            if (probes) (*probes)++;
            if (n->key == k) { out = n->value; return true; }
        }
        return false;
    }
    bool remove(const std::string& k) {
        Node** p = &buckets[bucketOf(k)];
        while (*p && (*p)->key != k) p = &(*p)->next;
        if (!*p) return false;
        Node* d = *p;
        *p = d->next;
        delete d;
        size--;
        return true;
    }
    void resize(int newCap) {
        Node** old = buckets;
        int oldCap = cap;
        buckets = new Node*[newCap];
        for (int i = 0; i < newCap; i++) buckets[i] = nullptr;
        cap = newCap;
        size = collisions = 0;
        for (int i = 0; i < oldCap; i++)
            for (Node* n = old[i]; n;) {
                Node* nx = n->next;
                int b = bucketOf(n->key);
                if (buckets[b]) collisions++;
                n->next = buckets[b];
                buckets[b] = n;
                size++;
                n = nx;
            }
        delete[] old;
    }

   private:
    void init(int c) {
        cap = c;
        buckets = new Node*[cap];
        for (int i = 0; i < cap; i++) buckets[i] = nullptr;
    }
    void destroy() {
        for (int i = 0; i < cap; i++)
            for (Node* n = buckets[i]; n;) { Node* nx = n->next; delete n; n = nx; }
        delete[] buckets;
        buckets = nullptr;
    }
};

// Exp 6 — undirected graph, adjacency list of manually linked edge nodes
class Graph {
   public:
    struct Edge { int to; double km; Edge* next; };
    static const int MAXV = 64;
    Edge* adj[MAXV] = {};
    int n = 0;
    ~Graph() { clear(); }
    void clear() {
        for (int i = 0; i < MAXV; i++)
            for (Edge* e = adj[i]; e;) { Edge* nx = e->next; delete e; e = nx; }
        for (int i = 0; i < MAXV; i++) adj[i] = nullptr;
    }
    // append at tail so neighbour order is deterministic (insertion order)
    void addEdge(int a, int b, double km) { push(a, b, km); push(b, a, km); }

   private:
    void push(int a, int b, double km) {
        Edge* e = new Edge{b, km, nullptr};
        if (!adj[a]) { adj[a] = e; return; }
        Edge* t = adj[a];
        while (t->next) t = t->next;
        t->next = e;
    }
};

inline double haversineKm(double la1, double lo1, double la2, double lo2) {
    const double R = 6371, r = 3.14159265358979 / 180;
    double dl = (la2 - la1) * r, dn = (lo2 - lo1) * r;
    double s = std::sin(dl / 2) * std::sin(dl / 2) + std::cos(la1 * r) * std::cos(la2 * r) * std::sin(dn / 2) * std::sin(dn / 2);
    return 2 * R * std::asin(std::sqrt(s));
}

}  // namespace hw
