import { chromium } from "playwright-core";
const b=await chromium.launch({executablePath:process.env.CHROME||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto("https://propparlay.ai/app/",{waitUntil:"networkidle"});
await p.waitForTimeout(3000);
// expand NFL card so dark crests (Raiders/Steelers/Ravens) show
const mores=p.locator("text=/Show all/");
const n=await mores.count();
for(let i=0;i<n;i++){try{await mores.nth(i).click();}catch{}}
await p.waitForTimeout(800);
await p.screenshot({path:"verify-mobile.png",fullPage:true});
await b.close();
console.log("ok");
