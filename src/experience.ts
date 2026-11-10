import { SessionMode, VisibilityState, type World } from '@iwsdk/core';

type Quality = 'auto' | 'performance' | 'quality';

export function configureExperience(world: World): void {
  const launcher = document.querySelector<HTMLElement>('#launcher')!;
  const message = document.querySelector<HTMLElement>('#launch-status')!;
  const mr = document.querySelector<HTMLButtonElement>('#launch-mr')!;
  const vr = document.querySelector<HTMLButtonElement>('#launch-vr')!;
  const selector = document.querySelector<HTMLSelectElement>('#graphics')!;
  const workshop = world.getSceneObject('immersive-workshop');
  const detail = world.getSceneObject('studio-detail');
  if (workshop) workshop.visible = false;
  const details: typeof world.scene.children = [];
  world.scene.traverse(object => {
    if (object.name.startsWith('Quality Detail')) details.push(object);
  });
  let quality: Quality = 'auto';
  try {
    const saved = localStorage.getItem('timecraft-graphics');
    if (saved === 'performance' || saved === 'quality') quality = saved;
  } catch { /* Storage can be unavailable in a private browser context. */ }
  selector.value = quality;
  let enhanced = false;
  let total = 0;
  let samples = 0;
  let slow = 0;
  let steppedDown = false;

  const apply = (next: boolean) => {
    enhanced = next;
    for (const object of details) object.visible = enhanced;
    if (detail) detail.visible = enhanced;
    world.renderer.xr.setFoveation(enhanced ? 0.25 : 0.8);
    launcher.dataset.profile = enhanced ? 'quality' : 'performance';
    if (!world.renderer.xr.isPresenting) world.renderer.xr.setFramebufferScaleFactor(enhanced ? 1 : 0.86);
  };

  selector.addEventListener('change', () => {
    quality = selector.value as Quality;
    try { localStorage.setItem('timecraft-graphics', quality); } catch { /* Optional persistence. */ }
    apply(quality === 'quality');
  });
  apply(quality === 'quality');

  const xr = navigator.xr;
  if (!xr || !window.isSecureContext) {
    message.textContent = '3D preview available. Open this HTTPS page in Quest Browser for immersive play.';
    return;
  }

  let pendingMode: SessionMode | undefined;
  const supported = [false, false];
  const refreshButtons = (busy: boolean) => {
    mr.disabled = busy || !supported[0];
    vr.disabled = busy || !supported[1];
  };
  const launch = (mode: SessionMode) => {
    pendingMode = mode;
    refreshButtons(true);
    message.textContent = 'Starting immersive session…';
    world.launchXR({ sessionMode: mode });
    window.setTimeout(() => {
      if (world.xrSession || !pendingMode) return;
      pendingMode = undefined;
      refreshButtons(false);
      message.textContent = 'Could not start the session. Try the other mode or check Quest Browser permissions.';
    }, 4500);
  };
  mr.addEventListener('click', () => launch(SessionMode.ImmersiveAR));
  vr.addEventListener('click', () => launch(SessionMode.ImmersiveVR));
  void Promise.allSettled([xr.isSessionSupported('immersive-ar'), xr.isSessionSupported('immersive-vr')]).then(results => {
    results.forEach((result, index) => { supported[index] = result.status === 'fulfilled' && result.value; });
    refreshButtons(false);
    message.textContent = supported.some(Boolean)
      ? 'Sit comfortably, enable hand tracking, and choose a mode.'
      : 'No immersive mode is available in this browser. The 3D preview is still available.';
  });

  world.renderer.xr.addEventListener('sessionstart', () => {
    const session = world.renderer.xr.getSession();
    if (workshop) workshop.visible = pendingMode
      ? pendingMode === SessionMode.ImmersiveVR
      : session?.environmentBlendMode === 'opaque';
    launcher.dataset.mode = workshop?.visible ? 'vr' : 'mr';
    launcher.hidden = true;
    pendingMode = undefined;
    total = samples = slow = 0;
    steppedDown = false;
    apply(quality === 'quality');
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    if (workshop) workshop.visible = false;
    launcher.dataset.mode = 'preview';
    launcher.hidden = false;
    pendingMode = undefined;
    apply(quality === 'quality');
    refreshButtons(false);
    message.textContent = 'Choose a mode to continue. Use Restart inside the game to reset the watch.';
  });

  world.onXRFrame((frame, delta) => {
    if (quality !== 'auto' || steppedDown || world.visibilityState.peek() !== VisibilityState.Visible ||
        delta <= 0 || delta > 0.12) return;
    const hz = frame.session.frameRate;
    // Never infer headset capability from the browser's reported device name.
    if (!hz || hz < 60) return;
    total += delta;
    samples++;
    if (delta > 1.22 / hz) slow++;
    if (samples < 150) return;
    if (!enhanced && total / samples <= 1.09 / hz && slow / samples < 0.04) apply(true);
    else if (enhanced && (total / samples > 1.15 / hz || slow / samples > 0.10)) {
      apply(false);
      steppedDown = true;
    }
    total = samples = slow = 0;
  });
}
