"""Capture actual WebGL pixels with a neutral, orthographic review camera.
This is a test-only camera: the studio interface, controls and camera are unchanged.
"""
import base64, os, pathlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=os.environ.get('STUDIO_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(BASE+'/studio/',wait_until='networkidle');page.wait_for_function('window.characterStudio',timeout=90000)
  page.evaluate('''async()=>{
   const T=await import('/studio/vendor/three.module.js');const s=characterStudio;
   s.pause();s.pose('idle',0);s.renderer.setPixelRatio(1);s.renderer.setSize(900,1200,false);
   s.renderer.setClearColor(0xeee9e2,1);
   window.reviewCamera=new T.OrthographicCamera(-1.65,1.65,2.2,-2.2,.1,50);
  }''')
  for view,position in [('front',[0,2.15,8]),('three-quarter',[5.66,2.15,5.66]),('side',[8,2.15,0]),('back',[0,2.15,-8])]:
   data=page.evaluate('''({view,position})=>{
    const s=characterStudio;s.preset(view==='side'?'side':'front');
    reviewCamera.position.set(...position);reviewCamera.lookAt(0,1.7,0);reviewCamera.updateProjectionMatrix();
    s.renderer.render(s.scene,reviewCamera);return s.renderer.domElement.toDataURL('image/png').split(',')[1];
   }''',{'view':view,'position':position})
   (ROOT/'evidence'/f'sculpt-{view}.png').write_bytes(base64.b64decode(data));print('Rendered',view,flush=True)
  data=page.evaluate('''()=>{
   const s=characterStudio;s.preset('front');s.renderer.setSize(1200,750,false);
   reviewCamera.left=-1.18;reviewCamera.right=1.18;reviewCamera.top=.7375;reviewCamera.bottom=-.7375;
   reviewCamera.position.set(0,2.94,8);reviewCamera.lookAt(0,2.94,0);reviewCamera.updateProjectionMatrix();
   s.renderer.render(s.scene,reviewCamera);return s.renderer.domElement.toDataURL('image/png').split(',')[1];
  }''')
  (ROOT/'evidence'/'sculpt-faces.png').write_bytes(base64.b64decode(data))
  assert not errors,errors
 finally:browser.close()
