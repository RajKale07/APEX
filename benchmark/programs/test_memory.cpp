#include <iostream>
#include <vector>

int main() {
    const int N = 4000;
    std::vector<std::vector<int>> a(N, std::vector<int>(N, 1));
    std::vector<std::vector<int>> b(N, std::vector<int>(N, 2));
    std::vector<std::vector<int>> c(N, std::vector<int>(N, 0));

    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            c[i][j] = a[i][j] + b[i][j];

    long long sum = 0;
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            sum += c[i][j];

    std::cout << sum << std::endl;
    return 0;
}
