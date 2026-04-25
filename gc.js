/**
 * MomoVM 垃圾回收器 - Mark & Sweep
 * 对应方案.md 中的 5.4 节
 */

const { MomoValue, MomoArray, MomoDict, MomoClosure, MomoObject, MomoPointer } = require('./objects');

class GC {
    constructor() {
        this.objects = [];        // 所有堆对象
        this.marked = new Set();
        this.threshold = 1000;    // 分配阈值
        this.allocCount = 0;
    }

    /**
     * 跟踪一个新分配的对象
     */
    track(obj) {
        this.objects.push(obj);
        this.allocCount++;
        if (this.allocCount >= this.threshold) {
            this.collect([]);
        }
    }

    /**
     * 标记阶段：从根集出发标记所有可达对象
     */
    mark(roots) {
        this.marked = new Set();
        for (const obj of roots) {
            this._mark(obj);
        }
    }

    _mark(obj) {
        if (!obj || this.marked.has(obj)) return;
        
        // 只标记 MomoValue 实例
        if (!(obj instanceof MomoValue)) return;
        
        this.marked.add(obj);

        // 递归标记容器中的引用
        if (obj instanceof MomoArray) {
            for (const item of obj.values) {
                this._mark(item);
            }
        } else if (obj instanceof MomoDict) {
            for (const key in obj.entries) {
                this._mark(obj.entries[key]);
            }
        } else if (obj instanceof MomoClosure) {
            this._mark(obj.func);
            for (const up of obj.upvalues) {
                if (up.value instanceof MomoValue) {
                    this._mark(up.value);
                }
            }
        } else if (obj instanceof MomoObject) {
            this._mark(obj.klass);
            for (const key in obj.fields) {
                this._mark(obj.fields[key]);
            }
        } else if (obj instanceof MomoPointer) {
            if (obj.target && obj.target.value instanceof MomoValue) {
                this._mark(obj.target.value);
            }
        }
    }

    /**
     * 清扫阶段：移除未标记的对象
     */
    sweep() {
        const before = this.objects.length;
        this.objects = this.objects.filter(obj => this.marked.has(obj));
        const after = this.objects.length;
        return before - after; // 返回清理数量
    }

    /**
     * 执行一次完整的 GC
     */
    collect(roots) {
        this.mark(roots);
        const freed = this.sweep();
        this.allocCount = 0;
        return freed;
    }

    /**
     * 获取当前堆对象数量
     */
    getHeapSize() {
        return this.objects.length;
    }
}

module.exports = { GC };
