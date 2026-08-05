"use strict";

(() => {
  const LEAF_ASSETS = Object.freeze([
    "assets/spring.png",
    "assets/summer.png",
    "assets/autumn.png",
    "assets/winter.png"
  ]);

  const ORB_PALETTE = Object.freeze({
    blue: "rgba(151, 203, 224, 0.48)",
    green: "rgba(154, 207, 135, 0.47)",
    yellow: "rgba(239, 203, 125, 0.42)",
    purple: "rgba(190, 166, 220, 0.43)"
  });

  const state = {
    layer: null,
    leafStage: null,
    leaves: [],
    orbs: [],
    orbAnimations: [],
    mutationObserver: null,
    resizeTimer: 0,
    mediaQuery: window.matchMedia("(prefers-reduced-motion: reduce)")
  };

  const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  const randomItem = items => items[Math.floor(Math.random() * items.length)];
  const clamp = (minimum, value, maximum) => Math.min(maximum, Math.max(minimum, value));

  function isEnabled() {
    return document.body.dataset.ambient !== "false"
      && !document.body.classList.contains("reduce-motion")
      && !state.mediaQuery.matches;
  }

  function getLeafCount() {
    const width = window.innerWidth;
    if (width <= 480) return 7;
    if (width <= 768) return 10;
    if (width <= 1024) return 13;
    return 16;
  }

  function createStructure() {
    state.layer = document.getElementById("ambientLayer");
    if (!state.layer) {
      state.layer = document.createElement("div");
      state.layer.id = "ambientLayer";
      state.layer.className = "ambient-layer";
      state.layer.setAttribute("aria-hidden", "true");
      document.body.prepend(state.layer);
    }

    state.layer.replaceChildren();
    state.orbs = [0, 1].map(index => {
      const orb = document.createElement("span");
      orb.className = `ambient-orb orb-${index + 1}`;
      state.layer.append(orb);
      return orb;
    });

    state.leafStage = document.createElement("div");
    state.leafStage.className = "ambient-leaf-stage";
    state.layer.append(state.leafStage);
  }

  function getOrbPositions(size) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      topLeft: { x: -size * 0.42, y: -size * 0.38 },
      topRight: { x: width - size * 0.58, y: -size * 0.34 },
      bottomRight: { x: width - size * 0.54, y: height - size * 0.60 },
      bottomLeft: { x: -size * 0.38, y: height - size * 0.56 }
    };
  }

  function orbFrame(point, color, scale, opacity, offset) {
    return {
      backgroundColor: color,
      offset,
      opacity,
      transform: `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0) scale(${scale})`
    };
  }

  function rebuildOrbs() {
    state.orbAnimations.forEach(animation => animation.cancel());
    state.orbAnimations = [];
    if (!state.orbs.length) return;

    const size = clamp(300, Math.min(window.innerWidth * 0.58, window.innerHeight * 0.82), 610);
    const positions = getOrbPositions(size);
    const specs = [
      {
        duration: 108000,
        path: [positions.topLeft, positions.topRight, positions.bottomRight, positions.bottomLeft, positions.topLeft],
        colors: [ORB_PALETTE.blue, ORB_PALETTE.green, ORB_PALETTE.yellow, ORB_PALETTE.purple, ORB_PALETTE.blue],
        scales: [0.94, 1.08, 0.98, 1.12, 0.94],
        opacities: [0.30, 0.38, 0.34, 0.39, 0.30]
      },
      {
        duration: 126000,
        path: [positions.bottomRight, positions.topLeft, positions.bottomLeft, positions.topRight, positions.bottomRight],
        colors: [ORB_PALETTE.purple, ORB_PALETTE.yellow, ORB_PALETTE.blue, ORB_PALETTE.green, ORB_PALETTE.purple],
        scales: [1.06, 0.96, 1.10, 0.98, 1.06],
        opacities: [0.31, 0.36, 0.32, 0.38, 0.31]
      }
    ];

    state.orbAnimations = state.orbs.map((orb, index) => {
      const spec = specs[index];
      orb.style.width = `${size}px`;
      orb.style.height = `${size}px`;
      const frames = spec.path.map((point, frameIndex) => orbFrame(
        point,
        spec.colors[frameIndex],
        spec.scales[frameIndex],
        spec.opacities[frameIndex],
        frameIndex / (spec.path.length - 1)
      ));
      return orb.animate(frames, {
        duration: spec.duration,
        easing: "ease-in-out",
        fill: "both",
        iterations: Infinity
      });
    });

    if (!isEnabled() || document.hidden) state.orbAnimations.forEach(animation => animation.pause());
  }

  function pointOutside(edge, size) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const padding = Math.max(28, size * 1.35);
    switch (edge) {
      case "left": return { x: -padding, y: random(-size, height + size) };
      case "right": return { x: width + padding, y: random(-size, height + size) };
      case "top": return { x: random(-size, width + size), y: -padding };
      default: return { x: random(-size, width + size), y: height + padding };
    }
  }

  function chooseExit(startEdge) {
    const opposite = { left: "right", right: "left", top: "bottom", bottom: "top" };
    if (Math.random() < 0.72) return opposite[startEdge];
    return randomItem(["left", "right", "top", "bottom"].filter(edge => edge !== startEdge));
  }

  function animateLeaf(entry, initialDelay = 0) {
    if (!isEnabled() || !entry.node.isConnected) return;

    entry.animation?.cancel();
    const size = random(window.innerWidth <= 480 ? 34 : 42, window.innerWidth <= 480 ? 62 : 86);
    const startEdge = randomItem(["left", "right", "top", "bottom"]);
    const endEdge = chooseExit(startEdge);
    const start = pointOutside(startEdge, size);
    const end = pointOutside(endEdge, size);
    const midpoint = {
      x: (start.x + end.x) / 2 + random(-window.innerWidth * 0.12, window.innerWidth * 0.12),
      y: (start.y + end.y) / 2 + random(-window.innerHeight * 0.10, window.innerHeight * 0.10)
    };
    const rotation = random(240, 620) * (Math.random() < 0.5 ? -1 : 1);
    const opacity = random(0.36, 0.56);
    const duration = random(24000, 43000);

    entry.node.src = randomItem(LEAF_ASSETS);
    entry.node.style.width = `${size}px`;
    entry.node.style.height = `${size}px`;
    entry.node.style.filter = `drop-shadow(0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.18)}px rgba(50,76,52,.13))`;

    entry.animation = entry.node.animate([
      { transform: `translate3d(${start.x}px, ${start.y}px, 0) rotate(0deg) scale(.88)`, opacity: 0 },
      { offset: 0.08, opacity },
      { offset: 0.48, transform: `translate3d(${midpoint.x}px, ${midpoint.y}px, 0) rotate(${rotation * 0.52}deg) scale(1.04)`, opacity },
      { offset: 0.92, opacity },
      { transform: `translate3d(${end.x}px, ${end.y}px, 0) rotate(${rotation}deg) scale(.92)`, opacity: 0 }
    ], {
      delay: initialDelay,
      duration,
      easing: "linear",
      fill: "both"
    });

    entry.animation.onfinish = () => {
      if (isEnabled()) animateLeaf(entry, random(400, 3200));
    };
  }

  function rebuildLeaves() {
    state.leaves.forEach(entry => entry.animation?.cancel());
    state.leaves = [];
    state.leafStage?.replaceChildren();
    if (!isEnabled() || !state.leafStage) return;

    const count = getLeafCount();
    for (let index = 0; index < count; index += 1) {
      const node = document.createElement("img");
      node.alt = "";
      node.className = "ambient-leaf";
      node.draggable = false;
      state.leafStage.append(node);
      const entry = { node, animation: null };
      state.leaves.push(entry);
      animateLeaf(entry, index < 4 ? index * 650 : random(2200, 10000));
    }
  }

  function syncVisibility() {
    if (!state.layer) return;
    const enabled = isEnabled();
    state.layer.hidden = !enabled;
    state.orbAnimations.forEach(animation => enabled && !document.hidden ? animation.play() : animation.pause());
    if (enabled && state.leaves.length !== getLeafCount()) rebuildLeaves();
    if (!enabled) {
      state.leaves.forEach(entry => entry.animation?.cancel());
      state.leaves = [];
      state.leafStage?.replaceChildren();
    }
  }

  function initialize() {
    createStructure();
    rebuildOrbs();
    rebuildLeaves();
    syncVisibility();

    state.mutationObserver = new MutationObserver(syncVisibility);
    state.mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ambient", "class"] });

    window.addEventListener("resize", () => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(() => {
        rebuildOrbs();
        rebuildLeaves();
        syncVisibility();
      }, 240);
    }, { passive: true });

    state.mediaQuery.addEventListener?.("change", syncVisibility);
    document.addEventListener("visibilitychange", () => {
      const shouldPlay = isEnabled() && !document.hidden;
      [...state.orbAnimations, ...state.leaves.map(entry => entry.animation)].filter(Boolean).forEach(animation => {
        if (shouldPlay) animation.play();
        else animation.pause();
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
