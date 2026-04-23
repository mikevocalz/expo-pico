import {
  insertImportAfterPackage,
  insertLinesAfter,
  removeBlock,
} from '../plugin/src/util/insertLinesHelper';

describe('insertLinesAfter', () => {
  it('inserts a block after the anchor line', () => {
    const src = ['line a', 'anchor line', 'line c'].join('\n');
    const out = insertLinesAfter(src, '    injected', 'anchor');
    expect(out).toBe(['line a', 'anchor line', '    injected', 'line c'].join('\n'));
  });

  it('returns null when anchor is missing', () => {
    const src = 'some unrelated file';
    expect(insertLinesAfter(src, 'injected', 'anchor')).toBeNull();
  });

  it('is idempotent when insertion already present', () => {
    const src = ['line a', 'anchor line', '    injected', 'line c'].join('\n');
    const out = insertLinesAfter(src, '    injected', 'anchor');
    expect(out).toBe(src);
    const occurrences = (out!.match(/injected/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('handles multi-line insertions', () => {
    const src = ['anchor', 'tail'].join('\n');
    const out = insertLinesAfter(src, 'line1\nline2', 'anchor');
    expect(out).toBe(['anchor', 'line1', 'line2', 'tail'].join('\n'));
  });
});

describe('insertImportAfterPackage', () => {
  it('inserts import after Kotlin package declaration', () => {
    const src = ['package com.example.app', '', 'class Foo'].join('\n');
    const out = insertImportAfterPackage(src, 'import expo.modules.pico.PicoCorePackage');
    expect(out).toContain('import expo.modules.pico.PicoCorePackage');
    expect(out.indexOf('package com.example.app')).toBeLessThan(
      out.indexOf('import expo.modules.pico.PicoCorePackage')
    );
  });

  it('inserts import after Java package declaration with semicolon', () => {
    const src = ['package com.example.app;', '', 'public class Foo {}'].join('\n');
    const out = insertImportAfterPackage(src, 'import expo.modules.pico.PicoCorePackage;');
    expect(out).toContain('import expo.modules.pico.PicoCorePackage;');
  });

  it('is idempotent on repeat calls', () => {
    const src = 'package com.example\n\nclass Foo';
    const stmt = 'import expo.modules.pico.PicoCorePackage';
    const once = insertImportAfterPackage(src, stmt);
    const twice = insertImportAfterPackage(once, stmt);
    expect(once).toBe(twice);
  });
});

describe('removeBlock', () => {
  it('removes the exact block', () => {
    const src = 'a\n\nBLOCK\n\nb';
    const out = removeBlock(src, '\nBLOCK\n');
    expect(out).not.toContain('BLOCK');
  });

  it('is a no-op when block is absent', () => {
    const src = 'nothing here';
    expect(removeBlock(src, 'missing')).toBe(src);
  });
});
