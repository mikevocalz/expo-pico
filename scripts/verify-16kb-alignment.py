#!/usr/bin/env python3
"""Check that every PT_LOAD segment in a shared library is 16KB-aligned.

PICO OS 6 / Android 14+ refuse to load an .so whose PT_LOAD segments are
aligned to the old 4KB page size. The failure is silent at install time and
shows up as a native-load error at runtime, so this is worth checking before
shipping rather than after.

`withPicoOpenXrLoaderOverlay` has referenced this script since it was written;
it did not exist until the loader was bumped to Khronos 1.1.62.

    ./scripts/verify-16kb-alignment.py path/to/lib.so [more.so ...]
    ./scripts/verify-16kb-alignment.py path/to/app.apk

Exits non-zero if any segment is under-aligned, so it can gate a build.
"""

from __future__ import annotations

import struct
import sys
import zipfile
from pathlib import Path

PAGE_16KB = 16 * 1024
PT_LOAD = 1


def pt_load_alignments(data: bytes) -> list[int]:
    """Program-header alignments for each PT_LOAD segment."""
    if data[:4] != b"\x7fELF":
        raise ValueError("not an ELF file")

    is64 = data[4] == 2
    end = "<" if data[5] == 1 else ">"

    if is64:
        (e_phoff,) = struct.unpack_from(end + "Q", data, 0x20)
        e_phentsize, e_phnum = struct.unpack_from(end + "HH", data, 0x36)
        align_off, align_fmt = 0x30, end + "Q"
    else:
        (e_phoff,) = struct.unpack_from(end + "I", data, 0x1C)
        e_phentsize, e_phnum = struct.unpack_from(end + "HH", data, 0x2A)
        align_off, align_fmt = 0x1C, end + "I"

    alignments = []
    for i in range(e_phnum):
        off = e_phoff + i * e_phentsize
        (p_type,) = struct.unpack_from(end + "I", data, off)
        if p_type == PT_LOAD:
            (align,) = struct.unpack_from(align_fmt, data, off + align_off)
            alignments.append(align)
    return alignments


def check(name: str, data: bytes) -> bool:
    try:
        alignments = pt_load_alignments(data)
    except (ValueError, struct.error) as exc:
        print(f"SKIP  {name}: {exc}")
        return True

    if not alignments:
        print(f"SKIP  {name}: no PT_LOAD segments")
        return True

    ok = all(a >= PAGE_16KB for a in alignments)
    shown = ", ".join(hex(a) for a in alignments)
    print(f"{'OK  ' if ok else 'FAIL'}  {name}: PT_LOAD align {shown}")
    return ok


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2

    results = []
    for arg in argv:
        path = Path(arg)
        if not path.exists():
            print(f"FAIL  {arg}: no such file")
            results.append(False)
        elif path.suffix in {".apk", ".aar", ".zip"}:
            with zipfile.ZipFile(path) as archive:
                members = [n for n in archive.namelist() if n.endswith(".so")]
                if not members:
                    print(f"SKIP  {arg}: no .so entries")
                for member in members:
                    results.append(check(f"{arg}!{member}", archive.read(member)))
        else:
            results.append(check(str(path), path.read_bytes()))

    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
