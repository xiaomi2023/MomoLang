# 代码生成器 (CodeGen) - MomoLang
# 对应方案.md 中的 Phase 4 阶段
#
# 将 AST 编译为 .mmb 字节码（与 JS VM 兼容的格式）

from typing import Dict, List, Tuple, Optional, Any, Union
import struct
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from ast_nodes import (
    Token, TokenType, Node,
    NumberNode, BoolNode, StringNode, NullNode, Identifier,
    BinaryOp, UnaryOp, CallNode, ArrayNode, DictNode, ArrowFuncNode,
    VarDecl, AssignStatement, ReturnStatement, IfStatement,
    WhileStatement, ForStatement, BreakStatement, ContinueStatement,
    Block, Program, ClassDef, ClassInstance, TryStatement, PrintStmt
)


class CodeGenError(Exception):
    pass


# 操作码常量（与 JS VM 保持一致）
HALT = 0x00
PUSH = 0x01
POP = 0x02
ADD = 0x03
SUB = 0x04
MUL = 0x05
DIV = 0x06
MOD = 0x07
NEG = 0x08
NOT = 0x09
CONCAT = 0x0A
CMP_EQ = 0x0B
CMP_NE = 0x0C
CMP_LT = 0x0D
CMP_GT = 0x0E
CMP_LE = 0x0F
CMP_GE = 0x10
AND = 0x11
OR = 0x12
JMP = 0x13
JMP_IF = 0x14
JMP_IFNOT = 0x15
LOAD_VAR = 0x16
STORE_VAR = 0x17
LOAD_CONST = 0x18
CALL = 0x19
RET = 0x1A
PRINT = 0x1B
NEW_OBJ = 0x1C
SET_FIELD = 0x1D
GET_FIELD = 0x1E
LOAD_THIS = 0x1F
NEW_ARR = 0x20
ARR_GET = 0x21
ARR_SET = 0x22
MAKE_CLOSURE = 0x23
LOAD_UPVAR = 0x24
STORE_UPVAR = 0x25
PTR_ADDR = 0x26
PTR_DEREF = 0x27
PTR_SET = 0x28
TRY_SETUP = 0x29
THROW = 0x2A
END_TRY = 0x2B
NEW_DICT = 0x2C
DICT_GET = 0x2D
DICT_SET = 0x2E
TYPE_OF = 0x2F
GC_COLLECT = 0x30


class CodeGenerator:
    """将 AST 编译为 MomoVM 字节码 (.mmb)"""

    def __init__(self, ast: List[Node]):
        if isinstance(ast, Program):
            self.ast = ast.statements
        else:
            self.ast = ast

        self.constants: List[Any] = []
        self.const_map: Dict[str, int] = {}
        self.instructions: List[int] = []
        self.variables: List[str] = []
        self.var_map: Dict[str, int] = {}
        self.functions: List[Tuple[str, int, int, int]] = []
        self.func_index = 0
        self.function_bodies: Dict[int, List[int]] = {}  # func_idx -> code
        self.current_func_idx = -1
        self.loop_stack: List[Tuple[int, int]] = []  # (break_label, continue_label)

    def _const_key(self, value: Any) -> str:
        return f"{type(value).__name__}:{str(value)}"

    def _add_const(self, value: Any) -> int:
        if value is None:
            key = "NoneType:None"
        elif isinstance(value, bool):
            key = f"bool:{value}"
        else:
            key = self._const_key(value)
        if key not in self.const_map:
            idx = len(self.constants)
            self.constants.append(value)
            self.const_map[key] = idx
            return idx
        return self.const_map[key]

    def _add_var(self, name: str) -> int:
        if name not in self.var_map:
            idx = len(self.variables)
            self.variables.append(name)
            self.var_map[name] = idx
            return idx
        return self.var_map[name]

    def _emit(self, *values):
        for v in values:
            if isinstance(v, int):
                self.instructions.append(v & 0xFF)
            elif isinstance(v, bytes):
                self.instructions.extend(v)
            elif isinstance(v, list):
                self.instructions.extend(v)

    def _emit_u16(self, val: int):
        self._emit((val >> 8) & 0xFF, val & 0xFF)

    def _emit_u32(self, val: int):
        self._emit((val >> 24) & 0xFF, (val >> 16) & 0xFF,
                   (val >> 8) & 0xFF, val & 0xFF)

    def _emit_op(self, opcode: int, operand: int = None):
        self.instructions.append(opcode)
        if operand is not None:
            self._emit_u16(operand)

    def _emit_push_const(self, value: Any):
        """PUSH 常量（内联格式）"""
        self.instructions.append(PUSH)
        if value is None:
            self.instructions.extend([3])  # type null
        elif isinstance(value, bool):
            self.instructions.extend([2, 1 if value else 0])  # type bool
        elif isinstance(value, (int, float)):
            self.instructions.append(0)  # type number
            self.instructions.extend(struct.pack('>d', float(value)))
        elif isinstance(value, str):
            encoded = value.encode('utf-8')
            self.instructions.append(1)  # type string
            self._emit_u16(len(encoded))
            self.instructions.extend(encoded)
        else:
            # 回退到常量池
            idx = self._add_const(value)
            self._emit_op(LOAD_CONST, idx)

    def _emit_jmp(self, opcode: int, label: int = 0) -> int:
        """发射跳转指令，返回标签位置（用于回填）"""
        self.instructions.append(opcode)
        label_pos = len(self.instructions)
        self._emit_u16(label)  # placeholder
        return label_pos

    def _patch_jmp(self, label_pos: int, target: int):
        """回填跳转目标地址"""
        self.instructions[label_pos] = (target >> 8) & 0xFF
        self.instructions[label_pos + 1] = target & 0xFF

    def generate(self) -> bytes:
        """生成最终的 .mmb 字节码"""
        self.instructions = []

        # 编译主程序
        for stmt in self.ast:
            self._compile_node(stmt)

        # 添加 HALT
        self.instructions.append(HALT)

        return self._build_mmb()

    def _build_mmb(self) -> bytes:
        """组装 .mmb 二进制格式"""
        result = bytearray()

        # Magic: "MomoVM\0" (7 bytes)
        result.extend(b'MomoVM\x00')

        # Version: u32
        result.extend(struct.pack('>I', 1))

        # EntryPoint: u32（代码段开始的偏移 = 到代码段数据的偏移）
        entry_point = (
            7 +  # magic
            4 +  # version
            4 +  # entry
            4 +  # const count
            self._calc_consts_size() +
            4    # code length
        )
        result.extend(struct.pack('>I', entry_point))

        # 常量池
        result.extend(struct.pack('>I', len(self.constants)))
        for c in self.constants:
            if c is None:
                result.extend(struct.pack('B', 3))  # null
            elif isinstance(c, bool):
                result.extend(struct.pack('BB', 2, 1 if c else 0))
            elif isinstance(c, (int, float)):
                result.extend(struct.pack('B', 0))  # number
                result.extend(struct.pack('>d', float(c)))
            elif isinstance(c, str):
                encoded = c.encode('utf-8')
                result.extend(struct.pack('B', 1))  # string
                result.extend(struct.pack('>H', len(encoded)))
                result.extend(encoded)

        # 代码段
        code_data = bytes(self.instructions)
        result.extend(struct.pack('>I', len(code_data)))
        result.extend(code_data)

        # 计算文件头偏移（用于函数表偏移计算）
        header_offset = entry_point + 4 + len(code_data)

        # 变量表
        result.extend(struct.pack('>I', len(self.variables)))
        for name in self.variables:
            encoded_name = name.encode('utf-8')
            result.extend(struct.pack('B', len(encoded_name)))
            result.extend(encoded_name)
            result.extend(struct.pack('BB', 0, 0))  # type=let, scope=0

        # 函数表
        result.extend(struct.pack('>I', len(self.functions)))
        for fname, offset, arg_count, up_count in self.functions:
            encoded_name = fname.encode('utf-8')
            result.extend(struct.pack('B', len(encoded_name)))
            result.extend(encoded_name)
            result.extend(struct.pack('>I', offset + entry_point))
            result.extend(struct.pack('BB', arg_count, up_count))

        # 行号表（空）
        result.extend(struct.pack('>I', 0))

        return bytes(result)

    def _calc_consts_size(self) -> int:
        size = 0
        for c in self.constants:
            if c is None:
                size += 1
            elif isinstance(c, bool):
                size += 2
            elif isinstance(c, (int, float)):
                size += 9  # 1(type) + 8(double)
            elif isinstance(c, str):
                size += 3 + len(c.encode('utf-8'))
        return size

    def _calc_vars_size(self) -> int:
        size = 0
        for name in self.variables:
            size += 1 + len(name.encode('utf-8')) + 2
        return size

    def _calc_funcs_size(self) -> int:
        size = 0
        for fname, _, _, _ in self.functions:
            size += 1 + len(fname.encode('utf-8')) + 4 + 2
        return size

    def _compile_node(self, node: Node):
        """编译单个AST节点为字节码"""
        if isinstance(node, Block):
            for stmt in node.statements:
                self._compile_node(stmt)

        elif isinstance(node, VarDecl):
            if node.value:
                self._compile_node(node.value)
            else:
                self._emit_push_const(None)
            var_idx = self._add_var(node.name)
            self._emit_op(STORE_VAR, var_idx)

        elif isinstance(node, AssignStatement):
            self._compile_node(node.value)
            var_idx = self._add_var(node.target)
            self._emit_op(STORE_VAR, var_idx)

        elif isinstance(node, PrintStmt):
            self._compile_node(node.expr)
            self.instructions.append(PRINT)

        elif isinstance(node, ReturnStatement):
            if node.value:
                self._compile_node(node.value)
            else:
                self._emit_push_const(None)
            self.instructions.append(RET)

        elif isinstance(node, IfStatement):
            self._compile_node(node.condition)
            else_label = self._emit_jmp(JMP_IFNOT, 0)
            self._compile_node(node.then_branch)
            if node.else_branch:
                end_label = self._emit_jmp(JMP, 0)
                else_addr = len(self.instructions)
                self._patch_jmp(else_label, else_addr)
                self._compile_node(node.else_branch)
                end_addr = len(self.instructions)
                self._patch_jmp(end_label, end_addr)
            else:
                after_addr = len(self.instructions)
                self._patch_jmp(else_label, after_addr)

        elif isinstance(node, WhileStatement):
            loop_start = len(self.instructions)
            self._compile_node(node.condition)
            exit_label = self._emit_jmp(JMP_IFNOT, 0)
            self.loop_stack.append((exit_label, loop_start))
            self._compile_node(node.body)
            self.loop_stack.pop()
            self._emit_jmp(JMP, loop_start)
            exit_addr = len(self.instructions)
            self._patch_jmp(exit_label, exit_addr)

        elif isinstance(node, ForStatement):
            if node.init:
                self._compile_node(node.init)
            loop_start = len(self.instructions)
            if node.condition:
                self._compile_node(node.condition)
                exit_label = self._emit_jmp(JMP_IFNOT, 0)
            else:
                exit_label = None
            self.loop_stack.append((exit_label, loop_start))
            if node.body:
                self._compile_node(node.body)
            self.loop_stack.pop()
            if node.update:
                self._compile_node(node.update)
            self._emit_jmp(JMP, loop_start)
            if exit_label is not None:
                exit_addr = len(self.instructions)
                self._patch_jmp(exit_label, exit_addr)

        elif isinstance(node, BreakStatement):
            if self.loop_stack:
                break_label = self._emit_jmp(JMP, 0)
                self.loop_stack[-1] = (break_label, self.loop_stack[-1][1])

        elif isinstance(node, ContinueStatement):
            if self.loop_stack:
                continue_addr = self.loop_stack[-1][1]
                self._emit_jmp(JMP, continue_addr)

        elif isinstance(node, BinaryOp):
            self._compile_node(node.left)
            self._compile_node(node.right)
            op_map = {
                '+': ADD, '-': SUB, '*': MUL, '/': DIV, '%': MOD,
                '==': CMP_EQ, '!=': CMP_NE, '<': CMP_LT, '>': CMP_GT,
                '<=': CMP_LE, '>=': CMP_GE, '&&': AND, '||': OR,
            }
            opcode = op_map.get(node.op)
            if opcode is not None:
                self.instructions.append(opcode)
            else:
                self.instructions.append(ADD)

        elif isinstance(node, UnaryOp):
            self._compile_node(node.operand)
            if node.op == '-':
                self.instructions.append(NEG)
            elif node.op in ('!', 'not'):
                self.instructions.append(NOT)

        elif isinstance(node, CallNode):
            # 编译参数（从左到右）
            for arg in node.args:
                self._compile_node(arg)
            # 编译函数（函数本身）
            self._compile_node(node.func)
            # CALL 指令
            self._emit_op(CALL, len(node.args))

        elif isinstance(node, NumberNode):
            self._emit_push_const(node.value)

        elif isinstance(node, StringNode):
            self._emit_push_const(node.value)

        elif isinstance(node, BoolNode):
            self._emit_push_const(node.value)

        elif isinstance(node, NullNode):
            self._emit_push_const(None)

        elif isinstance(node, Identifier):
            var_idx = self._add_var(node.name)
            self._emit_op(LOAD_VAR, var_idx)

        elif isinstance(node, ArrayNode):
            for elem in node.elements:
                self._compile_node(elem)
            self._emit_op(NEW_ARR, len(node.elements))

        elif isinstance(node, DictNode):
            for key, value in node.entries:
                if key:
                    self._emit_push_const(key)
                self._compile_node(value)
            self._emit_op(NEW_DICT, len(node.entries))

        elif isinstance(node, ArrowFuncNode):
            # 创建函数并编译函数体
            func_idx = self.func_index
            self.func_index += 1

            # 注册函数（先占位，稍后更新偏移）
            self.functions.append((f"anon_{func_idx}", 0, len(node.params), 0))

            # 编译函数体
            body_code = []
            saved_instructions = self.instructions
            self.instructions = []

            # 存储参数到局部变量
            for i, param in enumerate(node.params):
                # 参数在栈上，通过 STORE_VAR 保存
                var_idx = self._add_var(param)
                self._emit_op(STORE_VAR, var_idx)

            # 编译函数体
            self._compile_node(node.body)
            self.instructions.append(RET)

            func_body = list(self.instructions)
            self.instructions = saved_instructions

            # 更新函数偏移（在当前指令流位置之后）
            func_offset = len(self.instructions)
            self.functions[func_idx] = (f"anon_{func_idx}", func_offset, len(node.params), 0)

            # 把函数体追加到指令流
            self.instructions.extend(func_body)

            # 压入函数引用（简化：压入null，实际运行靠解释器模式）
            self._emit_push_const(None)

        elif isinstance(node, ClassDef):
            # 简化处理：类定义在字节码中不生成代码（由解释器处理）
            pass

        elif isinstance(node, ClassInstance):
            # new ClassName(args) -> 简化处理
            self._emit_push_const(None)

        elif isinstance(node, TryStatement):
            # try-catch
            catch_start = len(self.instructions) + 3  # 跳转到 catch
            self._emit_op(TRY_SETUP, 0)  # placeholder
            self._compile_node(node.body)
            self.instructions.append(END_TRY)
            # 跳过 catch
            skip_label = self._emit_jmp(JMP, 0)
            # catch 块
            catch_addr = len(self.instructions)
            # 回填 TRY_SETUP
            self.instructions[1] = (catch_addr >> 8) & 0xFF
            self.instructions[2] = catch_addr & 0xFF

            if node.catch_body:
                if node.catch_var:
                    var_idx = self._add_var(node.catch_var)
                    self._emit_op(STORE_VAR, var_idx)
                self._compile_node(node.catch_body)

            skip_addr = len(self.instructions)
            self._patch_jmp(skip_label, skip_addr)

        elif isinstance(node, (BreakStatement, ContinueStatement)):
            pass

        else:
            pass
