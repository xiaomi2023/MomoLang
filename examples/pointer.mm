// MomoLang 指针示例
// 对应方案.md 中的 5.6 指针

// MomoLang 的指针是安全的引用指针
// 使用 & 取地址，* 解引用和修改

let x = 42;
print("x = " + x);  // 42

let p = &x;
print("p = " + p);  // &(42)

// 通过指针修改值
*p = 100;
print("After *p = 100:");
print("x = " + x);  // 100

// 通过指针读取
let y = *p;
print("y = *p = " + y);  // 100

print("---");

// 指针可以指向不同类型
let s = "hello";
let ps = &s;
*ps = "world";
print("s = " + s);  // world

print("---");

// 交换函数（通过指针）
function swap(a, b) {
    let temp = *a;
    *a = *b;
    *b = temp;
}

let m = 10;
let n = 20;
print("Before swap: m = " + m + ", n = " + n);
swap(&m, &n);
print("After swap: m = " + m + ", n = " + n);
