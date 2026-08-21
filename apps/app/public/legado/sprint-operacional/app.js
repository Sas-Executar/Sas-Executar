const TASKS = window.__TASKS__;
const stateKey = 'executar-foco-v1';
let state = JSON.parse(localStorage.getItem(stateKey) || '{"done":[],"focus":null,"evidence":[],"started":{}}');
let installPrompt = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function save(){ localStorage.setItem(stateKey, JSON.stringify(state)); }
function isDone(id){ return state.done.includes(id); }
function byId(id){ return TASKS.find(t=>t.id===id); }
function depsDone(t){ return (t.deps||[]).every(isDone); }
function readyTasks(){ return TASKS.filter(t=>!isDone(t.id) && depsDone(t)); }
function blockedTasks(){ return TASKS.filter(t=>!isDone(t.id) && !depsDone(t)); }
function doneMinutes(){ return TASKS.filter(t=>isDone(t.id)).reduce((a,t)=>a+t.mins,0); }
function totalMinutes(){ return TASKS.reduce((a,t)=>a+t.mins,0); }
function currentFocus(){
  if(state.focus && !isDone(state.focus) && depsDone(byId(state.focus))) return byId(state.focus);
  const r = readyTasks()[0] || TASKS.find(t=>!isDone(t.id));
  state.focus = r?.id || null; save(); return r;
}
function fmt(min){ const h=Math.floor(min/60), m=min%60; return h ? `${h}h${m?String(m).padStart(2,'0'):''}` : `${m} min`; }
function evidenceFor(id){ return state.evidence.filter(e=>e.taskId===id); }

function setView(v){
  $$('.view').forEach(x=>x.classList.toggle('active',x.id===v));
  $$('.navItem,.bottomNav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  const names={overview:'Visão geral',focus:'Foco',calendar:'Calendário',path:'Caminho do resultado'};
  $('#viewTitle').textContent=names[v];
  renderAll();
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

function renderOverview(){
  const done=doneMinutes(), total=totalMinutes(), pct=Math.round(done/total*100);
  const days=['24','25','26','27','28','31','01','02','03','04'];
  $('#overview').innerHTML=`
    <div class="kpis">
      <div class="card kpi"><small>Planejado</small><strong>54h15</strong><em>para fechar a fase</em></div>
      <div class="card kpi"><small>Proteção</small><strong>5h45</strong><em>sem ampliar escopo</em></div>
      <div class="card kpi"><small>Não pode atrasar</small><strong>27h30</strong><em>caminho principal</em></div>
      <div class="card kpi"><small>Concluído</small><strong>${pct}%</strong><em>${state.done.length} de ${TASKS.length} entregas</em></div>
      <div class="card kpi"><small>Evidências</small><strong>${state.evidence.length}</strong><em>registros salvos</em></div>
    </div>
    <div class="two">
      <div class="card">
        <div class="cardHead"><h2>Plano no tempo</h2><span>24 ago → 04 set</span></div>
        <div class="cardBody">
          <div class="ganttHead"><div></div>${days.map(d=>`<div>${d}</div>`).join('')}</div>
          ${[
            ['Base do aplicativo',0,20,'current'],
            ['Conta e acesso',10,26,'current'],
            ['Produto funcionando',20,48,'current'],
            ['Provas reais',50,25,'later'],
            ['Campanhas',70,16,'later'],
            ['Publicar e comprovar',80,18,'later'],
          ].map(([n,l,w,c])=>`<div class="ganttRow"><label>${n}</label><div class="track"><span class="bar ${c}" style="left:${l}%;width:${w}%"></span><i class="mark" style="left:${l+w-1}%;color:${c==='current'?'var(--blue2)':'#a9afb6'}"></i></div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="cardHead"><h2>8 rotas do resultado</h2><span>uma única visão</span></div>
        <div class="cardBody ringWrap">
          <div class="routeRing"></div>
          <div class="routeLegend"><span>Aplicativo</span><span>Blog</span><span>Mostruário</span><span>Consultoria</span><span>Produtos físicos</span><span>Infoprodutos</span><span>Negócio</span><span>Dados</span></div>
        </div>
      </div>
    </div>
    <div class="three" style="margin-top:12px">
      <div class="card actionCard">
        <div class="actionTop"><div><div class="actionTitle">Faça agora</div><small style="color:#858b93">${currentFocus()?.title||'Fase concluída'}</small></div><span class="badge blue">${currentFocus()?.mins||0} min</span></div>
        <div class="progress" style="margin-top:15px"><span style="width:${pct}%"></span></div>
      </div>
      <div class="card"><div class="cardHead"><h2>Tempo por frente</h2><span>54h15</span></div><div class="cardBody">
        ${[['Desenvolvimento',1260,'#202328'],['Criativo',930,'var(--blue2)'],['Operações',1065,'#9ba2aa']].map(([n,m,c])=>`<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:11px"><b>${n}</b><span>${fmt(m)}</span></div><div class="progress" style="margin-top:5px"><span style="width:${Math.round(m/3255*100)}%;background:${c}"></span></div></div>`).join('')}
      </div></div>
      <div class="card"><div class="cardHead"><h2>Marcos</h2><span>3 ciclos + fechamento</span></div><div class="cardBody"><div class="milestones">
        <div class="ms done"><i>✓</i><b>26/08</b></div><div class="ms now"><i>●</i><b>31/08</b></div><div class="ms"><i></i><b>03/09</b></div><div class="ms"><i></i><b>04/09</b></div>
      </div></div></div>
    </div>`;
}

function queueForFocus(focus){
  const rs = readyTasks().filter(t=>t.id!==focus?.id).slice(0,4);
  const fillers = [...rs];
  while(fillers.length<4) fillers.push(null);
  return fillers;
}
function renderFocus(){
  const f=currentFocus();
  if(!f){ $('#focus').innerHTML='<div class="card cardBody"><h2>Fase concluída</h2><p>Todas as entregas foram fechadas.</p></div>'; return; }
  const q=queueForFocus(f);
  const ready=readyTasks().filter(t=>t.id!==f.id).slice(0,6);
  const locked=blockedTasks().slice(0,4);
  const ev=evidenceFor(f.id);
  const steps=Math.max(1,Math.ceil(f.mins/15));
  const started=state.started[f.id]||0;
  const approx=Math.min(steps,started);
  $('#focus').innerHTML=`
    <div class="focusGrid">
      <div class="focusStage">
        <div class="flashShell">
          <div class="flashCard">
            <div class="flashVisual">
              <div class="bigIcon">✓</div>
              <div class="counter">${f.stage}/4</div>
            </div>
            <div class="flashText">
              <div class="eyebrow">${f.front.toUpperCase()}</div>
              <h2>${f.title}</h2>
              <p>${f.deps.length ? 'Tudo que precisava vir antes já está fechado. Faça somente esta entrega e registre a comprovação.' : 'Este item já pode começar. Faça, feche e registre a comprovação.'}</p>
              <div class="flashMeta"><span class="chip">${f.mins} min</span><span class="chip">${steps} passos de 15 min</span><span class="chip">${ev.length} evidência(s)</span></div>
            </div>
            <button class="doneBtn" id="doneFocusBtn">Feito</button>
          </div>
        </div>
        <div class="queueLabel">Fila · toque em um cartão para assumir o foco</div>
        <div class="queueTiles">
          ${q.map((t,i)=>t?`<button class="qTile" data-focus="${t.id}"><span>${i+1}/4</span><b style="position:absolute;left:10px;bottom:9px;font-size:10px;text-align:left">${t.id}</b></button>`:`<button class="qTile" disabled style="opacity:.28"><span>—</span></button>`).join('')}
        </div>
      </div>
      <div class="focusSide">
        <div class="card"><div class="cardHead"><h2>Tempo de hoje</h2><span>6 horas</span></div><div class="cardBody">
          <div class="circle"><svg viewBox="0 0 120 120" width="180" height="180"><circle cx="60" cy="60" r="48" fill="none" stroke="#edf0f3" stroke-width="12"/><circle cx="60" cy="60" r="48" fill="none" stroke="#7fa9df" stroke-width="12" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="14"/></svg><div class="circleCenter"><div><strong>96%</strong><br><small style="color:#858b93">planejado</small></div></div></div>
        </div></div>
        <div class="card"><div class="cardHead"><h2>Passos</h2><span>${approx}/${steps}</span></div><div class="cardBody">
          <div class="steps">${Array.from({length:Math.min(24,steps)},(_,i)=>`<button class="step ${i<approx?'on':''}" data-step="${i+1}" title="Passo ${i+1}"></button>`).join('')}</div>
          <button class="softBtn" id="addStepBtn" style="width:100%;margin-top:10px">Marcar próximo passo</button>
        </div></div>
        <div class="card"><div class="cardHead"><h2>Pode fazer depois</h2><span>${ready.length}</span></div><div class="cardBody readyList">${ready.length?ready.map(t=>`<div class="miniTask"><div><b>${t.title}</b><small>${t.front}</small></div><span class="badge">${t.mins}m</span></div>`).join(''):'<small>Nenhuma outra entrega liberada.</small>'}</div></div>
        <div class="card"><div class="cardHead"><h2>Ainda não pode</h2><span>${blockedTasks().length}</span></div><div class="cardBody lockedList">${locked.map(t=>`<div class="miniTask"><div><b>${t.title}</b><small>espera ${t.deps.filter(d=>!isDone(d)).join(', ')}</small></div><span>⌛</span></div>`).join('')}</div></div>
      </div>
    </div>`;
  $('#doneFocusBtn').onclick=()=>openEvidence(f);
  $$('#focus [data-focus]').forEach(b=>b.onclick=()=>{state.focus=b.dataset.focus;save();renderFocus()});
  $('#addStepBtn').onclick=()=>{state.started[f.id]=Math.min(steps,(state.started[f.id]||0)+1);save();renderFocus()};
  $$('#focus [data-step]').forEach(b=>b.onclick=()=>{state.started[f.id]=Number(b.dataset.step);save();renderFocus()});
}

const dayInfo = [
 ['seg','24','Fechar a base','Fundação do aplicativo + mensagem + escolhas iniciais.','345 min'],
 ['ter','25','Fechar conta e oferta','Acesso por pessoas diferentes + preços + canais + dados.','360 min'],
 ['qua','26','Preparar o conteúdo','Partes do produto + blog + serviços organizados.','360 min'],
 ['qui','27','Conectar o produto','Regras e dados funcionando em um pacote fechado.','360 min'],
 ['sex','28','Colocar no ar','Aplicativo público + primeira prova real + 3 vídeos.','360 min'],
 ['seg','31','Fechar provas','Comparativos + artigos + proposta de serviço.','360 min'],
 ['ter','01','Fechar ofertas','Produtos físicos e infoprodutos em condição de venda.','360 min'],
 ['qua','02','Medir e lançar','Medição ligada + 3 campanhas concluídas.','360 min'],
 ['qui','03','Publicar e testar','Blog, mostruário, serviços e produtos publicados.','315 min'],
 ['sex','04','Fechar e comprovar','Indicadores, evidências e correções finais.','75 min + proteção'],
];
function renderCalendar(){
  $('#calendar').innerHTML=`
    <div class="card"><div class="cardHead"><h2>Resultados por dia</h2><span>10 dias úteis</span></div><div class="cardBody">
      <div class="calendarGrid">${dayInfo.map((d,i)=>`<div class="dayCard ${i===0?'now':''}"><div class="dow">${d[0]}</div><div class="num">${d[1]}</div><h3>${d[2]}</h3><p>${d[3]}</p><footer><span>${d[4]}</span><span>${TASKS.filter(t=>t.date===d[1]+'/08'||t.date===d[1]+'/09').filter(t=>isDone(t.id)).length} feitas</span></footer></div>`).join('')}</div>
    </div></div>
    <div class="card" style="margin-top:12px"><div class="cardHead"><h2>Ciclos de 72 horas</h2><span>resultado por bloco</span></div><div class="cardBody"><div class="cycleLine">
      <div class="cycle now"><i>●</i><b>Ciclo 1</b><small>24–26 ago</small></div>
      <div class="cycle"><i></i><b>Ciclo 2</b><small>27–31 ago</small></div>
      <div class="cycle"><i></i><b>Ciclo 3</b><small>01–03 set</small></div>
      <div class="cycle"><i></i><b>Fechamento</b><small>04 set</small></div>
    </div></div></div>`;
}

function renderPath(){
  $('#path').innerHTML=`
    <div class="card pathCard"><div class="cardHead"><h2>O que libera o quê</h2><span>azul = caminho que não pode atrasar</span></div><div class="cardBody">
      <div class="network">
        ${node('APP-01','Fechar base segura',20,25,true)}
        ${edge(155,58,55,0,true)} ${node('APP-02','Conta e acesso',212,25,true)}
        ${edge(347,58,55,0,true)} ${node('APP-03','Partes do produto',404,25,true)}
        ${edge(539,58,55,0,true)} ${node('APP-04','Conectar produto',596,25,true)}
        ${edge(731,58,55,0,true)} ${node('APP-05','Colocar no ar',788,25,true)}
        ${edge(855,94,62,90,true)} ${node('SHOW-01','Escolher prova real',788,160,true)}
        ${edge(855,229,42,90,true)} ${node('SHOW-02','3 vídeos',680,275,true)}
        ${node('SHOW-03','3 comparativos',880,275,false)}
        ${edge(815,308,72,0,true)} ${edge(947,343,70,90,false)}
        ${node('BLOG-03','3 campanhas',788,382,true)} ${edge(923,415,55,0,true)}
        ${node('BLOG-04','Publicar e medir',980,382,true)} ${edge(1047,450,32,90,true)}
        ${node('DAT-04','Fechar evidências',980,490,true)}
        ${node('BUS-01','Mensagem',20,175,false)}
        ${node('PHY-01','3 produtos',20,275,false)}
        ${node('INF-01','3 infoprodutos',20,355,false)}
        ${node('CONS-01','3 serviços',20,435,false)}
        ${node('BUS-02','Mapa das ofertas',212,290,false)}
        ${node('BUS-03','Fechar preços',404,290,false)}
        ${node('BUS-04','Fechar canais',596,290,false)}
        ${node('DAT-01/02','Definir o que medir',404,405,false)}
        ${node('DAT-03','Ligar medição',596,430,false)}
        ${edge(347,323,55,0,false)} ${edge(539,323,55,0,false)}
        ${edge(731,465,242,-11,false)}
      </div>
    </div></div>
    <div class="three" style="margin-top:12px">
      <div class="card kpi"><small>Se atrasar, atrasa o resultado</small><strong>27h30</strong><em>sequência em azul</em></div>
      <div class="card kpi"><small>Entregas conectadas</small><strong>33/33</strong><em>nenhuma entrega solta</em></div>
      <div class="card kpi"><small>Regra de execução</small><strong>1 por vez</strong><em>só puxe o que já pode começar</em></div>
    </div>`;
}
function node(id,title,left,top,hot){return `<div class="node ${hot?'hot':''}" style="left:${left}px;top:${top}px"><b>${id}</b>${title}</div>`}
function edge(left,top,width,deg,hot){return `<div class="edge arrow ${hot?'hot':''}" style="left:${left}px;top:${top}px;width:${width}px;transform:rotate(${deg}deg)"></div>`}

function openEvidence(task){
  $('#evidenceTaskTitle').textContent=task.title;
  $('#evidenceNote').value='';
  $('#evidenceUrl').value='';
  $('#evidenceFile').value='';
  $('#evidenceDialog').dataset.task=task.id;
  $('#evidenceDialog').showModal();
}
$('#saveEvidenceBtn').onclick=async()=>{
  const taskId=$('#evidenceDialog').dataset.task;
  const file=$('#evidenceFile').files[0];
  let fileData=null;
  if(file && file.size < 2500000){
    fileData=await new Promise(res=>{const r=new FileReader();r.onload=()=>res({name:file.name,type:file.type,data:r.result});r.readAsDataURL(file)});
  }
  state.evidence.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),taskId,note:$('#evidenceNote').value.trim(),url:$('#evidenceUrl').value.trim(),file:fileData,at:new Date().toISOString()});
  if(!state.done.includes(taskId)) state.done.push(taskId);
  state.started[taskId]=Math.ceil(byId(taskId).mins/15);
  state.focus=null;
  save();
  $('#evidenceDialog').close();
  renderAll();
};

function renderAll(){renderOverview();renderFocus();renderCalendar();renderPath();}

$('#resetBtn').onclick=()=>{
  if(confirm('Reiniciar a demonstração e apagar os registros locais?')){
    localStorage.removeItem(stateKey); state={done:[],focus:null,evidence:[],started:{}}; renderAll();
  }
};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').classList.add('hidden')}};

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/legado/sprint-operacional/sw.js',{scope:'/legado/sprint-operacional/'}).catch(()=>{}))}
renderAll();
