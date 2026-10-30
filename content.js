(() => {
  if(globalThis.__IELTS_DESK_CAPTURE__)return;
  globalThis.__IELTS_DESK_CAPTURE__=true;
  let host,timer,config={enabled:false,excludedSites:[]};
  const allowed=()=>config.enabled&&!config.excludedSites.some(site=>location.hostname===site||location.hostname.endsWith(`.${site}`));
  function dismiss(){clearTimeout(timer);host?.remove();host=null;}
  chrome.runtime.sendMessage({type:'IELTS_CAPTURE_STATE'},response=>{if(chrome.runtime.lastError)return;if(response?.ok)config=response.result;});
  chrome.runtime.onMessage.addListener(message=>{if(message.type==='IELTS_CAPTURE_CONFIG'){config=message.config;dismiss();}});
  document.addEventListener('mouseup',event=>{
    if(host?.contains(event.target)||!allowed())return;
    if(event.target.closest?.('input,textarea,[contenteditable="true"]'))return;
    const selected=DeskCapture.selectionData();if(!selected||selected.term.length>90){dismiss();return;}
    const rect=window.getSelection().getRangeAt(0).getBoundingClientRect();dismiss();
    host=document.createElement('ielts-desk-capture');
    Object.assign(host.style,{position:'fixed',zIndex:'2147483647',top:`${Math.max(8,Math.min(innerHeight-48,rect.top>52?rect.top-46:rect.bottom+8))}px`,left:`${Math.max(8,Math.min(innerWidth-224,rect.left))}px`});
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>:host{all:initial}button{all:initial;display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:8px;background:#D92344;color:#fff;font:500 12px/1.4 -apple-system,BlinkMacSystemFont,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 20px #20202422;transition:background 160ms,transform 160ms;max-width:220px}span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}button:hover{background:#B91C39}button:active{transform:translateY(1px)}button:focus-visible{outline:3px solid #F3CCD4;outline-offset:3px}svg{width:15px;height:15px;flex-shrink:0}</style><button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>Lưu vào IELTS Desk</span></button>`;
    const button=shadow.querySelector('button');button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>{button.disabled=true;chrome.runtime.sendMessage({type:'IELTS_SAVE_SELECTION',term:selected.term,context:selected.sentence},response=>{if(chrome.runtime.lastError||!response?.ok){button.querySelector('span').textContent='Chưa lưu được. Thử lại.';button.disabled=false;return;}button.querySelector('span').textContent=response.result.duplicate?'Đã có trong sổ · thêm ngữ cảnh':'Đã lưu vào sổ từ';timer=setTimeout(dismiss,1700);});});
    document.documentElement.append(host);
  });
  document.addEventListener('mousedown',event=>{if(host&&!host.contains(event.target))dismiss();});
  document.addEventListener('scroll',dismiss,{passive:true});
})();
