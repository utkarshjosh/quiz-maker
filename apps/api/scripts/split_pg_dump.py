#!/usr/bin/env python3
"""
Utility script to split a PostgreSQL data-only dump into per-table files.

The script looks for sections that start with the standard pg_dump marker:

    -- Data for Name: <table>; Type: TABLE DATA; ...

and writes everything from that marker up to (but not including) the next marker
into a dedicated file named `<table>.sql` inside the chosen output directory.
Each file contains the marker comment, the COPY statement, the data rows, and
the terminating `\.` line.

Usage:
    python split_pg_dump.py /path/to/db_copy_only.sql [output_dir]

If `output_dir` is omitted, a sibling directory named `split_dump` is created.
The directory will be created if it does not exist.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Optional, TextIO


SECTION_REGEX = re.compile(r"^-- Data for Name: (?P<table>[^;]+);")


def open_section_file(table_name: str, output_dir: Path) -> TextIO:
    sanitized = table_name.strip().replace(" ", "_")
    output_path = output_dir / f"{sanitized}.sql"
    return output_path.open("w", encoding="utf-8")


def split_dump(source_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    current_file: Optional[TextIO] = None
    current_table: Optional[str] = None

    try:
        with source_path.open("r", encoding="utf-8") as src:
            for line in src:
                match = SECTION_REGEX.match(line)

                if match:
                    # Close previous section file, if any.
                    if current_file:
                        current_file.close()

                    current_table = match.group("table")
                    current_file = open_section_file(current_table, output_dir)

                if current_file:
                    current_file.write(line)

        if current_file:
            current_file.close()
    except FileNotFoundError:
        raise SystemExit(f"Source file not found: {source_path}")

    if not any(output_dir.iterdir()):
        raise SystemExit(
            "No sections were detected. Ensure the dump contains "
            "'-- Data for Name:' markers."
        )


def main(argv: list[str]) -> None:
    if not argv or len(argv) > 2:
        raise SystemExit(
            "Usage: python split_pg_dump.py <source_dump.sql> [output_dir]"
        )

    source_path = Path(argv[0]).resolve()
    output_dir = (
        Path(argv[1]).resolve()
        if len(argv) == 2
        else source_path.with_name("split_dump")
    )

    split_dump(source_path, output_dir)
    print(f"Split completed. Files written to: {output_dir}")


if __name__ == "__main__":
    main(sys.argv[1:])


