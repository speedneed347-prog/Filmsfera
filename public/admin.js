import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,getDocs,addDoc,setDoc,deleteDoc,query,orderBy,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig,cloudinary,GENRES,LANGS,safeUrl,esc,opt} from "./config.js";
const fa = initializeApp(firebaseConfig), auth = getAuth(fa), db = getFirestore(fa), root = document.getElementById("root");
const $ = s => root.querySelector(s); let cur = null, shots = [], dls = [];
document.getElementById("out").onclick = () => signOut(auth);
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function upload(file) {
  const fd = new FormData(); fd.append("file",file); fd.append("upload_preset",cloudinary.uploadPreset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,{method:"POST",body:fd});
  if(!r.ok) throw new Error("Cloudinary upload failed"); return (await r.json()).secure_url;
}
onAuthStateChanged(auth, async u => {
  document.getElementById("out").hidden = !u;
  if(!u) return login();
  const t = await u.getIdTokenResult(true);
  if(!t.claims.admin){ await signOut(auth); return login("This account is not an administrator."); }
  dash();
});
function login(err="") {
  root.innerHTML = `<form id="lf" class="panel" style="max-width:380px;margin:auto"><h2>Admin sign in</h2><label>Email</label><input id="e" type="email" required><label>Password</label><input id="p" type="password" required><p style="color:#f77">${esc(err)}</p><button class="btn">Sign in</button></form>`;
  $("#lf").onsubmit = async e => { e.preventDefault(); try { await signInWithEmailAndPassword(auth,$("#e").value,$("#p").value); } catch { $("#lf p").textContent = "Wrong email or password."; } };
}
async function dash() {
  root.innerHTML = `<div class="bar"><button class="btn" id="new">Add movie</button><button class="btn alt" id="cats">Categories</button><button class="btn alt" id="an">Analytics</button></div><div id="v"></div>`;
  $("#new").onclick = () => form(null); $("#cats").onclick = cats; $("#an").onclick = analytics; list();
}
async function list() {
  $("#v").innerHTML = "Loading…"; const s = await getDocs(query(collection(db,"films"),orderBy("createdAt","desc")));
  $("#v").innerHTML = s.empty ? `<p class="msg">No films yet. Add your first movie.</p>` : `<table>${s.docs.map(d=>{const f=d.data();return `<tr><td>${esc(f.title)}<br><small>${esc(f.status)}${f.featured?" · featured":""}${f.popular?" · popular":""}</small></td><td><button class="btn alt" data-e="${d.id}">Edit</button> <button class="btn alt" data-s="${d.id}">${f.status==="published"?"Unpublish":"Publish"}</button> <button class="btn alt" data-d="${d.id}">Delete</button></td></tr>`}).join("")}</table>`;
  $("#v").onclick = async e => { const t = e.target.dataset, f = s.docs.find(d=>d.id===(t.e||t.s||t.d));
    if(t.e) form(f); if(t.s){ await setDoc(doc(db,"films",f.id),{status:f.data().status==="published"?"draft":"published",updatedAt:serverTimestamp()},{merge:true}); list(); }
    if(t.d && confirm(`Delete “${f.data().title}”? This can't be undone.`)){ await deleteDoc(doc(db,"films",f.id)); list(); } };
}
function form(snap) {
  const f = snap ? snap.data() : {status:"draft",genres:[],cast:[],screenshots:[],downloadOptions:[],subtitles:[]}; cur = snap?.id||null; shots=[...(f.screenshots||[])]; dls=(f.downloadOptions||[]).map(x=>({...x}));
  const inp = (id,l,v="",t="text") => `<label>${l}</label><input id="${id}" type="${t}" value="${esc(v)}">`;
  $("#v").innerHTML = `<form id="ff" class="panel"><h2>${snap?"Edit":"Add"} movie</h2>${inp("title","Title",f.title)}${inp("slug","Slug (unique)",f.slug)}
  <label>Short description</label><input id="sd" value="${esc(f.shortDescription)}"><label>Full description</label><textarea id="ds" rows="5">${esc(f.description)}</textarea>
  <label>Poster</label><input id="pf" type="file" accept="image/*"><input id="pu" value="${esc(f.posterUrl)}" placeholder="Poster URL"><label>Backdrop</label><input id="bf" type="file" accept="image/*"><input id="bu" value="${esc(f.backdropUrl)}" placeholder="Backdrop URL">
  <label>Screenshots (select several)</label><input id="sf" type="file" accept="image/*" multiple><div class="shots" id="sh"></div>
  ${inp("genres","Genres (comma separated)",(f.genres||[]).join(", "))}<small>Suggested: ${GENRES.join(", ")}</small><label>Language</label><input id="lang" list="ll" value="${esc(f.language)}"><datalist id="ll">${LANGS.map(l=>`<option>${l}`).join("")}</datalist>
  ${inp("yr","Release year",f.releaseYear,"number")}${inp("rd","Release date",f.releaseDate,"date")}${inp("dur","Runtime (minutes)",f.durationMinutes,"number")}${inp("dir","Director",f.director)}${inp("cast","Cast (comma separated)",(f.cast||[]).join(", "))}${inp("prod","Production",f.production)}${inp("imdb","IMDb rating (only if legitimately sourced)",f.imdbRating)}
  <label>Subtitles (one per line: Language|https://url)</label><textarea id="subs" rows="3">${esc((f.subtitles||[]).map(x=>x.language+"|"+x.url).join("\n"))}</textarea>
  <h3>Download mirrors</h3><div id="dl"></div><button type="button" class="btn alt" id="add">Add mirror</button>
  <div class="bar"><select id="st"><option value="draft">Draft</option><option value="published">Published</option></select><label><input type="checkbox" id="ft" style="width:auto" ${f.featured?"checked":""}> Featured</label><label><input type="checkbox" id="po" style="width:auto" ${f.popular?"checked":""}> Popular</label><label><input type="checkbox" id="cf" style="width:auto" ${f.confirmDownload?"checked":""}> Confirm before download</label></div>
  <p id="msg" style="color:#f77"></p><button class="btn">Save movie</button> <button type="button" class="btn alt" id="back">Cancel</button></form>`;
  $("#st").value = f.status; $("#back").onclick = list; $("#add").onclick = () => { dls.push({quality:"",format:"MP4",fileSize:"",language:"",provider:"",url:"",linkType:"direct",active:true}); drawDl(); };
  $("#title").oninput = () => { if(!snap) $("#slug").value = slugify($("#title").value); };
  $("#sf").onchange = async e => { $("#msg").textContent="Uploading…"; try { for(const x of e.target.files) shots.push(await upload(x)); $("#msg").textContent=""; } catch(er){ $("#msg").textContent=er.message; } drawShots(); };
  drawShots(); drawDl(); $("#ff").onsubmit = save;
}
function drawShots(){ $("#sh").innerHTML = shots.map((u,i)=>`<div><img src="${esc(opt(u,300))}" alt=""><button type="button" class="btn alt" data-x="${i}">Remove</button></div>`).join(""); $("#sh").onclick = e => { if(e.target.dataset.x){ shots.splice(+e.target.dataset.x,1); drawShots(); } }; }
function drawDl(){ const F=[["quality","Quality (1080p)"],["format","Format"],["fileSize","Size (1.5 GB)"],["language","Language"],["provider","Provider / mirror label"],["url","https:// download URL"]];
  $("#dl").innerHTML = dls.map((d,i)=>`<div class="panel">${F.map(([k,p])=>`<input data-i="${i}" data-k="${k}" placeholder="${p}" value="${esc(d[k])}">`).join("")}<div class="bar"><select data-i="${i}" data-k="linkType"><option value="direct" ${d.linkType!=="page"?"selected":""}>Direct file</option><option value="page" ${d.linkType==="page"?"selected":""}>Host page</option></select><label><input type="checkbox" style="width:auto" data-i="${i}" data-k="active" ${d.active?"checked":""}> Active</label><button type="button" class="btn alt" data-r="${i}">Remove</button></div></div>`).join("");
  $("#dl").oninput = $("#dl").onchange = e => { const t=e.target.dataset; if(t.k) dls[t.i][t.k] = e.target.type==="checkbox"?e.target.checked:e.target.value; };
  $("#dl").onclick = e => { if(e.target.dataset.r){ dls.splice(+e.target.dataset.r,1); drawDl(); } }; }
async function save(e) {
  e.preventDefault(); const m = $("#msg"); m.textContent = "Saving…";
  try {
    const up = async (fid,uid) => { const x=$("#"+fid).files[0]; return x ? await upload(x) : $("#"+uid).value.trim(); };
    const posterUrl = await up("pf","pu"), backdropUrl = await up("bf","bu");
    if(!safeUrl(posterUrl)) throw new Error("Poster is required (https URL).");
    for(const d of dls) if(!safeUrl(d.url)) throw new Error(`Invalid download URL: ${d.url||"(empty)"}`);
    const subtitles = $("#subs").value.split("\n").map(l=>l.split("|")).filter(x=>x[1]&&safeUrl(x[1].trim())).map(x=>({language:x[0].trim(),url:safeUrl(x[1].trim())}));
    const list = s => s.split(",").map(x=>x.trim()).filter(Boolean), title = $("#title").value.trim(), slug = slugify($("#slug").value||title);
    const data = {title,titleLower:title.toLowerCase(),slug,shortDescription:$("#sd").value,description:$("#ds").value,posterUrl,backdropUrl,screenshots:shots,genres:list($("#genres").value),language:$("#lang").value,
      releaseYear:+$("#yr").value||null,releaseDate:$("#rd").value,durationMinutes:+$("#dur").value||null,director:$("#dir").value,cast:list($("#cast").value),production:$("#prod").value,imdbRating:$("#imdb").value,
      subtitles,downloadOptions:dls.map(d=>({...d,url:safeUrl(d.url)})),status:$("#st").value,featured:$("#ft").checked,popular:$("#po").checked,confirmDownload:$("#cf").checked,updatedAt:serverTimestamp()};
    const dup = (await getDocs(collection(db,"films"))).docs.find(d=>d.data().slug===slug && d.id!==cur); if(dup) throw new Error("That slug is already used.");
    if(cur) await setDoc(doc(db,"films",cur),data,{merge:true}); else await addDoc(collection(db,"films"),{...data,createdAt:serverTimestamp()});
    list();
  } catch(er){ m.textContent = er.message; }
}
async function cats() {
  const s = await getDocs(collection(db,"categories"));
  $("#v").innerHTML = `<div class="panel"><h2>Categories</h2><div class="bar"><input id="cn" placeholder="New category"><button class="btn" id="ca">Add</button></div>${s.docs.map(d=>`<p>${esc(d.data().name)} <button class="btn alt" data-x="${d.id}">Delete</button></p>`).join("")||"<p class='msg'>No categories yet. The public site shows default genres until you add some.</p>"}</div>`;
  $("#ca").onclick = async () => { if($("#cn").value.trim()){ await addDoc(collection(db,"categories"),{name:$("#cn").value.trim()}); cats(); } };
  $("#v").onclick = async e => { if(e.target.dataset.x){ await deleteDoc(doc(db,"categories",e.target.dataset.x)); cats(); } };
}
async function analytics() {
  const s = (await getDocs(collection(db,"analytics"))).docs.map(d=>d.data()), by = k => Object.entries(s.reduce((a,x)=>(a[x[k]]=(a[x[k]]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]);
  const tbl = (t,k,fn=x=>x) => `<h3>${t}</h3><table>${by(k).slice(0,15).map(([n,c])=>`<tr><td>${esc(fn(n))}</td><td>${c}</td></tr>`).join("")}</table>`;
  $("#v").innerHTML = `<div class="panel"><h2>Download-link clicks</h2><p>Total clicks: <b>${s.length}</b>. These count button clicks, not completed downloads.</p>${tbl("By movie","title")}${tbl("By quality","quality")}${tbl("By day","day")}${tbl("By month","day",x=>x)}</div>`;
  const mo = by("day").reduce((a,[d,c])=>(a[d.slice(0,7)]=(a[d.slice(0,7)]||0)+c,a),{}); $("#v table:last-child").innerHTML = Object.entries(mo).map(([m,c])=>`<tr><td>${m}</td><td>${c}</td></tr>`).join("");
}
