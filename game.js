(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const ui = Object.fromEntries(['shard-count','progress','style-score','speed','location','mission-text','toast','suit-panel','suit-grid','suit-status','welcome','completion'].map(id => [id, document.getElementById(id)]));
const W = 2600, H = 2600, TILE = 260, ROAD = 74;
const suits = [
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
let dpr=1, viewW=innerWidth, viewH=innerHeight, last=0, started=false, paused=false, shardsFound=0, style=0, suitIndex=0, soundOn=true, toastTimer=0;
const camera={x:0,y:0};
const player={x:1300,y:1516,vx:0,vy:0,dir:0,z:0,vz:0,swing:false,anchor:null,trail:[],anim:0};
const keys={};
let buildings=[], anchors=[], shards=[], parks=[], particles=[], birds=[];
const rnd=(n)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function resize(){dpr=Math.min(devicePixelRatio||1,2);viewW=innerWidth;viewH=innerHeight;canvas.width=Math.floor(viewW*dpr);canvas.height=Math.floor(viewH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
function generateCity(){
 buildings=[];anchors=[];parks=[];
 const colors=['#465461','#3a4b5a','#53606b','#415565','#5d625f','#43535c'];
 for(let gy=0;gy<10;gy++)for(let gx=0;gx<10;gx++){
  const bx=gx*TILE+ROAD/2, by=gy*TILE+ROAD/2, id=gy*10+gx;
  if(rnd(id+48)>.86){parks.push({x:bx+8,y:by+8,w:TILE-ROAD-16,h:TILE-ROAD-16,seed:id});continue}
  const count=rnd(id+7)>.52?2:1, gap=13;
  for(let j=0;j<count;j++){
   const bw=count===1?TILE-ROAD-30:(TILE-ROAD-30-gap)/2;
   const bh=TILE-ROAD-30;const x=bx+15+j*(bw+gap)+(rnd(id*8+j)*6),y=by+15+(rnd(id*9+j)*8);
   const height=25+Math.floor(rnd(id*3+j)*86);
   buildings.push({x,y,w:bw,h:bh,height,color:colors[Math.floor(rnd(id*5+j)*colors.length)],seed:id*3+j});
   anchors.push({x:x+bw*.5,y:y+bh*.5,h:height+22},{x:x+6,y:y+bh*.5,h:height+22},{x:x+bw-6,y:y+bh*.5,h:height+22});
  }
 }
 // Main central plaza and a landmark rooftop create memorable navigation.
 buildings.push({x:1127,y:1120,w:346,h:360,height:112,color:'#53616b',seed:991,landmark:true});
 anchors.push({x:1300,y:1125,h:145},{x:1128,y:1300,h:145},{x:1472,y:1300,h:145},{x:1300,y:1478,h:145});
 const positions=[[300,300],[820,560],[1080,820],[1560,1080],[1820,1560],[560,1820],[820,2080],[2340,2340]];
 shards=positions.map((p,i)=>({x:p[0],y:p[1],seed:i,got:false,phase:rnd(i+90)*6.28}));
}
generateCity();
function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function input(){let x=0,y=0;if(keys.KeyA||keys.ArrowLeft)x--;if(keys.KeyD||keys.ArrowRight)x++;if(keys.KeyW||keys.ArrowUp)y--;if(keys.KeyS||keys.ArrowDown)y++;if(touchInput.x||touchInput.y){x+=touchInput.x;y+=touchInput.y}const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return{x,y}}
const touchInput={x:0,y:0,swing:false,zip:false};
function nearestAnchor(){let best=null,bd=440;for(const a of anchors){const d=Math.hypot(a.x-player.x,a.y-player.y);if(d<bd){bd=d;best=a}}return best}
function attachSwing(){const a=nearestAnchor();if(a){player.anchor=a;player.swing=true;player.z=Math.max(player.z,3);player.vz=Math.max(player.vz,115);if(soundOn)beep(540,.045,.025)}}
function zip(){let a=nearestAnchor();if(a){let dx=a.x-player.x,dy=a.y-player.y,d=Math.hypot(dx,dy)||1;player.vx+=dx/d*390;player.vy+=dy/d*390;player.vz+=160;style+=15;burst(player.x,player.y,'#9bfff0',8);showToast('WEB ZIP  ·  +15 STYLE');if(soundOn)beep(760,.07,.035)}else{const i=input(),m=Math.hypot(i.x,i.y)||1;player.vx+=i.x/m*250;player.vy+=i.y/m*250;player.vz+=110;style+=5}}
function setSuit(i){if(suits[i].unlock>shardsFound){showToast(`LOCKED  ·  FIND ${suits[i].unlock} SHARDS`);return}suitIndex=i;renderSuits();showToast(`${suits[i].name.toUpperCase()}  ·  SUIT EQUIPPED`)}
function renderSuits(){ui['suit-grid'].innerHTML='';suits.forEach((s,i)=>{const locked=s.unlock>shardsFound;const b=document.createElement('button');b.className=`suit-card ${i===suitIndex?'selected':''} ${locked?'locked':''}`;b.innerHTML=`<i class="suit-swatch" style="background:linear-gradient(135deg,${s.a} 0 50%,${s.b} 50%)"></i>${locked?`<span class="suit-lock">🔒 ${s.unlock}</span>`:''}<strong>${s.name}</strong><small>${locked?`${s.unlock} SHARDS TO UNLOCK`:s.sub}</small>`;b.onclick=()=>setSuit(i);ui['suit-grid'].appendChild(b)});ui['suit-status'].textContent=`${suits[suitIndex].name.toUpperCase()} · EQUIPPED`}
function update(dt){
 if(!started||paused)return;dt=Math.min(dt,.035);player.anim+=dt*9;if(touchInput.swing&&!player.swing)attachSwing();
 const inp=input(),speed=player.swing?420:205,accel=player.swing?550:760;
 player.vx+=inp.x*accel*dt;player.vy+=inp.y*accel*dt;
 const friction=inp.x||inp.y?.985:.91;player.vx*=Math.pow(friction,dt*60);player.vy*=Math.pow(friction,dt*60);
 const vel=Math.hypot(player.vx,player.vy);if(vel>speed){player.vx*=speed/vel;player.vy*=speed/vel}if(vel>12)player.dir=Math.atan2(player.vy,player.vx)+Math.PI/2;if(player.z>50&&vel>180&&Math.random()<dt*1.6)style+=1;
 if(player.swing){if(!player.anchor||Math.hypot(player.anchor.x-player.x,player.anchor.y-player.y)>490){player.swing=false;player.anchor=null}
  else{const a=player.anchor,dx=a.x-player.x,dy=a.y-player.y,d=Math.hypot(dx,dy)||1;const tension=Math.max(0,d-225);player.vx+=dx/d*tension*dt*2.7;player.vy+=dy/d*tension*dt*2.7;player.vz=Math.max(player.vz,48+vel*.12);if(Math.random()<.04)particles.push({x:player.x,y:player.y,z:player.z,color:'#b9fff4',life:.4,max:.4,r:2})}}
 player.x=clamp(player.x+player.vx*dt,12,W-12);player.y=clamp(player.y+player.vy*dt,12,H-12);
 // Buildings have solid footprints; bouncing off them keeps city navigation readable.
 for(const b of buildings){if(player.x>b.x-12&&player.x<b.x+b.w+12&&player.y>b.y-12&&player.y<b.y+b.h+12){const ox=Math.min(Math.abs(player.x-(b.x-12)),Math.abs(player.x-(b.x+b.w+12))),oy=Math.min(Math.abs(player.y-(b.y-12)),Math.abs(player.y-(b.y+b.h+12)));if(ox<oy){player.x=player.x<b.x+b.w/2?b.x-13:b.x+b.w+13;player.vx*=-.2}else{player.y=player.y<b.y+b.h/2?b.y-13:b.y+b.h+13;player.vy*=-.2}}}
 player.z+=player.vz*dt;player.vz-=250*dt;if(player.z<0){if(player.z<-8){player.vz=Math.abs(player.vz)*.27;player.z=0;style+=2}else{player.z=0;player.vz=0}}
 if(vel>100&&Math.random()<.32)player.trail.push({x:player.x,y:player.y,z:player.z,life:.36,max:.36});player.trail=player.trail.filter(t=>(t.life-=dt)>0);
 for(const p of particles)p.life-=dt;particles=particles.filter(p=>p.life>0);
 for(const s of shards){s.phase+=dt*2.5;if(!s.got&&Math.hypot(s.x-player.x,s.y-player.y)<37){s.got=true;shardsFound++;style+=100;burst(s.x,s.y,'#ffd77e',22);showToast(`SIGNAL SHARD FOUND  ·  +100 STYLE`);if(soundOn){beep(680,.09,.04);setTimeout(()=>beep(890,.12,.035),90)}updateHud();renderSuits();if(shardsFound>=8){ui['mission-text'].textContent='Signal restored';setTimeout(()=>ui.completion.classList.remove('hidden'),600)}}}
 camera.x=clamp(player.x-viewW/2,0,W-viewW);camera.y=clamp(player.y-viewH/2,0,H-viewH);
 updateHud();
}
function updateHud(){document.getElementById('shard-count').textContent=shardsFound;ui.progress.style.width=`${shardsFound/8*100}%`;document.getElementById('style-score').textContent=style.toLocaleString();document.getElementById('speed').innerHTML=`${Math.round(Math.hypot(player.vx,player.vy)*.34)} <small>KM/H</small>`;ui.location.textContent=`${player.x<900?'WEST END':player.x>1750?'EAST MARKET':'DOWNTOWN'} · DISTRICT 0${Math.floor(player.y/650)+1}`}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=35+Math.random()*180;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,z:10+Math.random()*30,vz:30+Math.random()*90,color,life:.4+Math.random()*.55,max:1,r:1+Math.random()*3})}}
let audio=null;function beep(freq,duration,volume){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;o.type='sine';g.gain.value=volume;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.stop(audio.currentTime+duration)}catch{}}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewW,viewH);const sky=ctx.createLinearGradient(0,0,0,viewH);sky.addColorStop(0,'#1b3345');sky.addColorStop(.52,'#415965');sky.addColorStop(1,'#243744');ctx.fillStyle=sky;ctx.fillRect(0,0,viewW,viewH);
 // distant soft skyline
 for(let i=0;i<34;i++){const x=((i*173-camera.x*.17)%(viewW+200)+viewW+200)%(viewW+200)-70;const h=45+rnd(i+3)*118;ctx.fillStyle=i%3?'#344d5a':'#3b5660';ctx.fillRect(x,96-h,42+rnd(i+40)*34,h+120)}
 ctx.save();ctx.translate(-camera.x,-camera.y);
 // roads and city blocks
 ctx.fillStyle='#283943';ctx.fillRect(0,0,W,H);
 for(let x=0;x<W;x+=TILE){ctx.fillStyle='#34434a';ctx.fillRect(x,0,ROAD,H);ctx.fillStyle='#63716f';for(let y=18;y<H;y+=50){ctx.fillRect(x+ROAD/2-1,y,2,22)}}
 for(let y=0;y<H;y+=TILE){ctx.fillStyle='#34434a';ctx.fillRect(0,y,W,ROAD);ctx.fillStyle='#63716f';for(let x=15;x<W;x+=50)ctx.fillRect(x,y+ROAD/2-1,22,2)}
 drawParks();drawBuildings();drawShards();drawTrails();drawWeb();drawPlayer();drawParticles();
 ctx.restore();drawMini();
}
function drawParks(){for(const p of parks){ctx.fillStyle='#456b56';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#598061';ctx.fillRect(p.x+5,p.y+5,p.w-10,p.h-10);for(let i=0;i<8;i++){const x=p.x+20+rnd(p.seed+i)* (p.w-40),y=p.y+20+rnd(p.seed+i+33)*(p.h-40);ctx.fillStyle='#355742';ctx.beginPath();ctx.arc(x+2,y+4,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=i%2?'#7b9b70':'#6d9164';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#a5a18a';ctx.fillRect(p.x+p.w/2-2,p.y+5,4,p.h-10);ctx.fillRect(p.x+5,p.y+p.h/2-2,p.w-10,4)}}
function drawBuildings(){for(const b of buildings){const x=b.x,y=b.y,w=b.w,h=b.h;ctx.fillStyle='#1b2b34';ctx.fillRect(x+12,y+15,w,h);ctx.fillStyle='#34414a';ctx.fillRect(x+5,y+7,w,h);ctx.fillStyle=b.color;ctx.fillRect(x,y,w,h);
  ctx.fillStyle='rgba(225,227,208,.16)';ctx.fillRect(x+8,y+8,w-16,3);ctx.fillStyle='rgba(10,21,30,.18)';ctx.fillRect(x+w-7,y+6,7,h-6);
  // rooftop machinery and patterned skylights
  const n=Math.max(2,Math.floor(w/62));for(let i=0;i<n;i++){const rx=x+18+i*(w-36)/n;ctx.fillStyle=b.landmark?'#87918d':'#283a42';ctx.fillRect(rx,y+17,Math.min(20,w/n-5),13);ctx.fillStyle='rgba(197,218,216,.18)';ctx.fillRect(rx+2,y+19,Math.min(14,w/n-9),2)}
  if(b.landmark){ctx.fillStyle='#43545a';ctx.fillRect(x+30,y+30,w-60,h-60);ctx.strokeStyle='#e3b574';ctx.lineWidth=2;ctx.strokeRect(x+12,y+12,w-24,h-24);ctx.strokeStyle='rgba(222,232,210,.17)';ctx.lineWidth=1;for(let gx=x+42;gx<x+w-35;gx+=28){ctx.beginPath();ctx.moveTo(gx,y+34);ctx.lineTo(gx,y+h-34);ctx.stroke()}for(let gy=y+44;gy<y+h-35;gy+=28){ctx.beginPath();ctx.moveTo(x+34,gy);ctx.lineTo(x+w-34,gy);ctx.stroke()}ctx.fillStyle='#82908a';ctx.fillRect(x+w/2-19,y+h/2-13,38,26);ctx.fillStyle='#a5afa2';ctx.fillRect(x+w/2-9,y+h/2-8,18,16);ctx.strokeStyle='rgba(232,190,126,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w/2,y+h/2,36,0,Math.PI*2);ctx.stroke()}
  // warm windows visible at street level
  ctx.fillStyle='rgba(255,201,133,.48)';for(let i=0;i<Math.floor(w/26);i++){ctx.fillRect(x+12+i*25,y+h-5,8,2);ctx.fillRect(x+12+i*25,y+3,7,2)}
 }}
function drawShards(){for(const s of shards){if(s.got)continue;const bob=Math.sin(s.phase)*6,r=10+Math.sin(s.phase*1.7)*1.5;ctx.save();ctx.translate(s.x,s.y+bob);ctx.shadowBlur=23;ctx.shadowColor='#ffd57d';ctx.fillStyle='#ffd77e';ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.68,0);ctx.lineTo(0,r);ctx.lineTo(-r*.68,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff2ca';ctx.lineWidth=1;ctx.stroke();ctx.restore();ctx.strokeStyle='rgba(255,219,140,.18)';ctx.beginPath();ctx.arc(s.x,s.y,23+Math.sin(s.phase)*2,0,Math.PI*2);ctx.stroke()}}
function drawTrails(){for(const t of player.trail){ctx.globalAlpha=t.life/t.max*.45;ctx.fillStyle=suits[suitIndex].b;ctx.beginPath();ctx.arc(t.x,t.y,5*(t.life/t.max),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function drawWeb(){if(!player.swing||!player.anchor)return;const a=player.anchor;ctx.strokeStyle='rgba(225,252,255,.92)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(player.x,player.y-player.z-5);ctx.lineTo(a.x,a.y-a.h);ctx.stroke();ctx.strokeStyle='rgba(93,220,224,.35)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(player.x,player.y-player.z-5);ctx.lineTo(a.x,a.y-a.h);ctx.stroke();ctx.fillStyle='#d9ffff';ctx.beginPath();ctx.arc(a.x,a.y-a.h,3,0,Math.PI*2);ctx.fill()}
function drawPlayer(){const {a,b}=suits[suitIndex],x=player.x,y=player.y-player.z;ctx.save();ctx.translate(x,y);ctx.rotate(player.dir);const run=Math.sin(player.anim)*3,scale=player.swing?1.08:1;
 // grounded shadow and dynamic height shadow
 ctx.fillStyle=`rgba(4,12,17,${Math.max(.09,.3-player.z/230)})`;ctx.beginPath();ctx.ellipse(0,player.z+4,12+player.z*.12,5+player.z*.045,0,0,Math.PI*2);ctx.fill();
 ctx.scale(scale,scale);ctx.strokeStyle='#101925';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-2,3);ctx.lineTo(-5+run,13);ctx.moveTo(2,3);ctx.lineTo(6-run,13);ctx.moveTo(-3,-4);ctx.lineTo(-9,-1+run);ctx.moveTo(3,-4);ctx.lineTo(9,-1-run);ctx.stroke();
 ctx.strokeStyle=b;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-2,3);ctx.lineTo(-5+run,13);ctx.moveTo(2,3);ctx.lineTo(6-run,13);ctx.moveTo(-3,-4);ctx.lineTo(-9,-1+run);ctx.moveTo(3,-4);ctx.lineTo(9,-1-run);ctx.stroke();
 ctx.fillStyle=a;ctx.beginPath();ctx.ellipse(0,-1,6.1,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(3,3);ctx.moveTo(3,-5);ctx.lineTo(-3,3);ctx.stroke();
 ctx.fillStyle=a;ctx.beginPath();ctx.arc(0,-10,5.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6ffff';ctx.beginPath();ctx.ellipse(-2,-10,1.8,1.05,-.3,0,Math.PI*2);ctx.ellipse(2,-10,1.8,1.05,.3,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawParticles(){for(const p of particles){const q=p.life/(p.max||1);ctx.globalAlpha=Math.min(1,q*1.5);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x+(p.vx||0)*(1-q)*.15,p.y+(p.vy||0)*(1-q)*.15-(p.z||0),p.r*(.5+q*.5),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function drawMini(){const w=mini.width,h=mini.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#20333b';mctx.fillRect(0,0,w,h);const sc=w/W;mctx.fillStyle='#35464a';for(let x=0;x<W;x+=TILE)mctx.fillRect(x*sc,0,ROAD*sc,h);for(let y=0;y<H;y+=TILE)mctx.fillRect(0,y*sc,w,ROAD*sc);mctx.fillStyle='#527256';for(const p of parks)mctx.fillRect(p.x*sc,p.y*sc,p.w*sc,p.h*sc);mctx.fillStyle='#65737b';for(const b of buildings)mctx.fillRect(b.x*sc,b.y*sc,b.w*sc,b.h*sc);for(const s of shards)if(!s.got){mctx.fillStyle='#ffd77e';mctx.beginPath();mctx.arc(s.x*sc,s.y*sc,2.4,0,Math.PI*2);mctx.fill()}mctx.fillStyle='#ff8b67';mctx.beginPath();mctx.arc(player.x*sc,player.y*sc,4,0,Math.PI*2);mctx.fill();mctx.strokeStyle='#ffc1a8';mctx.lineWidth=1;mctx.stroke();mctx.strokeStyle='rgba(234,248,255,.2)';mctx.strokeRect(camera.x*sc,camera.y*sc,viewW*sc,viewH*sc)}
function frame(t){const dt=(t-last)/1000||0;last=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Space'&&!e.repeat)attachSwing();if(e.code==='ShiftLeft'||e.code==='ShiftRight'){if(!e.repeat)zip()}if(e.code==='KeyE'&&!e.repeat){document.getElementById('suit-panel').classList.toggle('hidden');paused=!paused}if(e.code==='Escape'){ui['suit-panel'].classList.add('hidden');paused=false}});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space'){player.swing=false;player.anchor=null;player.vz=Math.max(player.vz,48)}});
document.getElementById('start-game').onclick=()=>{started=true;ui.welcome.classList.add('hidden');showToast('WELCOME TO THE CITY  ·  FIND THE GOLD SIGNALS');if(soundOn)beep(540,.11,.025)};
document.getElementById('suit-open').onclick=()=>{ui['suit-panel'].classList.remove('hidden');paused=true;renderSuits()};document.getElementById('suit-close').onclick=()=>{ui['suit-panel'].classList.add('hidden');paused=false};document.getElementById('map-toggle').onclick=()=>document.querySelector('.right-hud').classList.toggle('hidden');
document.getElementById('sound-toggle').onclick=e=>{soundOn=!soundOn;e.currentTarget.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF';showToast(soundOn?'SOUND ENABLED':'SOUND MUTED')};document.getElementById('keep-playing').onclick=()=>ui.completion.classList.add('hidden');
// Drag joystick with pointer events; buttons remain reachable on narrow screens.
const joystick=document.getElementById('joystick'),knob=document.getElementById('joy-knob');let joyPointer=null;
joystick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joyMove(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e)});joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
function joyMove(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=32,m=Math.hypot(dx,dy),k=m>max?max/m:1;touchInput.x=dx*k/max;touchInput.y=dy*k/max;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`}
function joyEnd(){joyPointer=null;touchInput.x=touchInput.y=0;knob.style.transform='translate(0,0)'}
const swingBtn=document.getElementById('swing-touch');swingBtn.addEventListener('pointerdown',e=>{e.preventDefault();touchInput.swing=true;attachSwing()});['pointerup','pointercancel','pointerleave'].forEach(ev=>swingBtn.addEventListener(ev,()=>{touchInput.swing=false;player.swing=false;player.anchor=null;player.vz=Math.max(player.vz,48)}));
document.getElementById('zip-touch').addEventListener('pointerdown',e=>{e.preventDefault();zip()});
// Tap a shard marker on the radar to get an unobtrusive directional nudge.
mini.addEventListener('click',()=>{let target=shards.filter(s=>!s.got).sort((a,b)=>dist(player,a)-dist(player,b))[0];if(target){const angle=Math.atan2(target.y-player.y,target.x-player.x);showToast(`SIGNAL ${Math.round(dist(player,target))}M  ·  ${['EAST','SOUTH','WEST','NORTH'][Math.round((angle+Math.PI/2)/(Math.PI/2)+4)%4]}`)}});
renderSuits();
})();
