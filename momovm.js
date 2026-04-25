/**
 * MomoVM 虚拟机核心 (JavaScript 实现)
 * 对应方案.md 中的 MomoVM 指令集
 *
 * 加载 .mmb 字节码并解释执行
 */

const fs = require('fs');
const { 
    MomoValue, MomoNumber, MomoString, MomoBool, MomoNull, NULL_VALUE,
    MomoArray, MomoDict, MomoFunction, MomoClosure, Upvalue,
    MomoPointer, MomoObject, MomoClass
} = require('./objects');
const { GC } = require('./gc');

// ==================== 操作码常量 ====================
const OP = {
    HALT:       0x00, PUSH:      0x01, POP:       0x02,
    ADD:        0x03, SUB:       0x04, MUL:       0x05,
    DIV:        0x06, MOD:       0x07, NEG:       0x08,
    NOT:        0x09, CONCAT:    0x0A,
    CMP_EQ:     0x0B, CMP_NE:    0x0C, CMP_LT:    0x0D,
    CMP_GT:     0x0E, CMP_LE:    0x0F, CMP_GE:    0x10,
    AND:        0x11, OR:        0x12,
    JMP:        0x13, JMP_IF:    0x14, JMP_IFNOT: 0x15,
    LOAD_VAR:   0x16, STORE_VAR: 0x17, LOAD_CONST:0x18,
    CALL:       0x19, RET:       0x1A, PRINT:     0x1B,
    NEW_OBJ:    0x1C, SET_FIELD: 0x1D, GET_FIELD: 0x1E,
    LOAD_THIS:  0x1F,
    NEW_ARR:    0x20, ARR_GET:   0x21, ARR_SET:   0x22,
    MAKE_CLOSURE: 0x23, LOAD_UPVAR: 0x24, STORE_UPVAR: 0x25,
    PTR_ADDR:   0x26, PTR_DEREF: 0x27, PTR_SET:   0x28,
    TRY_SETUP:  0x29, THROW:     0x2A, END_TRY:   0x2B,
    NEW_DICT:   0x2C, DICT_GET:  0x2D, DICT_SET:  0x2E,
    TYPE_OF:    0x2F, GC_COLLECT:0x30,
};

const OP_NAMES = {};
for (const [k, v] of Object.entries(OP)) OP_NAMES[v] = k;

// ==================== 异常 ====================
class VMError extends Error {
    constructor(msg, ip) {
        super(`VM Error at 0x${ip.toString(16)}: ${msg}`);
        this.ip = ip;
    }
}

class MomoException extends Error {
    constructor(value) {
        super(String(value));
        this.value = value;
    }
}

// ==================== MomoVM ====================

class MomoVM {
    /**
     * @param {Buffer} code - .mmb 字节码
     */
    constructor(code) {
        this.code = code;
        this.ip = 0;          // 指令指针
        this.sp = -1;         // 栈顶指针
        this.stack = [];      // 操作数栈
        this.fp = -1;         // 帧指针
        this.frames = [];     // 调用帧栈

        // 从 .mmb 文件解析的数据
        this.constants = [];    // 常量池
        this.globals = {};      // 全局变量 { name: MomoValue }
        this.globalNames = [];  // 全局变量名列表（用于索引访问）
        this.functions = [];    // 函数表

        // 闭包支持
        this.openUpvalues = []; // 当前开放的 upvalue 列表

        // 异常处理栈
        this.tryStack = [];

        // GC
        this.gc = new GC();

        // 解析 .mmb 文件头
        this._parseHeader();
    }

    // ==================== 字节码解析 ====================

    _parseHeader() {
        let offset = 0;
        
        // Magic (7 bytes: "MomoVM\0")
        const magic = this.code.slice(0, 7).toString();
        if (magic !== 'MomoVM\x00') {
            throw new VMError('Invalid magic number', 0);
        }
        offset = 7;

        // Version (u32)
        const version = this.code.readUInt32BE(offset);
        offset += 4;

        // EntryPoint (u32)
        this.entryPoint = this.code.readUInt32BE(offset);
        offset += 4;

        // 常量池
        const constCount = this.code.readUInt32BE(offset);
        offset += 4;
        for (let i = 0; i < constCount; i++) {
            const type = this.code[offset++];
            switch (type) {
                case 0: // number
                    offset += 8;
                    break;
                case 1: { // string
                    const len = this.code.readUInt16BE(offset);
                    offset += 2 + len;
                    break;
                }
                case 2: // bool
                    offset += 1;
                    break;
                case 3: // null
                    break;
                default:
                    throw new VMError(`Unknown const type: ${type}`, offset);
            }
        }

        // 代码段大小
        const codeLen = this.code.readUInt32BE(offset);
        offset += 4 + codeLen;

        // 变量表
        const varCount = this.code.readUInt32BE(offset);
        offset += 4;
        for (let i = 0; i < varCount; i++) {
            const nameLen = this.code[offset];
            offset += 1;
            const name = this.code.slice(offset, offset + nameLen).toString('utf-8');
            offset += nameLen;
            // varType (1) + scopeLevel (1)
            offset += 2;
            this.globalNames.push(name);
            this.globals[name] = NULL_VALUE;
        }

        // 函数表
        const funcCount = this.code.readUInt32BE(offset);
        offset += 4;
        for (let i = 0; i < funcCount; i++) {
            const nameLen = this.code[offset];
            offset += 1;
            const name = this.code.slice(offset, offset + nameLen).toString('utf-8');
            offset += nameLen;
            const codeOff = this.code.readUInt32BE(offset);
            offset += 4;
            const argCount = this.code[offset];
            const upCount = this.code[offset + 1];
            offset += 2;
            this.functions.push(new MomoFunction(name, argCount, codeOff, this.code));
        }

        // 行号表（跳过）
        const lineCount = this.code.readUInt32BE(offset);
        offset += 4 + lineCount * 8;

        // 设置指令指针到 entryPoint
        this.ip = this.entryPoint || offset;
    }

    // ==================== 栈操作 ====================

    push(value) {
        this.stack[++this.sp] = value;
    }

    pop() {
        if (this.sp < 0) throw new VMError('Stack underflow', this.ip);
        return this.stack[this.sp--];
    }

    peek(offset = 0) {
        const idx = this.sp - offset;
        if (idx < 0) throw new VMError('Stack underflow (peek)', this.ip);
        return this.stack[idx];
    }

    // ==================== 读取操作数 ====================

    readU8(ip) {
        return this.code[ip];
    }

    readU16(ip) {
        const val = this.code.readUInt16BE(ip);
        return val;
    }

    readU32(ip) {
        const val = this.code.readUInt32BE(ip);
        return val;
    }

    readS16(ip) {
        const val = this.code.readInt16BE(ip);
        return val;
    }

    // ==================== 闭包 upvalue 管理 ====================

    _captureUpvalue(stackIndex) {
        // 查找是否已有对应的 open upvalue
        for (const up of this.openUpvalues) {
            if (up.isLocal && up.index === stackIndex) {
                return up;
            }
        }
        const up = new Upvalue(stackIndex, true);
        this.openUpvalues.push(up);
        return up;
    }

    _closeUpvalues(lastStackIndex) {
        while (this.openUpvalues.length > 0) {
            const up = this.openUpvalues[this.openUpvalues.length - 1];
            if (up.isLocal && up.index >= lastStackIndex) {
                up.value = this.stack[up.index];
                up.isClosed = true;
                this.openUpvalues.pop();
            } else {
                break;
            }
        }
    }

    // ==================== 主执行循环 ====================

    run() {
        try {
            return this._execute();
        } catch (e) {
            if (e instanceof MomoException) {
                console.error(`Uncaught exception: ${e.value}`);
                return e.value;
            }
            throw e;
        }
    }

    _execute() {
        const code = this.code;
        let ip = this.ip;

        while (ip < code.length) {
            this.ip = ip;
            const opcode = code[ip++];

            switch (opcode) {
                // ---- 基础操作 ----
                case OP.HALT:
                    return this.sp >= 0 ? this.stack[this.sp] : NULL_VALUE;

                case OP.PUSH: {
                    // 从代码中直接读取内联常量值
                    const type = code[ip++];
                    switch (type) {
                        case 0: { // number
                            const val = code.readDoubleBE(ip);
                            ip += 8;
                            this.push(new MomoNumber(val));
                            break;
                        }
                        case 1: { // string
                            const len = code.readUInt16BE(ip);
                            ip += 2;
                            const str = code.slice(ip, ip + len).toString('utf-8');
                            ip += len;
                            this.push(new MomoString(str));
                            break;
                        }
                        case 2: // bool
                            this.push(new MomoBool(code[ip++] === 1));
                            break;
                        case 3: // null
                            this.push(NULL_VALUE);
                            break;
                        default:
                            throw new VMError(`Unknown PUSH type: ${type}`, ip);
                    }
                    break;
                }

                case OP.POP:
                    if (this.sp >= 0) this.sp--;
                    break;

                // ---- 算术运算 ----
                case OP.ADD: case OP.SUB: case OP.MUL: 
                case OP.DIV: case OP.MOD: {
                    const b = this.pop();
                    const a = this.pop();
                    let result;
                    if (a instanceof MomoNumber && b instanceof MomoNumber) {
                        switch (opcode) {
                            case OP.ADD: result = a.value + b.value; break;
                            case OP.SUB: result = a.value - b.value; break;
                            case OP.MUL: result = a.value * b.value; break;
                            case OP.DIV: 
                                if (b.value === 0) throw new VMError('Division by zero', ip);
                                result = a.value / b.value; 
                                break;
                            case OP.MOD: 
                                if (b.value === 0) throw new VMError('Modulo by zero', ip);
                                result = a.value % b.value; 
                                break;
                        }
                        this.push(new MomoNumber(result));
                    } else if (opcode === OP.ADD && (a instanceof MomoString || b instanceof MomoString || a instanceof MomoNumber || b instanceof MomoNumber)) {
                        // 字符串拼接：任意类型 + 字符串 => 字符串
                        this.push(new MomoString(a.toString() + b.toString()));
                    } else {
                        throw new VMError(`Cannot perform arithmetic on ${a.type} and ${b.type}`, ip);
                    }
                    break;
                }

                case OP.NEG: {
                    const a = this.pop();
                    if (a instanceof MomoNumber) {
                        this.push(new MomoNumber(-a.value));
                    } else {
                        throw new VMError(`Cannot negate ${a.type}`, ip);
                    }
                    break;
                }

                case OP.NOT: {
                    const a = this.pop();
                    this.push(new MomoBool(!this._isTruthy(a)));
                    break;
                }

                // ---- 比较运算 ----
                case OP.CMP_EQ: case OP.CMP_NE: case OP.CMP_LT: 
                case OP.CMP_GT: case OP.CMP_LE: case OP.CMP_GE: {
                    const b = this.pop();
                    const a = this.pop();
                    let result = false;

                    if (a instanceof MomoNumber && b instanceof MomoNumber) {
                        switch (opcode) {
                            case OP.CMP_EQ: result = a.value === b.value; break;
                            case OP.CMP_NE: result = a.value !== b.value; break;
                            case OP.CMP_LT: result = a.value < b.value; break;
                            case OP.CMP_GT: result = a.value > b.value; break;
                            case OP.CMP_LE: result = a.value <= b.value; break;
                            case OP.CMP_GE: result = a.value >= b.value; break;
                        }
                    } else if (a instanceof MomoString && b instanceof MomoString) {
                        if (opcode === OP.CMP_EQ) result = a.value === b.value;
                        else if (opcode === OP.CMP_NE) result = a.value !== b.value;
                        else result = a.value.localeCompare(b.value) * (opcode === OP.CMP_LT ? -1 : 
                                   opcode === OP.CMP_GT ? 1 : 0) > 0;
                    } else if (a instanceof MomoBool && b instanceof MomoBool) {
                        if (opcode === OP.CMP_EQ) result = a.value === b.value;
                        else if (opcode === OP.CMP_NE) result = a.value !== b.value;
                    } else if (a instanceof MomoNull && b instanceof MomoNull) {
                        if (opcode === OP.CMP_EQ) result = true;
                        else if (opcode === OP.CMP_NE) result = false;
                    }

                    this.push(new MomoBool(result));
                    break;
                }

                case OP.AND: {
                    const b = this.pop();
                    const a = this.pop();
                    this.push(new MomoBool(this._isTruthy(a) && this._isTruthy(b)));
                    break;
                }

                case OP.OR: {
                    const b = this.pop();
                    const a = this.pop();
                    this.push(new MomoBool(this._isTruthy(a) || this._isTruthy(b)));
                    break;
                }

                // ---- 跳转 ----
                case OP.JMP: {
                    const addr = this.readU16(ip);
                    ip += 2;
                    ip = addr;
                    break;
                }

                case OP.JMP_IF: {
                    const addr = this.readU16(ip);
                    ip += 2;
                    const cond = this.pop();
                    if (this._isTruthy(cond)) ip = addr;
                    break;
                }

                case OP.JMP_IFNOT: {
                    const addr = this.readU16(ip);
                    ip += 2;
                    const cond = this.pop();
                    if (!this._isTruthy(cond)) ip = addr;
                    break;
                }

                // ---- 变量操作 ----
                case OP.LOAD_VAR: {
                    const varIdx = this.readU16(ip);
                    ip += 2;
                    const name = this.globalNames[varIdx];
                    if (name === undefined) throw new VMError(`Unknown var index: ${varIdx}`, ip);
                    this.push(this.globals[name] || NULL_VALUE);
                    break;
                }

                case OP.STORE_VAR: {
                    const varIdx = this.readU16(ip);
                    ip += 2;
                    const name = this.globalNames[varIdx];
                    if (name === undefined) throw new VMError(`Unknown var index: ${varIdx}`, ip);
                    this.globals[name] = this.pop();
                    break;
                }

                case OP.LOAD_CONST: {
                    const constIdx = this.readU16(ip);
                    ip += 2;
                    if (constIdx >= this.constants.length) 
                        throw new VMError(`Unknown const index: ${constIdx}`, ip);
                    this.push(this.constants[constIdx]);
                    break;
                }

                // ---- 函数调用 ----
                case OP.CALL: {
                    const argCount = this.readU16(ip);
                    ip += 2;
                    // 栈中顺序: [arg0, arg1, ..., func] (func在栈顶)
                    // 先弹出函数
                    const callee = this.pop();
                    // 再弹出参数
                    const args = [];
                    for (let i = 0; i < argCount; i++) {
                        args.unshift(this.pop());
                    }

                    if (callee instanceof MomoClosure || callee instanceof MomoFunction) {
                        const func = callee instanceof MomoClosure ? callee.func : callee;
                        const upvalues = callee instanceof MomoClosure ? callee.upvalues : [];

                        if (args.length !== func.argCount) {
                            throw new VMError(
                                `Function expects ${func.argCount} args, got ${args.length}`, ip);
                        }

                        // 保存调用状态
                        this.frames.push({
                            ip: ip,
                            sp: this.sp,
                            stackBase: this.sp + 1,
                            upvalues: [...this.openUpvalues],
                        });

                        // 压入参数到新栈帧
                        for (const arg of args) {
                            this.push(arg);
                        }

                        // 设置 upvalue 环境
                        for (const up of upvalues) {
                            if (up.isClosed) {
                                // 已关闭的 upvalue
                            } else if (up.isLocal) {
                                // 局部变量 upvalue（指向调用者的栈）
                                this.openUpvalues.push(up);
                            }
                        }

                        ip = func.entryPoint;
                    } else if (typeof callee === 'function') {
                        // 内置函数
                        const result = callee(...args);
                        // 如果返回的是 MomoValue 直接使用，否则包装
                        if (result instanceof MomoValue) {
                            this.push(result);
                        } else if (result !== undefined && result !== null) {
                            this.push(new MomoString(String(result)));
                        } else {
                            this.push(NULL_VALUE);
                        }
                    } else if (callee instanceof MomoClass) {
                        // 类实例化 new ClassName(args)
                        this._instantiateClass(callee, args);
                    } else {
                        throw new VMError(`Cannot call non-function: ${callee}`, ip);
                    }
                    break;
                }

                case OP.RET: {
                    const returnValue = this.sp >= 0 ? this.pop() : NULL_VALUE;

                    // 关闭当前帧的 upvalue
                    if (this.frames.length > 0) {
                        this._closeUpvalues(this.fp >= 0 ? this.fp : 0);
                    }

                    const frame = this.frames.pop();
                    if (!frame) {
                        // 从 main 返回
                        return returnValue;
                    }

                    // 恢复栈
                    this.sp = frame.sp;
                    this.stack.length = this.sp + 1;
                    this.push(returnValue);
                    ip = frame.ip;
                    break;
                }

                // ---- 打印 ----
                case OP.PRINT: {
                    const val = this.pop();
                    console.log(val != null ? val.toString() : 'null');
                    break;
                }

                // ---- 对象操作 ----
                case OP.NEW_OBJ: {
                    const fieldCount = this.readU16(ip);
                    ip += 2;
                    const fields = {};
                    for (let i = 0; i < fieldCount; i++) {
                        const val = this.pop();
                        const name = this.pop();
                        const key = name instanceof MomoString ? name.value : String(name);
                        fields[key] = val;
                    }
                    this.push(new MomoObject(null, fields));
                    break;
                }

                case OP.SET_FIELD: {
                    const nameIdx = this.readU16(ip);
                    ip += 2;
                    const obj = this.peek(1); // value below
                    const value = this.pop();
                    const name = this.globalNames[nameIdx] || `_${nameIdx}`;
                    if (obj instanceof MomoObject) {
                        obj.setField(name, value);
                    } else {
                        throw new VMError(`Cannot set field on ${obj.type}`, ip);
                    }
                    break;
                }

                case OP.GET_FIELD: {
                    const nameIdx = this.readU16(ip);
                    ip += 2;
                    const obj = this.pop();
                    const name = this.globalNames[nameIdx] || `_${nameIdx}`;
                    if (obj instanceof MomoObject) {
                        this.push(obj.getField(name));
                    } else if (obj instanceof MomoDict) {
                        this.push(obj.get(name));
                    } else {
                        throw new VMError(`Cannot get field from ${obj.type}`, ip);
                    }
                    break;
                }

                case OP.LOAD_THIS: {
                    // 在调用帧中查找 this
                    const frame = this.frames[this.frames.length - 1];
                    if (frame && frame.this) {
                        this.push(frame.this);
                    } else {
                        this.push(NULL_VALUE);
                    }
                    break;
                }

                // ---- 数组操作 ----
                case OP.NEW_ARR: {
                    const count = this.readU16(ip);
                    ip += 2;
                    const elements = [];
                    for (let i = 0; i < count; i++) {
                        elements.unshift(this.pop());
                    }
                    this.push(new MomoArray(elements));
                    break;
                }

                case OP.ARR_GET: {
                    const index = this.pop();
                    const arr = this.pop();
                    if (arr instanceof MomoArray && index instanceof MomoNumber) {
                        this.push(arr.get(Math.floor(index.value)));
                    } else {
                        throw new VMError(`Cannot index into ${arr.type}`, ip);
                    }
                    break;
                }

                case OP.ARR_SET: {
                    const value = this.pop();
                    const index = this.pop();
                    const arr = this.pop();
                    if (arr instanceof MomoArray && index instanceof MomoNumber) {
                        arr.set(Math.floor(index.value), value);
                        this.push(value);
                    } else {
                        throw new VMError(`Cannot index into ${arr.type}`, ip);
                    }
                    break;
                }

                // ---- 闭包 ----
                case OP.MAKE_CLOSURE: {
                    const funcIndex = this.readU16(ip);
                    ip += 2;
                    const upCount = this.readU16(ip);
                    ip += 2;
                    const func = this.functions[funcIndex];
                    if (!func) throw new VMError(`Unknown function index: ${funcIndex}`, ip);

                    const upvalues = [];
                    for (let i = 0; i < upCount; i++) {
                        const isLocal = this.code[ip++] === 1;
                        const index = this.readU16(ip);
                        ip += 2;
                        if (isLocal) {
                            upvalues.push(this._captureUpvalue(this.fp + index));
                        } else {
                            // 来自上级闭包的 upvalue
                            upvalues.push(new Upvalue(index, false));
                        }
                    }
                    this.push(new MomoClosure(func, upvalues));
                    break;
                }

                case OP.LOAD_UPVAR: {
                    const upIndex = this.readU16(ip);
                    ip += 2;
                    // 查找 upvalue
                    const frame = this.frames[this.frames.length - 1];
                    if (frame && frame.upvalues && frame.upvalues[upIndex]) {
                        const up = frame.upvalues[upIndex];
                        if (up.isClosed) {
                            this.push(up.value);
                        } else {
                            this.push(this.stack[up.index]);
                        }
                    } else {
                        this.push(NULL_VALUE);
                    }
                    break;
                }

                case OP.STORE_UPVAR: {
                    const upIndex = this.readU16(ip);
                    ip += 2;
                    const value = this.pop();
                    const frame = this.frames[this.frames.length - 1];
                    if (frame && frame.upvalues && frame.upvalues[upIndex]) {
                        const up = frame.upvalues[upIndex];
                        if (up.isClosed) {
                            up.value = value;
                        } else {
                            this.stack[up.index] = value;
                        }
                    }
                    break;
                }

                // ---- 指针 ----
                case OP.PTR_ADDR: {
                    const varIdx = this.readU16(ip);
                    ip += 2;
                    const name = this.globalNames[varIdx];
                    if (name === undefined) throw new VMError(`Unknown var index: ${varIdx}`, ip);
                    
                    // 创建引用包裹
                    const ref = {
                        value: this.globals[name] || NULL_VALUE,
                        name: name,
                        globals: this.globals
                    };
                    // 重写 getter/setter 使其指向全局变量
                    const pointer = new MomoPointer({
                        get value() { return ref.globals[ref.name] || NULL_VALUE; },
                        set value(v) { ref.globals[ref.name] = v; }
                    });
                    this.push(pointer);
                    break;
                }

                case OP.PTR_DEREF: {
                    const ptr = this.pop();
                    if (ptr instanceof MomoPointer) {
                        this.push(ptr.deref());
                    } else {
                        throw new VMError(`Cannot dereference ${ptr.type}`, ip);
                    }
                    break;
                }

                case OP.PTR_SET: {
                    const value = this.pop();
                    const ptr = this.pop();
                    if (ptr instanceof MomoPointer) {
                        ptr.set(value);
                        this.push(value);
                    } else {
                        throw new VMError(`Cannot assign through non-pointer ${ptr.type}`, ip);
                    }
                    break;
                }

                // ---- 异常处理 ----
                case OP.TRY_SETUP: {
                    const catchAddr = this.readU16(ip);
                    ip += 2;
                    this.tryStack.push({
                        catchAddr: catchAddr,
                        sp: this.sp,
                        fp: this.fp,
                        stackBase: this.sp,
                    });
                    break;
                }

                case OP.THROW: {
                    const exception = this.pop();
                    const handler = this.tryStack.pop();
                    if (handler) {
                        // 恢复栈
                        this.sp = handler.sp;
                        this.stack.length = this.sp + 1;
                        this.push(exception);
                        ip = handler.catchAddr;
                    } else {
                        throw new MomoException(exception);
                    }
                    break;
                }

                case OP.END_TRY: {
                    this.tryStack.pop();
                    break;
                }

                // ---- 字典操作 ----
                case OP.NEW_DICT: {
                    const count = this.readU16(ip);
                    ip += 2;
                    const entries = {};
                    for (let i = 0; i < count; i++) {
                        const value = this.pop();
                        const key = this.pop();
                        const k = key instanceof MomoString ? key.value : String(key);
                        entries[k] = value;
                    }
                    this.push(new MomoDict(entries));
                    break;
                }

                case OP.DICT_GET: {
                    const key = this.pop();
                    const dict = this.pop();
                    if (dict instanceof MomoDict) {
                        this.push(dict.get(key));
                    } else {
                        throw new VMError(`Cannot index dict on ${dict.type}`, ip);
                    }
                    break;
                }

                case OP.DICT_SET: {
                    const value = this.pop();
                    const key = this.pop();
                    const dict = this.pop();
                    if (dict instanceof MomoDict) {
                        dict.set(key, value);
                        this.push(value);
                    } else {
                        throw new VMError(`Cannot set on ${dict.type}`, ip);
                    }
                    break;
                }

                // ---- 类型检查 ----
                case OP.TYPE_OF: {
                    const val = this.pop();
                    this.push(new MomoString(val ? val.type : 'null'));
                    break;
                }

                // ---- GC ----
                case OP.GC_COLLECT: {
                    const roots = [
                        ...Object.values(this.globals),
                        ...this.stack,
                        ...this.frames.map(f => f.this).filter(Boolean),
                    ];
                    const freed = this.gc.collect(roots);
                    if (freed > 0) {
                        // 可选：打印 GC 信息
                    }
                    break;
                }

                // ---- 未知指令 ----
                default:
                    throw new VMError(`Unknown opcode: 0x${opcode.toString(16)}`, ip);
            }
        }

        return this.sp >= 0 ? this.stack[this.sp] : NULL_VALUE;
    }

    _isTruthy(value) {
        if (value instanceof MomoBool) return value.value;
        if (value instanceof MomoNumber) return value.value !== 0;
        if (value instanceof MomoString) return value.value.length > 0;
        if (value instanceof MomoNull) return false;
        if (value instanceof MomoArray) return value.values.length > 0;
        if (value instanceof MomoDict) return Object.keys(value.entries).length > 0;
        return true;
    }

    _instantiateClass(klass, args) {
        const obj = new MomoObject(klass);
        
        // 调用构造方法（如果有）
        const init = klass.getMethod('init');
        if (init instanceof MomoFunction || init instanceof MomoClosure) {
            const func = init instanceof MomoClosure ? init.func : init;
            
            this.frames.push({
                ip: this.ip,
                sp: this.sp,
                stackBase: this.sp + 1,
                this: obj,
                upvalues: [...this.openUpvalues],
            });

            for (const arg of args) {
                this.push(arg);
            }

            this.ip = func.entryPoint;
        } else {
            this.push(obj);
        }
    }

    /**
     * 加载 .mmb 文件
     */
    static loadFile(filepath) {
        const data = fs.readFileSync(filepath);
        return new MomoVM(data);
    }
}

// ==================== 导出 ====================
module.exports = { MomoVM, OP, OP_NAMES, VMError };
