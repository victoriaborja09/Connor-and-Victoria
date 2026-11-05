/*
 * Connor & Victoria — interactive storefront street
 * Keeps the approved source artwork untouched. Navigation pans and zooms the
 * original image, so no scenery is regenerated, stretched disproportionately,
 * or swapped between locations.
 */
(() => {
  'use strict';
  const image = document.getElementById('street-image');
  const street = document.getElementById('street');
  const back = document.getElementById('previous');
  const forward = document.getElementById('next');
  const toggle = document.getElementById('zoom-toggle');
  const zoomLabel = document.getElementById('zoom-label');
  const locationName = document.getElementById('location-name');
  const locationCount = document.getElementById('location-count');
  const hotspots = [...document.querySelectorAll('.hotspot')];
  const camera = document.getElementById('camera');
  const W = 1672, H = 941;
  const stores = [
    { name: "Connor's Coffee Shop", x: 329, y: 471, box: [115, 198, 458, 610] },
    { name: "Connor & Victoria's Bookstore", x: 835, y: 463, box: [570, 22, 581, 789] },
    { name: "Victoria's Hobby Store", x: 1373, y: 470, box: [1162, 130, 485, 679] }
  ];
  let current = 1;
  let overview = false;
  let startPoint = null;
  let viewportWidth = 0;
  let viewportHeight = 0;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.matches) street.classList.add('no-motion');

  function geometry() {
    const w = camera.clientWidth || window.innerWidth;
    const h = camera.clientHeight || window.innerHeight;
    const fit = Math.min(w / W, h / H);
    const cover = Math.max(w / W, h / H);
    const portrait = w < 720 || (w / h < 0.85);
    const scale = overview ? fit : cover * (portrait ? 1.0 : (w < 1050 ? 1.38 : 1.63));
    const px = overview ? W / 2 : stores[current].x;
    const py = overview ? H / 2 : stores[current].y;
    return {w,h,scale,left:w/2 - px*scale,top:h/2 - py*scale};
  }

  function update() {
    const m = geometry();
    viewportWidth = m.w;
    viewportHeight = m.h;
    image.style.width = `${W*m.scale}px`;
    image.style.height = `${H*m.scale}px`;
    image.style.left = `${m.left}px`;
    image.style.top = `${m.top}px`;
    street.classList.toggle('overview', overview);
    back.hidden = overview || current === 0;
    forward.hidden = overview || current === 2;
    zoomLabel.textContent = overview ? 'Zoom in' : 'Zoom out';
    toggle.setAttribute('aria-label', overview ? 'Zoom in to the bookstore' : 'Zoom out to see all three shops');
    toggle.setAttribute('title', overview ? 'Return to the bookstore' : 'See the full street');
    locationName.textContent = stores[current].name;
    locationCount.textContent = `${current+1} / 3`;
    hotspots.forEach((el,index)=>{
      const [x,y,w,h] = stores[index].box;
      el.style.left = `${m.left+x*m.scale}px`;
      el.style.top = `${m.top+y*m.scale}px`;
      el.style.width = `${w*m.scale}px`;
      el.style.height = `${h*m.scale}px`;
      el.tabIndex = overview ? 0 : -1;
      el.setAttribute('aria-hidden', overview ? 'false' : 'true');
    });
  }

  function changeTo(index) {
    current = Math.max(0,Math.min(stores.length-1,index));
    overview = false;
    update();
  }

  back.addEventListener('click',()=>changeTo(current-1));
  forward.addEventListener('click',()=>changeTo(current+1));
  toggle.addEventListener('click',()=>{
    if(overview){current=1;overview=false;}else overview=true;
    update();
  });
  hotspots.forEach(el=>el.addEventListener('click',()=>changeTo(Number(el.dataset.target))));

  window.addEventListener('keydown',event=>{
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (event.key==='ArrowLeft') {event.preventDefault();changeTo(overview?0:current-1);}
    else if (event.key==='ArrowRight') {event.preventDefault();changeTo(overview?2:current+1);}
    else if (event.key==='Escape' || event.key==='-') {event.preventDefault();overview=true;update();}
    else if (event.key==='+' || event.key==='=') {event.preventDefault();current=1;overview=false;update();}
  });

  camera.addEventListener('pointerdown', event=>{
    if(event.pointerType==='mouse' && event.button!==0) return;
    startPoint={x:event.clientX,y:event.clientY,time:performance.now()};
  });
  camera.addEventListener('pointerup', event=>{
    if(!startPoint) return;
    const dx=event.clientX-startPoint.x;
    const dy=event.clientY-startPoint.y;
    const origin=startPoint;startPoint=null;
    if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.25){
      if(overview){changeTo(dx>0?0:2);}
      else changeTo(current+(dx<0?1:-1));
    }
  });
  camera.addEventListener('pointercancel',()=>{startPoint=null;});

  let resizePending = false;
  window.addEventListener('resize',()=>{
    if(resizePending) return;
    resizePending=true;
    requestAnimationFrame(()=>{resizePending=false;update();});
  });

  image.addEventListener('error',()=>{
    image.alt = 'The storefront illustration could not load. Please refresh.';
    street.style.background='#eecdbb';
  });
  image.addEventListener('load',()=>{
    if(image.naturalWidth && image.naturalHeight){update();}
  });
  update();
})();