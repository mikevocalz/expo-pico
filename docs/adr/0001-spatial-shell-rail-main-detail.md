# ADR 0001: The spatial shell is a rail, a main panel and a detail panel

**Status:** Accepted
**Date:** 2026-11-04
**Deciders:** Mike Allen (owner of mikevocalz/expo-pico, mikevocalz/Harlem-Might and mikevocalz/moyolearn)
**Disposition:** BUILD, by porting the rail and detail-panel implementation from Harlem Might and MoyoLearn (product-decisions skill).

## Context

Mike saw the example on a Quest 3S on 2026-11-04: "the spatial layout was messy and wrong! where was the menu/rail on the left (which would be the tabbar on mobile), external 3rd panel is only for a special kinda thing that has a header with a close button (look at moyolearn and harlemmight)".

The example opened Library on the start edge, Details on the end edge and Controls below the main panel as Meta VR Layout SDK windows, with Stage as the immersive scene. That is Meta's generic sample arrangement, not this app's navigation. Device QA on the same day (issue comment 6638663334) also logged `LayoutWindowManager: Window promotion failed: code=-7, msg=Placement rejected. Maxiumum number of tethered child windows allowed is 2`: three windows asked for two tethered slots.

The same spec was given for MoyoLearn on 2026-10-26, and Harlem Might already runs it on a Quest 3S. Both are Mike's own public repos.

## Decision

One layout on Meta Quest, PICO and phones.

| Surface      | Headset                                                                                                                                                                  | Phone          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Rail         | The tab bar's destinations in a narrow panel flush against the main panel's left edge, shorter than it, rounded. It never closes or moves: no close button, no grab bar. | Bottom tab bar |
| Main panel   | The current destination. Always visible. Lists and navigation stay here.                                                                                                 | The screen     |
| Detail panel | Only for special content. Opens beside the main panel with a header holding the title and Close. Closing it leaves rail and main.                                        | Pushed screen  |

How each headset places them:

- **Meta Horizon OS (quest flavor).** The rail is the app's one Layout SDK window, `{ parent: 'left', child: 'right' }`, no offset, `fallback: 'drop'`, priority 20. Harlem Might measured that anchor flush with the main window (gap -0.4dp, twice; its ADR 0006). The window renders from the app root through `SpatialWindowHost`, because Meta's promoted window reports touches relative to itself while React Native's Pressability measures in the main surface, and a window declared deep in the tree cancels its own presses (Harlem ADR 0005, root cause A). The detail panel is a second activity launched with `FLAG_ACTIVITY_LAUNCH_ADJACENT | FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_MULTIPLE_TASK`, hosting a `ReactSurface` from the app's one `ReactHost`. One tethered window means the two-window limit is never reached.
- **PICO OS 5 (pico flavor).** Activity windows have no parent there, so an attached window opened as its own panel floats wherever the user looks. The rail draws in a transparent strip of the main window at the Quest window's size, the way MoyoLearn's `PicoMainFrame` does, and the main panel draws its own rounded surface. The detail panel uses the same second-activity launch, sized through `pico:activity.data`.
- **Phones.** `TabBar` and the `/detail/[id]` route.

### Why the detail panel is not a Layout SDK window

Harlem Might measured outward Layout SDK windows on a Quest 3S, Horizon OS 207 (its `docs/spatial-layout/adr/0005` and `0006`). With `{ parent: 'end', child: 'start' }` the child's far edge sat 160dp past the main window's edge for widths of 300, 400 and 440dp, so every window wider than 160dp overlapped the main one; a 400x600dp detail window with no offset overlapped by 240dp. Offsets cannot fix it: the SDK clamps them to ±5 steps of about 2dp. The second-activity panel opened clear of the main panel in all three of Harlem's runs: in the OS slot to its right, 159dp out and turned 45° toward the user. No public API moves that slot. Rejected: the Layout SDK detail window.

### Where the pieces live

- `@expo-pico/spatial` (`src/shell.ts`): the layout contract. `createSpatialShell` turns design tokens into the rail window spec, the PICO strip width and the detail panel size, so both headsets read one geometry. `attachedWindowFrame`, `detailPanelCommand` and `detailPanelStatusAfter` are the pure rules. Pure TypeScript, unit tested, no React or native imports, so any app can use it.
- `@expo-pico/core`: the native panel host (`PicoWindows`, `PicoPanelHost`, `PicoPanelActivity`) already existed for PICO. Its plugin now marks the immersive activity so Enter XR finds it.
- `expo-horizon-quest` (folded into the expo-horizon-core release): the `detailPanel` option declares the core panel activity in the quest manifest with its `<layout>` size.
- `example/`: the React side (`SpatialWindowHost`, `useHostedSpatialWindow`, `PicoMainFrame`, `DetailPanelHost`, the Zustand stores) and the app's own rail, tab bar and detail content. These stay in the app because they render Meta's `@metavr/*` components, which `metaLayoutSdk` requires as direct app dependencies, and they bind to the app's router and theme. No expo-pico package renders UI today (`@expo-pico/app-kit`'s README says so). Harlem Might and MoyoLearn keep the same hosts in the app for the same reason.

### The main content keeps its aspect when the panel is resized

Horizon OS and PICO OS 5 let the user drag the main panel's corner to any shape. Meta's panel-sizing page lists "resize with a fixed aspect ratio" as a capability without naming a manifest switch, and Android ignores `android:minAspectRatio`/`maxAspectRatio` on resizeable activities, so the window itself is not locked. Instead the content is: `MainContentFrame` (example) measures the main panel and lays the route out in the largest centred frame at the launch aspect (1280x800dp, 1.6), filling the rest with the surface color. The geometry is `fitMainContent` and `SpatialShell.fitMainContent` in `@expo-pico/spatial`, with the ratio taken from the shell's `mainWidthDp`/`mainHeightDp` tokens. It works the same on both headsets, leaves the window bounds (and so the rail window and detail panel) alone, and skips phones, tablets and the inline XR route. Ported from MoyoLearn's `apps/mobile/src/spatial/{main-content-geometry.ts,MainContentFrame.tsx}`.

## Sources

- Harlem Might: `docs/spatial-layout/adr/0005-spatial-shell-rail-window.md`, `docs/spatial-layout/adr/0006-place-detail-panel-activity.md`, `apps/mobile/src/spatial/{railWindow.ts,SpatialWindowHost.tsx,spatialWindowHost.store.ts,useHostedSpatialWindow.ts,placeDetailPanel.ts,metaWindowsCore.ts}`, `apps/mobile/modules/spatial-panels` (`SpatialPanelActivity`, `app.plugin.js`).
- MoyoLearn: `apps/mobile/src/spatial/{railWindow.ts,panelWindowsCore.ts,panelWindows.tsx,spatialWindows.ts,SpatialWindowHost.tsx,useHostedSpatialWindow.ts,metaWindowTypes.ts,main-content-geometry.ts,main-content-geometry.test.ts,MainContentFrame.tsx}`.
- Structure-only references (Mobbin): [Fireflies](https://mobbin.com/screens/440008bf-bf0c-486f-bd38-c77df867470d) (icon rail beside content), [Front](https://mobbin.com/screens/9bded131-2394-46cf-bcbd-a44ab7be10cb) (detail pane with title and close beside the list), [Productboard](https://mobbin.com/screens/fb2d0afb-9515-46d4-af56-cf2c5bd026ab) (closable detail beside the list).

## Consequences

- An app adds a destination to the rail by adding it to its destination list; the window height follows from `railHeightDp`.
- A second Layout SDK window would take the remaining tethered slot. Detail-like content goes through the panel host instead.
- The panel is its own Android task. The user can move or close it from the system bar; that reports `reason: 'user'` and clears the selection.
- If Meta fixes outward attachment or exposes an exact offset, the detail panel could become a Layout SDK window again. Re-measure before changing it.
- The immersive scene inside VRActivity keeps its own composition (`example/src/scene/sceneSurfaces.ts`); this decision covers the 2D panels.
