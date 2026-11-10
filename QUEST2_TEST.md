# Test TimeCraft MR on Quest 2

**Open in Meta Quest Browser:** [https://192.168.8.115:4186/timecraft-mr/](https://192.168.8.115:4186/timecraft-mr/)

This is a local test link. The Quest and Mac must be on the same Wi-Fi, and the Mac must stay awake with the server running. If Quest Browser shows a certificate warning, confirm that the address matches the one above and use its continue option if offered. The certificate is self-signed for this local address. You do not need an APK, a terminal, or developer tools. I verified the endpoint from the Mac. Quest Browser connectivity and native playback are still unverified. [Meta headset testing guide](https://developers.meta.com/vr/documentation/iwsdk/guides/02-testing-experience/)

1. Enable **Hand Tracking** on the Quest, set the controllers down, and open the link in **Meta Quest Browser**.
2. Choose **Performance** for the first Quest 2 test. Select **Enter Workshop VR** for a controlled background, or **Enter Mixed Reality** for grayscale passthrough when available.
3. Sit facing a clear area, pinch **Recenter** to place the station in front of you, then pinch **Begin**.
4. Bring your thumb and index finger close to the highlighted part and pinch to pick it up. Move it over the guide and release when it turns green. For the hour and minute hands, lower the hub while holding the pinch.
5. Twist the installed crown back and forth, or point and pinch **Wind one turn**. Use **Skip reveal** if you want to go directly to inspection, then pinch the case to turn it.
6. Pinch **Restart** to reset. To change graphics or switch VR/MR, pinch **Exit XR**, then choose a setting and mode on the launch page.

If port 4186 is unavailable while the Mac is still on the same network, try the [local development link](https://192.168.8.115:8081/). If neither link opens, send the exact browser message. If the page opens but a mode is unavailable, report which buttons were enabled. For gameplay issues, note the mode, graphics setting, part, and what happened after the pinch. A headset screenshot is helpful if available.

No external staging link has been published. Public distribution still needs approval and the dependency licensing clearance documented in the Milestone 5 handover.
