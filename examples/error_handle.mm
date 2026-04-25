// MomoLang 错误捕获示例
// 对应方案.md 中的 5.5 错误捕获

// 安全的除法
function safeDivide(a, b) {
    if (b == 0) {
        print("Error: Division by zero");
        return 0;
    }
    return a / b;
}

print("10 / 2 = " + safeDivide(10, 2));
print("10 / 0 = " + safeDivide(10, 0));
print("10 / 3 = " + safeDivide(10, 3));

// 带错误检查的数组访问
function safeGet(arr, index) {
    let len = len(arr);
    if (index < 0) {
        print("Error: Negative index " + index);
        return null;
    }
    if (index >= len) {
        print("Error: Index " + index + " out of bounds (length: " + len + ")");
        return null;
    }
    return arr[index];
}

let arr = [10, 20, 30, 40, 50];
print("arr[0] = " + safeGet(arr, 0));
print("arr[2] = " + safeGet(arr, 2));
print("arr[10] = " + safeGet(arr, 10));
print("arr[-1] = " + safeGet(arr, -1));

// try-catch 模拟保护
function riskyFunction(x) {
    if (x < 0) {
        print("Error: Negative value not allowed");
        return -1;
    }
    if (x == 0) {
        print("Error: Zero is not allowed");
        return -1;
    }
    return 100 / x;
}

print("riskyFunction(10) = " + riskyFunction(10));
print("riskyFunction(0) = " + riskyFunction(0));
print("riskyFunction(-5) = " + riskyFunction(-5));

print("Error handling example completed!");
