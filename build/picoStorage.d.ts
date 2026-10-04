export declare function getString(key: string): string | undefined;
export declare function setString(key: string, value: string): void;
export declare function getNumber(key: string): number | undefined;
export declare function setNumber(key: string, value: number): void;
export declare function getBoolean(key: string): boolean | undefined;
export declare function setBoolean(key: string, value: boolean): void;
export declare function getJSON<T = unknown>(key: string): T | null;
export declare function setJSON(key: string, value: unknown): void;
export declare function remove(key: string): void;
export declare function getAllKeys(): string[];
export declare function getStringFresh(key: string): Promise<string | undefined>;
export declare function syncToCloud(): Promise<{
    pushed: number;
    failed: number;
}>;
export declare function hydrateFromCloud(): Promise<{
    pulled: number;
}>;
export declare function useStorageEntry<T extends string | number | boolean>(key: string, initialValue?: T): [T | undefined, (next: T) => void];
export declare const picoStorage: {
    raw: import("react-native-mmkv").MMKV;
    getString: typeof getString;
    setString: typeof setString;
    getNumber: typeof getNumber;
    setNumber: typeof setNumber;
    getBoolean: typeof getBoolean;
    setBoolean: typeof setBoolean;
    getJSON: typeof getJSON;
    setJSON: typeof setJSON;
    remove: typeof remove;
    getAllKeys: typeof getAllKeys;
    getStringFresh: typeof getStringFresh;
    syncToCloud: typeof syncToCloud;
    hydrateFromCloud: typeof hydrateFromCloud;
};
//# sourceMappingURL=picoStorage.d.ts.map