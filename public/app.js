import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,query,where,orderBy,limit,startAfter,getDocs,addDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig,GENRES,LANGS,safeUrl,esc,opt} from "./config.js";
const db = getFirestore(initializeApp(firebaseConfig)), $ = s => document.querySelector(s), app = $("#app");
const films = collection(db,"films"), PAGE = 24;
const q = (...c) => query(films, where("status","==","published"), ...c);
const fetchFilms = async (cons, after) => { const s = await getDocs(q(...cons, orderBy("createdAt","desc"), ...(after?[startAfter(after)]:[]), limit(PAGE))); return {list:s.docs.map(d=>({id:d.id,...d.data()})), last:s.docs.at(-1), more:s.size===PAGE}; };
const card = f => `<a class="card" href="#/movie/${encodeURIComponent(f.slug)}"><img loading="lazy" width="140" height="210" src="${esc(opt(safeUrl(f.posterUrl),300))}" alt="${esc(f.title)} poster"><b>${esc(f.title)}</b><small>${esc(f.language)} · ${esc(f.releaseYear)}</small></a>`;
const skel = n => Array.from({length:n},()=>`<div class="card"><div class="sk"></div></div>`).join("");
const empty = t => `<p class="msg">${t}</p>`;
const fail = e => { console.error(e); return `<p class="msg">Couldn't load this content. Check your connection and Firestore indexes, then retry.</p>`; };

async function section(title, cons, href) {
  const el = document.createElement("section"); el.className="sec";
  el.innerHTML = `<h2>${esc(title)}</h2><div class="row">${skel(6)}</div>`; app.append(el);
  try { const {list} = await fetchFilms(cons); if(!list.length) return el.remove();
    el.querySelector(".row").innerHTML = list.slice(0,12).map(card).join("");
    if(href) el.querySelector("h2").innerHTML = `<a href="${href}">${esc(title)}</a>`;
  } catch(e){ el.querySelector(".row").innerHTML = fail(e); }
}
async function home() {
  app.innerHTML = `<div class="hero" id="hero"><div><h1>Your world. Your stories. Your cinema.</h1></div></div><div class="wrap" id="w"></div>`;
  try { const {list} = await fetchFilms([where("featured","==",true)]); const f = list[0];
    if(f){ $("#hero").style.backgroundImage = `url("${safeUrl(opt(f.backdropUrl,1200))}")`;
      $("#hero div").innerHTML = `<h1>${esc(f.title)}</h1><p>${esc(f.shortDescription)}</p><a class="btn" href="#/movie/${encodeURIComponent(f.slug)}">Get download links</a>`; }
  } catch(e){ console.error(e); }
  const w = $("#w"); const hold = app; 
  const S = [["Featured Movies",[where("featured","==",true)]],["Latest Movies",[],"#/latest"],["Popular Movies",[where("popular","==",true)]],
    ...LANGS.map(l=>[`${l} Movies`,[where("language","==",l)],`#/movies?language=${l}`]),
    ...GENRES.map(g=>[g,[where("genres","array-contains",g)],`#/movies?genre=${g}`])];
  w.remove(); for (const [t,c,h] of S) await section(t,c,h);
}
async function listing(params, title) {
  const cons = []; const g = params.get("genre"), l = params.get("language");
  if(g) cons.push(where("genres","array-contains",g)); if(l) cons.push(where("language","==",l));
  app.innerHTML = `<div class="wrap"><h1>${esc(g||l||title)}</h1><div class="bar"><select id="fg"><option value="">All genres</option>${GENRES.map(x=>`<option ${x===g?"selected":""}>${x}</option>`).join("")}</select><select id="fl"><option value="">All languages</option>${LANGS.map(x=>`<option ${x===l?"selected":""}>${x}</option>`).join("")}</select></div><div class="grid" id="g">${skel(12)}</div><p class="msg"><button class="btn alt" id="more" hidden>Load more</button></p></div>`;
  const go = () => { const p = new URLSearchParams(); if($("#fg").value)p.set("genre",$("#fg").value); if($("#fl").value)p.set("language",$("#fl").value); location.hash = "#/movies?"+p; };
  $("#fg").onchange = $("#fl").onchange = go;
  let last, first = true; const load = async () => { try { const r = await fetchFilms(cons,last); last=r.last;
    if(first){ $("#g").innerHTML=""; first=false; if(!r.list.length){ $("#g").outerHTML = empty("No films here yet."); return; } }
    $("#g").insertAdjacentHTML("beforeend", r.list.map(card).join("")); $("#more").hidden = !r.more; } catch(e){ $("#g").innerHTML = fail(e); } };
  $("#more").onclick = load; load();
}
async function search(term) {
  const t = term.toLowerCase().trim(); app.innerHTML = `<div class="wrap"><h1>Results for “${esc(term)}”</h1><div class="grid" id="g">${skel(6)}</div></div>`;
  if(!t) return $("#g").outerHTML = empty("Type a title to search.");
  try { const s = await getDocs(q(where("titleLower",">=",t),where("titleLower","<=",t+"\uf8ff"),orderBy("titleLower"),limit(PAGE)));
    $("#g").innerHTML = s.empty ? "" : s.docs.map(d=>card(d.data())).join(""); if(s.empty) $("#g").outerHTML = empty("No films match that title."); } catch(e){ $("#g").innerHTML = fail(e); }
}
async function categories() {
  let cats = GENRES; try { const s = await getDocs(collection(db,"categories")); if(!s.empty) cats = s.docs.map(d=>d.data().name); } catch{}
  app.innerHTML = `<div class="wrap"><h1>Categories</h1><p>${cats.map(c=>`<a class="chip" href="#/movies?genre=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</p></div>`;
}
const imgs = []; let at = 0;
const show = i => { at = (i+imgs.length)%imgs.length; $("#lb img").src = imgs[at]; $("#lb").hidden = false; };
$("#lb").onclick = e => { const a = e.target.dataset.a; if(a==="close"||e.target.id==="lb") $("#lb").hidden=true; if(a==="prev")show(at-1); if(a==="next")show(at+1); if(a==="full") ($("#lb").requestFullscreen||$("#lb").webkitRequestFullscreen)?.call($("#lb")); };
addEventListener("keydown", e => { if($("#lb").hidden) return; if(e.key==="Escape")$("#lb").hidden=true; if(e.key==="ArrowLeft")show(at-1); if(e.key==="ArrowRight")show(at+1); });
async function movie(slug) {
  app.innerHTML = `<div class="wrap"><div class="sk" style="height:300px"></div></div>`;
  try { const s = await getDocs(q(where("slug","==",slug),limit(1))); if(s.empty) return app.innerHTML = `<div class="wrap">${empty("This film isn't available.")}</div>`;
    const f = {id:s.docs[0].id,...s.docs[0].data()}; document.title = `${f.title} — FILMSFERA`;
    const shots = (f.screenshots||[]).map(safeUrl).filter(Boolean); imgs.length=0; imgs.push(...shots);
    const dls = (f.downloadOptions||[]).filter(d=>d.active && safeUrl(d.url));
    const row = (k,v) => v ? `<p><b>${k}:</b> ${esc(Array.isArray(v)?v.join(", "):v)}</p>` : "";
    app.innerHTML = `<div class="hero" style="min-height:34vh;background-image:url('${safeUrl(opt(f.backdropUrl,1200))}')"><div><h1>${esc(f.title)}</h1><p>${esc(f.shortDescription)}</p></div></div>
    <div class="wrap det"><img class="card" style="width:100%;flex:none" src="${esc(opt(safeUrl(f.posterUrl),500))}" alt="${esc(f.title)} poster"><div>
    <p>${(f.genres||[]).map(g=>`<span class="chip">${esc(g)}</span>`).join("")}</p><p>${esc(f.description)}</p>
    <div class="panel">${row("Language",f.language)}${row("Release",f.releaseDate||f.releaseYear)}${row("Runtime",f.durationMinutes&&f.durationMinutes+" min")}${row("Director",f.director)}${row("Cast",f.cast)}${row("Production",f.production)}${row("IMDb",f.imdbRating)}</div>
    <p><a class="btn" href="#/download/${encodeURIComponent(f.slug)}">Download</a></p>
    ${(f.subtitles||[]).filter(x=>safeUrl(x.url)).length?`<h2>Subtitles</h2><div class="panel">${f.subtitles.filter(x=>safeUrl(x.url)).map(x=>`<a class="chip" target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(x.url))}">${esc(x.language)}</a>`).join("")}</div>`:""}
    </div></div><div class="wrap"><h2>Screenshots</h2><div class="shots">${shots.length?shots.map((u,i)=>`<img loading="lazy" data-i="${i}" src="${esc(opt(u,400))}" alt="${esc(f.title)} screenshot ${i+1}">`).join(""):empty("No screenshots yet.")}</div></div>`;
    $(".shots").onclick = e => e.target.dataset.i && show(+e.target.dataset.i);

  } catch(e){ app.innerHTML = `<div class="wrap">${fail(e)}</div>`; }
}

async function download(slug) {
  app.innerHTML = `<div class="wrap"><div class="sk" style="height:200px"></div></div>`;
  try { const s = await getDocs(q(where("slug","==",slug),limit(1))); if(s.empty) return app.innerHTML = `<div class="wrap">${empty("This film isn't available.")}</div>`;
    const f = {id:s.docs[0].id,...s.docs[0].data()}; document.title = `Download ${f.title} — FILMSFERA`;
    const dls = (f.downloadOptions||[]).filter(d=>d.active && safeUrl(d.url));
    app.innerHTML = `<div class="wrap"><p><a href="#/movie/${encodeURIComponent(f.slug)}">← ${esc(f.title)}</a></p><h1>Download ${esc(f.title)}</h1>
    <div class="panel" id="dls">${dls.length?dls.map((d,i)=>`<div class="dl"><span><b>${esc(d.quality)}</b> · ${esc(d.format)} · ${esc(d.fileSize)} · ${esc(d.language)}<br><small>Mirror: ${esc(d.provider)} · ${d.linkType==="page"?"Opens a host page, not a direct file":"Direct file"}</small></span><button class="btn" data-i="${i}">Download</button></div>`).join(""):empty("No download links are active for this film.")}</div>
    </div>`;
    $("#dls").onclick = async e => { const i = e.target.dataset.i; if(i===undefined) return; const d = dls[i];
      if(f.confirmDownload && !confirm(`Open the ${d.quality} download from ${d.provider}?`)) return;
      window.open(safeUrl(d.url),"_blank","noopener,noreferrer");
      // Logs a download-LINK CLICK only (no personal data, no completion data)
      addDoc(collection(db,"analytics"),{filmId:f.id,title:f.title,quality:d.quality,provider:d.provider,day:new Date().toISOString().slice(0,10),createdAt:serverTimestamp()}).catch(()=>{}); };
  } catch(e){ app.innerHTML = `<div class="wrap">${fail(e)}</div>`; }
}
const PAGES = {
 about:["About FILMSFERA","FILMSFERA is a movie discovery and download site. We publish only films we own or have permission to distribute."],
 contact:["Contact","Questions or copyright notices? Email contact@your-domain.example (replace in public/app.js)."],
 privacy:["Privacy Policy","We don't collect personal information. When you click a download button we log the film, quality and date only, to count download-link clicks. These counts are not completed downloads."],
 terms:["Terms and Conditions","Content is provided by its rights holders. Downloads are hosted by third-party providers under their own terms. Report infringement via the Contact page."]};
async function route() {
  const [path,qs] = (location.hash.slice(1)||"/").split("?"); const p = new URLSearchParams(qs||""); const [,r,arg] = path.split("/");
  scrollTo(0,0); $("#menu").classList.remove("open"); document.title = "FILMSFERA";
  if(!r) return home(); if(r==="movies") return listing(p,"All Movies"); if(r==="latest") return listing(new URLSearchParams(),"Latest Releases");
  if(r==="download") return download(decodeURIComponent(arg||"")); if(r==="movie") return movie(decodeURIComponent(arg||"")); if(r==="search") return search(p.get("q")||""); if(r==="categories") return categories();
  const pg = PAGES[r]; app.innerHTML = pg ? `<div class="wrap"><h1>${pg[0]}</h1><p>${pg[1]}</p></div>` : `<div class="wrap">${empty("Page not found.")}</div>`;
}
$("#burger").onclick = () => $("#menu").classList.toggle("open");
$("#sf").onsubmit = e => { e.preventDefault(); location.hash = "#/search?q="+encodeURIComponent($("#q").value); };
addEventListener("hashchange", route); route();
