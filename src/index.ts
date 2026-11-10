/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { AssemblySystem } from './assembly.js';
import { WatchAssemblySystem } from './watch-assembly.js';
import { WatchProgress } from './watch-progress.js';
import { configureExperience } from './experience.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  const movement = world.requireSceneEntity('watch-movement');
  if (movement.hasComponent(WatchProgress)) {
    world.registerSystem(WatchAssemblySystem);
    configureExperience(world);
  } else {
    world.registerSystem(AssemblySystem);
  }
}).catch((error: unknown) => {
  console.error(error);
  document.querySelector<HTMLElement>('#launch-status')!.textContent = 'Could not load the studio. Reload the page to try again.';
});
