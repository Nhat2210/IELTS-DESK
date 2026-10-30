const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
require('../model.js');
function screen(){
 const source=fs.readFileSync(require.resolve('../dashboard.js'),'utf8'),nodes={},checkboxes=[{dataset:{select:'a'}},{dataset:{select:'b'}}];
 let tableWrites=0,html='';nodes['#word-results']={get innerHTML(){return html;},set innerHTML(value){html=value;tableWrites++;}};
 const context={data:DeskModel.normalize({words:[{id:'a',term:'learn',meaning:'học',reviewCount:3},{id:'b',term:'study',meaning:''}]}),DeskModel,selectedWords:new Set(),query:'',filter:'all',collectionFilter:'',tagFilter:'',sortMode:'recent',org:{topic:'',dateField:'createdAt',range:''},$:(s)=>nodes[s]??={},document:{querySelectorAll:()=>checkboxes},esc:s=>String(s??''),icon:()=>'',renderFilterChips:()=>{},sourceName:()=>'',topicName:()=>'',dateLabel:()=>'',fullDateFormat:new Intl.DateTimeFormat('vi-VN'),stateLabels:{},empty:()=>''};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function filteredWords'),source.indexOf('let vocabularyFiltersOpen'))+source.slice(source.indexOf('function updateWordResults'),source.indexOf('function openWordModal')),context);
 vm.runInContext('updateWordResults()',context);
 return {context,nodes,checkboxes,writes:()=>tableWrites};
}
test('selection and clear update controls without rebuilding the table or its scroll container',()=>{
 const {context,nodes,checkboxes,writes}=screen();const initial=nodes['#word-results'].innerHTML;
 context.selectedWords.add('a');vm.runInContext('updateWordSelection()',context);
 assert.equal(writes(),1);assert.equal(nodes['#word-results'].innerHTML,initial);assert.equal(checkboxes[0].checked,true);assert.equal(nodes['#select-visible'].indeterminate,true);
 context.selectedWords.add('b');vm.runInContext('updateWordSelection()',context);assert.equal(nodes['#select-visible'].checked,true);assert.equal(nodes['#select-visible'].indeterminate,false);
 assert.ok(nodes['#selection-actions'].innerHTML.includes('Xóa 2 từ'));assert.ok(nodes['#selection-actions'].innerHTML.includes('Ôn 1 từ có nghĩa'));
 context.selectedWords.clear();vm.runInContext('updateWordSelection()',context);assert.equal(writes(),1);assert.equal(nodes['#selection-actions'].innerHTML,'');assert.ok(checkboxes.every(c=>!c.checked));
});
test('filtering still rebuilds results with matching table headers and cells',()=>{
 const {context,nodes,writes}=screen();context.query='learn';vm.runInContext('updateWordResults()',context);
 const html=nodes['#word-results'].innerHTML;assert.equal(writes(),2);assert.equal((html.match(/<th scope=/g)||[]).length,7);assert.equal((html.match(/<td class=/g)||[]).length,7);assert.ok(html.includes('3 lần'));assert.ok(!html.includes('word-tags'));
});
