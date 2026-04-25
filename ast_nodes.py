# AST 节点定义 - MomoLang 语法分析
# 对应方案.md 中的 Phase 0 阶段

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Union, Dict, Any


class TokenType(Enum):
    # 字面量和类型
    NUMBER = 1
    STRING_LITERAL = 2
    TRUE = 3
    FALSE = 4
    NULL = 5
    INT = 6
    FLOAT = 7
    STRING = 8
    BOOL = 9
    ARRAY = 10
    DICT = 11

    # 关键字
    LET = 12
    CONST = 13
    FUNCTION = 14
    IF = 15
    ELSE = 16
    WHILE = 17
    FOR = 18
    RETURN = 19
    CLASS = 20
    SUPER = 21
    THIS = 22
    NEW = 23
    TRY = 24
    CATCH = 25
    PRINT = 26
    BREAK = 27
    CONTINUE = 28
    MAP = 29
    FILTER = 30
    REDUCE = 31
    FOREACH = 32

    # 运算符
    PLUS = 33     # +
    MINUS = 34    # -
    STAR = 35     # *
    SLASH = 36    # /
    MOD = 37      # %
    ASSIGN = 38   # =
    EQ = 39       # ==
    NE = 40       # !=
    LT = 41       # <
    GT = 42       # >
    LE = 43       # <=
    GE = 44       # >=
    AND = 45      # &&
    OR = 46       # ||
    NOT = 47      # !

    # 分隔符
    LP = 48       # (
    RP = 49       # )
    LB = 50       # {
    RB = 51       # }
    LBRK = 52     # [
    RBRK = 53     # ]
    SEMI = 54     # ;
    COMMA = 55    # ,
    COLON = 56    # :
    DOT = 57      # .
    ARROW = 58    # ->

    # 特殊
    ID = 59       # 标识符
    EOF = 60      # 文件结束


@dataclass
class Token:
    type: TokenType
    value: str
    line: int
    column: int  # 注意这里用 column 而不是 pos

    def __repr__(self):
        return f"Token({self.type.name}, '{self.value}', L{self.line}:{self.column})"


@dataclass
class Node:
    """所有AST节点的基类"""
    pass


# ==================== 字面量节点 ====================

@dataclass
class NumberNode(Node):
    value: float
    def __repr__(self): return f"Number({self.value})"


@dataclass
class BoolNode(Node):
    value: bool
    def __repr__(self): return f"Bool({self.value})"


@dataclass
class StringNode(Node):
    value: str
    def __repr__(self): return f"String({repr(self.value)})"


@dataclass
class NullNode(Node):
    value: None = None
    def __repr__(self): return "Null"


# ==================== 表达式节点 ====================

@dataclass
class Identifier(Node):
    name: str
    def __repr__(self): return f"ID({self.name})"


@dataclass
class BinaryOp(Node):
    op: str
    left: Node
    right: Node
    def __repr__(self): return f"({self.left} {self.op} {self.right})"


@dataclass
class UnaryOp(Node):
    op: str
    operand: Node
    def __repr__(self): return f"({self.op}{self.operand})"


@dataclass
class CallNode(Node):
    func: Node
    args: List[Node]
    def __repr__(self): return f"Call({self.func}, {self.args})"


@dataclass
class ArrayNode(Node):
    elements: List[Node]
    def __repr__(self): return f"Array({self.elements})"


@dataclass
class DictNode(Node):
    entries: List[tuple]
    def __repr__(self): return f"Dict({self.entries})"


@dataclass
class ArrowFuncNode(Node):
    """箭头函数（匿名函数）"""
    params: List[str]
    body: Node
    def __repr__(self): return f"Func({self.params}, {self.body})"


# ==================== 语句节点 ====================

@dataclass
class VarDecl(Node):
    """变量声明"""
    name: str
    type: Optional[str] = None
    is_const: bool = False
    value: Optional[Node] = None
    def __repr__(self): return f"VarDecl({self.name}, const={self.is_const})"


@dataclass
class AssignStatement(Node):
    target: str
    value: Node
    def __repr__(self): return f"Assign({self.target}, {self.value})"


@dataclass
class ReturnStatement(Node):
    value: Optional[Node] = None
    def __repr__(self): return f"Return({self.value})"


@dataclass
class IfStatement(Node):
    condition: Node
    then_branch: Node
    else_branch: Optional[Node] = None
    def __repr__(self): return f"If({self.condition})"


@dataclass
class WhileStatement(Node):
    condition: Node
    body: Node
    def __repr__(self): return f"While({self.condition})"


@dataclass
class ForStatement(Node):
    var: Optional[str] = None
    init: Optional[Node] = None
    condition: Optional[Node] = None
    update: Optional[Node] = None
    body: Optional[Node] = None
    def __repr__(self): return f"For({self.var})"


@dataclass
class BreakStatement(Node):
    def __repr__(self): return "Break"


@dataclass
class ContinueStatement(Node):
    def __repr__(self): return "Continue"


@dataclass
class Block(Node):
    statements: List[Node]
    def __repr__(self): return f"Block({len(self.statements)} stmts)"


@dataclass
class Program(Node):
    statements: List[Node]
    def __repr__(self): return f"Program({len(self.statements)} stmts)"


# ==================== 对象/类节点 ====================

@dataclass
class ClassDef(Node):
    name: str
    parent: Optional[str] = None
    fields: List[tuple] = field(default_factory=list)
    methods: List[tuple] = field(default_factory=list)
    def __repr__(self): return f"Class({self.name})"


@dataclass
class ClassInstance(Node):
    class_name: str
    args: List[Node] = field(default_factory=list)
    def __repr__(self): return f"New({self.class_name})"


# ==================== 异常处理节点 ====================

@dataclass
class TryStatement(Node):
    body: Node
    catch_var: Optional[str] = None
    catch_body: Optional[Node] = None
    def __repr__(self): return f"Try(...)"


# ==================== Print语句包装 ====================

@dataclass
class PrintStmt(Node):
    expr: Node
    def __repr__(self): return f"Print({self.expr})"
