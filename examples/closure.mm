// MomoLang 闭包示例
// 对应方案.md 中的 5.2 闭包

// 返回一个计数器的闭包
function makeCounter() {
    let count = 0;
    return function() {
        count = count + 1;
        return count;
    };
}

let counter = makeCounter();
print(counter());
print(counter());
print(counter());

print("---");

// 另一个独立的计数器
let counter2 = makeCounter();
print(counter2());
print(counter2());

print("---");

// 高阶函数：返回函数的函数
function makeAdder(x) {
    return function(y) {
        return x + y;
    };
}

let add5 = makeAdder(5);
print("5 + 3 = " + add5(3));
print("5 + 10 = " + add5(10));

let add10 = makeAdder(10);
print("10 + 20 = " + add10(20));
