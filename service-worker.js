importScripts('model.js','capture-utils.js');
let queue=Promise.resolve();
function serial(task){const next=queue.then(task);queue=next.catch(()=>{});return next;}
async function readData(){
  const raw=await chrome.storage.local.get(null);
  if(raw.schemaVersion===DeskModel.VERSION)return DeskModel.normalize(raw);
  if(!raw.settings){const scripts=await chrome.scripting.getRegisteredContentScripts();raw.settings={captureEnabled:scripts.some(script=>script.id==='selection-chip'),excludedSites:[]};}
  const data=DeskModel.normalize(raw);
  await chrome.storage.local.set({...data,migrationBackup:raw});return data;
}
async function captureStatus(settings){
  const permissionGranted=await chrome.permissions.contains({origins:['http://*/*','https://*/*']});
  const scripts=await chrome.scripting.getRegisteredContentScripts();
  return {permissionGranted,enabled:settings.captureEnabled&&permissionGranted&&scripts.some(script=>script.id==='selection-chip'),excludedSites:settings.excludedSites};
}
async function syncCapture(settings){
  const allowed=await chrome.permissions.contains({origins:['http://*/*','https://*/*']});
  await chrome.scripting.unregisterContentScripts({ids:['selection-chip']}).catch(()=>{});
  if(settings.captureEnabled&&allowed)await chrome.scripting.registerContentScripts([{id:'selection-chip',matches:['http://*/*','https://*/*'],excludeMatches:settings.excludedSites.flatMap(host=>host==='localhost'||/^(\d{1,3}\.){3}\d{1,3}$/.test(host)?[`*://${host}/*`]:[`*://${host}/*`,`*://*.${host}/*`]),js:['capture-utils.js','content.js'],runAt:'document_idle'}]);
  const config={enabled:settings.captureEnabled&&allowed,excludedSites:settings.excludedSites};
  const tabs=await chrome.tabs.query({});await Promise.all(tabs.map(tab=>chrome.tabs.sendMessage(tab.id,{type:'IELTS_CAPTURE_CONFIG',config}).catch(()=>{})));
}
async function command(type,payload){
  const before=await readData(),{data,result}=DeskModel.apply(before,{type,payload});
  if(type==='PATCH_SETTINGS'||type==='RESTORE_SNAPSHOT'){
    try{await syncCapture(data.settings);await chrome.storage.local.set(data);}catch(error){await syncCapture(before.settings).catch(()=>{});throw new Error('Chưa lưu được dữ liệu hoặc tùy chọn website. Dữ liệu cũ vẫn được giữ. Bạn thử lại nhé.');}
  }else await chrome.storage.local.set(data);
  return {data,result};
}
const uiSender=sender=>sender.url?.startsWith(chrome.runtime.getURL(''));
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  let task;
  if(message.type==='DESK_GET'&&uiSender(sender))task=()=>readData();
  else if(message.type==='DESK_COMMAND'&&uiSender(sender))task=()=>command(message.command,message.payload);
  else if(message.type==='IELTS_CAPTURE_STATE')task=async()=>captureStatus((await readData()).settings);
  else if(message.type==='IELTS_SAVE_SELECTION')task=async()=>{
    const sentence=typeof message.context==='string'?message.context:'';
    const {result}=await command('UPSERT_WORD',{word:{term:message.term,context:sentence,source:sender.tab?.url||'',title:sender.tab?.title||''}});return result;
  };
  else return;
  serial(task).then(result=>sendResponse({ok:true,result}),error=>sendResponse({ok:false,error:{message:error.message,code:error.code||'FAILED',wordId:error.wordId}}));return true;
});
async function setup(){await serial(async()=>{const data=await readData();await syncCapture(data.settings);});}
chrome.runtime.onInstalled.addListener(async()=>{await chrome.contextMenus.removeAll();chrome.contextMenus.create({id:'save-ielts-word',title:'Lưu vào IELTS Desk',contexts:['selection']});await setup().catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>setup().catch(()=>{}));
chrome.permissions.onRemoved.addListener(()=>setup().catch(()=>{}));
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  if(info.menuItemId!=='save-ielts-word')return;
  try{
    let context='';
    if(tab?.id)try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['capture-utils.js']});const values=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>globalThis.DeskCapture.selectionData()});const selected=values[0]?.result;if(selected?.term.trim()===info.selectionText?.trim())context=selected.sentence;}catch{}
    const {result}=await serial(()=>command('UPSERT_WORD',{word:{term:info.selectionText,source:tab?.url||'',title:tab?.title||'',context}}));
    await chrome.action.setBadgeText({text:result.duplicate?'=':'1',tabId:tab?.id});await chrome.action.setBadgeBackgroundColor({color:'#D92344'});
  }catch{await chrome.action.setBadgeText({text:'!',tabId:tab?.id});}
  setTimeout(()=>chrome.action.setBadgeText({text:'',tabId:tab?.id}),1800);
});
