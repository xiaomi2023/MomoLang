"""
MomoLang 编译器 - 编译 .mm 源文件为 .mmb 字节码
仅供 momolang.js 内部调用
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from lexer import Lexer
from parser import Parser
from semantic import SemanticAnalyzer
from codegen import CodeGenerator


def compile_file(input_path, output_path=None):
    if not os.path.exists(input_path):
        print(f"❌ 错误：文件不存在: {input_path}")
        return False

    with open(input_path, 'r', encoding='utf-8') as f:
        source = f.read()

    if not output_path:
        base = os.path.basename(input_path)
        name_no_ext = os.path.splitext(base)[0]
        output_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'build', f'{name_no_ext}.mmb'
        )

    try:
        lexer = Lexer(source)
        tokens = lexer.tokenize()

        parser = Parser(tokens)
        ast = parser.parse()

        semantic = SemanticAnalyzer()
        semantic.analyze(ast)

        codegen = CodeGenerator()
        bytecode = codegen.generate()

        out_dir = os.path.dirname(output_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        with open(output_path, 'wb') as f:
            f.write(bytecode)

        print(f"✅ 编译成功: {os.path.basename(input_path)} -> {os.path.basename(output_path)}")
        return True

    except Exception as e:
        print(f"❌ 编译错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python src/compile.py <input.mm> [-o output.mmb]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = None
    if '-o' in sys.argv:
        idx = sys.argv.index('-o')
        if idx + 1 < len(sys.argv):
            output_path = sys.argv[idx + 1]

    success = compile_file(input_path, output_path)
    sys.exit(0 if success else 1)
