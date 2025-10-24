   const $ = (sel) => document.querySelector(sel);

   function el(tag, props = {}, children = []) {
     const n = document.createElement(tag);
     for (const [k, v] of Object.entries(props)) {
       if (k === "text") n.textContent = v;
       else if (k === "class") n.className = v;
       else if (k === "dataset" && v && typeof v === "object") {
         for (const [dk, dv] of Object.entries(v)) n.dataset[dk] = dv;
       } else if (k === "on" && v && typeof v === "object") {
         for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
       } else if (k === "style" && v && typeof v === "object") {
         Object.assign(n.style, v);
       } else {
         n.setAttribute(k, v);
       }
     }
     children.forEach((c) => n.appendChild(c));
     return n;
   }
   
   function showInlineMsg(text, type = "info") {
     const msg = $("#msg");
     if (!msg) return;
     msg.textContent = text;
     msg.className = "";
     msg.classList.add(type);
   }
   function setLoading(targetEl, loading = true) {
     if (!targetEl) return;
     if (loading) {
       targetEl.replaceChildren(el("span", {
         class: "loader",
         "aria-label": "Cargando"
       }));
     } else {
       targetEl.replaceChildren();
     }
   }
   
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
   
   const authModal = $("#auth-modal");
   const participantsModal = $("#participants-modal");
   const genericBackdrop = $("#dialog-backdrop");
   function openDialog(el){ if (!el) return; if (el.showModal) el.showModal(); else { el.setAttribute("open",""); el.classList.add("fallback"); genericBackdrop?.classList.add("show"); } }
   function closeDialog(el){ if (!el) return; if (el.close) el.close(); el.removeAttribute("open"); el.classList.remove("fallback"); genericBackdrop?.classList.remove("show"); }
   $("#btn-open-auth")?.addEventListener("click", ()=> openDialog(authModal));
   $("#auth-close")?.addEventListener("click", ()=> closeDialog(authModal));
   $("#participants-close")?.addEventListener("click", ()=> closeDialog(participantsModal));
   genericBackdrop?.addEventListener("click", ()=>{ closeDialog(authModal); closeDialog(participantsModal); });
   
   const swal = {
     ok: (title, text) => Swal.fire({icon:'success', title, text, confirmButtonColor:'#E65100'}),
     info: (title, text) => Swal.fire({icon:'info', title, text, confirmButtonColor:'#E65100'}),
     warn: (title, text) => Swal.fire({icon:'warning', title, text, confirmButtonColor:'#E65100'}),
     err: (title, text) => Swal.fire({icon:'error', title, text, confirmButtonColor:'#E65100'}),
     html: (title, html) => Swal.fire({icon:'info', title, html, confirmButtonColor:'#E65100'})
   };
   
   $("#year").textContent = new Date().getFullYear();
   (() => {
     const fab = $("#whatsapp-fab");
     const numero = fab?.dataset?.whatsapp || "";
     if (fab) fab.href = `https://wa.me/${numero.replace(/\D/g,'')}`;
   })();
   
   const pad3 = (n) => String(Math.max(0, Math.min(999, Number(n)||0))).padStart(3,"0");
   const inRange = (n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 999;
   const numeroInput = $("#numero");
   if (numeroInput){
     if (!numeroInput.value) numeroInput.value = "000";
     numeroInput.addEventListener("keydown", (e) => {
       if (["Tab","ArrowLeft","ArrowRight","Home","End"].includes(e.key) || e.ctrlKey || e.metaKey) return;
       if (/^[0-9]$/.test(e.key)) {
         e.preventDefault();
         const raw = numeroInput.value.replace(/\D/g,"").slice(-3);
         const shifted = (raw + e.key).slice(-3);
         numeroInput.value = shifted.padStart(3,"0");
         return;
       }
       if (e.key === "Backspace") {
         e.preventDefault();
         const raw = numeroInput.value.replace(/\D/g,"").slice(-3);
         const shifted = ("0" + raw).slice(0,3);
         numeroInput.value = shifted.padStart(3,"0");
         return;
       }
       if (e.key === "Delete") { e.preventDefault(); numeroInput.value = "000"; return; }
       e.preventDefault();
     });
     numeroInput.addEventListener("input", () => {
       let digits = numeroInput.value.replace(/\D/g,"");
       if (digits.length > 3) digits = digits.slice(-3);
       numeroInput.value = digits.padStart(3,"0");
     });
     numeroInput.addEventListener("focus", () => setTimeout(() => numeroInput.select(), 0));
     numeroInput.addEventListener("blur", () => {
       const digits = numeroInput.value.replace(/\D/g,"").slice(-3);
       numeroInput.value = digits.padStart(3,"0");
     });
   }
   const normalizePhone = (v) => (v||"").replace(/[^\d+]/g,"").trim();
   
   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
   import {
     getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
     GoogleAuthProvider, setPersistence, browserLocalPersistence, getIdTokenResult
   } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
   import {
     getFirestore, doc, getDoc, setDoc, serverTimestamp,
     collection, getDocs, query, orderBy, limit, deleteDoc, updateDoc, deleteField
   } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
   
   const firebaseConfig = {
     apiKey: "AIzaSyC8qgoPDOQ7eFPZpQWkGZjjTFQbNyrdPDo",
     authDomain: "casabellasorteos.firebaseapp.com",
     projectId: "casabellasorteos",
     storageBucket: "casabellasorteos.firebasestorage.app",
     messagingSenderId: "202126848097",
     appId: "1:202126848097:web:2e6a05b2de5e80fdadfa20",
     measurementId: "G-N1079L0TV9"
   };
   
   let app, auth, db, providerGoogle;
   try{
     app = initializeApp(firebaseConfig);
     auth = getAuth(app);
     db = getFirestore(app);
     providerGoogle = new GoogleAuthProvider();
     setPersistence(auth, browserLocalPersistence).catch(()=>{});
     (async () => {
       try {
         const redir = await getRedirectResult(auth);
         if (redir?.user) {
           await ensureUserDoc(redir.user);
           closeDialog(authModal);
           swal.ok("¡Sesión iniciada!", "Listo, ya podés participar.");
         }
       } catch (e) { console.error("Redirect result error:", e); }
     })();
   } catch (e){
     console.error("Firebase init error:", e);
     swal.err("Error de configuración", "Revisá tu configuración de Firebase y dominios autorizados.");
   }
   
   async function ensureUserDoc(u){
     if (!u || !db) return;
     const uref = doc(db, "users", u.uid);
     const usnap = await getDoc(uref);
     if (!usnap.exists()){
       await setDoc(uref, {
         uid: u.uid, email: u.email || "", displayName: u.displayName || "",
         photoURL: u.photoURL || null, role: "user", createdAt: serverTimestamp(), lastLoginAt: serverTimestamp()
       });
     } else {
       await setDoc(uref, {
         email: u.email || "", displayName: u.displayName || "", photoURL: u.photoURL || null, lastLoginAt: serverTimestamp()
       }, { merge: true });
     }
   }
   
   async function loginWithGoogle() {
     if (!auth) return swal.err("Sin conexión", "Firebase no está inicializado.");
     if (location.protocol === "file:") {
       await swal.warn("Abrí con http://", "El login no funciona desde file://. Usá un servidor local.");
       return signInWithRedirect(auth, providerGoogle);
     }
     try {
       await signInWithPopup(auth, providerGoogle);
     } catch (e) {
       console.warn("Auth popup error:", e?.code, e);
       if (e?.code === "auth/popup-blocked" || e?.code === "auth/popup-closed-by-user") {
         const res = await Swal.fire({
           icon: "info", title: "Continuar con redirección",
           text: "El navegador bloqueó/cerró el popup. Probemos con redirección.",
           showCancelButton: true, confirmButtonText: "Continuar", confirmButtonColor: "#E65100"
         });
         if (res.isConfirmed) return signInWithRedirect(auth, providerGoogle);
         return;
       }
       if (e?.code === "auth/unauthorized-domain") return swal.err("Dominio no autorizado", "Agregá tu dominio en Auth → Settings → Authorized domains.");
       if (e?.message?.includes("redirect_uri_mismatch")) return swal.err("redirect_uri_mismatch", "Revisá los Redirect URIs del proveedor Google.");
       return swal.err("No se pudo iniciar sesión", e?.code || "Ver consola");
     }
     try { await ensureUserDoc(auth.currentUser); } catch (e) {
       console.error("Bootstrap users/{uid} error:", e);
       if (e?.code === "permission-denied") {
         await Swal.fire({ icon:"warning", title:"Perfil no guardado en Firestore",
           html:`<p>Tu sesión está iniciada, pero Firestore rechazó crear <code>users/{uid}</code>.</p>
                 <p>Publicá reglas que permitan al usuario crear su doc con <b>role="user"</b> o crealo manualmente.</p>`,
           confirmButtonColor:"#E65100" });
       } else { await swal.err("No se pudo guardar el perfil", e?.code || "Ver consola"); }
     }
     closeDialog(authModal);
     swal.ok("¡Sesión iniciada!", "Listo, ya podés participar.");
   }
   $("#login-google")?.addEventListener("click", loginWithGoogle);
   $("#btn-logout")?.addEventListener("click", async () => { if (!auth) return; await signOut(auth); swal.info("Sesión cerrada","Te esperamos de vuelta 👋"); });
   
   let _claimsAdmin = false;
   async function refreshAdminClaim() {
     if (!auth?.currentUser) { _claimsAdmin = false; return false; }
     try {
       const token = await getIdTokenResult(auth.currentUser, true);
       _claimsAdmin = !!token.claims?.admin;
       return _claimsAdmin;
     } catch {
       _claimsAdmin = false;
       return false;
     }
   }
   async function requireAdminClaimOrBlock() {
     const ok = await refreshAdminClaim();
     if (!ok) await swal.err("Acceso denegado", "Solo administradores.");
     return ok;
   }
   
   function setAdminUI(isAdmin, email="", role=""){
     const admin = $("#admin"); const chip = $("#session-chip");
     const chipName = $("#chip-name"); const chipRole = $("#chip-role");
     chip?.classList.remove("hidden");
     if (chipName) chipName.textContent = email || "Usuario";
     if (chipRole) chipRole.textContent = (role || (isAdmin ? "admin" : "user")).toUpperCase();
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
         _claimsAdmin = false;
         return;
       }
       try { await ensureUserDoc(user); } catch (e) {}
       let role = "user";
       try{
         const uref = doc(db, "users", user.uid);
         const usnap = await getDoc(uref);
         role = usnap.exists() ? (usnap.data().role || "user") : "user";
       }catch(e){
         console.error("Error leyendo rol:", e);
       }
       await refreshAdminClaim();
       setAdminUI(_claimsAdmin || role === "admin", user.email || user.displayName || "usuario", _claimsAdmin ? "admin" : role);
     });
   }
   
   async function cargarGanadores(){
     try{
       const ul = $("#lista-ganadores");
       if (!ul || !db) return;
       ul.replaceChildren(el("li", { text: "Cargando..." }));
       const qy = query(collection(db, "ganadores"), orderBy("fechaISO", "desc"), limit(10));
       const snap = await getDocs(qy);
       ul.replaceChildren();
       if (snap.empty){
         ul.appendChild(el("li", { text: "Aún no hay ganadores." }));
         return;
       }
       snap.forEach(d => {
         const g = d.data();
         const left = el("span", {}, [
           el("strong", { text: g.nombre || "Ganador" }),
           el("span", { text: " — Nº " }),
           el("span", { class: "winner-badge", text: g.number || "" })
         ]);
         const right = el("span", { text: `${g.posicion ? (g.posicion + "º · ") : ""}${g.fechaDisplay || ""}` });
         const li = el("li", {}, [left, right]);
         ul.appendChild(li);
       });
     }catch(e){ console.error(e); }
   }
   cargarGanadores();
   
   async function renderPremiosPublico(){
     try{
       const wrap = $("#premios-grid");
       if (!wrap || !db) return;
       setLoading(wrap, true);
       const qy = query(collection(db, "premios"));
       const snap = await getDocs(qy);
       setLoading(wrap, false);
       if (snap.empty){
         wrap.appendChild(el("p", { class: "muted", text: "Aún no hay premios cargados." }));
         return;
       }
       const items = [];
       snap.forEach(d => { const p = d.data(); p._id = d.id; items.push(p); });
       items.sort((a,b)=> (a.idx||999)-(b.idx||999));
       items.slice(0,5).forEach(p => {
         const img = el("img", {
           src: p.img ? String(p.img) : "assets/placeholder.jpg",
           alt: p.titulo ? String(p.titulo) : "Premio",
           on: { error: (e) => { e.currentTarget.src = "assets/placeholder.jpg"; } }
         });
         img.style.objectFit = "contain";
         img.style.width = "100%";
         img.style.height = "220px";
         const body = el("div", { class: "p-body" }, [
           el("h4", { class: "p-title", text: p.titulo || "Premio" }),
           el("p", { class: "p-desc", text: p.desc || "" })
         ]);
         const card = el("article", { class: "prize" }, [img, body]);
         wrap.appendChild(card);
       });
     }catch(e){ console.error(e); }
   }
   renderPremiosPublico();
   
   $("#form-participar")?.addEventListener("submit", async (e) => {
     e.preventDefault();
     showInlineMsg("", "info");
     if (!auth) return swal.err("Sin conexión", "Firebase no está inicializado.");
   
     const user = auth.currentUser;
     if (!user){
       openDialog(authModal);
       return swal.info("Iniciá sesión", "Debés iniciar sesión para participar.");
     }
     const nombre = $("#nombre").value.trim();
     const telefono = normalizePhone($("#telefono").value.trim());
     const numeroRaw = $("#numero").value.trim();
     if (!nombre || !telefono) {
       showInlineMsg("Completá nombre y teléfono.", "error");
       return swal.warn("Datos incompletos","Completá nombre y teléfono.");
     }
     if (!inRange(numeroRaw)) {
       showInlineMsg("El número debe estar entre 000 y 999.", "error");
       return swal.warn("Número inválido","Debe estar entre 000 y 999.");
     }
     const numero = pad3(numeroRaw);
   
     try{
       const pref = doc(db, "participantes", user.uid);
       const psnap = await getDoc(pref);
       if (psnap.exists()){
         showInlineMsg("Ya estás participando en este sorteo.", "info");
         return swal.info("Ya estás participando","Esperá al próximo sorteo o al reset.");
       }

       const nref = doc(db, "numeros", numero);
       const nsnap = await getDoc(nref);
       if (nsnap.exists()){
         showInlineMsg(`El número ${numero} ya está elegido. Probá con otro.`, "error");
         return swal.warn("Número ocupado", `El número ${numero} ya está elegido. Probá con otro.`);
       }
   
       const payload = { uid: user.uid, number: numero, nombre, telefono, email: user.email || "", ts: serverTimestamp(), extraByAdmin: false };
       await setDoc(nref, payload);
       await setDoc(pref, { uid: user.uid, primaryNumber: numero, nombre, telefono, email: user.email || "", ts: serverTimestamp() });
   
       await setDoc(doc(db,"users", user.uid), { nombre, telefono, displayName: nombre, updatedFromFormAt: serverTimestamp() }, { merge: true });
   
       showInlineMsg(`¡Listo! Quedaste inscripto con el número ${numero}.`, "success");
       swal.ok("¡Inscripción exitosa!", `Participás con el número ${numero}. ¡Suerte! 🎉`);
       e.target.reset(); if (numeroInput) numeroInput.value = "000";
     }catch(err){
       console.error(err);
       showInlineMsg("Error al registrar. Intentá nuevamente.", "error");
       swal.err("Error al registrar","Intentalo nuevamente.");
     }
   });
   
   async function guardarGanador(part, posicion){
     const fecha = new Date();
     const fechaISO = fecha.toISOString();
     const fechaDisplay = fecha.toLocaleDateString("es-AR", { year:'numeric', month:'2-digit', day:'2-digit' });
     const histKey = part.uid || (part.telefono?.replace(/\D/g,'') || part.nombre?.toLowerCase() || "anon");
     const histRef = doc(db, "ganadores_historial", histKey);
     const histSnap = await getDoc(histRef);
     const victorias = histSnap.exists() ? ((histSnap.data().victorias||0)+1) : 1;
     await setDoc(histRef, { uid: part.uid || null, nombre: part.nombre, telefono: part.telefono, victorias }, { merge: true });
     await setDoc(doc(collection(db, "ganadores")), { uid: part.uid || null, nombre: part.nombre, telefono: part.telefono, number: part.number, posicion, fechaISO, fechaDisplay, victorias });
     return { ...part, posicion, fechaDisplay, victorias };
   }
   
   async function sortear(cantidad = 3, evitarRepetidoPorUID = true){
     const adminMsg = $("#admin-msg"); const ol = $("#ganadores-actual");
     if (adminMsg) adminMsg.textContent = "Sorteando...";
     if (ol) ol.replaceChildren();
   
     const snap = await getDocs(collection(db, "numeros"));
     const pool = []; snap.forEach(d => pool.push(d.data()));
     if (!pool.length){
       if (adminMsg) adminMsg.textContent = "No hay participantes.";
       return swal.info("Sin participantes","No hay inscriptos para sortear.");
     }
     const take = Math.min(cantidad, pool.length);
     const winners = []; const mutable = [...pool]; const seenUIDs = new Set();
     for (let i=1; i<=take; i++){
       let elegido = null;
       if (!evitarRepetidoPorUID){
         const idx = Math.floor(Math.random() * mutable.length);
         elegido = mutable.splice(idx, 1)[0];
       }else{
         for (let tries=0; tries<mutable.length*2; tries++){
           const idx = Math.floor(Math.random() * mutable.length);
           const cand = mutable[idx];
           if (!cand?.uid || !seenUIDs.has(cand.uid)){ elegido = cand; mutable.splice(idx,1); break; }
         }
         if (!elegido && mutable.length){ const idx = Math.floor(Math.random() * mutable.length); elegido = mutable.splice(idx, 1)[0]; }
       }
       if (!elegido) break;
       const saved = await guardarGanador(elegido, i);
       winners.push(saved);
       if (evitarRepetidoPorUID && elegido.uid) seenUIDs.add(elegido.uid);
   
       const ord = (i===1?"1er": i===2?"2do":"3er");
       const li = el("li", { text: `${ord} ganador: ${saved.nombre} (#${saved.number}) — ${saved.fechaDisplay}` });
       $("#ganadores-actual")?.appendChild(li);
     }
   
     let ul = el("ul", { style:"text-align:left;margin:0;padding-left:18px" });
     winners.forEach((w)=>{
       const ord = (w.posicion===1?"1er": w.posicion===2?"2do":"3er");
       ul.appendChild(el("li", { text: `${ord} ganador: ${w.nombre} (#${w.number}) — ${w.fechaDisplay}` }));
     });
     const wrap = document.createElement("div");
     wrap.appendChild(ul);
   
     if (winners.length < take) swal.html("Sorteo parcial", wrap.innerHTML);
     else swal.html("Sorteo realizado", wrap.innerHTML);
   
     if (adminMsg) adminMsg.textContent = "Sorteo realizado.";
     await cargarGanadores();
   }
   
   async function resetearSorteo(){
     const res = await Swal.fire({ icon:'warning', title:'Resetear sorteo', text:'Borrará todos los números y liberará a los participantes. ¿Continuar?', showCancelButton:true, confirmButtonColor:'#E65100', cancelButtonText:'Cancelar', confirmButtonText:'Sí, resetear' });
     if (!res.isConfirmed) return;
     const adminMsg = $("#admin-msg"); if (adminMsg) adminMsg.textContent = "Reseteando…";
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
   
   $("#btn-sortear")?.addEventListener("click", async () => {
     if (!(await requireAdminClaimOrBlock())) return;
     const n = Number($("#cant-ganadores").value || 3);
     const avoid = !!$("#avoid-repeat-uid")?.checked;
     await sortear(n, avoid);
   });
   $("#btn-reset")?.addEventListener("click", async () => {
     if (!(await requireAdminClaimOrBlock())) return;
     await resetearSorteo();
   });
   
   async function cargarPremioForm(idx){
     try{
       const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
       if (!cont) return;
   
       if (!cont.querySelector("[data-delete]")){
         const del = el("button", {
           type:"button", class:"btn tiny danger", dataset:{ delete:"" }, text:`Eliminar premio #${idx}`,
           on: { click: ()=> eliminarPremio(idx) }
         });
         cont.appendChild(del);
       }
   
       const pref = doc(db, "premios", String(idx));
       const psnap = await getDoc(pref);
       const t = cont.querySelector(".p-titulo"), i = cont.querySelector(".p-img"), d = cont.querySelector(".p-desc");
       if (psnap.exists()){
         const data = psnap.data();
         t.value = data.titulo || ""; i.value = data.img || ""; d.value = data.desc || "";
       } else { t.value = ""; i.value = ""; d.value = ""; }
     }catch(e){ console.error(e); }
   }
   async function guardarPremio(idx){
     if (!(await requireAdminClaimOrBlock())) return;
     const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
     const t = cont.querySelector(".p-titulo").value.trim();
     const i = cont.querySelector(".p-img").value.trim();
     const d = cont.querySelector(".p-desc").value.trim();
     await setDoc(doc(db,"premios",String(idx)), { idx, titulo: t, img: i, desc: d }, { merge: true });
     const msg = $("#admin-msg"); if (msg) msg.textContent = `Premio #${idx} guardado.`;
     swal.ok("Premio guardado", `Se actualizó el premio #${idx}.`);
     await renderPremiosPublico();
   }
   async function eliminarPremio(idx){
     if (!(await requireAdminClaimOrBlock())) return;
     const res = await Swal.fire({ icon:'warning', title:`Eliminar premio #${idx}`, text:'Esta acción quitará el premio del listado público.', showCancelButton:true, confirmButtonText:'Eliminar', confirmButtonColor:'#c62828' });
     if (!res.isConfirmed) return;
     try{
       await deleteDoc(doc(db,"premios", String(idx)));
       const cont = document.querySelector(`.premio-form[data-idx="${idx}"]`);
       if (cont){ cont.querySelector(".p-titulo").value=""; cont.querySelector(".p-img").value=""; cont.querySelector(".p-desc").value=""; }
       const msg = $("#admin-msg"); if (msg) msg.textContent = `Premio #${idx} eliminado.`;
       swal.ok("Eliminado", `Se eliminó el premio #${idx}.`);
       await renderPremiosPublico();
     }catch(e){ console.error(e); swal.err("No se pudo eliminar", e?.code || "Ver consola"); }
   }
   document.querySelectorAll(".premio-form [data-save]")?.forEach(btn=>{
     btn.addEventListener("click", async (e)=>{
       const idx = Number(e.currentTarget.closest(".premio-form").dataset.idx);
       await guardarPremio(idx);
     });
   });
   [1,2,3,4,5].forEach(cargarPremioForm);
   
   function openParticipants(){
     requireAdminClaimOrBlock().then((ok)=>{
       if (!ok) return;
       openDialog(participantsModal);
       loadParticipants();
     });
   }
   $("#btn-manage-participants")?.addEventListener("click", openParticipants);
   
   async function loadParticipants(){
     try{
       const list = $("#participants-list"); if (!list || !db) return;
       list.replaceChildren(el("p", { class:"muted", text: "Cargando participantes..." }));
       const snap = await getDocs(collection(db, "participantes"));
       const rows = [];
       snap.forEach(d=>{
         const p = d.data();
         rows.push({ uid: p.uid, nombre: p.nombre || "", telefono: p.telefono || "", primaryNumber: p.primaryNumber || p.number || "", extraNumber: p.extraNumber || "" });
       });
       rows.sort((a,b)=> (a.nombre || "").localeCompare(b.nombre || ""));
       renderParticipantsList(rows);
     }catch(e){ console.error(e); }
   }
   
   function renderParticipantsList(rows){
     const list = $("#participants-list");
     list.replaceChildren();
     if (!rows.length){
       list.appendChild(el("p", { class:"muted", text:"No hay inscriptos todavía." }));
       return;
     }
     rows.forEach(p=>{
       const nameDiv = el("div", {}, [
         el("strong", { text: p.nombre || "Sin nombre" }),
         el("br"),
         el("span", { class: "muted xs", text: p.telefono || "" })
       ]);
       const mainDiv = el("div", { }, [ el("span", { text: "Principal: " }), el("span", { class:"num", text: p.primaryNumber || "-" }) ]);
       const extraDiv = el("div", {}, [ el("span", { text: "Extra: " }), el("span", { class:"num", text: p.extraNumber || "-" }) ]);
       const input = el("input", { class:"extra-input", type:"text", placeholder:"000", value: p.extraNumber || "" });
       const inputDiv = el("div", {}, [ input ]);
       const actions = el("div", { class:"row-actions" }, [
         el("button", { class:"btn tiny", type:"button", text:"Asignar/Actualizar", on:{ click: ()=> assignExtraRow(row) } }),
         el("button", { class:"btn tiny danger", type:"button", text:"Quitar", on:{ click: ()=> removeExtraRow(row) } })
       ]);
       const row = el("div", { class:"participant-row", dataset:{ uid: p.uid } }, [ nameDiv, mainDiv, extraDiv, inputDiv, actions ]);
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
   
     async function assignExtraRow(row){
       if (!(await requireAdminClaimOrBlock())) return;
       await assignExtra(row);
     }
     async function removeExtraRow(row){
       if (!(await requireAdminClaimOrBlock())) return;
       await removeExtra(row);
     }
   }
   
   async function assignExtra(row){
     try{
       const uid = row.dataset.uid;
       const input = row.querySelector(".extra-input");
       const newRaw = (input.value || "").replace(/\D/g,'');
       if (newRaw === "") {
         showInlineMsg("Ingresá un número extra (000–999).", "error");
         return swal.warn("Número requerido","Ingresá un número extra (000–999).");
       }
       const number = pad3(newRaw);
       const pref = doc(db, "participantes", uid); const psnap = await getDoc(pref);
       if (!psnap.exists()) return swal.err("No encontrado","Participante no existe.");
       const p = psnap.data(); const principal = p.primaryNumber;
       if (number === principal) {
         showInlineMsg("El número extra no puede ser igual al principal.", "error");
         return swal.warn("No permitido","El número extra no puede ser igual al principal.");
       }
       const nref = doc(db, "numeros", number); const nsnap = await getDoc(nref);
       if (nsnap.exists()) {
         showInlineMsg(`El número ${number} ya está tomado.`, "error");
         return swal.warn("Número ocupado", `El número ${number} ya está tomado.`);
       }
       if (p.extraNumber && p.extraNumber !== number){
         try { await deleteDoc(doc(db,"numeros", p.extraNumber)); } catch {}
       }
       await setDoc(nref, { uid, number, nombre: p.nombre, telefono: p.telefono, ts: serverTimestamp(), extraByAdmin: true });
       await setDoc(pref, { extraNumber: number }, { merge: true });
       row.querySelectorAll(".num")[1].textContent = number;
       swal.ok("Doble chance asignada", `Número extra ${number} guardado.`);
     }catch(e){ console.error(e); swal.err("Error","No se pudo asignar el número extra."); }
   }
   
   async function removeExtra(row){
     try{
       const uid = row.dataset.uid;
       const pref = doc(db,"participantes", uid); const psnap = await getDoc(pref);
       if (!psnap.exists()) return swal.err("No encontrado","Participante no existe.");
       const p = psnap.data();
       if (!p.extraNumber) return swal.info("Sin número extra","Este participante no tiene número extra.");
       try{ await deleteDoc(doc(db,"numeros", p.extraNumber)); }catch{}
       await updateDoc(pref, { extraNumber: deleteField() });
       row.querySelectorAll(".num")[1].textContent = "-";
       const input = row.querySelector(".extra-input"); if (input) input.value = "";
       swal.ok("Doble chance removida", `Se quitó el número extra ${p.extraNumber}.`);
     }catch(e){ console.error(e); swal.err("Error","No se pudo quitar el número extra."); }
   }
   
   (function neonBorderFallback(){
     const supportsRegister = ('CSS' in window && 'registerProperty' in CSS);
     if (supportsRegister) return;
     const els = document.querySelectorAll('.form-card.neon-animated');
     if (!els.length) return;
     els.forEach((elNode) => {
       const speedStr = getComputedStyle(elNode).getPropertyValue('--speed').trim();
       const speed = parseFloat(speedStr) || 8;
       let angle = 0; let last = performance.now();
       (function tick(now){
         const dt = (now - last)/1000; last = now;
         angle = (angle + 360*dt/speed) % 360;
         elNode.style.setProperty('--angle', angle + 'deg');
         requestAnimationFrame(tick);
       })(last);
     });
   })();
   