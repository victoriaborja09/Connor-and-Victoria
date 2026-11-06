"""Author the character surfaces in Blender 4.3; preserve the browser's 17-bone rig.
Coordinates in the authoring helpers: X right, Y up, Z toward viewer.
Blender coordinates are converted at the mesh boundary; glTF exports Y-up again.
Run: blender -b -t 4 --python studio/blender/rebuild.py
"""
import bpy, bmesh, math, random, pathlib, json
from mathutils import Vector
from collections import defaultdict
from math import sin,cos,pi,sqrt,exp
ROOT=pathlib.Path(__file__).resolve().parents[1]
rng=random.Random(2906)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def coord(p):return (p[0],-p[2],p[1])
def linear(c):return c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4
def rgb(h):return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def material(name,h,rough=.55,metal=0,skin=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb(h),1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(h),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if skin:p.inputs['Subsurface Weight'].default_value=.065;p.inputs['Subsurface Radius'].default_value=(1,.5,.28)
 return m
skin=material('warm peach skin','DDA477',.67,skin=True)
faceMat=material('sculpted skin with cheek and beard colour','FFFFFF',.68,skin=True)
attr=faceMat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Complexion';faceMat.node_tree.links.new(attr.outputs['Color'],faceMat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
white=material('soft cotton ivory','EFE9E3',.9);navy=material('midnight navy knit','20253C',.87)
gold=material('delicate warm gold','C8A04C',.3,.72);black=material('soft black acetate','191612',.32)
tortoise=material('chestnut amber acetate','704020',.34);dark=material('warm eyelash brown','3C251B',.72)
lipmat=material('natural rose lip','B77A5C',.67);mouthmat=material('smile crease','774E3C',.85)
hairM=[material('brown hair '+str(i),h,.58) for i,h in enumerate(['493022','513425','583A2A','61412F','684632'])]
hairV=[material('dark chestnut hair '+str(i),h,.61) for i,h in enumerate(['38251E','402A20','493024','503729','563A2C'])]
strandM=material('subtle hair striation','77523A',.65);strandV=material('subtle chestnut striation','614332',.67)
eyemat=material('almond eye surface','FFFFFF',.32)
eyeattr=eyemat.node_tree.nodes.new('ShaderNodeVertexColor');eyeattr.layer_name='Complexion';eyemat.node_tree.links.new(eyeattr.outputs['Color'],eyemat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
shine=material('eye catchlight','FFF7DF',.16)
objects=[];char='';role=''
def obj(name,verts,faces,mat,uvs=None,colors=None,sub=0):
 me=bpy.data.meshes.new(name);me.from_pydata([coord(p) for p in verts],[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o['character']=char;o['role']=role;objects.append(o)
 for p in me.polygons:p.use_smooth=True
 if uvs:
  uv=me.uv_layers.new(name='UVMap')
  for poly in me.polygons:
   for li in poly.loop_indices:uv.data[li].uv=uvs[me.loops[li].vertex_index]
 if colors:
  layer=me.color_attributes.new(name='Complexion',type='FLOAT_COLOR',domain='POINT')
  for i,c in enumerate(colors):layer.data[i].color=(*c,1)
 if sub:
  mod=o.modifiers.new('sculpt surface subdivision','SUBSURF');mod.levels=sub;apply(o,mod)
 return o

def apply(o,mod):
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
def union(items,name,voxel=.024):
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=items[0];o.name=name
 mod=o.modifiers.new('manifold voxel union','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;mod.use_smooth_shade=True;apply(o,mod)
 mod=o.modifiers.new('relax anatomical joins','SMOOTH');mod.factor=1.25;mod.iterations=5;apply(o,mod)
 mod=o.modifiers.new('continuous subdivision surface','SUBSURF');mod.levels=1;apply(o,mod)
 mod=o.modifiers.new('efficient sculpt topology','DECIMATE');mod.ratio=.62;apply(o,mod)
 # Voxel operations discard original UVs; use a continuous vertical cylindrical projection.
 me=o.data;uv=me.uv_layers.active or me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  poly.use_smooth=True
  for li in poly.loop_indices:
   p=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p.x*2.6,p.z*2.6)
 return o

def interpolate(points,t):
 n=len(points)-1;v=min(t*n,n-.000001);i=int(v);u=v-i
 a=Vector(points[max(0,i-1)]);b=Vector(points[i]);c=Vector(points[min(n,i+1)]);d=Vector(points[min(n,i+2)])
 return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)

def tube(name,points,r,mat,n=30,sides=8):
 verts=[];faces=[]
 for j in range(n+1):
  t=j/n;p=interpolate(points,t);a=interpolate(points,min(1,t+.002))-interpolate(points,max(0,t-.002));a.normalize();axis=a.cross(Vector((0,0,1)))
  if axis.length<.01:axis=a.cross(Vector((1,0,0)))
  axis.normalize();normal=a.cross(axis).normalized()
  for k in range(sides):
   ang=k/sides*2*pi;q=p+r*(cos(ang)*axis+sin(ang)*normal);verts.append(q)
   if j<n:faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
 faces.extend([tuple(range(sides-1,-1,-1)),tuple(n*sides+k for k in range(sides))]);return obj(name,verts,faces,mat)

def loft(name,rings,mat,n=32,cap=True,fold=None,steps=3):
 verts=[];uv=[];faces=[]
 for j in range((len(rings)-1)*steps+1):
  t=j/((len(rings)-1)*steps);y,rx,rz,cx,cz=interpolate(rings,t)
  for i in range(n):
   a=i/n*2*pi;f=fold(y,a) if fold else 0
   verts.append((cx+(rx+f)*cos(a),y,cz+(rz+f)*sin(a)));uv.append((i/n*3,y*2))
   if j>0:faces.append(((j-1)*n+i,(j-1)*n+(i+1)%n,j*n+(i+1)%n,j*n+i))
 if cap:faces.extend([tuple(range(n-1,-1,-1)),tuple((len(verts)-n)+i for i in range(n))])
 return obj(name,verts,faces,mat,uv)

def ellipsoid(name,center,radii,mat):
 verts=[];faces=[];n=32;m=20
 for j in range(m+1):
  a=-pi/2+j/m*pi
  for i in range(n):
   b=i/n*2*pi;verts.append((center[0]+radii[0]*cos(a)*cos(b),center[1]+radii[1]*sin(a),center[2]+radii[2]*cos(a)*sin(b)))
   if j<m:faces.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
 return obj(name,verts,faces,mat)

def fabric(name,h):
 m=material(name,h,.94);img=bpy.data.images.new(name+' woven colour',width=512,height=512);pixels=[];base=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
 local=random.Random(87)
 for y in range(512):
  for x in range(512):
   grain=(local.random()-.5)*.18;weave=.035*sin((x+y)*pi*.5)+.012*sin(x*pi)
   v=1+grain+weave;pixels.extend((base[0]*v,base[1]*v,base[2]*v,1))
 img.pixels[:]=pixels;img.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m
brownDenim=fabric('washed tobacco denim','654A35');blueDenim=fabric('washed pale indigo denim','90A3B5')
threadBrown=material('tobacco top stitching','AD875E',.96);threadBlue=material('pale denim stitching','CAD0C8',.96)

# Face sculpt: a single closed quad surface with sockets, brow plane, cheeks,
# nose bridge, nasal tip, philtrum and soft jaw integrated as surface displacements.
def face(female):
 cy=3.005 if female else 3.008;rx=.337 if female else .351;ry=.360 if female else .405;rz=.284 if female else .298
 verts=[];faces=[];colors=[];uv=[];n=96;m=64
 def gaussian(x,y,cx,yy,sx,sy):return exp(-((x-cx)/sx)**2-((y-yy)/sy)**2)
 for j in range(m+1):
  lat=-pi/2+j/m*pi;v=sin(lat);height=cy+ry*v
  # Narrow chin, full cheekbones, a gently elongated male jaw.
  shape=1-(.10 if female else .035)*exp(-((v+.88)/.20)**2)+(.05 if female else .025)*exp(-((v+.52)/.27)**2)
  for i in range(n):
   a=i/n*2*pi;x=rx*cos(lat)*cos(a)*shape;z=rz*cos(lat)*sin(a)-.025
   if sin(a)>0:
    f=sin(a)**6
    delta=.0
    for side in [-1,1]:
     delta-=.012*gaussian(x,height,side*.143,3.035,.100,.060)
     delta+=.012*gaussian(x,height,side*.16,3.105,.11,.045)
     delta+=.014*gaussian(x,height,side*.185,2.94,.104,.085)
    delta+=.028*gaussian(x,height,0,3.015,.042,.116)
    delta+=.062*gaussian(x,height,0,2.934,.051,.045)
    delta+=.012*gaussian(x,height,0,2.838,.10,.044)
    delta+=.008*gaussian(x,height,0,2.675,.115,.06)
    z+=delta*f
   verts.append((x,height,z));uv.append((i/n,j/m))
   c=list(rgb('E5B48C' if female else 'DDA77C'))
   front=max(0,sin(a))**8
   blush=.09*front*(gaussian(x,height,.19,2.92,.09,.07)+gaussian(x,height,-.19,2.92,.09,.07))
   c[0]*=1+blush*.3;c[1]*=1-blush*.5;c[2]*=1-blush*.3
   if not female and height<2.84:
    beard=.20*front*max(0,min(1,(2.84-height)/.13))*(.6+rng.random()*.4)
    if abs(x)<.095 and height>2.79:beard*=.2
    c=[v*(1-beard) for v in c]
   colors.append(c)
   if j<m:faces.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
 obj('sculpted oval face',verts,faces,faceMat,uv,colors,sub=1)
 def surface_z(x,height):
  v=(height-cy)/ry;shape=1-(.10 if female else .035)*exp(-((v+.88)/.20)**2)+(.05 if female else .025)*exp(-((v+.52)/.27)**2)
  zz=rz*sqrt(max(.001,1-(x/(rx*shape))**2-v*v))-.025
  front=max(0,1-(x/max(.01,rx*sqrt(max(.001,1-v*v))*shape))**2)**3
  d=0
  for side in [-1,1]:
   d-=.012*gaussian(x,height,side*.143,3.035,.100,.060)
   d+=.012*gaussian(x,height,side*.16,3.105,.11,.045)
   d+=.014*gaussian(x,height,side*.185,2.94,.104,.085)
  d+=.028*gaussian(x,height,0,3.015,.042,.116)+.062*gaussian(x,height,0,2.934,.051,.045)
  d+=.012*gaussian(x,height,0,2.838,.10,.044)+.008*gaussian(x,height,0,2.675,.115,.06)
  return zz+d*front
 # Integrated ear lobes with a small recessed inner ear.
 for s in [-1,1]:
  ellipsoid('ear', (s*.335,2.957,-.018),(.057,.092,.045),skin)
  ellipsoid('ear inner',(s*.372,2.961,.007),(.010,.048,.021),lipmat)
 # Small almond surfaces, not spherical eyeballs sitting on top of the face.
 for s in [-1,1]:
  cx=s*.141;ey=3.035;width=.105 if female else .102;top=.049 if female else .042;bottom=.034 if female else .030
  verts=[];faces=[];colors=[]
  for rj in range(15):
   r=rj/14
   for k in range(64):
    a=k/64*2*pi;x=width*cos(a)*r;y=(top if sin(a)>=0 else bottom)*sin(a)*r+s*x*.10
    z=surface_z(cx+x,ey+y)+.004+.022*(1-r*r)
    verts.append((cx+x,ey+y,z))
    d=sqrt((x+.002)**2+(y-.010)**2)
    if d<.021:c=rgb('261B14')
    elif d<.045:
     f=.85+.045*sin(math.atan2(y,x)*28)+.025*sin(math.atan2(y,x)*47)
     c=tuple(v*f for v in rgb('704624'))
    else:c=rgb('F2E9DC')
    colors.append(c)
    if rj<14:faces.append((rj*64+k,(rj+1)*64+k,(rj+1)*64+(k+1)%64,rj*64+(k+1)%64))
  obj('recessed almond eye',verts,faces,eyemat,colors=colors)
  ellipsoid('small eye glint',(cx-.011,ey+.012,surface_z(cx-.011,ey+.012)+.027),(.0055,.0065,.002),shine)
  for upper in [True,False]:
   pts=[]
   for i in range(25):
    a=(i/24*pi if upper else pi+i/24*pi);x=width*cos(a);y=(top if upper else bottom)*sin(a)+s*x*.10
    pts.append((cx+x,ey+y,surface_z(cx+x,ey+y)+.006))
   tube('sculpted eyelid',pts,.007 if upper else .005,skin,32)
   if upper:tube('fine upper lashes',[(p[0],p[1]-.001,p[2]+.003) for p in pts],.0025,dark,32,6)
  brow=[(cx-s*.085,3.132,.245),(cx,3.155 if female else 3.15,.258),(cx+s*.081,3.136,.235)]
  tube('shaped brow',brow,.010 if female else .014,hairV[0] if female else hairM[0],24)
  # Reduced, fitted frames; slight perspective wrap at the outer rim.
  rim=[]
  for k in range(65):
   a=k/64*2*pi;c=cos(a);n=sin(a);xx=.122*math.copysign(abs(c)**(.72 if female else .48),c);yy=.078*math.copysign(abs(n)**(.88 if female else .55),n)
   rim.append((cx+xx,3.037+yy+s*xx*.04,.297-.046*abs((cx+xx)/.30)**2))
  tube('fitted glasses rim',rim,.010 if female else .013,tortoise if female else black,64)
  tube('wrapping glasses temple',[(s*.261,3.064,.252),(s*.317,3.066,.14),(s*.349,3.028,-.064),(s*.326,2.992,-.10)],.009,tortoise if female else black,28)
 tube('glasses bridge',[(-.024,3.056,.306),(0,3.066,.322),(.024,3.056,.306)],.009,tortoise if female else black,16)
 # Sculpted lips form a thin soft surface; corners lift asymmetrically.
 verts=[];faces=[]
 for j in range(7):
  v=j/6
  for i in range(41):
   x=-.101+i/40*.202;f=max(0,1-(x/.101)**2);line=2.854+.014*(x/.101)**2+.003*x/.101
   height=(.010 if female else .007)*f;y=line+(v-.5)*2*height
   z=surface_z(x,y)+.003+.007*f*sin(v*pi)
   verts.append((x,y,z))
   if j<6 and i<40:faces.append((j*41+i,j*41+i+1,(j+1)*41+i+1,(j+1)*41+i))
 obj('natural sculpted lips',verts,faces,lipmat)
 tube('smile crease',[(x,2.854+.014*(x/.102)**2+.003*x/.102,surface_z(x,2.854+.014*(x/.102)**2+.003*x/.102)+.005) for x in [-.102,-.05,0,.05,.102]],.002,mouthmat,40,6)
 if not female:
  beardMat=material('short muted facial stubble','79624F',.95)
  for i in range(210):
   x=rng.uniform(-.23,.23);y=rng.uniform(2.70,2.89)
   if abs(x)<.10 and y>2.82:continue
   if (x/rx)**2+((y-cy)/ry)**2>.91:continue
   z=surface_z(x,y)
   tube('fine seated stubble',[(x,y,z+.0006),(x+.0004,y+.003, surface_z(x+.0004,y+.003)+.0006)],.0005,beardMat,3,4)
 # Nostrils are tiny recessed shadows under the nose tip.
 for s in [-1,1]:ellipsoid('nostril',(s*.027,2.915,surface_z(s*.027,2.915)+.001),(.010,.004,.005),mouthmat)

# Broad flattened sculpted ribbons: overlap like combed locks, with tapered tips
# and a few fine grooves. They replace the old repeated oval/tubular clumps.
def lock(name,points,width,depth,mat,front=None,grooves=False):
 verts=[];faces=[];frames=[];ns=28;nk=10;last=None
 for j in range(ns+1):
  t=j/ns;p=interpolate(points,t);tangent=(interpolate(points,min(1,t+.002))-interpolate(points,max(0,t-.002))).normalized()
  normal=Vector(front) if front else (p-Vector((0,3.00,-.035))).normalized();normal=(normal-tangent*normal.dot(tangent)).normalized()
  side=tangent.cross(normal).normalized()
  if last is not None and last.dot(side)<0:side=-side;normal=-normal
  last=side;f=(.72+.38*sin(pi*t))*max(.00001,1-t)**.45+.002
  frames.append((p,side,normal,f))
  for k in range(nk):
   a=k/nk*2*pi;q=p+side*cos(a)*width*f+normal*sin(a)*depth*f;verts.append(q)
   if j<ns:faces.append((j*nk+k,j*nk+(k+1)%nk,(j+1)*nk+(k+1)%nk,(j+1)*nk+k))
 faces.extend([tuple(range(nk-1,-1,-1)),tuple(ns*nk+k for k in range(nk))]);o=obj(name,verts,faces,mat)
 if grooves:
  for fside in [-.42,.42]:
   pts=[]
   for j in range(1,ns-1,2):
    p,side,normal,f=frames[j];pts.append(p+side*width*f*fside+normal*depth*f*.74)
   tube('engraved hair strand',pts,.0007,strandV if char=='victoria' else strandM,26,5)
 return o

def hair(female):
 mats=hairV if female else hairM
 # Continuous cap with an actual curved hairline and deep rear coverage.
 verts=[];faces=[];n=72;m=22
 for j in range(m+1):
  t=j/m*pi/2
  for i in range(n):
   a=i/n*2*pi;front=max(0,sin(a));base=2.93+.27*front**3+.023*sin(a*3)+(.018*sin(a*9) if not female else 0)
   r=sqrt(max(.1,1-((base-3.03)/.46)**2));noise=1+.028*sin(a*5+t*3)*sin(t*2)
   if female:
    start=math.asin(max(-.9,min(.9,(base-2.99)/.455)));theta=start+(pi/2-start)*j/m
    verts.append((.37*cos(theta)*cos(a),2.99+.455*sin(theta),.325*cos(theta)*sin(a)-.035))
   else:verts.append((.37*r*cos(a)*cos(t)*noise,base+(3.49-base)*sin(t),.325*r*sin(a)*cos(t)*noise-.035))
   if j<m:faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 obj('continuous shaped hair cap',verts,faces,mats[0])
 if female:
  # Rear S-shaped masses, layered from the centre part over the full back.
  for i in range(26):
   a=pi*.02+i/25*pi*.96;x=cos(a)*.32;z=-sin(a)*.29-.035;phase=rng.uniform(-.05,.05)
   pts=[(x*.25,3.428,z*.24),(x*.78,3.32,z*.86),(x*1.10,3.06,z*1.1),(x*1.23,2.82,z*1.18),(x*.99+phase,2.58,z*1.09),(x*1.18,2.31,z*1.18),(x*.94,2.07+rng.uniform(-.1,.08),z*.85)]
   lock('layered rear wave',pts,rng.uniform(.053,.073),.023,mats[i%5],front=(cos(a),0,-sin(a)),grooves=i%2==0)
  for s in [-1,1]:
   for i in range(8):
    f=i/7;pts=[(s*(.012+f*.07),3.455-f*.028,.06+f*.10),(s*(.17+f*.08),3.35-f*.045,.27+f*.006),(s*(.30+f*.035),3.14-f*.085,.27-f*.035),(s*(.365+f*.026),2.91-f*.10,.20-f*.035),(s*(.33+f*.035),2.68-f*.08,.23-f*.035),(s*(.365+f*.01),2.43-f*.10,.20-f*.03),(s*.305,2.20-f*.10,.18)]
    pts=[(x,y,min(z,.325*sqrt(max(.015,1-(x/.37)**2-((y-2.99)/.455)**2))-.035+.025)) if y>3.18 else (x,y,z) for x,y,z in pts]
    lock('centre parted face framing wave',pts,.045 if i<4 else .051,.020,mats[(i+2)%5],front=(s*.35,0,1),grooves=True)
  for side in [-1,1]:
   for j in range(7):
    z=.12-j*.047
    points=[(side*.19,3.385,z*.5),(side*.315,3.24,z),(side*.37,3.0,z-.012),(side*.405,2.76,z+.014),(side*.36,2.52,z+.04),(side*.41,2.30,z+.014),(side*.33,2.11+rng.uniform(-.04,.04),z+.06)]
    lock('temple to shoulder layer',points,.055,.020,mats[(j+1)%5],front=(side,0,.15),grooves=j%3==0)
  def crown_y(x,z):return 2.99+.455*sqrt(max(.03,1-(x/.37)**2-((z+.035)/.325)**2))+.0015
  for side in [-1,1]:
   for k in range(14):
    z=-.245+k*.035
    points=[(side*.012,crown_y(.012,z),z),(side*.14,crown_y(.14,z)+.008,z),(side*.265,crown_y(.265,z)+.008,z-.012),(side*.342,3.035,z-.02),(side*.36,2.85,z-.012)]
    lock('combed centre part crown layer',points,.024,.003,mats[1],front=(side*.5,.4,.15),grooves=k%5==0)
  tube('narrow centre part',[(0,3.434,.08),(0,3.411,.155),(0,3.355,.233)],.0008,mats[3],28,6)
 else:
  # Unequal long curls; varied root direction and silhouette break repetition.
  def scalp(a,lat,inflate=1):
   return (.39*cos(lat)*cos(a)*inflate,3.025+.465*sin(lat)*inflate,.35*cos(lat)*sin(a)*inflate-.035)
  for i in range(145):
   a=rng.uniform(0,2*pi);lat=math.asin(rng.uniform(-.04,.99))
   if sin(a)>.15:lat=max(lat,.51+rng.uniform(-.04,.04))
   span=rng.uniform(.40,.58);rotation=rng.uniform(-pi,pi)
   points=[]
   for u,v,inflate in [(-.45,.17,.985),(-.12,.38,1.035),(.25,.18,1.045),(.38,-.16,1.01),(.12,-.36,.975)]:
    aa=a+span*(u*cos(rotation)-v*sin(rotation))/max(.6,cos(lat))
    ll=lat+span*(u*sin(rotation)+v*cos(rotation))
    ll=max(-.17,min(1.53,ll))
    if sin(aa)>.20:ll=max(.37,ll)
    points.append(scalp(aa,ll,inflate))
   lock('irregular overlapping soft wave',points,rng.uniform(.037,.048),rng.uniform(.016,.023),mats[i%5],grooves=i%10==0)

def body(female):
 global role
 shirt=navy if female else white;denim=blueDenim if female else brownDenim;thread=threadBlue if female else threadBrown
 role='torso'
 rings=[(1.70 if female else 1.61,.302 if female else .335,.175 if female else .19,0,.01),(1.79,.30 if female else .345,.18 if female else .205,0,0),(1.94,.287 if female else .35,.181 if female else .213,0,0),(2.09,.325 if female else .36,.207,0,0),(2.24,.35 if female else .37,.204,0,0),(2.32,.345,.174,0,0),(2.39,.23,.127,0,0),(2.445,.125,.099,0,0)]
 def cotton(y,a):return .004*sin(a*5+y*17)+.006*exp(-((y-1.7)/.15)**2)*sin(a*7+y*16)
 torso=loft('shirt body',rings,shirt,48,True,cotton,5);parts=[torso]
 for s in [-1,1]:
  end=1.635 if female else 2.07
  sleeve=[]
  for j in range(16):
   t=j/15;y=end+(2.355-end)*t;cx=s*(.579-(y-1.635)*.24);rx=(.072+(.135-.072)*t) if female else .138+.019*t
   sleeve.append((y,rx,rx*.94,cx,.009))
  sleeve.extend([(2.39,.09,.095,s*.30,0),(2.412,.032,.04,s*.22,0)])
  parts.append(loft('shirt connected sleeve',sleeve,shirt,32,True,cotton,2))
 union(parts,'continuous shoulder and shirt surface',.019)
 # Collar sits smoothly around the skin neck; a subtle raised knit ring.
 tube('collar binding',[(.145*cos(a),2.442-.020*max(0,sin(a)),.116*sin(a)) for a in [k/64*2*pi for k in range(65)]],.009,shirt,64,8)
 role='neck'
 loft('anatomical neck',[(2.35,.17,.123,0,-.013),(2.43,.127,.105,0,-.013),(2.57,.125,.111,0,-.015),(2.72,.16,.13,0,-.022)],skin,40,True,None,6)
 if female:
  role='torso';loft('cropped top midriff',[(1.56,.291,.159,0,.006),(1.66,.294,.165,0,.006),(1.78,.295,.17,0,0)],skin,40)
 for s in [-1,1]:
  role='armL' if s>0 else 'armR'
  armrings=[(1.60,.049,.043,s*.58,.028),(1.69,.058,.056,s*.567,.020),(1.79,.077,.070,s*.552,.018),(1.91,.084,.080,s*.53,.006),(2.00,.094,.085,s*.512,.005),(2.13,.105,.095,s*.485,.0),(2.28,.115,.11,s*.439,0)]
  if not female:armrings=[(y,rx*(.86 if y>2.05 else 1),rz*(.86 if y>2.05 else 1),x,z) for y,rx,rz,x,z in armrings]
  if female:armrings=[(y,rx*(.79 if y>1.7 else .91),rz*(.79 if y>1.7 else .91),x,z) for y,rx,rz,x,z in armrings]
  arm=loft('shaped arm',armrings,skin,32,True,None,4)
  # Relaxed palm, fleshy thumb base, staggered and gently curled fingers.
  palm=ellipsoid('relaxed palm',(s*.586,1.535,.037),(.068,.105,.038),skin);items=[arm,palm]
  for k in range(4):
   x=s*(.545+k*.026);length=[.083,.108,.101,.076][k]
   tube('jointed finger',[(x,1.51,.042),(x+s*.004,1.47,.055),(x+s*.007,1.49-length,.066),(x+s*.004,1.478-length,.055)],.0115,skin,18,8)
  tube('curved thumb',[(s*.535,1.59,.045),(s*.509,1.55,.072),(s*.521,1.505,.09)],.020,skin,20,10)
  union(items,'continuous arm wrist and palm',.013)
  if female:
   role='armL' if s>0 else 'armR'
   tube('knit sleeve cuff',[(s*.58+.069*cos(a),1.646,.025+.065*sin(a)) for a in [i/48*2*pi for i in range(49)]],.007,navy,48)
 # Join pelvis and both legs into a single watertight trouser surface.
 role='pants';parts=[]
 waist=1.635 if female else 1.66
 parts.append(loft('jeans pelvis',[(1.16,.065,.085,0,0),(1.27,.30,.205,0,0),(1.36,.37,.225,0,0),(1.46,.395,.233,0,-.006),(1.55,.375,.218,0,0),(waist,.328,.181,0,0)],denim,48,True,None,5))
 for s in [-1,1]:
  rings=[]
  for j in range(50):
   y=.155+j/49*1.37;rx=.205+.025*sin((y-.15)/1.37*pi)+.014*exp(-((y-.31)/.16)**2);rz=.183+.027*sin((y-.15)/1.37*pi)
   cx=s*(.239+.016*sin(y*4+.7));cz=.014*cos(y*5)
   rings.append((y,rx,rz,cx,cz))
  def folds(y,a):
   front=.35+.65*abs(sin(a))
   ankle=.018*exp(-((y-.30)/.18)**2)*sin(y*39+a*2.8+s)
   knee=.013*exp(-((y-.85)/.18)**2)*sin(y*32-a*2+s)
   hip=.010*exp(-((y-1.33)/.15)**2)*sin(y*24+a*2)
   return (ankle+knee+hip)*front+.003*sin(a*7+y*9)
  parts.append(loft('sculpted baggy denim leg',rings,denim,48,True,folds,1))
 pants=union(parts,'continuous baggy jeans',.016)
 # Outer inseams and topstitching follow curved leg silhouettes.
 role='pants'
 for s in [-1,1]:
  pts=[]
  for j in range(28):
   y=.20+j/27*1.30;cx=s*(.239+.016*sin(y*4+.7));rx=.205+.025*sin((y-.15)/1.37*pi)+.014*exp(-((y-.31)/.16)**2)
   pts.append((cx+s*(rx-.002),y,.006))
  tube('double outer leg seam',pts,.0022,thread,48,6)
 # Waistband is a closed sculpted strip, not an overlapping apron panel.
 role='hips'
 loft('waistband',[(waist-.036,.332,.185,0,0),(waist+.008,.328,.183,0,0)],denim,64,True,None,2)
 for s in [-1,1]:
  # Subtly raised back pockets with shaped lower corners, curved over the seat.
  corners=[(s*.125,1.48),(s*.294,1.48),(s*.288,1.317),(s*.218,1.283),(s*.133,1.322)]
  def back_z(x):return -.234*sqrt(max(.15,1-(x/.41)**2))-.007
  center=(sum(p[0] for p in corners)/5,sum(p[1] for p in corners)/5)
  vv=[(center[0],center[1],back_z(center[0]))]+[(x,y,back_z(x)) for x,y in corners]
  ff=[(0,i+1,(i+1)%5+1) for i in range(5)];obj('raised curved rear pocket',vv,ff,denim,[(v[0]*4,v[1]*4) for v in vv],sub=2)
  pts=[(x,y,back_z(x)-.003) for x,y in corners]+[(corners[0][0],corners[0][1],back_z(corners[0][0])-.003)]
  tube('rear pocket topstitch',pts,.0018,thread,32,6)
  tube('front pocket opening',[(s*.14,waist-.015,.178),(s*.21,waist-.08,.194),(s*.32,waist-.18,.146)],.003,thread,32,6)
  for x in [s*.13,s*.29]:tube('belt loop',[(x,waist+.012,.183*sqrt(max(.15,1-(x/.34)**2))+.006),(x,waist-.05,.196*sqrt(max(.15,1-(x/.37)**2))+.006)],.009,denim,12,6)
 tube('fly stitching',[(.018,waist-.02,.188),(.02,waist-.12,.218),(0,waist-.23,.229)],.0023,thread,24,6)
 ellipsoid('antique jeans button',(0,waist-.022,.193),(.017,.017,.006),gold)
 if female:
  role='chest'
  tube('gold chain',[(-.105,2.43,.085),(-.091,2.34,.163),(0,2.25,.217),(.091,2.34,.163),(.105,2.43,.085)],.0032,gold,48,8)
  # Small dimensional six-point pendant.
  pts=[]
  for i in range(13):
   a=i/12*2*pi;r=.021 if i%2==0 else .009;pts.append((r*cos(a),2.228+r*sin(a),.222))
  tube('gold star pendant',pts,.0035,gold,36,6)


def shoes(female):
 global role
 upper=material(('green' if female else 'brown')+' leather sneakers','36533E' if female else '65412A',.64)
 sole=material('rubber sole '+char,'DBD5C6' if female else 'BE9969',.85)
 stitch=material('shoe stitching '+char,'B7AE92' if female else 'AC8864',.8)
 for s in [-1,1]:
  role='footL' if s>0 else 'footR';cx=s*.225
  rings=[]
  for j in range(12):
   t=j/11;y=.054+t*.197;r=sin((.1+t*.9)*pi/2)
   rx=.177*(1-.36*t*t);rz=.316*(1-.63*t*t);cz=.09-.058*t
   rings.append((y,rx,rz,cx,cz))
  loft('low profile sneaker upper',rings,upper,48,True,None,3)
  loft('layered rubber outsole',[(.010,.170,.303,cx,.09),(.018,.184,.318,cx,.09),(.058,.184,.318,cx,.09),(.068,.178,.309,cx,.09)],sole,64,True,None,2)
  tube('outsole welt',[(cx+.181*cos(a),.061,.09+.314*sin(a)) for a in [i/80*2*pi for i in range(81)]],.0035,stitch,80,6)
  # Toe seam and tongue; scale appropriate to the low sneaker profile.
  tube('stitched toe panel',[(cx-.144,.115,.257),(cx-.09,.159,.304),(cx,.174,.320),(cx+.09,.159,.304),(cx+.144,.115,.257)],.0022,stitch,36,6)
  loft('sneaker tongue',[(.13,.065,.11,cx,.092),(.20,.067,.081,cx,.063),(.245,.062,.04,cx,.018)],upper,24,True,None,2)
  for i in range(5):
   z=.105+i*.036;y=.250-i*.013
   tube('flat shoelace',[(cx-.059,y,z),(cx-.018,y+.010,z+.008),(cx+.059,y,z+.010)],.005,white,16,6)
  for side in [-1,1]:
   for i in range(3):
    z=.112-i*.058;x=cx+side*.174
    # Flat rounded ribbons on the quarter panel, with actual thickness.
    yz=[(.083,z+.034),(.092,z+.054),(.189,z-.009),(.181,z-.029)]
    verts=[]
    for yy,zz in yz:
     tt=(yy-.054)/.197;rxx=.177*(1-.36*tt*tt);rzz=.316*(1-.63*tt*tt);zcc=.09-.058*tt
     xx=cx+side*(rxx*sqrt(max(.1,1-((zz-zcc)/rzz)**2))+.004)
     verts.append((xx,yy,zz))
    o=obj('white leather sneaker stripe',verts,[(0,1,2,3)],white);mod=o.modifiers.new('stripe leather thickness','SOLIDIFY');mod.thickness=.003;apply(o,mod);mod=o.modifiers.new('rounded stripe edge','BEVEL');mod.width=.003;mod.segments=2;apply(o,mod)
  for i in range(14):
   a=i/14*2*pi;tube('sole sidewall detail',[(cx+.183*cos(a),.022,.09+.315*sin(a)),(cx+.183*cos(a),.043,.09+.315*sin(a))],.0009,stitch,6,5)

for female in [False,True]:
 char='victoria' if female else 'connor';role='head';face(female);hair(female);body(female);shoes(female)
 
 for part in bpy.context.scene.objects:
  if part.type=='MESH' and part.get('character')==char and part.get('role')=='head':
   for vertex in part.data.vertices:
    if female:
     xx=vertex.co.x;yy=vertex.co.z-2.89
     vertex.co.x=xx*cos(.065)-yy*sin(.065);vertex.co.z=2.89+xx*sin(.065)+yy*cos(.065)-.12
    else:vertex.co.z-=.055
 print('BUILT',char,flush=True)
# Material batching retains role boundaries required by the original rig.
groups=defaultdict(list)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':groups[(o['character'],o['role'])].append(o)
for (character,attach),items in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=items[0];o.name=character+'__'+attach;o['character']=character;o['role']=attach
 # Consolidate duplicate material slots without collapsing surfaces or normals.
 for p in o.data.polygons:p.use_smooth=True
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets'/'character-sculpt.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'character-surfaces.glb'),export_format='GLB',export_extras=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_image_format='AUTO')
print('EXPORTED',str(ROOT/'assets'/'character-surfaces.glb'),flush=True)
