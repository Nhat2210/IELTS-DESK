/* Pure data model shared by the worker, preview and verification scripts. */
(() => {
  const VERSION=3, DAY=86400000, intervals=[1,3,7,14,30,60];
  const fail=(message,code='INVALID',details={})=>{throw Object.assign(new Error(message),{code,...details});};
  const text=(value,max=10000)=>typeof value==='string'?value.slice(0,max):'';
  const key=value=>text(value,90).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
  const hash=value=>{let h=2166136261;for(const char of value){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
  const term=value=>{const s=text(value,1000).trim().replace(/\s+/g,' ');if(!s||s.length>90)fail('Từ / cụm từ cần có từ 1 đến 90 ký tự.');return s;};
  const finite=(value,fallback=0)=>Number.isFinite(value)&&value>=0?value:fallback;
  const uid=()=>crypto.randomUUID();
  const url=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  const tags=value=>[...new Set((Array.isArray(value)?value:typeof value==='string'?value.split(','):[]).map(v=>text(v,40).trim().toLocaleLowerCase('vi')).filter(Boolean))].slice(0,20);
  const dayKey=(date=new Date())=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const occurrence=(input,now)=>({id:text(input.id,100)||uid(),url:url(input.url),title:text(input.title,300).trim(),sentence:text(input.sentence,3000).trim(),createdAt:finite(input.createdAt,now)});
  function addContexts(a,b){const result=[...a];for(const item of b){if(!(item.url||item.title||item.sentence))continue;if(!result.some(old=>old.url===item.url&&old.title===item.title&&old.sentence===item.sentence))result.push(item);}return result;}
  function normalizeWord(raw,events=[],now=Date.now()) {
    if(!raw||typeof raw!=='object')fail('Bản ghi từ vựng không hợp lệ.');
    const wordEvents=(events instanceof Map?(events.get(raw.id)||[]):events.filter(event=>event.wordId===raw.id)).slice().sort((a,b)=>a.at-b.at), count=Math.max(finite(raw.reviewCount),wordEvents.length,raw.ease?1:0);
    const contexts=Array.isArray(raw.contexts)?raw.contexts.map(item=>occurrence(item,now)):[];
    const main=occurrence({url:raw.source,title:raw.sourceLabel||raw.title,sentence:raw.context},now);
    return {id:text(raw.id,100)||uid(),term:term(raw.term),meaning:text(raw.meaning).trim(),example:text(raw.example).trim(),context:text(raw.context,3000).trim(),source:url(raw.source),title:text(raw.title,300),sourceLabel:text(raw.sourceLabel,300).trim(),collection:text(raw.collection,80).trim(),groupId:text(raw.groupId,100),topicId:text(raw.topicId,100),tags:tags(raw.tags),contexts:addContexts(contexts,[main]),createdAt:finite(raw.createdAt,now),updatedAt:finite(raw.updatedAt,finite(raw.createdAt,now)),dueAt:finite(raw.dueAt,now),reviewCount:count,stage:Math.min(6,Math.floor(finite(raw.stage,raw.ease?1:0))),lastReviewedAt:Math.max(finite(raw.lastReviewedAt),...wordEvents.map(e=>e.at),0),lastResult:raw.lastResult==='again'||raw.lastResult==='good'?raw.lastResult:wordEvents.at(-1)?.remembered===false?'again':count?'good':'',intervalDays:finite(raw.intervalDays),ease:raw.ease?1:0};
  }
  function normalize(raw={},now=Date.now()) {
    const rawEvents=Array.isArray(raw.studyEvents)?raw.studyEvents.filter(e=>e&&Number.isFinite(e.at)&&e.at>0&&typeof e.wordId==='string').map(e=>({id:text(e.id,160)||`${e.wordId}:${e.at}:${e.remembered?'1':'0'}`,at:e.at,wordId:e.wordId,remembered:Boolean(e.remembered),rescheduled:e.rescheduled!==false})):[];
    const studyEvents=[...new Map(rawEvents.map(e=>[e.id,e])).values()],eventMap=new Map();for(const event of studyEvents){if(!eventMap.has(event.wordId))eventMap.set(event.wordId,[]);eventMap.get(event.wordId).push(event);}
    const words=Array.isArray(raw.words)?raw.words.map(w=>normalizeWord(w,eventMap,now)):[];
    const drafts=Array.isArray(raw.drafts)?raw.drafts.map(d=>normalizeDraft(d,now)):[];
    if(!Array.isArray(raw.drafts)&&typeof raw.writing==='string')drafts.push(normalizeDraft({id:'legacy-writing',title:'Bản nháp hiện tại',task:'task2',prompt:samplePrompts[finite(raw.writingPromptIndex)%3].text,body:raw.writing},now));
    const topics=(Array.isArray(raw.topics)?raw.topics:[]).map(t=>({id:text(t.id,100)||uid(),name:text(t.name,80).trim()})).filter(t=>t.name);
    const groups=(Array.isArray(raw.groups)?raw.groups:[]).map(g=>({id:text(g.id,100)||uid(),name:text(g.name,80).trim(),topicId:topics.some(t=>t.id===g.topicId)?g.topicId:''})).filter(g=>g.name);
    for(const word of words){let group=groups.find(g=>g.id===word.groupId);if(!group&&word.collection){group=groups.find(g=>key(g.name)===key(word.collection));if(!group){group={id:`legacy-group-${hash(word.collection)}`,name:word.collection,topicId:''};groups.push(group);}}word.groupId=group?.id||'';word.collection=group?.name||'';word.topicId=group?.topicId||(topics.some(t=>t.id===word.topicId)?word.topicId:'');}
    const notes=(Array.isArray(raw.notes)?raw.notes:[]).map(n=>normalizeNote(n,now));
    for(const note of notes){const group=groups.find(g=>g.id===note.groupId);note.groupId=group?.id||'';note.topicId=group?.topicId||(topics.some(t=>t.id===note.topicId)?note.topicId:'');}
    const deletedNotes=(Array.isArray(raw.deletedNotes)?raw.deletedNotes:[]).map(n=>normalizeNote(n,now));
    const settings={captureEnabled:Boolean(raw.settings?.captureEnabled),excludedSites:normalizeSites(raw.settings?.excludedSites||[])};
    return {schemaVersion:VERSION,revision:finite(raw.revision),words,drafts,topics,groups,notes,deletedNotes,studyEvents,legacySessions:finite(raw.legacySessions,Math.max(0,finite(raw.sessions)-studyEvents.length)),sessions:finite(raw.legacySessions,Math.max(0,finite(raw.sessions)-studyEvents.length))+studyEvents.length,streak:finite(raw.streak),lastStudy:text(raw.lastStudy,100),deletedDrafts:Array.isArray(raw.deletedDrafts)?raw.deletedDrafts.map(d=>normalizeDraft(d,now)):[],trash:Array.isArray(raw.trash)?raw.trash.map(w=>({...normalizeWord(w,eventMap,now),deletedAt:finite(w.deletedAt,now)})):[],settings,recoverySnapshot:raw.recoverySnapshot||null};
  }
  function normalizeDraft(d,now=Date.now()){if(!d||typeof d!=='object')fail('Bản nháp không hợp lệ.');return{id:text(d.id,100)||uid(),importKey:text(d.importKey,180),title:text(d.title,120).trim()||'Bài viết chưa đặt tên',task:d.task==='task1'?'task1':'task2',prompt:text(d.prompt,10000).trim(),body:text(d.body,200000),checklist:[0,1,2,3].map(i=>Boolean(d.checklist?.[i])),createdAt:finite(d.createdAt,now),updatedAt:finite(d.updatedAt,now)};}
  function normalizeNote(n,now=Date.now()){if(!n||typeof n!=='object')fail('Ghi chú không hợp lệ.');return {id:text(n.id,100)||uid(),title:text(n.title,120).trim()||'Ghi chú chưa đặt tên',body:text(n.body,100000),topicId:text(n.topicId,100),groupId:text(n.groupId,100),skill:['reading','listening','writing','speaking'].includes(n.skill)?n.skill:'',wordIds:[...new Set(Array.isArray(n.wordIds)?n.wordIds.filter(v=>typeof v==='string'):[])],pinned:Boolean(n.pinned),dailyKey:text(n.dailyKey,10),importKey:text(n.importKey,180),createdAt:finite(n.createdAt,now),updatedAt:finite(n.updatedAt,now)};}
  function inDateRange(timestamp,{range='',from='',to=''}={},now=Date.now()){
    if(!range||(range==='custom'&&!from&&!to))return true;if(!timestamp)return false;
    const today=new Date(now);today.setHours(0,0,0,0);let start,end;
    if(range==='today'){start=new Date(today);end=new Date(today);end.setDate(end.getDate()+1);}
    else if(range==='yesterday'){start=new Date(today);start.setDate(start.getDate()-1);end=new Date(today);}
    else if(range==='week'){start=new Date(today);start.setDate(start.getDate()-6);end=new Date(today);end.setDate(end.getDate()+1);}
    else if(range==='month'){start=new Date(today.getFullYear(),today.getMonth(),1);end=new Date(today);end.setDate(end.getDate()+1);}
    else {if(from)start=new Date(`${from}T00:00:00`);if(to){end=new Date(`${to}T00:00:00`);end.setDate(end.getDate()+1);}}
    return (!start||timestamp>=start.getTime())&&(!end||timestamp<end.getTime());
  }
  function normalizeSites(value){const list=typeof value==='string'?value.split(/[\n,]+/):value;if(!Array.isArray(list))fail('Danh sách website không hợp lệ.');return [...new Set(list.map(item=>{const input=text(item,300).trim().toLowerCase();if(!input)return '';let host;try{host=new URL(input.includes('://')?input:`https://${input}`).hostname;}catch{fail(`Website không hợp lệ: ${input}`);}if(!/^(localhost|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/.test(host)||host.includes('..'))fail(`Website không hợp lệ: ${input}`);return host;}).filter(Boolean))];}
  function state(word){if(!word.meaning.trim())return 'incomplete';if(!word.reviewCount)return 'new';return word.stage>=3&&word.lastResult!=='again'?'remembered':'learning';}
  const ready=word=>Boolean(word.meaning.trim());
  function snapshot(data){const result=structuredClone(data);delete result.recoverySnapshot;return result;}
  function parseBackup(input){
    if(!input||input.app!=='IELTS Desk'||input.formatVersion!==1||!input.data||typeof input.data!=='object')fail('Đây không phải bản sao lưu IELTS Desk được hỗ trợ.');
    if(input.data.schemaVersion>VERSION)fail('Bản sao lưu thuộc phiên bản mới hơn. Hãy cập nhật extension trước.');
    if(!Array.isArray(input.data.words)||!Array.isArray(input.data.drafts)||!Array.isArray(input.data.studyEvents))fail('Bản sao lưu thiếu dữ liệu bắt buộc.');
    if(input.data.words.length>50000||input.data.drafts.length>5000)fail('Bản sao lưu vượt giới hạn số bản ghi.');
    for(const word of input.data.words)if(!word||typeof word.term!=='string'||typeof word.meaning!=='string'||word.meaning.length>10000||typeof word.example!=='string'||word.example.length>10000)fail('Có bản ghi từ vựng không hợp lệ trong file.');for(const draft of input.data.drafts)if(!draft||typeof draft.body!=='string'||draft.body.length>200000||typeof draft.title!=='string')fail('Có bản nháp không hợp lệ trong file.');
    for(const field of ['topics','groups','notes','deletedNotes'])if(input.data[field]!==undefined&&!Array.isArray(input.data[field]))fail('Dữ liệu chủ đề / ghi chú không hợp lệ.');
    for(const n of [...(input.data.notes||[]),...(input.data.deletedNotes||[])])if(!n||typeof n.title!=='string'||typeof n.body!=='string'||n.body.length>100000)fail('Ghi chú trong bản sao lưu không hợp lệ.');
    const imported=normalize(input.data);const seen=new Set();for(const w of imported.words){if(seen.has(w.id))fail('File chứa ID từ vựng trùng nhau.');seen.add(w.id);}for(const records of [imported.drafts,imported.trash,imported.deletedDrafts,imported.topics,imported.groups,imported.notes,imported.deletedNotes]){const ids=new Set();for(const row of records){if(ids.has(row.id))fail('File chứa ID bản ghi trùng nhau.');ids.add(row.id);}}return imported;
  }
  function draftContent(draft){return JSON.stringify([draft.title,draft.task,draft.prompt,draft.body,draft.checklist]);}
  function draftImportKey(draft){return `${draft.id}:${draft.updatedAt}:${hash(JSON.stringify([draft.title,draft.prompt,draft.body,draft.checklist]))}`;}
  function importStats(data,backup){const incoming=parseBackup(backup);const keys=new Set(data.words.map(w=>key(w.term)));let added=0,merged=0;for(const w of incoming.words){if(keys.has(key(w.term)))merged++;else{added++;keys.add(key(w.term));}}const draftsAdded=incoming.drafts.filter(draft=>{const existing=data.drafts.find(d=>d.id===draft.id);return !existing||(draftContent(draft)!==draftContent(existing)&&!data.drafts.some(d=>d.importKey===draftImportKey(draft)));}).length;return {wordsAdded:added,wordsMerged:merged,draftsAdded,events:incoming.studyEvents.filter(e=>!data.studyEvents.some(old=>old.id===e.id)).length,notes:incoming.notes.length,topics:incoming.topics.length,groups:incoming.groups.length,trash:incoming.trash.length};}

  function combine(existing,incoming){
    for(const field of ['meaning','example','context','source','title','sourceLabel','collection','groupId','topicId'])if(!existing[field])existing[field]=incoming[field];
    existing.tags=tags([...existing.tags,...incoming.tags]);existing.contexts=addContexts(existing.contexts,incoming.contexts);
    if(incoming.lastReviewedAt>existing.lastReviewedAt)for(const field of ['lastReviewedAt','lastResult','stage','intervalDays','dueAt','ease'])existing[field]=incoming[field];
    existing.reviewCount=Math.max(existing.reviewCount,incoming.reviewCount);existing.updatedAt=Math.max(existing.updatedAt,incoming.updatedAt);return existing;
  }
  function apply(raw,command,now=Date.now()) {
    let data=normalize(raw,now);const p=command.payload||{};let result={};
    switch(command.type){
      case 'UPSERT_TOPIC':case 'UPSERT_GROUP':{
        const isTopic=command.type==='UPSERT_TOPIC',list=isTopic?data.topics:data.groups,name=text(p.name,80).trim();if(!name)fail('Nhập tên trước khi lưu.');
        const existing=list.find(item=>item.id===p.id);if(p.id&&!existing)fail('Không tìm thấy chủ đề / nhóm.');if(list.some(item=>item.id!==p.id&&key(item.name)===key(name)))fail('Tên này đã tồn tại.');
        if(!isTopic&&p.topicId&&!data.topics.some(t=>t.id===p.topicId))fail('Chủ đề không còn tồn tại.');
        const item={id:existing?.id||uid(),name,...(!isTopic?{topicId:p.topicId||''}:{})};if(existing)Object.assign(existing,item);else list.push(item);
        if(!isTopic){for(const word of data.words)if(word.groupId===item.id){word.collection=name;word.topicId=item.topicId;}for(const note of data.notes)if(note.groupId===item.id)note.topicId=item.topicId;}
        result={id:item.id};break;
      }
      case 'DELETE_TOPIC':case 'DELETE_GROUP':{
        const isTopic=command.type==='DELETE_TOPIC',list=isTopic?data.topics:data.groups;if(!list.some(item=>item.id===p.id))fail('Không tìm thấy chủ đề / nhóm.');
        if(isTopic){data.topics=data.topics.filter(t=>t.id!==p.id);for(const group of data.groups)if(group.topicId===p.id)group.topicId='';}
        else data.groups=data.groups.filter(g=>g.id!==p.id);
        for(const item of [...data.words,...data.notes,...data.trash,...data.deletedNotes]){if(isTopic&&item.topicId===p.id)item.topicId='';if(!isTopic&&item.groupId===p.id){item.groupId='';if('collection'in item)item.collection='';}}
        break;
      }
      case 'MOVE_WORDS':{
        const group=data.groups.find(g=>g.id===p.groupId);if(p.groupId&&!group)fail('Nhóm không còn tồn tại.');if(p.topicId&&!data.topics.some(t=>t.id===p.topicId))fail('Chủ đề không còn tồn tại.');
        if(!Array.isArray(p.ids))fail('Chọn từ cần chuyển.');for(const word of data.words)if(p.ids.includes(word.id)){word.groupId=group?.id||'';word.collection=group?.name||'';word.topicId=group?.topicId||p.topicId||'';word.updatedAt=now;}break;
      }
      case 'UPSERT_WORDS':{
        if(!Array.isArray(p.words)||!p.words.length||p.words.length>500)fail('Mỗi lần thêm từ 1 đến 500 từ.');let added=0,merged=0;
        for(const word of p.words){const next=apply(data,{type:'UPSERT_WORD',payload:{word}},now);data=next.data;next.result.duplicate?merged++:added++;}result={added,merged};break;
      }
      case 'UPSERT_NOTE':case 'PATCH_NOTE':{
        const existing=data.notes.find(n=>n.id===p.id);if(p.id&&!existing)fail('Ghi chú đã bị xóa.','NOT_FOUND');const values=p.note||{};if(!p.id&&values.dailyKey){const daily=data.notes.find(n=>n.dailyKey===values.dailyKey);if(daily){result={noteId:daily.id};break;}}
        const note=normalizeNote({...existing,...values,id:existing?.id||uid(),createdAt:existing?.createdAt||now,updatedAt:now},now);
        const group=data.groups.find(g=>g.id===note.groupId);if(note.groupId&&!group)fail('Nhóm không còn tồn tại.');if(group)note.topicId=group.topicId;if(note.topicId&&!data.topics.some(t=>t.id===note.topicId))fail('Chủ đề không còn tồn tại.');
        note.wordIds=note.wordIds.filter(id=>data.words.some(w=>w.id===id));if(existing)Object.assign(existing,note);else data.notes.unshift(note);result={noteId:note.id};break;
      }
      case 'DELETE_NOTE':{const note=data.notes.find(n=>n.id===p.id);if(!note)fail('Không tìm thấy ghi chú.');data.deletedNotes.push(note);data.notes=data.notes.filter(n=>n.id!==p.id);break;}
      case 'RESTORE_NOTE':{const note=data.deletedNotes.find(n=>n.id===p.id);if(!note)fail('Không tìm thấy ghi chú.');data.deletedNotes=data.deletedNotes.filter(n=>n!==note);if(data.notes.some(n=>n.id===note.id))note.id=uid();data.notes.unshift(note);result={noteId:note.id};break;}
      case 'UPSERT_WORD':{
        const values={...(p.word||{})};if('groupId'in values){const group=data.groups.find(g=>g.id===values.groupId);if(values.groupId&&!group)fail('Nhóm không còn tồn tại.');values.collection=group?.name||'';values.topicId=group?.topicId||values.topicId||'';}if(values.topicId&&!data.topics.some(t=>t.id===values.topicId))fail('Chủ đề không còn tồn tại.');const normalized=term(values.term), existing=data.words.find(w=>p.id?w.id===p.id:key(w.term)===key(normalized));
        const collision=data.words.find(w=>w.id!==p.id&&key(w.term)===key(normalized));
        if(p.id&&!existing)fail('Từ này đã bị xóa.','NOT_FOUND');
        if(p.id&&collision)fail('Từ này đã có trong sổ. Hãy mở bản đã lưu để chỉnh sửa.','DUPLICATE',{wordId:collision.id});
        if(p.id){const merged=normalizeWord({...existing,...values,id:existing.id,term:normalized,updatedAt:now},data.studyEvents,now);merged.contexts=addContexts(existing.contexts,merged.contexts);Object.assign(existing,merged);result={wordId:existing.id};}
        else {const incoming=normalizeWord({...values,id:uid(),term:normalized,createdAt:now,updatedAt:now},[],now);if(existing){combine(existing,incoming);existing.updatedAt=now;result={duplicate:true,wordId:existing.id};}else{data.words.unshift(incoming);result={duplicate:false,wordId:incoming.id};}}
        break;
      }
      case 'DELETE_WORD':{const word=data.words.find(w=>w.id===p.id);if(!word)fail('Từ này không còn trong sổ.','NOT_FOUND');data.words=data.words.filter(w=>w.id!==p.id);data.trash.unshift({...word,deletedAt:now});result={deletedId:p.id};break;}
      case 'RESTORE_WORD':{const word=data.trash.find(w=>w.id===p.id);if(!word)fail('Không tìm thấy từ trong thùng rác.','NOT_FOUND');const existing=data.words.find(w=>key(w.term)===key(word.term));if(existing)combine(existing,word);else{delete word.deletedAt;data.words.unshift(word);}data.trash=data.trash.filter(w=>w.id!==p.id);result={wordId:existing?.id||word.id};break;}
      case 'REVIEW_WORD':{
        const w=data.words.find(w=>w.id===p.id);if(!w)fail('Từ này đã bị xóa.','NOT_FOUND');if(!ready(w))fail('Thêm nghĩa trước khi ôn từ này.');if(!['again','good'].includes(p.rating))fail('Kết quả ôn không hợp lệ.');
        const good=p.rating==='good';w.reviewCount++;w.lastReviewedAt=now;w.lastResult=p.rating;w.updatedAt=now;
        if(p.reschedule!==false){w.stage=good?Math.min(w.stage+1,6):0;w.intervalDays=good?intervals[w.stage-1]:0;w.dueAt=now+(good?w.intervalDays*DAY:1800000);}w.ease=good?1:0;
        const today=dayKey(now),yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);const previous=data.lastStudy?dayKey(data.lastStudy):'';
        data.streak=previous===today?data.streak:previous===dayKey(yesterday)?data.streak+1:1;data.lastStudy=new Date(now).toISOString();data.studyEvents.push({id:uid(),at:now,wordId:w.id,remembered:good,rescheduled:p.reschedule!==false});data.sessions=data.legacySessions+data.studyEvents.length;result={dueAt:w.dueAt};break;
      }
      case 'UPSERT_DRAFT':{const existing=data.drafts.find(d=>d.id===p.id);if(p.id&&!existing)fail('Bản nháp này đã bị xóa.','NOT_FOUND');const draft=normalizeDraft({...existing,...p.draft,id:existing?.id||uid(),updatedAt:now,createdAt:existing?.createdAt||now},now);if(existing)Object.assign(existing,draft);else data.drafts.unshift(draft);result={draftId:draft.id};break;}
      case 'PATCH_DRAFT':{const draft=data.drafts.find(d=>d.id===p.id);if(!draft)fail('Bản nháp này không còn tồn tại.','NOT_FOUND');if('body'in p)draft.body=text(p.body,200000);if('checklist'in p)draft.checklist=[0,1,2,3].map(i=>Boolean(p.checklist[i]));draft.updatedAt=now;result={draftId:draft.id};break;}
      case 'DELETE_DRAFT':{const index=data.drafts.findIndex(d=>d.id===p.id);if(index<0)fail('Không tìm thấy bản nháp.','NOT_FOUND');data.deletedDrafts.push(data.drafts[index]);data.drafts.splice(index,1);break;}
      case 'RESTORE_DRAFT':{const draft=data.deletedDrafts.find(d=>d.id===p.id);if(!draft)fail('Không tìm thấy bài viết trong thùng rác.','NOT_FOUND');if(data.drafts.some(d=>d.id===draft.id))draft.id=uid();data.drafts.unshift(draft);data.deletedDrafts=data.deletedDrafts.filter(d=>d!==draft);result={draftId:draft.id};break;}
      case 'PATCH_SETTINGS':{if('captureEnabled'in p)data.settings.captureEnabled=Boolean(p.captureEnabled);if('excludedSites'in p)data.settings.excludedSites=normalizeSites(p.excludedSites);break;}
      case 'IMPORT':{
        const incoming=parseBackup(p.backup);result=importStats(data,p.backup);const before=snapshot(data);const idMap=new Map();
        const topicMap=new Map(),groupMap=new Map();
        for(const topic of incoming.topics){let match=data.topics.find(t=>key(t.name)===key(topic.name));if(!match){match={...topic,id:data.topics.some(t=>t.id===topic.id)?uid():topic.id};data.topics.push(match);}topicMap.set(topic.id,match.id);}
        for(const group of incoming.groups){let match=data.groups.find(g=>key(g.name)===key(group.name));if(!match){match={...group,id:data.groups.some(g=>g.id===group.id)?uid():group.id,topicId:topicMap.get(group.topicId)||''};data.groups.push(match);}groupMap.set(group.id,match.id);}
        for(const item of [...incoming.words,...incoming.trash,...incoming.notes,...incoming.deletedNotes]){item.topicId=topicMap.get(item.topicId)||'';item.groupId=groupMap.get(item.groupId)||'';const group=data.groups.find(g=>g.id===item.groupId);if(group)item.topicId=group.topicId;if('collection'in item)item.collection=group?.name||'';}
        for(const word of incoming.words){const existing=data.words.find(w=>key(w.term)===key(word.term));if(existing){idMap.set(word.id,existing.id);combine(existing,word);}else{const oldId=word.id;if(data.words.some(w=>w.id===word.id))word.id=uid();idMap.set(oldId,word.id);data.words.push(word);}}
        for(const draft of incoming.drafts){const existing=data.drafts.find(d=>d.id===draft.id);if(!existing)data.drafts.push(draft);else if(draftContent(draft)!==draftContent(existing)){const importKey=draftImportKey(draft);if(!data.drafts.some(d=>d.importKey===importKey))data.drafts.push({...draft,id:uid(),importKey,title:`${draft.title} (bản nhập)`});}}
        for(const note of incoming.notes){note.wordIds=note.wordIds.map(id=>idMap.get(id)||id);const existing=data.notes.find(n=>n.id===note.id);const content=n=>JSON.stringify([n.title,n.body,n.topicId,n.groupId,n.skill,n.wordIds,n.pinned,n.dailyKey]);if(!existing)data.notes.push(note);else if(content(existing)!==content(note)){const importKey=`${note.id}:${hash(content(note))}`;if(!data.notes.some(n=>n.importKey===importKey))data.notes.push({...note,id:uid(),importKey,title:`${note.title} (bản nhập)`});}}
        for(const note of incoming.deletedNotes)if(!data.notes.some(n=>n.id===note.id)&&!data.deletedNotes.some(n=>n.id===note.id))data.deletedNotes.push(note);
        const eventIds=new Set(data.studyEvents.map(e=>e.id));for(const event of incoming.studyEvents)if(!eventIds.has(event.id)){data.studyEvents.push({...event,wordId:idMap.get(event.wordId)||event.wordId});eventIds.add(event.id);}
        for(const word of incoming.trash)if(!data.words.some(w=>w.id===word.id)&&!data.trash.some(w=>w.id===word.id))data.trash.push(word);
        for(const draft of incoming.deletedDrafts)if(!data.drafts.some(d=>d.id===draft.id)&&!data.deletedDrafts.some(d=>d.id===draft.id))data.deletedDrafts.push(draft);
        data.legacySessions=Math.max(data.legacySessions,incoming.legacySessions);data.sessions=data.legacySessions+data.studyEvents.length;
        if(new Date(incoming.lastStudy)>new Date(data.lastStudy||0)){data.lastStudy=incoming.lastStudy;data.streak=incoming.streak;}data.recoverySnapshot={at:now,data:before};break;
      }
      case 'RESTORE_SNAPSHOT':{if(!raw.recoverySnapshot?.data)fail('Chưa có dữ liệu khôi phục trước khi nhập.');const current=snapshot(data),restored=normalize(raw.recoverySnapshot.data,now);restored.recoverySnapshot={at:now,data:current};restored.revision=data.revision+1;return {data:restored,result:{restored:true}};}
      default:fail('Thao tác không được hỗ trợ.');
    }
    data=normalize(data,now);data.revision++;return {data,result};
  }
  const samplePrompts=[
    {type:'Agree or disagree',text:'Some people believe that cities should invest more in public transport rather than building new roads. To what extent do you agree or disagree?'},
    {type:'Discuss both views',text:'Some people think that children should learn a foreign language at primary school, while others believe it is better to start at secondary school. Discuss both views and give your opinion.'},
    {type:'Advantages and disadvantages',text:'More people are choosing to work from home rather than in an office. Do the advantages of this development outweigh the disadvantages?'}
  ];
  globalThis.DeskModel={VERSION,normalize,apply,inDateRange,state,ready,key,dayKey,safeUrl:url,tags,normalizeSites,importStats,parseBackup,samplePrompts,backup:data=>({app:'IELTS Desk',formatVersion:1,exportedAt:new Date().toISOString(),data:snapshot(normalize(data))})};
})();
