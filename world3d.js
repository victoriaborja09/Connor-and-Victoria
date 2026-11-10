import * as THREE from 'three';

/*
 * Connor & Victoria's little world
 * A bounded perspective Three.js boardwalk with actual 3D characters,
 * textured 3D ground, and camera pitch/yaw. The exact original storefront
 * artwork is projected onto a front-only facade; no invented building backs.
 */
const $ = (selector) => document.querySelector(selector);
const viewport = $('#viewport');
const fallback = $('#fallback');
const startButton = $('#start');
const intro = $('#intro');
const overviewButton = $('#overview');
const switchButton = $('#switch');
const hint = $('#store-hint');
const nameLabel = $('#near-name');
const enterButton = $('#enter-store');
const dialog = $('#store-dialog');
const closeDialog = $('#close-dialog');
const exploreAgain = $('#keep-exploring');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: false, powerPreference: 'high-performance'
  });
} catch (error) {
  $('#fallback-status').textContent = '3D is unavailable in this browser. You can still visit the original illustration.';
  throw error;
}
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfdfda');
scene.fog = null;
const camera = new THREE.PerspectiveCamera(54, viewport.clientWidth / viewport.clientHeight, 0.12, 200);
camera.position.set(0, 24, 39);
const target = new THREE.Vector3(0, 3.3, -8.7);
camera.lookAt(target);

scene.add(new THREE.HemisphereLight('#fff7e3', '#8c887b', 2.5));
const sun = new THREE.DirectionalLight('#fff2d5', 3.4);
sun.position.set(-19, 29, 19);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -39;
sun.shadow.camera.right = 39;
sun.shadow.camera.top = 38;
sun.shadow.camera.bottom = -38;
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.00013;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 110;
scene.add(sun);
const fill = new THREE.DirectionalLight('#c7e5ef', 1.2);
fill.position.set(13, 12, -22);
scene.add(fill);

function mat(color, roughness = 0.87, extra = {}) {
  return new THREE.MeshStandardMaterial({color, roughness, ...extra});
}
const palette = {
  cream: mat('#f8eada'), ivory: mat('#fff6e9'), earth: mat('#ccbaa6'),
  trim: mat('#f7e6d0'), terracotta: mat('#a55d52'), shadow: mat('#967c70'),
  glass: mat('#9fbbc4', 0.13, {metalness: 0.04, transparent: true, opacity: 0.72}),
  darkWood: mat('#795e54'), gold: mat('#c9a678', 0.49, {metalness: 0.2}),
  roof: mat('#a76b65')
};
function box(parent, width, height, depth, x, y, z, material, shadow = true) {
  const obj = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  obj.position.set(x, y, z);
  obj.castShadow = shadow;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}
function sphere(parent, radius, x, y, z, material, scale = [1, 1, 1], shadows = true) {
  const obj = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material);
  obj.position.set(x, y, z);
  obj.scale.set(...scale);
  obj.castShadow = shadows;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}
function cylinder(parent, top, bottom, height, x, y, z, material, sides = 12) {
  const obj = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material);
  obj.position.set(x, y, z);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}
function textTexture(lines, color = '#5c4841', paper = '#f6e8d2') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1024, 300);
  ctx.strokeStyle = '#c6aa8e';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 988, 264);
  ctx.strokeStyle = '#dbbda2';
  ctx.lineWidth = 3;
  ctx.strokeRect(35, 35, 954, 230);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (lines.length === 1) {
    ctx.font = 'bold 72px Georgia,serif';
    ctx.fillText(lines[0], 512, 155, 940);
  } else {
    ctx.font = '38px Georgia,serif';
    ctx.fillText(lines[0], 512, 105, 940);
    ctx.font = 'bold 72px Georgia,serif';
    ctx.fillText(lines[1], 512, 188, 940);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return tex;
}
function sign(parent, x, y, z, width, lines, ink = '#58463f') {
  box(parent, width + 0.20, 1.52, 0.14, x, y, z, palette.darkWood);
  const m = new THREE.MeshStandardMaterial({map: textTexture(lines, ink), roughness: 1});
  box(parent, width, 1.40, 0.022, x, y, z + 0.085, m, false);
}
function roofGable(parent, w, d, y, z, material) {
  const h = 1.65;
  const geo = new THREE.BufferGeometry();
  const x = w / 2, back = z - d / 2, front = z + d / 2;
  const v = [
    [-x,y,front], [0,y+h,front], [0,y+h,back], [-x,y,front], [0,y+h,back], [-x,y,back],
    [x,y,front], [x,y,back], [0,y+h,back], [x,y,front], [0,y+h,back], [0,y+h,front],
    [-x,y,front], [x,y,front], [0,y+h,front],
    [-x,y,back], [0,y+h,back], [x,y,back]
  ].flat();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:material,roughness:0.95,side:THREE.DoubleSide,flatShading:true}));
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  box(parent, w+0.42, 0.19, 0.22, 0, y+0.04, front+0.04, palette.trim);
}
function awning(parent, width, y, z, shade) {
  const roof = mat(shade);
  const off = mat('#fff4df');
  const count = 12;
  const seg = width / count;
  for (let i = 0; i < count; i++) {
    const stripe = box(parent, seg + 0.006, 0.13, 1.72, (i + .5) * seg - width/2, y, z, i % 2 ? off : roof);
    stripe.rotation.x = 0.09;
    box(parent, seg + .006, .35, .065, (i + .5)*seg-width/2, y-.21, z+.83, i%2 ? off : roof);
  }
  box(parent, width+.12,.09,.15,0,y+.06,z-.8,palette.darkWood);
}
function framedWindow(parent, x, y, z, w, h, frameColor, flower = false) {
  box(parent, w+.32, h+.34, .18, x,y,z,frameColor);
  box(parent, w, h, .10, x,y,z+.11,palette.glass,false);
  box(parent, .10,h,.15,x,y,z+.19,palette.ivory);
  box(parent, w,.09,.15,x,y,z+.19,palette.ivory);
  box(parent, w+.48,.15,.50,x,y-h/2-.10,z+.17,palette.trim);
  if (flower) {
    box(parent,w+.26,.27,.48,x,y-h/2-.37,z+.34,palette.terracotta);
    for (let i=0;i<5;i++){
      const xx=x-w/2+.3+i*(w-.6)/4;
      sphere(parent,.15,xx,y-h/2-.12,z+.33,mat(i%2?'#b5ab75':'#9cae91'),[1,.8,1]);
      sphere(parent,.09,xx+.03,y-h/2+.04,z+.40,mat(i%2?'#ddab9b':'#e9cfb4'));
    }
  }
}
const stores = [
  {name:"Connor's Coffee Shop", short:'Coffee shop', x:-11.3, front:-7.6, wall:'#d89495', darker:'#ab6c6f', awning:'#bf8183', roof:'#a36c64', sign:["CONNOR'S", "COFFEE SHOP"], description:"A cozy place for morning coffees, slow afternoons, and the stories worth sitting down for."},
  {name:"Connor & Victoria's Bookstore", short:'Bookstore', x:0, front:-7.6, wall:'#8ab4c6', darker:'#658a9a', awning:'#88aab1', roof:'#b5786b', sign:["CONNOR & VICTORIA'S", "BOOKSTORE"], description:"Our collection of adventures, travel journals, photographs, and the places that changed us."},
  {name:"Victoria's Hobby Shop", short:'Hobby shop', x:11.3, front:-7.6, wall:'#eee4d2', darker:'#8a9b85', awning:'#bb8e8a', roof:'#b27b69', sign:["VICTORIA'S", "HOBBY SHOP"], description:"A little home for the things we love making, collecting, and learning along the way."}
];
// The original approved illustration is the complete visible architecture.
// It is mounted on a world-space facade; the walkable boardwalk, characters,
// lights and camera are all real perspective 3D. No building backs are needed.
const clickable=[];
const sourceArt=new THREE.TextureLoader().load('./assets/storefront-scene.webp',()=>{
  fallback.classList.add('ready');
},undefined,()=>{$('#fallback-status').textContent='Could not load the original storefront artwork.'});
sourceArt.colorSpace=THREE.SRGBColorSpace;
sourceArt.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const facade=new THREE.Mesh(
 new THREE.PlaneGeometry(40,22.51),
 new THREE.MeshBasicMaterial({map:sourceArt,side:THREE.DoubleSide,depthWrite:true,toneMapped:false})
);
// The illustrated shopfronts sit directly behind the 3D boardwalk.
facade.position.set(0,10.15,-8.15);
scene.add(facade);
// Small door volumes supply collision and clicking without covering the artwork.
stores.forEach((store,i)=>{
 const door=new THREE.Mesh(
   new THREE.BoxGeometry(2.7,3.8,.24),
   new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
 );
 door.position.set(store.x,1.95,-7.86);
 door.userData.storeIndex=i;
 scene.add(door);
 clickable.push(door);
});
// Plaza: finite, walkable, stone-paved geometry.
const ground = mat('#d5c0a7');
box(scene,39,.75,27,0,-.43,4.1,ground,false);
box(scene,39,.3,1.25,0,.02,-6.3,palette.earth,false);
const pavement = ['#dbc9af','#e6d3bb','#d2bca5','#e5cfb5','#d9c3ac','#ddc7b2'].map(color => mat(color));
let seed = 42;
function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
for(let row=0;row<19;row++){
  const z = -5.95+row*.92;
  for(let col=0;col<26;col++){
    const x = -18.7+col*1.49+(row%2)*.74;
    if(x>18.5)continue;
    const stone = box(scene,1.46,.055,.88,x,-.016,z,pavement[Math.floor(random()*pavement.length)],false);
    stone.receiveShadow=true;
  }
}
// Sea, hills, and hazy coastal horizon; actual receding spatial planes.
const ocean = box(scene,190,.08,75,0,-.9,-55,mat('#94c4c5',.32),false);
ocean.receiveShadow=false;
const beach = box(scene,160,.30,12,0,-.74,-18,mat('#e8d4af'),false);
beach.receiveShadow=false;
function makePerson({name, skin, hair, clothes, pants, shoe, isDress}) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  root.userData.name=name;
  const skinMat=mat(skin),hairMat=mat(hair),outfit=mat(clothes),legsMat=mat(pants),shoeMat=mat(shoe);
  // Neck, shoulders and actual volumetric head (not a 2D SVG)
  cylinder(visual,.19,.22,.31,0,2.42,0,skinMat,16);
  sphere(visual,.55,0,1.77,0,outfit,[1,1.17,.64]);
  // Little collar and buttons
  sphere(visual,.20,0,2.19,-.32,mat(isDress?'#f5d4c0':'#e3d5b6'),[1,.3,.35]);
  for(let i=0;i<3;i++)sphere(visual,.035,0,1.91-i*.22,-.355,palette.gold,[1,1,.55],false);
  if(isDress){
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.39,.72,.90,16),outfit);
    skirt.position.set(0,1.18,0);skirt.castShadow=true;visual.add(skirt);
    box(visual,.83,.12,.60,0,1.54,0,mat('#c77a77'));
  }
  // Arms and legs articulate at shoulder / hip pivots
  const arms=[],legs=[];
  [-1,1].forEach(side=>{
    const arm=new THREE.Group();arm.position.set(side*.55,2.06,0);visual.add(arm);
    sphere(arm,.21,0,-.14,0,outfit,[.85,1.25,.82]);
    cylinder(arm,.14,.12,.62,side*.035,-.55,0,skinMat);
    sphere(arm,.14,side*.05,-.9,0,skinMat,[.86,1.2,.8]);
    arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.27,1.15,0);visual.add(leg);
    cylinder(leg,.20,.15,.83,0,-.48,0,legsMat);
    sphere(leg,.22,0,-.91,-.12,shoeMat,[1,.53,1.52]);
    legs.push(leg);
  });
  const head=new THREE.Group();head.position.set(0,2.94,0);visual.add(head);
  sphere(head,.49,0,0,0,skinMat,[.92,1.08,.86]);
  // face: forward points toward -Z
  [-.20,.20].forEach(x=>{
    sphere(head,.035,x,.03,-.404,mat('#483b36'),[.86,1,.55],false);
    sphere(head,.012,x+.012,.044,-.426,mat('#f9f3e8'),[1,1,.8],false);
  });
  sphere(head,.064,0,-.16,-.424,skinMat,[.8,1.12,.9]);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.11,.011,4,18,Math.PI),mat('#a77870'));
  smile.position.set(0,-.245,-.398);smile.rotation.z=Math.PI;head.add(smile);
  // Swept hair cap, side locks, and distinct hairstyle silhouettes
  sphere(head,.48,0,.28,.035,hairMat,[1.04,.64,.94]);
  if(isDress){
    sphere(head,.27,-.43,-.08,.12,hairMat,[.76,1.55,.95]);
    sphere(head,.27,.43,-.08,.12,hairMat,[.76,1.55,.95]);
    sphere(head,.37,0,-.31,.31,hairMat,[1.19,1.2,.88]);
    for(let j=0;j<5;j++)sphere(head,.14,-.35+j*.175,.38,-.18,hairMat,[1.2,.65,.77]);
  }else{
    sphere(head,.31,-.29,.30,-.06,hairMat,[1.1,.68,.9]);
    sphere(head,.33,.26,.27,-.04,hairMat,[1.1,.63,.9]);
    sphere(head,.22,0,.45,-.08,hairMat,[1.6,.48,.78]);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.75,24),new THREE.MeshBasicMaterial({color:'#6e5445',transparent:true,opacity:.16,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);
  scene.add(root);
  return {root,visual,arms,legs,shadow,velocityY:0,groundY:0};
}
const people = [
  makePerson({name:'Victoria',skin:'#dfb394',hair:'#59443e',clothes:'#d99590',pants:'#c8957a',shoe:'#80615c',isDress:true}),
  makePerson({name:'Connor',skin:'#d4aa8b',hair:'#665042',clothes:'#96afa0',pants:'#a79078',shoe:'#66534b',isDress:false})
];
people[0].root.position.set(.76,0,5.2);
people[1].root.position.set(-1.15,0,6.35);
people[0].root.rotation.y=0;
people[1].root.rotation.y=0;
let selected=0, started=false, overview=true, near=-1, autoWalk=null;
let cameraYaw=0.0, cameraPitch=.53, distance=10.5;
const keys=new Set(),touchKeys=new Set();
const clock=new THREE.Clock();
const tmp=new THREE.Vector3();
const desired=new THREE.Vector3();
const mouse = new THREE.Vector2();
const raycaster=new THREE.Raycaster();
let pointer=null;
function editingTarget(el){
  return el && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName) || el.isContentEditable);
}
window.addEventListener('keydown',(ev)=>{
  if(dialog.open || editingTarget(ev.target))return;
  const k=ev.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','shift'].includes(k))ev.preventDefault();
  keys.add(k);
  if(k===' ' && started && !overview && people[selected].root.position.y<.02)people[selected].velocityY=6.8;
  if(k==='e' && near>=0)openStore(near);
  if(k==='escape' && started)setOverview(!overview);
});
window.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();touchKeys.clear()});
document.querySelectorAll('[data-move]').forEach(button=>{
  const key={up:'w',down:'s',left:'a',right:'d'}[button.dataset.move];
  const stop=e=>{e.preventDefault();touchKeys.delete(key);button.classList.remove('active')};
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touchKeys.add(key);button.classList.add('active')});
  button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);
  button.addEventListener('lostpointercapture',()=>{touchKeys.delete(key);button.classList.remove('active')});
});
function isDown(k){return keys.has(k)||touchKeys.has(k)}
function setOverview(value){
  overview=value;
  if(overview)autoWalk=null;
  overviewButton.setAttribute('aria-pressed',String(overview));
  overviewButton.querySelector('span').textContent=overview?'Return to street':'View town';
  hint.hidden=true;
}
function begin(){
  started=true;
  intro.classList.add('dismissed');
  setOverview(false);
  window.setTimeout(()=>viewport.focus?.(),100);
}
startButton.addEventListener('click',begin);
overviewButton.addEventListener('click',()=>{
  if(!started)begin();
  else setOverview(!overview);
});
switchButton.addEventListener('click',()=>{
  selected=1-selected;autoWalk=null;
  switchButton.querySelector('span').textContent='Playing as '+people[selected].root.userData.name;
  if(!started)begin();
});
function openStore(index){
  if(index<0||!stores[index])return;
  if(!started)begin();
  $('#dialog-title').textContent=stores[index].name;
  $('#dialog-kicker').textContent='WELCOME TO OUR '+stores[index].short.toUpperCase();
  $('#dialog-description').textContent=stores[index].description;
  keys.clear();touchKeys.clear();dialog.showModal();
}
enterButton.addEventListener('click',()=>openStore(near));
function closeStore(){dialog.close();keys.clear();touchKeys.clear()}
closeDialog.addEventListener('click',closeStore);
exploreAgain.addEventListener('click',closeStore);
dialog.addEventListener('click',e=>{if(e.target===dialog)closeStore()});
dialog.addEventListener('close',()=>{keys.clear();touchKeys.clear()});
viewport.addEventListener('pointerdown',ev=>{
  if(ev.button!==0 && ev.pointerType==='mouse')return;
  pointer={x:ev.clientX,y:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,moved:false};
  viewport.setPointerCapture(ev.pointerId);
});
viewport.addEventListener('pointermove',ev=>{
  if(!pointer)return;
  const dx=ev.clientX-pointer.lastX,dy=ev.clientY-pointer.lastY;
  if(Math.hypot(ev.clientX-pointer.x,ev.clientY-pointer.y)>7)pointer.moved=true;
  if(pointer.moved && started && !overview && !dialog.open){
    cameraYaw=THREE.MathUtils.clamp(cameraYaw-dx*.0035,-.42,.42);
    cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.004,.10,1.26);
  }
  pointer.lastX=ev.clientX;pointer.lastY=ev.clientY;
});
viewport.addEventListener('pointerup',ev=>{
  if(!pointer)return;
  const wasClick=!pointer.moved;pointer=null;
  if(!wasClick || dialog.open)return;
  const bounds=renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX-bounds.left)/bounds.width)*2-1,-((ev.clientY-bounds.top)/bounds.height)*2+1);
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(clickable,false);
  if(hits.length){const i=hits[0].object.userData.storeIndex;if(Number.isInteger(i))openStore(i)}
});
viewport.addEventListener('pointercancel',()=>{pointer=null});
viewport.addEventListener('wheel',ev=>{
  if(overview||dialog.open)return;
  ev.preventDefault();distance=THREE.MathUtils.clamp(distance+Math.sign(ev.deltaY)*.85,5.7,18);
},{passive:false});
function applyLocomotion(person,moving,t,dt){
  const swing=moving?Math.sin(t*10)*.52:0;
  person.legs[0].rotation.x=THREE.MathUtils.damp(person.legs[0].rotation.x,swing,12,dt);
  person.legs[1].rotation.x=THREE.MathUtils.damp(person.legs[1].rotation.x,-swing,12,dt);
  person.arms[0].rotation.x=THREE.MathUtils.damp(person.arms[0].rotation.x,-swing*.58,12,dt);
  person.arms[1].rotation.x=THREE.MathUtils.damp(person.arms[1].rotation.x,swing*.58,12,dt);
  person.visual.position.y=moving?Math.abs(Math.sin(t*10))*.055:Math.sin(t*1.5)*.012;
  person.root.position.y+=person.velocityY*dt;
  person.velocityY-=18*dt;
  if(person.root.position.y<0){person.root.position.y=0;person.velocityY=0}
  person.shadow.material.opacity=person.root.position.y>0?.10:.16;
}
function updateMovement(dt,t){
  const player=people[selected],buddy=people[1-selected];
  let x=0,z=0;
  const forward=(isDown('w')||isDown('arrowup')?1:0)-(isDown('s')||isDown('arrowdown')?1:0);
  const sideways=(isDown('d')||isDown('arrowright')?1:0)-(isDown('a')||isDown('arrowleft')?1:0);
  if(forward||sideways)autoWalk=null;
  x=(Math.sin(cameraYaw)*forward+Math.cos(cameraYaw)*sideways);
  z=(-Math.cos(cameraYaw)*forward+Math.sin(cameraYaw)*sideways);
  let moving=false;
  if((x!==0||z!==0)&&!overview&&!dialog.open){
    const length=Math.hypot(x,z);
    x/=length;z/=length;
    const speed=isDown('shift')?7.8:5.1;
    player.root.position.x=THREE.MathUtils.clamp(player.root.position.x+x*speed*dt,-17.15,17.15);
    player.root.position.z=THREE.MathUtils.clamp(player.root.position.z+z*speed*dt,-5.65,10.2);
    const angle=Math.atan2(-x,-z);
    let diff=Math.atan2(Math.sin(angle-player.root.rotation.y),Math.cos(angle-player.root.rotation.y));
    player.root.rotation.y+=diff*Math.min(1,dt*13);
    moving=true;
  }
  applyLocomotion(player,moving,t,dt);
  // Companion trails behind the selected character and turns naturally.
  const offsetX=selected===0?-1.30:1.30;
  const buddyX=THREE.MathUtils.clamp(player.root.position.x+offsetX,-17,17);
  const buddyZ=THREE.MathUtils.clamp(player.root.position.z+1.10,-5.55,10.1);
  const bdx=buddyX-buddy.root.position.x,bdz=buddyZ-buddy.root.position.z;
  const follow=Math.hypot(bdx,bdz)>0.45;
  if(follow&&!dialog.open){
    const speed=Math.min(5.7,Math.hypot(bdx,bdz)*2.9);
    buddy.root.position.x+=bdx/Math.hypot(bdx,bdz)*speed*dt;
    buddy.root.position.z+=bdz/Math.hypot(bdx,bdz)*speed*dt;
    const angle=Math.atan2(-bdx,-bdz);
    const delta=Math.atan2(Math.sin(angle-buddy.root.rotation.y),Math.cos(angle-buddy.root.rotation.y));
    buddy.root.rotation.y+=delta*Math.min(1,dt*8);
  }
  applyLocomotion(buddy,follow&&!dialog.open,t,dt);
  near=-1;
  for(let i=0;i<stores.length;i++){
    const st=stores[i];
    if(Math.abs(player.root.position.x-st.x)<2.8 && player.root.position.z< -3.5){
      near=i;break;
    }
  }
  hint.hidden=near<0||overview||dialog.open||!started;
  if(near>=0)nameLabel.textContent=stores[near].name;
}
function updateCamera(dt){
  const mobile=viewport.clientWidth<730;
  const focus=people[selected].root.position;
  camera.fov=mobile?64:54;
  camera.aspect=viewport.clientWidth/viewport.clientHeight;
  camera.updateProjectionMatrix();
  const desiredPos = new THREE.Vector3();
  const aim=new THREE.Vector3();
  if(overview||!started){
    desiredPos.set(0,mobile?31:20.7,mobile?54:35);
    aim.set(0,3.6,-8.6);
  }else{
    const dist=distance*(mobile?1.15:1);
    desiredPos.set(focus.x+Math.sin(cameraYaw)*dist,focus.y+2.1+Math.sin(cameraPitch)*dist*.63,focus.z+Math.cos(cameraYaw)*dist);
    aim.set(focus.x,focus.y+1.5,focus.z-Math.cos(cameraYaw)*1.6);
  }
  const alpha=1-Math.exp(-dt*(started?3.2:2.2));
  camera.position.lerp(desiredPos,alpha);
  target.lerp(aim,alpha);
  camera.lookAt(target);
}
let frame=0;
function tick(){
  const dt=Math.min(clock.getDelta(),.045);
  const t=clock.elapsedTime;
  if(started && !dialog.open)updateMovement(dt,t);
  updateCamera(dt);
  renderer.render(scene,camera);
  frame++;
}
renderer.setAnimationLoop(tick);
function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight;
  renderer.setSize(w,h);
  camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
setOverview(true);
