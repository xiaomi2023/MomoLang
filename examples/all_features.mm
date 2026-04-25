// MomoLang 综合示例
// 展示 MomoLang 的所有特性

print("=== MomoLang All Features Demo ===");
print("");

// ===== 1. 变量和基本类型 =====
print("--- 1. Variables & Types ---");
let num = 42;
let pi = 3.14159;
let greeting = "Hello, MomoLang!";
let isAwesome = true;
let empty = null;

print("num = " + num);
print("pi = " + pi);
print("greeting = " + greeting);
print("isAwesome = " + isAwesome);
print("empty = " + empty);

// ===== 2. 算术运算 =====
print("");
print("--- 2. Arithmetic ---");
let a = 10;
let b = 3;
print(a + " + " + b + " = " + (a + b));
print(a + " - " + b + " = " + (a - b));
print(a + " * " + b + " = " + (a * b));
print(a + " / " + b + " = " + (a / b));
print(a + " % " + b + " = " + (a % b));

// ===== 3. 比较和逻辑运算 =====
print("");
print("--- 3. Comparisons & Logic ---");
print(a + " < " + b + " = " + str(a < b));
print(a + " > " + b + " = " + str(a > b));
print(a + " == " + b + " = " + str(a == b));
print(a + " != " + b + " = " + str(a != b));
print("true && false = " + str(true && false));
print("true || false = " + str(true || false));
print("!true = " + str(!true));

// ===== 4. 字符串操作 =====
print("");
print("--- 4. Strings ---");
let name = "Momo";
let lang = "Lang";
print(name + " " + lang + " = " + name + lang);
print("Upper: " + toUpper(name));
print("Lower: " + toLower(lang));

// ===== 5. 条件语句 =====
print("");
print("--- 5. Conditionals ---");
let score = 85;
if (score >= 90) {
    print("Grade: A");
} else {
    if (score >= 80) {
        print("Grade: B");
    } else {
        if (score >= 70) {
            print("Grade: C");
        } else {
            print("Grade: D");
        }
    }
}

// ===== 6. 循环 =====
print("");
print("--- 6. Loops ---");

// while 循环
let i = 1;
print("While loop:");
while (i <= 5) {
    print("  i = " + i);
    i = i + 1;
}

// for 循环
print("For loop:");
for (let j = 0; j < 5; j = j + 1) {
    print("  j = " + j);
}

// ===== 7. 数组 =====
print("");
print("--- 7. Arrays ---");
let fruits = ["apple", "banana", "cherry", "date"];
print("Fruits: " + fruits);
print("First: " + fruits[0]);
print("Last: " + fruits[3]);
print("Length: " + len(fruits));

// ===== 8. 函数 =====
print("");
print("--- 8. Functions ---");

// 基本函数
function factorial(n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}
print("factorial(5) = " + factorial(5));

// 匿名函数
let square = function(x) { return x * x; };
print("square(7) = " + square(7));

// ===== 9. 高阶函数 =====
print("");
print("--- 9. Higher-Order Functions ---");
let nums = [1, 2, 3, 4, 5];

let doubled = map(nums, function(x) { return x * 2; });
print("map double: " + doubled);

let evens = filter(nums, function(x) { return x % 2 == 0; });
print("filter evens: " + evens);

let total = reduce(nums, function(sum, x) { return sum + x; }, 0);
print("reduce sum: " + total);

// ===== 10. 闭包 =====
print("");
print("--- 10. Closures ---");
function makeMultiplier(x) {
    return function(y) {
        return x * y;
    };
}

let triple = makeMultiplier(3);
print("triple(5) = " + triple(5));
print("triple(10) = " + triple(10));

// ===== 11. 字典 =====
print("");
print("--- 11. Dictionaries ---");
// 使用对象模拟字典

// ===== 12. 综合示例 =====
print("");
print("--- 12. Comprehensive: Prime Numbers ---");

function isPrime(n) {
    if (n < 2) {
        return false;
    }
    let i = 2;
    while (i * i <= n) {
        if (n % i == 0) {
            return false;
        }
        i = i + 1;
    }
    return true;
}

function findPrimes(limit) {
    let result = [];
    let i = 2;
    while (i <= limit) {
        if (isPrime(i)) {
            push(result, i);
        }
        i = i + 1;
    }
    return result;
}

let primes = findPrimes(50);
print("Primes up to 50: " + primes);
print("Count: " + len(primes));

print("");
print("=== Demo Complete! ===");
