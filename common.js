(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    book:'<path d="M12 5c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Z"/><path d="M12 5v15"/>',
    cards:'<rect x="6" y="6" width="15" height="15" rx="3"/><path d="M17 3H5a2 2 0 0 0-2 2v12m7-5h7m-7 4h4"/>',
    link:'<path d="m10 13 4-4m-7 5-2 2a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6m2-2 2-2a4 4 0 0 0-6-6L9 6a4 4 0 0 0 0 6" transform="translate(0 -1)"/>',
    pen:'<path d="m15 4 5 5M4 20l4-1L21 6a2 2 0 0 0-5-5L3 14l-1 5Z" transform="translate(1 1) scale(.9)"/>',
    chart:'<path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    rotate:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    inbox:'<path d="M4 4h16l2 12v4H2v-4L4 4Zm-2 12h6l2 3h4l2-3h6"/>',
    flag:'<path d="M5 21V3c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m4 0h1m4 0h1M6 13h1m4 0h1m4 0h1m-9 3h8"/>'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const isExtension = Boolean(globalThis.chrome?.storage?.local);
  let previewQueue=Promise.resolve();
  async function rpc(message){const response=await chrome.runtime.sendMessage(message);if(!response?.ok){const message=response?.error?.message||'Không kết nối được dữ liệu. Tải lại extension rồi thử lại.';const error=Object.assign(new Error(message),response?.error);if(/quota|QUOTA_BYTES/i.test(message))error.message='Bộ nhớ thiết bị đã đầy. Hãy xuất bản sao lưu trước khi thử lại.';throw error;}return response.result;}
  function preview(task){const run=async()=>{const raw=JSON.parse(localStorage.getItem('ielts-desk')||'{}'),data=DeskModel.normalize(raw);const result=await task(data);return result;};if(navigator.locks)return navigator.locks.request('ielts-desk-data',run);const next=previewQueue.then(run);previewQueue=next.catch(()=>{});return next;}
  const store={
    async get(){if(isExtension)return rpc({type:'DESK_GET'});return preview(data=>{localStorage.setItem('ielts-desk',JSON.stringify(data));return data;});},
    async command(type,payload={}){if(isExtension)return rpc({type:'DESK_COMMAND',command:type,payload});return preview(data=>{const result=DeskModel.apply(data,{type,payload});localStorage.setItem('ielts-desk',JSON.stringify(result.data));return result;});},
    async exportBackup(){return DeskModel.backup(await this.get());},
    async captureStatus(){return isExtension?rpc({type:'IELTS_CAPTURE_STATE'}):{enabled:false,permissionGranted:false,excludedSites:[]};},
    async setCapture(enabled){if(!isExtension)throw new Error('Mở từ extension đã cài để thay đổi quyền website.');if(enabled&&!await chrome.permissions.request({origins:['http://*/*','https://*/*']}))throw new Error('Chưa cấp quyền. Bạn vẫn có thể lưu từ bằng menu chuột phải.');const result=await this.command('PATCH_SETTINGS',{captureEnabled:enabled});if(enabled){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(tab?.id)await chrome.scripting.executeScript({target:{tabId:tab.id},files:['capture-utils.js','content.js']}).catch(()=>{});}return result;}
  };
  const dayKey=DeskModel.dayKey, safeUrl=DeskModel.safeUrl;
  const applyIcons = (root=document) => root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML=icon(el.dataset.icon); });
  window.Desk = { escape, icon, store, dayKey, safeUrl, isExtension, applyIcons };
  applyIcons();
})();
