#include <iostream>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int mod(int a, int b) { return a % b; }
int chain(int n) { return add(mul(n, 3), mod(n, 7)); }

int main() {
    long long sum = 0;
    for (int i = 0; i < 2000000; i++) {
        sum += chain(i);
    }
    std::cout << sum << std::endl;
    return 0;
}
