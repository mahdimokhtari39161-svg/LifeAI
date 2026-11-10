(()=>{'use strict';
const A=window.LAI,d=A.data,t=A.t.bind(A),id=A.id.bind(A),save=A.save.bind(A),notify=A.notify.bind(A);let scanBlob=null,scanPreviewUrl=null,focusTicker=null,aiBusy=false;
function today(){return A.today()}
function byId(s){return document.getElementById(s)}
function formObj(form){return Object.fromEntries(new FormData(form).entries())}
function dbOpen(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('IndexedDB unavailable'));return}let q=indexedDB.open('LifeAI_LocalFiles',1);q.onupgradeneeded=()=>{let db=q.result;if(!db.objectStoreNames.contains('scans'))db.createObjectStore('scans',{keyPath:'id'})};q.onsuccess=()=>{A.db=q.result;resolve(q.result)};q.onerror=()=>reject(q.error)})}
function dbPut(item){return new Promise((resolve,reject)=>{let q=A.db.transaction('scans','readwrite').objectStore('scans').put(item);q.onsuccess=()=>resolve();q.onerror=()=>reject(q.error)})}
function dbGet(key){return new Promise((resolve,reject)=>{let q=A.db.transaction('scans','readonly').objectStore('scans').get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
function dbDelete(key){return new Promise((resolve,reject)=>{let q=A.db.transaction('scans','readwrite').objectStore('scans').delete(key);q.onsuccess=()=>resolve();q.onerror=()=>reject(q.error)})}
function toast(s){notify(s)}
function safeCalc(value){let x=String(value||'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').trim();if(!/^[0-9+\-*/().%\s]+$/.test(x))throw new Error('Invalid expression');x=x.replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');let n=Function('"use strict"; return ('+x+')')();if(!Number.isFinite(n))throw new Error('Invalid result');return n}
function taskAdd(form){let v=formObj(form);if(!v.text.trim())return;d.tasks.unshift({id:id(),text:v.text.trim(),priority:v.priority||'medium',due:v.due||'',done:false,date:today(),createdAt:Date.now()});save();A.render();toast(t('save'))}
function habitAdd(form){let v=formObj(form);if(!v.name.trim())return;d.habits.push({id:id(),name:v.name.trim(),icon:v.icon||'🌱',doneDates:[],createdAt:Date.now()});save();A.render()}
function eventAdd(form){let v=formObj(form);if(!v.title.trim())return;d.events.push({id:id(),title:v.title.trim(),date:v.date||A.selectedDate,time:v.time||'',description:v.description||''});A.selectedDate=v.date||A.selectedDate;save();A.render()}
function noteAdd(form){let v=formObj(form);if(!(v.title||'').trim()&&!(v.body||'').trim()){toast(t('saveFirst'));return}d.notes.unshift({id:id(),title:(v.title||'').trim(),body:(v.body||'').trim(),tag:(v.tag||'').trim(),pinned:false,date:today(),createdAt:Date.now()});save();A.render()}
function transactionAdd(form){let v=formObj(form),amount=Number(v.amount);if(!Number.isFinite(amount)||amount<=0)return;d.tx.push({id:id(),type:v.type||'expense',desc:(v.desc||'').trim(),amount,currency:d.currency,category:v.category||'other',date:v.date||today()});save();A.render()}
function budgetAdd(form){let v=formObj(form),amount=Number(v.amount);if(!Number.isFinite(amount)||amount<=0)return;let month=today().slice(0,7),old=d.budgets.find(x=>x.month===month&&x.category===v.category);if(old)old.amount=amount;else d.budgets.push({id:id(),month,category:v.category,amount});save();A.render()}
function habitToggle(key){let h=d.habits.find(x=>x.id===key);if(!h)return;h.doneDates=Array.isArray(h.doneDates)?h.doneDates:[];let day=today();h.doneDates=h.doneDates.includes(day)?h.doneDates.filter(x=>x!==day):h.doneDates.concat(day);save();A.render()}
function taskToggle(key){let x=d.tasks.find(x=>x.id===key);if(!x)return;x.done=!x.done;x.completedAt=x.done?Date.now():null;save();A.render()}
function focusSet(min){clearInterval(focusTicker);A.focusState={minutes:min,remaining:min*60,running:false};updateTimer();A.render()}
function updateTimer(){let f=A.focusState;if(!f)return;let box=byId('timerDisplay');if(box)box.textContent=String(Math.floor(f.remaining/60)).padStart(2,'0')+':'+String(f.remaining%60).padStart(2,'0');let ring=document.querySelector('.timer-ring');if(ring){let p=100*(1-f.remaining/(f.minutes*60));ring.style.setProperty('--progress',Math.max(0,Math.min(100,p))+'%')}}
function focusStart(){if(!A.focusState)A.focusState={minutes:25,remaining:1500,running:false};if(A.focusState.running)return;A.focusState.running=true;let started=Date.now();A.focusState.last=started;focusTicker=setInterval(()=>{let f=A.focusState;if(!f||!f.running)return;let now=Date.now(),elapsed=Math.floor((now-f.last)/1000);if(elapsed>0){f.remaining=Math.max(0,f.remaining-elapsed);f.last=now;updateTimer()}if(f.remaining<=0){clearInterval(focusTicker);f.running=false;d.focusSessions.push({id:id(),date:today(),minutes:f.minutes,completedAt:Date.now()});save();toast(t('focusDone'));if('Notification'in window&&Notification.permission==='granted')new Notification('LifeAI',{body:t('focusDone')});A.render()}},500);A.render()}
function focusPause(){if(A.focusState){A.focusState.running=false;clearInterval(focusTicker);updateTimer();A.render()}}
function focusReset(){let m=A.focusState?A.focusState.minutes:25;focusSet(m)}
function downloadBlob(blob,name){let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
function setTab(tab){A.tab=tab;A.render();window.scrollTo({top:0,behavior:'smooth'})}
async function sendAI(prompt){let text=prompt||byId('aiForm')?.elements.prompt.value.trim();if(!text||aiBusy)return;if(!d.url){toast(t('aiNeedSetup'));setTab('settings');return}A.chat=A.chat||[];A.chat.push({role:'user',text});A.render();aiBusy=true;try{let r=await fetch(d.url.replace(/\/+$/,'')+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:A.aiMode||'general',prompt:text})});let j=await r.json();if(!r.ok)throw new Error(j.error||'Server error');A.chat.push({role:'assistant',text:j.output||'No response'});A.render()}catch(err){A.chat.push({role:'assistant',text:t('aiError')+' '+err.message});A.render()}finally{aiBusy=false}}
function scannerPreview(file){scanBlob=file;if(scanPreviewUrl)URL.revokeObjectURL(scanPreviewUrl);scanPreviewUrl=URL.createObjectURL(file);let area=byId('scanPreview');if(area){if(file.type.startsWith('image/'))area.innerHTML='<img src="'+scanPreviewUrl+'" alt="Preview">';else area.innerHTML='<div class="pdf-preview">📄 '+A.esc(file.name)+'</div>'}let name=byId('scanName');if(name&&!name.value)name.value=file.name.replace(/\.[^.]+$/,'');let btn=byId('scanSave');if(btn)btn.disabled=false}
async function scanSave(){if(!scanBlob||!A.db)return;let item={id:id(),name:(byId('scanName')?.value||scanBlob.name||'Document').trim(),type:scanBlob.type||'application/octet-stream',size:scanBlob.size,createdAt:Date.now(),blob:scanBlob};try{await dbPut(item);scanBlob=null;if(scanPreviewUrl)URL.revokeObjectURL(scanPreviewUrl);scanPreviewUrl=null;A.loadScans();A.render();toast(t('scanSaved'))}catch(err){toast('Could not save: '+err.message)}}
async function scanDownload(key){let x=await dbGet(key);if(x)downloadBlob(x.blob,x.name+(x.type==='application/pdf'&&!x.name.endsWith('.pdf')?'.pdf':x.type.startsWith('image/')&&!/\.(png|jpe?g|webp)$/i.test(x.name)?'.jpg':''))}
function scanDelete(key){dbDelete(key).then(()=>{A.loadScans();toast(t('delete'))})}
function units(){let type=byId('unitType')?.value,sets={length:['m','km','cm','mm','ft','mile'],weight:['kg','g','lb','oz'],temperature:['C','F','K']};['unitFrom','unitTo'].forEach((key,i)=>{let x=byId(key);if(x)x.innerHTML=sets[type].map((u,j)=>'<option '+(j===i?'selected':'')+'>'+u+'</option>').join('')})}
function convertUnits(){let v=Number(byId('unitValue').value),f=byId('unitFrom').value,to=byId('unitTo').value,type=byId('unitType').value,n=v;if(!Number.isFinite(v))return;if(type==='length'){let m={m:1,km:1000,cm:.01,mm:.001,ft:.3048,mile:1609.344};n=v*m[f]/m[to]}else if(type==='weight'){let m={kg:1,g:.001,lb:.45359237,oz:.0283495231};n=v*m[f]/m[to]}else{let c=f==='C'?v:f==='F'?(v-32)*5/9:v-273.15;n=to==='C'?c:to==='F'?c*9/5+32:c+273.15}byId('unitResult').textContent=A.fmt(Number(n.toFixed(6)))+' '+to}
function calcButton(key){let x=byId('calcInput');if(!x)return;if(key==='⌫')x.value=x.value.slice(0,-1);else if(key==='='){try{byId('calcResult').textContent=A.fmt(safeCalc(x.value))}catch(e){byId('calcResult').textContent='خطا در عبارت'}}else x.value+=key}
function taskSearch(value){A.taskSearch=value;let cursor=byId('taskSearch')?.selectionStart;A.render();let input=byId('taskSearch');if(input){input.focus();input.setSelectionRange(cursor,cursor)}}
document.addEventListener('click',async ev=>{
let tab=ev.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return}
let x=ev.target.closest('[data-a]');if(!x)return;let a=x.dataset.a,key=x.dataset.id;
if(a==='quick-add-task'){setTab('tasks');byId('taskForm')?.elements.text.focus()}
else if(a==='quick-add-note'){setTab('notes');byId('noteForm')?.elements.title.focus()}
else if(a==='quick-focus'){A.focusState=A.focusState||{minutes:25,remaining:1500,running:false};setTab('focus')}
else if(a==='quick-scan'){setTab('scanner')}
else if(a==='quick-ai'){setTab('assistant')}
else if(a==='task-toggle')taskToggle(key);
else if(a==='task-delete'){if(confirm(t('confirmDelete'))){d.tasks=d.tasks.filter(z=>z.id!==key);save();A.render()}}
else if(a==='task-filter'){A.taskFilter=x.dataset.filter;A.render()}
else if(a==='habit-toggle')habitToggle(key);
else if(a==='habit-delete'){d.habits=d.habits.filter(z=>z.id!==key);save();A.render()}
else if(a==='mood'){let old=d.moods.find(z=>z.date===today());if(old)old.mood=x.dataset.mood;else d.moods.push({date:today(),mood:x.dataset.mood});save();A.render();toast(t('save'))}
else if(a==='select-day'){A.selectedDate=x.dataset.date;A.render()}
else if(a==='month-prev'||a==='month-next'){let dt=new Date(A.calendarYear,A.calendarMonth+(a==='month-prev'?-1:1),1);A.calendarYear=dt.getFullYear();A.calendarMonth=dt.getMonth();A.render()}
else if(a==='month-today'){A.calendarYear=new Date().getFullYear();A.calendarMonth=new Date().getMonth();A.selectedDate=today();A.render()}
else if(a==='event-delete'){d.events=d.events.filter(z=>z.id!==key);save();A.render()}
else if(a==='note-pin'){let n=d.notes.find(z=>z.id===key);if(n)n.pinned=!n.pinned;save();A.render()}
else if(a==='note-delete'){d.notes=d.notes.filter(z=>z.id!==key);save();A.render()}
else if(a==='tx-delete'){d.tx=d.tx.filter(z=>z.id!==key);save();A.render()}
else if(a==='focus-duration')focusSet(Number(x.dataset.min))
else if(a==='focus-start')focusStart()
else if(a==='focus-pause')focusPause()
else if(a==='focus-reset')focusReset()
else if(a==='tool-select'){A.activeTool=x.dataset.tool;A.render()}
else if(a==='calc-key')calcButton(x.dataset.key)
else if(a==='unit-convert')convertUnits()
else if(a==='percent-calc'){let v=Number(byId('percentValue').value),base=Number(byId('percentBase').value);byId('percentResult').textContent=base?A.fmt(v/base*100)+'%':'—'}
else if(a==='text-upper'){let q=byId('textToolInput');q.value=q.value.toLocaleUpperCase();q.dispatchEvent(new Event('input'))}
else if(a==='text-lower'){let q=byId('textToolInput');q.value=q.value.toLocaleLowerCase();q.dispatchEvent(new Event('input'))}
else if(a==='text-copy'){let q=byId('textToolInput');if(q){try{await navigator.clipboard.writeText(q.value);toast(t('copied'))}catch{q.select();document.execCommand('copy');toast(t('copied'))}}}
else if(a==='scan-save')scanSave()
else if(a==='scan-download')scanDownload(key)
else if(a==='scan-delete'){if(confirm(t('confirmDelete')))scanDelete(key)}
else if(a==='print')window.print()
else if(a==='ai-mode'){A.aiMode=x.dataset.mode;A.render()}
else if(a==='ai-prompt'){let q=x.dataset.prompt;setTimeout(()=>{let f=byId('aiForm')?.elements.prompt;if(f){f.value=q;f.focus()}},30)}
else if(a==='settings-save'){d.profile=byId('profileInput').value.trim();d.url=byId('serverInput').value.trim().replace(/\/+$/,'');d.currency=byId('currencyInput').value.trim()||'EUR';let lg=byId('langInput').value;A.setLang(lg);save();A.render();toast(t('settingsSaved'))}
else if(a==='theme'){d.theme=x.dataset.theme;save();A.render()}
else if(a==='notifications'){if(!('Notification'in window)){toast('Notifications not supported');return}let p=await Notification.requestPermission();toast(p==='granted'?'اعلان‌ها فعال شد':t('notificationDenied'))}
else if(a==='backup-export'){A.exportData();toast(t('exported'))}
else if(a==='backup-import')byId('backupFile').click()
});
document.addEventListener('submit',ev=>{let f=ev.target;if(f.id==='taskForm'){ev.preventDefault();taskAdd(f)}else if(f.id==='habitForm'){ev.preventDefault();habitAdd(f)}else if(f.id==='eventForm'){ev.preventDefault();eventAdd(f)}else if(f.id==='noteForm'){ev.preventDefault();noteAdd(f)}else if(f.id==='txForm'){ev.preventDefault();transactionAdd(f)}else if(f.id==='budgetForm'){ev.preventDefault();budgetAdd(f)}else if(f.id==='aiForm'){ev.preventDefault();sendAI(f.elements.prompt.value.trim());f.reset()}});
document.addEventListener('input',ev=>{if(ev.target.id==='taskSearch'){A.taskSearch=ev.target.value;let pos=ev.target.selectionStart;A.render();let q=byId('taskSearch');if(q){q.focus();q.setSelectionRange(pos,pos)}}if(ev.target.id==='noteSearch'){A.noteSearch=ev.target.value;let pos=ev.target.selectionStart;A.render();let q=byId('noteSearch');if(q){q.focus();q.setSelectionRange(pos,pos)}}if(ev.target.id==='textToolInput'){let s=ev.target.value;byId('wordCount').textContent=(s.trim()?s.trim().split(/\s+/).length:0)+' '+t('wordCount');byId('charCount').textContent=s.length+' '+t('charCount')}});
document.addEventListener('change',ev=>{if(ev.target.id==='scanFile'){let f=ev.target.files&&ev.target.files[0];if(f)scannerPreview(f)}if(ev.target.id==='unitType')units()});
let imp=document.createElement('input');imp.type='file';imp.accept='application/json';imp.hidden=true;imp.id='backupFile';document.body.appendChild(imp);imp.addEventListener('change',async ev=>{let f=ev.target.files&&ev.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text()),v=j.data||j;if(!v||typeof v!=='object')throw new Error('invalid');['tasks','notes','tx','habits','events','budgets','focusSessions','moods'].forEach(k=>{if(Array.isArray(v[k]))d[k]=v[k]});['currency','profile','url','theme'].forEach(k=>{if(typeof v[k]==='string')d[k]=v[k]});if(j.lang)A.setLang(j.lang);save();A.render();toast(t('imported'))}catch(err){toast(t('invalidBackup'))}imp.value=''});
document.querySelector('#themeBtn')?.addEventListener('click',()=>{d.theme=d.theme==='dark'?'colorful':'dark';save();A.render()});
document.querySelector('#globalSearch')?.addEventListener('keydown',ev=>{if(ev.key==='Enter'){A.taskSearch=ev.target.value;setTab('tasks')}});
dbOpen().then(db=>{A.db=db;A.loadScans()}).catch(()=>{});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();