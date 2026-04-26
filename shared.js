/* ═══════════════════════════════════════════════════════════════
   LivePDF  shared.js  v4.0
   ═══════════════════════════════════════════════════════════════ */

const _CFG       = window.LIVEPDF_CONFIG || {};
const API_BASE   = _CFG.API_BASE   || "https://updated-backend--basharatmasih12.replit.app";
const FREE_MB    = _CFG.FREE_LIMIT_MB || 10;
const FREE_BYTES = FREE_MB * 1024 * 1024;

/* ── Theme ──────────────────────────────────────────────────────── */
(function () {
  const s = localStorage.getItem("lp-theme");
  const dark = s === "dark" || (!s && matchMedia("(prefers-color-scheme:dark)").matches);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
})();

function toggleDark() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lp-theme", next);
  _setDarkIcon();
}
function _setDarkIcon() {
  const btn = document.getElementById("darkBtn");
  if (!btn) return;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.innerHTML = dark ? _ico_sun() : _ico_moon();
  btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
}
function _ico_sun()  { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`; }
function _ico_moon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`; }

/* ── Mobile menu ────────────────────────────────────────────────── */
function toggleMenu() {
  const nav     = document.getElementById("mobileNav");
  const overlay = document.getElementById("navOverlay");
  const btn     = document.getElementById("menuBtn");
  if (!nav) return;
  const open = nav.classList.toggle("open");
  overlay && overlay.classList.toggle("open", open);
  btn     && btn.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const n = document.getElementById("mobileNav");
    if (n && n.classList.contains("open")) toggleMenu();
  }
});

/* ── Drop zones ─────────────────────────────────────────────────── */
function initDropZones() {
  document.querySelectorAll(".upload-zone").forEach(zone => {
    zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", ()  => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault(); zone.classList.remove("drag-over");
      const inp = zone.querySelector(".file-input");
      if (!inp) return;
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
      inp.files = dt.files;
      inp.dispatchEvent(new Event("change"));
    });
  });
}

/* ── File store ─────────────────────────────────────────────────── */
const fileStore = {};

function handleFiles(tid, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  // 10 MB freemium check
  for (const f of files) {
    if (f.size > FREE_BYTES) {
      _freemiumModal(f.name, f.size);
      input.value = "";
      return;
    }
  }
  fileStore[tid] = files;
  _renderChips(tid, files);
  // OCR hint for text-extract tools
  const ocrTools = ["toword","toexcel","split","compress","rotate","unlock","merge"];
  if (ocrTools.includes(tid) && files[0]?.type === "application/pdf")
    _ocrHint(tid, files[0]);
  // Split page count
  if (tid === "split" && files[0]) loadSplitMeta(files[0]);
}

function _renderChips(tid, files) {
  const el = document.getElementById("fl-" + tid);
  if (!el) return;
  el.innerHTML = files.map((f, i) => `
    <div class="file-chip">
      <svg class="fc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="fc-name">${_esc(f.name)}</span>
      <span class="fc-size">${_bytes(f.size)}</span>
      <button class="fc-rm" onclick="removeFile('${tid}',${i})" title="Remove">×</button>
    </div>`).join("");
}

function removeFile(tid, idx) {
  fileStore[tid]?.splice(idx, 1);
  _renderChips(tid, fileStore[tid] || []);
}

/* ── OCR detection ──────────────────────────────────────────────── */
async function _ocrHint(tid, file) {
  const el = document.getElementById("ocr-hint-" + tid);
  if (!el) return;
  try {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${API_BASE}/ocr-check`, { method: "POST", body: fd });
    if (!r.ok) return;
    const d = await r.json();
    if (d.is_scanned) {
      el.innerHTML = `<div class="ocr-banner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span><strong>Scanned PDF detected.</strong> This file is image-based — text extraction tools may not work well.</span>
      </div>`;
      el.style.display = "block";
    } else { el.style.display = "none"; }
  } catch (_) {}
}

/* ── Progress ───────────────────────────────────────────────────── */
function showProgress(tid, pct, label) {
  const pw = document.getElementById("pw-" + tid);
  const pb = document.getElementById("pb-" + tid);
  const pl = document.getElementById("pl-" + tid);
  pw?.classList.add("show");
  if (pb) pb.style.width = pct + "%";
  if (pl && label) pl.textContent = label;
}
function hideProgress(tid) {
  const pw = document.getElementById("pw-" + tid);
  const pb = document.getElementById("pb-" + tid);
  pw?.classList.remove("show");
  if (pb) pb.style.width = "0%";
}
function showResult(tid, msg, err) {
  const rb = document.getElementById("rb-" + tid);
  const mp = document.getElementById("rb-" + tid + "-msg");
  if (!rb || !mp) return;
  rb.className = "result-box show" + (err ? " err" : "");
  const ico = err
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  mp.innerHTML = ico + " " + _esc(msg);
}
function setBtnState(tid, loading, label) {
  const btn = document.getElementById("btn-" + tid);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.innerHTML = `<span class="spinner"></span> Processing…`;
  else if (label) btn.textContent = label;
}

/* ── API call ───────────────────────────────────────────────────── */
async function callAPI(endpoint, fd, tid, label) {
  label = label || "Processing…";
  showProgress(tid, 12, "Uploading…");
  let p = 12;
  const tick = setInterval(() => { p = Math.min(p + 6, 88); showProgress(tid, p, label); }, 320);
  try {
    const resp = await fetch(API_BASE + endpoint, { method: "POST", body: fd });
    clearInterval(tick);
    showProgress(tid, 96, "Finishing…");
    if (resp.status === 413) throw new Error(`File too large. Free plan limit is ${FREE_MB} MB.`);
    if (!resp.ok) {
      let m = "Server error — please try again.";
      try { const j = await resp.json(); m = j.detail || j.message || m; } catch (_) {}
      throw new Error(m);
    }
    showProgress(tid, 100, "Done!");
    return resp;
  } catch (e) { clearInterval(tick); throw e; }
}

function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: u, download: name });
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 2000);
}

/* ── Freemium modal ─────────────────────────────────────────────── */
function _freemiumModal(name, size) {
  document.getElementById("lp-modal")?.remove();
  const m = document.createElement("div");
  m.id = "lp-modal"; m.className = "modal-overlay";
  m.innerHTML = `<div class="modal-box">
    <div class="modal-icon">⚡</div>
    <h3>File Too Large</h3>
    <p><strong>${_esc(name)}</strong> is ${_bytes(size)}.</p>
    <p>Free plan supports files up to <strong>${FREE_MB} MB</strong>.<br>Upgrade to Premium for files up to 200 MB.</p>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('lp-modal').remove()">Cancel</button>
      <button class="btn btn-brand btn-sm" onclick="document.getElementById('lp-modal').remove()">Got it</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
}

/* ── Split meta (PDF.js) ────────────────────────────────────────── */
async function loadSplitMeta(file) {
  if (typeof pdfjsLib === "undefined") return;
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const n   = pdf.numPages;
    const el  = document.getElementById("split-page-info");
    if (el) { el.textContent = `Total pages: ${n}`; el.style.display = "inline-flex"; }
    const es = document.getElementById("split-start");
    const ee = document.getElementById("split-end");
    if (es) es.max = n;
    if (ee) { ee.value = n; ee.max = n; }
  } catch (_) {}
}

/* ── Utilities ──────────────────────────────────────────────────── */
function _bytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
function _esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  _setDarkIcon();
  initDropZones();
});
