declare function isAvailable(): boolean;
export type RtcJoinOptions = {
    url: string;
    peerToken: string;
    channelId?: string;
    uid?: string;
};
export type RtcUserSnapshot = {
    uid: string;
    joinedAt: number;
};
export type RtcChannelState = {
    status: 'idle';
} | {
    status: 'joining';
    channelId: string;
} | {
    status: 'connected';
    channelId: string;
    uid: string;
    users: RtcUserSnapshot[];
} | {
    status: 'leaving';
} | {
    status: 'error';
    error: string;
};
export type Subscription = {
    remove: () => void;
};
export declare function joinChannel(options: RtcJoinOptions): Promise<boolean>;
export declare function leaveChannel(): Promise<void>;
export declare function setLocalMuted(muted: boolean): Promise<void>;
export declare function setOutputVolume(volume: number): Promise<void>;
export declare function onUserJoined(cb: (uid: string) => void): Subscription;
export declare function onUserLeft(cb: (uid: string) => void): Subscription;
export declare function useRtcChannel(options: RtcJoinOptions | null): RtcChannelState;
export declare const picoRtc: {
    joinChannel: typeof joinChannel;
    leaveChannel: typeof leaveChannel;
    setLocalMuted: typeof setLocalMuted;
    setOutputVolume: typeof setOutputVolume;
    onUserJoined: typeof onUserJoined;
    onUserLeft: typeof onUserLeft;
    isAvailable: typeof isAvailable;
    getClient: () => any;
};
export {};
//# sourceMappingURL=picoRtc.d.ts.map