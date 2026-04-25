# 语法分析器 (Parser) - MomoLang
# 对应方案.md 中的 Phase 2 阶段
#
# 将 Token 流转换为 AST（抽象语法树）

from typing import List, Optional
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


class ParserError(Exception):
    def __init__(self, message: str, token: Token = None):
        if token:
            msg = f"Line {token.line}: {message} (got '{token.value}')"
        else:
            msg = message
        super().__init__(msg)


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def current(self) -> Token:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else self.tokens[-1]

    def peek(self, offset: int = 0) -> Token:
        idx = self.pos + offset
        return self.tokens[idx] if idx < len(self.tokens) else self.tokens[-1]

    def advance(self) -> Token:
        t = self.current()
        if self.pos < len(self.tokens) - 1:
            self.pos += 1
        return t

    def match(self, *types: TokenType) -> bool:
        return self.current().type in types

    def expect(self, *types: TokenType) -> Token:
        t = self.current()
        if t.type in types:
            return self.advance()
        type_names = [tt.name for tt in types]
        raise ParserError(
            f"Expected {', '.join(type_names)}, got {t.type.name}",
            t
        )

    def parse(self) -> Program:
        """解析整个程序"""
        statements = []
        while not self.match(TokenType.EOF):
            stmt = self.parse_stmt()
            if stmt is not None:
                statements.append(stmt)
        return Program(statements)

    # ==================== 语句解析 ====================

    def parse_stmt(self) -> Optional[Node]:
        """解析一条语句"""
        t = self.current()

        # 跳过空语句
        if self.match(TokenType.SEMI):
            self.advance()
            return None

        if self.match(TokenType.LET):
            return self.parse_let()
        elif self.match(TokenType.CONST):
            return self.parse_const()
        elif self.match(TokenType.PRINT):
            return self.parse_print()
        elif self.match(TokenType.RETURN):
            return self.parse_return()
        elif self.match(TokenType.IF):
            return self.parse_if()
        elif self.match(TokenType.WHILE):
            return self.parse_while()
        elif self.match(TokenType.FOR):
            return self.parse_for()
        elif self.match(TokenType.BREAK):
            return self.parse_break()
        elif self.match(TokenType.CONTINUE):
            return self.parse_continue()
        elif self.match(TokenType.TRY):
            return self.parse_try()
        elif self.match(TokenType.FUNCTION):
            # 匿名函数作为表达式语句的一部分
            expr = self.parse_expr()
            self.consume_semi()
            return expr
        elif self.match(TokenType.LB):
            return self.parse_block()
        elif self.match(TokenType.CLASS):
            return self.parse_class()
        elif self.match(TokenType.NEW):
            expr = self.parse_expr()
            self.consume_semi()
            return expr
        elif self.match(TokenType.ID, TokenType.NUMBER, TokenType.STRING_LITERAL,
                        TokenType.TRUE, TokenType.FALSE, TokenType.NULL,
                        TokenType.LP, TokenType.LBRK, TokenType.MINUS, TokenType.NOT):
            return self.parse_expr_stmt()
        else:
            raise ParserError(f"Unexpected token", t)

    def consume_semi(self):
        """如果下一个 token 是分号则吃掉它"""
        if self.match(TokenType.SEMI):
            self.advance()

    def parse_let(self) -> VarDecl:
        """let 变量声明"""
        self.advance()  # let
        name_tok = self.expect(TokenType.ID)
        name = name_tok.value

        # 可选类型注解
        type_annot = None
        if self.match(TokenType.COLON):
            self.advance()  # :
            type_tok = self.advance()
            type_annot = type_tok.value

        value = None
        if self.match(TokenType.ASSIGN):
            self.advance()  # =
            value = self.parse_expr()

        self.consume_semi()
        return VarDecl(name, type_annot, is_const=False, value=value)

    def parse_const(self) -> VarDecl:
        """const 常量声明"""
        self.advance()  # const
        name_tok = self.expect(TokenType.ID)
        name = name_tok.value

        type_annot = None
        if self.match(TokenType.COLON):
            self.advance()
            type_tok = self.advance()
            type_annot = type_tok.value

        value = None
        if self.match(TokenType.ASSIGN):
            self.advance()
            value = self.parse_expr()

        self.consume_semi()
        return VarDecl(name, type_annot, is_const=True, value=value)

    def parse_print(self) -> PrintStmt:
        """print 语句"""
        self.advance()  # print
        self.expect(TokenType.LP)
        expr = self.parse_expr()
        self.expect(TokenType.RP)
        self.consume_semi()
        return PrintStmt(expr)

    def parse_return(self) -> ReturnStatement:
        """return 语句"""
        self.advance()  # return
        value = None
        if not self.match(TokenType.SEMI, TokenType.RB, TokenType.EOF):
            value = self.parse_expr()
        self.consume_semi()
        return ReturnStatement(value)

    def parse_if(self) -> IfStatement:
        """if 语句"""
        self.advance()  # if
        condition = self.parse_expr()
        then_branch = self.parse_stmt() if not self.match(TokenType.LB) else self.parse_block()

        else_branch = None
        if self.match(TokenType.ELSE):
            self.advance()
            if self.match(TokenType.IF):
                else_branch = self.parse_if()
            else:
                else_branch = self.parse_stmt() if not self.match(TokenType.LB) else self.parse_block()

        return IfStatement(condition, then_branch, else_branch)

    def parse_while(self) -> WhileStatement:
        """while 语句"""
        self.advance()  # while
        condition = self.parse_expr()
        body = self.parse_block() if self.match(TokenType.LB) else self.parse_stmt()
        return WhileStatement(condition, body)

    def parse_for(self) -> ForStatement:
        """for 语句"""
        self.advance()  # for
        self.expect(TokenType.LP)

        # 初始化
        init = None
        if self.match(TokenType.LET):
            init = self.parse_let()
        elif not self.match(TokenType.SEMI):
            init = self.parse_expr()
            self.consume_semi()
        else:
            self.advance()  # ;

        # 条件
        condition = None
        if not self.match(TokenType.SEMI):
            condition = self.parse_expr()
        self.expect(TokenType.SEMI)

        # 更新
        update = None
        if not self.match(TokenType.RP):
            update = self.parse_expr()
        self.expect(TokenType.RP)

        body = self.parse_block() if self.match(TokenType.LB) else self.parse_stmt()
        return ForStatement(var=None, init=init, condition=condition, update=update, body=body)

    def parse_break(self) -> BreakStatement:
        self.advance()
        self.consume_semi()
        return BreakStatement()

    def parse_continue(self) -> ContinueStatement:
        self.advance()
        self.consume_semi()
        return ContinueStatement()

    def parse_try(self) -> TryStatement:
        self.advance()  # try
        body = self.parse_block() if self.match(TokenType.LB) else self.parse_stmt()

        catch_var = None
        catch_body = None
        if self.match(TokenType.CATCH):
            self.advance()
            if self.match(TokenType.LP):
                self.advance()
                catch_var = self.expect(TokenType.ID).value
                self.expect(TokenType.RP)
            catch_body = self.parse_block() if self.match(TokenType.LB) else self.parse_stmt()

        return TryStatement(body, catch_var, catch_body)

    def parse_class(self) -> ClassDef:
        self.advance()  # class
        name = self.expect(TokenType.ID).value

        parent = None
        if self.match(TokenType.LP):
            self.advance()
            parent = self.expect(TokenType.ID).value
            self.expect(TokenType.RP)

        self.expect(TokenType.LB)
        methods = []
        while not self.match(TokenType.RB) and not self.match(TokenType.EOF):
            if self.match(TokenType.FUNCTION):
                methods.append(self.parse_method_def())
            else:
                self.advance()
        self.expect(TokenType.RB)
        return ClassDef(name, parent, methods=methods)

    def parse_method_def(self) -> tuple:
        self.advance()  # function
        name = self.expect(TokenType.ID).value
        self.expect(TokenType.LP)
        params = []
        while self.match(TokenType.ID):
            params.append(self.advance().value)
            if self.match(TokenType.COMMA):
                self.advance()
        self.expect(TokenType.RP)
        body = self.parse_block() if self.match(TokenType.LB) else self.parse_stmt()
        return (name, params, body)

    def parse_block(self) -> Block:
        """{ ... } 代码块"""
        self.expect(TokenType.LB)
        statements = []
        while not self.match(TokenType.RB) and not self.match(TokenType.EOF):
            stmt = self.parse_stmt()
            if stmt is not None:
                statements.append(stmt)
        self.expect(TokenType.RB)
        return Block(statements)

    def parse_expr_stmt(self) -> Node:
        """表达式语句（可能带赋值）"""
        expr = self.parse_expr()
        self.consume_semi()
        return expr

    # ==================== 表达式解析 ====================

    def parse_expr(self) -> Node:
        return self.parse_assignment()

    def parse_assignment(self) -> Node:
        left = self.parse_or()
        if self.match(TokenType.ASSIGN):
            self.advance()
            value = self.parse_expr()
            if isinstance(left, Identifier):
                return AssignStatement(left.name, value)
            raise ParserError("Invalid assignment target", self.current())
        return left

    def parse_or(self) -> Node:
        left = self.parse_and()
        while self.match(TokenType.OR):
            self.advance()
            right = self.parse_and()
            left = BinaryOp('||', left, right)
        return left

    def parse_and(self) -> Node:
        left = self.parse_equality()
        while self.match(TokenType.AND):
            self.advance()
            right = self.parse_equality()
            left = BinaryOp('&&', left, right)
        return left

    def parse_equality(self) -> Node:
        left = self.parse_comparison()
        while self.match(TokenType.EQ, TokenType.NE):
            op_tok = self.advance()
            right = self.parse_comparison()
            left = BinaryOp(op_tok.value, left, right)
        return left

    def parse_comparison(self) -> Node:
        left = self.parse_addition()
        while self.match(TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE):
            op_tok = self.advance()
            right = self.parse_addition()
            left = BinaryOp(op_tok.value, left, right)
        return left

    def parse_addition(self) -> Node:
        left = self.parse_multiplication()
        while self.match(TokenType.PLUS, TokenType.MINUS):
            op_tok = self.advance()
            right = self.parse_multiplication()
            left = BinaryOp(op_tok.value, left, right)
        return left

    def parse_multiplication(self) -> Node:
        left = self.parse_unary()
        while self.match(TokenType.STAR, TokenType.SLASH, TokenType.MOD):
            op_tok = self.advance()
            right = self.parse_unary()
            left = BinaryOp(op_tok.value, left, right)
        return left

    def parse_unary(self) -> Node:
        if self.match(TokenType.MINUS):
            self.advance()
            operand = self.parse_unary()
            return UnaryOp('-', operand)
        if self.match(TokenType.NOT):
            self.advance()
            operand = self.parse_unary()
            return UnaryOp('!', operand)
        return self.parse_call()

    def parse_call(self) -> Node:
        node = self.parse_primary()

        while True:
            # 函数调用: func(args)
            if self.match(TokenType.LP):
                self.advance()
                args = []
                while not self.match(TokenType.RP) and not self.match(TokenType.EOF):
                    args.append(self.parse_expr())
                    if self.match(TokenType.COMMA):
                        self.advance()
                self.expect(TokenType.RP)
                node = CallNode(node, args)
            # 属性访问: obj.attr
            elif self.match(TokenType.DOT):
                self.advance()
                attr_name = self.expect(TokenType.ID).value
                node = CallNode(Identifier(attr_name), [node])
            else:
                break

        return node

    def parse_primary(self) -> Node:
        t = self.current()

        # 字面量
        if self.match(TokenType.NUMBER):
            self.advance()
            val_str = t.value
            return NumberNode(float(val_str))

        if self.match(TokenType.STRING_LITERAL):
            self.advance()
            return StringNode(t.value)

        if self.match(TokenType.TRUE):
            self.advance()
            return BoolNode(True)

        if self.match(TokenType.FALSE):
            self.advance()
            return BoolNode(False)

        if self.match(TokenType.NULL):
            self.advance()
            return NullNode()

        # 括号表达式
        if self.match(TokenType.LP):
            self.advance()
            expr = self.parse_expr()
            self.expect(TokenType.RP)
            return expr

        # 数组字面量
        if self.match(TokenType.LBRK):
            self.advance()
            elements = []
            while not self.match(TokenType.RBRK) and not self.match(TokenType.EOF):
                elements.append(self.parse_expr())
                if self.match(TokenType.COMMA):
                    self.advance()
            self.expect(TokenType.RBRK)
            return ArrayNode(elements)

        # 匿名函数定义
        if self.match(TokenType.FUNCTION):
            return self.parse_arrow_func()

        # 标识符
        if self.match(TokenType.ID):
            self.advance()
            return Identifier(t.value)

        raise ParserError(f"Unexpected token in expression", t)

    def parse_arrow_func(self) -> ArrowFuncNode:
        """function(params) body"""
        self.advance()  # function
        self.expect(TokenType.LP)
        params = []
        while self.match(TokenType.ID):
            params.append(self.advance().value)
            if self.match(TokenType.COMMA):
                self.advance()
        self.expect(TokenType.RP)

        # 箭头函数 body 或块 body
        if self.match(TokenType.ARROW):
            self.advance()
            body = self.parse_expr()
        elif self.match(TokenType.LB):
            body = self.parse_block()
        else:
            body = self.parse_stmt()

        return ArrowFuncNode(params, body)

    def parse_new_expr(self) -> ClassInstance:
        """new ClassName(args)"""
        self.advance()  # new
        class_name = self.expect(TokenType.ID).value
        args = []
        if self.match(TokenType.LP):
            self.advance()
            while not self.match(TokenType.RP) and not self.match(TokenType.EOF):
                args.append(self.parse_expr())
                if self.match(TokenType.COMMA):
                    self.advance()
            self.expect(TokenType.RP)
        return ClassInstance(class_name, args)


if __name__ == "__main__":
    # 测试
    from lexer import Lexer

    test_code = """
let x = 42;
let y = 3.14;
let s = "hello";
let f = function(x) { return x + 1; };
print(x);
"""
    lexer = Lexer(test_code)
    tokens = lexer.tokenize()
    print("Tokens:")
    for t in tokens:
        print(f"  {t}")

    parser = Parser(tokens)
    program = parser.parse()
    print(f"\nAST 解析成功！{len(program.statements)} 条语句:")
    for stmt in program.statements:
        print(f"  {type(stmt).__name__}: {stmt}")
