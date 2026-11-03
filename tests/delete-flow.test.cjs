const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
require('../model.js');
const m=globalThis.DeskModel;
function transport(sendMessage){
 const c={DeskModel:m,chrome:{storage:{local:{}},runtime:{sendMessage}},window:{},document:{querySelectorAll:()=>[]}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../common.js'),'utf8'),c);return c.window.Desk.store;
}
test('extension transport deletes one and several words through the actual worker listener',async()=>{
 let saved=m.normalize({words:[{id:'a',term:'freeze',meaning:'đông lạnh'},{id:'b',term:'preserve',meaning:'bảo quản'}]}),listener;
 const noop={addListener:()=>{}};
 const chrome={storage:{local:{get:async()=>structuredClone(saved),set:async patch=>{saved={...saved,...structuredClone(patch)};}}},runtime:{getURL:()=> 'chrome-extension://test/',onMessage:{addListener:fn=>listener=fn},onInstalled:noop,onStartup:noop},permissions:{onRemoved:noop},contextMenus:{onClicked:noop}};
 const worker={chrome,DeskModel:m,importScripts:()=>{},setTimeout:()=>{},URL};vm.createContext(worker);vm.runInContext(fs.readFileSync(require.resolve('../service-worker.js'),'utf8'),worker);
 const store=transport(message=>new Promise(resolve=>listener(message,{url:'chrome-extension://test/dashboard.html'},resolve)));
 await store.get();let response=await store.command('DELETE_WORD',{id:'a'});assert.equal(response.data.words.length,1);assert.equal(response.data.trash[0].id,'a');
 response=await store.command('DELETE_WORDS',{ids:['b']});assert.equal(response.result.deletedCount,1);assert.equal(saved.words.length,0);assert.equal(saved.trash.length,2);
 const before=structuredClone(saved);const result=await new Promise(resolve=>listener({type:'DESK_COMMAND',command:'DELETE_WORD',payload:{id:'a'},modelVersion:m.VERSION-1},{url:'chrome-extension://test/dashboard.html'},resolve));
 assert.equal(result.error.code,'VERSION_MISMATCH');assert.deepEqual(saved,before);
});
test('stale worker schema blocks mutation before any delete request',async()=>{
 const requests=[];const store=transport(async message=>{requests.push(message);return {ok:true,result:{schemaVersion:m.VERSION-1}};});
 await assert.rejects(store.command('DELETE_WORD',{id:'a'}),e=>e.code==='VERSION_MISMATCH'&&e.message.includes('chrome://extensions'));
 assert.equal(requests.length,1);assert.equal(requests[0].type,'DESK_GET');
});
test('unsupported command from an older worker gives reload guidance without retrying deletion',async()=>{
 let deletes=0;const store=transport(async message=>message.type==='DESK_GET'?{ok:true,result:{schemaVersion:m.VERSION}}:(deletes++,{ok:false,error:{message:'Thao tác không được hỗ trợ.',code:'INVALID'}}));
 await assert.rejects(store.command('DELETE_WORDS',{ids:['a']}),/Reload IELTS Desk/);assert.equal(deletes,1);
});
function confirmScreen(ids,fail=false){
 const nodes={'[type=submit]':{disabled:false},'.form-message':{textContent:''}},handlers={},calls=[];let closed=false;
 const dialog={setAttribute:()=>{},querySelector:s=>s==='form'?{addEventListener:(type,fn)=>handlers[type]=fn}:nodes[s],close:()=>closed=true};
 const c={data:m.normalize({words:[{id:'a',term:'freeze'},{id:'b',term:'preserve'}]}),selectedWords:new Set(ids),document:{createElement:()=>dialog},button:()=>'',icon:()=>'',mountDialog:()=>{},flushNotes:async()=>{},mutate:async(type,payload)=>{calls.push({type,payload});if(fail)throw Error('Reload IELTS Desk');return m.apply(c.data,{type,payload}).result;},render:()=>{},toast:()=>{},setView:()=>{}};
 vm.createContext(c);const source=fs.readFileSync(require.resolve('../dashboard.js'),'utf8');vm.runInContext(source.slice(source.indexOf('function confirmDeleteWords'),source.indexOf('function settingsView')),c);c.ids=ids;vm.runInContext('confirmDeleteWords(ids)',c);
 return {submit:()=>handlers.submit({preventDefault:()=>{}}),calls,c,nodes,closed:()=>closed};
}
test('single-word confirmation uses DELETE_WORD, bulk confirmation uses DELETE_WORDS',async()=>{
 for(const ids of [['a'],['a','b']]){const ui=confirmScreen(ids);await ui.submit();assert.equal(ui.calls[0].type,ids.length===1?'DELETE_WORD':'DELETE_WORDS');assert.equal(ui.c.selectedWords.size,0);assert.equal(ui.closed(),true);}
});
test('failed delete keeps the selection, shows the error and allows retry',async()=>{
 const ui=confirmScreen(['a'],true);await ui.submit();assert.equal(ui.c.selectedWords.size,1);assert.equal(ui.closed(),false);assert.equal(ui.nodes['[type=submit]'].disabled,false);assert.equal(ui.nodes['.form-message'].textContent,'Reload IELTS Desk');
});
