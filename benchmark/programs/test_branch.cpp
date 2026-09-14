#include <iostream>

int classify(int n) {
    if (n % 15 == 0) return 4;
    else if (n % 3 == 0) return 3;
    else if (n % 5 == 0) return 2;
    else if (n % 2 == 0) return 1;
    else return 0;
}

int main() {
    long long sum = 0;
    for (int i = 0; i < 2000000; i++) {
        sum += classify(i);
    }
    std::cout << sum << std::endl;
    return 0;
}
