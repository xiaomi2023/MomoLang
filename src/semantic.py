# 语义分析器 - MomoLang
# 对应方案.md 中的 Phase 3 阶段
#
# 功能：类型检查、变量作用域管理、常量检查

from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from ast_nodes import (
    Token, TokenType, Node,
    NumberNode, BoolNode, StringNode, NullNode, Identifier,
    BinaryOp, UnaryOp, CallNode, ArrayNode, DictNode, ArrowFuncNode,
    VarDecl, AssignStatement, ReturnStatement, IfStatement,
    WhileStatement, ForStatement, BreakStatement, ContinueStatement,
    Block, Program, ClassDef, ClassInstance, TryStatement, PrintStmt
)


class SemanticError(Exception):
    pass


# 类型常量
class TypeNames:
    INT = "int"
    FLOAT = "float"
    STRING = "string"
    BOOL = "bool"
    NULL = "null"
    ARRAY = "array"
    DICT = "dict"
    FUNCTION = "function"
    OBJECT = "object"
    ANY = "any"


class Scope:
    def __init__(self, name: str, parent: Optional["Scope"] = None):
        self.name = name
        self.parent = parent
        self.variables: Dict[str, str] = {}  # name -> type
        self.constants: Set[str] = set()     # const 变量名

    def declare(self, name: str, type_: str, is_const: bool = False):
        if name in self.variables:
            raise SemanticError(f"Variable '{name}' already declared in this scope")
        self.variables[name] = type_
        if is_const:
            self.constants.add(name)

    def get_type(self, name: str) -> str:
        if name in self.variables:
            return self.variables[name]
        if self.parent:
            return self.parent.get_type(name)
        raise SemanticError(f"Undefined variable '{name}'")

    def is_const(self, name: str) -> bool:
        if name in self.constants:
            return True
        if self.parent:
            return self.parent.is_const(name)
        return False

    def check_assignable(self, name: str):
        if self.is_const(name):
            raise SemanticError(f"Cannot assign to constant variable '{name}'")

    def __repr__(self):
        return f"Scope({self.name}, vars={self.variables})"


BUILTINS = {
    'print', 'str', 'map', 'filter', 'reduce', 'forEach',
    'len', 'push', 'pop', 'toUpper', 'toLower', 'toNumber',
    'abs', 'floor', 'ceil', 'round', 'max', 'min',
    'typeOf', 'throwError', 'compare',
}

class SemanticAnalyzer:
    def __init__(self, ast: List[Node]):
        self.ast = ast if isinstance(ast, list) else ast.statements
        self.scopes: List[Scope] = [Scope("global")]
        self.errors: List[str] = []

    @property
    def current_scope(self) -> Scope:
        return self.scopes[-1]

    def analyze(self) -> Program:
        """执行语义分析"""
        # 注册内置函数
        for name in BUILTINS:
            self.current_scope.declare(name, TypeNames.FUNCTION)

        try:
            for stmt in self.ast:
                self.visit(stmt)
            if self.errors:
                for err in self.errors:
                    print(f"  [Semantic Warning] {err}")
            return Program(self.ast)
        except SemanticError as e:
            print(f"  [Semantic Error] {e}")
            raise

    def enter_scope(self, name: str):
        self.scopes.append(Scope(name, self.current_scope))

    def exit_scope(self):
        if len(self.scopes) > 1:
            self.scopes.pop()

    def visit(self, node: Node):
        """访问节点，进行语义检查"""
        if isinstance(node, Program):
            for stmt in node.statements:
                self.visit(stmt)

        elif isinstance(node, Block):
            self.enter_scope("block")
            for stmt in node.statements:
                self.visit(stmt)
            self.exit_scope()

        elif isinstance(node, VarDecl):
            type_ = self._infer_type(node.value) if node.value else TypeNames.ANY
            self.current_scope.declare(node.name, type_, node.is_const)
            if node.type and type_ != TypeNames.ANY and node.type != type_:
                self.errors.append(
                    f"Type mismatch: declared '{node.name}' as {node.type}, "
                    f"but value is {type_}"
                )

        elif isinstance(node, AssignStatement):
            target_type = self.current_scope.get_type(node.target)
            self.current_scope.check_assignable(node.target)
            value_type = self._infer_type(node.value)
            # 类型兼容性检查（简单版）
            if target_type != TypeNames.ANY and value_type != TypeNames.ANY and target_type != value_type:
                self.errors.append(
                    f"Type mismatch: assigning {value_type} to '{node.target}' (expected {target_type})"
                )

        elif isinstance(node, PrintStmt):
            self.visit(node.expr)

        elif isinstance(node, ReturnStatement):
            if node.value:
                self.visit(node.value)

        elif isinstance(node, IfStatement):
            self.visit(node.condition)
            self.visit(node.then_branch)
            if node.else_branch:
                self.visit(node.else_branch)

        elif isinstance(node, WhileStatement):
            self.visit(node.condition)
            self.visit(node.body)

        elif isinstance(node, ForStatement):
            self.enter_scope("for")
            if node.init:
                self.visit(node.init)
            if node.condition:
                self.visit(node.condition)
            if node.update:
                self.visit(node.update)
            if node.body:
                self.visit(node.body)
            self.exit_scope()

        elif isinstance(node, ArrowFuncNode):
            self.enter_scope("function")
            for param in node.params:
                self.current_scope.declare(param, TypeNames.ANY)
            self.visit(node.body)
            self.exit_scope()

        elif isinstance(node, CallNode):
            self.visit(node.func)
            for arg in node.args:
                self.visit(arg)

        elif isinstance(node, BinaryOp):
            self.visit(node.left)
            self.visit(node.right)

        elif isinstance(node, UnaryOp):
            self.visit(node.operand)

        elif isinstance(node, Identifier):
            # 只检查变量是否存在（在 get_type 中会抛出异常）
            self.current_scope.get_type(node.name)

        elif isinstance(node, ArrayNode):
            for elem in node.elements:
                self.visit(elem)

        elif isinstance(node, ClassInstance):
            # 检查类是否存在（简化处理）
            pass

        elif isinstance(node, TryStatement):
            self.visit(node.body)
            if node.catch_body:
                self.enter_scope("catch")
                if node.catch_var:
                    self.current_scope.declare(node.catch_var, TypeNames.ANY)
                self.visit(node.catch_body)
                self.exit_scope()

        # 字面量节点不需要特殊处理
        elif isinstance(node, (NumberNode, BoolNode, StringNode, NullNode, BreakStatement, ContinueStatement)):
            pass

        else:
            # 对于未知节点，尝试递归访问子节点
            for attr_name in dir(node):
                if attr_name.startswith('_'):
                    continue
                attr = getattr(node, attr_name)
                if isinstance(attr, Node):
                    self.visit(attr)
                elif isinstance(attr, list):
                    for item in attr:
                        if isinstance(item, Node):
                            self.visit(item)

    def _infer_type(self, node: Node) -> str:
        """推断表达式的类型"""
        if isinstance(node, NumberNode):
            val = node.value
            if isinstance(val, float) and val == int(val):
                return TypeNames.INT
            return TypeNames.FLOAT
        elif isinstance(node, BoolNode):
            return TypeNames.BOOL
        elif isinstance(node, StringNode):
            return TypeNames.STRING
        elif isinstance(node, NullNode):
            return TypeNames.NULL
        elif isinstance(node, Identifier):
            return self.current_scope.get_type(node.name)
        elif isinstance(node, BinaryOp):
            left_type = self._infer_type(node.left)
            right_type = self._infer_type(node.right)
            if node.op in ('+',):
                if left_type == TypeNames.STRING or right_type == TypeNames.STRING:
                    return TypeNames.STRING
                return TypeNames.FLOAT if TypeNames.FLOAT in (left_type, right_type) else TypeNames.INT
            elif node.op in ('-', '*', '/', '%'):
                return TypeNames.FLOAT if TypeNames.FLOAT in (left_type, right_type) else TypeNames.INT
            elif node.op in ('<', '>', '<=', '>=', '==', '!='):
                return TypeNames.BOOL
            elif node.op in ('&&', '||'):
                return TypeNames.BOOL
            return TypeNames.ANY
        elif isinstance(node, UnaryOp):
            if node.op == '-':
                return self._infer_type(node.operand)
            if node.op == '!':
                return TypeNames.BOOL
            return TypeNames.ANY
        elif isinstance(node, CallNode):
            return TypeNames.ANY
        elif isinstance(node, ArrayNode):
            return TypeNames.ARRAY
        elif isinstance(node, ArrowFuncNode):
            return TypeNames.FUNCTION
        elif isinstance(node, ClassInstance):
            return TypeNames.OBJECT
        elif isinstance(node, VarDecl):
            return TypeNames.ANY
        return TypeNames.ANY
