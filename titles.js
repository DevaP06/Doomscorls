// Shared by content.js (badge) and popup.js. [min reels, emoji, title]
const TITLES = [
  [200, "🧟", "Certified Zombie"],
  [100, "🫠", "Brainrot Boss"],
  [50, "🐇", "Rabbit Hole Olympian"],
  [10, "🙂", "Casual Scroller"],
  [0, "🌱", "Touched Grass"],
];
// Random suggested nickname for the join screen, e.g. "FeralOtter42"
const ADJ = ["Sleepy", "Cursed", "Feral", "Chaotic", "Gigabrain", "Doomed", "Crispy", "Soggy", "Unhinged", "Sus", "Caffeinated", "Mid"];
const ANIMAL = ["Otter", "Goblin", "Panda", "Raccoon", "Potato", "Gremlin", "Capybara", "Noodle", "Pigeon", "Llama", "Walrus", "Toast"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randomNick = () => pick(ADJ) + pick(ANIMAL) + (10 + Math.floor(Math.random() * 90));

// brainrot 0-100: more reels + faster skipping (shorter avg watch) = higher
const rotScore = (reels, secs) =>
  Math.min(100, Math.round(reels * 0.4 + Math.max(0, 20 - (reels ? secs / reels : 20)) * 2));
const titleFor =(reels) => TITLES.find(([min]) => reels >= min);
