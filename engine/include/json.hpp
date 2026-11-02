// Minimal JSON value + parser + writer for the engine protocol.
// Infrastructure only: it is NOT one of the assessed data structures.
#pragma once
#include <cstdio>
#include <cstdlib>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace json {

struct Value {
    enum Type { Null, Bool, Number, String, Array, Object } type = Null;
    bool b = false;
    double n = 0;
    std::string s;
    std::vector<Value> a;
    std::map<std::string, Value> o;

    const Value& operator[](const std::string& k) const {
        static Value none;
        auto it = o.find(k);
        return it == o.end() ? none : it->second;
    }
    const Value& operator[](size_t i) const { return a.at(i); }
    bool has(const std::string& k) const { return o.count(k) > 0; }
    double num(double d = 0) const { return type == Number ? n : d; }
    int integer(int d = 0) const { return type == Number ? (int)n : d; }
    std::string str(const std::string& d = "") const { return type == String ? s : d; }
    size_t size() const { return type == Array ? a.size() : 0; }
};

class Parser {
    const std::string& t;
    size_t i = 0;
    void ws() { while (i < t.size() && (t[i] == ' ' || t[i] == '\n' || t[i] == '\r' || t[i] == '\t')) i++; }
    [[noreturn]] void fail(const char* m) { throw std::runtime_error(std::string("JSON: ") + m); }
    std::string parseString() {
        std::string out;
        i++;  // opening quote
        while (i < t.size() && t[i] != '"') {
            if (t[i] == '\\') {
                i++;
                if (i >= t.size()) fail("bad escape");
                char e = t[i];
                if (e == 'n') out += '\n';
                else if (e == 't') out += '\t';
                else if (e == 'u') { out += '?'; i += 4; }
                else out += e;
            } else out += t[i];
            i++;
        }
        if (i >= t.size()) fail("unterminated string");
        i++;
        return out;
    }
    Value parseValue() {
        ws();
        if (i >= t.size()) fail("unexpected end");
        Value v;
        char c = t[i];
        if (c == '{') {
            v.type = Value::Object;
            i++; ws();
            if (t[i] == '}') { i++; return v; }
            while (true) {
                ws();
                if (t[i] != '"') fail("expected key");
                std::string k = parseString();
                ws();
                if (t[i] != ':') fail("expected :");
                i++;
                v.o[k] = parseValue();
                ws();
                if (t[i] == ',') { i++; continue; }
                if (t[i] == '}') { i++; break; }
                fail("expected , or }");
            }
        } else if (c == '[') {
            v.type = Value::Array;
            i++; ws();
            if (t[i] == ']') { i++; return v; }
            while (true) {
                v.a.push_back(parseValue());
                ws();
                if (t[i] == ',') { i++; continue; }
                if (t[i] == ']') { i++; break; }
                fail("expected , or ]");
            }
        } else if (c == '"') {
            v.type = Value::String;
            v.s = parseString();
        } else if (t.compare(i, 4, "true") == 0) { v.type = Value::Bool; v.b = true; i += 4; }
        else if (t.compare(i, 5, "false") == 0) { v.type = Value::Bool; i += 5; }
        else if (t.compare(i, 4, "null") == 0) { i += 4; }
        else {
            char* end = nullptr;
            v.type = Value::Number;
            v.n = std::strtod(t.c_str() + i, &end);
            if (end == t.c_str() + i) fail("bad number");
            i = end - t.c_str();
        }
        return v;
    }

   public:
    explicit Parser(const std::string& text) : t(text) {}
    Value parse() { Value v = parseValue(); return v; }
};

inline Value parse(const std::string& s) { return Parser(s).parse(); }

// Streaming writer: w.obj().key("a").num(1).key("b").arr()...end().end()
class Writer {
    std::string out;
    std::vector<bool> first;  // per open container: no element written yet
    bool afterKey = false;
    void sep() {
        if (afterKey) { afterKey = false; return; }
        if (!first.empty()) {
            if (!first.back()) out += ',';
            first.back() = false;
        }
    }

   public:
    Writer& obj() { sep(); out += '{'; first.push_back(true); return *this; }
    Writer& arr() { sep(); out += '['; first.push_back(true); return *this; }
    Writer& endObj() { out += '}'; first.pop_back(); return *this; }
    Writer& endArr() { out += ']'; first.pop_back(); return *this; }
    Writer& key(const std::string& k) { sep(); str_(k); out += ':'; afterKey = true; return *this; }
    Writer& str(const std::string& s) { sep(); str_(s); return *this; }
    Writer& num(double d) {
        sep();
        char buf[32];
        if (d == (long long)d && d < 1e15 && d > -1e15) std::snprintf(buf, sizeof buf, "%lld", (long long)d);
        else std::snprintf(buf, sizeof buf, "%.4g", d);
        out += buf;
        return *this;
    }
    Writer& boolean(bool b) { sep(); out += b ? "true" : "false"; return *this; }
    Writer& null() { sep(); out += "null"; return *this; }
    Writer& raw(const std::string& r) { sep(); out += r; return *this; }
    const std::string& str() const { return out; }

   private:
    void str_(const std::string& s) {
        out += '"';
        for (char c : s) {
            if (c == '"' || c == '\\') { out += '\\'; out += c; }
            else if (c == '\n') out += "\\n";
            else out += c;
        }
        out += '"';
    }
};

}  // namespace json
