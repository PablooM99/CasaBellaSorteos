import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "firebase/analytics";

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
const providerGoogle = new GoogleAuthProvider();
const providerFacebook = new FacebookAuthProvider();
const analytics = getAnalytics(app);

/* ==== HELPERS ==== */
const $ = (sel) => document.querySelector(sel);
const pad3 = (n) => String(Math.max(0, Math.min(999, Number(n)||0))).padStart(3,"0");
const inRange = (n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 999;

function setText(el, txt, ok=false){
  el.textContent = txt;
  el.style.color = ok ? "#2e7d32" : "#c62828";
}

/* Año footer */
$("#year").textContent = new Date().getFullYear();

/* FAB WhatsApp */
(() => {
  const fab = $("#whatsapp-fab");
  const numero = fab.dataset.whatsapp || "";
  fab.href = `https://wa.me/${numero.replace(/\D/g,'')}`;
})();

/* ==== MODAL AUTH ==== */
const authModal = $("#auth-modal");
$("#btn-open-auth").addEventListener("click", () => authModal.showModal());
$("#auth-close").addEventListener("click", () => authModal.close());

$("#login-google").addEventListener("click", async () => {
  try{
    await signInWithPopup(auth, providerGoogle);
    authModal.close();
  }catch(e){ alert("Error al iniciar con Google"); console.error(e);}
});
$("#login-facebook").addEventListener("click", async () => {
  try{
    await signInWithPopup(auth, providerFacebook);
    authModal.close();
  }catch(e){ alert("Error al iniciar con Facebook"); console.error(e);}
});
$("#btn-logout").addEventListener("click", async () => { await signOut(auth); });

/* ==== UI sesión / rol ==== */
function setAdminUI(isAdmin, email="", role=""){
  const admin = $("#admin");
  const chip = $("#session-chip");
  const chipName = $("#chip-name");
  const chipRole = $("#chip-role");

  chip.classList.remove("hidden");
  chipName.textContent = email || "Usuario";
  chipRole.textContent = (role || "user").toUpperCase();

  admin.hidden = !isAdmin;

  // Botones críticos
  $("#btn-sortear").disabled = !isAdmin;
  $("#btn-reset").disabled = !isAdmin;
}

onAuthStateChanged(auth, async (user) => {
  if (!user){
    $("#session-chip").classList.add("hidden");
    $("#chip-name").textContent = "";
    $("#chip-role").textContent = "";
    $("#admin").hidden = true;
    return;
  }
  // verificar rol en users/{uid}
  try{
    const uref = doc(db, "users", user.uid);
    const usnap = await getDoc(uref);
    const role = usnap.exists() ? (usnap.data().role || "user") : "user";
    setAdminUI(role === "admin", user.email || user.displayName || "usuario", role);
  }catch(e){
    console.error("Error leyendo rol:", e);
    setAdminUI(false, user.email || "usuario", "user");
  }
});

/* ==== GANADORES (últimos 10) ==== */
async function cargarGanadores(){
  const ul = $("#lista-ganadores");
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
  wrap.innerHTML = "";
  const q = query(collection(db, "premios")); // hasta 5
  const snap = await getDocs(q);
  if (snap.empty){ wrap.innerHTML = "<p class='muted'>Aún no hay premios cargados.</p>"; return; }
  const items = [];
  snap.forEach(d => { const p = d.data(); p._id = d.id; items.push(p); });
  // ordenar por idx asc
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
// valor inicial 000 ya está en HTML
numeroInput.addEventListener("input", () => {
  const n = Number(numeroInput.value.replace(/\D/g,'') || 0);
  numeroInput.value = pad3(n);
});
numeroInput.addEventListener("blur", () => {
  const n = Number(numeroInput.value.replace(/\D/g,'') || 0);
  numeroInput.value = pad3(n);
});

/* ==== REGISTRO (validación: un usuario por sorteo) ==== */
// Estrategia de sorteo actual: las colecciones `numeros` y `participantes` se limpian al reset.
// Para validar "1 por usuario": escribimos/checamos `participantes/{uid}`.
$("#form-participar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg"); msg.textContent = "";

  const user = auth.currentUser;
  if (!user){
    $("#auth-modal").showModal();
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
    const payload = { uid: user.uid, number: numero, nombre, telefono, ts: serverTimestamp() };
    await setDoc(nref, payload);
    await setDoc(pref, payload);

    setText(msg, `¡Listo! Quedaste inscripto con el número ${numero}. 🎉`, true);
    e.target.reset();
    numeroInput.value = "000";
  }catch(err){
    console.error(err);
    setText(msg, "Error al registrar. Intentalo nuevamente.");
  }
});

/* ==== ADMIN: sorteo, ganadores, reset, premios ==== */
async function guardarGanador(part, posicion){
  // part: {uid, nombre, telefono, number}
  const fecha = new Date();
  const fechaISO = fecha.toISOString();
  const fechaDisplay = fecha.toLocaleDateString("es-AR", { year:'numeric', month:'2-digit', day:'2-digit' });

  // historial por persona (clave por uid; si no, usar teléfono)
  const histRef = doc(db, "ganadores_historial", part.uid || part.telefono.replace(/\D/g,'') || part.nombre.toLowerCase());
  const histSnap = await getDoc(histRef);
  const victorias = histSnap.exists() ? ((histSnap.data().victorias||0)+1) : 1;
  await setDoc(histRef, { uid: part.uid || null, nombre: part.nombre, telefono: part.telefono, victorias }, { merge: true });

  // lista pública
  await setDoc(doc(collection(db, "ganadores")), {
    uid: part.uid || null,
    nombre: part.nombre,
    telefono: part.telefono,
    number: part.number,
    posicion,            // 1,2,3...
    fechaISO,
    fechaDisplay,
    victorias
  });

  return { ...part, posicion, fechaDisplay, victorias };
}

async function sortear(cantidad = 3){
  const adminMsg = $("#admin-msg");
  const ol = $("#ganadores-actual");
  adminMsg.textContent = "Sorteando...";
  ol.innerHTML = "";

  // Pool = todos los números actuales
  const snap = await getDocs(collection(db, "numeros"));
  const pool = [];
  snap.forEach(d => pool.push(d.data()));

  if (!pool.length){
    adminMsg.textContent = "No hay participantes.";
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
  for (const w of winners){
    const li = document.createElement("li");
    const ordinal = (w.posicion===1?"1er": w.posicion===2?"2do":"3er");
    li.textContent = `${ordinal} ganador: ${w.nombre} (#${w.number}) — ${w.fechaDisplay}`;
    ol.appendChild(li);
  }
  adminMsg.textContent = "Sorteo realizado.";
  await cargarGanadores();
}

async function resetearSorteo(){
  const adminMsg = $("#admin-msg");
  adminMsg.textContent = "Reseteando…";
  // borrar numeros y participantes para liberar usuarios y números
  const numerosSnap = await getDocs(collection(db, "numeros"));
  const participantesSnap = await getDocs(collection(db, "participantes"));
  const deletes = [];
  numerosSnap.forEach(d => deletes.push(deleteDoc(doc(db,"numeros",d.id))));
  participantesSnap.forEach(d => deletes.push(deleteDoc(doc(db,"participantes",d.id))));
  await Promise.all(deletes);
  $("#ganadores-actual").innerHTML = "";
  adminMsg.textContent = "Reset OK. Ya pueden volver a participar.";
}

/* Listeners admin (rol ya controlado por UI/Reglas) */
$("#btn-sortear").addEventListener("click", async () => {
  const role = $("#chip-role").textContent.toLowerCase();
  if (role !== "admin") return alert("Acceso solo para administradores.");
  const n = Number($("#cant-ganadores").value || 3);
  await sortear(n);
});

$("#btn-reset").addEventListener("click", async () => {
  const role = $("#chip-role").textContent.toLowerCase();
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
  const role = $("#chip-role").textContent.toLowerCase();
  if (role !== "admin") return alert("Solo admin puede guardar premios.");
  const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
  const t = cont.querySelector(".p-titulo").value.trim();
  const i = cont.querySelector(".p-img").value.trim();
  const d = cont.querySelector(".p-desc").value.trim();
  await setDoc(doc(db,"premios",String(idx)), { idx, titulo: t, img: i, desc: d }, { merge: true });
  $("#admin-msg").textContent = `Premio #${idx} guardado.`;
  await renderPremiosPublico();
}

document.querySelectorAll(".premio-form [data-save]").forEach(btn=>{
  btn.addEventListener("click", async (e)=>{
    const idx = Number(e.currentTarget.closest(".premio-form").dataset.idx);
    await guardarPremio(idx);
  });
});
// Precarga formularios
[1,2,3,4,5].forEach(cargarPremioForm);
