const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../model.js');
const m=globalThis.DeskModel;
const add=(data,word,id)=>m.apply(data,{type:'UPSERT_WORD',payload:{word,id}}).data;
test('editing visible fields preserves legacy classification metadata',()=>{
 let data=add({}, {term:'learn',meaning:'học',partOfSpeech:'verb'}),id=data.words[0].id;
 data=add(data,{term:'learn',meaning:'học hỏi'},id);
 assert.equal(data.words[0].partOfSpeech,'verb');assert.equal(data.words[0].meaning,'học hỏi');
});
test('classification survives backup, trash and restore; duplicate capture preserves it',()=>{
 let data=add({}, {term:'learn',meaning:'học',partOfSpeech:'verb'}),id=data.words[0].id;
 data=add(data,{term:'learn',partOfSpeech:'noun'});assert.equal(data.words[0].partOfSpeech,'verb');
 assert.equal(m.parseBackup(m.backup(data)).words[0].partOfSpeech,'verb');
 data=m.apply(data,{type:'DELETE_WORDS',payload:{ids:[id]}}).data;
 assert.equal(data.trash[0].partOfSpeech,'verb');
 data=m.apply(data,{type:'RESTORE_WORD',payload:{id}}).data;assert.equal(data.words[0].partOfSpeech,'verb');
});
