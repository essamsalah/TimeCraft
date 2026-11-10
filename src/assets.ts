/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';

import { alignmentRing, movement, partsTray, watchCase, workbench } from './scene-assets/assembly.scene-asset.js';

import {
  activePartHalo, automaticMovement, faceCase, hourHand, minuteHand, movementHolder,
  secondsHand, watchDial, braceletSection, exhibitionBack, openCase, openDial, openMovement, windingCrown,
} from './scene-assets/watch-face.scene-asset.js';

import { gestureDemo, immersiveWorkshop, stationTray, studioDetail, watchStation } from './scene-assets/station.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;
const DEFAULT_STOCK_ASSET_BASE =
  'https://cdn.jsdelivr.net/npm/@iwsdk/example-assets@0.4.2/assets';
const configuredStockAssetBase =
  import.meta.env.VITE_IWSDK_EXAMPLE_ASSET_BASE_URL?.trim();
const stockAssetBase = (
  configuredStockAssetBase || DEFAULT_STOCK_ASSET_BASE
).replace(/\/+$/u, '');

function stockAssetUrl(assetId: string, fileName: string): string {
  return `${stockAssetBase}/${assetId}/${fileName}`;
}

export default defineAssets({
  'watch-station': watchStation,
  'immersive-workshop': immersiveWorkshop,
  'studio-detail': studioDetail,
  'station-tray': stationTray,
  'gesture-demo': gestureDemo,
  'studio-panel': { url: publicAssetUrl('ui/studio.uikitml'), type: AssetType.UIKitML },
  'open-movement': openMovement,
  'open-case': openCase,
  'open-dial': openDial,
  'winding-crown': windingCrown,
  'exhibition-back': exhibitionBack,
  'bracelet-section': braceletSection,
  'watch-finish-steps': { url: publicAssetUrl('ui/watch-finish-steps.uikitml'), type: AssetType.UIKitML },
  'face-movement': automaticMovement,
  'face-case': faceCase,
  'movement-holder': movementHolder,
  'watch-dial': watchDial,
  'hour-hand': hourHand,
  'minute-hand': minuteHand,
  'seconds-hand': secondsHand,
  'active-part-halo': activePartHalo,
  'watch-steps': { url: publicAssetUrl('ui/watch-steps.uikitml'), type: AssetType.UIKitML },
  'assembly-workbench': workbench,
  'assembly-tray': partsTray,
  'watch-case': watchCase,
  'watch-movement': movement,
  'alignment-ring': alignmentRing,
  'environment-desk': {
    url: stockAssetUrl('environment-desk', 'environmentDesk.gltf'),
    type: AssetType.GLTF,
    name: 'Environment Desk',
    priority: 'lazy',
  },
  'plant-sansevieria': {
    url: stockAssetUrl('plant-sansevieria', 'plantSansevieria.gltf'),
    type: AssetType.GLTF,
    name: 'Plant Sansevieria',
    priority: 'lazy',
  },
  robot: {
    url: stockAssetUrl('robot', 'robot.gltf'),
    type: AssetType.GLTF,
    name: 'Robot',
    priority: 'lazy',
  },
  'welcome-panel': {
    url: publicAssetUrl('ui/welcome.uikitml'),
    type: AssetType.UIKitML,
    name: 'Welcome Panel',
  },
  'webxr-banner': {
    url: publicAssetUrl('gltf/webxr-banner/banner.gltf'),
    type: AssetType.GLTF,
    name: 'WebXR Banner',
    priority: 'lazy',
  },
});
