---
description: Android-specific review guidance for this fixture repo.
tags:
  - android
  - mobile
---

# Android review rules

When reviewing Android-side native module changes, check for main-thread blocking calls,
profiler traces, and frame drops on older devices.
