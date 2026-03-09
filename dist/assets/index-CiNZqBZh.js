(function(){const c=document.createElement("link").relList;if(c&&c.supports&&c.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const p of o.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&a(p)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();function x(e,c){const t=document.getElementById("search-container");let a=-1,s=[],o=!1,p=null;t.innerHTML=`
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
  `;const v=t.querySelector(".search-filters");v.innerHTML=`
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="bosses">Bosses Only</button>
  `;const i=t.querySelector(".search-input"),d=t.querySelector(".search-results"),n=v.querySelectorAll(".filter-btn");n.forEach(l=>{l.addEventListener("click",()=>{n.forEach(f=>f.classList.remove("active")),l.classList.add("active"),o=l.dataset.filter==="bosses",i.value.trim()&&r(i.value.trim())})});function r(l){if(!l){$();return}const f=l.toLowerCase();s=(o?e.filter(m=>m.isBoss):e).map(m=>{const b=m.name.toLowerCase();let k=0;if(b===f)k=100;else if(b.startsWith(f))k=80;else if(b.includes(f))k=60;else{const H=b.split(/[\s,]+/);for(const D of H)if(D.startsWith(f)){k=40;break}}return{enemy:m,score:k}}).filter(m=>m.score>0).sort((m,b)=>b.score!==m.score?b.score-m.score:m.enemy.isBoss!==b.enemy.isBoss?m.enemy.isBoss?-1:1:m.enemy.name.localeCompare(b.enemy.name)).slice(0,30).map(m=>m.enemy),u()}function u(){if(s.length===0){d.innerHTML='<div class="search-result-item"><span class="result-name" style="color:var(--text-muted)">No results found</span></div>',d.classList.remove("hidden");return}d.innerHTML=s.map((l,f)=>`
      <div class="search-result-item${f===a?" active":""}" data-index="${f}">
        <span class="result-name">${g(l.name,i.value.trim())}</span>
        <span class="result-meta">
          ${l.location?`<span>${l.location}</span>`:""}
          <span class="result-tag ${l.isBoss?"tag-boss":"tag-enemy"}">${l.isBoss?"Boss":"Enemy"}</span>
        </span>
      </div>
    `).join(""),d.classList.remove("hidden"),d.querySelectorAll(".search-result-item").forEach(l=>{l.addEventListener("click",()=>{const f=parseInt(l.dataset.index);s[f]&&y(s[f])})})}function g(l,f){if(!f)return h(l);const w=l.toLowerCase().indexOf(f.toLowerCase());if(w===-1)return h(l);const m=l.slice(0,w),b=l.slice(w,w+f.length),k=l.slice(w+f.length);return`${h(m)}<strong style="color:var(--accent-gold)">${h(b)}</strong>${h(k)}`}function h(l){return l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function y(l){i.value=l.name,$(),a=-1,c(l)}function $(){d.classList.add("hidden"),a=-1}return i.addEventListener("input",()=>{clearTimeout(p),a=-1,p=setTimeout(()=>{r(i.value.trim())},120)}),i.addEventListener("keydown",l=>{d.classList.contains("hidden")||(l.key==="ArrowDown"?(l.preventDefault(),a=Math.min(a+1,s.length-1),u()):l.key==="ArrowUp"?(l.preventDefault(),a=Math.max(a-1,-1),u()):l.key==="Enter"?(l.preventDefault(),a>=0&&s[a]?y(s[a]):s.length>0&&y(s[0])):l.key==="Escape"&&($(),i.blur()))}),document.addEventListener("click",l=>{t.contains(l.target)||$()}),i.addEventListener("focus",()=>{i.value.trim()&&s.length>0&&d.classList.remove("hidden")}),{input:i,focus:()=>i.focus()}}const N=[{key:"physical",label:"Physical",barClass:"bar-physical"},{key:"slash",label:"Slash",barClass:"bar-slash"},{key:"blow",label:"Strike",barClass:"bar-blow"},{key:"thrust",label:"Thrust",barClass:"bar-thrust"},{key:"magic",label:"Magic",barClass:"bar-magic"},{key:"fire",label:"Fire",barClass:"bar-fire"},{key:"lightning",label:"Lightning",barClass:"bar-lightning"},{key:"holy",label:"Holy",barClass:"bar-holy"}],B=[{key:"poison",label:"Poison",icon:"&#9762;"},{key:"scarletRot",label:"Scarlet Rot",icon:"&#9763;"},{key:"hemorrhage",label:"Hemorrhage",icon:"&#128167;"},{key:"frost",label:"Frostbite",icon:"&#10052;"},{key:"sleep",label:"Sleep",icon:"&#128164;"},{key:"madness",label:"Madness",icon:"&#128293;"},{key:"deathBlight",label:"Death Blight",icon:"&#9760;"}];function R(e){return`
    <div class="profile-card">
      <div class="card-title">Damage Absorption</div>
      ${N.map(t=>{const a=e[t.key]??1,s=Math.round((1-a)*100),o=Math.min(Math.abs(s),100),p=s<0;return`
      <div class="stat-row">
        <span class="stat-row-label">${t.label}</span>
        <div class="stat-bar-container">
          <div class="stat-bar ${t.barClass}" style="width:${Math.max(o,1)}%; opacity:${p?.4:1}"></div>
          <span class="stat-bar-value" style="${p?"color:var(--accent-red)":""}">${s}%</span>
        </div>
      </div>
    `}).join("")}
    </div>
  `}function P(e){return`
    <div class="profile-card">
      <div class="card-title">Status Resistances</div>
      <div class="resist-grid">${B.map(t=>{const a=e[t.key]||0;let s="resist-medium";a>=999?s="resist-immune":a>=400?s="resist-high":a>=200?s="resist-medium":a>=100?s="resist-low":s="resist-weak";const o=a>=999?"Immune":a;return`
      <div class="resist-item">
        <div class="resist-value ${s}">${o}</div>
        <div class="resist-label">${t.label}</div>
      </div>
    `}).join("")}</div>
    </div>
  `}const E=[{key:"name",label:"Attack Name",numeric:!1},{key:"atkPhys",label:"Phys",numeric:!0,dmgClass:"dmg-phys"},{key:"atkMag",label:"Magic",numeric:!0,dmgClass:"dmg-mag"},{key:"atkFire",label:"Fire",numeric:!0,dmgClass:"dmg-fire"},{key:"atkThun",label:"Ltn",numeric:!0,dmgClass:"dmg-ltn"},{key:"atkDark",label:"Holy",numeric:!0,dmgClass:"dmg-holy"},{key:"poiseDamage",label:"Poise",numeric:!0,dmgClass:"dmg-poise"},{key:"atkStam",label:"Stamina",numeric:!0,dmgClass:"dmg-phys"},{key:"hitRadius",label:"Range",numeric:!0},{key:"knockback",label:"KB",numeric:!0},{key:"type",label:"Type",numeric:!1}];function I(e){if(!e||e.length===0)return`
      <div class="profile-card full-width">
        <div class="card-title">Attacks</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No attack data available for this enemy.</div>
      </div>
    `;let c="atkPhys",t="desc";const a=document.createElement("div");a.className="profile-card full-width";function s(){const o=[...e].sort((i,d)=>{const n=E.find(g=>g.key===c);let r=i[c]??"",u=d[c]??"";if(n&&n.numeric)return r=typeof r=="number"?r:parseFloat(r)||0,u=typeof u=="number"?u:parseFloat(u)||0,t==="asc"?r-u:u-r;{r=String(r).toLowerCase(),u=String(u).toLowerCase();const g=r.localeCompare(u);return t==="asc"?g:-g}}),p=E.map(i=>{const d=i.key===c,n=d?t==="asc"?"&#9650;":"&#9660;":"";return`<th class="${d?"sorted":""}" data-key="${i.key}">${i.label}<span class="sort-arrow">${n}</span></th>`}).join(""),v=o.map(i=>`<tr>${E.map(n=>{const r=i[n.key];if(n.key==="name"){const h=r||`Attack ${i.behaviorId||"?"}`;return`<td title="${F(h)}">${A(h)}</td>`}if(n.key==="type")return`<td><span class="type-badge">${A(r||"Standard")}</span></td>`;if(n.key==="hitRadius"||n.key==="knockback")return`<td>${typeof r=="number"?r.toFixed(2):r||"0"}</td>`;const u=r||0;return`<td class="${u===0?"dmg-zero":n.dmgClass||""}">${u}</td>`}).join("")}</tr>`).join("");a.innerHTML=`
      <div class="card-title">Attacks</div>
      <div class="attack-count">${e.length} attack${e.length!==1?"s":""} &middot; Click column headers to sort</div>
      <div class="attack-table-wrapper">
        <table class="attack-table">
          <thead><tr>${p}</tr></thead>
          <tbody>${v}</tbody>
        </table>
      </div>
    `,a.querySelectorAll(".attack-table th").forEach(i=>{i.addEventListener("click",()=>{const d=i.dataset.key;if(c===d)t=t==="asc"?"desc":"asc";else{c=d;const n=E.find(r=>r.key===d);t=n&&n.numeric?"desc":"asc"}s()})})}return s(),a}function A(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function F(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const j=[{key:"maxHp",label:"HP"},{key:"physAtk",label:"Phys ATK"},{key:"magAtk",label:"Magic ATK"},{key:"fireAtk",label:"Fire ATK"},{key:"lightningAtk",label:"Lightning ATK"},{key:"holyAtk",label:"Holy ATK"},{key:"physDef",label:"Phys DEF"},{key:"magDef",label:"Magic DEF"},{key:"fireDef",label:"Fire DEF"},{key:"lightningDef",label:"Lightning DEF"},{key:"holyDef",label:"Holy DEF"},{key:"soulRate",label:"Rune Reward"},{key:"staminaAtk",label:"Stamina DMG"},{key:"poiseDmg",label:"Poise DMG"}];function O(e,c){if(!e||e.length===0)return`
      <div class="profile-card full-width">
        <div class="card-title">NG+ Scaling</div>
        <div style="color:var(--text-muted); padding: 1rem 0;">No NG+ scaling data available.</div>
      </div>
    `;let t=0;const a=document.createElement("div");a.className="profile-card full-width";function s(){const o=e.map((r,u)=>{const g=u===0?"NG":`NG+${u}`;return`<th class="${u===t?"selected-col":""}" data-cycle="${u}">${g}</th>`}).join(""),p=j.map(r=>{const u=e.map((g,h)=>{const y=g[r.key]||1,$=h===t;let l="",f="ng-neutral";return y===1?(l="1.00x",f="ng-neutral"):y>1?(l=y.toFixed(2)+"x",f="ng-increase"):(l=y.toFixed(2)+"x",f="ng-decrease"),`<td class="${$?"selected-col":""} ${f}">${l}</td>`}).join("");return`<tr><td>${r.label}</td>${u}</tr>`}).join(""),v=e[t],i=c?Math.floor(c.hp*(v.maxHp||1)):null,d=c?Math.floor(c.runeReward*(v.soulRate||1)):null,n=c?`
      <div style="display:flex; gap:2rem; margin-bottom:1rem; flex-wrap:wrap;">
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          <span style="color:var(--accent-gold); font-weight:600;">${t===0?"NG":"NG+"+t}</span> Scaled Values:
          <span style="color:var(--accent-red); font-family:var(--font-mono); margin-left:0.5rem;">${i.toLocaleString()} HP</span>
          <span style="color:var(--accent-gold); font-family:var(--font-mono); margin-left:1rem;">${d.toLocaleString()} Runes</span>
        </div>
      </div>
    `:"";a.innerHTML=`
      <div class="card-title">NG+ Scaling</div>
      ${n}
      <div class="ng-table-wrapper">
        <table class="ng-table">
          <thead><tr><th>Stat</th>${o}</tr></thead>
          <tbody>${p}</tbody>
        </table>
      </div>
    `,a.querySelectorAll(".ng-table th[data-cycle]").forEach(r=>{r.addEventListener("click",()=>{t=parseInt(r.dataset.cycle),s()})})}return s(),a}function C(e,c){const t=document.getElementById("enemy-profile");t.innerHTML="",t.classList.remove("hidden"),document.getElementById("welcome-screen").classList.add("hidden");const a=document.createElement("div");a.className="profile-hero";const s=e.variants&&e.variants.length>0?`<select class="variant-select" id="variant-select">
        <option value="primary">${e.name} (Primary)</option>
        ${e.variants.map((n,r)=>`<option value="${r}">${n.name} — ${n.label}</option>`).join("")}
       </select>`:"";a.innerHTML=`
    <div class="profile-hero-top">
      <div>
        <div class="profile-name">${M(e.name)}</div>
        ${e.location?`<div class="profile-location">${M(e.location)}</div>`:""}
        <div class="profile-id">ID: ${e.id} &middot; Behavior Group: ${e.behaviorVariationId}</div>
      </div>
      <div>${s}</div>
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
  `,t.appendChild(a);const o=document.createElement("div");o.className="profile-grid",o.innerHTML=R(e.absorption)+P(e.resistances),t.appendChild(o);const p=document.createElement("div");p.innerHTML=G(e.spEffectIds),e.spEffectIds&&e.spEffectIds.length>0&&t.appendChild(p.firstElementChild);const v=I(e.attacks);if(typeof v=="string"){const n=document.createElement("div");n.innerHTML=v,t.appendChild(n.firstElementChild)}else t.appendChild(v);const i=O(c,e);if(typeof i=="string"){const n=document.createElement("div");n.innerHTML=i,t.appendChild(n.firstElementChild)}else t.appendChild(i);const d=t.querySelector("#variant-select");d&&d.addEventListener("change",n=>{const r=n.target.value;if(r==="primary")C(e,c);else{const u=e.variants[parseInt(r)],g={...e,...u,attacks:e.attacks,variants:e.variants,runeReward:e.runeReward,location:e.location,isBoss:e.isBoss,spEffectIds:e.spEffectIds};C(g,c);const h=t.querySelector("#variant-select");h&&(h.value=r)}}),window.scrollTo({top:0,behavior:"smooth"})}function G(e){return!e||e.length===0?`
      <div class="profile-card">
        <div class="card-title">Special Effects</div>
        <div style="color:var(--text-muted); padding: 0.5rem 0;">None</div>
      </div>
    `:`
    <div class="profile-card">
      <div class="card-title">Special Effect IDs</div>
      <div class="speffect-list">${e.map(t=>`<span class="speffect-tag">${t}</span>`).join("")}</div>
    </div>
  `}function M(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}let L=[],S=[];async function q(){const e=document.getElementById("loading"),c=document.getElementById("welcome-screen");try{const t="/er-analyzer/",[a,s]=await Promise.all([fetch(`${t}data/enemies.json`),fetch(`${t}data/ng-scaling.json`)]);if(!a.ok)throw new Error(`Failed to load enemies.json: ${a.status}`);if(!s.ok)throw new Error(`Failed to load ng-scaling.json: ${s.status}`);const o=await a.json(),p=await s.json();L=o.enemies,S=p.scaling;const v=o.metadata,i=c.querySelector(".welcome-sub");i&&v&&(i.textContent=`${v.totalEnemies} enemies · ${v.totalBosses} bosses · ${v.totalAttacks.toLocaleString()} attacks`);const d=x(L,n=>{C(n,S),K(n.id)});e.classList.add("hidden"),c.classList.remove("hidden"),T(),window.addEventListener("hashchange",T),d.focus(),console.log(`Loaded ${L.length} enemies with ${S.length} NG+ cycles`)}catch(t){e.textContent=`Error loading data: ${t.message}`,e.style.color="var(--accent-red)",console.error("Init error:",t)}}function T(){const e=window.location.hash.slice(1);if(!e)return;const c=parseInt(e);if(isNaN(c))return;const t=L.find(a=>a.id===c);t&&C(t,S)}function K(e){history.replaceState(null,"",`#${e}`)}document.addEventListener("DOMContentLoaded",q);
