importScripts("config.js");

const day = () => new Date().toLocaleDateString("en-CA");

const rpc = (fn, args) =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.status === 204 ? null : r.json();
  });

// Nothing is ever sent unless the user joined (profile exists).
async function submit() {
  const { profile, days = {} } = await chrome.storage.local.get(["profile", "days"]);
  if (!profile) return;
  const d = days[day()] || { reels: 0, secs: 0 };
  await rpc("submit_score", { p_user: profile.id, p_day: day(), p_reels: d.reels, p_secs: d.secs });
}

// Claim the nickname on the server first; only then save the profile locally.
async function register(nick) {
  const id = crypto.randomUUID();
  await rpc("join_board", { p_user: id, p_nick: nick });
  await chrome.storage.local.set({ profile: { id, nick }, optedOut: false });
  await submit().catch(() => {});
}

// First install: open the popup page in a tab so the user sees the join/stay-private choice.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
});

// Batch uploads: first change starts a 30s alarm; the alarm uploads the latest totals.
chrome.storage.onChanged.addListener(async (c) => {
  if (!c.days || !(await chrome.storage.local.get("profile")).profile) return;
  if (!(await chrome.alarms.get("sync"))) chrome.alarms.create("sync", { delayInMinutes: 0.5 });
});
chrome.alarms.onAlarm.addListener(() => submit().catch(console.error));

chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  (async () => {
    const { profile } = await chrome.storage.local.get("profile");
    if (m.type === "join") await register(m.nick);
    if (m.type === "rename" && profile) {
      await rpc("rename_me", { p_user: profile.id, p_nick: m.nick });
      await chrome.storage.local.set({ profile: { ...profile, nick: m.nick } });
    }
    if (m.type === "leave" && profile) {
      await rpc("delete_me", { p_user: profile.id });
      await chrome.storage.local.remove("profile");
      await chrome.storage.local.set({ optedOut: true });
    }
    if (m.type === "board" && profile) {
      await submit().catch(() => {}); // push my latest count first so my row matches the badge
      return { rows: await rpc("leaderboard", { p_day: day(), p_user: profile.id }) };
    }
    return { ok: true };
  })().then(reply, (e) => reply({ error: String(e) }));
  return true; // async reply
});
