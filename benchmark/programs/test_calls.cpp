#include <iostream>

int add(int a, int b)  { return a + b; }
int mul(int a, int b)  { return a * b; }
int mod(int a, int b)  { return b != 0 ? a % b : 0; }
int sub(int a, int b)  { return a - b; }
int chain1(int n) { return add(mul(n, 3), mod(n, 7)); }
int chain2(int n) { return sub(chain1(n), add(n, 2)); }
int chain3(int n) { return mul(chain2(n), mod(n + 1, 5) + 1); }

int main() {
    long long sum = 0;
    for (int i = 0; i < 5000000; i++) {
        sum += chain3(i);
    }
    std::cout << sum << std::endl;
    return 0;
}
