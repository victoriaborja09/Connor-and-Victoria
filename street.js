/*
 * Connor & Victoria — three-store coastal world.
 * The approved source illustration is never edited or replaced.
 * One bounded camera moves the artwork, hover areas, and characters together.
 */
(() => {
  'use strict';

  const street = document.getElementById('street');
  const camera = document.getElementById('camera');
  const world = document.getElementById('scene-world');
  const image = document.getElementById('street-image');
  const toggle = document.getElementById('zoom-toggle');
  const hotspots = [...document.querySelectorAll('.hotspot')];
  const W = 1672;
  const H = 941;
  const stores = [
    { name: "Connor's Coffee Shop", doorwayX: 399, box: [115, 198, 458, 610] },
    { name: "Connor & Victoria's Bookstore", doorwayX: 880, box: [570, 22, 581, 789] },
    { name: "Victoria's Hobby Store", doorwayX: 1393, box: [1162, 130, 485, 679] }
  ];

  let overview = true;
  let current = 1;
  let resizePending = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Prevent a flash of the full-size world before its first positioning.
  street.classList.add('no-motion');

  // If an image covers the viewport, never let any side of it move inside
  // the viewport edge. This makes the scene behave like a finite world.
  function contain(requested, worldSize, viewportSize) {
    if (worldSize <= viewportSize) return (viewportSize - worldSize) / 2;
    return Math.max(viewportSize - worldSize, Math.min(0, requested));
  }

  function geometry() {
    const w = camera.clientWidth || window.innerWidth;
    const h = camera.clientHeight || window.innerHeight;
    const fit = Math.min(w / W, h / H);
    const cover = Math.max(w / W, h / H);
    const portrait = w / h < 1.3;
    // A full-street view on portrait screens is intentionally letterboxed
    // instead of cropping away the coffee and hobby shops.
    const scale = overview ? (portrait ? fit : cover) : cover * 2.35;

    if (overview) {
      return {
        scale,
        left: (w - W * scale) / 2,
        top: (h - H * scale) / 2
      };
    }

    // Aim at the shop entrance/people rather than the lettering above it.
    // The camera is clamped so the artwork never exposes an outside edge.
    const aimX = w / 2 - stores[current].doorwayX * scale;
    const aimY = h * 0.8 - 875 * scale;
    return {
      scale,
      left: contain(aimX, W * scale, w),
      top: contain(aimY, H * scale, h)
    };
  }

  function update() {
    const m = geometry();
    world.style.transform = `translate3d(${m.left}px, ${m.top}px, 0) scale(${m.scale})`;
    street.classList.toggle('overview', overview);
    toggle.hidden = overview;
    hotspots.forEach(el => {
      el.tabIndex = overview ? 0 : -1;
      el.setAttribute('aria-hidden', overview ? 'false' : 'true');
    });
  }

  hotspots.forEach((el, index) => {
    const [x, y, w, h] = stores[index].box;
    Object.assign(el.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`
    });
    el.addEventListener('click', () => {
      current = index;
      overview = false;
      street.classList.remove('bookstore-enter');
      update();
      // Once the camera reaches the bookstore at ground level, the two
      // characters walk through its doorway and disappear into the shop.
      if (index === 1 && !reducedMotion.matches) {
        void street.offsetWidth; // reset animation if the store is revisited
        street.classList.add('bookstore-enter');
      }
    });
  });

  toggle.addEventListener('click', () => {
    overview = true;
    street.classList.remove('bookstore-enter');
    update();
  });

  window.addEventListener('keydown', event => {
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if ((event.key === 'Escape' || event.key === '-') && !overview) {
      event.preventDefault();
      overview = true;
      street.classList.remove('bookstore-enter');
      update();
    }
  });

  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      update();
    });
  });

  image.addEventListener('error', () => {
    image.alt = 'The storefront illustration could not load. Please refresh.';
    street.style.background = '#eecdbb';
  });

  update();
  if (!reducedMotion.matches) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => street.classList.remove('no-motion'));
    });
  }
})();