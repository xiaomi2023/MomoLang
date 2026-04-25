#!/usr/bin/env node
/**
 * MomoLang CLI 入口 (JavaScript/Node.js)
 * 
 * 使用方式:
 *   node momolang.js run hello.mmb       # 运行 .mmb 字节码
 *   node momolang.js disasm hello.mmb    # 反汇编 .mmb 文件
 *   node momolang.js compile hello.mm    # 调用 Python 编译器编译 .mm
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==================== 主入口 ====================

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printUsage();
        return;
    }

    const command = args[0];

    switch (command) {
        case 'run':
            if (args.length < 2) {
                console.error('Usage: node momolang.js run <file.mmb>');
                return;
            }
            runBytecode(args[1]);
            break;

        case 'disasm':
            if (args.length < 2) {
                console.error('Usage: node momolang.js disasm <file.mmb>');
                return;
            }
            disassemble(args[1]);
            break;

        case 'compile':
            if (args.length < 2) {
                console.error('Usage: node momolang.js compile <file.mm> [-o output.mmb]');
                return;
            }
            const outputIdx = args.indexOf('-o');
            const output = outputIdx >= 0 ? args[outputIdx + 1] : null;
            compile(args[1], output);
            break;

        case 'build-run':
            if (args.length < 2) {
                console.error('Usage: node momolang.js build-run <file.mm>');
                return;
            }
            buildAndRun(args[1]);
            break;

        case 'test':
            runAllTests();
            break;

        default:
            // 如果是 .mmb 文件，直接运行
            if (args[0].endsWith('.mmb')) {
                runBytecode(args[0]);
            } else if (args[0].endsWith('.mm')) {
                buildAndRun(args[0]);
            } else {
                printUsage();
            }
            break;
    }
}

function printUsage() {
    console.log(`
MomoLang - MomoVM 虚拟机 (Node.js)

使用方式:
  node momolang.js run <file.mmb>            运行 .mmb 字节码
  node momolang.js disasm <file.mmb>         反汇编 .mmb 文件
  node momolang.js compile <file.mm> [-o out] 编译 .mm 到 .mmb
  node momolang.js build-run <file.mm>       编译并运行
  node momolang.js test                      运行测试

示例:
  node momolang.js run build/hello.mmb
  node momolang.js build-run examples/hello.mm
  node momolang.js disasm build/hello.mmb
`);
}

/**
 * 运行 .mmb 字节码文件
 */
function runBytecode(filepath) {
    const fullPath = path.resolve(__dirname, filepath);

    if (!fs.existsSync(fullPath)) {
        console.error(`错误：文件不存在: ${filepath}`);
        process.exit(1);
    }

    const { MomoVM } = require('./src/vm/momovm');
    const { registerBuiltins } = require('./src/vm/builtins');

    try {
        const vm = MomoVM.loadFile(fullPath);
        
        // 注册内置函数
        registerBuiltins(vm.globals);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`  MomoVM - 运行: ${path.basename(filepath)}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`  Constants: ${vm.constants.length}`);
        console.log(`  Globals: ${Object.keys(vm.globals).length}`);
        console.log(`  Functions: ${vm.functions.length}`);
        console.log(`\n--- 输出 ---`);

        const result = vm.run();

        console.log(`\n--- 执行成功! ---`);
        if (result && result.type !== 'null') {
            console.log(`返回结果: ${result.toString()}`);
        }
    } catch (e) {
        console.error(`\n--- 执行错误: ${e.message} ---`);
        if (process.argv.includes('--debug')) {
            console.error(e.stack);
        }
        process.exit(1);
    }
}

/**
 * 反汇编 .mmb 文件
 */
function disassemble(filepath) {
    const fullPath = path.resolve(__dirname, filepath);

    if (!fs.existsSync(fullPath)) {
        console.error(`错误：文件不存在: ${filepath}`);
        process.exit(1);
    }

    const { Disassembler } = require('./src/vm/disasm');

    try {
        const output = Disassembler.disassembleFile(fullPath);
        console.log(output);
    } catch (e) {
        console.error(`反汇编错误: ${e.message}`);
        process.exit(1);
    }
}

/**
 * 编译 .mm 文件为 .mmb（调用 Python 编译器）
 */
function compile(filepath, output = null) {
    const fullPath = path.resolve(__dirname, filepath);

    if (!fs.existsSync(fullPath)) {
        console.error(`错误：文件不存在: ${filepath}`);
        process.exit(1);
    }

    try {
        let cmd = `python src/compile.py "${fullPath}"`;
        if (output) {
            cmd += ` -o "${path.resolve(__dirname, output)}"`;
        }
        console.log(`编译: ${filepath}`);
        execSync(cmd, { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error(`编译错误`);
        process.exit(1);
    }
}

/**
 * 编译并运行 .mm 文件
 */
function buildAndRun(filepath) {
    const fullPath = path.resolve(__dirname, filepath);
    const baseName = path.basename(filepath, '.mm');
    const outputFile = `build/${baseName}.mmb`;

    // 创建 build 目录
    const buildDir = path.resolve(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    // 编译
    console.log(`\n📦 编译 ${filepath}...`);
    try {
        const cmd = `python src/compile.py "${fullPath}" -o "${outputFile}"`;
        execSync(cmd, { stdio: 'inherit', cwd: __dirname });
    } catch (e) {
        console.error('编译失败');
        process.exit(1);
    }

    // 运行
    runBytecode(outputFile);
}

/**
 * 运行所有测试
 */
function runAllTests() {
    const testDir = path.resolve(__dirname, 'test');
    if (!fs.existsSync(testDir)) {
        console.log('测试目录不存在');
        return;
    }

    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        console.log(`\n🧪 测试: ${file}`);
        try {
            require(path.join(testDir, file));
            console.log(`  ✅ 通过`);
        } catch (e) {
            console.error(`  ❌ 失败: ${e.message}`);
        }
    }
}

// 运行
if (require.main === module) {
    main();
}

module.exports = { main, runBytecode, disassemble, compile, buildAndRun };
