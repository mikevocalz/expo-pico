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

import { useEffect, useRef, useState } from 'react';

// ───────── Driver loader (deferred so Metro doesn't choke when the
// fishjam packages aren't installed yet) ──────────────────────────────

type Driver = {
  FishjamClient: any;
  mediaDevices: any;
};

let driverCache: Driver | null | undefined;
function driver(): Driver | null {
  if (driverCache !== undefined) return driverCache;
  const tsClient = '@fishjam-cloud' + '/ts-client';
  const rnWebrtc = '@fishjam-cloud' + '/react-native-webrtc';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tc = (eval('require') as (id: string) => any)(tsClient);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wrtc = (eval('require') as (id: string) => any)(rnWebrtc);
    driverCache = {
      FishjamClient: tc.FishjamClient,
      mediaDevices: wrtc.mediaDevices,
    };
  } catch {
    driverCache = null;
  }
  return driverCache;
}

function isAvailable(): boolean {
  const d = driver();
  return d != null && typeof d.FishjamClient === 'function';
}

let warned = false;
function warnOnce() {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[pico/rtc] Fishjam not loaded — voice chat is unavailable. ' +
      'Install with: bun add @fishjam-cloud/react-native-client ' +
      '@fishjam-cloud/react-native-webrtc react-native-get-random-values',
  );
}

// ───────── Types ─────────

export type RtcJoinOptions = {
  // Fishjam media-server URL (wss://...). For Fishjam Cloud this comes
  // back with your peerToken; for self-hosted Fishjam, use the URL of
  // your deployed server.
  url: string;
  // Short-lived JWT peer token minted by your backend using the
  // FISHJAM API KEY. The token encodes room name + peer identity.
  peerToken: string;
  // Optional: app-side channel/room identifier for logging. Fishjam
  // determines the room from the token; this is informational.
  channelId?: string;
  // Optional: app-side participant identity for logging. Fishjam uses
  // the identity encoded in the token.
  uid?: string;
};

export type RtcUserSnapshot = {
  uid: string;
  joinedAt: number;
};

export type RtcChannelState =
  | { status: 'idle' }
  | { status: 'joining'; channelId: string }
  | { status: 'connected'; channelId: string; uid: string; users: RtcUserSnapshot[] }
  | { status: 'leaving' }
  | { status: 'error'; error: string };

export type Subscription = { remove: () => void };

// ───────── Client + microphone lifecycle ─────────

let client: any | null = null;
let localStream: any | null = null;
let publishedTrackId: string | null = null;
let outputVolume = 1;

const userJoinedListeners = new Set<(uid: string) => void>();
const userLeftListeners = new Set<(uid: string) => void>();

async function acquireMicrophone(): Promise<any | null> {
  const d = driver();
  if (!d?.mediaDevices) return null;
  try {
    const stream = await d.mediaDevices.getUserMedia({ audio: true, video: false });
    const tracks = stream?.getAudioTracks?.() ?? [];
    return tracks[0] ? { stream, track: tracks[0] } : null;
  } catch {
    return null;
  }
}

function applyVolumeToRemotePeers() {
  // Fishjam exposes per-peer audio elements; we set HTMLAudioElement.volume.
  // The react-native-webrtc fork wires this to native AVPlayer/MediaPlayer.
  if (!client) return;
  try {
    const peers = client.getRemotePeers?.() ?? {};
    Object.values(peers).forEach((peer: any) => {
      const tracks = peer?.tracks ?? new Map();
      tracks.forEach?.((t: any) => {
        if (t?.track?.kind === 'audio') {
          try {
            // Both fork and stdlib accept `.volume` on the underlying audio element
            if (t.track._audioElement) t.track._audioElement.volume = outputVolume;
          } catch {
            // ignore individual failures
          }
        }
      });
    });
  } catch {
    // ignore
  }
}

// ───────── Public imperative API ─────────

export async function joinChannel(options: RtcJoinOptions): Promise<boolean> {
  if (!isAvailable()) {
    warnOnce();
    return false;
  }
  const d = driver()!;
  try {
    if (client) {
      await leaveChannel();
    }
    client = new d.FishjamClient();
    // Wire room events into our listener sets.
    client.on?.('peerJoined', (peer: any) => {
      userJoinedListeners.forEach((cb) => cb(String(peer?.id ?? peer?.identity ?? '')));
    });
    client.on?.('peerLeft', (peer: any) => {
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
      } catch {
        publishedTrackId = null;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function leaveChannel(): Promise<void> {
  try {
    if (publishedTrackId && client) {
      try {
        client.removeTrack?.(publishedTrackId);
      } catch {
        // ignore
      }
    }
    if (client) {
      try {
        client.leave?.();
      } catch {
        // ignore
      }
    }
    if (localStream) {
      try {
        localStream.getTracks?.().forEach((t: any) => t.stop?.());
      } catch {
        // ignore
      }
    }
  } finally {
    publishedTrackId = null;
    localStream = null;
    client = null;
  }
}

export async function setLocalMuted(muted: boolean): Promise<void> {
  if (!localStream) return;
  try {
    localStream
      .getAudioTracks?.()
      .forEach((t: any) => {
        // track.enabled = false sends silence frames (keeps the track alive
        // so SFU keying doesn't reset); track.stop() destroys it. We want
        // the silence-frame semantic so unmute is instant.
        t.enabled = !muted;
      });
  } catch {
    // ignore
  }
}

export async function setOutputVolume(volume: number): Promise<void> {
  outputVolume = Math.max(0, Math.min(1, volume));
  applyVolumeToRemotePeers();
}

export function onUserJoined(cb: (uid: string) => void): Subscription {
  userJoinedListeners.add(cb);
  return {
    remove: () => {
      userJoinedListeners.delete(cb);
    },
  };
}

export function onUserLeft(cb: (uid: string) => void): Subscription {
  userLeftListeners.add(cb);
  return {
    remove: () => {
      userLeftListeners.delete(cb);
    },
  };
}

// ───────── React hook ─────────

export function useRtcChannel(
  options: RtcJoinOptions | null,
): RtcChannelState {
  const [state, setState] = useState<RtcChannelState>({ status: 'idle' });
  const activeChannelRef = useRef<string | null>(null);

  useEffect(() => {
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
      if (cancelled) return;
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
      setState((prev) =>
        prev.status === 'connected'
          ? {
              ...prev,
              users: [
                ...prev.users.filter((u) => u.uid !== uid),
                { uid, joinedAt: Date.now() },
              ],
            }
          : prev,
      );
    });
    const leftSub = onUserLeft((uid) => {
      setState((prev) =>
        prev.status === 'connected'
          ? { ...prev, users: prev.users.filter((u) => u.uid !== uid) }
          : prev,
      );
    });

    return () => {
      cancelled = true;
      joinedSub.remove();
      leftSub.remove();
      if (activeChannelRef.current) {
        leaveChannel().catch(() => {});
        activeChannelRef.current = null;
      }
    };
  }, [options]);

  return state;
}

export const picoRtc = {
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
