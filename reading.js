/* Reading passages are independent of vocabulary groups; a word can belong to several passages. */
const readingState={activeId:'',tab:'passages',query:'',topic:''};
function passageOptions(selected=''){
  return '<option value="">Không thêm vào bài đọc</option>'+data.passages.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.title)}</option>`).join('');
}
function passageWords(passage){const ids=new Set(passage.wordIds);return data.words.filter(w=>ids.has(w.id));}
function readingNavigation(){return `<div class="reading-navigation" aria-label="Nội dung Reading"><button class="text-button" data-reading-tab="passages" aria-pressed="${readingState.tab==='passages'}">Reading của tôi</button><button class="text-button" data-reading-tab="sources" aria-pressed="${readingState.tab==='sources'}">Nguồn đã lưu ${icon('link')}</button></div>`;}
function readingView(){
  if(readingState.tab==='sources')return readingNavigation()+readingSourcesView();
  const passage=data.passages.find(p=>p.id===readingState.activeId);
  if(passage)return readingNavigation()+readingDetail(passage);
  readingState.activeId='';
  return readingNavigation()+heading('Reading','Gom từ theo từng bài Reading để nhớ cả nội dung và ngữ cảnh.',button('Tạo bài đọc','data-reading-action="create"','primary','plus'))+
    `<section class="reading-tools"><label class="search-field">${icon('search')}<input type="search" id="reading-search" value="${esc(readingState.query)}" placeholder="Tìm bài đọc, nguồn hoặc từ vựng…" aria-label="Tìm bài đọc"></label><label class="reading-topic-label">Chủ đề<select id="reading-topic-filter">${topicOptions(readingState.topic)}</select></label></section><div id="reading-list">${readingList()}</div>`;
}
function readingList(){
  const query=readingState.query.trim().toLocaleLowerCase('vi');
  const passages=data.passages.filter(p=>(!readingState.topic||p.topicId===readingState.topic)&&`${p.title} ${p.sourceLabel} ${p.notes} ${passageWords(p).map(w=>`${w.term} ${w.meaning}`).join(' ')}`.toLocaleLowerCase('vi').includes(query));
  if(!passages.length)return empty(data.passages.length?'Chưa tìm thấy bài đọc':'Bài Reading đầu tiên của bạn',data.passages.length?'Thử tên bài, tên sách hoặc một từ đã lưu trong bài.':'Ví dụ: tạo Frozen Food, thêm nguồn sách và những từ bạn gặp khi đọc.',button('Tạo bài đọc','data-reading-action="create"','secondary','plus'));
  return `<div class="passage-grid">${passages.map(p=>{const words=passageWords(p),ready=words.filter(DeskModel.ready).length;return `<article class="passage-card"><header><span class="passage-topic">${esc(p.topicId?topicName(p.topicId):'Reading')}</span><button class="icon-button" data-reading-edit="${esc(p.id)}" aria-label="Sửa bài ${esc(p.title)}">${icon('pen')}</button></header><button class="passage-open" data-reading-open="${esc(p.id)}"><h2>${esc(p.title)}</h2><p>${esc(p.sourceLabel)||'Chưa thêm tên sách / nguồn'}</p></button><div class="passage-counts"><b>${words.length} từ</b><span>${ready} từ có thể ôn</span></div><p class="passage-preview">${esc(words.slice(0,5).map(w=>w.term).join(' · '))||'Thêm từ mới hoặc gắn những từ bạn đã lưu.'}</p><footer><button class="text-button" data-reading-open="${esc(p.id)}">Mở bài đọc ${icon('arrow')}</button><button class="text-button" data-reading-review="${esc(p.id)}" ${ready?'':'disabled'}>Ôn bài này ${icon('cards')}</button></footer></article>`;}).join('')}</div>`;
}
function readingDetail(passage){
  const words=passageWords(passage),ready=words.filter(DeskModel.ready).length;
  return `<button class="text-button passage-back" data-reading-action="back">${icon('back')} Tất cả bài đọc</button>`+
    heading(esc(passage.title),esc(passage.sourceLabel)||'Bài đọc cá nhân',button('Sửa bài đọc',`data-reading-edit="${esc(passage.id)}"`,'secondary','pen'))+
    `<section class="passage-overview"><div><span>${esc(passage.topicId?topicName(passage.topicId):'Chưa có chủ đề')}</span><p><b>${words.length} từ</b> · ${ready} từ có nghĩa · ${words.filter(w=>DeskModel.ready(w)&&w.dueAt<=Date.now()).length} từ đến hạn</p></div>${safeUrl(passage.url)?`<a class="text-button" href="${esc(safeUrl(passage.url))}" target="_blank" rel="noreferrer">Mở bài gốc ${icon('external')}</a>`:''}${passage.notes?`<p class="passage-notes">${esc(passage.notes)}</p>`:''}</section>
    <section class="passage-vocabulary"><header class="passage-word-toolbar"><h2>Từ trong bài đọc</h2><div>${button('Thêm từ',`data-reading-add="${esc(passage.id)}"`,'secondary','plus')}${button('Thêm nhiều từ',`data-reading-bulk="${esc(passage.id)}"`,'secondary','inbox')}<button class="text-button" data-reading-link="${esc(passage.id)}">Chọn từ đã lưu</button>${button('Ôn bài này',`data-reading-review="${esc(passage.id)}" ${ready?'':'disabled'}`,'primary','cards')}</div></header>${words.length?`<div class="passage-table-scroll"><table class="passage-table"><caption class="sr-only">Từ vựng trong ${esc(passage.title)}</caption><thead><tr><th scope="col">Từ / cụm từ</th><th scope="col">Nghĩa & ngữ cảnh</th><th scope="col">Số lần ôn</th></tr></thead><tbody>${words.map(w=>`<tr><td><button class="passage-word" data-edit="${esc(w.id)}">${esc(w.term)}</button></td><td><span>${esc(w.meaning)||'Chưa có nghĩa'}</span>${w.context?`<small>${esc(w.context)}</small>`:''}</td><td>${w.reviewCount} lần</td></tr>`).join('')}</tbody></table></div>`:empty('Chưa có từ trong bài này','Thêm từ mới, nhập nhiều từ hoặc chọn từ đã lưu để bắt đầu.','','book')}</section>`;
}
function openPassageModal(id=''){
  const passage=data.passages.find(p=>p.id===id);if(id&&!passage){toast('Bài đọc không còn tồn tại.');return;}
  const dialog=document.createElement('dialog');dialog.className='word-dialog';dialog.setAttribute('aria-label',passage?'Sửa bài đọc':'Tạo bài đọc');
  dialog.innerHTML=`<form><header><div><h2>${passage?'Sửa bài đọc':'Tạo bài đọc'}</h2><p>Mỗi bài có một bộ từ riêng. Một từ có thể xuất hiện trong nhiều bài.</p></div><button type="button" class="icon-button" data-close aria-label="Đóng">${icon('close')}</button></header><div class="dialog-fields"><label>Tên bài đọc <span class="required">*</span><input name="title" value="${esc(passage?.title)}" placeholder="Frozen Food" required maxlength="200" autofocus></label><label>Nguồn / sách<input name="sourceLabel" value="${esc(passage?.sourceLabel)}" placeholder="Tên sách · Test 1 · Passage 2" maxlength="300"></label><label>Chủ đề<select name="topicId">${topicOptions(passage?.topicId,'Chưa có chủ đề')}</select></label><label>Đường dẫn bài gốc<input name="url" type="url" placeholder="https://…" value="${esc(passage?.url)}"></label><label>Ghi chú về bài<textarea name="notes" maxlength="10000" placeholder="Nội dung chính, paraphrase hay, điều cần nhớ…">${esc(passage?.notes)}</textarea></label><p class="form-message" role="alert"></p></div><footer>${passage?'<button class="text-button" type="button" data-delete-passage>Xóa bài đọc</button>':'<span></span>'}<div>${button('Hủy','type="button" data-close','secondary','')}${button('Lưu bài đọc','type="submit"','primary','check')}</div></footer></form>`;
  mountDialog(dialog);
  dialog.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const submit=dialog.querySelector('[type=submit]');submit.disabled=true;try{const values=Object.fromEntries(new FormData(event.currentTarget));const result=await mutate('UPSERT_PASSAGE',{id:passage?.id,passage:values});readingState.activeId=result.passageId;readingState.tab='passages';dialog.close();render();toast('Đã lưu bài đọc.');}catch(error){dialog.querySelector('.form-message').textContent=error.message;submit.disabled=false;}});
  dialog.querySelector('[data-delete-passage]')?.addEventListener('click',()=>{dialog.close();confirmDeletePassage(passage);});
}
function confirmDeletePassage(passage){
  const dialog=document.createElement('dialog');dialog.className='word-dialog';
  dialog.innerHTML=`<form><header><div><h2>Xóa bài đọc?</h2><p>${esc(passage.title)}</p></div><button type="button" class="icon-button" data-close aria-label="Đóng">${icon('close')}</button></header><div class="dialog-fields"><p>Bài đọc và liên kết từ sẽ bị xóa. Tất cả từ vựng cùng lịch ôn vẫn được giữ trong sổ từ.</p><p class="form-message" role="alert"></p></div><footer><span></span><div>${button('Hủy','type="button" data-close autofocus','secondary','')}${button('Xóa bài đọc','type="submit"','primary','trash')}</div></footer></form>`;mountDialog(dialog);
  dialog.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const submit=dialog.querySelector('[type=submit]');submit.disabled=true;try{await mutate('DELETE_PASSAGE',{id:passage.id});readingState.activeId='';dialog.close();render();toast('Đã xóa bài đọc, từ vựng vẫn được giữ.');}catch(error){dialog.querySelector('.form-message').textContent=error.message;submit.disabled=false;}});
}
function openPassageWordPicker(id){
  const passage=data.passages.find(p=>p.id===id);if(!passage){toast('Bài đọc không còn tồn tại.');return;}
  const selected=new Set(passage.wordIds),dialog=document.createElement('dialog');dialog.className='word-dialog';
  dialog.innerHTML=`<form><header><div><h2>Từ vựng trong bài</h2><p>${esc(passage.title)} · Bỏ chọn chỉ gỡ liên kết với bài đọc.</p></div><button type="button" class="icon-button" data-close aria-label="Đóng">${icon('close')}</button></header><div class="dialog-fields"><label>Tìm từ<input type="search" data-passage-search placeholder="Tìm theo từ hoặc nghĩa…" autofocus></label><p class="passage-picker-count" role="status"></p><div class="passage-picker-options"></div><p class="form-message" role="alert"></p></div><footer><span></span><div>${button('Hủy','type="button" data-close','secondary','')}${button('Lưu danh sách','type="submit"','primary','check')}</div></footer></form>`;
  const update=()=>{const query=dialog.querySelector('[data-passage-search]').value.trim().toLocaleLowerCase('vi');const words=data.words.filter(w=>`${w.term} ${w.meaning}`.toLocaleLowerCase('vi').includes(query));dialog.querySelector('.passage-picker-count').textContent=`${data.words.filter(w=>selected.has(w.id)).length} từ đã chọn`;dialog.querySelector('.passage-picker-options').innerHTML=words.map(w=>`<label><input type="checkbox" data-passage-word="${esc(w.id)}" ${selected.has(w.id)?'checked':''}><span><b>${esc(w.term)}</b><small>${esc(w.meaning)||'Chưa có nghĩa'}</small></span></label>`).join('')||'<p class="subtext">Không tìm thấy từ phù hợp.</p>';};
  mountDialog(dialog);update();dialog.querySelector('[data-passage-search]').addEventListener('input',update);
  dialog.addEventListener('change',event=>{const id=event.target.dataset.passageWord;if(id){event.target.checked?selected.add(id):selected.delete(id);dialog.querySelector('.passage-picker-count').textContent=`${data.words.filter(w=>selected.has(w.id)).length} từ đã chọn`;}});
  dialog.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const submit=dialog.querySelector('[type=submit]');submit.disabled=true;try{await mutate('SET_PASSAGE_WORDS',{id,ids:data.words.filter(w=>selected.has(w.id)).map(w=>w.id)});dialog.close();render();toast('Đã cập nhật từ trong bài.');}catch(error){dialog.querySelector('.form-message').textContent=error.message;submit.disabled=false;}});
}
document.addEventListener('click',async event=>{
  const target=event.target.closest('button');if(!target)return;
  try{
    if(target.dataset.readingTab){readingState.tab=target.dataset.readingTab;readingState.activeId='';render();return;}
    if(target.dataset.readingOpen){readingState.activeId=target.dataset.readingOpen;render();return;}
    if(target.dataset.readingEdit){openPassageModal(target.dataset.readingEdit);return;}
    if(target.dataset.readingAdd){openWordModal(null,{passageId:target.dataset.readingAdd});return;}
    if(target.dataset.readingBulk){openBulkWords({passageId:target.dataset.readingBulk});return;}
    if(target.dataset.readingLink){openPassageWordPicker(target.dataset.readingLink);return;}
    if(target.dataset.readingReview){const passage=data.passages.find(p=>p.id===target.dataset.readingReview);if(!passage)throw new Error('Bài đọc không còn tồn tại.');const ids=passageWords(passage).map(w=>w.id);await setView('review');startReview({mode:'all',ids,limit:0,shuffle:true,reschedule:false});render();return;}
    if(target.dataset.readingAction==='create')openPassageModal();
    if(target.dataset.readingAction==='back'){readingState.activeId='';render();}
  }catch(error){toast(error.message);}
});
document.addEventListener('input',event=>{if(event.target.id==='reading-search'){readingState.query=event.target.value;$('#reading-list').innerHTML=readingList();}});
document.addEventListener('change',event=>{if(event.target.id==='reading-topic-filter'){readingState.topic=event.target.value;$('#reading-list').innerHTML=readingList();}});
