# TimeCraft MR

TimeCraft MR is a hands-first mixed reality game for the Meta VR Start Developer Competition 2026. Assemble a mechanical wristwatch, wind the crown, and hear its first tick.

**[Play TimeCraft MR](https://essamsalah.github.io/TimeCraft/)** · [Watch the two-minute demo](https://vimeo.com/1246380065) · [Devpost entry](https://devpost.com/software/timecraft-mr-6wokgc)

Open the game in Meta Quest Browser with hand tracking enabled. Select **Enter Mixed Reality**, sit facing the bench, and pinch **Begin**. Pinch the highlighted part, follow the green alignment guide, and wind the crown after assembly.

## Local development

Use the Node.js version in [`.nvmrc`](.nvmrc).

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

Use `npm run dev:status` to find the runtime URL, `npm run dev:down` to stop the session, or `npm run preview` to serve the production build locally. See [Meta's IWSDK headset testing guide](https://developers.meta.com/vr/documentation/iwsdk/guides/02-testing-experience/).

## Source and deployment

- [`src/index.ts`](src/index.ts) starts the IWSDK world.
- [`src/watch-assembly.ts`](src/watch-assembly.ts) handles placement, winding, and the reveal.
- [`public/scenes/`](public/scenes/) and [`public/ui/`](public/ui/) contain scene and interface assets.

GitHub Pages serves the compiled competition build from [`gh-pages`](https://github.com/essamsalah/TimeCraft/tree/gh-pages). The `main` branch contains an earlier source snapshot.
