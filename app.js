
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let DATA={};
async function loadData(){
  const [players,teams,matchs,goals,attendance]=await Promise.all([
    fetch('data/players.json').then(r=>r.json()),fetch('data/teams.json').then(r=>r.json()),
    fetch('data/matchs.json').then(r=>r.json()),fetch('data/goals.json').then(r=>r.json()),
    fetch('data/attendance.json').then(r=>r.json())
  ]); DATA={players,teams,matchs,goals,attendance}; return DATA;
}
const typeLabel=t=>({Friendly:'Amical',League:'Championnat',Cup:'Coupe'}[t]||t);
const posLabel=p=>({goal:'Gardien',defender:'Défenseur',midfielder:'Milieu',striker:'Attaquant'}[p]||p);
const initials=n=>n.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
function teamOf(m){return m.team1.startsWith('Rojiblanca')?m.team1:m.team2}
function isHome(m){return m.team1.startsWith('Rojiblanca')}
function resultFor(m){return m.result}
function filteredMatches(type='all',comp='all'){
 return DATA.matchs.filter(m=>(type==='all'||teamOf(m)===type)&&(comp==='all'||m.type===comp));
}
function calcStats(ms){
 let w=0,d=0,l=0,gf=0,ga=0;
 ms.forEach(m=>{let home=isHome(m), r=m.result; if(r==='Win')w++; if(r==='Draw')d++; if(r==='Loss')l++; gf+=home?m.goals1:m.goals2; ga+=home?m.goals2:m.goals1});
 const n=ms.length||1; return {m:ms.length,w,d,l,gf,ga,diff:gf-ga,wp:Math.round(w/n*100),dp:Math.round(d/n*100),lp:Math.round(l/n*100)};
}
function goalsForPlayer(name, ms=DATA.matchs){
 const ids=new Set(ms.map(m=>m.id));
 const rows=DATA.goals.filter(g=>ids.has(g.matchId));
 return {goals:rows.filter(g=>g.goal===name&&!g.ag).length, assists:rows.filter(g=>g.assist===name&&g.assist!=='Solo').length};
}
function appearances(name,ms=DATA.matchs){
 const ids=new Set(ms.map(m=>m.id)); return DATA.attendance.filter(a=>ids.has(a.matchId)&&a.player===name&&a.present).length;
}
function renderNav(active){$$('.navlinks a').forEach(a=>a.classList.toggle('active',a.dataset.page===active))}
function playerCard(p){return `<a class="card player-card" href="joueur.html?id=${p.id}"><div class="avatar">${initials(p.name)}</div><div><div class="position">${posLabel(p.position)}</div><strong>${p.name}</strong></div><div class="player-no">${String(p.number).padStart(2,'0')}</div></a>`}
function matchRow(m){let home=isHome(m), opp=home?m.team2:m.team1, gf=home?m.goals1:m.goals2, ga=home?m.goals2:m.goals1; return `<div class="match"><div class="date">MATCH #${String(m.id).padStart(2,'0')}</div><div><div class="opponent">${opp}</div><div class="competition">${home?'Domicile':'Extérieur'} · ${typeLabel(m.type)}</div></div><div class="score">${gf} — ${ga}</div><div class="badge ${m.result.toLowerCase()}">${m.result==='Win'?'VICTOIRE':m.result==='Draw'?'NUL':'DÉFAITE'}</div></div>`}
function filters(target){
 $$('.filter').forEach(b=>b.onclick=()=>{ $$('.filter',b.parentElement).forEach(x=>x.classList.remove('active')); b.classList.add('active'); target() })
}
async function home(){
 renderNav('home'); const ms=DATA.matchs, s=calcStats(ms), last=ms[ms.length-1];
 $('#home-kpis').innerHTML=`<div class="kpi"><b>${s.m}</b><span>Matchs joués</span></div><div class="kpi"><b>${s.wp}%</b><span>Victoires</span></div><div class="kpi"><b>${s.gf}</b><span>Buts marqués</span></div><div class="kpi"><b>${s.diff>0?'+':''}${s.diff}</b><span>Différence</span></div>`;
 $('#home-last').innerHTML=matchRow(last); $('#home-next').innerHTML=`<div class="hero-team"><div class="muted-white">PROCHAIN RENDEZ-VOUS</div><div style="font-size:22px;margin-top:10px">Rojiblanca</div></div><div class="versus">VS</div><div class="hero-team"><div class="muted-white">À VENIR</div><div style="font-size:22px;margin-top:10px">Adversaire</div></div>`;
}
async function equipe(){
 renderNav('equipe'); const groups=['goal','defender','midfielder','striker'];
 $('#squad').innerHTML=groups.map(pos=>`<section><div class="section-head"><div><div class="eyebrow">${posLabel(pos)}</div><h2>${DATA.players.filter(p=>p.position===pos).length} joueurs</h2></div></div><div class="grid3">${DATA.players.filter(p=>p.position===pos).map(playerCard).join('')}</div></section>`).join('');
}
async function resultats(){
 renderNav('resultats'); const list=()=>{let t=$('#team-filter .active').dataset.val,c=$('#comp-filter .active').dataset.val; $('#matches').innerHTML=filteredMatches(t,c).reverse().map(matchRow).join('')||'<div class="card" style="padding:30px">Aucun résultat.</div>';};
 $('#team-filter').innerHTML=['all','Rojiblanca 7','Rojiblanca 11'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':x.replace('Rojiblanca ','Foot à ')}</button>`).join('');
 $('#comp-filter').innerHTML=['all','Friendly','League','Cup'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':typeLabel(x)}</button>`).join('');
 filters(list); filters(list); list();
}
async function statistiques(){
 renderNav('stats'); const run=()=>{let t=$('#stat-team .active').dataset.val,c=$('#stat-comp .active').dataset.val, ms=filteredMatches(t,c),s=calcStats(ms);
 $('#stats-kpis').innerHTML=[['Matchs',s.m],['Victoires',s.wp+'%'],['Nuls',s.dp+'%'],['Défaites',s.lp+'%'],['Buts marqués',s.gf],['Buts concédés',s.ga],['Différence',(s.diff>0?'+':'')+s.diff]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
 let rows=DATA.players.map(p=>({...p,...goalsForPlayer(p.name,ms)})).sort((a,b)=>(b.goals+b.assists)-(a.goals+a.assists)).slice(0,3);
 $('#podium').innerHTML=rows.map((p,i)=>`<a class="podium-card" href="joueur.html?id=${p.id}"><div class="medal">#${i+1} · décisif</div><div class="big">${p.goals+p.assists}</div><strong>${p.name}</strong><div class="muted-white" style="color:var(--muted);margin-top:6px">${p.goals} buts · ${p.assists} passes</div></a>`).join('');
 };
 $('#stat-team').innerHTML=['all','Rojiblanca 7','Rojiblanca 11'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':x.replace('Rojiblanca ','Foot à ')}</button>`).join('');
 $('#stat-comp').innerHTML=['all','Friendly','League','Cup'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':typeLabel(x)}</button>`).join('');
 filters(run); filters(run); run();
}
async function joueur(){
 const id=Number(new URLSearchParams(location.search).get('id'))||1,p=DATA.players.find(x=>x.id===id)||DATA.players[0];
 renderNav('equipe');
 const selected=()=> {
   const t=$('#player-team .active').dataset.val, c=$('#player-comp .active').dataset.val;
   let ms=filteredMatches(t,c);
   const ids=new Set(DATA.attendance.filter(a=>a.player===p.name&&a.present).map(a=>a.matchId));
   ms=ms.filter(m=>ids.has(m.id));
   let s=calcStats(ms), st=goalsForPlayer(p.name,ms);
   const rank=(metric)=>{
     const rows=DATA.players.map(x=>{const z=goalsForPlayer(x.name,ms); return {id:x.id,v:metric==='decisive'?z.goals+z.assists:z[metric]}})
       .sort((a,b)=>b.v-a.v);
     const idx=rows.findIndex(x=>x.id===p.id);
     return idx<0?'—':'#'+(idx+1);
   };
   $('#player-kpis').innerHTML=[
     ['Matchs joués',s.m],['Victoires',s.wp+'%'],['Nuls',s.dp+'%'],['Défaites',s.lp+'%'],
     ['Buts',st.goals],['Passes décisives',st.assists],['Décisivité',st.goals+st.assists]
   ].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
   $('#player-ranks').innerHTML=[
     ['Rang buts',rank('goals'),'sur la sélection'],
     ['Rang passes',rank('assists'),'sur la sélection'],
     ['Rang décisivité',rank('decisive'),'buts + passes']
   ].map(x=>`<div class="card stat-card"><div class="stat-label">${x[0]}</div><div class="stat-num">${x[1]}</div><div class="stat-sub">${x[2]}</div></div>`).join('');
 };
 $('#player-team').innerHTML=['all','Rojiblanca 7','Rojiblanca 11'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':x.replace('Rojiblanca ','Foot à ')}</button>`).join('');
 $('#player-comp').innerHTML=['all','Friendly','League','Cup'].map((x,i)=>`<button class="filter ${i===0?'active':''}" data-val="${x}">${x==='all'?'Tous':typeLabel(x)}</button>`).join('');
 filters(selected); filters(selected); selected();
}

(async()=>{await loadData(); const page=document.body.dataset.page; ({home,equipe,resultats,statistiques,joueur}[page]||home)();})();
