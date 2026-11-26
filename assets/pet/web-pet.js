/* KuroCat web pet (MIT). Copyright (c) 2026 chanke17. See /kurocat/LICENSE. */
(function () {
  'use strict';

  if (window.KuroWebPet) return;

  var Spec = window.KuroSpec;
  var Renderer = window.KuroRenderer;
  if (!Spec || !Renderer) return;

  var canvas = document.getElementById('livePetCanvas');
  var homeMount = document.getElementById('petHomeMount');
  var floatMount = document.getElementById('petFloatMount');
  var canvasBox = document.getElementById('petCanvasBox');
  var floatDock = document.getElementById('floatingPetDock');
  var floatToggleBtn = document.getElementById('petFloatToggle');
  var dockBackBtn = document.getElementById('petDockBackBtn');
  var floatDockBtn = document.getElementById('floatDockBtn');
  var floatNextSkinBtn = document.getElementById('floatNextSkinBtn');
  var keyCounterEl = document.getElementById('petKeyCounter');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var LOGICAL_W = 360;
  var LOGICAL_H = 320;
  canvas.width = LOGICAL_W * 2;
  canvas.height = LOGICAL_H * 2;

  var skinEntries = [];
  var HARRICAT_SKIN = "black";
  var activeSkinIndex = 0;
  var activeSkin = null;
  var activeEyeTheme = 'neonChartreuse';
  var activeKbTheme = 'classicMilk';

  // Immediate frame-1 default so canvas is never blank while skins.json fetches
  if (Array.isArray(Spec.OFFICIAL_TEMPLATES)) {
    var fallbackCat = Spec.OFFICIAL_TEMPLATES.find(function (t) { return t && t.id === HARRICAT_SKIN; }) || Spec.OFFICIAL_TEMPLATES[0];
    var fallbackSkin = fallbackCat && (fallbackCat.skin || fallbackCat.fallback);
    if (fallbackSkin) {
      activeSkin = Spec.resolveSkin(fallbackSkin);
      Renderer.preloadDecorations(activeSkin.decorations);
    }
  }

  var state = Renderer.createDefaultState();
  var pressedCaps = new Map();
  var totalKeys = 0;
  var forcedPose = 'idle'; // 'idle' | 'typing' | 'petHead' | 'drag' | 'sleep'
  var autoTypeTimer = 0;
  var nextBlinkTime = 2.4;
  var isUndocked = false;

  var live = {
    lastActivity: performance.now(),
    lastKeyTime: -10000,
    lastMouseClickTime: -10000,
    petHead: 0,
    petBody: 0,
    huntEnergy: 0,
    pointerActive: false,
    yaw: 0,
    pitch: 0,
    gazeX: 0,
    gazeY: 0,
    prevClientX: null,
    prevClientY: null,
    prevMoveTime: 0,
    shakeSpeed: 0,
    draggingCat: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    dockOffsetX: 0,
    dockOffsetY: 0
  };

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (err) { /* old browsers */ }
  }

  function updateKeyCounter() {
    if (keyCounterEl) keyCounterEl.textContent = 'KEYS ' + totalKeys;
    emit('kuro:keys', { total: totalKeys });
  }

  function applyPose(pose) {
    forcedPose = pose || 'idle';
    document.querySelectorAll('[data-pet-pose]').forEach(function (btn) {
      var on = btn.getAttribute('data-pet-pose') === forcedPose;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    live.lastActivity = performance.now();
    emit('kuro:pose', { pose: forcedPose });
  }

  function setForcedPose(pose) {
    applyPose(forcedPose === pose ? 'idle' : pose);
  }

  function selectSkinById(id) {
    var idx = skinEntries.findIndex(function (item) { return item.id === id; });
    if (idx === -1) return;
    activeSkinIndex = idx;
    var item = skinEntries[idx];
    activeSkin = item.resolved;
    activeEyeTheme = item.eyeTheme || 'siameseBlue';
    // Choose a warm matching keyboard theme per skin
    activeKbTheme = (item.id === 'black') ? 'classicMilk' : (item.id === 'siamese' || item.id === 'mackerel-tabby' ? 'retroCream' : 'classicMilk');
    document.querySelectorAll('.pet-skin-chip').forEach(function (chip) {
      var active = chip.getAttribute('data-skin-id') === id;
      chip.classList.toggle('active', active);
      chip.setAttribute(chip.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-selected', active ? 'true' : 'false');
    });
    emit('kuro:skin', { id: item.id, labelZh: item.labelZh, labelEn: item.labelEn, index: idx });
  }

  function setUndocked(undock) {
    isUndocked = !!undock;
    if (isUndocked && floatMount && floatDock && canvasBox) {
      floatMount.appendChild(canvas);
      canvasBox.classList.add('is-undocked');
      floatDock.classList.add('active');
      if (floatToggleBtn) {
        floatToggleBtn.classList.add('active');
        floatToggleBtn.setAttribute('aria-pressed', 'true');
      }
    } else if (homeMount && floatDock && canvasBox) {
      homeMount.appendChild(canvas);
      canvasBox.classList.remove('is-undocked');
      floatDock.classList.remove('active');
      floatDock.style.transform = '';
      live.dockOffsetX = 0;
      live.dockOffsetY = 0;
      if (floatToggleBtn) {
        floatToggleBtn.classList.remove('active');
        floatToggleBtn.setAttribute('aria-pressed', 'false');
      }
    }
    var lbl = document.getElementById('petFloatLabel');
    if (lbl) {
      var isEn = document.documentElement.lang === 'en';
      lbl.textContent = isUndocked
        ? (isEn ? 'Dock Back' : '收回画框')
        : (isEn ? 'Float on Page' : '放到网页角落');
    }
  }

  // Bind UI controls
  document.querySelectorAll('.pet-skin-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      selectSkinById(chip.getAttribute('data-skin-id'));
    });
  });

  document.querySelectorAll('[data-pet-pose]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setForcedPose(btn.getAttribute('data-pet-pose'));
    });
  });

  if (floatToggleBtn) {
    floatToggleBtn.addEventListener('click', function () { setUndocked(!isUndocked); });
  }
  if (dockBackBtn) {
    dockBackBtn.addEventListener('click', function () { setUndocked(false); });
  }
  if (floatDockBtn) {
    floatDockBtn.addEventListener('click', function () { setUndocked(false); });
  }
  if (floatNextSkinBtn) {
    floatNextSkinBtn.addEventListener('click', function () {
      if (!skinEntries.length) return;
      var next = (activeSkinIndex + 1) % skinEntries.length;
      selectSkinById(skinEntries[next].id);
    });
  }

  // Convert pointer client coords to 360x320 KuroCat canvas coordinates
  function clientToCanvasPos(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 180, y: 160 };
    return {
      x: ((clientX - rect.left) / rect.width) * LOGICAL_W,
      y: ((clientY - rect.top) / rect.height) * LOGICAL_H
    };
  }

  // Global mouse tracking (true desktop pet behavior across the whole webpage!)
  window.addEventListener('pointermove', function (e) {
    var now = performance.now();
    var rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.42;
      var nx = clamp((e.clientX - cx) / Math.max(220, window.innerWidth * 0.42), -1, 1);
      var ny = clamp((e.clientY - cy) / Math.max(180, window.innerHeight * 0.42), -1, 1);
      live.pointerActive = true;
      live.yaw = nx;
      live.pitch = ny * 0.85;
      live.gazeX = nx;
      live.gazeY = ny;

      if (live.prevClientX !== null && now - live.prevMoveTime < 120) {
        var dist = Math.hypot(e.clientX - live.prevClientX, e.clientY - live.prevClientY);
        var dtSec = Math.max(0.008, (now - live.prevMoveTime) / 1000);
        var speed = dist / dtSec;
        if (speed > 1350) {
          live.huntEnergy = clamp(live.huntEnergy + (speed - 1100) / 3600, 0, 1);
          live.lastActivity = now;
        }
      }
      live.prevClientX = e.clientX;
      live.prevClientY = e.clientY;
      live.prevMoveTime = now;
    }

    // Active drag handling (either scruff-lift inside frame or moving floating web pet!)
    if (live.draggingCat && e.pointerId === live.draggingCat.pointerId) {
      var dx = e.clientX - live.draggingCat.startX;
      var dy = e.clientY - live.draggingCat.startY;
      if (!live.draggingCat.engaged && Math.hypot(dx, dy) > 6) {
        live.draggingCat.engaged = true;
        canvas.classList.add('is-dragging');
        if (forcedPose !== 'idle') setForcedPose('idle');
      }
      if (live.draggingCat.engaged) {
        live.lastActivity = now;
        if (isUndocked && floatDock) {
          live.dockOffsetX = live.draggingCat.baseDockX + dx;
          live.dockOffsetY = live.draggingCat.baseDockY + dy;
          floatDock.style.transform = 'translate3d(' + live.dockOffsetX.toFixed(1) + 'px, ' + live.dockOffsetY.toFixed(1) + 'px, 0)';
        } else {
          live.dragOffsetX = clamp(dx * 0.35, -36, 36);
          live.dragOffsetY = clamp(dy * 0.35, -28, 22);
        }
        // Feed 2D inertia velocity into renderer's scruffSwing / scruffSwingY / scruffTailSwing springs
        // (Dragging right -> negative swingTarget so lower torso, limbs & tail trail naturally behind motion)
        var vx = clamp(-(e.clientX - live.draggingCat.lastX) * 0.065, -0.95, 0.95);
        var vy = clamp(-(e.clientY - live.draggingCat.lastY) * 0.055, -0.78, 0.78);
        state.dragSwingTarget = clamp((state.dragSwingTarget || 0) * 0.65 + vx * 0.65, -0.95, 0.95);
        state.dragSwingYTarget = clamp((state.dragSwingYTarget || 0) * 0.65 + vy * 0.65, -0.78, 0.78);
        live.draggingCat.lastX = e.clientX;
        live.draggingCat.lastY = e.clientY;
      }
      return;
    }

    // Petting head / body / tail hover when cursor is inside the canvas
    if (activeSkin && e.target === canvas) {
      var pos = clientToCanvasPos(e.clientX, e.clientY);
      var hit = Renderer.hitTestCat(pos, activeSkin, state);
      if (hit === 'head') {
        live.petHead = Math.min(1, live.petHead + 0.14);
        live.lastActivity = now;
      } else if (hit === 'body') {
        live.petBody = Math.min(1, live.petBody + 0.10);
        live.lastActivity = now;
      }
      if (typeof Renderer.updateTailHover === 'function') {
        Renderer.updateTailHover(state, activeSkin, pos);
      }
    }
  }, { passive: true });

  // Pointer down / click on the live cat canvas
  canvas.addEventListener('pointerdown', function (e) {
    if (!activeSkin) return;
    var now = performance.now();
    live.lastActivity = now;
    var pos = clientToCanvasPos(e.clientX, e.clientY);
    var hit = Renderer.hitTestCat(pos, activeSkin, state);

    if (hit === 'head' || hit === 'body') {
      canvas.setPointerCapture(e.pointerId);
      live.draggingCat = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        baseDockX: live.dockOffsetX,
        baseDockY: live.dockOffsetY,
        hit: hit,
        engaged: false
      };
      return;
    }

    // Click on mouse or keyboard area directly!
    if (pos.x < 110 && pos.y > 215) {
      if (forcedPose !== 'idle') setForcedPose('idle');
      live.lastMouseClickTime = now;
      Renderer.triggerMouseClick(state, activeSkin, e.button === 2);
      totalKeys += 1;
      updateKeyCounter();
    } else if (pos.y > 205) {
      if (forcedPose !== 'idle') setForcedPose('idle');
      var cap = Renderer.findNearestKeycap(pos, activeSkin);
      live.lastKeyTime = now;
      Renderer.triggerKeyTap(state, activeSkin, cap);
      totalKeys += 1;
      updateKeyCounter();
    }
  });

  function endDrag(e) {
    if (!live.draggingCat || e.pointerId !== live.draggingCat.pointerId) return;
    var wasEngaged = live.draggingCat.engaged;
    var hit = live.draggingCat.hit;
    live.draggingCat = null;
    canvas.classList.remove('is-dragging');
    // Quick click on cat head = happy pet burst!
    if (!wasEngaged) {
      if (hit === 'head') live.petHead = 1.0;
      else live.petBody = 0.9;
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Real physical keyboard listening anywhere on the page!
  window.addEventListener('keydown', function (e) {
    if (!activeSkin) return;
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var now = performance.now();
    live.lastActivity = now;
    live.lastKeyTime = now;
    if (forcedPose !== 'idle' && forcedPose !== 'typing') {
      setForcedPose('idle');
    }
    var cap = Renderer.mapKeyboardEventToCap(e);
    if (!e.repeat) {
      pressedCaps.set(e.code || e.key, cap);
      Renderer.triggerKeyTap(state, activeSkin, cap);
      totalKeys += 1;
      updateKeyCounter();
    }
  });

  window.addEventListener('keyup', function (e) {
    pressedCaps.delete(e.code || e.key);
  });

  window.addEventListener('blur', function () {
    pressedCaps.clear();
  });

  // Main 60fps animation loop (mirrors Workshop plaza.js physics)
  var lastFrameMs = performance.now();
  // Skip all work while the canvas is scrolled out of view (saves battery on phones).
  var canvasOnScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { canvasOnScreen = entry.isIntersecting; });
    }, { rootMargin: '120px' }).observe(canvas);
  }

  function tick(nowMs) {
    var dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
    lastFrameMs = nowMs;

    if (activeSkin && (canvasOnScreen || isUndocked)) {
      state.time += dt;
      var isPointerDragging = !!(live.draggingCat && live.draggingCat.engaged);
      var isDraggingNow = isPointerDragging || forcedPose === 'drag';

      if (!isUndocked) {
        if (isPointerDragging) {
          canvas.style.transform = 'translate3d(' + live.dragOffsetX.toFixed(1) + 'px, ' + live.dragOffsetY.toFixed(1) + 'px, 0)';
        } else if (Math.abs(live.dragOffsetX) > 0.3 || Math.abs(live.dragOffsetY) > 0.3) {
          var sk = Math.min(1, dt * 13);
          live.dragOffsetX += (0 - live.dragOffsetX) * sk;
          live.dragOffsetY += (0 - live.dragOffsetY) * sk;
          canvas.style.transform = 'translate3d(' + live.dragOffsetX.toFixed(1) + 'px, ' + live.dragOffsetY.toFixed(1) + 'px, 0)';
        } else if (canvas.style.transform) {
          live.dragOffsetX = 0;
          live.dragOffsetY = 0;
          canvas.style.transform = '';
        }
      } else if (canvas.style.transform) {
        canvas.style.transform = '';
      }

      live.petHead = Math.max(0, live.petHead - dt * 0.55);
      live.petBody = Math.max(0, live.petBody - dt * 0.55);
      live.huntEnergy = Math.max(0, live.huntEnergy - dt * 0.85);

      var heldCaps = Array.from(pressedCaps.values());
      for (var i = 0; i < heldCaps.length; i++) state.keyGlow[heldCaps[i].id] = 1.0;
      var glowKeys = Object.keys(state.keyGlow);
      for (var g = 0; g < glowKeys.length; g++) {
        var gk = glowKeys[g];
        var stillHeld = heldCaps.some(function (c) { return c.id === gk; });
        if (!stillHeld) {
          state.keyGlow[gk] = Math.max(0, state.keyGlow[gk] - dt * 3.8);
          if (state.keyGlow[gk] <= 0.01) delete state.keyGlow[gk];
        }
      }

      state.tailPhase += dt * (live.huntEnergy > 0.25 ? 5.2 : 2.2);
      var idleSec = (nowMs - live.lastActivity) / 1000;
      var isSleeping = !isDraggingNow && heldCaps.length === 0 && forcedPose === 'idle' && idleSec > 24;

      if (!isSleeping && forcedPose !== 'sleep' && live.petHead < 0.35) {
        if (state.time >= nextBlinkTime) {
          var el = state.time - nextBlinkTime;
          if (el < 0.08) state.blinkProgress = el / 0.08;
          else if (el < 0.17) state.blinkProgress = 1 - (el - 0.08) / 0.09;
          else {
            state.blinkProgress = 0;
            nextBlinkTime = state.time + 2.6 + Math.random() * 2.4;
          }
        }
      } else {
        state.blinkProgress += (0 - state.blinkProgress) * Math.min(1, dt * 10);
      }

      var tYaw = live.pointerActive ? live.yaw : Math.sin(state.time * 0.75) * 0.14;
      var tPitch = live.pointerActive ? live.pitch : 0;
      var tHunt = 0, tPetH = 0, tPetB = 0, tSleep = 0, tEarFold = 0, tHind = 0, tSquash = 1, tHeadY = 0;
      var isDouni = activeSkin.renderStyle === 'douni' || activeSkin.typingStyle === 'douni';
      var effectivePose = 'idle';
      state.tailTypingTarget = 0;

      if (isDraggingNow) {
        effectivePose = 'drag';
        tYaw = 0; tPitch = 0;
        state.leftPawActive = false;
        state.rightPawActive = false;
      } else if (forcedPose === 'petHead') {
        effectivePose = 'petHead';
        tPetH = 1; tEarFold = 0.78; tSquash = 0.95; tHeadY = 3;
        state.leftPawActive = false; state.rightPawActive = false;
      } else if (forcedPose === 'sleep') {
        effectivePose = 'sleep';
        tSleep = 1; tPitch = 0.35; tHeadY = 6; tEarFold = 0.32;
        state.leftPawActive = false; state.rightPawActive = false;
      } else if (forcedPose === 'typing') {
        effectivePose = 'typing';
        autoTypeTimer += dt;
        if (autoTypeTimer > (isDouni ? 0.18 : 0.21)) {
          autoTypeTimer = 0;
          Renderer.triggerKeyTap(state, activeSkin);
          totalKeys += 1;
          updateKeyCounter();
        }
        tPitch = 0.26;
      } else {
        var recentKey = heldCaps.length > 0 || (nowMs - live.lastKeyTime < 220);
        var recentMouse = nowMs - live.lastMouseClickTime < 340;
        if (recentKey) {
          effectivePose = 'typing';
          tPitch = Math.max(tPitch, 0.22);
          tSquash = 0.97;
        }
        if (!recentKey && !recentMouse) {
          state.leftPawActive = false;
          state.rightPawActive = false;
        } else if (recentMouse && !recentKey) {
          state.rightPawActive = false;
        }
        if (heldCaps.length >= 3 && !isDouni) {
          var c3 = heldCaps[2];
          state.hindFoot = Renderer.screenQuadPoint(1 - (c3.xUnits + c3.widthUnits * 0.5), 1 - (c3.row + 0.5) / 5);
          tHind = 1;
        }
        if (heldCaps.length >= 4 && !isDouni) {
          var c4 = heldCaps[3];
          state.tailTipGoal = Renderer.screenQuadPoint(1 - (c4.xUnits + c4.widthUnits * 0.5), 1 - (c4.row + 0.5) / 5);
          state.tailTypingTarget = 1;
        }
        if (live.petHead > 0.08) {
          tPetH = live.petHead;
          tEarFold = Math.max(tEarFold, live.petHead * 0.78);
          tSquash = Math.min(tSquash, 1 - live.petHead * 0.05);
          tHeadY = Math.max(tHeadY, live.petHead * 3);
        }
        if (live.petBody > 0.08) {
          tPetB = live.petBody;
          tEarFold = Math.max(tEarFold, live.petBody * 0.45);
          tSquash = Math.min(tSquash, 1 - live.petBody * 0.04);
        }
        if (live.huntEnergy > 0.12 && live.petHead < 0.25) {
          tHunt = live.huntEnergy;
          tSquash = Math.min(tSquash, 1 - live.huntEnergy * 0.10);
          tHeadY = Math.max(tHeadY, live.huntEnergy * 7);
          tEarFold = Math.max(tEarFold, live.huntEnergy * 0.45);
        }
        if (isSleeping) {
          tSleep = Math.min(1, (idleSec - 24) / 3.0);
          tPitch = 0.35 * tSleep;
          tHeadY = 6 * tSleep;
          tEarFold = 0.32 * tSleep;
        }
      }

      var k = Math.min(1, dt * 9);
      var lerp = function (a, b) { return a + (b - a) * k; };
      state.headYaw = lerp(state.headYaw, tYaw);
      state.headPitch = lerp(state.headPitch, tPitch);
      state.headTilt = lerp(state.headTilt, tYaw * 0.06);
      state.bodyTilt = lerp(state.bodyTilt, tYaw * 0.04);
      state.eyeGazeX = lerp(state.eyeGazeX, live.pointerActive ? live.gazeX : tYaw);
      state.eyeGazeY = lerp(state.eyeGazeY, live.pointerActive ? live.gazeY : tPitch);
      state.huntIntensity = lerp(state.huntIntensity, tHunt);
      state.petHead = lerp(state.petHead, tPetH);
      state.petBody = lerp(state.petBody, tPetB);
      state.sleepiness = lerp(state.sleepiness, tSleep);
      state.earFold = lerp(state.earFold, tEarFold);
      state.earTwitch = lerp(state.earTwitch, 0);
      state.bodySquash = lerp(state.bodySquash, tSquash);
      state.headOffsetY = lerp(state.headOffsetY, tHeadY);
      state.hindFootActive = lerp(state.hindFootActive, tHind);
      Renderer.stepPhysicsExtras(state, activeSkin, effectivePose, dt);
      if (!state.leftPawActive) {
        state.leftPaw.x = lerp(state.leftPaw.x, Renderer.LEFT_PAW_REST.x);
        state.leftPaw.y = lerp(state.leftPaw.y, Renderer.LEFT_PAW_REST.y);
      }
      if (!state.rightPawActive) {
        state.rightPaw.x = lerp(state.rightPaw.x, Renderer.RIGHT_PAW_REST.x);
        state.rightPaw.y = lerp(state.rightPaw.y, Renderer.RIGHT_PAW_REST.y);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      Renderer.drawScene(ctx, activeSkin, state, {
        kbTheme: activeKbTheme,
        eyeTheme: activeEyeTheme,
        whiteOutline: true
      });
    }

    window.requestAnimationFrame(tick);
  }

  // Load curated skin bundle (supports root / and /en/ subpages)
  var assetBase = (typeof window.KUROCAT_ASSET_BASE === 'string') ? window.KUROCAT_ASSET_BASE : '';
  fetch(assetBase + 'pet/skins.json?v=' + (window.KUROCAT_BUILD || '20261125c'))
    .then(function (r) { return r.json(); })
    .then(function (list) {
      skinEntries = list.map(function (entry) {
        var resolved = Spec.resolveSkin(entry.skin);
        Renderer.preloadDecorations(resolved.decorations);
        return {
          id: entry.id,
          labelZh: entry.labelZh,
          labelEn: entry.labelEn,
          eyeTheme: entry.eyeTheme,
          resolved: resolved
        };
      });
      selectSkinById(HARRICAT_SKIN);
    })
    .catch(function () {
      // Keep fallback siamese template active
    });

  // Small public API so the page can direct the live cat (skin stickers, scroll story, float dock).
  window.KuroWebPet = {
    canvas: canvas,
    selectSkin: selectSkinById,
    nextSkin: function (step) {
      if (!skinEntries.length) return;
      var n = skinEntries.length;
      selectSkinById(skinEntries[(activeSkinIndex + (step || 1) + n) % n].id);
    },
    getSkinId: function () { return skinEntries[activeSkinIndex] ? skinEntries[activeSkinIndex].id : 'siamese'; },
    getSkins: function () {
      return skinEntries.map(function (e) { return { id: e.id, labelZh: e.labelZh, labelEn: e.labelEn }; });
    },
    setPose: function (pose) { applyPose(pose); },
    togglePose: setForcedPose,
    getPose: function () { return forcedPose; },
    // Point the head/eyes as if the cursor were at (x, y) in -1..1 (used by the hunting demo).
    look: function (x, y) {
      live.pointerActive = true;
      live.yaw = clamp(x, -1, 1);
      live.pitch = clamp(y, -1, 1) * 0.85;
      live.gazeX = live.yaw;
      live.gazeY = clamp(y, -1, 1);
    },
    hunt: function (level) {
      live.huntEnergy = clamp(typeof level === 'number' ? level : 1, 0, 1);
      live.lastActivity = performance.now();
    },
    tapKeys: function (count) {
      if (!activeSkin) return;
      for (var i = 0; i < (count || 1); i++) {
        Renderer.triggerKeyTap(state, activeSkin);
        totalKeys += 1;
      }
      live.lastKeyTime = performance.now();
      live.lastActivity = live.lastKeyTime;
      updateKeyCounter();
    },
    // Simulate held keys (e.g. 3 keys = hind foot, 4 keys = tail) for the scroll story.
    holdKeys: function (codes) {
      Array.from(pressedCaps.keys()).forEach(function (k) {
        if (k.indexOf('demo-') === 0) pressedCaps.delete(k);
      });
      if (!activeSkin) return;
      (codes || []).forEach(function (code) {
        var cap = Renderer.mapKeyboardEventToCap({ code: code, key: '' });
        pressedCaps.set('demo-' + code, cap);
        Renderer.triggerKeyTap(state, activeSkin, cap);
      });
      live.lastKeyTime = performance.now();
      live.lastActivity = live.lastKeyTime;
    },
    releaseKeys: function () {
      Array.from(pressedCaps.keys()).forEach(function (k) {
        if (k.indexOf('demo-') === 0) pressedCaps.delete(k);
      });
    },
    setUndocked: setUndocked,
    isUndocked: function () { return isUndocked; },
    getKeyCount: function () { return totalKeys; }
  };
  emit('kuro:ready', {});

  window.requestAnimationFrame(tick);
})();
