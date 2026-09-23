import http from 'node:http';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',f.endsWith('.html')?'text/html':'text/javascript');res.end(fs.readFileSync(f))}catch{res.statusCode=404;res.end()}}).listen(8765);
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
page.on('pageerror',e=>console.error(e));
await page.goto('http://127.0.0.1:8765/scene.html');await page.waitForFunction(()=>window.ready);
const dest=path.resolve(root,'../../assets/noma-motion-15s.mp4');
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','15','-i','pipe:0','-vf','minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,tpad=stop_mode=clone:stop_duration=0.5','-t','15','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',dest],{stdio:['pipe','inherit','inherit']});
const finished=once(ff,'exit');
for(let frame=0;frame<225;frame++){
 const png=Buffer.from(await page.evaluate(t=>window.renderFrame(t),frame/15),'base64');
 if(!ff.stdin.write(png))await once(ff.stdin,'drain');
 if(frame===180)fs.writeFileSync(path.resolve(root,'poster.png'),png);
 if(frame%15===0)console.log(`Rendered ${frame}/225`);
}
ff.stdin.end();const [code]=await finished;await browser.close();server.close();if(code!==0)throw Error('FFmpeg failed');console.log(dest);
