import * as THREE from 'three';

// Ping-pong height-field approach based on the simulation idea in
// https://github.com/dghez/mouse-effects-webgl-water (no license declared there).
const FIXED_STEP = 1 / 60;

function targetCandidates(renderer) {
  const webgl2 = renderer.capabilities.isWebGL2;
  const has = (name) => renderer.extensions.has(name);
  if (webgl2 && has('EXT_color_buffer_float')) return [
    { type: THREE.HalfFloatType, filter: has('OES_texture_half_float_linear') ? THREE.LinearFilter : THREE.NearestFilter },
    { type: THREE.FloatType, filter: has('OES_texture_float_linear') ? THREE.LinearFilter : THREE.NearestFilter },
  ];
  const candidates = [];
  if (has('OES_texture_half_float') && has('EXT_color_buffer_half_float')) candidates.push({
    type: THREE.HalfFloatType,
    filter: has('OES_texture_half_float_linear') ? THREE.LinearFilter : THREE.NearestFilter,
  });
  if (has('OES_texture_float') && has('WEBGL_color_buffer_float')) candidates.push({
    type: THREE.FloatType,
    filter: has('OES_texture_float_linear') ? THREE.LinearFilter : THREE.NearestFilter,
  });
  return candidates;
}

function getTargetSize(width, height) {
  const aspect = width / Math.max(height, 1);
  return aspect >= 1 ? [384, Math.max(1, Math.round(384 / aspect))] : [Math.max(1, Math.round(384 * aspect)), 384];
}

function createTargets(renderer, width, height) {
  const [targetWidth, targetHeight] = getTargetSize(width, height);
  for (const support of targetCandidates(renderer)) {
    const targets = [0, 1].map(() => {
      const target = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
        format: THREE.RGBAFormat, type: support.type, minFilter: support.filter, magFilter: support.filter,
        wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false, stencilBuffer: false,
      });
      target.texture.colorSpace = THREE.NoColorSpace;
      return target;
    });
    let complete = true;
    try {
      const gl = renderer.getContext();
      for (const target of targets) {
        renderer.setRenderTarget(target);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) complete = false;
      }
    } catch { complete = false; }
    renderer.setRenderTarget(null);
    if (complete) return { targets, width: targetWidth, height: targetHeight };
    targets.forEach((target) => target.dispose());
  }
  return null;
}

function createWaterEffect(canvas, {
  layer = 'overlay', backgroundUrl, intensity = 0.85, refraction = 0.035, damping = 0.985,
  radius = 0.03, colors = { gold: '#FFD45E', cyan: '#4FD1E8', teal: '#0B2A3A' },
} = {}) {
  if (!canvas || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: layer === 'overlay', antialias: false,
      premultipliedAlpha: layer === 'overlay', powerPreference: 'low-power' });
  } catch { return () => {}; }

  const oldBlendMode = canvas.style.mixBlendMode;
  renderer.setClearColor(0x000000, layer === 'overlay' ? 0 : 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const initial = createTargets(renderer, window.innerWidth, window.innerHeight);
  if (!initial) { renderer.dispose(); return () => {}; }
  let targets = initial.targets;
  let simWidth = initial.width;
  let simHeight = initial.height;
  let readIndex = 0;
  const clearTargets = () => {
    renderer.setClearColor(0x000000, 0);
    targets.forEach((target) => { renderer.setRenderTarget(target); renderer.clear(true, false, false); });
    renderer.setRenderTarget(null);
  };
  clearTargets();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const simMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null }, uPointA: { value: new THREE.Vector2(-10, -10) }, uPointB: { value: new THREE.Vector2(-10, -10) },
      uForce: { value: 0 }, uRadius: { value: radius }, uDamping: { value: damping },
      uTexel: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
      uAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
    fragmentShader: `
      precision highp float; varying vec2 vUv;
      uniform sampler2D uState; uniform vec2 uPointA; uniform vec2 uPointB; uniform vec2 uTexel;
      uniform float uForce; uniform float uRadius; uniform float uDamping; uniform float uAspect;
      void main(){
        vec4 state=texture2D(uState,vUv); float h=state.r; float previous=state.g;
        float neighbors=texture2D(uState,vUv+vec2(uTexel.x,0.0)).r+texture2D(uState,vUv-vec2(uTexel.x,0.0)).r
          +texture2D(uState,vUv+vec2(0.0,uTexel.y)).r+texture2D(uState,vUv-vec2(0.0,uTexel.y)).r;
        float nextH=(neighbors*0.5-previous)*uDamping;
        vec2 segment=uPointB-uPointA; float seg2=max(dot(segment,segment),0.0000001);
        float along=clamp(dot(vUv-uPointA,segment)/seg2,0.0,1.0);
        vec2 closest=uPointA+along*segment;
        float dist=length((vUv-closest)*vec2(uAspect,1.0));
        float impulse=exp(-2.0*dist*dist/max(uRadius*uRadius,0.000001));
        nextH=clamp(nextH+impulse*uForce,-1.0,1.0);
        if(abs(nextH)<0.0005) nextH=0.0;
        gl_FragColor=vec4(nextH,h,0.0,1.0);
      }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
  });
  const simScene = new THREE.Scene(); simScene.add(new THREE.Mesh(geometry, simMaterial));

  const overlay = layer === 'overlay';
  const debug = overlay && new URLSearchParams(window.location.search).get('debugWater') === '1';
  const toColor = (hex) => new THREE.Color(hex);
  const displayMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null }, uBackground: { value: null }, uTexel: { value: new THREE.Vector2(1 / simWidth, 1 / simHeight) },
      uAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) }, uImageAspect: { value: 2560 / 1440 },
      uRefraction: { value: refraction }, uIntensity: { value: THREE.MathUtils.clamp(intensity, 0, 1) },
      uOverlay: { value: overlay }, uDebug: { value: debug },
      uGold: { value: toColor(colors.gold) }, uCyan: { value: toColor(colors.cyan) }, uTeal: { value: toColor(colors.teal) },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
    fragmentShader: `
      precision highp float; varying vec2 vUv;
      uniform sampler2D uState; uniform sampler2D uBackground; uniform vec2 uTexel;
      uniform float uAspect; uniform float uImageAspect; uniform float uRefraction; uniform float uIntensity;
      uniform bool uOverlay; uniform bool uDebug; uniform vec3 uGold; uniform vec3 uCyan; uniform vec3 uTeal;
      vec2 coverUv(vec2 uv){
        if(uAspect>uImageAspect) uv.y=0.5+(uv.y-0.5)*(uImageAspect/uAspect);
        else uv.x=0.5+(uv.x-0.5)*(uAspect/uImageAspect);
        return clamp(uv,0.001,0.999);
      }
      void main(){
        float h=texture2D(uState,vUv).r;
        if(uDebug){
          float raw=clamp(abs(h),0.0,1.0);
          gl_FragColor=vec4(vec3(raw),1.0);
          #include <colorspace_fragment>
          return;
        }
        float hL=texture2D(uState,vUv-vec2(uTexel.x,0.0)).r; float hR=texture2D(uState,vUv+vec2(uTexel.x,0.0)).r;
        float hD=texture2D(uState,vUv-vec2(0.0,uTexel.y)).r; float hU=texture2D(uState,vUv+vec2(0.0,uTexel.y)).r;
        float dx=hR-hL; float dy=hU-hD; float lap=hL+hR+hD+hU-4.0*h;
        float slope=length(vec2(dx*uAspect,dy)); vec3 normal=normalize(vec3(-dx*4.0,-dy*4.0,1.0));
        if(!uOverlay){
          vec2 uv=coverUv(vUv);
          // Keep refraction proportional to the local slope so flat areas remain perfectly still.
          vec2 bend=normal.xy*uRefraction*smoothstep(0.0005,0.02,slope);
          vec3 background;
          background.r=texture2D(uBackground,coverUv(uv+bend*0.92)).r;
          background.g=texture2D(uBackground,coverUv(uv+bend)).g;
          background.b=texture2D(uBackground,coverUv(uv+bend*1.08)).b;
          float fresnel=pow(1.0-clamp(normal.z,0.0,1.0),3.0);
          vec3 sky=mix(vec3(0.015,0.045,0.09),vec3(0.08,0.38,0.55),clamp(vUv.y*0.75+0.18,0.0,1.0));
          float hot=pow(max(0.0,1.0-distance(vUv,vec2(0.12,0.12))),6.0); sky=mix(sky,uGold,hot*0.22);
          vec3 lightA=normalize(vec3(-0.45,0.6,0.65)); vec3 lightB=normalize(vec3(0.6,0.25,0.75));
          float specGold=pow(max(dot(normal,lightA),0.0),90.0); float specCyan=pow(max(dot(normal,lightB),0.0),140.0);
          float caustic=clamp(-lap*16.0,0.0,0.18); float trough=clamp(h*0.08,0.0,0.06);
          vec3 refracted=mix(background,sky,fresnel*0.38)*(1.0-trough);
          refracted+=uGold*(specGold*0.28+caustic*0.42)+uCyan*(specCyan*0.16+caustic*0.2);
          gl_FragColor=vec4(refracted,1.0);
          #include <colorspace_fragment>
          return;
        }
        if(abs(h)<0.0005&&slope<0.0005&&abs(lap)<0.0005){gl_FragColor=vec4(0.0);return;}
        float alpha=smoothstep(0.01,0.25,abs(h))*0.28*uIntensity;
        if(alpha<0.001){gl_FragColor=vec4(0.0);return;}
        vec3 normalA=normalize(vec3(-dx*4.0,-dy*4.0,1.0));
        float goldSpec=pow(max(dot(normalA,normalize(vec3(-0.4,0.55,0.72))),0.0),12.0);
        float cyanSpec=pow(max(dot(normalA,normalize(vec3(0.65,0.2,0.73))),0.0),56.0);
        float fringe=clamp(abs(lap)*2.2,0.0,0.08);
        float goldWash=smoothstep(0.02,0.16,abs(h))*0.48;
        vec3 rgb=mix(uTeal,uCyan,0.64)+uGold*(goldWash+goldSpec*1.4+fringe*1.8)+uCyan*cyanSpec*0.05;
        gl_FragColor=vec4(rgb*alpha,alpha);
        #include <colorspace_fragment>
      }`,
    transparent: overlay, blending: overlay ? THREE.NormalBlending : THREE.NoBlending,
    depthTest: false, depthWrite: false, toneMapped: false, premultipliedAlpha: overlay,
  });
  const displayScene = new THREE.Scene(); displayScene.add(new THREE.Mesh(geometry, displayMaterial));

  let frameId = 0; let lastTime = 0; let accumulator = 0; let lastPointerAt = -Infinity;
  let initialized = false; let force = 0; let impulseRadius = radius;
  const pointA = new THREE.Vector2(-10,-10); const pointB = new THREE.Vector2(-10,-10);
  const tiltPanels=[...document.querySelectorAll('.stat,.chart-panel,.form-panel')]; tiltPanels.forEach((p)=>p.classList.add('tilt-panel'));
  let activePanel=null;
  const getPoint=(e)=>new THREE.Vector2(e.clientX/Math.max(window.innerWidth,1),1-e.clientY/Math.max(window.innerHeight,1));
  const clearTilt=(panel)=>panel&&['--mx','--my','--rx','--ry'].forEach((key)=>panel.style.removeProperty(key));
  const onPointerMove=(event)=>{
    const point=getPoint(event); const now=performance.now();
    if(!initialized){pointA.copy(point);initialized=true;}else pointA.copy(pointB);
    pointB.copy(point);
    const elapsed=Number.isFinite(lastPointerAt)?Math.max(8,now-lastPointerAt):16;
    const speed=Math.min(1,pointA.distanceTo(pointB)*16/elapsed*9);
    force=Math.max(force,Math.min(0.16,0.018+speed*0.11)); impulseRadius=radius;
    lastPointerAt=now;
    const panel=event.pointerType==='touch'?null:event.target.closest?.('.stat,.chart-panel,.form-panel');
    if(activePanel!==panel)clearTilt(activePanel); activePanel=panel;
    if(panel){const rect=panel.getBoundingClientRect();const x=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));const y=Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));
      panel.style.setProperty('--mx',`${x*100}%`);panel.style.setProperty('--my',`${y*100}%`);panel.style.setProperty('--rx',`${(0.5-y)*3}deg`);panel.style.setProperty('--ry',`${(x-0.5)*3}deg`);}
  };
  const onResize=()=>{
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(window.innerWidth,window.innerHeight,false);
    const next=createTargets(renderer,window.innerWidth,window.innerHeight);if(!next)return;
    targets.forEach((target)=>target.dispose());targets=next.targets;simWidth=next.width;simHeight=next.height;readIndex=0;
    simMaterial.uniforms.uTexel.value.set(1/simWidth,1/simHeight);displayMaterial.uniforms.uTexel.value.set(1/simWidth,1/simHeight);
    const aspect=window.innerWidth/Math.max(window.innerHeight,1);simMaterial.uniforms.uAspect.value=aspect;displayMaterial.uniforms.uAspect.value=aspect;clearTargets();
  };
  let disposed=false;
  function renderFrame(now){
    frameId=0;if(document.hidden)return;
    accumulator+=Math.min((now-lastTime)/1000,0.1);lastTime=now;let steps=0;
    while(accumulator>=FIXED_STEP&&steps<4){
      simMaterial.uniforms.uForce.value=force;simMaterial.uniforms.uRadius.value=impulseRadius;simMaterial.uniforms.uPointA.value.copy(pointA);simMaterial.uniforms.uPointB.value.copy(pointB);simMaterial.uniforms.uState.value=targets[readIndex].texture;
      renderer.setRenderTarget(targets[1-readIndex]);renderer.render(simScene,camera);readIndex=1-readIndex;force=0;accumulator-=FIXED_STEP;steps++;
    }
    renderer.setRenderTarget(null);displayMaterial.uniforms.uState.value=targets[readIndex].texture;renderer.render(displayScene,camera);frameId=requestAnimationFrame(renderFrame);
  }
  const start=()=>{if(!frameId&&!document.hidden){lastTime=performance.now();frameId=requestAnimationFrame(renderFrame);}};
  let bgTexture=null;
  if(debug)canvas.style.mixBlendMode='normal';
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else start();};
  window.addEventListener('pointermove',onPointerMove,{passive:true});window.addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',onVisibility);
  if(layer==='background'&&backgroundUrl){
    bgTexture=new THREE.TextureLoader().load(backgroundUrl,(texture)=>{texture.colorSpace=THREE.SRGBColorSpace;displayMaterial.uniforms.uBackground.value=texture;displayMaterial.uniforms.uImageAspect.value=texture.image.width/Math.max(texture.image.height,1);start();},undefined,()=>{});
  }else start();
  return()=>{cancelAnimationFrame(frameId);window.removeEventListener('pointermove',onPointerMove);window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);
    tiltPanels.forEach((panel)=>{panel.classList.remove('tilt-panel');clearTilt(panel);});targets.forEach((target)=>target.dispose());bgTexture?.dispose();geometry.dispose();simMaterial.dispose();displayMaterial.dispose();renderer.dispose();canvas.style.mixBlendMode=oldBlendMode;};
}

export const createWaterRipple=(canvas,options={})=>createWaterEffect(canvas,{...options,layer:'overlay'});
export const createWaterBackground=(canvas,backgroundUrl,options={})=>createWaterEffect(canvas,{...options,layer:'background',backgroundUrl});
