"""Utility to dump all source code under backend/src into a single text file.

This script walks through the directory tree rooted at backend/src, collects
all Python source files, and concatenates their contents into a single
`backend_source.txt` in the workspace root (or any desired location).

It automatically skips:
  * __pycache__ directories and compiled files (.pyc, .pyo)
  * hidden files/directories starting with a dot
  * non-python files (extensions other than .py, .txt maybe if desired)

Run from the workspace root::

    python backend/scripts/export_code.py

Adjust `OUTPUT_PATH` if you want the result somewhere else.
"""

import os
import pathlib

# configuration
SRC_ROOT = pathlib.Path(__file__).parents[1] / "src"  # backend/src
OUTPUT_PATH = pathlib.Path(__file__).parents[1] / "backend_source.txt"
INCLUDE_EXTENSIONS = {".py"}  # extensions to include
EXCLUDE_DIR_NAMES = {"__pycache__"}
EXCLUDE_FILE_SUFFIXES = {".pyc", ".pyo"}


def is_excluded_dir(dirname: str) -> bool:
    return dirname in EXCLUDE_DIR_NAMES or dirname.startswith('.')


def should_include_file(path: pathlib.Path) -> bool:
    if path.suffix.lower() not in INCLUDE_EXTENSIONS:
        return False
    if any(path.name.endswith(suf) for suf in EXCLUDE_FILE_SUFFIXES):
        return False
    return True


def gather_files(root: pathlib.Path):
    for dirpath, dirnames, filenames in os.walk(root):
        # mutate dirnames in-place to skip excluded dirs
        dirnames[:] = [d for d in dirnames if not is_excluded_dir(d)]
        for fname in filenames:
            file_path = pathlib.Path(dirpath) / fname
            if should_include_file(file_path):
                yield file_path


def main():
    print(f"Scanning '{SRC_ROOT}' for source files...")
    files = list(gather_files(SRC_ROOT))
    print(f"Found {len(files)} files. Writing to '{OUTPUT_PATH}'")

    with OUTPUT_PATH.open('w', encoding='utf-8') as out_f:
        for fpath in sorted(files):
            out_f.write(f"# === {fpath.relative_to(SRC_ROOT.parent)} ===\n")
            text = fpath.read_text(encoding='utf-8')
            out_f.write(text)
            out_f.write("\n\n")

    print("Done.")


if __name__ == '__main__':
    main()
