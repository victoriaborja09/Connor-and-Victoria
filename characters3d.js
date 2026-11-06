/*
 * CONNOR + VICTORIA  — original procedural 3D character models.
 * Pure WebGL 1: no image planes, cutouts, SVG people, model API or paid assets.
 * Meshes are genuine 3D geometry; head/shoulder/elbow/hip joints animated each frame.
 * Coordinate system +Z is forward; units are arbitrary meters.
 * MIT-style free use for Connor & Victoria site.
 */
(function(){
'use strict';
const TAU=Math.PI*2,PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function mat(){return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]}
function mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[r+c*4]=a[r]*b[c*4]+a[r+4]*b[c*4+1]+a[r+8]*b[c*4+2]+a[r+12]*b[c*4+3];return o}
function move(x=0,y=0,z=0){const m=mat();m[12]=x;m[13]=y;m[14]=z;return m}
function scale(x=1,y=1,z=1){const m=mat();m[0]=x;m[5]=y;m[10]=z;return m}
function rotY(a){let c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]}
function rotX(a){let c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]}
function rotZ(a){let c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0, 0,0,1,0, 0,0,0,1]}
function tr(parent,x=0,y=0,z=0){return mul(parent,move(x,y,z))}
function rx(parent,a){return mul(parent,rotX(a))}
function ry(parent,a){return mul(parent,rotY(a))}
function rz(parent,a){return mul(parent,rotZ(a))}
function sx(parent,x,y,z){return mul(parent,scale(x,y,z))}
function perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]}
function ortho(l,r,b,t,n,f){return [2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]}
function lookAt(eye,target){let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2],zlen=Math.hypot(zx,zy,zz);zx/=zlen;zy/=zlen;zz/=zlen;
let xx=zz,xy=0,xz=-zx, xl=Math.hypot(xx,xz);xx/=xl;xz/=xl;
let yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
return [xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0, -(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]}
function rgb(h){let v=h.replace('#','');return [parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255]}
function shader(gl,type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function mesh(vertices,indices){return {verts:new Float32Array(vertices),idx:new Uint16Array(indices)}}
const shapes={};
const SHAPE_MEMO = new Map();
function ball(u=20,v=14){let p=[],i=[];for(let j=0;j<=v;j++){const th=PI*j/v;for(let k=0;k<=u;k++){const ph=TAU*k/u,ny=Math.cos(th),nx=Math.sin(th)*Math.cos(ph),nz=Math.sin(th)*Math.sin(ph);p.push(nx,ny,nz,nx,ny,nz)}}for(let j=0;j<v;j++)for(let k=0;k<u;k++){let a=j*(u+1)+k,b=a+u+1;i.push(a,b,a+1,b,b+1,a+1)}return mesh(p,i)}
// Smoothly deformable multi-ring elliptical cross-section mesh: modeled limbs, pants, shirt, shoes.
function loft(profiles,segments=18,pow=1){const memoKey='L'+JSON.stringify([profiles,segments,pow]);if(SHAPE_MEMO.has(memoKey))return SHAPE_MEMO.get(memoKey);let p=[],i=[];for(let j=0;j<profiles.length;j++){
const [y,cx,cz,radx,radz]=profiles[j];for(let k=0;k<=segments;k++){
const a=TAU*k/segments,co=Math.cos(a),si=Math.sin(a);
const nx=Math.sign(co)*Math.pow(Math.abs(co),pow),nz=Math.sign(si)*Math.pow(Math.abs(si),pow);
const x=cx+radx*nx,z=cz+radz*nz;
// Calculate normals via neighboring rings (small contribution from slope)
const prev=profiles[Math.max(0,j-1)],next=profiles[Math.min(profiles.length-1,j+1)];
const dy=Math.max(.001,next[0]-prev[0]);const slopeX=(next[1]-prev[1]+nx*(next[3]-prev[3]))/dy,slopeZ=(next[2]-prev[2]+nz*(next[4]-prev[4]))/dy;
let nnx=co/Math.max(radx,.01),nnz=si/Math.max(radz,.01),nny=-(nnx*slopeX+nnz*slopeZ),nnl=Math.hypot(nnx,nny,nnz);
p.push(x,y,z,nnx/nnl,nny/nnl,nnz/nnl)}}
for(let j=0;j<profiles.length-1;j++)for(let k=0;k<segments;k++){let a=j*(segments+1)+k,b=a+segments+1;i.push(a,a+1,b,a+1,b+1,b)}
// small closed ends
for(let q of [0,profiles.length-1]){let [y,x,z]=profiles[q],n=q===0?-1:1,center=p.length/6;p.push(x,y,z,0,n,0);for(let k=0;k<segments;k++){let a=q*(segments+1)+k,b=a+1;if(q===0)i.push(center,b,a);else i.push(center,a,b)}}
let g=mesh(p,i);SHAPE_MEMO.set(memoKey,g);return g}
function strand(points,radii,sides=8){const memoKey='S'+JSON.stringify([points,radii,sides]);if(SHAPE_MEMO.has(memoKey))return SHAPE_MEMO.get(memoKey);let p=[],inds=[];for(let j=0;j<points.length;j++){let [x,y,z]=points[j];const prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+1)];let dx=next[0]-prev[0],dy=next[1]-prev[1],dz=next[2]-prev[2],dl=Math.hypot(dx,dy,dz)||1;dx/=dl;dy/=dl;dz/=dl;
let tx=dz,tz=-dx,tl=Math.hypot(tx,tz);if(tl<.001){tx=1;tz=0}else{tx/=tl;tz/=tl}
let ux=dy*tz,uy=dz*tx-dx*tz,uz=-dy*tx;
for(let k=0;k<=sides;k++){let a=TAU*k/sides,c=Math.cos(a),s=Math.sin(a),nx=c*tx+s*ux,ny=s*uy,nz=c*tz+s*uz;let rr=radii[j];p.push(x+nx*rr,y+ny*rr,z+nz*rr,nx,ny,nz)}}
for(let j=0;j<points.length-1;j++)for(let k=0;k<sides;k++){let a=j*(sides+1)+k,b=a+sides+1;inds.push(a,b,a+1,b,b+1,a+1)}let g=mesh(p,inds);SHAPE_MEMO.set(memoKey,g);return g}
function line3(a,b,r=.015,segments=7){let points=[];for(let i=0;i<5;i++){const t=i/4;points.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])}return strand(points,points.map(()=>r),segments)}
function loop(points,r=.017){let all=points.concat([points[0]]);return strand(all,all.map(()=>r),6)}
const skinM={connor:rgb('#D7A17D'),victoria:rgb('#D0A081')};
const colors={shirt:rgb('#F4F0E8'),navy:rgb('#263252'),navyLight:rgb('#344268'),denim:rgb('#91A9BB'),denimShadow:rgb('#718EA4'),brown:rgb('#5F4534'),brownLight:rgb('#795740'),cream:rgb('#ECE8DB'),sole:rgb('#CDB48B'),green:rgb('#285E4D'), sneakerBrown:rgb('#6F4832'),metal:rgb('#C9A050'),gloss:rgb('#FCFAF1'),eye:rgb('#32251F'),hairC:rgb('#493025'),hairClight:rgb('#78513A'),hairV:rgb('#35231D'),hairVlight:rgb('#604037'),black:rgb('#171923'),brownGlass:rgb('#673E2C'),blush:rgb('#BC8475'),lip:rgb('#85554E')};
class Tiny3D{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:true})||canvas.getContext('experimental-webgl');if(!gl)throw new Error('WebGL unavailable');this.gl=gl;this.program=gl.createProgram();gl.attachShader(this.program,shader(gl,gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 n;uniform mat4 model;uniform mat4 viewProj;varying vec3 vNorm;varying vec3 vPos;void main(){vec4 wp=model*vec4(p,1.0);vPos=wp.xyz;vNorm=mat3(model)*n;gl_Position=viewProj*wp;}`));gl.attachShader(this.program,shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vNorm;varying vec3 vPos;uniform vec3 color;uniform float alpha;void main(){vec3 n=normalize(vNorm);vec3 key=normalize(vec3(-0.48,0.82,0.75));vec3 fill=normalize(vec3(0.7,0.3,-0.4));float diffuse=max(0.,dot(n,key));float rim=pow(1.-max(0.,dot(n,normalize(vec3(0.,0.2,1.)))),2.5);float lum=.64+.3*diffuse+.06*max(0.,dot(n,fill));vec3 finalColor=color*lum+vec3(.055,.046,.039)*rim;gl_FragColor=vec4(finalColor,alpha);}`));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
this.attrs={p:gl.getAttribLocation(this.program,'p'),n:gl.getAttribLocation(this.program,'n')};this.uniforms={m:gl.getUniformLocation(this.program,'model'),vp:gl.getUniformLocation(this.program,'viewProj'),c:gl.getUniformLocation(this.program,'color'),a:gl.getUniformLocation(this.program,'alpha')};
this.cache=new Map();this.draws=[];this.view=mat();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enableVertexAttribArray(this.attrs.p);gl.enableVertexAttribArray(this.attrs.n);this.ball=ball()}
 upload(shape){if(this.cache.has(shape))return this.cache.get(shape);let gl=this.gl,buffer=gl.createBuffer(),indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,shape.verts,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,shape.idx,gl.STATIC_DRAW);let item={buffer,indices,count:shape.idx.length};this.cache.set(shape,item);return item}
 draw(shape,m,color,alpha=1){this.draws.push({shape,m,color,alpha})}
 ell(m,x,y,z,wx,hy,dz,color){this.draw(this.ball,sx(tr(m,x,y,z),wx,hy,dz),color)}
 seg(m,points,rad,color){this.draw(strand(points,points.map(()=>rad),7),m,color)}
 arc(m,points,rad,color){this.draw(strand(points,points.map(()=>rad),7),m,color)}
 render(w,h,mode){let gl=this.gl,dpr=Math.min(devicePixelRatio||1,2);let ww=Math.round(w*dpr),hh=Math.round(h*dpr);if(this.canvas.width!==ww||this.canvas.height!==hh){this.canvas.width=ww;this.canvas.height=hh}gl.viewport(0,0,ww,hh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.draws.sort((a,b)=>b.alpha-a.alpha);
let aspect=w/h,half=mode==='studio'?2.10:2.18,pr=ortho(-half*aspect,half*aspect,-half,half,.1,80);
let vp=mul(pr,this.view);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniforms.vp,false,new Float32Array(vp));for(const call of this.draws){let obj=this.upload(call.shape);gl.bindBuffer(gl.ARRAY_BUFFER,obj.buffer);gl.vertexAttribPointer(this.attrs.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.attrs.n,3,gl.FLOAT,false,24,12);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,obj.indices);gl.uniformMatrix4fv(this.uniforms.m,false,new Float32Array(call.m));gl.uniform3fv(this.uniforms.c,new Float32Array(call.color));gl.uniform1f(this.uniforms.a,call.alpha);gl.drawElements(gl.TRIANGLES,obj.count,gl.UNSIGNED_SHORT,0)}this.draws=[]}
}
// All geometry is modeled programmatically in 3D. Nothing in the screenshots is used as a texture.
function actor(renderer,type){const isV=type==='victoria',skin=skinM[type],hair=isV?colors.hairV:colors.hairC,denim=isV?colors.denim:colors.brown;
const H=isV?3.24:3.44,legLength=isV?1.39:1.47,baseHip=isV?1.44:1.53,neck=isV?2.47:2.58,headY=isV?2.87:2.98;
const armY=isV?2.29:2.39,root={x:isV?.46:-.53, z:0, yaw:isV?-.09:.08};let state={action:'idle',started:0,duration:0,walking:false,enter:false,disappear:0};
function hairTufts(head){let seed=9;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
if(!isV){renderer.ell(head,0,.29,-.04,.374,.26,.35,hair);
// Curled wavy hair along crown in dense irregular bunches
for(let j=0;j<8;j++)for(let k=0;k<11;k++){
const u=(k-5)/5.6,v=(j-3.2)/4.9;if(u*u+v*v>1.25)continue;
let x=.34*u+(rand()-.5)*.043,z=.30*v+(rand()-.5)*.04-.008;let y=.31+.10*Math.sqrt(Math.max(0,1-u*u*.55-v*v*.55));let tipx=x+(.025+.025*rand())*Math.sign(u||1),tipz=z+.075*(rand()-.4),tipy=y+.065+rand()*.057;
renderer.draw(strand([[x-.02,y-.058,z],[x,y,z],[x+.01,tipy,tipz],[tipx,tipy-.01,tipz+.025]],[.067,.072,.046,.004],7),head,j%3===0?colors.hairClight:hair)}
// shaggy front fringe
for(let k=0;k<8;k++){let x=-.29+k*.083;renderer.draw(strand([[x,.34,.19],[x+.018,.28,.30],[x+.02,.19+Math.sin(k*2)*.034,.34]],[.08,.067,.006],8),head,k%3===0?colors.hairClight:hair)}
}else{
renderer.ell(head,0,.16,-.135,.40,.45,.31,hair);
// Real volumetric locks run from crown, behind shoulders and down to chest.
for(let k=0;k<22;k++){
const side=k<11?-1:1,idx=k%11,u=idx/10;
const x=side*(.22+.17*u),z=-.16+(.085*(idx%3));
const topY=.36-.045*u,bottom=-.68-.10*(idx%4)/4;
let points=[[x*.55,.39,z],[x,.21,z+(.06*u)],[x+side*.05,-.04,z],[x+side*.09,-.30,z+(.01*u)],[x+side*.055,-.52,z+.035],[x+side*.08,bottom,z+.05]];
let radii=[.065,.092,.095,.100,.09,.004];renderer.draw(strand(points,radii,8),head,idx%3===0?colors.hairVlight:hair)}
// fine center part and front face-framing waves
for(let s of [-1,1])for(let k=0;k<4;k++){
let x=s*(.075+k*.047);let points=[[x*.62,.41,.02],[x,.29,.21],[s*(.22+k*.035),.13,.30],[s*(.36+k*.02),-.09,.23],[s*(.34+k*.023),-.32,.25],[s*(.37+k*.02),-.57,.26]];
renderer.draw(strand(points,[.055,.065,.071,.075,.067,.004],9),head,k%2===0?colors.hairVlight:hair)} }
}
function shoe(m,side,yaw,wave){let base=tr(m,0,.15,.12);renderer.ell(base,0,-.07,.04,.235,.095,.41,colors.sole);renderer.ell(base,0,.0,.025,.219,.15,.37,isV?colors.green:colors.sneakerBrown);
// white Adidas-style three diagonal stripes on outer side of each shoe
for(let k=0;k<3;k++){let z=-.05+k*.105;let pts=[[side*.205,.055,z-.04],[side*.221,.082,z],[side*.194,.09,z+.045]];renderer.arc(base,pts,.024,colors.cream)}
renderer.arc(base,[[-.19,-.02,.15],[-.11,.01,.31],[0,.01,.38],[.11,.01,.31],[.19,-.02,.15]],.023,colors.cream);
for(let k=0;k<3;k++){let z=.09+k*.065;renderer.seg(base,[[-.065,.135,z],[.065,.135,z]],.013,colors.cream)} }
function pantLeg(legM,side,phase){const w=isV?.27:.28,crease=0;
const p=[ [.23,side*.017,-.018,w*.92,.20],[.35,0,0,w*1.06,.225],[.49,-.022,.013,w*1.03,.21],[.72,.013,-.008,w*.99,.20],[.94,-.02,0,w*.90,.19],[1.18,.003,-.02,w*.96,.20],[1.45,0,0,w*.95,.22]].map(q=>[q[0]-1.48,q[1]+crease,q[2],q[3],q[4]]);
renderer.draw(loft(p,20,.79),legM,denim);
// folds (very thin colored geometry, not stacked collars)
for(const yy of [-1.09,-.98,-.61,-.31]){
const points=[];for(let k=0;k<7;k++){const a=PI*(.15+k*.095);points.push([Math.cos(a)*w*.94,yy+.015*Math.sin(a*4+side),Math.sin(a)*.198])}
renderer.arc(legM,points,.008,isV?colors.denimShadow:colors.brownLight)}
// side seam
renderer.arc(legM,[[side*w*.94,-1.17,.015],[side*w*.95,-.92,.02],[side*w*.87,-.56,0],[side*w*.91,-.24,.005]],.009,isV?colors.denimShadow:colors.brownLight)
}
function body(m,tm){const top=isV?colors.navy:colors.shirt;
const torso=[ [1.37,0,0,.41,.20],[1.48,0,.01,.435,.205],[1.61,0,.015,.42,.22],[1.82,0,.01,.39,.20],[2.04,0,.0,.46,.225],[2.26,0,.005,.51,.245],[2.40,0,.005,.36,.21]];
renderer.draw(loft(torso,24,.76),m,top);
// shirt bottom hem, elbow cuffs, collar ring
const hem=[];for(let k=0;k<=20;k++){let a=TAU*k/20;hem.push([.423*Math.cos(a),1.46,.211*Math.sin(a)])}
renderer.arc(m,hem,.013,isV?colors.navyLight:colors.cream);
const neckRing=[];for(let k=0;k<=18;k++){let a=TAU*k/18;neckRing.push([.21*Math.cos(a),2.4,.175*Math.sin(a)])}
renderer.arc(m,neckRing,.019,isV?colors.navyLight:colors.cream);
if(isV){ // subtle gold pendant necklace
renderer.arc(m,[[-.15,2.39,.215],[-.09,2.27,.254],[0,2.22,.25],[.09,2.27,.254],[.15,2.39,.215]],.008,colors.metal);
renderer.ell(m,0,2.19,.263,.034,.044,.014,colors.metal)
}
// Waistband and pocket details
renderer.ell(m,0,1.42,.01,.438,.13,.222,denim);
for(let s of [-1,1]){renderer.arc(m,[[s*.115,1.46,.219],[s*.23,1.36,.222],[s*.31,1.32,.18]],.012,isV?colors.denimShadow:colors.brownLight)}
renderer.ell(m,0,1.42,.225,.036,.037,.015,colors.metal)
}
function face(m){const head=tr(m,0,headY,0),headLocal=rx(head,.045);renderer.ell(headLocal,0,0,0,.368,.427,.326,skin);
// ears
for(let s of [-1,1])renderer.ell(headLocal,s*.365,-.035,-.02,.068,.117,.075,skin);
// eyes individually sculpted white sclera / irises / lids; all in 3D
for(let s of [-1,1]){
renderer.ell(headLocal,s*.151,.025,.294,.090,.075,.046,colors.gloss);
renderer.ell(headLocal,s*.152,.026,.329,.031,.045,.014,colors.eye);
renderer.ell(headLocal,s*.142,.050,.342,.011,.012,.007,colors.gloss);
renderer.arc(headLocal,[[s*.058,.152,.31],[s*.119,.178,.315],[s*.197,.163,.298],[s*.251,.140,.270]],.020,hair);
renderer.ell(headLocal,s*.23,-.115,.295,.075,.045,.008,colors.blush)
}
// small stylized nose and curved smile
renderer.ell(headLocal,0,-.105,.345,.045,.057,.041,skin);
renderer.arc(headLocal,[[-.100,-.210,.307],[-.044,-.240,.327],[.018,-.243,.324],[.079,-.218,.309]],.013,colors.lip);
// tiny beard on Connor (not full puffy mask)
if(!isV){for(let j=0;j<12;j++){let a=(j/11)*PI*.84+PI*.08;let x=.195*Math.cos(a),y=-.225-.14*Math.sin(a);renderer.ell(headLocal,x,y,.274,.013,.010,.005,colors.brownLight)}}
// rectangular fashion glasses, two complete curved 3D frames + bar + side arms
let frame=isV?colors.brownGlass:colors.black;
for(let s of [-1,1]){
const X=s*.153,cy=.047,z=.36;let pts=[];for(let k=0;k<33;k++){let a=TAU*k/32;let co=Math.cos(a),si=Math.sin(a),shx=Math.sign(co)*Math.pow(Math.abs(co),.72),shy=Math.sign(si)*Math.pow(Math.abs(si),.80);pts.push([X+shx*.137,cy+shy*.116,z-.019*Math.abs(co)])}
renderer.draw(loop(pts,isV?.017:.021),headLocal,frame);
renderer.seg(headLocal,[[s*.277,.070,.318],[s*.358,.072,.17]],.020,frame)
}
renderer.arc(headLocal,[[-.012,.075,.367],[0,.086,.371],[.012,.075,.367]],.023,frame);
hairTufts(headLocal);
return headLocal}
function hand(rm){renderer.ell(rm,0,-.055,.0,.119,.144,.094,skin);
// tiny thumb visible on each hand
renderer.ell(rm,-.075,-.11,.06,.040,.080,.046,skin)}
function arm(m,side,angle,wavePhase){const pivot=tr(m,side*.49,2.30,0),ra=rz(pivot,side*angle),ra2=rx(ra,.035);
const cloth=isV?colors.navy:colors.shirt;
renderer.draw(loft([[-.47,side*.035,0,.140,.14],[-.26,side*.025,0,.177,.17],[0,0,0,.185,.18]],16,.84),ra2,cloth);
const elbow=tr(ra2,side*.035,-.47,0);let e=rx(elbow,wavePhase),e2=rz(e,side*.07);
if(isV){renderer.draw(loft([[-.33,0,0,.127,.13],[-.15,0,0,.143,.14],[.02,0,0,.147,.145]],16,.88),e2,cloth);
renderer.arc(e2,[[-.125,-.3,0],[-.10,-.34,.05],[0,-.36,.13],[.1,-.34,.05],[.125,-.3,0]],.014,colors.navyLight)}else{renderer.draw(loft([[-.22,0,0,.116,.105],[-.03,0,0,.115,.105]],16,.95),e2,skin)}
hand(tr(e2,0,-.32,0));return [ra2,e2]}
function draw(time,worldRoot,overrideState){let sec=time,action=overrideState||state.action;
let t=state.started ? Math.max(0,sec-state.started):0;let walk=action==='walk'||action==='enter';let wave=action==='wave';let turn=action==='turn';
let moveAmount=walk?Math.min(1,t/1.4):0;let gait=walk?Math.sin(sec*9):0;
let yaw=root.yaw;
if(turn)yaw+=Math.sin(Math.min(1,t/1.3)*PI)*1.62;
if(action==='enter')yaw=lerp(root.yaw,-1.42,clamp(t/1.2,0,1));
let x=root.x+(action==='enter'?(isV?.58:1.04)*clamp(t/3.4,0,1):0);
let visibility=action==='enter'?1-clamp((t-2.7)/.55,0,1):1;
if(visibility<=0)return;
let pose=ry(tr(worldRoot,x,-.23,0),yaw);
let bounce=walk?.023*Math.abs(gait):.012*Math.sin(sec*1.9+(isV?1:0));pose=tr(pose,0,bounce,0);
// ground shadow flat and shadowed on original image footline
renderer.ell(tr(worldRoot,x,.016,-.10),0,0,0,.55,.013,.25,colors.brown);
let l=tr(pose,-.225,baseHip,0),r=tr(pose,.225,baseHip,0);
// True multi-joint leg hierarchy
for(let s of [-1,1]){let swing=walk?s*.26*gait:0;
let hip=rx(s<0?l:r,swing),foot=rx(tr(hip,0,-1.20,0),Math.max(0,-swing)*.17);
pantLeg(hip,s,sec);
shoe(foot,s,0,sec)}
body(pose,sec);
let waveFactor=wave?Math.sin(Math.min(1,t/.33)*PI/2)*Math.sin(Math.min(1,(2.65-t)/.35)*PI/2):0;
for(let s of [-1,1]){
let shoulder=walk?s*.25*gait:s*.04;
if(wave&&s===1)shoulder=2.72*waveFactor;
arm(pose,s,shoulder, (wave&&s===1)?-.17*Math.sin(sec*15)*waveFactor:walk?.23*gait:0)}
face(pose);
}
return {type,root,state,draw,H}
}
function create(canvas,options={}){let renderer=new Tiny3D(canvas),actors=[actor(renderer,'connor'),actor(renderer,'victoria')],studio=!!options.studio;
let running=true,act='idle',start=0,stagedAt=0,angle=studio?-.12:0;
function size(){let r=canvas.getBoundingClientRect();return [Math.max(1,r.width),Math.max(1,r.height)]}
function setAction(a){act=a;start=performance.now()/1000;actors.forEach(x=>{x.state.action=a;x.state.started=start})}
function render(now){if(!running)return;let sec=now/1000;let [w,h]=size();renderer.view=studio?lookAt([Math.sin(angle)*8,3.0,Math.cos(angle)*8],[0,1.78,0]):lookAt([0,2.72,9.5],[0,1.78,0]);
let base=mat();if(studio)base=ry(base,0);actors.forEach(x=>x.draw(sec,base));renderer.render(w,h,studio?'studio':'street');requestAnimationFrame(render)}
requestAnimationFrame(render);
if(options.autoWave){setTimeout(()=>{if(act==='idle')setAction('wave')},1100)}
return {setAction,reset(){setAction('idle')},enter(){setAction('enter')},wave(){setAction('wave');setTimeout(()=>{if(act==='wave')setAction('idle')},2700)},walk(){setAction('walk')},turn(){setAction('turn');setTimeout(()=>{if(act==='turn')setAction('idle')},2200)},setAngle(a){angle=a},destroy(){running=false}}
}
window.CV3D={create};
})();