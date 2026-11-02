#pragma once
#include <string>
namespace hw {
// Handles one JSON request and returns one JSON response (see engine.cpp for ops).
std::string handle(const std::string& request);
}
