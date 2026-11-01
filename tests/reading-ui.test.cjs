const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
require('../model.js');
function screen(){
 const listeners={};const c={data:DeskModel.normalize({passages:[{id:'p',title:'Frozen Food <sample>',sourceLabel:'Book',wordIds:['w','incomplete']},{id:'p2',title:'Another article',wordIds:['other']}],words:[{id:'w',term:'freeze',meaning:'đông lạnh'},{id:'incomplete',term:'preserve',meaning:''},{id:'other',term:'unrelated',meaning:'khác'}]}),DeskModel,esc:v=>String(v??'').replace(/[<>&"]/g,x=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[x])),icon:()=>'',heading:(title,copy,action='')=>`<h1>${title}</h1><p>${copy}</p>${action}`,button:(title,attrs='')=>`<button ${attrs}>${title}</button>`,empty:title=>title,topicName:()=>'',topicOptions:()=>'',safeUrl:DeskModel.safeUrl,readingSourcesView:()=>'<h1>Sources</h1>',document:{addEventListener:(type,fn)=>listeners[type]=fn},render:()=>{},setView:async()=>{},toast:msg=>{throw Error(msg)},Date};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../reading.js'),'utf8'),c);
 const dashboard=fs.readFileSync(require.resolve('../dashboard.js'),'utf8');vm.runInContext("let review=null,revealed=false;"+dashboard.slice(dashboard.indexOf('function startReview'),dashboard.indexOf('function reviewView'))+'\nglobalThis.getReview=()=>review;',c);
 return {c,listeners};
}
test('reading list/detail escape titles, show membership and keep old sources accessible',()=>{
 const {c}=screen();let html=vm.runInContext('readingView()',c);assert.ok(html.includes('Frozen Food &lt;sample&gt;'));assert.ok(html.includes('2 từ'));assert.ok(html.includes('Nguồn đã lưu'));
 vm.runInContext("readingState.activeId='p'",c);html=vm.runInContext('readingView()',c);assert.ok(html.includes('freeze'));assert.ok(html.includes('preserve'));assert.ok(!html.includes('unrelated'));assert.ok(html.includes('data-reading-link="p"'));
 vm.runInContext("readingState.tab='sources'",c);assert.ok(vm.runInContext('readingView()',c).includes('<h1>Sources</h1>'));
});
test('article search finds words inside passages and review excludes unrelated/incomplete words',async()=>{
 const {c,listeners}=screen();vm.runInContext("readingState.query='freeze'",c);const html=vm.runInContext('readingList()',c);assert.ok(html.includes('Frozen Food'));assert.ok(!html.includes('Another article'));
 const target={dataset:{readingReview:'p'}};await listeners.click({target:{closest:()=>target}});
 const review=c.getReview();assert.deepEqual(Array.from(review.ids),['w']);assert.equal(review.total,1);assert.equal(review.reschedule,false);
});
