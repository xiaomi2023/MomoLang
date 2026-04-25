<h1 align="center">🐱 MomoLang</h1>

<p align="center">
  <a href="README.md">🇨🇳 中文</a> · 
  <a href="README_EN.md">🇬🇧 English</a>
</p>

> **MomoLang** 是由[Momoka](https://github.com/xiaomi2023/Momoka)自主开发的一个面向对象的编译型编程语言。

---

## ✨ 特性一览

- ✅ **词法 / 语法 / 语义分析** — 完整的编译前端（Python）
- ✅ **字节码生成** — 编译 `.mm` 源文件为 `.mmb` 二进制字节码
- ✅ **MomoVM 虚拟机** — 基于 Node.js (JavaScript) 的高性能虚拟机
- ✅ **丰富的数据类型** — number、string、boolean、null、array、dict、function、class、pointer
- ✅ **面向对象** — 类定义、继承、方法重写、super 调用
- ✅ **闭包** — 基于 Upvalue 机制的完整闭包支持（类似 Lua）
- ✅ **高阶函数** — 函数作为一等公民，内置 map / filter / reduce / forEach
- ✅ **自动垃圾回收** — 标记-清扫（Mark & Sweep）算法
- ✅ **错误处理** — try-catch 异常捕获
- ✅ **安全指针** — 非裸内存的引用式指针（`&` / `*` 操作符）

---

## 🏗️ 项目架构

```
源代码 (.mm)
    │
    ▼
┌──────────────────┐
│  词法分析器       │  → Token 流        ← Python
│  (Lexer)          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  语法分析器       │  → AST (抽象语法树)  ← Python
│  (Parser)         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  语义分析         │  → 类型检查 / 常量检查 / 作用域  ← Python
│  (Semantic)       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  代码生成器       │  → MomoVM 字节码 (.mmb)  ← Python
│  (CodeGen)        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   MomoVM          │  ← JavaScript (Node.js)
│   虚拟机          │  ← 加载 .mmb 执行
└──────────────────┘
```

---

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 |
|------|---------|
| Python | 3.8+ |
| Node.js | 14+ |

### 安装

```bash
# 克隆项目
git clone https://github.com/xiaomi2023/MomoLang
cd momolang

# 无需额外安装依赖，Python 和 Node.js 标准库即可运行
```

### 使用方式

#### 方式一：编译并运行（完整工具链）

```bash
# 编译 .mm 源文件为 .mmb 字节码
node momolang.js compile examples/hello.mm

# 使用 MomoVM (Node.js) 运行字节码
node momolang.js run build/hello.mmb

# 一步到位：编译并运行
node momolang.js build-run examples/hello.mm
```

#### 方式二：CLI 完整命令

```bash
node momolang.js run <file.mmb>                         # 运行字节码
node momolang.js compile <file.mm> [-o output.mmb]      # 编译 .mm 为 .mmb
node momolang.js build-run <file.mm>                    # 编译并运行
node momolang.js disasm <file.mmb>                      # 反汇编查看字节码
```

---

## 📝 语法示例

### Hello World

```mm
print("Hello, MomoLang!");
```

### 变量与基本运算

```mm
let name = "Momo";
let age = 5;
let score = 95.5;

let result = (age + 10) * 2;
print("Name: " + name);
print("Score: " + str(score));
```

### 函数与闭包

```mm
function add(a, b) {
    return a + b;
}

// 高阶函数
function makeCounter() {
    let count = 0;
    return function() {
        count = count + 1;
        return count;
    };
}

let counter = makeCounter();
print(counter());  // 1
print(counter());  // 2
print(counter());  // 3
```

### 面向对象

```mm
class Animal {
    function init(name) {
        this.name = name;
    }
    function speak() {
        print(this.name + " makes a sound");
    }
}

class Dog(Animal) {
    function init(name, breed) {
        super.init(name);
        this.breed = breed;
    }
    function speak() {
        print(this.name + " barks");
    }
}

let dog = Dog("Buddy", "Golden Retriever");
dog.speak();  // Buddy barks
```

### 数组与高阶函数

```mm
let nums = [1, 2, 3, 4, 5];

let doubled = map(nums, function(x) {
    return x * 2;
});

let evens = filter(nums, function(x) {
    return x % 2 == 0;
});

let sum = reduce(nums, function(acc, x) {
    return acc + x;
}, 0);

print(doubled);  // [2, 4, 6, 8, 10]
print(evens);    // [2, 4]
print(sum);      // 15
```

### 错误捕获

```mm
try {
    let result = riskyOperation();
    print(result);
} catch(err) {
    print("Caught error: " + err);
}
```

### 指针

```mm
let x = 42;
let p = &x;
*p = 100;
print(x);  // 100

let y = *p;
print(y);  // 100
```

---

## 🧩 数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `number` | 整数和浮点数 | `42`, `3.14`, `-1` |
| `string` | 字符串 | `"hello"`, `'world'` |
| `boolean` | 布尔值 | `true`, `false` |
| `null` | 空值 | `null` |
| `array` | 数组 | `[1, 2, 3]` |
| `dict` | 字典/键值对 | `{"a": 1, "b": 2}` |
| `function` | 函数/闭包 | `function(x) { ... }` |
| `object` | 类实例 | `Person("Momo", 5)` |
| `pointer` | 指针 | `&x` |
| `class` | 类定义 | `class Foo { ... }` |

---

## 📦 内置函数

| 函数 | 说明 |
|------|------|
| `print(x)` | 输出值 |
| `str(x)` | 转为字符串 |
| `len(x)` | 获取数组/字符串长度 |
| `push(arr, x)` | 向数组末尾添加元素 |
| `pop(arr)` | 弹出数组末尾元素 |
| `map(arr, fn)` | 映射 |
| `filter(arr, fn)` | 过滤 |
| `reduce(arr, fn, init)` | 归约 |
| `toUpper(s)` | 转大写 |
| `toLower(s)` | 转小写 |
| `toNumber(s)` | 转数字 |
| `abs(x)` | 绝对值 |
| `floor(x)` | 向下取整 |
| `ceil(x)` | 向上取整 |
| `round(x)` | 四舍五入 |
| `max(a, b, ...)` | 最大值 |
| `min(a, b, ...)` | 最小值 |
| `typeOf(x)` | 获取类型名称 |
| `throwError(msg)` | 抛出异常 |

---

## 📜 字节码格式 (.mmb)

`.mmb` 是 MomoLang 的二进制字节码文件格式：

```
┌─────────────────────────┐
│ Magic: "MomoVM\0" (8B)  │
├─────────────────────────┤
│ Version: u32            │
├─────────────────────────┤
│ EntryPoint: u32         │
├─────────────────────────┤
│ 常量池                   │
├─────────────────────────┤
│ 代码段                   │
├─────────────────────────┤
│ 变量表                   │
├─────────────────────────┤
│ 函数表                   │
├─────────────────────────┤
│ Upvalue表                │
├─────────────────────────┤
│ 行号表(调试用)           │
└─────────────────────────┘
```

使用反汇编器可以查看字节码内容：

```bash
node momolang.js disasm build/hello.mmb
```

---

## 📄 许可证

MIT License © 2026 Mikoris
