"""Small PGM helpers for standard-library AAPS demos."""

from __future__ import annotations

from pathlib import Path


def read_pgm(path: str | Path) -> tuple[int, int, int, list[int]]:
    tokens: list[str] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            tokens.extend(line.split())
    if not tokens or tokens[0] != "P2":
        raise ValueError(f"expected ASCII PGM/P2 image: {path}")
    width, height, max_value = map(int, tokens[1:4])
    pixels = [int(value) for value in tokens[4:]]
    if len(pixels) != width * height:
        raise ValueError(f"pixel count mismatch in {path}")
    return width, height, max_value, pixels


def write_pgm(path: str | Path, width: int, height: int, max_value: int, pixels: list[int]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    rows = [" ".join(str(pixels[y * width + x]) for x in range(width)) for y in range(height)]
    target.write_text(f"P2\n{width} {height}\n{max_value}\n" + "\n".join(rows) + "\n", encoding="utf-8")
