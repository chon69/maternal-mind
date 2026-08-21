const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer');
const DIR=__dirname,OUT=path.join(DIR,'quien-soy-img');
const SCR='/private/tmp/claude-501/-Users-ascensionjorquera-Desktop-maternal-mind/f6736e84-dd7b-43e4-918c-7358d41663ee/scratchpad';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
// anclada
let p=await b.newPage();await p.setViewport({width:1080,height:1080,deviceScaleFactor:2});
await p.goto('file://'+DIR+'/anclada-quien-soy.html',{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready).catch(()=>{});await wait(1300);
await (await p.$('#card')).screenshot({path:path.join(OUT,'anclada-quien-soy.png')});
fs.copyFileSync(path.join(OUT,'anclada-quien-soy.png'),path.join(SCR,'w-anclada.png'));
await p.close();
// 5 slides
for(let i=0;i<5;i++){p=await b.newPage();await p.setViewport({width:1080,height:1920,deviceScaleFactor:2});
await p.goto('file://'+DIR+'/destacado-quien-soy.html',{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready).catch(()=>{});await wait(1100);
await p.evaluate((idx)=>{const s=document.querySelectorAll('.slide')[idx];document.body.appendChild(s);s.style.transform='none';s.style.position='fixed';s.style.top='0';s.style.left='0';s.style.zIndex='9999';document.getElementById('row').style.display='none';document.querySelector('.hint').style.display='none';document.getElementById('dl').style.display='none';document.body.style.padding='0';},i);
await wait(400);const o=path.join(OUT,'destacado-quien-soy-s'+(i+1)+'.png');
await p.screenshot({path:o,clip:{x:0,y:0,width:1080,height:1920}});
if(i===1||i===4)fs.copyFileSync(o,path.join(SCR,'w-s'+(i+1)+'.png'));
await p.close();}
fs.copyFileSync(path.join(OUT,'destacado-quien-soy-s5.png'),path.join(OUT,'slide5-DEGRADADO-v4.png'));
console.log('ALL_OK');await b.close();})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
