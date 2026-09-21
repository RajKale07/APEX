#include <iostream>
#include <vector>

int main() {
    const int N = 50000;
    std::vector<long long> a(N), b(N), c(N);
    for (int i = 0; i < N; i++) { a[i] = i; b[i] = N - i; }

    long long sum = 0;
    for (int iter = 0; iter < 1000; iter++) {
        for (int i = 0; i < N; i++) {
            c[i] = a[i] * b[i] + iter;
        }
        for (int i = 0; i < N; i++) {
            sum += c[i];
        }
    }
    std::cout << sum << std::endl;
    return 0;
}
