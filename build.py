#!/usr/bin/env python3
"""Assemble the single-file site: index.html is built from site/partials in name order."""
import pathlib

root = pathlib.Path(__file__).parent
parts = sorted((root / "site" / "partials").iterdir(), key=lambda p: p.name)
out = "".join(p.read_text(encoding="utf-8") for p in parts if p.is_file())
(root / "index.html").write_text(out, encoding="utf-8")
print(f"built index.html from {len(parts)} partials ({len(out)} chars)")
