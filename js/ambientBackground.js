"use strict";

(() => {
  const LEAF_ASSETS = Object.freeze([
    "assets/spring.png",
    "assets/summer.png",
    "assets/autumn.png",
    "assets/winter.png"
  ]);

  const state = {
    layer: null,
    leafStage: null,
    leaves: [],
    orbAnimations: [],
    mutationObserver: null,
    resizeTimer: 0,
    mediaQuery: window.matchMedia("(prefers-reduced-motion: reduce)")
  };

  const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  const randomItem = items => items[Math.floor(Math.random() * items.length)];

  function isEnabled() {
    return document.body.dataset.ambient !== "false" && !state.mediaQuery.matches;
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
    const orbSpecs = [
      { className: "orb-one", x: "-12rem", y: "18rem", duration: 24000, dx: 110, dy: -45 },
      { className: "orb-two", x: "calc(100vw - 19rem)", y: "45rem", duration: 30000, dx: -125, dy: 60 }
    ];

    state.orbAnimations = orbSpecs.map(spec => {
      const orb = document.createElement("span");
      orb.className = `ambient-orb ${spec.className}`;
      orb.style.left = spec.x;
      orb.style.top = spec.y;
      state.layer.append(orb);
      return orb.animate([
        { transform: "translate3d(0, 0, 0) scale(1)" },
        { transform: `translate3d(${spec.dx}px, ${spec.dy}px, 0) scale(1.14)` }
      ], {
        duration: spec.duration,
        direction: "alternate",
        easing: "ease-in-out",
        iterations: Infinity
      });
    });

    state.leafStage = document.createElement("div");
    state.leafStage.className = "ambient-leaf-stage";
    state.layer.append(state.leafStage);
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
    state.orbAnimations.forEach(animation => enabled ? animation.play() : animation.pause());
    if (enabled && state.leaves.length !== getLeafCount()) rebuildLeaves();
    if (!enabled) {
      state.leaves.forEach(entry => entry.animation?.cancel());
      state.leaves = [];
      state.leafStage?.replaceChildren();
    }
  }

  function initialize() {
    createStructure();
    rebuildLeaves();
    syncVisibility();

    state.mutationObserver = new MutationObserver(syncVisibility);
    state.mutationObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ambient", "class"] });

    window.addEventListener("resize", () => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(rebuildLeaves, 240);
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
