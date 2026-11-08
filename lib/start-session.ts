/* What “Start session” does: open the course chosen for the session (counting the
   session as attended), or the session page when no course is linked. */

import { courseForSession, type Learning } from "./learn";
import type { Goal, StudySession } from "./types";

export function startSessionHref(session: StudySession, goals: Goal[], learning?: Learning) {
  const c = courseForSession(session, goals, learning);
  return c ? `/learn/${c.id}` : `/session/${session.id}`;
}

export function startSession(
  session: StudySession,
  goals: Goal[],
  actions: { updateSession: (id: string, patch: Partial<StudySession>) => void; toast: (m: string) => void },
  push: (href: string) => void,
  learning?: Learning,
) {
  const c = courseForSession(session, goals, learning);
  if (c) {
    actions.updateSession(session.id, { status: "completed", studiedMinutes: session.minutes });
    actions.toast(`Session started: ${c.title}`);
    push(`/learn/${c.id}`);
  } else push(`/session/${session.id}`);
}
