"use strict";
// Pico RTC — backed by Fishjam (Software Mansion's open-source RTC, fork
// of react-native-webrtc, all native deps on Maven Central with no auth
// gate). Picked over Bytedance VolcEngine/BytePlus (auth-gated maven)
// and LiveKit (less RN-native) because Software Mansion are the same team
// behind Reanimated / GestureHandler / Screens — their RN integration is
// best-in-class and they explicitly target Expo workflows.
//
// ─── Auth model ────────────────────────────────────────────────────────
// Fishjam uses a two-tier auth model. Your backend keeps the long-lived
// FISHJAM API KEY and mints short-lived JWT peer tokens scoped to a
// specific room + peer identity. The mobile app NEVER sees the API key —
// it only ever receives peer tokens from your backend. Do not embed the
// API key in app source or app.config; put it on the server.
//
// Setup:
//   1. bun add @fishjam-cloud/react-native-client \
//        @fishjam-cloud/react-native-webrtc react-native-get-random-values
//   2. Fishjam Cloud signup (https://fishjam.io) OR self-host the Fishjam
//      media server. Either way you get a media-server URL + API key.
//   3. Add a /mint-rtc-token endpoint to your backend that takes
//      {roomName, peerIdentity} and returns a Fishjam JWT signed with
//      the API key. (See https://docs.fishjam.io/cloud/concepts/auth.)
//   4. App calls your endpoint to get a peerToken, then calls
//      joinChannel({ url, peerToken }) here.
//
// Public API (unchanged shape so existing call sites keep working):
//   joinChannel({ url, peerToken, channelId?, uid? })
//   leaveChannel()
//   setLocalMuted(muted)
//   setOutputVolume(0-1)     — applies to all remote peers
//   onUserJoined / onUserLeft
//   useRtcChannel(opts | null)
Object.defineProperty(exports, "__esModule", { value: true });
exports.picoRtc = void 0;
exports.joinChannel = joinChannel;
exports.leaveChannel = leaveChannel;
exports.setLocalMuted = setLocalMuted;
exports.setOutputVolume = setOutputVolume;
exports.onUserJoined = onUserJoined;
exports.onUserLeft = onUserLeft;
exports.useRtcChannel = useRtcChannel;
const react_1 = require("react");
let driverCache;
function driver() {
    if (driverCache !== undefined)
        return driverCache;
    const tsClient = '@fishjam-cloud' + '/ts-client';
    const rnWebrtc = '@fishjam-cloud' + '/react-native-webrtc';
    try {
        // Indirect require keeps Metro's static analysis from bailing when this
        // optional peer isn't installed.
        // eslint-disable-next-line no-eval
        const tc = eval('require')(tsClient);
        // eslint-disable-next-line no-eval -- see above.
        const wrtc = eval('require')(rnWebrtc);
        driverCache = {
            FishjamClient: tc.FishjamClient,
            mediaDevices: wrtc.mediaDevices,
        };
    }
    catch {
        driverCache = null;
    }
    return driverCache;
}
function isAvailable() {
    const d = driver();
    return d != null && typeof d.FishjamClient === 'function';
}
let warned = false;
function warnOnce() {
    if (warned)
        return;
    warned = true;
    console.warn('[pico/rtc] Fishjam not loaded — voice chat is unavailable. ' +
        'Install with: bun add @fishjam-cloud/react-native-client ' +
        '@fishjam-cloud/react-native-webrtc react-native-get-random-values');
}
// ───────── Client + microphone lifecycle ─────────
let client = null;
let localStream = null;
let publishedTrackId = null;
let outputVolume = 1;
const userJoinedListeners = new Set();
const userLeftListeners = new Set();
async function acquireMicrophone() {
    const d = driver();
    if (!d?.mediaDevices)
        return null;
    try {
        const stream = await d.mediaDevices.getUserMedia({ audio: true, video: false });
        const tracks = stream?.getAudioTracks?.() ?? [];
        return tracks[0] ? { stream, track: tracks[0] } : null;
    }
    catch {
        return null;
    }
}
function applyVolumeToRemotePeers() {
    // Fishjam exposes per-peer audio elements; we set HTMLAudioElement.volume.
    // The react-native-webrtc fork wires this to native AVPlayer/MediaPlayer.
    if (!client)
        return;
    try {
        const peers = client.getRemotePeers?.() ?? {};
        Object.values(peers).forEach((peer) => {
            const tracks = peer?.tracks ?? new Map();
            tracks.forEach?.((t) => {
                if (t?.track?.kind === 'audio') {
                    try {
                        // Both fork and stdlib accept `.volume` on the underlying audio element
                        if (t.track._audioElement)
                            t.track._audioElement.volume = outputVolume;
                    }
                    catch {
                        // ignore individual failures
                    }
                }
            });
        });
    }
    catch {
        // ignore
    }
}
// ───────── Public imperative API ─────────
async function joinChannel(options) {
    if (!isAvailable()) {
        warnOnce();
        return false;
    }
    const d = driver();
    try {
        if (client) {
            await leaveChannel();
        }
        client = new d.FishjamClient();
        // Wire room events into our listener sets.
        client.on?.('peerJoined', (peer) => {
            userJoinedListeners.forEach((cb) => cb(String(peer?.id ?? peer?.identity ?? '')));
        });
        client.on?.('peerLeft', (peer) => {
            userLeftListeners.forEach((cb) => cb(String(peer?.id ?? peer?.identity ?? '')));
        });
        client.on?.('trackReady', () => {
            applyVolumeToRemotePeers();
        });
        await client.connect({
            url: options.url,
            peerToken: options.peerToken,
            peerMetadata: options.uid ? { uid: options.uid } : {},
        });
        // Publish local mic by default. Caller can press-to-talk via setLocalMuted.
        const mic = await acquireMicrophone();
        if (mic) {
            localStream = mic.stream;
            try {
                publishedTrackId = client.addTrack(mic.track, {
                    type: 'audio',
                    stream: mic.stream,
                });
            }
            catch {
                publishedTrackId = null;
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
async function leaveChannel() {
    try {
        if (publishedTrackId && client) {
            try {
                client.removeTrack?.(publishedTrackId);
            }
            catch {
                // ignore
            }
        }
        if (client) {
            try {
                client.leave?.();
            }
            catch {
                // ignore
            }
        }
        if (localStream) {
            try {
                localStream.getTracks?.().forEach((t) => t.stop?.());
            }
            catch {
                // ignore
            }
        }
    }
    finally {
        publishedTrackId = null;
        localStream = null;
        client = null;
    }
}
async function setLocalMuted(muted) {
    if (!localStream)
        return;
    try {
        localStream.getAudioTracks?.().forEach((t) => {
            // track.enabled = false sends silence frames (keeps the track alive
            // so SFU keying doesn't reset); track.stop() destroys it. We want
            // the silence-frame semantic so unmute is instant.
            t.enabled = !muted;
        });
    }
    catch {
        // ignore
    }
}
async function setOutputVolume(volume) {
    outputVolume = Math.max(0, Math.min(1, volume));
    applyVolumeToRemotePeers();
}
function onUserJoined(cb) {
    userJoinedListeners.add(cb);
    return {
        remove: () => {
            userJoinedListeners.delete(cb);
        },
    };
}
function onUserLeft(cb) {
    userLeftListeners.add(cb);
    return {
        remove: () => {
            userLeftListeners.delete(cb);
        },
    };
}
// ───────── React hook ─────────
function useRtcChannel(options) {
    const [state, setState] = (0, react_1.useState)({ status: 'idle' });
    const activeChannelRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!options) {
            if (activeChannelRef.current) {
                setState({ status: 'leaving' });
                leaveChannel().finally(() => {
                    activeChannelRef.current = null;
                    setState({ status: 'idle' });
                });
            }
            return;
        }
        const label = options.channelId ?? options.peerToken.slice(-12);
        let cancelled = false;
        setState({ status: 'joining', channelId: label });
        activeChannelRef.current = label;
        joinChannel(options).then((ok) => {
            if (cancelled)
                return;
            if (!ok) {
                setState({ status: 'error', error: 'failed to connect to Fishjam' });
                activeChannelRef.current = null;
                return;
            }
            setState({
                status: 'connected',
                channelId: label,
                uid: options.uid ?? '',
                users: [],
            });
        });
        const joinedSub = onUserJoined((uid) => {
            setState((prev) => prev.status === 'connected'
                ? {
                    ...prev,
                    users: [...prev.users.filter((u) => u.uid !== uid), { uid, joinedAt: Date.now() }],
                }
                : prev);
        });
        const leftSub = onUserLeft((uid) => {
            setState((prev) => prev.status === 'connected'
                ? { ...prev, users: prev.users.filter((u) => u.uid !== uid) }
                : prev);
        });
        return () => {
            cancelled = true;
            joinedSub.remove();
            leftSub.remove();
            if (activeChannelRef.current) {
                leaveChannel().catch(() => { });
                activeChannelRef.current = null;
            }
        };
    }, [options]);
    return state;
}
exports.picoRtc = {
    joinChannel,
    leaveChannel,
    setLocalMuted,
    setOutputVolume,
    onUserJoined,
    onUserLeft,
    isAvailable,
    // Escape hatch: the raw FishjamClient instance. Use this for advanced
    // features (data channels, screen share, custom track encoding) not
    // surfaced through the wrapper.
    getClient: () => client,
};
//# sourceMappingURL=picoRtc.js.map