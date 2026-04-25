// MomoLang 高阶函数示例
// 对应方案.md 中的 5.3 高阶函数

// 内置高阶函数
let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// map: 对每个元素应用函数
let doubled = map(numbers, function(x) { return x * 2; });
print("Doubled: " + doubled);

// filter: 过滤偶数
let evens = filter(numbers, function(x) { return x % 2 == 0; });
print("Evens: " + evens);

// reduce: 计算总和
let sum = reduce(numbers, function(a, b) { return a + b; }, 0);
print("Sum: " + sum);

// 链式操作：偶数翻倍
let result = reduce(
    filter(
        map(numbers, function(x) { return x * 2; }),
        function(x) { return x > 10; }
    ),
    function(a, b) { return a + b; },
    0
);
print("Sum of doubled numbers > 10: " + result);

// 自定义高阶函数
function applyTwice(f, x) {
    return f(f(x));
}

let addOne = function(x) { return x + 1; };
print("applyTwice(addOne, 5) = " + applyTwice(addOne, 5));

// 函数作为返回值
function compose(f, g) {
    return function(x) {
        return f(g(x));
    };
}

let addOneThenDouble = compose(
    function(x) { return x * 2; },
    function(x) { return x + 1; }
);

print("addOneThenDouble(5) = " + addOneThenDouble(5));
