(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))s(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const v of o.addedNodes)v.tagName==="LINK"&&v.rel==="modulepreload"&&s(v)}).observe(document,{childList:!0,subtree:!0});function a(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(t){if(t.ep)return;t.ep=!0;const o=a(t);fetch(t.href,o)}})();function A(e,i){const a=document.getElementById("search-container");let s=-1,t=[],o=!1,v=null;a.innerHTML=`
    <div class="search-wrapper">
      <span class="search-icon">&#128269;</span>
      <input type="text" class="search-input" placeholder="Search enemies and bosses..." autocomplete="off" spellcheck="false" />
    </div>
    <div class="search-filters">
      <button class="filter-btn" data-filter="all">All</button>
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="bosses">Bosses Only</button>
    </div>
    <div class="search-results hidden"></div>
  `;const p=a.querySelector(".search-filters");p.innerHTML=`
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="bosses">Bosses Only</button>
  `;const n=a.querySelector(".search-input"),d=a.querySelector(".search-results"),c=p.querySelectorAll(".filter-btn");c.forEach(l=>{l.addEventListener("click",()=>{c.forEach(f=>f.classList.remove("active")),l.classList.add("active"),o=l.dataset.filter==="bosses",n.value.trim()&&r(n.value.trim())})});function r(l){if(!l){$();return}const f=l.toLowerCase();t=(o?e.filter(m=>m.isBoss):e).map(m=>{const g=m.name.toLowerCase();let k=0;if(g===f)k=100;else if(g.startsWith(f))k=80;else if(g.includes(f))k=60;else{const T=g.split(/[\s,]+/);for(const D of T)if(D.startsWith(f)){k=40;break}}return{enemy:m,score:k}}).filter(m=>m.score>0).sort((m,g)=>g.score!==m.score?g.score-m.score:m.enemy.isBoss!==g.enemy.isBoss?m.enemy.isBoss?-1:1:m.enemy.name.localeCompare(g.enemy.name)).slice(0,30).map(m=>m.enemy),u()}function u(){if(t.length===0){d.innerHTML='<div class="search-result-item"><span class="result-name" style="color:var(--text-muted)">No results found</span></div>',d.classList.remove("hidden");return}d.innerHTML=t.map((l,f)=>`
      <div class="search-result-item${f===s?" active":""}" data-index="${f}">
        <span class="result-name">${b(l.name,n.value.trim())}</span>
        <span class="result-meta">
          ${l.location?`<span>${l.location}</span>`:""}
          <span class="result-tag ${l.isBoss?"tag-boss":"tag-enemy"}">${l.isBoss?"Boss":"Enemy"}</span>
        </span>
      </div>
    `).join(""),d.classList.remove("hidden"),d.querySelectorAll(".search-result-item").forEach(l=>{l.addEventListener("click",()=>{const f=parseInt(l.dataset.index);t[f]&&y(t[f])})})}function b(l,f){if(!f)return h(l);const w=l.toLowerCase().indexOf(f.toLowerCase());if(w===-1)return h(l);const m=l.slice(0,w),g=l.slice(w,w+f.length),k=l.slice(w+f.length);return`${h(m)}<strong style="color:var(--accent-gold)">${h(g)}</strong>${h(k)}`}function h(l){return l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function y(l){n.value=l.name,$(),s=-1,i(l)}function $(){d.classList.add("hidden"),s=-1}return n.addEventListener("input",()=>{clearTimeout(v),s=-1,v=setTimeout(()=>{r(n.value.trim())},120)}),n.addEventListener("keydown",l=>{d.classList.contains("hidden")||(l.key==="ArrowDown"?(l.preventDefault(),s=Math.min(s+1,t.length-1),u()):l.key==="ArrowUp"?(l.preventDefault(),s=Math.max(s-1,-1),u()):l.key==="Enter"?(l.preventDefault(),s>=0&&t[s]?y(t[s]):t.length>0&&y(t[0])):l.key==="Escape"&&($(),n.blur()))}),document.addEventListener("click",l=>{a.contains(l.target)||$()}),n.addEventListener("focus",()=>{n.value.trim()&&t.length>0&&d.classList.remove("hidden")}),{input:n,focus:()=>n.focus()}}const H=[{key:"physical",label:"Physical",barClass:"bar-physical"},{key:"slash",label:"Slash",barClass:"bar-slash"},{key:"blow",label:"Strike",barClass:"bar-blow"},{key:"thrust",label:"Thrust",barClass:"bar-thrust"},{key:"magic",label:"Magic",barClass:"bar-magic"},{key:"fire",label:"Fire",barClass:"bar-fire"},{key:"lightning",label:"Lightning",barClass:"bar-lightning"},{key:"holy",label:"Holy",barClass:"bar-holy"}],P=[{key:"neutral",label:"Physical",barClass:"bar-physical"},{key:"slash",label:"Slash",barClass:"bar-slash"},{key:"blow",label:"Strike",barClass:"bar-blow"},{key:"thrust",label:"Thrust",barClass:"bar-thrust"},{key:"magic",label:"Magic",barClass:"bar-magic"},{key:"fire",label:"Fire",barClass:"bar-fire"},{key:"lightning",label:"Lightning",barClass:"bar-lightning"},{key:"holy",label:"Holy",barClass:"bar-holy"}],B=[{key:"poison",label:"Poison",icon:"&#9762;"},{key:"scarletRot",label:"Scarlet Rot",icon:"&#9763;"},{key:"hemorrhage",label:"Hemorrhage",icon:"&#128167;"},{key:"frost",label:"Frostbite",icon:"&#10052;"},{key:"sleep",label:"Sleep",icon:"&#128164;"},{key:"madness",label:"Madness",icon:"&#128293;"},{key:"deathBlight",label:"Death Blight",icon:"&#9760;"}];function F(e){const i=Math.max(...Object.values(e),1),a=Math.max(i*1.2,200);return`
    <div class="profile-card">
      <div class="card-title">Defense</div>
      ${H.map(t=>{const o=e[t.key]||0,v=Math.max(o/a*100,1);return`
      <div class="stat-row">
        <span class="stat-row-label">${t.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${t.barClass}" style="width:${v}%"></div>
          <span class="stat-bar-value">${o}</span>
        </div>
      </div>
    `}).join("")}
    </div>
  `}function R(e){return`
    <div class="profile-card">
      <div class="card-title">Damage Negation</div>
      ${P.map(a=>{const t=((1-e[a.key])*100).toFixed(1),o=Math.max(Math.abs(parseFloat(t)),1),v=parseFloat(t)<0;return`
      <div class="stat-row">
        <span class="stat-row-label">${a.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${a.barClass}" style="width:${Math.min(Math.abs(o),100)}%; opacity:${v?.4:1}"></div>
          <span class="stat-bar-value" style="${v?"color:var(--accent-red)":""}">${t}%</span>
        </div>
      </div>
    `}).join("")}
    </div>
  `}function I(e){return`
    <div class="profile-card">
      <div class="card-title">Status Resistances</div>
      <div class="resist-grid">${B.map(a=>{const s=e[a.key]||0;let t="resist-medium";s>=999?t="resist-immune":s>=400?t="resist-high":s>=200?t="resist-medium":s>=100?t="resist-low":t="resist-weak";const o=s>=999?"Immune":s;return`
      <div class="resist-item">
        <div class="resist-value ${t}">${o}</div>
        <div class="resist-label">${a.label}</div>
      </div>
    `}).join("")}</div>
    </div>
  `}const E=[{key:"name",label:"Attack Name",numeric:!1},{key:"atkPhys",label:"Phys",numeric:!0,dmgClass:"dmg-phys"},{key:"atkMag",label:"Magic",numeric:!0,dmgClass:"dmg-mag"},{key:"atkFire",label:"Fire",numeric:!0,dmgClass:"dmg-fire"},{key:"atkThun",label:"Ltn",numeric:!0,dmgClass:"dmg-ltn"},{key:"atkDark",label:"Holy",numeric:!0,dmgClass:"dmg-holy"},{key:"poiseDamage",label:"Poise",numeric:!0,dmgClass:"dmg-poise"},{key:"atkStam",label:"Stamina",numeric:!0,dmgClass:"dmg-phys"},{key:"hitRadius",label:"Range",numeric:!0},{key:"knockback",label:"KB",numeric:!0},{key:"type",label:"Type",numeric:!1}];function j(e){if(!e||e.length===0)return`
      <div class="profile-card full-width">
        <div class="card-title">Attacks</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No attack data available for this enemy.</div>
      </div>
    `;let i="atkPhys",a="desc";const s=document.createElement("div");s.className="profile-card full-width";function t(){const o=[...e].sort((n,d)=>{const c=E.find(b=>b.key===i);let r=n[i]??"",u=d[i]??"";if(c&&c.numeric)return r=typeof r=="number"?r:parseFloat(r)||0,u=typeof u=="number"?u:parseFloat(u)||0,a==="asc"?r-u:u-r;{r=String(r).toLowerCase(),u=String(u).toLowerCase();const b=r.localeCompare(u);return a==="asc"?b:-b}}),v=E.map(n=>{const d=n.key===i,c=d?a==="asc"?"&#9650;":"&#9660;":"";return`<th class="${d?"sorted":""}" data-key="${n.key}">${n.label}<span class="sort-arrow">${c}</span></th>`}).join(""),p=o.map(n=>`<tr>${E.map(c=>{const r=n[c.key];if(c.key==="name"){const h=r||`Attack ${n.behaviorId||"?"}`;return`<td title="${G(h)}">${M(h)}</td>`}if(c.key==="type")return`<td><span class="type-badge">${M(r||"Standard")}</span></td>`;if(c.key==="hitRadius"||c.key==="knockback")return`<td>${typeof r=="number"?r.toFixed(2):r||"0"}</td>`;const u=r||0;return`<td class="${u===0?"dmg-zero":c.dmgClass||""}">${u}</td>`}).join("")}</tr>`).join("");s.innerHTML=`
      <div class="card-title">Attacks</div>
      <div class="attack-count">${e.length} attack${e.length!==1?"s":""} &middot; Click column headers to sort</div>
      <div class="attack-table-wrapper">
        <table class="attack-table">
          <thead><tr>${v}</tr></thead>
          <tbody>${p}</tbody>
        </table>
      </div>
    `,s.querySelectorAll(".attack-table th").forEach(n=>{n.addEventListener("click",()=>{const d=n.dataset.key;if(i===d)a=a==="asc"?"desc":"asc";else{i=d;const c=E.find(r=>r.key===d);a=c&&c.numeric?"desc":"asc"}t()})})}return t(),s}function M(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function G(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const O=[{key:"maxHp",label:"HP"},{key:"physAtk",label:"Phys ATK"},{key:"magAtk",label:"Magic ATK"},{key:"fireAtk",label:"Fire ATK"},{key:"lightningAtk",label:"Lightning ATK"},{key:"holyAtk",label:"Holy ATK"},{key:"physDef",label:"Phys DEF"},{key:"magDef",label:"Magic DEF"},{key:"fireDef",label:"Fire DEF"},{key:"lightningDef",label:"Lightning DEF"},{key:"holyDef",label:"Holy DEF"},{key:"soulRate",label:"Rune Reward"},{key:"staminaAtk",label:"Stamina DMG"},{key:"poiseDmg",label:"Poise DMG"}];function q(e,i){if(!e||e.length===0)return`
      <div class="profile-card full-width">
        <div class="card-title">NG+ Scaling</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No NG+ scaling data available.</div>
      </div>
    `;let a=0;const s=document.createElement("div");s.className="profile-card full-width";function t(){const o=e.map((r,u)=>{const b=u===0?"NG":`NG+${u}`;return`<th class="${u===a?"selected-col":""}" data-cycle="${u}">${b}</th>`}).join(""),v=O.map(r=>{const u=e.map((b,h)=>{const y=b[r.key]||1,$=h===a;let l="",f="ng-neutral";return y===1?(l="1.00x",f="ng-neutral"):y>1?(l=y.toFixed(2)+"x",f="ng-increase"):(l=y.toFixed(2)+"x",f="ng-decrease"),`<td class="${$?"selected-col":""} ${f}">${l}</td>`}).join("");return`<tr><td>${r.label}</td>${u}</tr>`}).join(""),p=e[a],n=i?Math.floor(i.hp*(p.maxHp||1)):null,d=i?Math.floor(i.runeReward*(p.soulRate||1)):null,c=i?`
      <div style="display:flex; gap:2rem; margin-bottom:1rem; flex-wrap:wrap;">
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          <span style="color:var(--accent-gold); font-weight:600;">${a===0?"NG":"NG+"+a}</span> Scaled Values:
          <span style="color:var(--accent-red); font-family:var(--font-mono); margin-left:0.5rem;">${n.toLocaleString()} HP</span>
          <span style="color:var(--accent-gold); font-family:var(--font-mono); margin-left:1rem;">${d.toLocaleString()} Runes</span>
        </div>
      </div>
    `:"";s.innerHTML=`
      <div class="card-title">NG+ Scaling</div>
      ${c}
      <div class="ng-table-wrapper">
        <table class="ng-table">
          <thead><tr><th>Stat</th>${o}</tr></thead>
          <tbody>${v}</tbody>
        </table>
      </div>
    `,s.querySelectorAll(".ng-table th[data-cycle]").forEach(r=>{r.addEventListener("click",()=>{a=parseInt(r.dataset.cycle),t()})})}return t(),s}function S(e,i){const a=document.getElementById("enemy-profile");a.innerHTML="",a.classList.remove("hidden"),document.getElementById("welcome-screen").classList.add("hidden");const s=document.createElement("div");s.className="profile-hero";const t=e.variants&&e.variants.length>0?`<select class="variant-select" id="variant-select">
        <option value="primary">${e.name} (Primary)</option>
        ${e.variants.map((c,r)=>`<option value="${r}">${c.name} — ${c.label}</option>`).join("")}
       </select>`:"";s.innerHTML=`
    <div class="profile-hero-top">
      <div>
        <div class="profile-name">${x(e.name)}</div>
        ${e.location?`<div class="profile-location">${x(e.location)}</div>`:""}
        <div class="profile-id">ID: ${e.id} &middot; Behavior Group: ${e.behaviorVariationId}</div>
      </div>
      <div>${t}</div>
    </div>
    <div class="profile-stats">
      <div class="stat-block">
        <div class="stat-value hp">${e.hp.toLocaleString()}</div>
        <div class="stat-label">Hit Points</div>
      </div>
      <div class="stat-block">
        <div class="stat-value poise">${e.poise}</div>
        <div class="stat-label">Poise</div>
      </div>
      <div class="stat-block">
        <div class="stat-value runes">${e.runeReward.toLocaleString()}</div>
        <div class="stat-label">Runes</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color:var(--text-secondary)">${e.attacks.length}</div>
        <div class="stat-label">Attacks</div>
      </div>
      ${e.isBoss?'<div class="stat-block"><div class="stat-value" style="color:var(--accent-gold);font-size:1rem;">&#9876;</div><div class="stat-label">Boss</div></div>':""}
    </div>
  `,a.appendChild(s);const o=document.createElement("div");o.className="profile-grid",o.innerHTML=F(e.defense)+R(e.damageNegation),a.appendChild(o);const v=document.createElement("div");v.className="profile-grid",v.innerHTML=I(e.resistances)+K(e.spEffectIds),a.appendChild(v);const p=j(e.attacks);if(typeof p=="string"){const c=document.createElement("div");c.innerHTML=p,a.appendChild(c.firstElementChild)}else a.appendChild(p);const n=q(i,e);if(typeof n=="string"){const c=document.createElement("div");c.innerHTML=n,a.appendChild(c.firstElementChild)}else a.appendChild(n);const d=a.querySelector("#variant-select");d&&d.addEventListener("change",c=>{const r=c.target.value;if(r==="primary")S(e,i);else{const u=e.variants[parseInt(r)],b={...e,...u,attacks:e.attacks,variants:e.variants,runeReward:e.runeReward,location:e.location,isBoss:e.isBoss,spEffectIds:e.spEffectIds};S(b,i);const h=a.querySelector("#variant-select");h&&(h.value=r)}}),window.scrollTo({top:0,behavior:"smooth"})}function K(e){return!e||e.length===0?`
      <div class="profile-card">
        <div class="card-title">Special Effects</div>
        <div style="color:var(--text-muted); padding: 0.5rem 0;">None</div>
      </div>
    `:`
    <div class="profile-card">
      <div class="card-title">Special Effect IDs</div>
      <div class="speffect-list">${e.map(a=>`<span class="speffect-tag">${a}</span>`).join("")}</div>
    </div>
  `}function x(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}let L=[],C=[];async function V(){const e=document.getElementById("loading"),i=document.getElementById("welcome-screen");try{const a="/er-analyzer/",[s,t]=await Promise.all([fetch(`${a}data/enemies.json`),fetch(`${a}data/ng-scaling.json`)]);if(!s.ok)throw new Error(`Failed to load enemies.json: ${s.status}`);if(!t.ok)throw new Error(`Failed to load ng-scaling.json: ${t.status}`);const o=await s.json(),v=await t.json();L=o.enemies,C=v.scaling;const p=o.metadata,n=i.querySelector(".welcome-sub");n&&p&&(n.textContent=`${p.totalEnemies} enemies · ${p.totalBosses} bosses · ${p.totalAttacks.toLocaleString()} attacks`);const d=A(L,c=>{S(c,C),z(c.id)});e.classList.add("hidden"),i.classList.remove("hidden"),N(),window.addEventListener("hashchange",N),d.focus(),console.log(`Loaded ${L.length} enemies with ${C.length} NG+ cycles`)}catch(a){e.textContent=`Error loading data: ${a.message}`,e.style.color="var(--accent-red)",console.error("Init error:",a)}}function N(){const e=window.location.hash.slice(1);if(!e)return;const i=parseInt(e);if(isNaN(i))return;const a=L.find(s=>s.id===i);a&&S(a,C)}function z(e){history.replaceState(null,"",`#${e}`)}document.addEventListener("DOMContentLoaded",V);
