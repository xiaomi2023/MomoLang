# 词法分析器 (Lexer) - MomoLang
# 对应方案.md 中的 Phase 1 阶段
# 
# 将 .mm 源代码转换为 Token 流

import re
import sys
import os
from typing import List

# 导入 AST 节点
sys.path.insert(0, os.path.dirname(__file__))
from ast_nodes import Token, TokenType


class LexerError(Exception):
    pass


# 关键字映射表: 单词 -> TokenType
KEYWORDS = {
    'let': TokenType.LET,
    'const': TokenType.CONST,
    'function': TokenType.FUNCTION,
    'if': TokenType.IF,
    'else': TokenType.ELSE,
    'while': TokenType.WHILE,
    'for': TokenType.FOR,
    'return': TokenType.RETURN,
    'true': TokenType.TRUE,
    'false': TokenType.FALSE,
    'null': TokenType.NULL,
    'class': TokenType.CLASS,
    'super': TokenType.SUPER,
    'this': TokenType.THIS,
    'new': TokenType.NEW,
    'try': TokenType.TRY,
    'catch': TokenType.CATCH,
    'print': TokenType.PRINT,
    'break': TokenType.BREAK,
    'continue': TokenType.CONTINUE,
    'int': TokenType.INT,
    'float': TokenType.FLOAT,
    'string': TokenType.STRING,
    'bool': TokenType.BOOL,
    'array': TokenType.ARRAY,
    'dict': TokenType.DICT,
}

# 单字符符号映射
SINGLE_CHAR_SYMBOLS = {
    '+': TokenType.PLUS,
    '-': TokenType.MINUS,
    '*': TokenType.STAR,
    '/': TokenType.SLASH,
    '%': TokenType.MOD,
    '=': TokenType.ASSIGN,
    '!': TokenType.NOT,
    '<': TokenType.LT,
    '>': TokenType.GT,
    '(': TokenType.LP,
    ')': TokenType.RP,
    '{': TokenType.LB,
    '}': TokenType.RB,
    '[': TokenType.LBRK,
    ']': TokenType.RBRK,
    ';': TokenType.SEMI,
    ',': TokenType.COMMA,
    ':': TokenType.COLON,
    '.': TokenType.DOT,
}


class Lexer:
    """词法分析器"""

    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.column = 1

    def eof(self) -> bool:
        return self.pos >= len(self.source)

    def peek(self, offset: int = 0) -> str:
        idx = self.pos + offset
        return self.source[idx] if idx < len(self.source) else '\0'

    def advance(self) -> str:
        ch = self.source[self.pos]
        self.pos += 1
        self.column += 1
        return ch

    def skip_whitespace(self):
        """跳过空白字符，记录换行"""
        while not self.eof():
            ch = self.peek()
            if ch == '\n':
                self.line += 1
                self.column = 1
                self.pos += 1
            elif ch in ' \t\r':
                self.pos += 1
                self.column += 1
            else:
                break

    def skip_comment(self):
        """跳过 // 单行注释"""
        while not self.eof() and self.peek() != '\n':
            self.pos += 1

    def read_string(self, quote: str) -> str:
        """读取字符串字面量"""
        value = []
        while not self.eof():
            ch = self.advance()
            if ch == '\\':
                if not self.eof():
                    escape = self.advance()
                    if escape == 'n':
                        value.append('\n')
                    elif escape == 't':
                        value.append('\t')
                    elif escape == '"':
                        value.append('"')
                    elif escape == "'":
                        value.append("'")
                    elif escape == '\\':
                        value.append('\\')
                    else:
                        value.append(escape)
                else:
                    value.append('\\')
            elif ch == quote:
                return ''.join(value)
            else:
                value.append(ch)
        raise LexerError(f"Unterminated string at line {self.line}")

    def read_number(self) -> str:
        """读取数字字面量"""
        num = []
        while not self.eof() and self.peek().isdigit():
            num.append(self.advance())
        # 浮点数
        if not self.eof() and self.peek() == '.':
            num.append(self.advance())
            while not self.eof() and self.peek().isdigit():
                num.append(self.advance())
        return ''.join(num)

    def read_identifier(self) -> str:
        """读取标识符或关键字"""
        word = []
        while not self.eof() and (self.peek().isalnum() or self.peek() == '_'):
            word.append(self.advance())
        return ''.join(word)

    def next_token(self) -> Token:
        """获取下一个Token"""
        self.skip_whitespace()
        if self.eof():
            return Token(TokenType.EOF, '', self.line, self.column)

        ch = self.peek()
        start_col = self.column

        # 注释
        if ch == '/' and self.peek(1) == '/':
            self.skip_comment()
            return self.next_token()

        # 字符串
        if ch in ("'", '"'):
            quote = self.advance()
            value = self.read_string(quote)
            return Token(TokenType.STRING_LITERAL, value, self.line, start_col)

        # 数字
        if ch.isdigit():
            num_str = self.read_number()
            return Token(TokenType.NUMBER, num_str, self.line, start_col)

        # 标识符/关键字
        if ch.isalpha() or ch == '_':
            word = self.read_identifier()
            token_type = KEYWORDS.get(word, TokenType.ID)
            return Token(token_type, word, self.line, start_col)

        # 两字符运算符
        if ch == '=' and self.peek(1) == '=':
            self.advance(); self.advance()
            return Token(TokenType.EQ, '==', self.line, start_col)
        if ch == '!' and self.peek(1) == '=':
            self.advance(); self.advance()
            return Token(TokenType.NE, '!=', self.line, start_col)
        if ch == '<' and self.peek(1) == '=':
            self.advance(); self.advance()
            return Token(TokenType.LE, '<=', self.line, start_col)
        if ch == '>' and self.peek(1) == '=':
            self.advance(); self.advance()
            return Token(TokenType.GE, '>=', self.line, start_col)
        if ch == '&' and self.peek(1) == '&':
            self.advance(); self.advance()
            return Token(TokenType.AND, '&&', self.line, start_col)
        if ch == '|' and self.peek(1) == '|':
            self.advance(); self.advance()
            return Token(TokenType.OR, '||', self.line, start_col)
        if ch == '-' and self.peek(1) == '>':
            self.advance(); self.advance()
            return Token(TokenType.ARROW, '->', self.line, start_col)

        # 单字符符号
        if ch in SINGLE_CHAR_SYMBOLS:
            self.advance()
            return Token(SINGLE_CHAR_SYMBOLS[ch], ch, self.line, start_col)

        raise LexerError(f"Unexpected character '{ch}' at line {self.line} column {self.column}")

    def tokenize(self, source: str = None) -> List[Token]:
        """将源代码转换为Token列表"""
        if source is not None:
            self.source = source
            self.pos = 0
            self.line = 1
            self.column = 1

        tokens = []
        while True:
            token = self.next_token()
            tokens.append(token)
            if token.type == TokenType.EOF:
                break
        return tokens


if __name__ == "__main__":
    # 测试
    test_code = """
let x = 42;
let y = 3.14;
let s = "hello";
let f = function(x) { return x + 1; };
print(x);
"""
    lexer = Lexer(test_code)
    tokens = lexer.tokenize()
    for t in tokens:
        print(f"  {t.type.name:>15}: '{t.value}' (L{t.line})")
