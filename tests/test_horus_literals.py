"""Check the parsing boundary without requiring Kodi or making network calls."""
import ast
from pathlib import Path
import unittest


class LiteralTests(unittest.TestCase):
    def test_horus_has_no_executable_eval_calls(self):
        source = Path(__file__).resolve().parents[1] / 'script.module.horus/default.py'
        tree = ast.parse(source.read_text(encoding='utf-8-sig'))
        self.assertFalse(any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'eval'
                             for n in ast.walk(tree)))
        self.assertEqual(ast.literal_eval("{'User-Agent': 'Fixture'}"), {'User-Agent': 'Fixture'})
        with self.assertRaises(ValueError):
            ast.literal_eval("__import__('os').system('unsafe')")


if __name__ == '__main__':
    unittest.main()
