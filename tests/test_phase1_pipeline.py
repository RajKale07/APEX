"""
tests/test_phase1_pipeline.py
Automated tests for APEX Phase 1 — Compiler Pipeline.

Run with:
  python -m pytest tests/test_phase1_pipeline.py -v
  -- or --
  python tests/test_phase1_pipeline.py
"""

import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from compiler.pipeline import (
    compile_to_ir,
    compile_to_exe,
    run_executable,
    full_pipeline,
    CompileResult,
    RunResult,
    PipelineResult,
)

SOURCE  = os.path.join(ROOT, "benchmark", "programs", "test_loop.cpp")
IR_FILE = os.path.join(ROOT, "benchmark", "programs", "test_loop.ll")
BUILD   = os.path.join(ROOT, "build")
EXE     = os.path.join(BUILD, "test_loop_phase1_test.exe")


class TestCompileToIR(unittest.TestCase):

    def test_returns_compile_result(self):
        r = compile_to_ir(SOURCE, IR_FILE)
        self.assertIsInstance(r, CompileResult)

    def test_ir_compile_succeeds(self):
        r = compile_to_ir(SOURCE, IR_FILE)
        self.assertTrue(r.ok, msg=f"IR compile failed:\n{r.stderr}")

    def test_ir_file_created(self):
        compile_to_ir(SOURCE, IR_FILE)
        self.assertTrue(os.path.exists(IR_FILE), "IR file was not created")

    def test_ir_file_is_real_llvm(self):
        compile_to_ir(SOURCE, IR_FILE)
        with open(IR_FILE, "r") as f:
            content = f.read()
        self.assertIn("define", content, "IR file does not contain 'define' — not real LLVM IR")
        self.assertIn("target triple", content, "IR file missing target triple")

    def test_ir_compile_has_timing(self):
        r = compile_to_ir(SOURCE, IR_FILE)
        self.assertGreater(r.elapsed_sec, 0.0)

    def test_missing_source_fails_gracefully(self):
        r = compile_to_ir("nonexistent_file.cpp", "/tmp/out.ll")
        self.assertFalse(r.ok)
        self.assertNotEqual(r.returncode, 0)


class TestCompileToExe(unittest.TestCase):

    def setUp(self):
        os.makedirs(BUILD, exist_ok=True)

    def test_compile_O0_succeeds(self):
        r = compile_to_exe(SOURCE, EXE, ["-O0"])
        self.assertTrue(r.ok, msg=f"Compile failed:\n{r.stderr}")

    def test_compile_O2_succeeds(self):
        r = compile_to_exe(SOURCE, EXE, ["-O2"])
        self.assertTrue(r.ok, msg=f"Compile failed:\n{r.stderr}")

    def test_compile_O3_succeeds(self):
        r = compile_to_exe(SOURCE, EXE, ["-O3"])
        self.assertTrue(r.ok, msg=f"Compile failed:\n{r.stderr}")

    def test_exe_file_created(self):
        compile_to_exe(SOURCE, EXE, ["-O2"])
        self.assertTrue(os.path.exists(EXE), "Executable was not created")

    def test_exe_has_nonzero_size(self):
        compile_to_exe(SOURCE, EXE, ["-O2"])
        self.assertGreater(os.path.getsize(EXE), 0)

    def test_compile_has_timing(self):
        r = compile_to_exe(SOURCE, EXE, ["-O2"])
        self.assertGreater(r.elapsed_sec, 0.0)


class TestRunExecutable(unittest.TestCase):

    def setUp(self):
        os.makedirs(BUILD, exist_ok=True)
        compile_to_exe(SOURCE, EXE, ["-O2"])

    def test_returns_run_result(self):
        r = run_executable(EXE)
        self.assertIsInstance(r, RunResult)

    def test_run_succeeds(self):
        r = run_executable(EXE)
        self.assertTrue(r.ok, msg=f"Run failed: exit={r.returncode} stderr={r.stderr}")

    def test_correct_output(self):
        r = run_executable(EXE)
        # sum(0..999999) = 499999500000
        self.assertIn("499999500000", r.stdout)

    def test_exit_code_zero(self):
        r = run_executable(EXE)
        self.assertEqual(r.returncode, 0)

    def test_run_has_timing(self):
        r = run_executable(EXE)
        self.assertGreater(r.elapsed_sec, 0.0)


class TestFullPipeline(unittest.TestCase):

    def test_returns_pipeline_result(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertIsInstance(r, PipelineResult)

    def test_pipeline_success(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertTrue(r.success, msg=f"Pipeline failed: {r}")

    def test_pipeline_correct_output(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertIn("499999500000", r.run.stdout)

    def test_pipeline_ir_file_exists(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertTrue(os.path.exists(r.ir_file))

    def test_pipeline_exe_file_exists(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertTrue(os.path.exists(r.exe_file))

    def test_pipeline_all_timings_positive(self):
        r = full_pipeline(SOURCE, ["-O2"])
        self.assertGreater(r.ir_compile.elapsed_sec,  0.0)
        self.assertGreater(r.exe_compile.elapsed_sec, 0.0)
        self.assertGreater(r.run.elapsed_sec,         0.0)

    def test_pipeline_O3_also_works(self):
        r = full_pipeline(SOURCE, ["-O3"])
        self.assertTrue(r.success)
        self.assertIn("499999500000", r.run.stdout)

    def test_pipeline_bad_source_does_not_crash(self):
        r = full_pipeline("no_such_file.cpp", ["-O2"])
        self.assertFalse(r.success)
        self.assertFalse(r.ir_compile.ok)


if __name__ == "__main__":
    unittest.main(verbosity=2)
