const $ = (id) => document.getElementById(id);
const send = (m) => chrome.runtime.sendMessage(m);

function render(days = {}) {
  const { reels = 0, secs = 0 } = days[new Date().toLocaleDateString("en-CA")] || {};
  const avg = reels ? secs / reels : 20;
  const score = rotScore(reels, secs);
  const [, emoji, title] = titleFor(reels);
  $("reels").textContent = reels;
  $("mood").textContent = emoji;
  $("title").textContent = title;
  $("stats").textContent = `${Math.round(secs / 60)} min · ${avg.toFixed(0)}s/reel · 🧠 rot ${score}/100`;
}

chrome.storage.local.get("days", ({ days }) => render(days));
// live updates while the popup is open
chrome.storage.onChanged.addListener((c) => c.days && render(c.days.newValue));

// --- leaderboard ---
// Three states: undecided (first run) -> join screen; opted out -> small invite; joined -> board.
let mode = null; // "join" (opted-out user clicked the invite) | "rename"

async function loadBoard() {
  const { profile, optedOut } = await chrome.storage.local.get(["profile", "optedOut"]);
  const undecided = !profile && !optedOut;
  const joining = mode === "rename" || mode === "join" || undecided;
  $("join").hidden = !joining;
  $("invite").hidden = !(!profile && optedOut && !joining);
  $("board").hidden = !profile || joining;

  if (joining) {
    $("joinTitle").textContent = mode === "rename" ? "✏️ Pick a new nickname" : "🏆 Join the global leaderboard?";
    $("joinInfo").hidden = mode === "rename";
    $("joinBtn").textContent = mode === "rename" ? "Save" : "Join leaderboard";
    $("skip").textContent = mode === "rename" ? "cancel" : "no thanks, stay private";
    if (!$("nick").value) $("nick").value = mode === "rename" ? profile.nick : randomNick();
    return;
  }
  if (!profile) return;

  $("me").textContent = profile.nick;
  const r = await send({ type: "board" });
  const rows = $("rows");
  rows.textContent = "";
  if (r.error) return (rows.textContent = "couldn't load 😢");
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
    rows.append(row);
  }
}

const ERRORS = {
  nickname_taken: "That name is taken 😅 try another",
  name_not_allowed: "Let's keep it friendly — try another name",
};

$("joinBtn").onclick = async () => {
  const nick = $("nick").value.trim().replace(/\s+/g, " ");
  if (nick.length < 2) return ($("err").textContent = "2–20 characters please");
  $("joinBtn").disabled = true;
  const r = await send({ type: mode === "rename" ? "rename" : "join", nick });
  $("joinBtn").disabled = false;
  if (r.error) {
    const known = Object.keys(ERRORS).find((k) => r.error.includes(k));
    if (!known) console.error("[doomboard]", r.error);
    const offline = r.error.includes("Failed to fetch");
    return ($("err").textContent = known ? ERRORS[known]
      : offline ? "couldn't reach the server — check your connection" : "server error — please try again later");
  }
  $("err").textContent = "";
  $("nick").value = "";
  mode = null;
  loadBoard();
};
$("dice").onclick = () => ($("nick").value = randomNick());
$("skip").onclick = async () => {
  const { profile } = await chrome.storage.local.get("profile");
  if (!profile) await chrome.storage.local.set({ optedOut: true }); // "stay private"
  $("nick").value = "";
  $("err").textContent = "";
  mode = null;
  loadBoard();
};
$("inviteBtn").onclick = () => { mode = "join"; $("nick").value = ""; loadBoard(); };
$("rename").onclick = () => { mode = "rename"; $("nick").value = ""; loadBoard(); };
$("leave").onclick = async () => { await send({ type: "leave" }); loadBoard(); };

loadBoard();
