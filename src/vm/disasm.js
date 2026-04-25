/**
 * MomoVM 反汇编器
 * 将 .mmb 字节码反汇编为可读的指令序列
 */

const fs = require('fs');
const { OP, OP_NAMES } = require('./momovm');

class Disassembler {
    /**
     * @param {Buffer} code - .mmb 字节码
     */
    constructor(code) {
        this.code = code;
        this.ip = 0;
        this.constants = [];
        this.globalNames = [];
        this.functions = [];
        this.lines = [];
    }

    /**
     * 反汇编整个字节码
     */
    disassemble() {
        const output = [];
        this._parseHeader(output);
        return output.join('\n');
    }

    _parseHeader(output) {
        let offset = 0;
        
        // Magic
        const magic = this.code.slice(0, 8).toString();
        output.push(`; Magic: ${magic}`);
        offset = 8;

        // Version
        const version = this.code.readUInt32BE(offset);
        output.push(`; Version: ${version}`);
        offset += 4;

        // EntryPoint
        const entryPoint = this.code.readUInt32BE(offset);
        output.push(`; EntryPoint: 0x${entryPoint.toString(16)}`);
        offset += 4;

        // 常量池
        const constCount = this.code.readUInt32BE(offset);
        offset += 4;
        output.push(`\n; === 常量池 (${constCount}) ===`);
        for (let i = 0; i < constCount; i++) {
            const type = this.code[offset++];
            let value;
            switch (type) {
                case 0: // number
                    value = this.code.readDoubleBE(offset);
                    offset += 8;
                    output.push(`  const[${i}] = number(${value})`);
                    this.constants.push(value);
                    break;
                case 1: { // string
                    const len = this.code.readUInt16BE(offset);
                    offset += 2;
                    value = this.code.slice(offset, offset + len).toString('utf-8');
                    offset += len;
                    output.push(`  const[${i}] = string("${value}")`);
                    this.constants.push(value);
                    break;
                }
                case 2: // bool
                    value = this.code[offset++] === 1;
                    output.push(`  const[${i}] = bool(${value})`);
                    this.constants.push(value);
                    break;
                case 3: // null
                    output.push(`  const[${i}] = null`);
                    this.constants.push(null);
                    break;
            }
        }

        // 代码段大小
        const codeLen = this.code.readUInt32BE(offset);
        offset += 4;
        output.push(`\n; === 代码段 (${codeLen} bytes) ===`);

        // 变量表
        const varCount = this.code.readUInt32BE(offset);
        offset += 4;
        output.push(`\n; === 变量表 (${varCount}) ===`);
        for (let i = 0; i < varCount; i++) {
            const nameLen = this.code[offset++];
            const name = this.code.slice(offset, offset + nameLen).toString('utf-8');
            offset += nameLen;
            const varType = this.code[offset++]; // 0=let, 1=const
            const scopeLevel = this.code[offset++];
            output.push(`  var[${i}] = ${name} (${varType === 0 ? 'let' : 'const'}, scope=${scopeLevel})`);
            this.globalNames.push(name);
        }

        // 函数表
        const funcCount = this.code.readUInt32BE(offset);
        offset += 4;
        output.push(`\n; === 函数表 (${funcCount}) ===`);
        for (let i = 0; i < funcCount; i++) {
            const nameLen = this.code[offset++];
            const name = this.code.slice(offset, offset + nameLen).toString('utf-8');
            offset += nameLen;
            const codeOff = this.code.readUInt32BE(offset);
            offset += 4;
            const argCount = this.code[offset++];
            const upCount = this.code[offset++];
            output.push(`  func[${i}] = ${name}(args=${argCount}, upvalues=${upCount}) @ 0x${codeOff.toString(16)}`);
            this.functions.push({ name, codeOff, argCount, upCount });
        }

        // 行号表
        const lineCount = this.code.readUInt32BE(offset);
        offset += 4;
        for (let i = 0; i < lineCount; i++) {
            const lineIp = this.code.readUInt32BE(offset);
            offset += 4;
            const line = this.code.readUInt32BE(offset);
            offset += 4;
            this.lines.push({ ip: lineIp, line });
        }

        // 反汇编代码段
        const codeStart = offset;
        this.ip = codeStart + 1; // 从代码段第一条指令开始（跳过默认 HALT 或类似）
        
        output.push(`\n; === 指令序列 ===`);
        
        // 查找函数入口，标记函数边界
        const funcEntries = new Set(this.functions.map(f => f.codeOff));
        
        this.ip = codeStart;
        while (this.ip < this.code.length) {
            const lineInfo = this.lines.find(l => l.ip === this.ip);
            if (lineInfo) {
                output.push(`\n; line ${lineInfo.line}:`);
            }
            
            // 检查是否是函数入口
            if (funcEntries.has(this.ip)) {
                const func = this.functions.find(f => f.codeOff === this.ip);
                output.push(`\n; >>> function ${func.name} <<<`);
            }
            
            const result = this._disassembleInstruction();
            if (result === null) break;
            output.push(`  0x${(this.ip - 1).toString(16).padStart(4, '0')}: ${result}`);
        }

        output.push(`\n; === 行号表 (${lineCount}) ===`);
        for (const l of this.lines) {
            output.push(`  ip=0x${l.ip.toString(16)} -> line ${l.line}`);
        }
    }

    _disassembleInstruction() {
        if (this.ip >= this.code.length) return null;

        const opcode = this.code[this.ip++];
        const name = OP_NAMES[opcode] || `UNKNOWN(0x${opcode.toString(16)})`;

        switch (opcode) {
            case OP.HALT: return `${name}`;
            case OP.POP: return `${name}`;
            case OP.RET: return `${name}`;
            case OP.PRINT: return `${name}`;
            case OP.NOT: return `${name}`;
            case OP.NEG: return `${name}`;
            case OP.ADD: return `${name}`;
            case OP.SUB: return `${name}`;
            case OP.MUL: return `${name}`;
            case OP.DIV: return `${name}`;
            case OP.MOD: return `${name}`;
            case OP.CONCAT: return `${name}`;
            case OP.CMP_EQ: return `${name}`;
            case OP.CMP_NE: return `${name}`;
            case OP.CMP_LT: return `${name}`;
            case OP.CMP_GT: return `${name}`;
            case OP.CMP_LE: return `${name}`;
            case OP.CMP_GE: return `${name}`;
            case OP.AND: return `${name}`;
            case OP.OR: return `${name}`;
            case OP.END_TRY: return `${name}`;
            case OP.THROW: return `${name}`;
            case OP.GC_COLLECT: return `${name}`;
            case OP.TYPE_OF: return `${name}`;

            case OP.PUSH: {
                const type = this.code[this.ip++];
                switch (type) {
                    case 0: { // number
                        const val = this.code.readDoubleBE(this.ip);
                        this.ip += 8;
                        return `${name} number(${val})`;
                    }
                    case 1: { // string
                        const len = this.code.readUInt16BE(this.ip);
                        this.ip += 2;
                        const str = this.code.slice(this.ip, this.ip + len).toString('utf-8');
                        this.ip += len;
                        return `${name} string("${str}")`;
                    }
                    case 2: { // bool
                        const b = this.code[this.ip++] === 1;
                        return `${name} bool(${b})`;
                    }
                    case 3: // null
                        return `${name} null`;
                    default:
                        return `${name} unknown_type(${type})`;
                }
            }

            case OP.JMP: {
                const addr = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} -> 0x${addr.toString(16)}`;
            }

            case OP.JMP_IF:
            case OP.JMP_IFNOT: {
                const addr = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} -> 0x${addr.toString(16)}`;
            }

            case OP.LOAD_VAR:
            case OP.STORE_VAR: {
                const idx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                const name = this.globalNames[idx] || `var[${idx}]`;
                return `${name} ${name}`;
            }

            case OP.LOAD_CONST: {
                const idx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                const val = this.constants[idx] !== undefined ? this.constants[idx] : `const[${idx}]`;
                return `${name} const[${idx}] = ${typeof val === 'string' ? '"' + val + '"' : val}`;
            }

            case OP.CALL: {
                const count = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} args=${count}`;
            }

            case OP.NEW_OBJ:
            case OP.NEW_ARR:
            case OP.NEW_DICT: {
                const count = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} count=${count}`;
            }

            case OP.SET_FIELD:
            case OP.GET_FIELD: {
                const idx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                const name = this.globalNames[idx] || `field[${idx}]`;
                return `${name} ${name}`;
            }

            case OP.MAKE_CLOSURE: {
                const funcIdx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                const upCount = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                let extra = ` func[${funcIdx}]`;
                for (let i = 0; i < upCount; i++) {
                    const isLocal = this.code[this.ip++] === 1;
                    const idx = this.code.readUInt16BE(this.ip);
                    this.ip += 2;
                    extra += ` upvalue(${isLocal ? 'local' : 'up'}[${idx}])`;
                }
                return `${name}${extra}`;
            }

            case OP.LOAD_UPVAR:
            case OP.STORE_UPVAR: {
                const idx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} up[${idx}]`;
            }

            case OP.PTR_ADDR: {
                const idx = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                const name = this.globalNames[idx] || `var[${idx}]`;
                return `${name} &${name}`;
            }

            case OP.PTR_DEREF:
            case OP.PTR_SET: {
                return `${name}`;
            }

            case OP.TRY_SETUP: {
                const addr = this.code.readUInt16BE(this.ip);
                this.ip += 2;
                return `${name} catch @ 0x${addr.toString(16)}`;
            }

            case OP.ARR_GET:
            case OP.ARR_SET:
            case OP.DICT_GET:
            case OP.DICT_SET: {
                return `${name}`;
            }

            case OP.LOAD_THIS:
                return `${name}`;

            default:
                return `${name}`;
        }
    }

    static disassembleFile(filepath) {
        const data = fs.readFileSync(filepath);
        const dis = new Disassembler(data);
        return dis.disassemble();
    }
}

module.exports = { Disassembler };
