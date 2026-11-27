// Fill in from Firebase Console > Project settings > Your apps (web). These values are public by design.
export const firebaseConfig = { apiKey:"YOUR_API_KEY", authDomain:"YOUR_PROJECT.firebaseapp.com", projectId:"YOUR_PROJECT", appId:"YOUR_APP_ID" };
// Cloudinary: cloud name + UNSIGNED upload preset (see README)
export const cloudinary = { cloudName:"YOUR_CLOUD_NAME", uploadPreset:"filmsfera_unsigned" };
export const GENRES = ["Action","Thriller","Horror","Drama","Romance","Comedy"];
export const LANGS = ["Bengali","Hindi","English"];
export const safeUrl = u => { try { const x = new URL(u); return ["http:","https:"].includes(x.protocol) ? x.href : ""; } catch { return ""; } };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Cloudinary delivery optimisation (auto format/quality + width)
export const opt = (u, w = 400) => u && u.includes("/upload/") ? u.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`) : u;
