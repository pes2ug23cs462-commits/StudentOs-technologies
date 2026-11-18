/* The contact form: topics, and sending a message straight to the StudentOS team. */

export const CONTACT_TOPICS = ["Help with my account", "Feedback or an idea", "Report a problem", "Privacy or data request", "Partnership or college", "Careers"];

const ERRORS: Record<string, string> = {
  "bad-form": "Please add your name, a valid email and a message (at least 10 characters).",
  "slow-down": "You’ve sent a few messages already today. Please try again tomorrow, or email support@student-os.in.",
  failed: "Couldn’t send your message right now. Please try again in a minute, or email support@student-os.in.",
};

export async function sendContact(m: { name: string; email: string; topic: string; message: string; website?: string }): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
  } catch {
    throw new Error(ERRORS.failed);
  }
  if (res.ok) return;
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(ERRORS[j.error ?? "failed"] ?? ERRORS.failed);
}
