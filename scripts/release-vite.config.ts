import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mergeConfig } from 'vite';
import project from '../vite.config.js';

const output = resolve('.iwsdk/m6-host/timecraft-mr');
const runtimeFiles = [
  'scenes/timecraft-studio.iwsdk.scene.json',
  'ui/studio.uikitml',
  // The manifest preloads these panels before instantiating the active scene.
  'ui/watch-finish-steps.uikitml',
  'ui/watch-steps.uikitml',
  'ui/welcome.uikitml',
  'audio/first-tick.wav',
  'audio/seat-click.wav',
  'audio/soft-pickup.wav',
  'audio/watch-tick.wav',
];

export default mergeConfig(project, {
  build: {
    outDir: output,
    copyPublicDir: false,
    license: { fileName: 'THIRD_PARTY_LICENSES.md' },
  },
  plugins: [{
    name: 'timecraft-release-assets',
    apply: 'build',
    writeBundle() {
      for (const file of runtimeFiles) {
        const destination = resolve(output, file);
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(resolve('public', file), destination);
      }
    },
  }],
});
