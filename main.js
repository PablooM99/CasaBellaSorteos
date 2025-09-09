/**** BINDINGS DE UI ADELANTADOS (no dependen de Firebase) ****/
const $ = (sel) => document.querySelector(sel);

/* Hamburguesa */
(function initHamburger(){
  const navToggle = $("#nav-toggle");
  if (!navToggle) return;
  navToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".nav-links a").forEach(a=>{
    a.addEventListener("click", ()=> {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded","false");
    });
  });
})();

/* Modal auth con fallback universal */
const authModal = $("#auth-modal");
const participantsModal = $("#participants-modal");
const genericBackdrop = $("#dialog-backdrop");

function openDialog(el){
  if (!el) return;
  if (el.showModal) el.showModal();
  else {
    el.setAttribute("open",""); el.classList.add("fallback");
    genericBackdrop?.classList.add("show");
  }
}
function closeDialog(el){
  if (!el) return;
  if (el.close) el.close();
  el.removeAttribute("open"); el.classList.remove("fallback");
  genericBackdrop?.classList.remove("show");
}

$("#btn-open-auth")?.addEventListener("click", ()=> openDialog(authModal));
$("#auth-close")?.addEventListener("click", ()=> closeDialog(authModal));
$("#participants-close")?.addEventListener("click", ()=> closeDialog(participantsModal));
genericBackdrop?.addEventListener("click", ()=>{
  closeDialog(authModal); closeDialog(participantsModal);
});

/* SweetAlert helpers */
const swal = {
  ok: (title, text) => Swal.fire({icon:'success', title, text, confirmButtonColor:'#E65100'}),
  info: (title, text) => Swal.fire({icon:'info', title, text, confirmButtonColor:'#E65100'}),
  warn: (title, text) => Swal.fire({icon:'warning', title, text, confirmButtonColor:'#E65100'}),
  err: (title, text) => Swal.fire({icon:'error', title, text, confirmButtonColor:'#E65100'}),
  html: (title, html) => Swal.fire({icon:'info', title, html, confirmButtonColor:'#E65100'})
};

/* Año footer + WhatsApp */
$("#year").textContent = new Date().getFullYear();
(() => {
  const fab = $("#whatsapp-fab");
  const numero = fab?.dataset?.whatsapp || "";
  if (fab) fab.href = `https://wa.me/${numero.replace(/\D/g,'')}`;
})();

/**** FIREBASE (carga después de UI para no romper interacciones si falla) ****/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit, deleteDoc, updateDoc, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ⚠️ Reemplazá por tu config real (agregá tu dominio a Auth → Authorized domains) */
const firebaseConfig = {
  apiKey: "AIzaSyC8qgoPDOQ7eFPZpQWkGZjjTFQbNyrdPDo",
  authDomain: "Tcasabellasorteos.firebaseapp.com",
  projectId: "casabellasorteos",
  storageBucket: "casabellasorteos.firebasestorage.app",
  messagingSenderId: "202126848097",
  appId: "1:202126848097:web:2e6a05b2de5e80fdadfa20",
  measurementId: "G-N1079L0TV9"
};
let app, auth, db, providerGoogle, providerFacebook;
try{
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  providerGoogle = new GoogleAuthProvider();
  providerFacebook = new FacebookAuthProvider();
}catch(e){
  console.error("Firebase init error:", e);
  swal.err("Error de configuración", "Revisá tu configuración de Firebase y dominios autorizados.");
}

/**** HELPERS DE NEGOCIO ****/
const pad3 = (n) => String(Math.max(0, Math.min(999, Number(n)||0))).padStart(3,"0");
const inRange = (n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 999;
function setText(el, txt, ok=false){ if(!el) return; el.textContent = txt; el.style.color = ok ? "#2e7d32" : "#c62828"; }

/**** LOGIN ****/
$("#login-google")?.addEventListener("click", async () => {
  if (!auth) return swal.err("Sin conexión", "Firebase no está inicializado.");
  try{ await signInWithPopup(auth, providerGoogle); closeDialog(authModal); swal.ok("¡Sesión iniciada!","Listo, ya podés participar."); }
  catch(e){ console.error(e); swal.err("No se pudo iniciar con Google", e?.code || "Ver consola"); }
});
$("#login-facebook")?.addEventListener("click", async () => {
  if (!auth) return swal.err("Sin conexión", "Firebase no está inicializado.");
  try{ await signInWithPopup(auth, providerFacebook); closeDialog(authModal); swal.ok("¡Sesión iniciada!","Listo, ya podés participar."); }
  catch(e){ console.error(e); swal.err("No se pudo iniciar con Facebook", e?.code || "Ver consola"); }
});
$("#btn-logout")?.addEventListener("click", async () => {
  if (!auth) return;
  await signOut(auth); swal.info("Sesión cerrada","Te esperamos de vuelta 👋");
});

/**** UI sesión / rol ****/
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

if (auth) {
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
}

/**** GANADORES (últimos 10) ****/
async function cargarGanadores(){
  try{
    const ul = $("#lista-ganadores");
    if (!ul || !db) return;
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
  }catch(e){ console.error(e); }
}
cargarGanadores();

/**** PREMIOS (público) ****/
async function renderPremiosPublico(){
  try{
    const wrap = $("#premios-grid");
    if (!wrap || !db) return;
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
        ${p.img ? `<img src="${p.img}" alt="${p.titulo||'Premio'}" onerror="this.src='assets/placeholder.jpg'">` : `<img src="assets/placeholder.jpg" alt="Premio">`}
        <div class="p-body">
          <h4 class="p-title">${p.titulo || "Premio"}</h4>
          <p class="p-desc">${p.desc || ""}</p>
        </div>
      `;
      wrap.appendChild(card);
    });
  }catch(e){ console.error(e); }
}
renderPremiosPublico();

/**** INPUT NÚMERO autoformateado ****/
const numeroInput = $("#numero");
if (numeroInput){
  const toPad = () => {
    const n = Number((numeroInput.value||"").replace(/\D/g,'')) || 0;
    numeroInput.value = pad3(n);
  };
  numeroInput.addEventListener("input", toPad);
  numeroInput.addEventListener("blur", toPad);
}

/**** REGISTRO (un usuario por sorteo) con SweetAlert ****/
$("#form-participar")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg"); if (msg) msg.textContent = "";

  if (!auth) return swal.err("Sin conexión", "Firebase no está inicializado.");

  const user = auth.currentUser;
  if (!user){
    openDialog(authModal);
    return swal.info("Iniciá sesión", "Debés iniciar sesión para participar.");
  }

  const nombre = $("#nombre").value.trim();
  const telefono = $("#telefono").value.trim();
  const numeroRaw = $("#numero").value.trim();

  if (!nombre || !telefono) return swal.warn("Datos incompletos","Completá nombre y teléfono.");
  if (!inRange(numeroRaw)) return swal.warn("Número inválido","Debe estar entre 000 y 999.");
  const numero = pad3(numeroRaw);

  try{
    // ¿Ya participa este usuario?
    const pref = doc(db, "participantes", user.uid);
    const psnap = await getDoc(pref);
    if (psnap.exists()){
      return swal.info("Ya estás participando","Esperá al próximo sorteo o al reset.");
    }

    // ¿Número libre?
    const nref = doc(db, "numeros", numero);
    const nsnap = await getDoc(nref);
    if (nsnap.exists()){
      return swal.warn("Número ocupado", `El número ${numero} ya está elegido. Probá con otro.`);
    }

    // Guardar en ambas colecciones
    const payload = { uid: user.uid, number: numero, nombre, telefono, ts: serverTimestamp(), extraByAdmin: false };
    await setDoc(nref, payload);
    await setDoc(pref, { uid: user.uid, primaryNumber: numero, nombre, telefono, ts: serverTimestamp() });

    setText(msg, `¡Listo! Quedaste inscripto con el número ${numero}.`, true);
    swal.ok("¡Inscripción exitosa!", `Participás con el número ${numero}. ¡Suerte! 🎉`);
    e.target.reset();
    if (numeroInput) numeroInput.value = "000";
  }catch(err){
    console.error(err);
    swal.err("Error al registrar","Intentalo nuevamente.");
  }
});

/**** ADMIN: sorteo, reset, premios (con SweetAlert) ****/
async function guardarGanador(part, posicion){
  const fecha = new Date();
  const fechaISO = fecha.toISOString();
  const fechaDisplay = fecha.toLocaleDateString("es-AR", { year:'numeric', month:'2-digit', day:'2-digit' });

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

async function sortear(cantidad = 3, evitarRepetidoPorUID = true){
  const adminMsg = $("#admin-msg");
  const ol = $("#ganadores-actual");
  if (adminMsg) adminMsg.textContent = "Sorteando...";
  if (ol) ol.innerHTML = "";

  const snap = await getDocs(collection(db, "numeros"));
  const pool = [];
  snap.forEach(d => pool.push(d.data()));

  if (!pool.length){
    if (adminMsg) adminMsg.textContent = "No hay participantes.";
    return swal.info("Sin participantes","No hay inscriptos para sortear.");
  }

  const take = Math.min(cantidad, pool.length);
  const winners = [];
  const mutable = [...pool];
  const seenUIDs = new Set();

  for (let i=1; i<=take; i++){
    let elegido = null;
    if (!evitarRepetidoPorUID){
      const idx = Math.floor(Math.random() * mutable.length);
      elegido = mutable.splice(idx, 1)[0];
    }else{
      for (let tries=0; tries<mutable.length*2; tries++){
        const idx = Math.floor(Math.random() * mutable.length);
        const cand = mutable[idx];
        if (!cand?.uid || !seenUIDs.has(cand.uid)){
          elegido = cand; mutable.splice(idx,1); break;
        }
      }
      if (!elegido && mutable.length){
        const idx = Math.floor(Math.random() * mutable.length);
        elegido = mutable.splice(idx, 1)[0];
      }
    }
    if (!elegido) break;

    const saved = await guardarGanador(elegido, i);
    winners.push(saved);
    if (evitarRepetidoPorUID && elegido.uid) seenUIDs.add(elegido.uid);
  }

  let html = "<ul style='text-align:left;margin:0;padding-left:18px'>";
  for (const w of winners){
    const ord = (w.posicion===1?"1er": w.posicion===2?"2do":"3er");
    html += `<li><b>${ord} ganador:</b> ${w.nombre} (#${w.number}) — ${w.fechaDisplay}</li>`;
    const li = document.createElement("li");
    li.textContent = `${ord} ganador: ${w.nombre} (#${w.number}) — ${w.fechaDisplay}`;
    $("#ganadores-actual")?.appendChild(li);
  }
  html += "</ul>";

  if (winners.length < take){
    swal.info("Sorteo parcial", `Se asignaron ${winners.length}/${take} premios (no había suficientes personas únicas).${html}`);
  }else{
    swal.ok("Sorteo realizado", html);
  }
  if (adminMsg) adminMsg.textContent = "Sorteo realizado.";
  await cargarGanadores();
}

async function resetearSorteo(){
  const res = await Swal.fire({
    icon:'warning', title:'Resetear sorteo',
    text:'Borrará todos los números y liberará a los participantes. ¿Continuar?',
    showCancelButton:true, confirmButtonColor:'#E65100', cancelButtonText:'Cancelar', confirmButtonText:'Sí, resetear'
  });
  if (!res.isConfirmed) return;

  const adminMsg = $("#admin-msg");
  if (adminMsg) adminMsg.textContent = "Reseteando…";
  const numerosSnap = await getDocs(collection(db, "numeros"));
  const participantesSnap = await getDocs(collection(db, "participantes"));
  const deletes = [];
  numerosSnap.forEach(d => deletes.push(deleteDoc(doc(db,"numeros",d.id))));
  participantesSnap.forEach(d => deletes.push(deleteDoc(doc(db,"participantes",d.id))));
  await Promise.all(deletes);
  $("#ganadores-actual")?.replaceChildren();
  if (adminMsg) adminMsg.textContent = "Reset OK. Ya pueden volver a participar.";
  swal.ok("Reset completado","Se liberaron los números y los usuarios.");
}

/* Listeners admin */
$("#btn-sortear")?.addEventListener("click", async () => {
  const role = $("#chip-role")?.textContent?.toLowerCase?.() || "";
  if (role !== "admin") return swal.err("Acceso denegado","Solo administradores.");
  const n = Number($("#cant-ganadores").value || 3);
  const avoid = !!$("#avoid-repeat-uid")?.checked;
  await sortear(n, avoid);
});

$("#btn-reset")?.addEventListener("click", async () => {
  const role = $("#chip-role")?.textContent?.toLowerCase?.() || "";
  if (role !== "admin") return swal.err("Acceso denegado","Solo administradores.");
  await resetearSorteo();
});

/**** Premios (admin guarda / público renderiza) ****/
async function cargarPremioForm(idx){
  try{
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
  }catch(e){ console.error(e); }
}

async function guardarPremio(idx){
  const role = $("#chip-role")?.textContent?.toLowerCase?.();
  if (role !== "admin") return swal.err("Acceso denegado","Solo administradores.");
  const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
  const t = cont.querySelector(".p-titulo").value.trim();
  const i = cont.querySelector(".p-img").value.trim();
  const d = cont.querySelector(".p-desc").value.trim();
  await setDoc(doc(db,"premios",String(idx)), { idx, titulo: t, img: i, desc: d }, { merge: true });
  $("#admin-msg").textContent = `Premio #${idx} guardado.`;
  swal.ok("Premio guardado", `Se actualizó el premio #${idx}.`);
  await renderPremiosPublico();
}

document.querySelectorAll(".premio-form [data-save]")?.forEach(btn=>{
  btn.addEventListener("click", async (e)=>{
    const idx = Number(e.currentTarget.closest(".premio-form").dataset.idx);
    await guardarPremio(idx);
  });
});
[1,2,3,4,5].forEach(cargarPremioForm);

/**** ADMIN: Modal de participantes (doble chance) ****/
function openParticipants(){
  const role = $("#chip-role")?.textContent?.toLowerCase?.();
  if (role !== "admin") return swal.err("Acceso denegado","Solo administradores.");
  openDialog(participantsModal);
  loadParticipants();
}
$("#btn-manage-participants")?.addEventListener("click", openParticipants);

async function loadParticipants(){
  try{
    const list = $("#participants-list");
    if (!list || !db) return;
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
    rows.sort((a,b)=> a.nombre.localeCompare(b.nombre));
    renderParticipantsList(rows);
  }catch(e){ console.error(e); }
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
        <button class="btn tiny" data-assign type="button">Asignar/Actualizar</button>
        <button class="btn tiny danger" data-remove type="button">Quitar</button>
      </div>
    `;
    row.querySelector("[data-assign]").addEventListener("click", ()=> assignExtra(row));
    row.querySelector("[data-remove]").addEventListener("click", ()=> removeExtra(row));
    list.appendChild(row);
  });

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
  try{
    const uid = row.dataset.uid;
    const input = row.querySelector(".extra-input");
    const newRaw = (input.value || "").replace(/\D/g,'');
    if (newRaw === "") return swal.warn("Número requerido","Ingresá un número extra (000–999).");
    const number = pad3(newRaw);

    const pref = doc(db, "participantes", uid);
    const psnap = await getDoc(pref);
    if (!psnap.exists()) return swal.err("No encontrado","Participante no existe.");
    const p = psnap.data();
    const principal = p.primaryNumber;
    if (number === principal) return swal.warn("No permitido","El número extra no puede ser igual al principal.");

    // ¿número libre?
    const nref = doc(db, "numeros", number);
    const nsnap = await getDoc(nref);
    if (nsnap.exists()) return swal.warn("Número ocupado", `El número ${number} ya está tomado.`);

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

    row.querySelectorAll(".num")[1].textContent = number;
    swal.ok("Doble chance asignada", `Número extra ${number} guardado.`);
  }catch(e){ console.error(e); swal.err("Error","No se pudo asignar el número extra."); }
}

async function removeExtra(row){
  try{
    const uid = row.dataset.uid;
    const pref = doc(db,"participantes", uid);
    const psnap = await getDoc(pref);
    if (!psnap.exists()) return swal.err("No encontrado","Participante no existe.");
    const p = psnap.data();
    if (!p.extraNumber) return swal.info("Sin número extra","Este participante no tiene número extra.");

    try{ await deleteDoc(doc(db,"numeros", p.extraNumber)); }catch{}
    await updateDoc(pref, { extraNumber: deleteField() });

    row.querySelectorAll(".num")[1].textContent = "-";
    row.querySelector(".extra-input").value = "";
    swal.ok("Doble chance removida", `Se quitó el número extra ${p.extraNumber}.`);
  }catch(e){ console.error(e); swal.err("Error","No se pudo quitar el número extra."); }
}
