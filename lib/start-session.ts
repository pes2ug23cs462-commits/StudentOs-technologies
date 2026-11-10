/* What “Start session” does: open the session page, with learning resources
   for its subject and topic (videos, reading, AI help). Courses with
   certificates stay in Learning and aren't opened from a session. */

import type { Goal, StudySession } from "./types";
import type { Learning } from "./learn";

export function startSessionHref(session: StudySession, _goals?: Goal[], _learning?: Learning) {
  return `/session/${session.id}`;
}

export function startSession(
  session: StudySession,
  _goals: Goal[],
  _actions: { updateSession: (id: string, patch: Partial<StudySession>) => void; toast: (m: string) => void },
  push: (href: string) => void,
  _learning?: Learning,
) {
  push(`/session/${session.id}`);
}
