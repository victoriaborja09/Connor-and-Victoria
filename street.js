/* The existing world framing, hotspots, and camera are unchanged.
   Only the old static SVG characters were replaced by actual 3D code actors. */
(() => {
  'use strict';
  const street=document.getElementById('street');
  const camera=document.getElementById('camera');
  const world=document.getElementById('scene-world');
  const image=document.getElementById('street-image');
  const toggle=document.getElementById('zoom-toggle');
  const hotspots=[...document.querySelectorAll('.hotspot')];
  const W=1672,H=941;
  const stores=[
    {name:"Connor's Coffee Shop",doorwayX:399,box:[115,198,458,610]},
    {name:"Connor & Victoria's Bookstore",doorwayX:880,box:[570,22,581,789]},
    {name:"Victoria's Hobby Store",doorwayX:1393,box:[1162,130,485,679]}
  ];
  let overview=true,current=1,resizePending=false,walkTimer=null;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  street.classList.add('no-motion');
  function contain(requested,worldSize,viewportSize){if(worldSize<=viewportSize)return(viewportSize-worldSize)/2;return Math.max(viewportSize-worldSize,Math.min(0,requested))}
  function geometry(){
    const w=camera.clientWidth||innerWidth,h=camera.clientHeight||innerHeight;
    const fit=Math.min(w/W,h/H),cover=Math.max(w/W,h/H),portrait=w/h<1.3;
    const s=overview?(portrait?fit:cover):cover*2.35;
    if(overview)return{scale:s,left:(w-W*s)/2,top:(h-H*s)/2};
    const aimX=w/2-stores[current].doorwayX*s;
    const aimY=h*.8-875*s;
    return{scale:s,left:contain(aimX,W*s,w),top:contain(aimY,H*s,h)};
  }
  function update(){const m=geometry();world.style.transform=`translate3d(${m.left}px,${m.top}px,0) scale(${m.scale})`;street.classList.toggle('overview',overview);toggle.hidden=overview;hotspots.forEach(el=>{el.tabIndex=overview?0:-1;el.setAttribute('aria-hidden',overview?'false':'true')})}
  // Characters are genuine WebGL volumetric meshes from characters3d.js.
  try{
    const c=document.getElementById('characters3d');
    if(c&&window.CV3D){window.CVCharacters=window.CV3D.create(c,{studio:false});c.addEventListener('click',()=>window.CVCharacters.wave())}
  }catch(error){console.warn('3D characters could not load',error)}
  function clearWalk(){if(walkTimer!==null){clearTimeout(walkTimer);walkTimer=null}}
  hotspots.forEach((el,index)=>{
    const [x,y,w,h]=stores[index].box;
    Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    el.addEventListener('click',()=>{
      clearWalk();current=index;overview=false;update();
      if(window.CVCharacters){window.CVCharacters.reset();
        if(index===1&&!reducedMotion.matches)walkTimer=setTimeout(()=>window.CVCharacters.enter(),1100);
        else if(!reducedMotion.matches)walkTimer=setTimeout(()=>window.CVCharacters.wave(),1100)}
    });
  });
  toggle.addEventListener('click',()=>{clearWalk();overview=true;window.CVCharacters?.reset();update()});
  window.addEventListener('keydown',event=>{
    if(event.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))return;
    if((event.key==='Escape'||event.key==='-')&&!overview){event.preventDefault();clearWalk();overview=true;window.CVCharacters?.reset();update()}
    if(event.key.toLowerCase()==='w'&&!overview)window.CVCharacters?.wave();
    if(event.key.toLowerCase()==='t'&&!overview)window.CVCharacters?.turn();
  });
  window.addEventListener('resize',()=>{if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;update()})});
  image.addEventListener('error',()=>{image.alt='The storefront illustration could not load. Please refresh.';street.style.background='#eecdbb'});
  update();if(!reducedMotion.matches)requestAnimationFrame(()=>requestAnimationFrame(()=>street.classList.remove('no-motion')));
})();