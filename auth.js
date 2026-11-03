/* FINOVA Supabase authentication + automatic cloud backup */
(() => {
  const SUPABASE_URL = "https://tfmvatyndyctzgdpkctk.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sZfSjQ8XU3qwnFpAecoRBQ_B3svKJKA';
  const STORE = "finova_v1_data";
  const $ = id => document.getElementById(id);
  const statusEl = $("cloudStatus");
  if (!window.supabase || !window.supabase.createClient) {
    if (statusEl) statusEl.textContent = "Supabase SDK gagal dimuatkan. Semak internet dan refresh.";
    return;
  }
  if (!statusEl) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let currentUser = null, syncTimer = null, syncInFlight = false, pendingSync = false;
  let suppressAutoSync = false, changeVersion = 0;

  const setStatus = (msg, error=false) => {
    statusEl.textContent = msg;
    statusEl.style.color = error ? "var(--red)" : "var(--muted)";
  };

  function scheduleSync(delay=1500) {
    if (!currentUser || suppressAutoSync) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => uploadBackup(false), delay);
  }

  async function uploadBackup(manual=false) {
    if (!currentUser) return;
    if (syncInFlight) { pendingSync = true; return; }
    syncInFlight = true;
    const version = changeVersion;
    try {
      const payload = JSON.parse(JSON.stringify(data));
      const {error} = await client.from("finova_cloud_backups").upsert(
        {user_id: currentUser.id, payload, updated_at: new Date().toISOString()},
        {onConflict: "user_id"}
      );
      if (error) throw error;
      if (manual || version === changeVersion)
        setStatus((manual ? "Backup manual berjaya · " : "Auto backup berjaya · ") +
          new Date().toLocaleString("ms-MY") + ".");
    } catch (err) {
      setStatus((manual ? "Backup gagal: " : "Auto backup gagal: ") +
        (err.message || "Ralat sambungan."), true);
      if (!manual && navigator.onLine) scheduleSync(8000);
    } finally {
      syncInFlight = false;
      if (pendingSync || version !== changeVersion) {
        pendingSync = false;
        scheduleSync(700);
      }
    }
  }

  // Local data is saved first. Only then is a debounced cloud backup queued.
  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (key === STORE && !suppressAutoSync) {
      changeVersion++;
      scheduleSync();
    }
  };

  function showSession(session) {
    const next = session?.user || null;
    const changed = currentUser?.id !== next?.id;
    currentUser = next;
    $("cloudSignedOut").classList.toggle("hide", !!currentUser);
    $("cloudSignedIn").classList.toggle("hide", !currentUser);
    if (currentUser) {
      $("cloudUserLabel").textContent = "Log masuk sebagai " + currentUser.email;
      if (changed) {
        clearTimeout(syncTimer);
        setStatus("Auto backup aktif untuk perubahan baharu. Peranti baharu? Pulihkan backup cloud dahulu.");
      }
    } else {
      clearTimeout(syncTimer);
      setStatus("Belum log masuk. Data masih disimpan secara lokal.");
    }
  }

  $("cloudAuthForm").addEventListener("submit", async e => {
    e.preventDefault();
    const button = $("cloudLoginBtn"); button.disabled = true;
    try {
      const {data: result, error} = await client.auth.signInWithPassword({
        email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
      });
      if (error) throw error;
      showSession(result.session);
    } catch (err) { setStatus(err.message || "Log masuk gagal.", true); }
    finally { button.disabled = false; }
  });

  $("cloudSignupBtn").addEventListener("click", async () => {
    const email = $("cloudEmail").value.trim(), password = $("cloudPassword").value;
    if (!email || password.length < 8) {
      setStatus("Masukkan email dan password sekurang-kurangnya 8 aksara.", true); return;
    }
    const button = $("cloudSignupBtn"); button.disabled = true;
    try {
      const {data: result, error} = await client.auth.signUp({
        email, password,
        options: {data: {display_name: $("cloudDisplayName").value.trim() || "FINOVA User"},
          emailRedirectTo: location.origin + location.pathname}
      });
      if (error) throw error;
      if (result.session) showSession(result.session);
      else setStatus("Pendaftaran diterima. Semak email untuk pengesahan, kemudian log masuk.");
    } catch (err) { setStatus(err.message || "Pendaftaran gagal.", true); }
    finally { button.disabled = false; }
  });

  $("cloudLogoutBtn").addEventListener("click", async () => {
    const {error} = await client.auth.signOut();
    if (error) setStatus(error.message, true); else showSession(null);
  });

  $("cloudBackupBtn").addEventListener("click", async () => {
    if (!currentUser) return;
    const button = $("cloudBackupBtn"); button.disabled = true;
    await uploadBackup(true);
    button.disabled = false;
  });

  $("cloudRestoreBtn").addEventListener("click", async () => {
    if (!currentUser || !confirm("Pulihkan backup cloud? Data browser akan digantikan. Export backup dahulu jika perlu.")) return;
    const button = $("cloudRestoreBtn"); button.disabled = true;
    try {
      const {data: row, error} = await client.from("finova_cloud_backups")
        .select("payload,updated_at").eq("user_id", currentUser.id).maybeSingle();
      if (error) throw error;
      if (!row?.payload) { setStatus("Belum ada backup cloud untuk akaun ini.", true); return; }
      const restored = row.payload;
      if (!Array.isArray(restored.tx) || !Array.isArray(restored.savings) ||
          !Array.isArray(restored.gold) || !Array.isArray(restored.goals))
        throw new Error("Format backup tidak sah.");
      clearTimeout(syncTimer);
      suppressAutoSync = true;
      data = Object.assign(fresh(), restored);
      localStorage.setItem(STORE, JSON.stringify(data));
      render();
      suppressAutoSync = false;
      changeVersion++;
      setStatus("Backup dipulihkan · " + new Date(row.updated_at).toLocaleString("ms-MY") + ".");
    } catch (err) {
      suppressAutoSync = false;
      setStatus("Pemulihan gagal: " + (err.message || "Ralat tidak diketahui."), true);
    } finally { button.disabled = false; }
  });

  window.addEventListener("online", () => { if (currentUser) scheduleSync(500); });
  client.auth.getSession().then(({data: result, error}) => {
    if (error) setStatus(error.message, true);
    showSession(result?.session);
  });
  client.auth.onAuthStateChange((_event, session) => showSession(session));
})();
