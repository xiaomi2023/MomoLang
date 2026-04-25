/**
 * MomoVM 运行时对象系统
 * 对应方案.md 中的运行时表示
 */

// ==================== 基础值类型 ====================

class MomoValue {
    constructor(type) {
        this.type = type;
    }
    toString() { return `<${this.type}>`; }
}

class MomoNumber extends MomoValue {
    constructor(value) {
        super('number');
        this.value = Number(value);
    }
    toString() { return String(this.value); }
}

class MomoString extends MomoValue {
    constructor(value) {
        super('string');
        this.value = String(value);
    }
    toString() { return this.value; }
}

class MomoBool extends MomoValue {
    constructor(value) {
        super('bool');
        this.value = Boolean(value);
    }
    toString() { return this.value ? 'true' : 'false'; }
}

class MomoNull extends MomoValue {
    constructor() {
        super('null');
        this.value = null;
    }
    toString() { return 'null'; }
}

// 单例
const NULL_VALUE = new MomoNull();

class MomoArray extends MomoValue {
    constructor(values = []) {
        super('array');
        this.values = values;
    }
    toString() {
        return '[' + this.values.map(v => v != null ? v.toString() : 'null').join(', ') + ']';
    }
    get(index) {
        if (index >= 0 && index < this.values.length) return this.values[index];
        return NULL_VALUE;
    }
    set(index, value) {
        if (index >= 0 && index < this.values.length) this.values[index] = value;
    }
    push(value) { this.values.push(value); }
    get length() { return this.values.length; }
}

class MomoDict extends MomoValue {
    constructor(entries = {}) {
        super('dict');
        this.entries = entries;
    }
    toString() {
        const items = Object.entries(this.entries)
            .map(([k, v]) => `${k}: ${v != null ? v.toString() : 'null'}`);
        return '{' + items.join(', ') + '}';
    }
    get(key) {
        const k = key instanceof MomoString ? key.value : String(key);
        return k in this.entries ? this.entries[k] : NULL_VALUE;
    }
    set(key, value) {
        const k = key instanceof MomoString ? key.value : String(key);
        this.entries[k] = value;
    }
}

class MomoFunction extends MomoValue {
    constructor(name, argCount, entryPoint, code) {
        super('function');
        this.name = name || '<anonymous>';
        this.argCount = argCount;
        this.entryPoint = entryPoint;
        this.code = code; // 字节码 Buffer
    }
    toString() { return `<function ${this.name}(${this.argCount})>`; }
}

class MomoClosure extends MomoValue {
    constructor(func, upvalues = []) {
        super('closure');
        this.func = func;       // MomoFunction
        this.upvalues = upvalues; // Upvalue[]
    }
    get argCount() { return this.func.argCount; }
    get entryPoint() { return this.func.entryPoint; }
    get code() { return this.func.code; }
    toString() { return `<closure ${this.func.name}>`; }
}

class Upvalue {
    constructor(index, isLocal = true) {
        this.index = index;       // 在栈或 upvalue 表中的索引
        this.isLocal = isLocal;    // 是否是局部变量
        this.isClosed = false;
        this.value = null;        // closed 后的值
    }
}

class MomoPointer extends MomoValue {
    constructor(targetRef) {
        super('ptr');
        this.target = targetRef;  // { value: any }
    }
    deref() { return this.target.value; }
    set(value) { this.target.value = value; }
    toString() { return `&(${this.target.value != null ? this.target.value.toString() : 'null'})`; }
}

class MomoObject extends MomoValue {
    constructor(klass = null, fields = {}) {
        super('object');
        this.klass = klass;       // MomoClass 或 null
        this.fields = fields;     // { name: MomoValue, ... }
    }
    toString() {
        const clsName = this.klass ? this.klass.name : 'Object';
        return `<${clsName}>`;
    }
    getField(name) {
        const key = name instanceof MomoString ? name.value : String(name);
        if (key in this.fields) return this.fields[key];
        if (this.klass) return this.klass.getMethod(key);
        return NULL_VALUE;
    }
    setField(name, value) {
        const key = name instanceof MomoString ? name.value : String(name);
        this.fields[key] = value;
    }
}

class MomoClass extends MomoValue {
    constructor(name, parent = null, methods = {}) {
        super('class');
        this.name = name;
        this.parent = parent;     // MomoClass 或 null
        this.methods = methods;    // { name: MomoFunction, ... }
    }
    toString() { return `<class ${this.name}>`; }
    getMethod(name) {
        const key = name instanceof MomoString ? name.value : String(name);
        if (key in this.methods) return this.methods[key];
        if (this.parent) return this.parent.getMethod(key);
        return NULL_VALUE;
    }
}

// 导出
if (typeof module !== 'undefined') {
    module.exports = {
        MomoValue, MomoNumber, MomoString, MomoBool, MomoNull, NULL_VALUE,
        MomoArray, MomoDict, MomoFunction, MomoClosure, Upvalue,
        MomoPointer, MomoObject, MomoClass
    };
}
