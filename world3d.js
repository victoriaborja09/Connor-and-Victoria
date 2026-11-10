import * as THREE from 'three';

/* Illustration-first boardwalk. The approved source art is used unchanged.
 * Only the avatars are WebGL 3D. The camera pans a finite 2D composition,
 * keeping the buildings and the mountains exactly as illustrated. */
const $ = selector => document.querySelector(selector);
const viewport=$('#viewport'), fallback=$('#fallback'),intro=$('#intro');
const overviewButton=$('#overview'),switchButton=$('#switch');
const hint=$('#store-hint'),nameLabel=$('#near-name');
const dialog=$('#store-dialog');
const W=1672,H=941;
const stores=[
 {name:"Connor's Coffee Shop",x:399,description:"A cozy place for morning coffees, slow afternoons, and the stories worth sitting down for."},
 {name:"Connor & Victoria's Bookstore",x:880,description:"Our collection of adventures, travel journals, photographs, and the places that changed us."},
 {name:"Victoria's Hobby Shop",x:1393,description:"A little home for the things we love making, collecting, and learning along the way."}
];
const world=document.createElement('div');
world.className='art-world';
world.setAttribute('aria-label','Original illustrated seaside town');
const art=document.createElement('img');
art.src='./assets/storefront-scene.webp';
art.alt='Original coastal street illustration with the coffee shop, bookstore, and hobby shop';
art.draggable=false;
art.className='original-art';
world.appendChild(art);
viewport.appendChild(world);
const avatarLayer=document.createElement('div');
avatarLayer.className='avatar-layer';
world.appendChild(avatarLayer);
let renderer;
try{
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setSize(W,H,false);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.55;
 avatarLayer.appendChild(renderer.domElement);
}catch(error){
 $('#fallback-status').textContent='Your browser could not start 3D. The original town remains available.';
 throw error;
}
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(0,W,H,0,.1,2000);
camera.position.set(W/2,H/2,1400);
camera.lookAt(W/2,H/2,0);
scene.add(new THREE.HemisphereLight('#fff7e6','#98786a',2.9));
const sun=new THREE.DirectionalLight('#fff1d8',3.2);
sun.position.set(260,900,700);scene.add(sun);
const mat=(color,roughness=.87)=>new THREE.MeshStandardMaterial({color,roughness});
const palette={gold:mat('#c9a678')};
function sphere(parent,r,x,y,z,material,scale=[1,1,1]){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),material);
 mesh.position.set(x,y,z);mesh.scale.set(...scale);parent.add(mesh);return mesh;
}
function cylinder(parent,top,bottom,height,x,y,z,material,sides=12){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,sides),material);
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function box(parent,w,h,d,x,y,z,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
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

const characters=[
 makePerson({name:'Victoria',skin:'#dfb394',hair:'#59443e',clothes:'#d99590',pants:'#c8957a',shoe:'#80615c',isDress:true}),
 makePerson({name:'Connor',skin:'#d4aa8b',hair:'#665042',clothes:'#96afa0',pants:'#a79078',shoe:'#66534b',isDress:false})
];
const feetY=87;
characters.forEach((c,i)=>{
 c.root.scale.setScalar(i===0?38:40);
 c.root.position.set(i===0?836:758,feetY,40);
 c.root.rotation.y=Math.PI;
 c.shadow.visible=false;
});
let selected=0,started=false,overview=true,near=-1;
let position=836,follow=758,offsetX=0,offsetY=0,scale=1;
const pressed=new Set(),touchPressed=new Set();
const clock=new THREE.Clock();
const minX=195,maxX=1515;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function setOverview(next){
 overview=next;
 overviewButton.setAttribute('aria-pressed',String(next));
 overviewButton.querySelector('span').textContent=next?'Return to street':'View town';
 updateLayout();
}
function start(){
 if(!started){started=true;intro.classList.add('dismissed');}
 setOverview(false);
}
$('#start').addEventListener('click',start);
overviewButton.addEventListener('click',()=>{if(!started)start();else setOverview(!overview)});
switchButton.addEventListener('click',()=>{
 selected=1-selected;
 position=characters[selected].root.position.x;
 follow=characters[1-selected].root.position.x;
 switchButton.querySelector('span').textContent='Playing as '+characters[selected].root.userData.name;
 if(!started)start();
 updateLayout();
});
function updateLayout(){
 const width=viewport.clientWidth||innerWidth,height=viewport.clientHeight||innerHeight;
 const fit=Math.min(width/W,height/H);
 const cover=Math.max(width/W,height/H);
 // Overview shows all three stores; close view zooms to the boardwalk.
 scale=overview?fit:Math.max(cover,fit*1.85);
 const desiredX=overview?(width-W*scale)/2:width*.5-position*scale;
 const desiredY=overview?(height-H*scale)/2:height*.80-110*scale;
 const maxLeft=Math.min(0,width-W*scale),maxTop=Math.min(0,height-H*scale);
 offsetX=W*scale<=width?(width-W*scale)/2:clamp(desiredX,maxLeft,0);
 offsetY=H*scale<=height?(height-H*scale)/2:clamp(desiredY,maxTop,0);
 world.style.transform=`translate3d(${offsetX}px,${offsetY}px,0) scale(${scale})`;
}
function showStore(i){
 if(i<0)return;
 const st=stores[i];
 $('#dialog-title').textContent=st.name;
 $('#dialog-kicker').textContent='WELCOME INSIDE';
 $('#dialog-description').textContent=st.description;
 pressed.clear();touchPressed.clear();
 dialog.showModal();
}
$('#enter-store').addEventListener('click',()=>showStore(near));
$('#close-dialog').addEventListener('click',()=>dialog.close());
$('#keep-exploring').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function isTyping(target){return target&&(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)||target.isContentEditable)}
window.addEventListener('keydown',e=>{
 if(dialog.open||isTyping(e.target))return;
 const k=e.key.toLowerCase();
 if(['arrowleft','arrowright','a','d','w','s','e',' ','escape'].includes(k))e.preventDefault();
 pressed.add(k);
 if(k==='e'&&near>=0)showStore(near);
 if(k==='escape'&&started)setOverview(!overview);
 if((k==='arrowleft'||k==='arrowright'||k==='a'||k==='d')&&!started)start();
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{pressed.clear();touchPressed.clear()});
document.querySelectorAll('[data-move]').forEach(button=>{
 const key={left:'a',right:'d',up:'d',down:'a'}[button.dataset.move];
 button.addEventListener('pointerdown',e=>{
  e.preventDefault();button.setPointerCapture(e.pointerId);touchPressed.add(key);button.classList.add('active');
  if(!started)start();
 });
 const stop=e=>{e.preventDefault();touchPressed.delete(key);button.classList.remove('active')};
 button.addEventListener('pointerup',stop);
 button.addEventListener('pointercancel',stop);
 button.addEventListener('lostpointercapture',()=>{touchPressed.delete(key);button.classList.remove('active')});
});
function down(k){return pressed.has(k)||touchPressed.has(k)}
function animatePerson(person,moving,time,dt){
 const swing=moving?Math.sin(time*10)*.45:0;
 person.legs[0].rotation.x=THREE.MathUtils.damp(person.legs[0].rotation.x,swing,12,dt);
 person.legs[1].rotation.x=THREE.MathUtils.damp(person.legs[1].rotation.x,-swing,12,dt);
 person.arms[0].rotation.x=THREE.MathUtils.damp(person.arms[0].rotation.x,-swing*.55,12,dt);
 person.arms[1].rotation.x=THREE.MathUtils.damp(person.arms[1].rotation.x,swing*.55,12,dt);
 person.visual.position.y=moving?Math.abs(Math.sin(time*10))*.035:Math.sin(time*1.5)*.009;
}
function animate(){
 const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
 const direction=(down('d')||down('arrowright')?1:0)-(down('a')||down('arrowleft')?1:0);
 const moving=started&&!overview&&!dialog.open&&direction!==0;
 if(moving)position=clamp(position+direction*260*dt,minX,maxX);
 const lead=characters[selected],buddy=characters[1-selected];
 lead.root.position.x=position;
 if(moving){
  const turn=direction>0?Math.PI/2:-Math.PI/2;
  lead.root.rotation.y=THREE.MathUtils.damp(lead.root.rotation.y,turn,9,dt);
 }else{
  lead.root.rotation.y=THREE.MathUtils.damp(lead.root.rotation.y,Math.PI,4,dt);
 }
 const desiredBuddy=clamp(position+(selected===0?-65:65),minX,maxX);
 const companionMoving=Math.abs(desiredBuddy-follow)>5;
 follow=THREE.MathUtils.damp(follow,desiredBuddy,3.2,dt);
 buddy.root.position.x=follow;
 buddy.root.rotation.y=THREE.MathUtils.damp(buddy.root.rotation.y,companionMoving?(desiredBuddy>follow?Math.PI/2:-Math.PI/2):Math.PI,5,dt);
 animatePerson(lead,moving,time,dt);
 animatePerson(buddy,companionMoving,time,dt);
 near=-1;
 if(started&&!overview){
  stores.forEach((st,i)=>{if(Math.abs(position-st.x)<100)near=i});
 }
 hint.hidden=near<0||overview||dialog.open||!started;
 if(near>=0)nameLabel.textContent=stores[near].name;
 if(moving)updateLayout();
 renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize',updateLayout);
art.addEventListener('load',()=>{fallback.classList.add('ready');updateLayout()});
art.addEventListener('error',()=>{$('#fallback-status').textContent='The original town illustration could not load.'});
const hotspots=stores.map((st,i)=>{
 const b=document.createElement('button');
 b.type='button';b.className='art-hotspot';
 b.style.left=(st.x-175)+'px';b.style.top='230px';
 b.style.width='350px';b.style.height='600px';
 b.setAttribute('aria-label','Explore '+st.name);
 b.title=st.name;
 b.addEventListener('click',()=>{if(!started)start();position=st.x;showStore(i)});
 world.appendChild(b);return b;
});
function syncHotspots(){hotspots.forEach(b=>{b.hidden=!overview;b.tabIndex=overview?0:-1})}
const originalSetOverview=setOverview;
setOverview=next=>{originalSetOverview(next);syncHotspots()};
setOverview(true);
