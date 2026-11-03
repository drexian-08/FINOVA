/* FINOVA Supabase authentication + manual cloud backup */
(() => {
  const SUPABASE_URL = "https://tfmvatyndyctzgdpkctk.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";
  const $ = id => document.getElementById(id);
  const statusEl = $("cloudStatus");
  if (!window.supabase || !window.supabase.createClient) {
    if (statusEl) statusEl.textContent = "Supabase SDK gagal dimuatkan. Semak internet dan refresh.";
    return;
  }
  if (!statusEl) return;
  if (SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")) {
    statusEl.textContent = "Masukkan Supabase Publishable Key dalam auth.js untuk mengaktifkan login.";
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let currentUser = null;
  const setStatus = (msg, error=false) => { statusEl.textContent = msg; statusEl.style.color = error ? "var(--red)" : "var(--muted)"; };
  const showSession = session => {
    currentUser = session?.user || null;
    $("cloudSignedOut").classList.toggle("hide", !!currentUser);
    $("cloudSignedIn").classList.toggle("hide", !currentUser);
    if (currentUser) {
      $("cloudUserLabel").textContent = "Log masuk sebagai " + currentUser.email;
      setStatus("Akaun tersambung. Backup belum dibuat secara automatik.");
    } else setStatus("Belum log masuk. Data masih disimpan secara lokal.");
  };
  $("cloudAuthForm").addEventListener("submit", async e => {
    e.preventDefault();
    const button = $("cloudLoginBtn"); button.disabled = true;
    try {
      const {data, error} = await client.auth.signInWithPassword({
        email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
      });
      if (error) throw error;
      showSession(data.session);
    } catch (err) { setStatus(err.message || "Log masuk gagal.", true); }
    finally { button.disabled = false; }
  });
  $("cloudSignupBtn").addEventListener("click", async () => {
    const email = $("cloudEmail").value.trim(), password = $("cloudPassword").value;
    if (!email || password.length < 8) { setStatus("Masukkan email dan password sekurang-kurangnya 8 aksara.", true); return; }
    const button = $("cloudSignupBtn"); button.disabled = true;
    try {
      const {data, error} = await client.auth.signUp({
        email, password,
        options: {data: {display_name: $("cloudDisplayName").value.trim() || "FINOVA User"},
          emailRedirectTo: location.origin + location.pathname}
      });
      if (error) throw error;
      if (data.session) showSession(data.session);
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
    try {
      const payload = JSON.parse(JSON.stringify(data));
      const {error} = await client.from("finova_cloud_backups").upsert(
        {user_id: currentUser.id, payload, updated_at: new Date().toISOString()},
        {onConflict: "user_id"}
      );
      if (error) throw error;
      setStatus("Backup berjaya disimpan ke cloud pada " + new Date().toLocaleString("ms-MY") + ".");
    } catch (err) { setStatus("Backup gagal: " + err.message, true); }
    finally { button.disabled = false; }
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
      data = Object.assign(fresh(), restored);
      localStorage.setItem(STORE, JSON.stringify(data));
      render();
      setStatus("Backup dipulihkan. Tarikh backup: " + new Date(row.updated_at).toLocaleString("ms-MY") + ".");
    } catch (err) { setStatus("Pemulihan gagal: " + err.message, true); }
    finally { button.disabled = false; }
  });
  client.auth.getSession().then(({data, error}) => {
    if (error) setStatus(error.message, true);
    showSession(data?.session);
  });
  client.auth.onAuthStateChange((_event, session) => showSession(session));
})();