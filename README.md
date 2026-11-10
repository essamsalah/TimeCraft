# TimeCraft MR

TimeCraft MR is a hands-first mixed-reality watch-assembly game for the Meta VR Start Developer Competition 2026. The playable assembly prototype uses Meta's IWSDK 1.0.1 with TypeScript, Three.js via the SDK's Super Three alias, and Vite.

## Local development

Use Node.js 24.22.2 and npm 11.19.1 for the verified setup. On the original Apple Silicon workstation, the project-local Node installation is in the parent workspace. From this project directory, activate it with:

```sh
export PATH="$PWD/../.tools/node-v24.22.2-darwin-arm64/bin:$PATH"
```

On other machines, use the Node version in `.nvmrc` or install that release from [Node.js](https://nodejs.org/en/download). From this directory:

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

The managed IWSDK browser offers Runtime and Editor views. Open the runtime URL reported by `npm run dev:status` for a regular browser tab. Use `npm run dev:down` to stop the session and `npm run preview` to serve the production build locally.

## XR configuration and smoke test

The manifest enables AR passthrough, optional hand tracking, and pinch-to-grab. The station uses authored transforms and no physics. The movement starts in the center holder and the watch case stays in its fixture.

1. In Runtime, select **Enter XR**. On desktop, choose **Hands** in the IWER toolbar. On Quest, enable native hand tracking. Use **Recenter** while seated, then pinch **Begin**.
2. Pinch the highlighted dial. Hold it flat over the movement, then release when the alignment ring turns green.
3. Pinch the hour hand by its enlarged collar. Hover over the spindle until the ring turns green, then lower it while holding the pinch. Repeat for the minute hand.
4. Pick up the enlarged seconds hand and release over the green guide. It returns to its installed size during the snap.
5. Pinch the gold tab on the completed face and lift it over the case. Release when the case guide turns green.
6. Pinch the crown collar and point the stem into the side opening. Release on green. The station turns the watch over for the case back and secures it with a short turn after placement.
7. Fit the bracelet sections by pinching the first link and releasing over each lug guide in order.
8. Pinch the fitted crown and twist back and forth around its stem. If you prefer the fallback, release the crown, move your hand clear of it, then point and pinch **Wind one turn** on the panel. At full wind, the watch lifts and rotates. After the turn, pinch the case to hold and rotate it yourself. Use **Restart** to reset the station.

Physical Quest passthrough, reach, and pinch feel still need an on-device check. Use Meta's headset testing guide below for the HTTPS connection.

## Project structure

| Path | Role |
| --- | --- |
| `iwsdk.config.json` | Active scene, XR capabilities, runtime features, and emulator settings |
| `vite.config.ts` | IWSDK development plugin and bundling |
| `src/index.ts` | Creates the IWSDK world and registers the scene’s assembly system |
| `src/assets.ts`, `src/components.ts` | Asset and entity-component system registries for the runtime and editor |
| `public/scenes/timecraft-studio.iwsdk.scene.json` | Active seated studio scene |
| `public/scenes/complete-watch.iwsdk.scene.json` | Retained Milestone 3 scene |
| `public/scenes/watch-face.iwsdk.scene.json` | Retained Milestone 2 watch face scene |
| `src/watch-assembly.ts`, `src/watch-progress.ts` | Ordered placement, winding, reveal, and restart |
| `src/watch-mechanism.ts` | Gear, balance wheel, hand motion, and ticking |
| `src/scene-assets/watch-face.scene-asset.ts` | Procedural watch face and case models |
| `public/ui/watch-finish-steps.uikitml` | Step instructions, winding fallback, and restart |
| `public/scenes/assembly.iwsdk.scene.json` | Milestone 1 scene, retained with its original assembly system |
| `src/assembly.ts`, `src/assembly-part.ts` | Alignment, release, snap, and feedback state |
| `src/scene-assets/assembly.scene-asset.ts` | Temporary Three.js models |
| `public/scenes/main.iwsdk.scene.json` | Original starter scene, retained as reference |
| `package-lock.json` | Dependency versions for repeatable npm installs |

## Replacing the models

Replace the `face-movement`, `face-case`, `watch-dial`, or hand entries in `src/assets.ts` with local GLB descriptors using `AssetType.GLTF`. Keep the scene IDs and component assignments. Use meters, +Y up, and an origin at the seat or spindle. Keep optional pickup collars as named children or provide equivalent grasp geometry in the replacement. The target heights and final hand angles are configured independently in `src/watch-assembly.ts`.

## GitHub Pages

The site is intended for `https://essamsalah.github.io/TimeCraft/`. The production build uses relative asset URLs so it can be served under that repository path.

The Pages workflow is manual. Before publishing, confirm redistribution rights for all bundled dependencies. The release audit found no license declaration for `@drawcall/uikitml@0.1.8`, which the current IWSDK build bundles. Once clearance is confirmed, select **GitHub Actions** as the Pages source in repository settings and run **Deploy TimeCraft to GitHub Pages** from Actions with the clearance input enabled.

## Official references

- [Meta IWSDK project setup](https://developers.meta.com/vr/documentation/iwsdk/guides/01-project-setup/)
- [Meta IWSDK desktop emulator and headset testing](https://developers.meta.com/vr/documentation/iwsdk/guides/02-testing-experience/)
