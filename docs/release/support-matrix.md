# Public Support Matrix

## Baseline Support

| Dimension | Support |
| --- | --- |
| Expo SDK | 55 is the verified baseline |
| Forward-compat target | track Expo SDK 56+ as canary until validated |
| React Native | repo baseline is `0.79.2`; newer RN claims require canary evidence |
| Architecture | New Architecture only |
| Platform | Android only |
| PICO OS | PICO OS 6 baseline |
| Emulator | smoke/build support only |
| Real device | required for any platform-service claim |

## Device Notes

- Treat `targetProfile` and `targetDevices` as build targeting metadata, not proof of support by themselves.
- Only publish device-profile claims once the package has Phase 6 evidence on the relevant hardware.
- Use emulator results only for build smoke and harness behavior.

## Provisioning Caveats

The following must be called out in package docs and issue templates:

- valid `PICO_APP_ID`
- platform service enablement in the developer console
- test accounts and social graph setup
- billing catalog and subscription product setup
- RTC token infrastructure
- push backend integration
