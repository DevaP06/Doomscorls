# Doomboard — store listing (copy/paste into the store form)

**Name:** Doomboard
**Category:** Fun (Chrome) / Social & Communication
**Language:** English

## Short description (max 132 chars)
Count your daily Reels and Shorts, get a brainrot score, and optionally climb the doomscroll leaderboard.

## Detailed description
How many Reels did you really watch today? Doomboard counts them for you, so you can finally see where your day went.

• Live counter badge on Instagram Reels and YouTube Shorts: a tiny pill in the corner that pops with every reel
• Tap it for your analytics: time scrolled, seconds per reel, your Brainrot Score, and a 7-day chart
• Fun titles: Casual Scroller, Rabbit Hole Olympian, Brainrot Boss, Certified Zombie…
• Optional global leaderboard: join with a nickname and see who the biggest doomscroller is today

PRIVACY FIRST
• Your counts are stored on your own device.
• The leaderboard is opt-in. If you join, Doomboard shares only your nickname and your daily totals (reels and minutes), never what you watch.
• "Leave & delete my data" in the popup removes you from the leaderboard completely.
• Doomboard never reads captions, usernames, comments or any page content.

Not affiliated with or endorsed by Instagram, Meta, YouTube or Google.

## Single purpose (Chrome form)
Count the short-form videos (Reels/Shorts) the user watches each day and show them their stats, with an optional leaderboard.

## Permission justifications (Chrome form)
- **storage**: saves the user's daily counts and leaderboard profile on their device.
- **alarms**: batches leaderboard score uploads to once every ~30 seconds instead of on every reel.
- **Host permission (supabase.co project URL)**: sends the nickname and daily totals to the leaderboard server, only after the user joins.
- **Content script on instagram.com and youtube.com**: detects when the page URL changes to a new Reel/Short in order to count it, and shows the counter badge. It does not read or send page content.
- **Remote code:** none. All code is in the package.

## Data usage disclosures (Chrome "Privacy practices" tab)
- Collected: "Website content"? **No.** "Personally identifiable information"? **No** (nickname is user-chosen, not real identity). "User activity": **Yes** (daily reel counts and watch time, only if the user joins the leaderboard).
- Certify: not sold to third parties; not used for unrelated purposes; not used for creditworthiness or lending.
- **Privacy policy URL:** (host PRIVACY.md publicly, e.g. a GitHub repo page, and paste the link here)

## Assets you need to make
- Screenshots: at least 1, size 1280x800 (or 640x400). Suggested: (1) the badge on a reel with the panel open, (2) the popup with the leaderboard, (3) the join screen.
- Small promo tile (optional, 440x280).
- Icon: already included (128x128 in the package).
