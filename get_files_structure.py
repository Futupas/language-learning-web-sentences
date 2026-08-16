#!/usr/bin/env python3

import argparse
import fnmatch
import sys
from pathlib import Path


# =========================
# Configuration
# =========================

# .gitignore-style patterns.
# Hidden files/directories are excluded by default.
EXCLUDE = [
    ".*",
    ".github",
    "node_modules",
    "*.py",
    "readme.md",
]

# Optional patterns to include again.
# Example:
# INCLUDE = ["!*.env.example"]
INCLUDE = []

# Optional text placed before the files.
PRE_TEXT = ""

# Default output file.
# None = stdout.
DEFAULT_OUTPUT = None


# =========================
# Ignore matching
# =========================

def matches_pattern(path: Path, pattern: str) -> bool:
    """
    Approximate .gitignore matching for common patterns.

    Supports:
      *.py
      node_modules/
      build/
      foo/bar
      **/foo
      .*
    """

    pattern = pattern.strip()

    if not pattern or pattern.startswith("#"):
        return False

    if pattern.startswith("!"):
        pattern = pattern[1:]

    pattern = pattern.rstrip("/")

    path_str = path.as_posix()

    # Direct match against the complete relative path.
    if fnmatch.fnmatch(path_str, pattern):
        return True

    # Match against individual path components.
    if "/" not in pattern:
        for part in path.parts:
            if fnmatch.fnmatch(part, pattern):
                return True

    # Match the pattern against any suffix of the path.
    parts = path.parts
    for i in range(len(parts)):
        suffix = "/".join(parts[i:])
        if fnmatch.fnmatch(suffix, pattern):
            return True

    return False


def is_ignored(path: Path) -> bool:
    """
    Apply EXCLUDE first, then INCLUDE negations.
    """

    ignored = False

    for pattern in EXCLUDE:
        if pattern.startswith("!"):
            continue

        if matches_pattern(path, pattern):
            ignored = True
            break

    for pattern in INCLUDE:
        if pattern.startswith("!") and matches_pattern(path, pattern):
            ignored = False

    return ignored


# =========================
# File collection
# =========================

def collect_files(root: Path, output: Path | None):
    files = []

    for path in root.rglob("*"):
        if not path.is_file():
            continue

        relative = path.relative_to(root)

        # Don't include the generated output itself.
        if output is not None:
            try:
                if path.resolve() == output.resolve():
                    continue
            except OSError:
                pass

        if is_ignored(relative):
            continue

        files.append((relative, path))

    return sorted(files, key=lambda x: x[0].as_posix())


# =========================
# Prompt generation
# =========================

def file_extension(path: Path) -> str:
    """
    Return the extension without the dot.

    foo.py       -> py
    index.html   -> html
    README       -> ""
    app.test.js  -> js
    """

    return path.suffix[1:]


def read_file(path: Path) -> str:
    return path.read_text(
        encoding="utf-8",
        errors="replace",
    )


def generate_prompt(files) -> str:
    output = []

    if PRE_TEXT:
        output.append(PRE_TEXT.rstrip("\n"))
        output.append("")

    for relative, path in files:
        extension = file_extension(path)
        content = read_file(path)

        # Make sure every file has an empty line at the end.
        content = content.rstrip("\n") + "\n"

        output.append(f"{relative.as_posix()}:")
        output.append(f"```{extension}")
        output.append(content)
        output.append("```")
        output.append("")

    return "\n".join(output)


# =========================
# Main
# =========================

def main():
    parser = argparse.ArgumentParser(
        description="Write project files into an AI prompt."
    )

    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output file. Overrides DEFAULT_OUTPUT.",
    )

    args = parser.parse_args()

    root = Path.cwd()

    output = args.output

    if output is None and DEFAULT_OUTPUT is not None:
        output = Path(DEFAULT_OUTPUT)

    files = collect_files(root, output)
    prompt = generate_prompt(files)

    if output is None:
        sys.stdout.write(prompt)
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(prompt, encoding="utf-8")


if __name__ == "__main__":
    main()
