import { createComponent, Types } from '@iwsdk/core';

export const AssemblyPart = createComponent('AssemblyPart', {
  aligned: { type: Types.Boolean, default: false },
  seated: { type: Types.Boolean, default: false },
});
