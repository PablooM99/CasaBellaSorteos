import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit, deleteDoc, updateDoc, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

/* ==== CONFIG FIREBASE ==== */
const firebaseConfig = {
  apiKey: "AIzaSyC8qgoPDOQ7eFPZpQWkGZjjTFQbNyrdPDo",
  authDomain: "casabellasorteos.firebaseapp.com",
  projectId: "casabellasorteos",
  storageBucket: "casabellasorteos.firebasestorage.app",
  messagingSenderId: "202126848097",
  appId: "1:202126848097:web:2e6a05b2de5e80fdadfa20",
  measurementId: "G-N1079L0TV9"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
getAnalytics(app);
const providerGoogle = new GoogleAuthProvider();
const providerFacebook = new FacebookAuthProvider();

/* ==== HELPERS ==== */
const $ = (sel) => document.querySelector(sel);
const pad3 = (n) => String(Math.max(0, Math.min(999, Number(n)||0))).padStart(3,"0");
const inRange = (n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 999;
function setText(el, txt, ok=false){ el.textContent = txt; el.style.color = ok ? "#2e7d32" : "#c62828"; }

/* Año footer */
$("#year").textContent = new Date().getFullYear();

/* FAB WhatsApp */
(() => {
  const fab = $("#whatsapp-fab");
  const numero = fab?.dataset?.whatsapp || "";
  if (fab) fab.href = `https://wa.me/${numero.replace(/\D/g,'')}`;
})();

/* ==== NAV: hamburguesa ==== */
const navToggle = $("#nav-toggle");
if (navToggle){
  navToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  // Cerrar al clickear un link
  document.querySelectorAll(".nav-links a").forEach(a=>{
    a.addEventListener("click", ()=> {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded","false");
    });
  });
}

/* ==== MODAL AUTH (con fallback para navegadores sin <dialog>) ==== */
const authModal = $("#auth-modal");
const authBackdrop = $("#dialog-backdrop");
const supportsDialog = !!(authModal && typeof authModal.showModal === "function");
function openAuth(){
  if (!authModal) return;
  if (supportsDialog) authModal.showModal();
  else {
    authModal.setAttribute("open","");
    authModal.classList.add("fallback");
    authBackdrop.classList.add("show");
  }
}
function closeAuth(){
  if (!authModal) return;
  if (supportsDialog) authModal.close();
  else {
    authModal.removeAttribute("open");
    authModal.classList.remove("fallback");
    authBackdrop.classList.remove("show");
  }
}
$("#btn-open-auth")?.addEventListener("click", openAuth);
$("#auth-close")?.addEventListener("click", (e)=>{ e.preventDefault(); closeAuth(); });
authBackdrop?.addEventListener("click", closeAuth);

$("#login-google")?.addEventListener("click", async () => {
  try{ await signInWithPopup(auth, providerGoogle); closeAuth(); }
  catch(e){ alert("Error al iniciar con Google"); console.error(e); }
});
$("#login-facebook")?.addEventListener("click", async () => {
  try{ await signInWithPopup(auth, providerFacebook); closeAuth(); }
  catch(e){ alert("Error al iniciar con Facebook"); console.error(e); }
});
$("#btn-logout")?.addEventListener("click", async () => { await signOut(auth); });

/* ==== UI sesión / rol ==== */
function setAdminUI(isAdmin, email="", role=""){
  const admin = $("#admin");
  const chip = $("#session-chip");
  const chipName = $("#chip-name");
  const chipRole = $("#chip-role");
  chip?.classList.remove("hidden");
  if (chipName) chipName.textContent = email || "Usuario";
  if (chipRole) chipRole.textContent = (role || "user").toUpperCase();
  if (admin) admin.hidden = !isAdmin;
  $("#btn-sortear").disabled = !isAdmin;
  $("#btn-reset").disabled = !isAdmin;
  $("#btn-manage-participants").disabled = !isAdmin;
}

onAuthStateChanged(auth, async (user) => {
  if (!user){
    $("#session-chip")?.classList.add("hidden");
    const admin = $("#admin"); if (admin) admin.hidden = true;
    return;
  }
  try{
    const uref = doc(db, "users", user.uid);
    const usnap = await getDoc(uref);
    const role = usnap.exists() ? (usnap.data().role || "user") : "user";
    setAdminUI(role === "admin", user.email || user.displayName || "usuario", role);
  }catch(e){
    console.error("Error leyendo rol:", e);
    setAdminUI(false, "usuario", "user");
  }
});

/* ==== GANADORES (últimos 10) ==== */
async function cargarGanadores(){
  const ul = $("#lista-ganadores");
  if (!ul) return;
  ul.innerHTML = "<li>Cargando...</li>";
  const q = query(collection(db, "ganadores"), orderBy("fechaISO", "desc"), limit(10));
  const snap = await getDocs(q);
  ul.innerHTML = "";
  if (snap.empty){ ul.innerHTML = "<li>Aún no hay ganadores.</li>"; return; }
  snap.forEach(d => {
    const g = d.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${g.nombre}</strong> — Nº <span class="winner-badge">${g.number}</span></span>
      <span>${g.posicion ? (g.posicion + "º · ") : ""}${g.fechaDisplay}</span>
    `;
    ul.appendChild(li);
  });
}
cargarGanadores();

/* ==== PREMIOS (público) ==== */
async function renderPremiosPublico(){
  const wrap = $("#premios-grid");
  if (!wrap) return;
  wrap.innerHTML = "";
  const q = query(collection(db, "premios"));
  const snap = await getDocs(q);
  if (snap.empty){ wrap.innerHTML = "<p class='muted'>Aún no hay premios cargados.</p>"; return; }
  const items = [];
  snap.forEach(d => { const p = d.data(); p._id = d.id; items.push(p); });
  items.sort((a,b)=> (a.idx||999)-(b.idx||999));
  items.slice(0,5).forEach(p => {
    const card = document.createElement("article");
    card.className = "prize";
    card.innerHTML = `
      ${p.img ? `<img src="${p.img}" alt="${p.titulo||'Premio'}">` : ""}
      <div class="p-body">
        <h4 class="p-title">${p.titulo || "Premio"}</h4>
        <p class="p-desc">${p.desc || ""}</p>
      </div>
    `;
    wrap.appendChild(card);
  });
}
renderPremiosPublico();

/* ==== INPUT NÚMERO autoformateado ==== */
const numeroInput = $("#numero");
if (numeroInput){
  numeroInput.addEventListener("input", () => {
    const n = Number(numeroInput.value.replace(/\D/g,'') || 0);
    numeroInput.value = pad3(n);
  });
  numeroInput.addEventListener("blur", () => {
    const n = Number(numeroInput.value.replace(/\D/g,'') || 0);
    numeroInput.value = pad3(n);
  });
}

/* ==== REGISTRO (un usuario por sorteo) ==== */
$("#form-participar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg"); if (msg) msg.textContent = "";

  const user = auth.currentUser;
  if (!user){
    openAuth();
    return setText(msg, "Debés iniciar sesión para participar.");
  }

  const nombre = $("#nombre").value.trim();
  const telefono = $("#telefono").value.trim();
  const numeroRaw = $("#numero").value.trim();

  if (!nombre || !telefono) return setText(msg, "Completá nombre y teléfono.");
  if (!inRange(numeroRaw)) return setText(msg, "El número debe estar entre 000 y 999.");
  const numero = pad3(numeroRaw);

  try{
    // ¿Ya participa este usuario?
    const pref = doc(db, "participantes", user.uid);
    const psnap = await getDoc(pref);
    if (psnap.exists()){
      return setText(msg, "Ya estás participando en este sorteo. Esperá al próximo o al reset.", false);
    }

    // ¿Número libre?
    const nref = doc(db, "numeros", numero);
    const nsnap = await getDoc(nref);
    if (nsnap.exists()){
      return setText(msg, `El número ${numero} ya está elegido. Probá con otro.`, false);
    }

    // Guardar en ambas colecciones
    const payload = { uid: user.uid, number: numero, nombre, telefono, ts: serverTimestamp(), extraByAdmin: false };
    await setDoc(nref, payload);
    await setDoc(pref, { uid: user.uid, primaryNumber: numero, nombre, telefono, ts: serverTimestamp() });

    setText(msg, `¡Listo! Quedaste inscripto con el número ${numero}. 🎉`, true);
    e.target.reset();
    if (numeroInput) numeroInput.value = "000";
  }catch(err){
    console.error(err);
    setText(msg, "Error al registrar. Intentalo nuevamente.");
  }
});

/* ==== ADMIN: sorteo, reset, premios ==== */
async function guardarGanador(part, posicion){
  // part: {uid, nombre, telefono, number}
  const fecha = new Date();
  const fechaISO = fecha.toISOString();
  const fechaDisplay = fecha.toLocaleDateString("es-AR", { year:'numeric', month:'2-digit', day:'2-digit' });

  // historial por persona (clave por uid; si no, usar teléfono)
  const histKey = part.uid || (part.telefono?.replace(/\D/g,'') || part.nombre?.toLowerCase() || "anon");
  const histRef = doc(db, "ganadores_historial", histKey);
  const histSnap = await getDoc(histRef);
  const victorias = histSnap.exists() ? ((histSnap.data().victorias||0)+1) : 1;
  await setDoc(histRef, { uid: part.uid || null, nombre: part.nombre, telefono: part.telefono, victorias }, { merge: true });

  await setDoc(doc(collection(db, "ganadores")), {
    uid: part.uid || null,
    nombre: part.nombre,
    telefono: part.telefono,
    number: part.number,
    posicion, fechaISO, fechaDisplay, victorias
  });

  return { ...part, posicion, fechaDisplay, victorias };
}

async function sortear(cantidad = 3){
  const adminMsg = $("#admin-msg");
  const ol = $("#ganadores-actual");
  if (adminMsg) adminMsg.textContent = "Sorteando...";
  if (ol) ol.innerHTML = "";

  // Pool = todos los números actuales (incluye extras)
  const snap = await getDocs(collection(db, "numeros"));
  const pool = [];
  snap.forEach(d => pool.push(d.data()));

  if (!pool.length){
    if (adminMsg) adminMsg.textContent = "No hay participantes.";
    return;
  }

  const take = Math.min(cantidad, pool.length);
  const winners = [];
  const mutable = [...pool];

  for (let i=1; i<=take; i++){
    const idx = Math.floor(Math.random() * mutable.length);
    const elegido = mutable.splice(idx, 1)[0];
    const saved = await guardarGanador(elegido, i);
    winners.push(saved);
  }

  // Mostrar en el panel (1er, 2do, 3er)
  if (ol){
    for (const w of winners){
      const li = document.createElement("li");
      const ordinal = (w.posicion===1?"1er": w.posicion===2?"2do":"3er");
      li.textContent = `${ordinal} ganador: ${w.nombre} (#${w.number}) — ${w.fechaDisplay}`;
      ol.appendChild(li);
    }
  }
  if (adminMsg) adminMsg.textContent = "Sorteo realizado.";
  await cargarGanadores();
}

async function resetearSorteo(){
  const adminMsg = $("#admin-msg");
  if (adminMsg) adminMsg.textContent = "Reseteando…";
  // borrar numeros y participantes para liberar usuarios y números
  const numerosSnap = await getDocs(collection(db, "numeros"));
  const participantesSnap = await getDocs(collection(db, "participantes"));
  const deletes = [];
  numerosSnap.forEach(d => deletes.push(deleteDoc(doc(db,"numeros",d.id))));
  participantesSnap.forEach(d => deletes.push(deleteDoc(doc(db,"participantes",d.id))));
  await Promise.all(deletes);
  const ol = $("#ganadores-actual"); if (ol) ol.innerHTML = "";
  if (adminMsg) adminMsg.textContent = "Reset OK. Ya pueden volver a participar.";
}

/* Listeners admin (rol ya controlado por UI/Reglas) */
$("#btn-sortear")?.addEventListener("click", async () => {
  const role = $("#chip-role")?.textContent?.toLowerCase?.() || "";
  if (role !== "admin") return alert("Acceso solo para administradores.");
  const n = Number($("#cant-ganadores").value || 3);
  await sortear(n);
});

$("#btn-reset")?.addEventListener("click", async () => {
  const role = $("#chip-role")?.textContent?.toLowerCase?.() || "";
  if (role !== "admin") return alert("Acceso solo para administradores.");
  if (!confirm("Esto borrará TODOS los números y liberará a todos los participantes. ¿Continuar?")) return;
  await resetearSorteo();
});

/* ==== Premios (admin guarda / público renderiza) ==== */
async function cargarPremioForm(idx){
  const pref = doc(db, "premios", String(idx));
  const psnap = await getDoc(pref);
  const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
  if (!cont) return;
  const t = cont.querySelector(".p-titulo");
  const i = cont.querySelector(".p-img");
  const d = cont.querySelector(".p-desc");
  if (psnap.exists()){
    const data = psnap.data();
    t.value = data.titulo || "";
    i.value = data.img || "";
    d.value = data.desc || "";
  }
}

async function guardarPremio(idx){
  const role = $("#chip-role")?.textContent?.toLowerCase?.();
  if (role !== "admin") return alert("Solo admin puede guardar premios.");
  const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
  const t = cont.querySelector(".p-titulo").value.trim();
  const i = cont.querySelector(".p-img").value.trim();
  const d = cont.querySelector(".p-desc").value.trim();
  await setDoc(doc(db,"premios",String(idx)), { idx, titulo: t, img: i, desc: d }, { merge: true });
  const msg = $("#admin-msg"); if (msg) msg.textContent = `Premio #${idx} guardado.`;
  await renderPremiosPublico();
}

document.querySelectorAll(".premio-form [data-save]")?.forEach(btn=>{
  btn.addEventListener("click", async (e)=>{
    const idx = Number(e.currentTarget.closest(".premio-form").dataset.idx);
    await guardarPremio(idx);
  });
});
[1,2,3,4,5].forEach(cargarPremioForm);

/* ==== ADMIN: Modal de participantes (doble chance) ==== */
const participantsModal = $("#participants-modal");
const participantsBackdrop = $("#dialog-backdrop"); // reutilizamos

function openParticipants(){
  const role = $("#chip-role")?.textContent?.toLowerCase?.();
  if (role !== "admin") return alert("Acceso solo para administradores.");
  if (typeof participantsModal.showModal === "function") participantsModal.showModal();
  else {
    participantsModal.setAttribute("open",""); participantsModal.classList.add("fallback"); participantsBackdrop.classList.add("show");
  }
  loadParticipants();
}
function closeParticipants(){
  if (typeof participantsModal.close === "function") participantsModal.close();
  else { participantsModal.removeAttribute("open"); participantsModal.classList.remove("fallback"); participantsBackdrop.classList.remove("show"); }
}
$("#btn-manage-participants")?.addEventListener("click", openParticipants);
$("#participants-close")?.addEventListener("click", (e)=>{ e.preventDefault(); closeParticipants(); });

async function loadParticipants(){
  const list = $("#participants-list");
  if (!list) return;
  list.innerHTML = "Cargando participantes...";
  const snap = await getDocs(collection(db, "participantes"));
  const rows = [];
  snap.forEach(d=>{
    const p = d.data();
    rows.push({
      uid: p.uid,
      nombre: p.nombre || "",
      telefono: p.telefono || "",
      primaryNumber: p.primaryNumber || p.number || "",
      extraNumber: p.extraNumber || ""
    });
  });
  // ordenar por nombre
  rows.sort((a,b)=> a.nombre.localeCompare(b.nombre));
  renderParticipantsList(rows);
}

function renderParticipantsList(rows){
  const list = $("#participants-list");
  if (!list) return;
  if (!rows.length){ list.innerHTML = "<p class='muted'>No hay inscriptos todavía.</p>"; return; }
  list.innerHTML = "";
  rows.forEach(p=>{
    const row = document.createElement("div");
    row.className = "participant-row";
    row.dataset.uid = p.uid;
    row.innerHTML = `
      <div><strong>${p.nombre}</strong><br><span class="muted xs">${p.telefono}</span></div>
      <div>Principal: <span class="num">${p.primaryNumber || "-"}</span></div>
      <div>Extra: <span class="num">${p.extraNumber || "-"}</span></div>
      <div><input class="extra-input" type="text" placeholder="000" value="${p.extraNumber || ""}" /></div>
      <div class="row-actions">
        <button class="btn tiny" data-assign>Asignar/Actualizar</button>
        <button class="btn tiny danger" data-remove>Quitar</button>
      </div>
    `;
    // handlers
    row.querySelector("[data-assign]").addEventListener("click", ()=> assignExtra(row));
    row.querySelector("[data-remove]").addEventListener("click", ()=> removeExtra(row));
    list.appendChild(row);
  });

  // búsqueda en vivo
  const search = $("#search-participants");
  if (search){
    search.oninput = () => {
      const q = search.value.toLowerCase().trim();
      [...list.children].forEach(div=>{
        const text = div.textContent.toLowerCase();
        div.style.display = text.includes(q) ? "" : "none";
      });
    };
  }
}

async function assignExtra(row){
  const uid = row.dataset.uid;
  const input = row.querySelector(".extra-input");
  const newRaw = (input.value || "").replace(/\D/g,'');
  if (newRaw === "") return alert("Ingresá un número extra (000–999).");
  const number = pad3(newRaw);

  // leer participante actual
  const pref = doc(db, "participantes", uid);
  const psnap = await getDoc(pref);
  if (!psnap.exists()) return alert("Participante no encontrado.");
  const p = psnap.data();
  const principal = p.primaryNumber;
  if (number === principal) return alert("El número extra no puede ser igual al principal.");

  // ¿número libre?
  const nref = doc(db, "numeros", number);
  const nsnap = await getDoc(nref);
  if (nsnap.exists()) return alert(`El número ${number} ya está tomado.`);

  // si tenía extra anterior distinto, liberar
  if (p.extraNumber && p.extraNumber !== number){
    try{ await deleteDoc(doc(db,"numeros", p.extraNumber)); }catch{}
  }

  // crear número extra en pool
  const payload = {
    uid, number, nombre: p.nombre, telefono: p.telefono,
    ts: serverTimestamp(), extraByAdmin: true
  };
  await setDoc(nref, payload);

  // guardar referencia en participante
  await setDoc(pref, { extraNumber: number }, { merge: true });

  // refrescar UI
  row.querySelector(".num").textContent = principal || "-";
  row.querySelectorAll(".num")[1].textContent = number;
  alert(`Número extra ${number} asignado.`);
}

async function removeExtra(row){
  const uid = row.dataset.uid;
  const pref = doc(db,"participantes", uid);
  const psnap = await getDoc(pref);
  if (!psnap.exists()) return alert("Participante no encontrado.");
  const p = psnap.data();
  if (!p.extraNumber) return alert("Este participante no tiene número extra.");

  // borrar doc en numeros
  try{ await deleteDoc(doc(db,"numeros", p.extraNumber)); }catch{}
  // borrar campo en participante
  await updateDoc(pref, { extraNumber: deleteField() });

  // refrescar UI
  row.querySelectorAll(".num")[1].textContent = "-";
  row.querySelector(".extra-input").value = "";
  alert(`Número extra ${p.extraNumber} quitado.`);
}
