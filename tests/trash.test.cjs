const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../model.js');
const model=globalThis.DeskModel,now=1800000000000,week=7*86400000;
function fixture(){return model.normalize({words:[{id:'a',term:'learn',meaning:'học'},{id:'b',term:'study',meaning:'học tập'}],notes:[{id:'n',title:'Note',body:'Keep me',wordIds:['a']}],topics:[{id:'t',name:'Topic'}]},now);}
test('bulk delete is one operation, ignores stale IDs and preserves other content',()=>{
 const before=fixture(),{data,result}=model.apply(before,{type:'DELETE_WORDS',payload:{ids:['a','b','a','missing']}},now);
 assert.equal(result.deletedCount,2);assert.equal(data.words.length,0);assert.equal(data.trash.length,2);
 assert.ok(data.trash.every(w=>w.deletedAt===now));assert.deepEqual(data.notes,before.notes);assert.deepEqual(data.topics,before.topics);assert.equal(before.words.length,2);
});
test('restore before expiry, reject at and after seven days',()=>{
 const deleted=model.apply(fixture(),{type:'DELETE_WORDS',payload:{ids:['a']}},now).data;
 const restored=model.apply(deleted,{type:'RESTORE_WORD',payload:{id:'a'}},now+week-1).data;
 assert.equal(restored.words.length,2);assert.equal(restored.trash.length,0);
 for(const time of [now+week,now+week+1])assert.throws(()=>model.apply(deleted,{type:'RESTORE_WORD',payload:{id:'a'}},time),/thùng rác/);
 assert.equal(model.normalize(deleted,now+week).trash.length,0);
});
test('restore merges a newly added duplicate without overwriting its meaning',()=>{
 const deleted=model.apply(fixture(),{type:'DELETE_WORDS',payload:{ids:['a']}},now).data;
 deleted.words.push({id:'new',term:'learn',meaning:'New meaning'});
 const restored=model.apply(deleted,{type:'RESTORE_WORD',payload:{id:'a'}},now+1).data;
 assert.equal(restored.words.filter(w=>w.term==='learn').length,1);assert.equal(restored.words.find(w=>w.id==='new').meaning,'New meaning');assert.equal(restored.trash.length,0);
});
