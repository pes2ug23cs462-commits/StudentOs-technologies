/* What a study session is actually about, for video and reading searches.
   Titles like "Week 2 · Learn 1" or "Important topic 3" say nothing, so fall back to the objective. */

const GENERIC = /^(lecture|week|unit|chapter|module|part|session|day|learn|revision|practice|important topic|topic|get started|revise and finish)\s*\d*$/i;
const FILLER = /^(cover|revise|practise|practice|learn|study|understand|review|go through|do|solve|finish|complete)\s+(the\s+)?/i;

export function titleTopic(title: string) {
  return title
    .replace(/^week\s*\d+\s*[·:\-–]\s*/i, "")
    .replace(/\b(practice|revision|review|session \d+|learn \d+|shorts?)\b/gi, "")
    .replace(/[·:|–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Cover the next part of Python." → "" (says nothing); "Learn Gauss's law and its uses." → "Gauss's law and its uses" */
export function objectiveTopic(objective: string | undefined, subject = "") {
  if (!objective) return "";
  let t = objective.split(/[.;!?]/)[0].replace(FILLER, "").trim();
  if (/^(the )?(next part|hardest parts|one of the topics|what you covered|formulas, key points)/i.test(t)) return "";
  if (subject) t = t.replace(new RegExp(`\\s*(of|in|for)\\s+${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "");
  return t.length > 2 ? t.slice(0, 70) : "";
}

export function isGenericTopic(t: string) {
  return !t || GENERIC.test(t.trim());
}

/** Best search topic for a session: its title, else its objective, else "". */
export function sessionTopic(s: { title: string; objective?: string }, subject = "") {
  const t = titleTopic(s.title);
  if (!isGenericTopic(t)) return t;
  return objectiveTopic(s.objective, subject);
}
