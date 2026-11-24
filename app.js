'use strict';
const KEY='axiora.v1', tabs=['Painel','Agenda','Estudos','Negócios','Pessoal','Finanças','Objetivos','Diário','Sincronização'];
const empty=()=>({tasks:[],debt:0,paid:0,goals:{now:'',medium:'',long:''},notes:''});
let data=empty(),tab='Painel';
try{const raw=localStorage.getItem(KEY);if(raw)data=JSON.parse(raw)}catch(e){console.error(e)}
const $=id=>document.getElementById(id);
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){alert('Não foi possível salvar neste dispositivo.')}}
function btn(txt,fn,cls){const b=el('button',txt,cls);b.type='button';b.onclick=fn;return b}
const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function card(name,value){const c=el('div',undefined,'card');c.append(el('small',name),el('div',value,'metric'));return c}
function field(name,value,change,type='text'){const l=el('label',name),i=el(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;if(type==='number'){i.min='0';i.step='.01'}i.value=value;i.onchange=()=>{change(i.value);save()};l.append(i);return l}
function render(){ $('title').textContent=tab;const v=$('view');v.replaceChildren();$('nav').replaceChildren(...tabs.map(t=>btn(t,()=>{tab=t;render()},t===tab?'active':'')));
if(tab==='Sincronização'){syncView(v);return}
if(tab==='Painel'){const g=el('div',undefined,'grid');g.append(card('Concluídas',data.tasks.filter(t=>t.done).length+'/'+data.tasks.length),card('Dívida restante',money(Math.max(0,data.debt-data.paid))),card('Pendências de hoje',data.tasks.filter(t=>!t.done&&t.date===today()).length));v.append(g,el('h3','Próximas ações'));list(v,data.tasks.filter(t=>!t.done&&(!t.date||t.date<=today())));v.append(btn('Exportar meus dados',()=>{const a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='axiora-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}));return}
if(tab==='Finanças'){v.append(field('Dívida total (R$)',data.debt,x=>data.debt=Math.max(0,Number(x)||0),'number'),field('Valor quitado (R$)',data.paid,x=>data.paid=Math.max(0,Number(x)||0),'number'),card('Saldo restante',money(Math.max(0,data.debt-data.paid))));return}
if(tab==='Objetivos'){for(const [k,n] of Object.entries({now:'Imediato',medium:'Médio prazo',long:'Longo prazo'}))v.append(field(n,data.goals[k],x=>data.goals[k]=x,'textarea'));return}
if(tab==='Diário'){v.append(field('Anotações',data.notes,x=>data.notes=x,'textarea'));return}
const f=el('form'),i=el('input'),date=el('input'),cat=el('select');i.placeholder='Nova atividade';i.required=true;date.type='date';date.setAttribute('aria-label','Prazo');for(const c of ['Estudos','Negócios','Pessoal']){const o=el('option',c);cat.append(o)}if(tab!=='Agenda')cat.value=tab;const b=el('button','Adicionar');f.append(i,date,cat,b);f.onsubmit=e=>{e.preventDefault();if(!i.value.trim())return;data.tasks.push({id:crypto.randomUUID(),name:i.value.trim(),date:date.value,category:cat.value,done:false});save();render()};v.append(f);list(v,data.tasks.filter(t=>tab==='Agenda'||t.category===tab))}
function list(v,tasks){if(!tasks.length)v.append(el('p','Nenhuma atividade nesta seção.'));for(const t of tasks){const a=el('article'),c=el('input');c.type='checkbox';c.checked=t.done;c.setAttribute('aria-label','Concluir '+t.name);c.onchange=()=>{t.done=c.checked;save();render()};a.append(c,el('span',t.name+(t.date?' · '+t.date:''),t.done?'done':''),btn('Editar',()=>{const n=prompt('Atividade',t.name);if(n!==null&&n.trim()){t.name=n.trim();save();render()}},'secondary'),btn('Excluir',()=>{if(confirm('Excluir atividade?')){data.tasks=data.tasks.filter(x=>x.id!==t.id);save();render()}},'secondary'));v.append(a)}}
let remote=null, revision=null, ready=false, busy=false;
function validSnapshot(d){return d&&Array.isArray(d.tasks)&&d.tasks.every(t=>t&&typeof t.id==='string'&&typeof t.name==='string'&&typeof t.done==='boolean'&&typeof t.date==='string'&&['Estudos','Negócios','Pessoal'].includes(t.category))&&Number.isFinite(d.debt)&&d.debt>=0&&Number.isFinite(d.paid)&&d.paid>=0&&d.goals&&['now','medium','long'].every(k=>typeof d.goals[k]==='string')&&typeof d.notes==='string'}
function syncView(v){
 const status=el('p',remote?'Sessão conectada.':'Sessão desconectada.');
 const client=el('input'),sheet=el('input');client.placeholder='Client ID OAuth';sheet.placeholder='ID da planilha privada';
 client.value=localStorage.getItem('axiora.client')||'';sheet.value=localStorage.getItem('axiora.sheet')||'';
 const run=async fn=>{if(busy)return;busy=true;try{await fn()}catch(e){status.textContent=e.message}finally{busy=false}};
 v.append(el('p','Configure um cliente OAuth Web e uma planilha privada com aba snapshot. Consulte a versão remota antes de enviar.'),client,sheet,status);
 v.append(btn('Conectar Google',()=>{if(busy)return;try{if(!window.google?.accounts?.oauth2)throw new Error('Biblioteca Google indisponível.');if(!/^[a-zA-Z0-9_-]+$/.test(sheet.value.trim()))throw new Error('ID de planilha inválido');const id=sheet.value.trim();localStorage.setItem('axiora.client',client.value.trim());localStorage.setItem('axiora.sheet',id);remote=null;ready=false;revision=null;google.accounts.oauth2.initTokenClient({client_id:client.value.trim(),scope:'https://www.googleapis.com/auth/spreadsheets',callback:r=>{if(r.error){status.textContent=r.error;return}remote=new AxioraSync(id,r.access_token);status.textContent='Conectado. Consulte os dados remotos.'},error_callback:e=>{status.textContent=e.type||'Falha na autenticação'}}).requestAccessToken({prompt:'consent'})}catch(e){status.textContent=e.message}}));
 v.append(btn('Consultar e carregar',()=>run(async()=>{if(!remote)throw new Error('Conecte primeiro.');const s=await remote.read();ready=false;if(s){if(typeof s.revision!=='string'||!validSnapshot(s.data))throw new Error('Dados remotos inválidos.');if(!confirm('Substituir dados locais pela versão remota? Uma cópia local será guardada.'))return;localStorage.setItem('axiora.previous',JSON.stringify(data));data=s.data;save()}revision=s?.revision??null;ready=true;status.textContent=s?'Dados carregados.':'Planilha vazia; pronta para primeiro envio.'})));
 v.append(btn('Enviar versão local',()=>run(async()=>{if(!remote||!ready)throw new Error('Consulte a planilha primeiro.');if(!confirm('Enviar os dados locais à planilha privada?'))return;const s=await remote.write(data,revision);revision=s.revision;status.textContent='Dados enviados.'})));
 v.append(btn('Desconectar',()=>{if(busy)return;const token=remote?.token;remote=null;ready=false;revision=null;if(token)google.accounts.oauth2.revoke(token,()=>{});status.textContent='Desconectado.'},'secondary'));
}

render();