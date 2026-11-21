/* Aptitude practice for placements: quantitative, logical and verbal.
   Number questions are generated, and the answer is worked out by the same code
   that writes the question, so every key is right and there is no end to practice.
   Verbal questions are a small hand-written set. All questions are original
   StudentOS practice, not any company's previous papers. */

export type Section = "quant" | "logical" | "verbal";
export type TopicId =
  | "percent" | "profit" | "ratio" | "average" | "work" | "speed" | "interest" | "numbers" | "probability" | "pnc"
  | "series" | "coding" | "directions" | "blood" | "odd" | "syllogism"
  | "synonyms" | "antonyms" | "errors" | "blanks";

export type Question = { id: string; topic: TopicId; q: string; options: string[]; answer: number; explain: string };
export type Topic = { id: TopicId; section: Section; name: string; make: () => Omit<Question, "id" | "topic"> };

export const SECTION_LABEL: Record<Section, string> = { quant: "Quantitative", logical: "Logical reasoning", verbal: "Verbal ability" };

/* ---------- helpers ---------- */

const R = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : (Math.round(n * 100) / 100).toLocaleString("en-IN"));
const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** Four options with the right one placed at random. `wrong` may hold duplicates; extra ones are made from the answer. */
function choices(right: string, wrong: string[], fill?: (k: number) => string) {
  const set = new Set<string>([right]);
  for (const w of wrong) if (set.size < 4 && w && !set.has(w)) set.add(w);
  let k = 1;
  while (set.size < 4 && fill && k < 40) set.add(fill(k++));
  const options = shuffle([...set]).slice(0, 4);
  if (!options.includes(right)) options[0] = right;
  return { options, answer: options.indexOf(right) };
}
/** Numeric answer with nearby wrong ones. */
function num(answer: number, wrong: number[], unit = "") {
  const f = (n: number) => `${fmt(n)}${unit}`;
  return choices(f(answer), wrong.filter((w) => w !== answer && w > 0).map(f), (k) => f(answer + (k % 2 ? k : -k) * Math.max(1, Math.round(Math.abs(answer) * 0.07))));
}

/* ---------- quantitative ---------- */

const percent: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const p = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75]);
    const n = R(4, 40) * 20;
    const a = (p * n) / 100;
    return { q: `What is ${p}% of ${fmt(n)}?`, ...num(a, [a * 2, a / 2, (p + 5) * n / 100, n / p]), explain: `${p}% of ${fmt(n)} = ${p} × ${fmt(n)} ÷ 100 = ${fmt(a)}.` };
  }
  const up = pick([10, 20, 25, 30, 40, 50]);
  const down = pick([10, 20, 25, 30, 40, 50]);
  const net = Math.round(((1 + up / 100) * (1 - down / 100) - 1) * 10000) / 100;
  const word = net >= 0 ? "increase" : "decrease";
  const right = net === 0 ? "No change" : `${fmt(Math.abs(net))}% ${word}`;
  const wrong = [`${fmt(Math.abs(up - down))}% ${up >= down ? "increase" : "decrease"}`, `${fmt(Math.abs(net) + 2)}% ${word}`, `${fmt((up * down) / 100)}% ${net >= 0 ? "decrease" : "increase"}`, "No change"];
  return {
    q: `A price is increased by ${up}% and then decreased by ${down}%. What is the overall change?`,
    ...choices(right, wrong, (k) => `${fmt(Math.abs(net) + k)}% ${word}`),
    explain: `Multiply the factors: ${1 + up / 100} × ${1 - down / 100} = ${+(1 + net / 100).toFixed(4)}, so the price ends ${net === 0 ? "where it started" : `${fmt(Math.abs(net))}% ${net > 0 ? "higher" : "lower"}`}.`,
  };
};

const profit: Topic["make"] = () => {
  if (Math.random() < 0.55) {
    const cp = R(4, 60) * 50;
    const p = pick([5, 8, 10, 12, 15, 20, 25, -5, -10, -15, -20]);
    const sp = cp + (cp * p) / 100;
    const kind = p >= 0 ? "profit" : "loss";
    return {
      q: `An item bought for ₹${fmt(cp)} is sold for ₹${fmt(sp)}. What is the ${kind} percentage?`,
      ...num(Math.abs(p), [Math.abs(p) + 5, Math.abs(p) * 2, Math.round((Math.abs(sp - cp) / sp) * 10000) / 100], "%"),
      explain: `${kind[0].toUpperCase() + kind.slice(1)} = ₹${fmt(Math.abs(sp - cp))}. ${kind[0].toUpperCase() + kind.slice(1)} % = ${fmt(Math.abs(sp - cp))} ÷ ${fmt(cp)} × 100 = ${Math.abs(p)}%. Always divide by the cost price.`,
    };
  }
  const mp = R(4, 40) * 100;
  const d = pick([10, 15, 20, 25, 30]);
  const sp = mp - (mp * d) / 100;
  return { q: `The marked price of a shirt is ₹${fmt(mp)}. The shop gives a ${d}% discount. What is the selling price?`, ...num(sp, [mp - d, (mp * d) / 100, sp - 100, sp + 100], ""), explain: `Discount = ${d}% of ₹${fmt(mp)} = ₹${fmt((mp * d) / 100)}. Selling price = ₹${fmt(mp)} − ₹${fmt((mp * d) / 100)} = ₹${fmt(sp)}.` };
};

const ratio: Topic["make"] = () => {
  let a = R(1, 7), b = R(1, 7);
  while (a === b || gcd(a, b) !== 1) [a, b] = [R(1, 7), R(1, 7)];
  const total = (a + b) * R(5, 60) * 10;
  const share = (total * a) / (a + b);
  return { q: `₹${fmt(total)} is divided between Disha and Ravi in the ratio ${a} : ${b}. How much does Disha get?`, ...num(share, [(total * b) / (a + b), total / 2, share + total / (a + b)], ""), explain: `Total parts = ${a} + ${b} = ${a + b}. One part = ₹${fmt(total)} ÷ ${a + b} = ₹${fmt(total / (a + b))}. Disha gets ${a} parts = ₹${fmt(share)}.` };
};

const average: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const n = R(4, 6);
    const xs = Array.from({ length: n }, () => R(10, 99));
    const sum = xs.reduce((s, x) => s + x, 0);
    const extra = (Math.ceil(sum / n) * n) - sum;
    xs[0] += extra;
    const avg = (sum + extra) / n;
    return { q: `What is the average of ${xs.join(", ")}?`, ...num(avg, [avg + 2, avg - 3, Math.round((sum + extra) / (n - 1))]), explain: `Sum = ${sum + extra}. Average = ${sum + extra} ÷ ${n} = ${fmt(avg)}.` };
  }
  const n = R(5, 12);
  const a = R(30, 70);
  const b = a + pick([-2, -1, 1, 2, 3]);
  const x = b * (n + 1) - a * n;
  return { q: `The average age of ${n} students is ${a} years. When the teacher joins, the average becomes ${b}. How old is the teacher?`, ...num(x, [x + n, x - n, b + (b - a)]), explain: `Total before = ${n} × ${a} = ${n * a}. Total after = ${n + 1} × ${b} = ${(n + 1) * b}. Teacher = ${(n + 1) * b} − ${n * a} = ${x} years.` };
};

const WORK_PAIRS: [number, number][] = [[10, 15], [12, 24], [20, 30], [6, 12], [15, 30], [18, 36], [10, 40], [12, 36], [20, 60], [4, 12], [8, 24], [9, 18], [14, 35]];
const work: Topic["make"] = () => {
  const [a, b] = pick(WORK_PAIRS);
  const t = (a * b) / (a + b);
  return { q: `A can finish a job in ${a} days and B in ${b} days. How many days will they take working together?`, ...num(t, [(a + b) / 2, a + b - t, Math.abs(b - a)], " days"), explain: `In one day they do 1/${a} + 1/${b} = ${(a + b) / gcd(a + b, a * b)}/${(a * b) / gcd(a + b, a * b)} of the job, so together they need ${a} × ${b} ÷ (${a} + ${b}) = ${fmt(t)} days.` };
};

const speed: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const v = pick([36, 54, 72, 90, 108]);
    const ms = (v * 5) / 18;
    const t = R(6, 20);
    const len = ms * t;
    return { q: `A train ${fmt(len)} m long runs at ${v} km/h. How long does it take to pass a pole?`, ...num(t, [t + 2, Math.round(len / v), t * 2], " s"), explain: `${v} km/h = ${v} × 5/18 = ${ms} m/s. Time = ${fmt(len)} ÷ ${ms} = ${t} seconds.` };
  }
  const s1 = pick([30, 40, 60]);
  const s2 = pick([20, 40, 60, 80].filter((x) => x !== s1));
  const avg = (2 * s1 * s2) / (s1 + s2);
  return { q: `A bus goes to a town at ${s1} km/h and returns on the same road at ${s2} km/h. What is its average speed for the whole trip?`, ...num(Math.round(avg * 100) / 100, [(s1 + s2) / 2, Math.abs(s1 - s2), Math.round(avg) + 5], " km/h"), explain: `For equal distances, average speed = 2 × ${s1} × ${s2} ÷ (${s1} + ${s2}) = ${fmt(avg)} km/h, not the simple average of the two speeds.` };
};

const interest: Topic["make"] = () => {
  const p = R(2, 40) * 500;
  if (Math.random() < 0.5) {
    const r = pick([4, 5, 6, 8, 10, 12]);
    const t = R(2, 5);
    const si = (p * r * t) / 100;
    return { q: `What is the simple interest on ₹${fmt(p)} at ${r}% a year for ${t} years?`, ...num(si, [(p * r) / 100, si + p, (p * r * (t + 1)) / 100]), explain: `SI = P × R × T ÷ 100 = ${fmt(p)} × ${r} × ${t} ÷ 100 = ₹${fmt(si)}.` };
  }
  const r = pick([5, 10, 20]);
  const ci = p * ((1 + r / 100) ** 2) - p;
  return { q: `What is the compound interest on ₹${fmt(p)} at ${r}% a year for 2 years, compounded yearly?`, ...num(Math.round(ci * 100) / 100, [(p * r * 2) / 100, Math.round(ci * 100) / 100 + 50, (p * r) / 100]), explain: `Amount = ${fmt(p)} × (1 + ${r}/100)² = ₹${fmt(p * (1 + r / 100) ** 2)}. CI = amount − principal = ₹${fmt(ci)}.` };
};

const numbers: Topic["make"] = () => {
  const kind = R(0, 2);
  if (kind === 0) {
    const g = pick([2, 3, 4, 5, 6, 8, 12]);
    let a = R(2, 9), b = R(2, 9);
    while (gcd(a, b) !== 1 || a === b) [a, b] = [R(2, 9), R(2, 9)];
    const x = g * a, y = g * b, l = g * a * b;
    return { q: `What is the LCM of ${x} and ${y}?`, ...num(l, [x * y, g, l * 2]), explain: `HCF of ${x} and ${y} is ${g}. LCM = ${x} × ${y} ÷ ${g} = ${l}.` };
  }
  if (kind === 1) {
    const base = pick([2, 3, 7, 8]);
    const n = R(11, 99);
    const cyc: Record<number, number[]> = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6] };
    const c = cyc[base];
    const u = c[(n - 1) % 4];
    return { q: `What is the unit digit of ${base}^${n}?`, ...choices(String(u), c.map(String).concat(["0", "5"])), explain: `Unit digits of powers of ${base} repeat every 4: ${c.join(", ")}. ${n} ÷ 4 leaves ${n % 4}, so take the ${["4th", "1st", "2nd", "3rd"][n % 4]} in that cycle: ${u}.` };
  }
  const d = pick([7, 9, 11, 13]);
  const q = R(12, 90);
  const r = R(1, d - 1);
  const n = d * q + r;
  return { q: `What is the remainder when ${n} is divided by ${d}?`, ...num(r, [r + 1, d - r, (r + 2) % d || d], ""), explain: `${d} × ${q} = ${d * q}, and ${n} − ${d * q} = ${r}.` };
};

const probability: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const s = R(3, 11);
    const ways = 6 - Math.abs(7 - s);
    const g = gcd(ways, 36);
    return { q: `Two dice are thrown. What is the probability that the sum is ${s}?`, ...choices(`${ways / g}/${36 / g}`, [`${ways}/6`, `1/${s}`, `${ways + 1}/36`, "1/6"].filter((x) => x !== `${ways / g}/${36 / g}`)), explain: `There are 36 outcomes. ${ways} of them add up to ${s}, so the probability is ${ways}/36${g > 1 ? ` = ${ways / g}/${36 / g}` : ""}.` };
  }
  const n = R(2, 4);
  const tot = 2 ** n;
  return { q: `${n} coins are tossed. What is the probability of getting at least one head?`, ...choices(`${tot - 1}/${tot}`, [`1/${tot}`, `${n}/${tot}`, "1/2", `${tot - 2}/${tot}`]), explain: `Only one outcome has no head (all tails). So P(at least one head) = 1 − 1/${tot} = ${tot - 1}/${tot}.` };
};

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n: number, r: number) => fact(n) / (fact(r) * fact(n - r));
const pnc: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const word = pick(["CAT", "MANGO", "FRIEND", "PLANE", "STORY", "WORLD", "BRICK"]);
    const n = word.length;
    return { q: `In how many ways can the letters of the word ${word} be arranged?`, ...num(fact(n), [fact(n - 1), n * n, fact(n) / 2]), explain: `${word} has ${n} different letters, so they can be arranged in ${n}! = ${fact(n)} ways.` };
  }
  const n = R(6, 10);
  const r = R(2, 4);
  const c = nCr(n, r);
  return { q: `In how many ways can a team of ${r} be chosen from ${n} students?`, ...num(c, [c * fact(r), n * r, nCr(n, r - 1)]), explain: `Order doesn't matter, so use combinations: ${n}C${r} = ${n}! ÷ (${r}! × ${n - r}!) = ${c}.` };
};

/* ---------- logical ---------- */

const series: Topic["make"] = () => {
  const kind = R(0, 3);
  let xs: number[] = [], rule = "";
  if (kind === 0) {
    const a = R(2, 30), d = R(3, 15);
    xs = Array.from({ length: 6 }, (_, i) => a + i * d);
    rule = `Each term adds ${d}.`;
  } else if (kind === 1) {
    const a = R(1, 5), r = pick([2, 3]);
    xs = Array.from({ length: 6 }, (_, i) => a * r ** i);
    rule = `Each term is multiplied by ${r}.`;
  } else if (kind === 2) {
    const s = R(1, 5), k = pick([1, 2, -1]);
    xs = Array.from({ length: 6 }, (_, i) => (s + i) ** 2 + k);
    rule = `The terms are squares (${s}², ${s + 1}², …) ${k > 0 ? `plus ${k}` : `minus ${-k}`}.`;
  } else {
    const a = R(2, 10);
    xs = [a];
    for (let i = 1; i < 6; i++) xs.push(xs[i - 1] + i * 2);
    rule = `The differences grow by 2: +2, +4, +6, +8, +10.`;
  }
  const ans = xs[5];
  return { q: `What comes next? ${xs.slice(0, 5).join(", ")}, ?`, ...num(ans, [ans + 2, ans - 3, xs[4] + (xs[4] - xs[3])]), explain: rule };
};

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const shift = (w: string, k: number) => w.split("").map((c) => ABC[(ABC.indexOf(c) + k + 26) % 26]).join("");
const coding: Topic["make"] = () => {
  const words = ["CAT", "DOG", "BOOK", "PEN", "SUN", "TREE", "FISH", "LAMP", "MILK", "ROSE", "GOLD", "KITE"];
  const [w1, w2] = shuffle(words).slice(0, 2);
  const k = pick([1, 2, 3, -1, -2]);
  const right = shift(w2, k);
  return { q: `In a code, ${w1} is written as ${shift(w1, k)}. How is ${w2} written in that code?`, ...choices(right, [shift(w2, -k), shift(w2, k + 1), shift(w2, k).split("").reverse().join("")]), explain: `Each letter moves ${Math.abs(k)} place${Math.abs(k) > 1 ? "s" : ""} ${k > 0 ? "forward" : "back"} in the alphabet, so ${w2} → ${right}.` };
};

const directions: Topic["make"] = () => {
  const m = pick([1, 2, 3, 4, 5]);
  const a = 3 * m, b = 4 * m;
  const first = pick(["north", "south", "east", "west"] as const);
  const turn = pick(["right", "left"] as const);
  const order = ["north", "east", "south", "west"];
  const second = order[(order.indexOf(first) + (turn === "right" ? 1 : 3)) % 4];
  return { q: `Meena walks ${a} km ${first}, then turns ${turn} and walks ${b} km. How far is she from where she started?`, ...num(5 * m, [a + b, b - a, 6 * m], " km"), explain: `Her two walks are at right angles (${first} then ${second}), so the distance is √(${a}² + ${b}²) = ${5 * m} km.` };
};

const BLOOD: { q: string; a: string; wrong: string[]; why: string }[] = [
  { q: "Ravi is the father of Kiran. Kiran is the sister of Arjun. How is Ravi related to Arjun?", a: "Father", wrong: ["Uncle", "Brother", "Grandfather"], why: "Kiran and Arjun are siblings, so Kiran's father is Arjun's father too." },
  { q: "Priya is the daughter of Suresh. Suresh is the only son of Lata. How is Lata related to Priya?", a: "Grandmother", wrong: ["Mother", "Aunt", "Sister"], why: "Lata is Priya's father's mother, her grandmother." },
  { q: "Anil's mother is the only daughter of Meera's father. How is Meera related to Anil?", a: "Mother", wrong: ["Aunt", "Grandmother", "Sister"], why: "The only daughter of Meera's father is Meera herself, so Meera is Anil's mother." },
  { q: "Vikram is the brother of Disha. Disha is the mother of Dev. How is Vikram related to Dev?", a: "Uncle", wrong: ["Father", "Brother", "Grandfather"], why: "Vikram is the brother of Dev's mother, so he is Dev's (maternal) uncle." },
  { q: "Sunil's wife is the sister of Ramesh. How is Ramesh related to Sunil?", a: "Brother-in-law", wrong: ["Brother", "Cousin", "Uncle"], why: "Ramesh is the brother of Sunil's wife, so he is Sunil's brother-in-law." },
  { q: "Kavya is the only granddaughter of Mohan. Mohan has one son, Ajay. How is Ajay related to Kavya?", a: "Father", wrong: ["Uncle", "Brother", "Grandfather"], why: "Mohan's only son is Ajay, so his granddaughter Kavya must be Ajay's daughter." },
  { q: "Pointing to a man, Rekha says, “He is the son of my grandfather's only son.” How is the man related to Rekha?", a: "Brother", wrong: ["Cousin", "Father", "Uncle"], why: "Her grandfather's only son is her father. Her father's son is her brother." },
];
const blood: Topic["make"] = () => {
  const it = pick(BLOOD);
  return { q: it.q, ...choices(it.a, it.wrong), explain: it.why };
};

const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const odd: Topic["make"] = () => {
  if (Math.random() < 0.5) {
    const ps = shuffle(PRIMES).slice(0, 3);
    const c = pick([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93]);
    return { q: `Which number is the odd one out? ${shuffle([...ps, c]).join(", ")}`, ...choices(String(c), ps.map(String)), explain: `${ps.join(", ")} are prime. ${c} is not (it divides by ${[3, 7, 11, 13].find((d) => c % d === 0)}).` };
  }
  const sq = shuffle([16, 25, 36, 49, 64, 81, 100, 121, 144]).slice(0, 3);
  const c = pick([18, 27, 35, 48, 50, 63, 80, 99, 120]);
  return { q: `Which number is the odd one out? ${shuffle([...sq, c]).join(", ")}`, ...choices(String(c), sq.map(String)), explain: `${sq.join(", ")} are perfect squares; ${c} is not.` };
};

const SYL: { q: string; a: string; wrong: string[]; why: string }[] = [
  { q: "All pens are pencils. All pencils are books. Conclusion: All pens are books.", a: "The conclusion follows", wrong: ["The conclusion does not follow", "Only some pens are books", "No pen is a book"], why: "Pens sit inside pencils, which sit inside books, so every pen is a book." },
  { q: "Some cats are dogs. All dogs are birds. Conclusion: Some cats are birds.", a: "The conclusion follows", wrong: ["The conclusion does not follow", "All cats are birds", "No cat is a bird"], why: "The cats that are dogs are also birds, so at least some cats are birds." },
  { q: "All roses are flowers. Some flowers are red. Conclusion: Some roses are red.", a: "The conclusion does not follow", wrong: ["The conclusion follows", "All roses are red", "No rose is red"], why: "The red flowers may not include any roses, so it isn't certain." },
  { q: "No apple is a mango. All mangoes are fruits. Conclusion: No apple is a fruit.", a: "The conclusion does not follow", wrong: ["The conclusion follows", "All apples are fruits", "Some apples are mangoes"], why: "Apples are kept apart from mangoes, not from all fruits." },
  { q: "All teachers are graduates. No graduate is lazy. Conclusion: No teacher is lazy.", a: "The conclusion follows", wrong: ["The conclusion does not follow", "Some teachers are lazy", "All lazy people are teachers"], why: "Every teacher is a graduate, and no graduate is lazy." },
  { q: "Some phones are laptops. Some laptops are tablets. Conclusion: Some phones are tablets.", a: "The conclusion does not follow", wrong: ["The conclusion follows", "All phones are tablets", "No phone is a laptop"], why: "Two “some” statements never give a definite conclusion." },
  { q: "All coders are learners. Some learners are singers. Conclusion: Some coders are singers.", a: "The conclusion does not follow", wrong: ["The conclusion follows", "All coders are singers", "No learner is a coder"], why: "The singing learners may be learners who aren't coders." },
  { q: "All chairs are tables. No table is a bed. Conclusion: No chair is a bed.", a: "The conclusion follows", wrong: ["The conclusion does not follow", "Some chairs are beds", "All beds are chairs"], why: "Chairs are inside tables, and tables never overlap beds." },
];
const syllogism: Topic["make"] = () => {
  const it = pick(SYL);
  return { q: `Read the statements and decide. ${it.q}`, ...choices(it.a, it.wrong), explain: it.why };
};

/* ---------- verbal ---------- */

const SYN: [string, string, string[]][] = [
  ["Abundant", "Plentiful", ["Scarce", "Tiny", "Hidden"]], ["Brief", "Short", ["Long", "Clear", "Loud"]], ["Candid", "Frank", ["Secret", "Shy", "Rude"]],
  ["Diligent", "Hard-working", ["Lazy", "Clever", "Careless"]], ["Eager", "Keen", ["Bored", "Afraid", "Tired"]], ["Fragile", "Delicate", ["Strong", "Heavy", "Rough"]],
  ["Genuine", "Real", ["Fake", "Old", "Rare"]], ["Hostile", "Unfriendly", ["Kind", "Calm", "Polite"]], ["Imitate", "Copy", ["Create", "Ignore", "Praise"]],
  ["Jubilant", "Joyful", ["Sad", "Angry", "Quiet"]], ["Lucid", "Clear", ["Confusing", "Dark", "Wet"]], ["Meagre", "Scanty", ["Ample", "Costly", "Fresh"]],
  ["Obsolete", "Outdated", ["Modern", "Useful", "Common"]], ["Prudent", "Wise", ["Foolish", "Rich", "Proud"]], ["Rapid", "Fast", ["Slow", "Late", "Steady"]],
  ["Vacant", "Empty", ["Full", "Busy", "Tall"]], ["Vivid", "Bright", ["Dull", "Faint", "Small"]], ["Commence", "Begin", ["End", "Pause", "Delay"]],
];
const ANT: [string, string, string[]][] = [
  ["Ancient", "Modern", ["Old", "Historic", "Aged"]], ["Brave", "Cowardly", ["Bold", "Daring", "Strong"]], ["Expand", "Shrink", ["Grow", "Widen", "Stretch"]],
  ["Generous", "Mean", ["Kind", "Giving", "Liberal"]], ["Humble", "Proud", ["Modest", "Meek", "Simple"]], ["Optimist", "Pessimist", ["Dreamer", "Realist", "Idealist"]],
  ["Permanent", "Temporary", ["Lasting", "Fixed", "Stable"]], ["Reject", "Accept", ["Refuse", "Deny", "Decline"]], ["Scarce", "Plentiful", ["Rare", "Few", "Limited"]],
  ["Transparent", "Opaque", ["Clear", "Glassy", "Visible"]], ["Victory", "Defeat", ["Win", "Success", "Triumph"]], ["Rigid", "Flexible", ["Stiff", "Firm", "Hard"]],
  ["Superior", "Inferior", ["Better", "Higher", "Greater"]], ["Increase", "Decrease", ["Raise", "Grow", "Add"]], ["Profit", "Loss", ["Gain", "Income", "Benefit"]],
];
const ERR: { parts: [string, string, string, string]; bad: number; fix: string }[] = [
  { parts: ["Each of the students", "have submitted", "their project", "on time."], bad: 1, fix: "“Each” takes a singular verb: has submitted." },
  { parts: ["She is", "more smarter", "than her", "brother."], bad: 1, fix: "Use “smarter”, not “more smarter”." },
  { parts: ["I have been working", "here since", "five years", "now."], bad: 2, fix: "Use “for five years”; “since” is for a point in time." },
  { parts: ["Neither the manager", "nor the clerks", "was present", "at the meeting."], bad: 2, fix: "With neither…nor, the verb follows the nearer subject: “clerks were”." },
  { parts: ["The news", "are very", "good for", "our team."], bad: 1, fix: "“News” is singular: “The news is”." },
  { parts: ["He did not", "knew the answer", "to the", "last question."], bad: 1, fix: "After “did not” use the base form: “know”." },
  { parts: ["One of my friend", "is coming", "to the interview", "with me."], bad: 0, fix: "“One of” takes a plural noun: “One of my friends”." },
  { parts: ["The furniture", "in the office", "are new", "and comfortable."], bad: 2, fix: "“Furniture” is uncountable and singular: “is new”." },
  { parts: ["If I was you,", "I would", "accept the", "offer."], bad: 0, fix: "For an imagined situation use “If I were you”." },
  { parts: ["We discussed", "about the plan", "for two hours", "yesterday."], bad: 1, fix: "“Discuss” takes no preposition: “discussed the plan”." },
  { parts: ["The team", "have won", "it's", "first match."], bad: 2, fix: "The possessive is “its”; “it's” means “it is”." },
];
const BLANK: { s: string; a: string; wrong: string[]; why: string }[] = [
  { s: "She is good ___ solving puzzles.", a: "at", wrong: ["in", "on", "for"], why: "“Good at” something." },
  { s: "The interview is ___ Monday.", a: "on", wrong: ["in", "at", "by"], why: "Use “on” for days." },
  { s: "He has been waiting ___ 10 a.m.", a: "since", wrong: ["for", "from", "by"], why: "“Since” for a point in time." },
  { s: "I prefer tea ___ coffee.", a: "to", wrong: ["than", "over", "from"], why: "“Prefer A to B”." },
  { s: "She was ___ honest candidate.", a: "an", wrong: ["a", "the", "no article"], why: "“Honest” starts with a vowel sound." },
  { s: "The results will be announced ___ two weeks.", a: "within", wrong: ["since", "during", "among"], why: "“Within” means before the end of a period." },
  { s: "He apologised ___ being late.", a: "for", wrong: ["of", "about", "on"], why: "“Apologise for” something." },
  { s: "Divide the sweets ___ the three children.", a: "among", wrong: ["between", "with", "into"], why: "“Among” for more than two." },
  { s: "If it rains, we ___ the match.", a: "will cancel", wrong: ["would cancel", "cancelled", "had cancelled"], why: "First conditional: if + present, will + verb." },
  { s: "By next year, she ___ her degree.", a: "will have finished", wrong: ["finishes", "will finish", "has finished"], why: "Future perfect for an action done before a future time." },
  { s: "He is junior ___ me in the office.", a: "to", wrong: ["than", "from", "of"], why: "“Junior to”, like “senior to”." },
  { s: "The manager insisted ___ a written report.", a: "on", wrong: ["for", "at", "about"], why: "“Insist on” something." },
];

/* ---------- topics ---------- */

export const TOPICS: Topic[] = [
  { id: "percent", section: "quant", name: "Percentages", make: percent },
  { id: "profit", section: "quant", name: "Profit, loss & discount", make: profit },
  { id: "ratio", section: "quant", name: "Ratio & proportion", make: ratio },
  { id: "average", section: "quant", name: "Averages", make: average },
  { id: "work", section: "quant", name: "Time & work", make: work },
  { id: "speed", section: "quant", name: "Time, speed & distance", make: speed },
  { id: "interest", section: "quant", name: "Simple & compound interest", make: interest },
  { id: "numbers", section: "quant", name: "Number system", make: numbers },
  { id: "probability", section: "quant", name: "Probability", make: probability },
  { id: "pnc", section: "quant", name: "Permutations & combinations", make: pnc },
  { id: "series", section: "logical", name: "Number series", make: series },
  { id: "coding", section: "logical", name: "Coding–decoding", make: coding },
  { id: "directions", section: "logical", name: "Directions", make: directions },
  { id: "blood", section: "logical", name: "Blood relations", make: blood },
  { id: "odd", section: "logical", name: "Odd one out", make: odd },
  { id: "syllogism", section: "logical", name: "Syllogisms", make: syllogism },
  {
    id: "synonyms", section: "verbal", name: "Synonyms", make: () => {
      const [w, a, wrong] = pick(SYN);
      return { q: `Choose the word closest in meaning to “${w}”.`, ...choices(a, wrong), explain: `${w} means ${a.toLowerCase()}.` };
    },
  },
  {
    id: "antonyms", section: "verbal", name: "Antonyms", make: () => {
      const [w, a, wrong] = pick(ANT);
      return { q: `Choose the word opposite in meaning to “${w}”.`, ...choices(a, wrong), explain: `The opposite of ${w.toLowerCase()} is ${a.toLowerCase()}.` };
    },
  },
  {
    id: "errors", section: "verbal", name: "Spot the error", make: () => {
      const it = pick(ERR);
      const opts = it.parts.map((p, k) => `(${"ABCD"[k]}) ${p}`);
      return { q: `Which part of the sentence has an error? ${it.parts.join(" / ")}`, options: opts, answer: it.bad, explain: it.fix };
    },
  },
  {
    id: "blanks", section: "verbal", name: "Fill in the blank", make: () => {
      const it = pick(BLANK);
      return { q: `Fill in the blank: ${it.s}`, ...choices(it.a, it.wrong), explain: it.why };
    },
  },
];
export const TOPIC: Record<TopicId, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, Topic>;

let seq = 0;
export function makeQuestion(id: TopicId): Question {
  const t = TOPIC[id];
  // a generator never repeats the same question twice in a row
  return { id: `${id}-${Date.now().toString(36)}-${seq++}`, topic: id, ...t.make() };
}
function set(ids: TopicId[], n: number): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const q = makeQuestion(ids[out.length % ids.length]);
    if (seen.has(q.q)) continue;
    seen.add(q.q);
    out.push(q);
  }
  return out;
}
/** Practice on one topic. */
export const topicSet = (id: TopicId, n = 10) => set([id], n);
/** A full mock: quantitative, logical and verbal in the usual mix, in section order.
    `focus` (topics a company asks most) come up about twice as often. */
export function mockSet(focus: TopicId[] = []): Question[] {
  const by = (s: Section) => {
    const all = TOPICS.filter((t) => t.section === s).map((t) => t.id);
    const f = focus.filter((id) => TOPIC[id]?.section === s);
    return shuffle([...f, ...f, ...all]);
  };
  return [...set(by("quant"), 12), ...set(by("logical"), 10), ...set(by("verbal"), 8)];
}
export const MOCK_MINUTES = 30;

/* ---------- results kept in the student's profile ---------- */

export type AptitudeAttempt = {
  id: string;
  at: number;
  kind: "topic" | "mock";
  topic?: TopicId;
  total: number;
  correct: number;
  secs: number;
  /** topic → [correct, asked] */
  byTopic: Partial<Record<TopicId, [number, number]>>;
  /** strict mode closed the mock after 3 warnings */
  ended?: boolean;
};
export type AptitudeState = { attempts: AptitudeAttempt[] };

/** Accuracy per topic across all attempts (only topics that were asked). */
export function topicStats(st: AptitudeState | undefined) {
  const out: Partial<Record<TopicId, { right: number; asked: number; pct: number }>> = {};
  for (const a of st?.attempts ?? []) {
    for (const [k, v] of Object.entries(a.byTopic) as [TopicId, [number, number]][]) {
      const o = (out[k] ??= { right: 0, asked: 0, pct: 0 });
      o.right += v[0];
      o.asked += v[1];
    }
  }
  for (const o of Object.values(out)) if (o) o.pct = Math.round((o.right / Math.max(1, o.asked)) * 100);
  return out;
}
/** Aptitude score for readiness: accuracy over the last 5 attempts, 0 if none. */
export function aptitudeScore(st: AptitudeState | undefined) {
  const last = (st?.attempts ?? []).slice(0, 5);
  const asked = last.reduce((n, a) => n + a.total, 0);
  return asked ? Math.round((last.reduce((n, a) => n + a.correct, 0) / asked) * 100) : 0;
}
