<h1 align="center">🐱 MomoLang</h1>

<p align="center">
  <a href="README.md">🇨🇳 中文</a> · 
  <a href="README_EN.md">🇬🇧 English</a>
</p>


> **MomoLang** is an object-oriented compiled programming language independently developed by [Momoka](https://github.com/xiaomi2023/Momoka).

---

## ✨ Features

- ✅ **Lexical / Syntax / Semantic Analysis** — Complete compiler frontend (Python)
- ✅ **Bytecode Generation** — Compile `.mm` source files to `.mmb` binary bytecode
- ✅ **MomoVM Virtual Machine** — High-performance VM based on Node.js (JavaScript)
- ✅ **Rich Data Types** — number, string, boolean, null, array, dict, function, class, pointer
- ✅ **Object-Oriented** — Class definitions, inheritance, method overriding, super calls
- ✅ **Closures** — Full closure support based on Upvalue mechanism (similar to Lua)
- ✅ **Higher-Order Functions** — Functions as first-class citizens, built-in map / filter / reduce / forEach
- ✅ **Automatic Garbage Collection** — Mark & Sweep algorithm
- ✅ **Error Handling** — try-catch exception handling
- ✅ **Safe Pointers** — Non-bare-memory reference pointers (`&` / `*` operators)

---

## 🏗️ Project Architecture

```
Source Code (.mm)
    │
    ▼
┌──────────────────┐
│   Lexer          │  → Token Stream       ← Python
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Parser         │  → AST (Abstract Syntax Tree)  ← Python
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Semantic       │  → Type Checking / Constant Check / Scope  ← Python
│   Analysis       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   CodeGen        │  → MomoVM Bytecode (.mmb)  ← Python
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   MomoVM         │  ← JavaScript (Node.js)
│   Virtual Machine│  ← Load .mmb and execute
└──────────────────┘
```

---

## 🚀 Quick Start

### Requirements

| Component | Version |
|-----------|---------|
| Python    | 3.8+    |
| Node.js   | 14+     |

### Installation

```bash
# Clone the project
git clone 
cd momolang

# No additional dependencies required — Python and Node.js standard libraries are sufficient
```

### Usage

#### Option 1: Compile & Run (Full Toolchain)

```bash
# Compile .mm source file to .mmb bytecode
node momolang.js compile examples/hello.mm

# Run bytecode with MomoVM (Node.js)
node momolang.js run build/hello.mmb

# One-step: compile and run
node momolang.js build-run examples/hello.mm
```

#### Option 2: CLI Commands

```bash
node momolang.js run <file.mmb>                         # Run bytecode
node momolang.js compile <file.mm> [-o output.mmb]      # Compile .mm to .mmb
node momolang.js build-run <file.mm>                    # Compile and run
node momolang.js disasm <file.mmb>                      # Disassemble bytecode
```

---

## 📝 Syntax Examples

### Hello World

```mm
print("Hello, MomoLang!");
```

### Variables & Basic Operations

```mm
let name = "Momo";
let age = 5;
let score = 95.5;

let result = (age + 10) * 2;
print("Name: " + name);
print("Score: " + str(score));
```

### Functions & Closures

```mm
function add(a, b) {
    return a + b;
}

// Higher-order function
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

### Object-Oriented Programming

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

### Arrays & Higher-Order Functions

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

### Error Handling

```mm
try {
    let result = riskyOperation();
    print(result);
} catch(err) {
    print("Caught error: " + err);
}
```

### Pointers

```mm
let x = 42;
let p = &x;
*p = 100;
print(x);  // 100

let y = *p;
print(y);  // 100
```

---

## 🧩 Data Types

| Type       | Description              | Example                    |
|------------|--------------------------|----------------------------|
| `number`   | Integers and floats      | `42`, `3.14`, `-1`        |
| `string`   | Strings                  | `"hello"`, `'world'`      |
| `boolean`  | Boolean values           | `true`, `false`           |
| `null`     | Null value               | `null`                     |
| `array`    | Arrays                   | `[1, 2, 3]`               |
| `dict`     | Dictionaries / key-value | `{"a": 1, "b": 2}`        |
| `function` | Functions / closures     | `function(x) { ... }`     |
| `object`   | Class instances          | `Person("Momo", 5)`       |
| `pointer`  | Pointers                 | `&x`                       |
| `class`    | Class definitions        | `class Foo { ... }`       |

---

## 📦 Built-in Functions

| Function             | Description                        |
|----------------------|------------------------------------|
| `print(x)`           | Print value                        |
| `str(x)`             | Convert to string                  |
| `len(x)`             | Get array/string length            |
| `push(arr, x)`       | Push element to array end          |
| `pop(arr)`           | Pop element from array end         |
| `map(arr, fn)`       | Map                                |
| `filter(arr, fn)`    | Filter                             |
| `reduce(arr, fn, init)` | Reduce                          |
| `toUpper(s)`         | Convert to uppercase               |
| `toLower(s)`         | Convert to lowercase               |
| `toNumber(s)`        | Convert to number                  |
| `abs(x)`             | Absolute value                     |
| `floor(x)`           | Floor                              |
| `ceil(x)`            | Ceil                               |
| `round(x)`           | Round                              |
| `max(a, b, ...)`     | Maximum value                      |
| `min(a, b, ...)`     | Minimum value                      |
| `typeOf(x)`          | Get type name                      |
| `throwError(msg)`    | Throw an exception                 |

---

## 📜 Bytecode Format (.mmb)

`.mmb` is the binary bytecode file format for MomoLang:

```
┌─────────────────────────┐
│ Magic: "MomoVM\0" (8B)  │
├─────────────────────────┤
│ Version: u32            │
├─────────────────────────┤
│ EntryPoint: u32         │
├─────────────────────────┤
│ Constant Pool           │
├─────────────────────────┤
│ Code Section            │
├─────────────────────────┤
│ Variable Table          │
├─────────────────────────┤
│ Function Table          │
├─────────────────────────┤
│ Upvalue Table           │
├─────────────────────────┤
│ Line Number Table (Debug) │
└─────────────────────────┘
```

Use the disassembler to inspect bytecode content:

```bash
node momolang.js disasm build/hello.mmb
```

---

## 📄 License

MIT License © 2026 Mikoris
