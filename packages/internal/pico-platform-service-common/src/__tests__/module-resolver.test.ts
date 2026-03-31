jest.mock('expo', () => ({
  requireNativeModule: jest.fn((name: string) => {
    if (name === 'ExistingModule') {
      return { constantValue: 42, sdkAvailable: true };
    }
    throw new Error(`Cannot find native module '${name}'`);
  }),
}));

import { resolveNativeModule } from '../module-resolver';

describe('resolveNativeModule', () => {
  it('returns available:true and the module when it exists', () => {
    const result = resolveNativeModule('ExistingModule');
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.nativeModule).toEqual({ constantValue: 42, sdkAvailable: true });
    }
  });

  it('returns available:false and null when module does not exist', () => {
    const result = resolveNativeModule('NonExistentModule');
    expect(result.available).toBe(false);
    expect(result.nativeModule).toBeNull();
  });

  it('does not throw for any module name', () => {
    expect(() => resolveNativeModule('MissingModuleA')).not.toThrow();
    expect(() => resolveNativeModule('MissingModuleB')).not.toThrow();
    expect(() => resolveNativeModule('')).not.toThrow();
  });

  it('narrows type correctly — nativeModule is T when available is true', () => {
    const result = resolveNativeModule<{ sdkAvailable: boolean }>('ExistingModule');
    if (result.available) {
      // TypeScript should allow this access
      expect(typeof result.nativeModule.sdkAvailable).toBe('boolean');
    }
  });

  it('nativeModule is null when available is false', () => {
    const result = resolveNativeModule('Missing');
    if (!result.available) {
      expect(result.nativeModule).toBeNull();
    }
  });
});
