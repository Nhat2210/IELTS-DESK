const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../model.js');
const m=globalThis.DeskModel,now=1800000000000;
function command(data,type,payload){return m.apply(data,{type,payload},now);}
function passage(data={},title='Frozen Food'){return command(data,'UPSERT_PASSAGE',{passage:{title,sourceLabel:'My book'}}).data;}
test('old data migrates without adding sample passages or losing words',()=>{
 const data=m.normalize({schemaVersion:3,words:[{id:'w',term:'preserve',meaning:'bảo quản'}]},now);
 assert.equal(data.passages.length,0);assert.equal(data.words[0].id,'w');assert.equal(data.schemaVersion,4);
});
test('create/edit passage preserves membership and validates title, URL and topic',()=>{
 let data=passage(),id=data.passages[0].id;
 data=command(data,'UPSERT_WORD',{word:{term:'preserve',passageId:id}}).data;
 const edited=command(data,'UPSERT_PASSAGE',{id,passage:{title:'Frozen Food — notes',url:'https://example.com/article'}}).data;
 assert.equal(edited.passages[0].wordIds.length,1);assert.equal(edited.passages[0].createdAt,now);
 for(const values of [{title:''},{title:'Test',url:'javascript:alert(1)'},{title:'Test',topicId:'missing'}])assert.throws(()=>command(data,'UPSERT_PASSAGE',{passage:values}));
});
test('a duplicate word links to multiple readings without losing meaning or review progress',()=>{
 let data=passage(),first=data.passages[0].id;
 data=command(data,'UPSERT_WORD',{word:{term:'preserve',meaning:'bảo quản',passageId:first}}).data;
 const wordId=data.words[0].id;
 data=command(data,'REVIEW_WORD',{id:wordId,rating:'good'}).data;
 data=passage(data,'Conservation');const second=data.passages[0].id;
 data=command(data,'UPSERT_WORD',{word:{term:'preserve',meaning:'do not replace',passageId:second}}).data;
 assert.equal(data.words.length,1);assert.equal(data.words[0].meaning,'bảo quản');assert.equal(data.words[0].reviewCount,1);
 assert.ok(data.passages.every(p=>p.wordIds.includes(wordId)));
 data=command(data,'UPSERT_WORD',{word:{term:'preserve',passageId:first}}).data;
 assert.equal(data.passages.find(p=>p.id===first).wordIds.length,1);
});
test('bulk add attaches both new and existing words; stale passage cannot partially write',()=>{
 let data=passage(),id=data.passages[0].id;
 data=command(data,'UPSERT_WORDS',{words:[{term:'freeze',meaning:'đông lạnh',passageId:id},{term:'preserve',passageId:id},{term:'freeze',passageId:id}]}).data;
 assert.equal(data.passages[0].wordIds.length,2);assert.equal(data.words.length,2);
 assert.throws(()=>command(data,'UPSERT_WORDS',{words:[{term:'new',passageId:id},{term:'bad',passageId:'missing'}]}));assert.equal(data.words.length,2);
});
test('link, unlink and delete passage preserve vocabulary and groups',()=>{
 let data=passage(),id=data.passages[0].id;data=command(data,'UPSERT_WORD',{word:{term:'freeze',meaning:'đông lạnh'}}).data;const wordId=data.words[0].id;
 data=command(data,'SET_PASSAGE_WORDS',{id,ids:[wordId,wordId]}).data;assert.equal(data.passages[0].wordIds.length,1);
 data=command(data,'SET_PASSAGE_WORDS',{id,ids:[]}).data;assert.equal(data.words.length,1);assert.equal(data.passages[0].wordIds.length,0);
 const result=command(data,'DELETE_PASSAGE',{id}).data;assert.deepEqual(result.words,data.words);assert.equal(result.passages.length,0);
 assert.throws(()=>command(result,'UPSERT_WORD',{word:{term:'new',passageId:id}}));
});
test('trashing and restoring a word preserves the reading link',()=>{
 let data=passage(),id=data.passages[0].id;data=command(data,'UPSERT_WORD',{word:{term:'freeze',passageId:id}}).data;const wordId=data.words[0].id;
 data=command(data,'DELETE_WORD',{id:wordId}).data;data=command(data,'SET_PASSAGE_WORDS',{id,ids:[]}).data;
 assert.ok(data.passages[0].wordIds.includes(wordId));data=command(data,'RESTORE_WORD',{id:wordId}).data;assert.equal(data.words[0].id,wordId);
});
test('backup import remaps duplicate words, preserves conflicting readings and is repeatable',()=>{
 let incoming=passage(),id=incoming.passages[0].id;incoming=command(incoming,'UPSERT_WORD',{word:{term:'freeze',meaning:'đông lạnh',passageId:id}}).data;
 const backup=m.backup(incoming);let target=command({},'UPSERT_WORD',{word:{term:'freeze',meaning:'existing'}}).data;const targetWord=target.words[0].id;
 target=command(target,'IMPORT',{backup}).data;assert.equal(target.words.length,1);assert.deepEqual(target.passages[0].wordIds,[targetWord]);assert.equal(target.words[0].meaning,'existing');
 target=command(target,'IMPORT',{backup}).data;assert.equal(target.passages.length,1);
 target=command(target,'UPSERT_PASSAGE',{id,passage:{title:'Local edit'}}).data;target=command(target,'IMPORT',{backup}).data;assert.equal(target.passages.length,2);
 target=command(target,'IMPORT',{backup}).data;assert.equal(target.passages.length,2);
});
test('topic deletion removes passage topic without deleting the reading',()=>{
 let data=command({},'UPSERT_TOPIC',{name:'Food'}).data,topicId=data.topics[0].id;
 data=command(data,'UPSERT_PASSAGE',{passage:{title:'Frozen Food',topicId}}).data;
 data=command(data,'DELETE_TOPIC',{id:topicId}).data;assert.equal(data.passages[0].topicId,'');
});
