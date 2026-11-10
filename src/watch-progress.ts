import { createComponent, Types } from '@iwsdk/core';

export const WatchProgress = createComponent('WatchProgress', {
  winding: { type: Types.Float32, default: 0 },
  phase: { type: Types.Int8, default: 0 },
  started: { type: Types.Boolean, default: false },
  installed: { type: Types.Int8, default: 0 },
});
