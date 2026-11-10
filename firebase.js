/* FINOVA Firebase Auth + Firestore cloud backup
   Add your Firebase web config to window.FINOVA_FIREBASE_CONFIG before loading this file.
*/
(() => {
  const STORE = "finova_v1_data";
  const $ = id => document.getElementById(id);
  const statusEl = $("cloudStatus");
  const cfg = window.FINOVA_FIREBASE_CONFIG;

  if (!cfg || !cfg.apiKey || cfg.apiKey.startsWith("PASTE_") || !cfg.projectId || cfg.projectId.startsWith("PASTE_") || !cfg.appId || cfg.appId.startsWith("PASTE_")) {
    if (statusEl) statusEl.textContent = "Firebase belum dikonfigurasi. Tambah Firebase web config dahulu.";
    return;
  }
  if (!window.firebase || !window.firebase.initializeApp) {
    if (statusEl) statusEl.textContent = "Firebase SDK gagal dimuatkan. Semak internet dan refresh.";
    return;
  }
  if (!statusEl) return;

  let app, auth, db, currentUser = null, syncTimer = null, syncInFlight = false, pendingSync = false, suppressSync = false;
  try {
    app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
    auth = window.firebase.auth();
    db = window.firebase.firestore();
  } catch (e) {
    statusEl.textContent = "Firebase gagal dimulakan: " + (e.message || "semak konfigurasi");
    return;
  }

  const setStatus = (msg, error=false) => {
    statusEl.textContent = msg;
    statusEl.style.color = error ? "var(--red)" : "var(--muted)";
  };
  const backupRef = () => db.collection("users").doc(currentUser.uid).collection("backups").doc("current");

  async function uploadBackup(manual=false) {
    if (!currentUser) { setStatus("Sila log masuk dahulu.", true); return; }
    if (syncInFlight) { pendingSync = true; return; }
    syncInFlight = true;
    try {
      const raw = localStorage.getItem(STORE) || "{}";
      const payload = JSON.parse(raw);
      await backupRef().set({ payload, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(), schemaVersion: 1 });
      setStatus(manual ? "Backup Firebase berjaya disimpan." : "Auto backup berjaya.");
    } catch (e) {
      setStatus("Backup gagal: " + (e.message || "ralat Firebase"), true);
    } finally {
      syncInFlight = false;
      if (pendingSync) { pendingSync = false; scheduleSync(500); }
    }
  }
  function scheduleSync(delay=1600) {
    if (!currentUser || suppressSync) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => uploadBackup(false), delay);
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (key === STORE) scheduleSync();
  };

  function showSession(user) {
    currentUser = user || null;
    $("cloudSignedOut")?.classList.toggle("hide", !!user);
    $("cloudSignedIn")?.classList.toggle("hide", !user);
    if (user) {
      if ($("cloudUserLabel")) $("cloudUserLabel").textContent = user.email || "Firebase account";
      setStatus("Firebase tersambung. Backup cloud sedia digunakan.");
    } else {
      if ($("cloudUserLabel")) $("cloudUserLabel").textContent = "";
      setStatus("Belum log masuk.");
    }
  }

  $("cloudAuthForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("cloudEmail")?.value.trim();
    const password = $("cloudPassword")?.value;
    if (!email || !password) return;
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (e) { setStatus("Log masuk gagal: " + (e.message || "semak email/password"), true); }
  });

  $("cloudSignupBtn")?.addEventListener("click", async () => {
    const email = $("cloudEmail")?.value.trim();
    const password = $("cloudPassword")?.value;
    if (!email || !password) { setStatus("Masukkan email dan password dahulu.", true); return; }
    if (password.length < 6) { setStatus("Password Firebase mesti sekurang-kurangnya 6 aksara.", true); return; }
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const displayName = $("cloudDisplayName")?.value.trim();
      if (displayName) await cred.user.updateProfile({ displayName });
      setStatus("Akaun Firebase berjaya didaftarkan.");
    } catch (e) { setStatus("Pendaftaran gagal: " + (e.message || "ralat Firebase"), true); }
  });

  $("cloudBackupBtn")?.addEventListener("click", () => uploadBackup(true));
  $("cloudRestoreBtn")?.addEventListener("click", async () => {
    if (!currentUser) return;
    if (!confirm("Pulihkan backup Firebase? Data semasa dalam browser akan digantikan. Export backup dahulu untuk keselamatan.")) return;
    try {
      const snap = await backupRef().get();
      if (!snap.exists || !snap.data().payload) { setStatus("Tiada backup Firebase dijumpai.", true); return; }
      const payload = snap.data().payload;
      if (!payload || !Array.isArray(payload.tx) || !Array.isArray(payload.savings) || !Array.isArray(payload.gold) || !Array.isArray(payload.goals)) {
        setStatus("Format backup tidak sah.", true); return;
      }
      suppressSync = true;
      localStorage.setItem(STORE, JSON.stringify(payload));
      window.location.reload();
    } catch (e) { setStatus("Pemulihan gagal: " + (e.message || "ralat Firebase"), true); }
    finally { suppressSync = false; }
  });
  $("cloudLogoutBtn")?.addEventListener("click", async () => {
    try { await auth.signOut(); } catch (e) { setStatus("Log keluar gagal: " + e.message, true); }
  });

  auth.onAuthStateChanged(user => {
    showSession(user);
    if (user) scheduleSync(2500);
  });
  window.FINOVA_FIREBASE = { auth, db, uploadBackup: () => uploadBackup(true) };
})();