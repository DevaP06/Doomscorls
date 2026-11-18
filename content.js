// Polls twice a second. A new /reels/<id> (Instagram) or /shorts/<id> (YouTube) URL = a new reel.
// The bare /reels/ landing page and /reels/audio/... pages have no reel id, so they don't count.
const reelId = () => location.pathname.match(/^\/(?:reels?|shorts)\/(?!audio\b)([^/]+)/)?.[1];

const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD, local
const today = () => dayKey();

// Collect increments, then save once per tick. Separate get/set pairs raced and lost counts.
const pending = { reels: 0, secs: 0 };
const bump = (field) => pending[field]++;

function flush() {
  const { reels, secs } = pending;
  if (!reels && !secs) return;
  pending.reels = pending.secs = 0;
  chrome.storage.local.get("days", ({ days = {} }) => {
    const d = (days[today()] ||= { reels: 0, secs: 0 });
    d.reels += reels;
    d.secs += secs;
    chrome.storage.local.set({ days });
  });
}

function activeVideo() {
  let best = null, bestArea = 0;
  for (const v of document.querySelectorAll("video")) {
    const r = v.getBoundingClientRect();
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    const area = Math.max(0, w) * Math.max(0, h);
    // must be mostly on screen relative to its OWN size (reels are a narrow column)
    if (area > bestArea && area > 0.5 * r.width * r.height) { best = v; bestArea = area; }
  }
  return best;
}

// --- floating badge (shadow DOM so the site's CSS can't touch it) ---
// Page CSP can block font URLs, so load via FontFace; falls back to rounded system fonts.
new FontFace("DoomFredoka", `url(${chrome.runtime.getURL("fonts/Fredoka-600.ttf")})`)
  .load().then((f) => document.fonts.add(f)).catch(() => {});

const badge = document.createElement("div");
const root = badge.attachShadow({ mode: "open" });
root.innerHTML = `
<style>
  #w { position: fixed; right: 8px; bottom: 8px; z-index: 2147483647; display: flex; flex-direction: column;
       align-items: flex-end; gap: 6px; pointer-events: none;
       font: 600 11px DoomFredoka, ui-rounded, "Trebuchet MS", sans-serif; color: #5b3a5e; }
  .card { pointer-events: auto; background: linear-gradient(160deg, #ffe4f1, #e6e0ff);
          border: 2px solid #ff8fc2; box-shadow: 0 3px 0 #f3b6d6; }
  #b { display: flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 99px; cursor: pointer; user-select: none; }
  #m { font-size: 14px; }
  #n { font-size: 16px; line-height: 1; color: #ff5fa2; display: inline-block; }
  #a { font-size: 9px; opacity: .6; }
  #p { display: none; padding: 10px 12px; border-radius: 16px; width: 170px; }
  #w.open #p { display: block; }
  #tabs { display: flex; justify-content: flex-end; gap: 4px; margin: -4px -4px 4px 0; }
  #tabs span { cursor: pointer; padding: 1px 5px; border-radius: 99px; opacity: .5; }
  #tabs .on { opacity: 1; background: #fff; }
  .row { display: flex; gap: 5px; padding: 1px 5px; border-radius: 8px; }
  .row .nick { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row.me { background: #fff; box-shadow: 0 2px 0 #f3b6d6; }
  #l { max-height: 150px; overflow-y: auto; }
  #t { font-size: 13px; margin-bottom: 6px; }
  .g { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .bars { display: flex; align-items: flex-end; gap: 4px; height: 34px; }
  .bars div { flex: 1; text-align: center; font-size: 9px; }
  .bars i { display: block; background: #d6ccff; border-radius: 3px 3px 0 0; margin-bottom: 1px; }
  .bars .today i { background: #ff5fa2; }
  .cap { margin-top: 3px; text-align: center; font-size: 9px; opacity: .6; }
  .pop { animation: pop .35s ease-out; }
  @keyframes pop { 30% { transform: scale(1.5) rotate(-6deg); } 100% { transform: none; } }
</style>
<div id="w">
  <div id="p" class="card">
    <div id="tabs"><span id="tS" class="on">📊</span><span id="tL">🏆</span></div>
    <div id="s"></div><div id="l" hidden></div>
  </div>
  <div id="b" class="card"><span id="m">🌱</span><span id="n">0</span><span id="a">▴</span></div>
</div>`;
document.documentElement.append(badge);

const $ = (id) => root.getElementById(id);
$("b").onclick = () => $("a").textContent = $("w").classList.toggle("open") ? "▾" : "▴";

// --- leaderboard tab (data comes via background.js; joining happens in the popup) ---
async function loadBoard() {
  const l = $("l");
  const { profile } = await chrome.storage.local.get("profile");
  if (!profile) return (l.textContent = "Click the Doomboard icon in your toolbar to join the leaderboard 🏆");
  const r = await chrome.runtime.sendMessage({ type: "board" });
  if (r.error) return (l.textContent = "couldn't load 😢");
  l.textContent = "";
  for (const x of r.rows) {
    const row = document.createElement("div");
    row.className = "row" + (x.is_me ? " me" : "");
    // textContent only: nicknames come from other users, never render them as HTML
    for (const [cls, text] of [["", `#${x.rank}`], ["nick", x.nickname], ["", `${x.reels}`]]) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      row.append(s);
    }
    l.append(row);
  }
}
function showTab(board) {
  $("s").hidden = board;
  $("l").hidden = !board;
  $("tS").classList.toggle("on", !board);
  $("tL").classList.toggle("on", board);
  if (board) { $("l").textContent = "loading…"; loadBoard().catch(() => {}); }
}
$("tS").onclick = () => showTab(false);
$("tL").onclick = () => showTab(true);

let shown = null;
function render(days = {}) {
  const { reels = 0, secs = 0 } = days[today()] || {};
  const [, emoji, title] = titleFor(reels);
  $("m").textContent = emoji;
  const n = $("n");
  n.textContent = reels;
  if (shown !== null && reels !== shown) { // pop on change
    n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop");
  }
  shown = reels;

  // analytics panel: today's stats + last 7 days
  const week = [...Array(7)].map((_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - k));
    return { label: d.toLocaleDateString("en", { weekday: "narrow" }), reels: days[dayKey(d)]?.reels || 0, isToday: k === 6 };
  });
  const max = Math.max(1, ...week.map((x) => x.reels));
  $("s").innerHTML = `
    <div id="t">${emoji} ${title}</div>
    <div class="g"><span>⏱ ${Math.round(secs / 60)}m</span><span>⚡ ${reels ? Math.round(secs / reels) : 0}s/reel</span><span>🧠 ${rotScore(reels, secs)}</span></div>
    <div class="bars">${week.map((x) =>
      `<div class="${x.isToday ? "today" : ""}"><i style="height:${x.reels ? Math.max(3, (x.reels / max) * 24) : 1}px"></i>${x.label}</div>`).join("")}</div>
    <div class="cap">reels, last 7 days</div>`;
}
chrome.storage.local.get("days", ({ days }) => render(days));
chrome.storage.onChanged.addListener((c) => c.days && render(c.days.newValue));

let last = null, ticks = 0, lbTicks = 0;
const timer = setInterval(() => {
  if (!chrome.runtime?.id) { badge.remove(); return clearInterval(timer); } // extension updated/reloaded: orphaned script cleans up
  const id = reelId();
  badge.style.display = id ? "" : "none";
  if (!$("l").hidden && ++lbTicks % 60 === 0) loadBoard().catch(() => {}); // refresh board every ~30s
  if (document.hidden || !id) return;
  if (id !== last) { last = id; bump("reels"); }
  const v = activeVideo();
  if (v && !v.paused && ++ticks % 2 === 0) bump("secs"); // 1 sec per 2 ticks
  flush();
}, 500);
