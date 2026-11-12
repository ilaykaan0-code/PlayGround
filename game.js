import * as THREE from 'three';

// A lightweight, original third-person city adventure designed for mobile GPUs.
const canvas=document.getElementById('game');
const mini=document.getElementById('minimap'),mctx=mini.getContext('2d');
const ui=Object.fromEntries(['shard-count','progress','style-score','speed','location','mission-text','toast','suit-panel','suit-grid','suit-status','welcome','completion'].map(id=>[id,document.getElementById(id)]));
const suits=[
 {name:'Classic Red',sub:'THE NEIGHBORHOOD ICON',a:'#d8323d',b:'#172d57',unlock:0},
 {name:'Night Ops',sub:'MOVE IN THE SHADOWS',a:'#252a36',b:'#58b8c2',unlock:0},
 {name:'Sunset Runner',sub:'CHASE THE GOLDEN HOUR',a:'#ff784f',b:'#f5d274',unlock:0},
 {name:'Arctic Pulse',sub:'COOL UNDER PRESSURE',a:'#dcecff',b:'#49aeca',unlock:0},
 {name:'Neon Circuit',sub:'WIRED FOR THE CITY',a:'#7d50d7',b:'#57efcf',unlock:2},
 {name:'Scarlet Sentinel',sub:'BOLD BY DESIGN',a:'#b5152c',b:'#f2d4d0',unlock:3},
 {name:'Midnight Comet',sub:'A STREAK IN THE SKY',a:'#17243d',b:'#f0b5ff',unlock:4},
 {name:'Jade Guardian',sub:'A FRESH PERSPECTIVE',a:'#168c72',b:'#f5d278',unlock:5},
 {name:'Solar Flare',sub:'BRING THE DAYLIGHT',a:'#f5ad25',b:'#eb513b',unlock:6},
 {name:'Ghost Weave',sub:'HERE, THEN GONE',a:'#e0e5e9',b:'#818d9a',unlock:7},
 {name:'Cosmic Web',sub:'A WHOLE NEW WORLD',a:'#4b43a8',b:'#fa6ca8',unlock:8},
 {name:'City Legend',sub:'THE PEOPLE’S CHAMPION',a:'#35b5cb',b:'#f8f2e7',unlock:8}
];
let shardsFound=0,style=0,suitIndex=0,started=false,paused=false,soundOn=true,last=0,toastTimer=0;
const keys={},touch={x:0,y:0,swing:false};
const WORLD=1800,player={pos:new THREE.Vector3(900,0,970),vel:new THREE.Vector3(),yaw:0,z:0,vz:0,swing:false,anchor:null};
let camera,scene,renderer,avatar,webLine,shards=[],shardMeshes=[],buildingBoxes=[],cityObjects=[],clock=new THREE.Clock();
const cameraTarget=new THREE.Vector3(),cameraOffset=new THREE.Vector3(0,7,13),lookTarget=new THREE.Vector3();
const palettes=[0x52636c,0x40525d,0x5b666b,0x495c66,0x566064,0x3f515e,0x665f58];
function rand(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function beep(freq=560,duration=.08,volume=.025){if(!soundOn)return;try{const a=beep.audio||(beep.audio=new(window.AudioContext||window.webkitAudioContext)()),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;o.connect(g);g.connect(a.destination);g.gain.value=volume;o.start();g.gain.exponentialRampToValueAtTime(.001,a.currentTime+duration);o.stop(a.currentTime+duration)}catch{}}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100)}
function init3D(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ab8c5);scene.fog=new THREE.Fog(0x9ab8c5,100,430);
 camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,700);camera.position.set(900,10,990);
 scene.add(new THREE.HemisphereLight(0xd9edff,0x35443d,2.1));
 const sun=new THREE.DirectionalLight(0xffe6c1,2.4);sun.position.set(-80,140,70);scene.add(sun);
 buildCity();buildAvatar();buildShardObjects();
 webLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xe8ffff}));webLine.visible=false;scene.add(webLine);
 addEventListener('resize',resize);renderSuits();
}
function addBox(group,geo,mat,x,y,z,sx,sy,sz){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o}
function buildCity(){
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(WORLD,WORLD),new THREE.MeshStandardMaterial({color:0x344348,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(WORLD/2,-.25,WORLD/2);scene.add(floor);
 const roadMat=new THREE.MeshStandardMaterial({color:0x26373e,roughness:.95}),sidewalkMat=new THREE.MeshStandardMaterial({color:0x718078,roughness:1}),lineMat=new THREE.MeshStandardMaterial({color:0xc2b892,roughness:1});
 const roadGroup=new THREE.Group();scene.add(roadGroup);
 for(let i=0;i<=10;i++){let p=i*180;addBox(roadGroup,new THREE.BoxGeometry(1,1,1),roadMat,p,.03,WORLD,48,.09,WORLD);addBox(roadGroup,new THREE.BoxGeometry(1,1,1),roadMat,WORLD/2,.035,p,WORLD,.09,48);
  for(let n=0;n<10;n++){const q=n*180+32;addBox(roadGroup,new THREE.BoxGeometry(1,1,1),sidewalkMat,p-27,.1,q,8,.2,16);addBox(roadGroup,new THREE.BoxGeometry(1,1,1),sidewalkMat,p+27,.1,q,8,.2,16);addBox(roadGroup,new THREE.BoxGeometry(1,1,1),sidewalkMat,q,.1,p-27,16,.2,8);addBox(roadGroup,new THREE.BoxGeometry(1,1,1),sidewalkMat,q,.1,p+27,16,.2,8)}
  for(let m=0;m<8;m++){const q=m*180+12;addBox(roadGroup,new THREE.BoxGeometry(1,1,1),lineMat,p,.085,q,1,.04,7);addBox(roadGroup,new THREE.BoxGeometry(1,1,1),lineMat,q,.085,p,7,.04,1)}
 }
 const parkMat=new THREE.MeshStandardMaterial({color:0x507655,roughness:1}),trunkMat=new THREE.MeshStandardMaterial({color:0x604936}),leafMats=[0x658764,0x718f68,0x557c67].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1}));
 const winMat=new THREE.MeshStandardMaterial({color:0xe9bd79,emissive:0x51391c,emissiveIntensity:.35,roughness:.6}),windowTransforms=[];
 for(let gy=0;gy<10;gy++)for(let gx=0;gx<10;gx++){
  const id=gy*10+gx,cx=gx*180+90,cz=gy*180+90;
  if(rand(id+48)>.86){addBox(scene,new THREE.BoxGeometry(1,1,1),parkMat,cx,.08,cz,126,.18,126);for(let t=0;t<7;t++){const tx=cx+(rand(id*9+t)-.5)*104,tz=cz+(rand(id*5+t+40)-.5)*102;addBox(scene,new THREE.CylinderGeometry(.8,1.3,6,5),trunkMat,tx,3,tz,1,1,1);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(4+rand(id+t)*1.8,1),leafMats[(t+id)%3]);crown.position.set(tx,7,tz);scene.add(crown)}continue}
  const count=rand(id+7)>.52?2:1;
  for(let j=0;j<count;j++){
   const bw=count===1?116:54,bh=count===1?116:116,bx=cx+(count===1?0:(j?34:-34)),bz=cz+(rand(id*9+j)-.5)*8,h=16+Math.floor(rand(id*3+j)*43);
   const group=new THREE.Group();scene.add(group);group.position.set(bx,0,bz);
   const material=new THREE.MeshStandardMaterial({color:palettes[Math.floor(rand(id*5+j)*palettes.length)],roughness:.82,metalness:.03});
   addBox(group,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x1d2b31}),1.5,h/2+1,1.5,bw+4,h+2,bh+4);
   addBox(group,new THREE.BoxGeometry(1,1,1),material,0,h/2,0,bw,h,bh);
   // Windows are collected here and rendered as one instanced batch below.
   const rows=Math.max(2,Math.floor(h/5));for(let r=1;r<rows;r++){const wy=r*h/rows;for(let c=0;c<Math.floor(bw/11);c++){const wx=-bw/2+6+c*11;windowTransforms.push([bx+wx,wy,bz+bh/2+.055,4,.65,.1]);windowTransforms.push([bx+bw/2+.055,wy,bz+wx/(bw/bh),.1,.65,4])}}
   const roof=new THREE.Mesh(new THREE.BoxGeometry(bw*.36,2,bh*.32),new THREE.MeshStandardMaterial({color:0x34464b}));roof.position.set(0,h+1,0);group.add(roof);
   buildingBoxes.push({x:bx-bw/2-2,z:bz-bh/2-2,w:bw+4,d:bh+4,h});
   // Rooftop swing points
   for(const [ax,az] of [[-bw/2,-bh/2],[bw/2,-bh/2],[-bw/2,bh/2],[bw/2,bh/2]])anchors.push(new THREE.Vector3(bx+ax,h+5,bz+az));
  }
 }
 const windowBatch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),winMat,windowTransforms.length),windowDummy=new THREE.Object3D();
 windowTransforms.forEach((v,i)=>{windowDummy.position.set(v[0],v[1],v[2]);windowDummy.scale.set(v[3],v[4],v[5]);windowDummy.updateMatrix();windowBatch.setMatrixAt(i,windowDummy.matrix)});
 windowBatch.instanceMatrix.needsUpdate=true;scene.add(windowBatch);
 // Distinctive central civic plaza and tower create a recognizable focal point.
 const plaza=new THREE.Mesh(new THREE.CylinderGeometry(21,24,1,24),new THREE.MeshStandardMaterial({color:0xb8a982,roughness:.9}));plaza.position.set(900,.3,900);scene.add(plaza);
 const tower=new THREE.Group();tower.position.set(900,0,900);scene.add(tower);const civic=new THREE.MeshStandardMaterial({color:0x6d7b79,roughness:.72});
 addBox(tower,new THREE.BoxGeometry(1,1,1),civic,0,20,0,44,40,44);const cap=new THREE.Mesh(new THREE.ConeGeometry(28,15,4),new THREE.MeshStandardMaterial({color:0xb9a878,roughness:.7}));cap.position.y=47;cap.rotation.y=Math.PI/4;tower.add(cap);anchors.push(new THREE.Vector3(900,62,900));
 // Small street lamps make scale and routes clear.
 const lampMat=new THREE.MeshStandardMaterial({color:0xe5d6ad,emissive:0x57452b,emissiveIntensity:.4});for(let i=0;i<60;i++){const x=50+(i*137)%1700,z=45+(i*281)%1700;addBox(scene,new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x343d3d}),x,3,z,.8,6,.8);addBox(scene,new THREE.BoxGeometry(1,1,1),lampMat,x,6.1,z,1.7,.45,1.7)}
}
const anchors=[];
function makeSuitMaterial(hex,rough=.72){return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:.03})}
function buildAvatar(){avatar=new THREE.Group();scene.add(avatar);const suit=makeSuitMaterial(suits[suitIndex].a),blue=makeSuitMaterial(suits[suitIndex].b),white=new THREE.MeshBasicMaterial({color:0xf7ffff});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.95,4,8),suit);torso.position.y=1.65;avatar.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.48,12,10),suit);head.position.y=2.8;head.scale.set(.92,1.08,.88);avatar.add(head);
 const eyeGeo=new THREE.SphereGeometry(.11,8,6);for(const side of [-1,1]){const e=new THREE.Mesh(eyeGeo,white);e.scale.set(1.25,.65,.32);e.position.set(side*.19,2.88,-.39);avatar.add(e)}
 const limbGeo=new THREE.CapsuleGeometry(.19,.62,3,6),limbs=[];for(let i=0;i<4;i++){const l=new THREE.Mesh(limbGeo,i<2?blue:suit);l.position.set(i<2?(i===0?-.3:.3):(i===2?-.72:.72),i<2?.62:1.9,0);avatar.add(l);limbs.push(l)}avatar.userData.limbs=limbs;
 const emblem=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),white);emblem.position.set(0,1.83,-.59);emblem.scale.set(1,.7,.25);avatar.add(emblem);avatar.userData.suit=suit;avatar.userData.blue=blue;avatar.userData.emblem=emblem;avatar.position.copy(player.pos);avatar.rotation.y=0;
}
function buildShardObjects(){
 // Keep pickups on road intersections so they remain reachable instead of spawning inside buildings.
 const points=[[900,940],[720,900],[540,720],[1080,540],[1440,720],[360,1080],[1080,1440],[1620,1620]];
 const geo=new THREE.OctahedronGeometry(1.7,0),mat=new THREE.MeshStandardMaterial({color:0xffd77e,emissive:0x9a5d15,emissiveIntensity:1.6,metalness:.2,roughness:.25});
 shards=points.map((p,i)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(p[0],2.7,p[1]);mesh.userData.phase=rand(i+90)*6.28;scene.add(mesh);const halo=new THREE.Mesh(new THREE.TorusGeometry(2.8,.08,4,16),new THREE.MeshBasicMaterial({color:0xffdfa0,transparent:true,opacity:.65}));halo.rotation.x=Math.PI/2;mesh.add(halo);shardMeshes.push(mesh);return{pos:new THREE.Vector3(p[0],0,p[1]),mesh,got:false}});
}
function renderSuits(){
 ui['suit-grid'].innerHTML='';suits.forEach((s,i)=>{const locked=s.unlock>shardsFound,b=document.createElement('button');b.className=`suit-card ${i===suitIndex?'selected':''} ${locked?'locked':''}`;b.innerHTML=`<i class="suit-swatch" style="background:linear-gradient(135deg,${s.a} 0 50%,${s.b} 50%)"></i>${locked?`<span class="suit-lock">🔒 ${s.unlock}</span>`:''}<strong>${s.name}</strong><small>${locked?`${s.unlock} SHARDS TO UNLOCK`:s.sub}</small>`;b.onclick=()=>equipSuit(i);ui['suit-grid'].appendChild(b)});ui['suit-status'].textContent=`${suits[suitIndex].name.toUpperCase()} · EQUIPPED`;
}
function equipSuit(i){if(suits[i].unlock>shardsFound){toast(`LOCKED · FIND ${suits[i].unlock} SHARDS`);return}suitIndex=i;if(avatar){avatar.userData.suit.color.set(suits[i].a);avatar.userData.blue.color.set(suits[i].b)}renderSuits();toast(`${suits[i].name.toUpperCase()} · SUIT EQUIPPED`)}
function resize(){if(!renderer||!camera)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
function nearestAnchor(){let best=null,bd=185;for(const a of anchors){const d=Math.hypot(a.x-player.pos.x,a.z-player.pos.z);if(d<bd){bd=d;best=a}}return best}
function attachSwing(){const a=nearestAnchor();if(a){player.anchor=a;player.swing=true;player.vz=Math.max(player.vz,13);beep(540,.045,.02)}else toast('NO ROOFTOP ANCHOR IN RANGE')}
function releaseSwing(){player.swing=false;player.anchor=null;player.vz=Math.max(player.vz,7)}
function zip(){const a=nearestAnchor();if(a){const dx=a.x-player.pos.x,dz=a.z-player.pos.z,d=Math.hypot(dx,dz)||1;player.vel.x+=dx/d*43;player.vel.z+=dz/d*43;player.vz+=22;style+=15;toast('WEB ZIP · +15 STYLE');beep(760,.07,.03)}else{const v=movementInput();if(v.lengthSq()){player.vel.add(v.multiplyScalar(24));player.vz+=13;style+=5;toast('WEB ZIP · +5 STYLE')}}}
function movementInput(){let x=0,z=0;if(keys.KeyA||keys.ArrowLeft)x--;if(keys.KeyD||keys.ArrowRight)x++;if(keys.KeyW||keys.ArrowUp)z--;if(keys.KeyS||keys.ArrowDown)z++;x+=touch.x;z+=touch.y;const v=new THREE.Vector3(x,0,z);if(v.lengthSq()>1)v.normalize();return v}
function update(dt){
 if(!started||paused)return;
 dt=Math.min(dt,.035);const inp=movementInput(),baseSpeed=player.swing?31:15,accel=player.swing?34:27;
 if(inp.lengthSq()>0){player.vel.x+=inp.x*accel*dt;player.vel.z+=inp.z*accel*dt}
 const friction=inp.lengthSq()?Math.pow(.985,dt*60):Math.pow(.91,dt*60);player.vel.x*=friction;player.vel.z*=friction;
 let speed=Math.hypot(player.vel.x,player.vel.z);if(speed>baseSpeed){player.vel.x*=baseSpeed/speed;player.vel.z*=baseSpeed/speed}
 if(speed>1.1){player.yaw=Math.atan2(player.vel.x,player.vel.z);if(player.swing)player.yaw=Math.atan2(player.anchor.x-player.pos.x,player.anchor.z-player.pos.z)}
 if(player.swing&&player.anchor){const a=player.anchor,dx=a.x-player.pos.x,dz=a.z-player.pos.z,d=Math.hypot(dx,dz)||1;if(d>210){player.swing=false;player.anchor=null}else{const pull=Math.max(0,d-55);player.vel.x+=dx/d*pull*dt*.8;player.vel.z+=dz/d*pull*dt*.8;player.vz=Math.max(player.vz,5+speed*.22)}}
 const oldX=player.pos.x,oldZ=player.pos.z;player.pos.x=THREE.MathUtils.clamp(player.pos.x+player.vel.x*dt,8,WORLD-8);player.pos.z=THREE.MathUtils.clamp(player.pos.z+player.vel.z*dt,8,WORLD-8);
 if(player.z<2)for(const b of buildingBoxes){if(player.pos.x>b.x-1&&player.pos.x<b.x+b.w+1&&player.pos.z>b.z-1&&player.pos.z<b.z+b.d+1){const ox=Math.min(player.pos.x-(b.x-1),(b.x+b.w+1)-player.pos.x),oz=Math.min(player.pos.z-(b.z-1),(b.z+b.d+1)-player.pos.z);if(ox<oz){player.pos.x=oldX;player.vel.x*=-.2}else{player.pos.z=oldZ;player.vel.z*=-.2}}}
 player.z+=player.vz*dt;player.vz-=26*dt;if(player.z<0){if(player.z<-.4){player.vz=Math.abs(player.vz)*.22;if(Math.abs(player.vz)<2)player.vz=0;style+=1}player.z=0}
 avatar.position.set(player.pos.x,player.z,player.pos.z);avatar.rotation.y=player.yaw;
 const limbs=avatar.userData.limbs;for(let i=0;i<limbs.length;i++)limbs[i].rotation.x=player.swing?(i<2?-.9:.8):Math.sin(clock.elapsedTime*10+(i%2)*Math.PI)*Math.min(.7,speed*.035);
 for(const s of shards){if(s.got)continue;const m=s.mesh;m.rotation.y+=dt*1.6;m.position.y=2.7+Math.sin(clock.elapsedTime*2+s.mesh.userData.phase)*.55;if(Math.hypot(s.pos.x-player.pos.x,s.pos.z-player.pos.z)<5.5){s.got=true;m.visible=false;shardsFound++;style+=100;toast('SIGNAL SHARD FOUND · +100 STYLE');beep(680,.09,.04);renderSuits();if(shardsFound===8){ui['mission-text'].textContent='Signal restored';setTimeout(()=>ui.completion.classList.remove('hidden'),650)}}}
 webLine.visible=!!(player.swing&&player.anchor);if(webLine.visible)webLine.geometry.setFromPoints([new THREE.Vector3(player.pos.x,player.z+2.4,player.pos.z),player.anchor]);
 const back=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)).multiplyScalar(15);cameraTarget.set(player.pos.x+back.x,player.z+7.5,player.pos.z+back.z);camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));lookTarget.set(player.pos.x,player.z+1.6,player.pos.z);camera.lookAt(lookTarget);
 ui['shard-count'].textContent=shardsFound;ui.progress.style.width=`${shardsFound/8*100}%`;ui['style-score'].textContent=style.toLocaleString();ui.speed.innerHTML=`${Math.round(speed*3.6)} <small>KM/H</small>`;const x=player.pos.x,z=player.pos.z;ui.location.textContent=`${x<600?'WEST END':x>1200?'EAST MARKET':'DOWNTOWN'} · DISTRICT 0${Math.min(4,Math.floor(z/450)+1)}`;
}
function drawRadar(){const w=mini.width,h=mini.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#192e38';mctx.fillRect(0,0,w,h);const sc=w/WORLD;mctx.fillStyle='#30434a';for(let i=0;i<=10;i++){mctx.fillRect(i*180*sc-2,0,4,h);mctx.fillRect(0,i*180*sc-2,w,4)}mctx.fillStyle='#60796a';for(let i=0;i<10;i++)for(let j=0;j<10;j++)if(rand(i*10+j+48)>.86)mctx.fillRect(i*180*sc+20,j*180*sc+20,126*sc,126*sc);mctx.fillStyle='#78858a';for(const b of buildingBoxes)mctx.fillRect(b.x*sc,b.z*sc,b.w*sc,b.d*sc);for(const s of shards)if(!s.got){mctx.fillStyle='#ffd77e';mctx.beginPath();mctx.arc(s.pos.x*sc,s.pos.z*sc,2.4,0,Math.PI*2);mctx.fill()}mctx.fillStyle='#ff8969';mctx.beginPath();mctx.arc(player.pos.x*sc,player.pos.z*sc,4,0,Math.PI*2);mctx.fill();mctx.strokeStyle='#ffd1bd';mctx.stroke()}
function frame(t){requestAnimationFrame(frame);const dt=Math.min((t-last)/1000||0,.05);last=t;update(dt);drawRadar();renderer.render(scene,camera)}
function bindControls(){
 addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)attachSwing();if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat)zip();if(e.code==='Escape')ui['suit-panel'].classList.add('hidden')});
 addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space')releaseSwing()});
 document.getElementById('start-game').addEventListener('click',()=>{started=true;ui.welcome.classList.add('hidden');clock.start();beep()});
 document.getElementById('suit-open').addEventListener('click',()=>ui['suit-panel'].classList.remove('hidden'));
 document.getElementById('suit-close').addEventListener('click',()=>ui['suit-panel'].classList.add('hidden'));
 document.getElementById('map-toggle').addEventListener('click',()=>{const map=document.querySelector('.minimap-frame');map.style.display=map.style.display==='none'?'':'none'});
 document.getElementById('sound-toggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF'});
 document.getElementById('keep-playing').addEventListener('click',()=>ui.completion.classList.add('hidden'));
 const joystick=document.getElementById('joystick'),knob=document.getElementById('joy-knob');let pointer=null;
 joystick.addEventListener('pointerdown',e=>{pointer=e.pointerId;joystick.setPointerCapture(pointer);moveStick(e)});
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)moveStick(e)});
 const stopStick=()=>{pointer=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'};
 joystick.addEventListener('pointerup',stopStick);joystick.addEventListener('pointercancel',stopStick);
 function moveStick(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=r.width*.34,d=Math.hypot(dx,dy),k=d>max?max/d:1;touch.x=dx*k/max;touch.y=dy*k/max;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`}
 const swingButton=document.getElementById('swing-touch');swingButton.addEventListener('pointerdown',e=>{e.preventDefault();swingButton.setPointerCapture(e.pointerId);touch.swing=true;attachSwing()});const stopSwing=()=>{touch.swing=false;releaseSwing()};swingButton.addEventListener('pointerup',stopSwing);swingButton.addEventListener('pointercancel',stopSwing);swingButton.addEventListener('lostpointercapture',stopSwing);
 document.getElementById('zip-touch').addEventListener('pointerdown',e=>{e.preventDefault();zip()});
}
init3D();bindControls();requestAnimationFrame(frame);

