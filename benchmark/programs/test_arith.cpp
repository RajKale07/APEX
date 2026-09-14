#include <iostream>
#include <cmath>

int main() {
    double result = 0.0;
    for (int i = 1; i <= 1000000; i++) {
        result += std::sqrt((double)i) * std::sin((double)i) + std::cos((double)i);
    }
    std::cout << result << std::endl;
    return 0;
}
