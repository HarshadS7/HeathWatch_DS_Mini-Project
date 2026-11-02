// Native build: newline-delimited JSON over stdin/stdout (used for tests and the viva).
#include <iostream>
#include <string>
#include "engine.hpp"
int main() {
    std::ios::sync_with_stdio(false);
    std::string line;
    while (std::getline(std::cin, line))
        if (!line.empty()) std::cout << hw::handle(line) << '\n' << std::flush;
}
