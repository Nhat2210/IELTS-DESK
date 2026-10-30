const { escape: esc, icon, store, isExtension } = Desk;
const $ = selector => document.querySelector(selector);
let nextView='vocabulary';
function openDesk(query='') { const path=`dashboard.html${query}`; if(isExtension)chrome.tabs.create({url:chrome.runtime.getURL(path)});else window.open(path,'_blank'); }
async function loadPopup() {
  const {words}=await store.get(); const due=words.filter(word=>DeskModel.ready(word)&&word.dueAt<=Date.now()).length; nextView=due?'review':'vocabulary';
  $('#due-label').textContent=due?`${due} từ đến lịch ôn`:'Mở sổ từ của bạn';
  $('#recent-words').innerHTML=words.length?words.slice(0,3).map(word=>`<button class="recent-word" data-edit="${esc(word.id)}"><span><b>${esc(word.term)}</b><small>${esc(word.meaning)||'Thêm nghĩa khi bạn sẵn sàng.'}</small></span>${icon('chevron')}</button>`).join(''):'<p class="recent-empty">Từ bạn lưu sẽ xuất hiện ở đây. Bắt đầu bằng một từ vừa gặp nhé.</p>';
  if(!isExtension){$('#capture-copy').textContent='Mở từ icon extension để bật.';$('#enable-capture').disabled=true;return;}
  const {enabled}=await store.captureStatus();
  $('#enable-capture').textContent=enabled?'Tắt':'Bật';$('#enable-capture').disabled=false;$('#enable-capture').dataset.enabled=String(enabled);
  $('#capture-copy').textContent=enabled?'Nút lưu nhanh đã sẵn sàng.':'Bật nút lưu nhanh trên trang web.';
}
$('#open-desk').addEventListener('click',()=>openDesk());
$('.popup-header .brand').addEventListener('click',event=>{event.preventDefault();openDesk();});
$('#see-all').addEventListener('click',()=>openDesk('?view=vocabulary'));
$('#start-session').addEventListener('click',()=>openDesk(`?view=${nextView}${nextView==='review'?'&start=due':''}`));
$('#recent-words').addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)openDesk(`?view=vocabulary&edit=${encodeURIComponent(button.dataset.edit)}`);});
$('#quick-save').addEventListener('submit',async event=>{
  event.preventDefault();const term=$('#quick-term').value.trim(),message=$('#save-message');if(!term)return;
  const submit=event.currentTarget.querySelector('button');submit.disabled=true;
  try{const {result}=await store.command('UPSERT_WORD',{word:{term}});$('#open-existing').hidden=!result.duplicate;$('#open-existing').dataset.id=result.wordId;$('#quick-term').value='';message.textContent='Đã lưu vào sổ từ. Bạn có thể thêm nghĩa sau.';message.classList.remove('is-error');message.classList.add('sr-only');document.querySelector('.popup-capture>p').textContent=result.duplicate?'Từ này đã có trong sổ. Bạn có thể mở để sửa.':'Đã lưu từ mới. Bổ sung nghĩa khi bạn rảnh.';await loadPopup();$('#quick-term').focus();}
  catch{message.textContent='Chưa lưu được. Bạn thử lại nhé.';message.classList.add('is-error');message.classList.remove('sr-only');}finally{submit.disabled=false;}
});
$('#enable-capture').addEventListener('click',async()=>{
  const control=$('#enable-capture'),enabled=control.dataset.enabled!=='true';control.disabled=true;
  try{await store.setCapture(enabled);await loadPopup();}catch(error){$('#capture-copy').textContent=error.message;control.disabled=false;}
});
$('#open-existing').addEventListener('click',()=>openDesk(`?view=vocabulary&edit=${encodeURIComponent($('#open-existing').dataset.id)}`));

loadPopup();

$('#quick-term').addEventListener('input',()=>{document.querySelector('.popup-capture>p').textContent='Lưu ngay, bổ sung nghĩa khi bạn rảnh.';$('#save-message').textContent='';$('#open-existing').hidden=true;});
