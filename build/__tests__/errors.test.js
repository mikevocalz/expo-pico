"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../errors");
describe('PicoServiceError', () => {
    it('is an instance of Error', () => {
        const e = (0, errors_1.serviceUnavailableError)('pkg', 'method');
        expect(e instanceof Error).toBe(true);
    });
    it('has name PicoServiceError', () => {
        expect((0, errors_1.serviceUnavailableError)('pkg', 'method').name).toBe('PicoServiceError');
    });
    it('preserves code, packageName, methodName', () => {
        const e = new errors_1.PicoServiceError({
            code: errors_1.PicoErrorCode.TIMEOUT,
            packageName: 'expo-pico-test',
            methodName: 'doSomething',
            message: 'timed out',
        });
        expect(e.code).toBe(errors_1.PicoErrorCode.TIMEOUT);
        expect(e.packageName).toBe('expo-pico-test');
        expect(e.methodName).toBe('doSomething');
        expect(e.message).toBe('timed out');
    });
    it('instanceof check works across module boundaries', () => {
        const e = (0, errors_1.serviceUnavailableError)('pkg', 'method');
        expect(e instanceof errors_1.PicoServiceError).toBe(true);
    });
});
describe('isPicoServiceError', () => {
    it('returns true for PicoServiceError', () => {
        expect((0, errors_1.isPicoServiceError)((0, errors_1.serviceUnavailableError)('p', 'm'))).toBe(true);
    });
    it('returns false for plain Error', () => {
        expect((0, errors_1.isPicoServiceError)(new Error('plain'))).toBe(false);
    });
    it('returns false for null', () => {
        expect((0, errors_1.isPicoServiceError)(null)).toBe(false);
    });
    it('returns false for string', () => {
        expect((0, errors_1.isPicoServiceError)('error string')).toBe(false);
    });
    it('returns false for undefined', () => {
        expect((0, errors_1.isPicoServiceError)(undefined)).toBe(false);
    });
});
describe('error factories', () => {
    describe('serviceUnavailableError', () => {
        it('produces SERVICE_UNAVAILABLE code', () => {
            expect((0, errors_1.serviceUnavailableError)('pkg', 'method').code).toBe('SERVICE_UNAVAILABLE');
        });
        it('includes package and method in message', () => {
            const e = (0, errors_1.serviceUnavailableError)('@expo-pico/rooms', 'createRoom');
            expect(e.message).toContain('@expo-pico/rooms');
            expect(e.message).toContain('createRoom');
        });
    });
    describe('notImplementedError', () => {
        it('produces NOT_IMPLEMENTED code', () => {
            expect((0, errors_1.notImplementedError)('pkg', 'method', 'https://docs.example.com').code).toBe('NOT_IMPLEMENTED');
        });
        it('includes docUrl in message', () => {
            const e = (0, errors_1.notImplementedError)('pkg', 'method', 'https://docs.picoxr.com');
            expect(e.message).toContain('https://docs.picoxr.com');
        });
    });
    describe('notSupportedError', () => {
        it('produces NOT_SUPPORTED code', () => {
            expect((0, errors_1.notSupportedError)('pkg', 'method', 'OS too old').code).toBe('NOT_SUPPORTED');
        });
        it('includes reason in message', () => {
            const e = (0, errors_1.notSupportedError)('pkg', 'method', 'requires PICO OS 6');
            expect(e.message).toContain('requires PICO OS 6');
        });
    });
    describe('invalidArgumentError', () => {
        it('produces INVALID_ARGUMENT code', () => {
            expect((0, errors_1.invalidArgumentError)('pkg', 'method', 'score must be >= 0').code).toBe('INVALID_ARGUMENT');
        });
    });
    describe('nativeRejectionError', () => {
        it('maps known code from PicoErrorCode', () => {
            const e = (0, errors_1.nativeRejectionError)('pkg', 'method', 'PERMISSION_DENIED', 'no permission');
            expect(e.code).toBe('PERMISSION_DENIED');
        });
        it('maps BILLING_UNAVAILABLE', () => {
            const e = (0, errors_1.nativeRejectionError)('pkg', 'method', 'BILLING_UNAVAILABLE', 'billing not ready');
            expect(e.code).toBe('BILLING_UNAVAILABLE');
        });
        it('falls back to UNKNOWN for unrecognized codes', () => {
            const e = (0, errors_1.nativeRejectionError)('pkg', 'method', 'SOME_PICO_SPECIFIC_CODE_99', 'msg');
            expect(e.code).toBe('UNKNOWN');
        });
        it('includes nativeMessage in message', () => {
            const e = (0, errors_1.nativeRejectionError)('pkg', 'method', 'UNKNOWN', 'something went wrong');
            expect(e.message).toContain('something went wrong');
        });
    });
});
describe('guardService', () => {
    it('throws PicoServiceError when isAvailable is false', () => {
        expect(() => (0, errors_1.guardService)(false, '@expo-pico/rooms', 'createRoom')).toThrow(errors_1.PicoServiceError);
    });
    it('throws with SERVICE_UNAVAILABLE code', () => {
        try {
            (0, errors_1.guardService)(false, 'pkg', 'method');
        }
        catch (e) {
            expect((0, errors_1.isPicoServiceError)(e)).toBe(true);
            expect(e.code).toBe('SERVICE_UNAVAILABLE');
        }
    });
    it('does not throw when isAvailable is true', () => {
        expect(() => (0, errors_1.guardService)(true, 'pkg', 'method')).not.toThrow();
    });
});
describe('wrapNativeCall', () => {
    it('passes through resolved value unchanged', async () => {
        const result = await (0, errors_1.wrapNativeCall)('pkg', 'method', Promise.resolve('hello'));
        expect(result).toBe('hello');
    });
    it('wraps rejection with known code into PicoServiceError', async () => {
        const rejection = Promise.reject({ code: 'NETWORK_ERROR', message: 'connection failed' });
        await expect((0, errors_1.wrapNativeCall)('pkg', 'method', rejection)).rejects.toMatchObject({
            code: 'NETWORK_ERROR',
        });
        await expect((0, errors_1.wrapNativeCall)('pkg', 'method', Promise.reject({ code: 'NETWORK_ERROR', message: '' }))).rejects.toBeInstanceOf(errors_1.PicoServiceError);
    });
    it('wraps rejection without code as UNKNOWN', async () => {
        const rejection = Promise.reject({ message: 'mystery' });
        await expect((0, errors_1.wrapNativeCall)('pkg', 'method', rejection)).rejects.toMatchObject({
            code: 'UNKNOWN',
        });
    });
    it('wraps rejection from null as UNKNOWN', async () => {
        const rejection = Promise.reject(null);
        await expect((0, errors_1.wrapNativeCall)('pkg', 'method', rejection)).rejects.toMatchObject({
            code: 'UNKNOWN',
        });
    });
    it('result is always a PicoServiceError', async () => {
        const rejection = Promise.reject({ code: 'NOT_FOUND', message: 'oops' });
        try {
            await (0, errors_1.wrapNativeCall)('pkg', 'method', rejection);
        }
        catch (e) {
            expect(e instanceof errors_1.PicoServiceError).toBe(true);
        }
    });
});
