// MomoLang 函数示例
// 对应方案.md 中的高阶函数特性

let add = function(x, y) {
    print("Adding: " + str(x) + " + " + str(y));
    return x + y;
};

let sub = function(a, b) {
    print("Subtracting: " + str(a) + " - " + str(b));
    return a - b;
};

let result1 = add(10, 5);
print("Result: " + str(result1));

let result2 = sub(20, 7);
print("Result: " + str(result2));

// 使用高阶函数
let numbers = [1, 2, 3, 4, 5];

// 映射
let doubled = map(numbers, function(x) { return x * 2; });
print("Mapped: " + str(doubled));

// 过滤
let evens = filter(numbers, function(x) { return x % 2 == 0; });
print("Even numbers: " + str(evens));

// 归约
let total = reduce(numbers, function(a, b) { return a + b; }, 0);
print("Total sum: " + str(total));
