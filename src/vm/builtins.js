/**
 * Momo 内置函数库 (JavaScript/Node.js 实现)
 * 对应方案.md 中的 builtins.js
 */

const { 
    MomoValue, MomoNumber, MomoString, MomoBool, MomoNull, NULL_VALUE,
    MomoArray, MomoDict
} = require('./objects');

/**
 * 创建所有内置函数
 * @param {object} globals - 全局变量表（用于注册内置函数）
 */
function registerBuiltins(globals) {
    // 高阶函数
    globals['map'] = function(arr, func) {
        if (!(arr instanceof MomoArray)) throw new Error('map: first argument must be an array');
        const result = [];
        for (const item of arr.values) {
            result.push(func(item));
        }
        return new MomoArray(result);
    };

    globals['filter'] = function(arr, func) {
        if (!(arr instanceof MomoArray)) throw new Error('filter: first argument must be an array');
        const result = [];
        for (const item of arr.values) {
            if (func(item)) result.push(item);
        }
        return new MomoArray(result);
    };

    globals['reduce'] = function(arr, func, initial) {
        if (!(arr instanceof MomoArray)) throw new Error('reduce: first argument must be an array');
        let acc = initial;
        for (const item of arr.values) {
            acc = func(acc, item);
        }
        return acc;
    };

    globals['forEach'] = function(arr, func) {
        if (!(arr instanceof MomoArray)) throw new Error('forEach: first argument must be an array');
        for (const item of arr.values) {
            func(item);
        }
        return NULL_VALUE;
    };

    // 字符串处理
    globals['toUpper'] = function(str) {
        return new MomoString(str.toString().toUpperCase());
    };

    globals['toLower'] = function(str) {
        return new MomoString(str.toString().toLowerCase());
    };

    globals['toNumber'] = function(val) {
        const n = Number(val.toString());
        return new MomoNumber(isNaN(n) ? 0 : n);
    };

    globals['str'] = function(val) {
        return new MomoString(val != null ? val.toString() : 'null');
    };

    // 数组处理
    globals['len'] = function(val) {
        if (val instanceof MomoArray) return new MomoNumber(val.length);
        if (val instanceof MomoString) return new MomoNumber(val.value.length);
        if (val instanceof MomoDict) return new MomoNumber(Object.keys(val.entries).length);
        return new MomoNumber(0);
    };

    globals['push'] = function(arr, val) {
        if (!(arr instanceof MomoArray)) throw new Error('push: first argument must be an array');
        arr.push(val);
        return arr;
    };

    globals['pop'] = function(arr) {
        if (!(arr instanceof MomoArray)) throw new Error('pop: first argument must be an array');
        return arr.values.pop() || NULL_VALUE;
    };

    // 类型检查
    globals['typeOf'] = function(val) {
        return new MomoString(val ? val.type : 'null');
    };

    // 输出函数
    globals['print'] = function(val) {
        console.log(val != null ? val.toString() : 'null');
        return val;
    };

    // 数学函数
    globals['abs'] = function(val) {
        if (val instanceof MomoNumber) return new MomoNumber(Math.abs(val.value));
        return new MomoNumber(0);
    };

    globals['floor'] = function(val) {
        if (val instanceof MomoNumber) return new MomoNumber(Math.floor(val.value));
        return new MomoNumber(0);
    };

    globals['ceil'] = function(val) {
        if (val instanceof MomoNumber) return new MomoNumber(Math.ceil(val.value));
        return new MomoNumber(0);
    };

    globals['round'] = function(val) {
        if (val instanceof MomoNumber) return new MomoNumber(Math.round(val.value));
        return new MomoNumber(0);
    };

    globals['max'] = function(a, b) {
        const va = a instanceof MomoNumber ? a.value : 0;
        const vb = b instanceof MomoNumber ? b.value : 0;
        return new MomoNumber(Math.max(va, vb));
    };

    globals['min'] = function(a, b) {
        const va = a instanceof MomoNumber ? a.value : 0;
        const vb = b instanceof MomoNumber ? b.value : 0;
        return new MomoNumber(Math.min(va, vb));
    };

    // 比较工具
    globals['compare'] = function(a, b, op) {
        const opStr = op instanceof MomoString ? op.value : String(op);
        const va = a instanceof MomoNumber ? a.value : 0;
        const vb = b instanceof MomoNumber ? b.value : 0;
        switch (opStr) {
            case '<': return new MomoBool(va < vb);
            case '>': return new MomoBool(va > vb);
            case '<=': return new MomoBool(va <= vb);
            case '>=': return new MomoBool(va >= vb);
            case '==': return new MomoBool(va === vb);
            case '!=': return new MomoBool(va !== vb);
            default: return new MomoBool(false);
        }
    };

    // 错误处理
    globals['throwError'] = function(msg) {
        throw new Error(msg instanceof MomoString ? msg.value : String(msg));
    };
}

module.exports = { registerBuiltins };
