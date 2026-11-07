/* What “Start session” does: open the course chosen for the session (counting the
   session as attended), or the session page when no course is linked. */

import { courseForSession } from "./learn";
import type { Goal, StudySession } from "./types";

export function startSessionHref(session: StudySession, goals: Goal[]) {
  const c = courseForSession(session, goals);
  return c ? `/learn/${c.id}` : `/session/${session.id}`;
}

export function startSession(
  session: StudySession,
  goals: Goal[],
  actions: { updateSession: (id: string, patch: Partial<StudySession>) => void; toast: (m: string) => void },
  push: (href: string) => void,
) {
  const c = courseForSession(session, goals);
  if (c) {
    actions.updateSession(session.id, { status: "completed", studiedMinutes: session.minutes });
    actions.toast(`Session started: ${c.title}`);
    push(`/learn/${c.id}`);
  } else push(`/session/${session.id}`);
}
