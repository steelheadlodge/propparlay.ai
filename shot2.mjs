import { chromium } from "playwright-core";
const b=await chromium.launch({executablePath:process.env.CHROME||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
const p=await b.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2});
await p.goto("https://propparlay.ai/app/",{waitUntil:"networkidle"});
await p.waitForTimeout(3000);
const mores=p.locator("text=/Show all/");
const n=await mores.count();
for(let i=n-1;i>=0;i--){try{await mores.nth(i).click();await p.waitForTimeout(300);}catch{}}
await p.waitForTimeout(800);
// screenshot the NFL Super Bowl card specifically
const cards=p.locator("section");
const cc=await cards.count();
console.log("sections:",cc);
// find the one containing "Super Bowl"
for(let i=0;i<cc;i++){
  const t=await cards.nth(i).textContent();
  if(t && t.includes("Super Bowl")){await cards.nth(i).screenshot({path:"verify-nfl.png"});console.log("shot nfl idx",i);break;}
}
await b.close();
