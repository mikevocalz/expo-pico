import { metaStatus, metaSurfaceDetail, type MetaPlacements } from '../spatialLayoutCopy';

const all = (p: MetaPlacements['library']): MetaPlacements => ({
  library: p,
  details: p,
  controls: p,
});

describe('metaSurfaceDetail', () => {
  it('keeps Stage as the immersive scene', () => {
    expect(metaSurfaceDetail('stage', null)).toBe('Immersive scene');
  });

  it('names the side a placed window opened on', () => {
    expect(metaSurfaceDetail('library', 'spatial')).toBe('Window on the left');
    expect(metaSurfaceDetail('details', 'spatial')).toBe('Window on the right');
    expect(metaSurfaceDetail('controls', 'spatial')).toBe('Window below');
  });

  it('says where inline and pending content is', () => {
    expect(metaSurfaceDetail('controls', 'inline')).toBe('In this panel');
    expect(metaSurfaceDetail('library', 'pending')).toBe('Opening as a window');
  });
});

describe('metaStatus', () => {
  it('never says the panels are drawn in the Viro scene', () => {
    const states: MetaPlacements[] = [
      all('inline'),
      all('pending'),
      all('spatial'),
      { library: 'spatial', details: 'spatial', controls: 'inline' },
    ];
    for (const s of states) {
      for (const available of [true, false]) {
        expect(metaStatus(available, s).text).not.toMatch(/Viro/);
      }
    }
  });

  it('explains the version floor when nothing can open yet', () => {
    const s = metaStatus(false, all('inline'));
    expect(s.tone).toBe('warn');
    expect(s.text).toContain('Horizon OS v207');
    expect(s.text).toContain('Stage opens as the immersive scene.');
  });

  it('reports opening while placement is pending', () => {
    expect(metaStatus(true, all('pending')).text).toMatch(/^Opening Library, Details and Controls/);
  });

  it('names the windows that opened and the one that stayed in the panel', () => {
    const s = metaStatus(true, { library: 'spatial', details: 'spatial', controls: 'inline' });
    expect(s.tone).toBe('ok');
    expect(s.text).toContain('Library and Details are open as windows around this panel.');
    expect(s.text).toContain('Controls stays here');
  });

  it('uses singular grammar for one window', () => {
    const s = metaStatus(true, { library: 'spatial', details: 'inline', controls: 'inline' });
    expect(s.text).toContain('Library is open as a window');
    expect(s.text).toContain('Details and Controls stay here');
  });

  it('reports all three open', () => {
    expect(metaStatus(true, all('spatial')).text).toContain(
      'Library, Details and Controls are open as windows'
    );
  });
});
