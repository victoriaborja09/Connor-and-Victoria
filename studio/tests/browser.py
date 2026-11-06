"""Functional and visual checks. Run with the site served on port 8000.
Requires Python Playwright and Chromium; no application dependency installation.
"""
import json, pathlib, struct, os
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=os.environ.get('STUDIO_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
  page.set_default_timeout(90000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/studio/',wait_until='networkidle');page.wait_for_function('window.characterStudio')
  page.evaluate('characterStudio.pause()');print('Loaded studio',flush=True)
  for view in ['front','side','back']:
   page.locator('[data-camera="'+view+'"]').click();page.wait_for_timeout(400)
   page.screenshot(path=str(ROOT/'evidence'/f'{view}.png'))
  page.locator('[data-camera="front"]').click()
  # Independence, articulated joints and weighted geometry, rather than button-only tests.
  print('Captured camera views',flush=True);page.locator('[data-select="connor"]').click();page.locator('[data-action="wave"]').click()
  assert page.evaluate('characterStudio.characters[0].mode')=='wave'
  assert page.evaluate('characterStudio.characters[1].mode')=='idle'
  page.evaluate('characterStudio.pose("wave",1.2)');page.wait_for_timeout(100)
  assert page.evaluate('Math.abs(characterStudio.characters[0].arms[0].elbow.rotation.z)')>.4
  page.screenshot(path=str(ROOT/'evidence'/'wave.png'))
  page.evaluate('characterStudio.pose("walk",.3)')
  assert page.evaluate('characterStudio.characters[0].legs[0].thigh.rotation.x*characterStudio.characters[0].legs[1].thigh.rotation.x')<0
  assert page.evaluate('characterStudio.characters.every(c=>c.root.children.some(m=>m.isSkinnedMesh && m.geometry.attributes.skinWeight))')
  page.screenshot(path=str(ROOT/'evidence'/'walk.png'))
  page.evaluate('characterStudio.pose("turn",3)')
  assert abs(page.evaluate('characterStudio.characters[0].root.rotation.y')-6.2831853)<.001
  page.evaluate('characterStudio.pose("look",1)')
  assert page.evaluate('characterStudio.characters[0].head.rotation.y*characterStudio.characters[1].head.rotation.y')<0
  page.locator('#reset').click();page.locator('#half-turn').click()
  assert abs(page.evaluate('characterStudio.characters[0].turnTo-characterStudio.characters[0].turnFrom')-3.14159265)<.001
  page.locator('[data-select="both"]').click();page.locator('[data-action="enter"]').click()
  page.evaluate('characterStudio.pose("enter",4.2)')
  assert page.evaluate('characterStudio.characters.every(c=>!c.root.visible)')
  page.locator('#reset').click()
  # Export and inspect binary glTF structure, skeletons, mesh weights and clips.
  with page.expect_download(timeout=120000) as download:
   page.locator('#export').click()
  output=ROOT/'assets'/'connor-and-victoria-study.glb';download.value.save_as(output)
  binary=output.read_bytes();magic,version,length=struct.unpack_from('<III',binary)
  assert magic==0x46546c67 and version==2 and length==len(binary)
  size,kind=struct.unpack_from('<II',binary,12);gltf=json.loads(binary[20:20+size])
  assert len({tuple(s['joints']) for s in gltf['skins']})==2
  assert len(gltf['animations'])==12
  assert all(len(s['joints'])==17 for s in gltf['skins'])
  assert any('WEIGHTS_0' in primitive['attributes'] for m in gltf['meshes'] for primitive in m['primitives'])
  page.evaluate('''async()=>{const {GLTFLoader}=await import('/studio/vendor/GLTFLoader.js');const THREE=await import('/studio/vendor/three.module.js');const gltf=await new GLTFLoader().loadAsync('/studio/assets/connor-and-victoria-study.glb');let skins=0;gltf.scene.traverse(o=>{if(o.isSkinnedMesh){skins++;if(!o.skeleton.bones.length)throw Error('Missing skeleton');}});if(!skins||gltf.animations.length!==12)throw Error('GLB round trip failed');const mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(a=>a.name==='connor_wave')).play();mixer.update(1.2);gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene);if(!Number.isFinite(box.max.y)||box.max.y<2.5||box.max.y>5)throw Error('Invalid exported bounds');window.roundtrip=gltf;}''')
  print('PASS GLB re-import, skeletons, animation playback and finite model bounds')
  print('PASS desktop, independent actions, skeletal poses, 180/360 turns, look, enter, GLB export')
  print('GLB bytes:',len(binary),'animations:',len(gltf['animations']))
  print('Render:',page.evaluate('({triangles:characterStudio.renderer.info.render.triangles,calls:characterStudio.renderer.info.render.calls})'))
  page.set_viewport_size({'width':390,'height':844});page.locator('#reset').click();page.wait_for_timeout(300)
  assert page.evaluate('document.documentElement.scrollWidth')==390
  page.screenshot(path=str(ROOT/'evidence'/'mobile.png'),full_page=True)
  # Validate the inactive adapter in-browser without saving changes to production.
  page.goto(BASE+'/',wait_until='networkidle')
  awaitable='''async()=>{const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports:{three:'/studio/vendor/three.module.js'}});document.head.append(map);const {attachTownCharacters}=await import('/studio/town-adapter.js');window.townStudy=attachTownCharacters(document.querySelector('#scene-world'));}'''
  page.evaluate(awaitable);page.wait_for_timeout(400)
  assert page.evaluate('townStudy.canvas.parentElement.id')=='scene-world'
  page.locator('.hotspot').nth(1).click()
  assert 'overview' not in page.locator('#street').get_attribute('class')
  page.evaluate('townStudy.play("both","wave")')
  assert page.evaluate('townStudy.characters.every(c=>c.mode==="wave")')
  page.evaluate('townStudy.dispose()')
  assert page.evaluate('document.querySelectorAll("#scene-world canvas").length')==0
  assert not errors,errors
  print('PASS mobile layout, inactive town adapter mount, preserved zoom, disposal; no browser errors')
 finally:
  browser.close()
