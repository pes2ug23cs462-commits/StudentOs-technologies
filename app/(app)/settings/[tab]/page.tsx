"use client";

import { FancyIcon } from "@/components/site/fancy-icon";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { photoFromFile } from "@/lib/photo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";
import { BellIcon, ChatIcon, LockIcon, SlidersIcon, TrophyIcon, UserIcon } from "@/components/ui/icons";
import { CertificatesPanel } from "@/components/learn/certificates-panel";
import { SystemCheck } from "@/components/settings/system-check";
import { Avatar, Card, ChipGroup, Input, Label, SwitchRow } from "@/components/ui/primitives";
import { profileLine } from "@/components/shell/sidebar";
import { HOURS_OPTIONS, REST_OPTIONS, SESSION_OPTIONS, TIME_OPTIONS } from "@/lib/labels";
import { authErrorText, deleteAccount, logOut, sendPasswordReset, type AuthErrorCode } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { AssistantSettings, NotificationSettings, Profile, StudyTime } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "profile", label: "Profile", Icon: UserIcon },
  { key: "certificates", label: "Certifications", Icon: TrophyIcon },
  { key: "study", label: "Study preferences", Icon: SlidersIcon },
  { key: "notifications", label: "Notifications", Icon: BellIcon },
  { key: "assistant", label: "Assistant", Icon: ChatIcon },
  { key: "account", label: "Account & privacy", Icon: LockIcon },
  // Not in the menu: open /settings/system to test the API keys.
  { key: "system", label: "System check", Icon: SlidersIcon, hidden: true },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Panel({ title, sub, children, className }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <Card glow className={cn("p-5", className)}>
      <h2 className="text-[14.5px] font-semibold text-white">{title}</h2>
      {sub && <p className="mt-1.5 text-[11.5px] text-white/50">{sub}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const active = (TABS.find((t) => t.key === tab)?.key ?? "profile") as TabKey;

  return (
    <div className="px-6 py-7 lg:px-8">
      <h1 className="flex items-center gap-3 text-[24px] font-semibold tracking-[-0.02em] text-white">
<FancyIcon name="shield" tone="sky" size={44} />Settings</h1>
      <p className="mt-1 text-[13px] text-white/55">Your profile, study preferences and how the assistant behaves.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[170px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {TABS.filter((t) => !("hidden" in t) || active === t.key).map(({ key, label, Icon }) => (
            <Link
              key={key}
              href={`/settings/${key}`}
              aria-current={active === key ? "page" : undefined}
              className={cn(
                "relative flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[12.5px] whitespace-nowrap transition",
                active === key ? "bg-plum font-medium text-white" : "text-white/70 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {active === key && <span className="absolute top-1.5 bottom-1.5 -left-2 hidden w-[3px] rounded-r bg-accent lg:block" />}
              <Icon size={15} className={active === key ? "text-accent" : ""} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 max-w-[720px] space-y-4">
          {active === "profile" && <ProfileTab />}
          {active === "certificates" && <CertificatesPanel />}
          {active === "study" && <StudyTab />}
          {active === "notifications" && <NotificationsTab />}
          {active === "assistant" && <AssistantTab />}
          {active === "account" && <AccountTab />}
          {active === "system" && <SystemCheck />}
        </div>
      </div>
    </div>
  );
}

/* ---------- Profile ---------- */
function ProfileTab() {
  const { state, actions } = useStore();
  const [draft, setDraft] = useState<Profile>(state.profile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.profile);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const fields: [keyof Profile, string][] = [
    ["name", "Full name"],
    ["email", "College email"],
    ["college", "College or institution"],
    ["degree", "Degree and year"],
    ["timezone", "Time zone"],
    ["language", "Language"],
  ];
  return (
    <>
      <Panel title="Profile" sub="This is how you appear in StudentOS and on any plan you share.">
        <div className="flex items-center gap-3">
          <Avatar name={draft.name} src={state.profile.photo} size={56} />
          <div className="flex-1">
            <p className="text-[13.5px] font-semibold text-white">{draft.name || "Your name"}</p>
            <p className="text-[11px] text-white/50">{profileLine(draft)}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Upload profile photo"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPhotoBusy(true);
              try {
                const photo = await photoFromFile(file);
                actions.setProfile({ ...state.profile, photo });
                setDraft((d) => ({ ...d, photo }));
                actions.toast("Profile photo updated.");
              } catch (err) {
                actions.toast(err instanceof Error ? err.message : "Couldn’t use that image.");
              } finally {
                setPhotoBusy(false);
              }
            }}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {state.profile.photo && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  actions.setProfile({ ...state.profile, photo: "" });
                  setDraft((d) => ({ ...d, photo: "" }));
                  actions.toast("Photo removed.");
                }}
              >
                Remove
              </Button>
            )}
            <Button size="sm" loading={photoBusy} onClick={() => fileRef.current?.click()}>
              {state.profile.photo ? "Change photo" : "Upload photo"}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map(([k, label]) => (
            <div key={k}>
              <Label htmlFor={`pf-${k}`}>{label}</Label>
              <Input
                id={`pf-${k}`}
                value={draft[k]}
                onChange={set(k)}
                type={k === "email" ? "email" : "text"}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => setDraft(state.profile)}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty || !draft.name.trim()}
          onClick={() => {
            actions.setProfile(draft);
            actions.toast("Profile saved.");
          }}
        >
          Save profile
        </Button>
      </div>
    </>
  );
}

/* ---------- Study preferences ---------- */
function StudyTab() {
  const { state, actions } = useStore();
  const p = state.prefs;
  const n = state.notifications;
  const a = state.assistant;
  const toggleTime = (t: StudyTime) => actions.setPrefs({ times: p.times.includes(t) ? p.times.filter((x) => x !== t) : [...p.times, t] });
  return (
    <>
      <Panel title="Study preferences" sub="Changes here are used the next time StudentOS revises your plan. Your current plan doesn’t change until you approve a revision.">
        <div className="space-y-4">
          <div>
            <Label>Hours a week</Label>
            <ChipGroup options={HOURS_OPTIONS} value={p.hours} onChange={(hours) => actions.setPrefs({ hours })} />
          </div>
          <div>
            <Label>Preferred times</Label>
            <ChipGroup options={TIME_OPTIONS} value={p.times} onChange={toggleTime} />
          </div>
          <div>
            <Label>Session length</Label>
            <ChipGroup options={SESSION_OPTIONS} value={p.sessionLength} onChange={(sessionLength) => actions.setPrefs({ sessionLength })} />
          </div>
          <div>
            <Label>Rest day</Label>
            <ChipGroup options={REST_OPTIONS} value={p.restDay} onChange={(restDay) => actions.setPrefs({ restDay })} />
          </div>
        </div>
      </Panel>
      <Panel title="Notifications & assistant">
        <div className="-mt-2 divide-y divide-white/[0.07]">
          <SwitchRow title="Session reminders" description={`${n.howEarly === 60 ? "1 hour" : `${n.howEarly} minutes`} before each study session`} checked={n.beforeSession} onChange={(v) => actions.setNotifications({ beforeSession: v })} />
          <SwitchRow title="Missed-session suggestions" description="Suggest a new time when a session is missed" checked={n.missedSuggestions} onChange={(v) => actions.setNotifications({ missedSuggestions: v })} />
          <SwitchRow title="Open the assistant after I log in" description="Show the chat first on the dashboard" checked={a.openOnLogin} onChange={(v) => actions.setAssistant({ openOnLogin: v })} />
          <SwitchRow title="Weekly summary" description="A short recap every Sunday evening" checked={n.weeklySummary} onChange={(v) => actions.setNotifications({ weeklySummary: v })} />
        </div>
      </Panel>
    </>
  );
}

/* ---------- Notifications ---------- */
function NotificationsTab() {
  const { state, actions } = useStore();
  const n = state.notifications;
  const set = (patch: Partial<NotificationSettings>) => actions.setNotifications(patch);
  return (
    <>
      <Panel title="Reminders">
        <div className="-mt-2 divide-y divide-white/[0.07]">
          <div>
            <SwitchRow title="Before each session" description="Remind me before a session starts" checked={n.beforeSession} onChange={(v) => set({ beforeSession: v })} />
            {n.beforeSession && (
              <div className="pb-4">
                <p className="mb-2 text-[11.5px] text-white/50">How early</p>
                <ChipGroup
                  options={[
                    { value: 10 as const, label: "10 min" },
                    { value: 30 as const, label: "30 min" },
                    { value: 60 as const, label: "1 hour" },
                  ]}
                  value={n.howEarly}
                  onChange={(howEarly) => set({ howEarly })}
                />
              </div>
            )}
          </div>
          <SwitchRow title="Missed-session suggestions" description="Suggest a new time when I miss a session" checked={n.missedSuggestions} onChange={(v) => set({ missedSuggestions: v })} />
          <SwitchRow title="Morning plan at 8:00 AM" description="A short summary of today’s sessions" checked={n.morningPlan} onChange={(v) => set({ morningPlan: v })} />
          <SwitchRow title="Weekly summary on Sundays" description="What you finished and what’s next" checked={n.weeklySummary} onChange={(v) => set({ weeklySummary: v })} />
        </div>
      </Panel>
      <Panel title="Where to notify me">
        <div className="-mt-2 divide-y divide-white/[0.07]">
          <SwitchRow title="Push notifications" description="In this browser and the StudentOS app" checked={n.push} onChange={(v) => set({ push: v })} />
          <SwitchRow title="Email" description={state.profile.email} checked={n.email} onChange={(v) => set({ email: v })} />
        </div>
      </Panel>
    </>
  );
}

/* ---------- Assistant ---------- */
function AssistantTab() {
  const { state, actions } = useStore();
  const a = state.assistant;
  const set = (patch: Partial<AssistantSettings>) => actions.setAssistant(patch);
  return (
    <>
      <Panel title="How StudentOS talks to you">
        <Label>Tone</Label>
        <ChipGroup
          options={[
            { value: "encouraging" as const, label: "Encouraging" },
            { value: "direct" as const, label: "Straight to the point" },
            { value: "detailed" as const, label: "Detailed explanations" },
          ]}
          value={a.tone}
          onChange={(tone) => set({ tone })}
        />
        <div className="mt-2 divide-y divide-white/[0.07]">
          <SwitchRow title="Open the assistant after I log in" checked={a.openOnLogin} onChange={(v) => set({ openOnLogin: v })} />
          <SwitchRow title="Suggest reschedules automatically" description="When a session is missed or a conflict appears" checked={a.autoReschedule} onChange={(v) => set({ autoReschedule: v })} />
          <SwitchRow title="Always ask before changing my plan" description="StudentOS shows the change and waits for you to confirm" checked={a.askBeforeChanging} onChange={(v) => set({ askBeforeChanging: v })} />
        </div>
      </Panel>
      <Panel title="What the assistant can use" sub="Turning these off makes suggestions less accurate. Nothing is shared outside StudentOS.">
        <div className="-mt-2 divide-y divide-white/[0.07]">
          <SwitchRow title="My schedule and commitments" checked={a.useSchedule} onChange={(v) => set({ useSchedule: v })} />
          <SwitchRow title="My course progress" checked={a.useProgress} onChange={(v) => set({ useProgress: v })} />
          <SwitchRow title="Google Calendar events" description="Read-only — StudentOS never edits your other events" checked={a.useCalendar} onChange={(v) => set({ useCalendar: v })} />
        </div>
      </Panel>
    </>
  );
}

/* ---------- Account & privacy ---------- */
function AccountTab() {
  const router = useRouter();
  const { state, actions } = useStore();
  const [confirm, setConfirm] = useState<null | "reset" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify({ profile: state.profile, goals: state.goals, sessions: state.sessions, prefs: state.prefs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studentos-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const resetPassword = async () => {
    const res = await sendPasswordReset(state.profile.email);
    actions.toast(res.ok ? `Reset link sent to ${state.profile.email}` : authErrorText[res.code].title);
  };
  const confirmAction = async () => {
    if (confirm === "reset") {
      actions.restartPlan();
      setConfirm(null);
      router.push("/onboarding");
      return;
    }
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (res.ok) {
      setConfirm(null);
      router.push("/signup");
    } else {
      setError(res.code);
    }
  };

  return (
    <>
      <Panel title="Sign-in">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-white">Email</p>
              <p className="text-[11.5px] text-white/50">{state.profile.email}</p>
            </div>
            <Button size="sm" onClick={resetPassword}>
              Change password
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
            <div>
              <p className="text-[13px] font-medium text-white">Log out</p>
              <p className="text-[11.5px] text-white/50">Sign out of StudentOS on this device</p>
            </div>
            <Button size="sm" onClick={() => logOut().then(() => router.push("/login"))}>
              Log out
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title="Your data" sub="Your plan, sessions and notes belong to you.">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-white">Download my data</p>
              <p className="text-[11.5px] text-white/50">A copy of your profile, goals and sessions as JSON</p>
            </div>
            <Button size="sm" onClick={download}>
              Download
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
            <div>
              <p className="text-[13px] font-medium text-white">Start my plan over</p>
              <p className="text-[11.5px] text-white/50">Removes your current plan and runs setup again</p>
            </div>
            <Button size="sm" onClick={() => setConfirm("reset")}>
              Start over
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
            <div>
              <p className="text-[13px] font-medium text-rose-300">Delete account</p>
              <p className="text-[11.5px] text-white/50">Removes your plan, notes, chats, materials and certificates permanently</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => (setError(null), setConfirm("delete"))}>
              Delete account
            </Button>
          </div>
          <p className="border-t border-white/[0.07] pt-3 text-[11.5px] text-white/50">
            How we use your data: <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> · <Link href="/terms" className="text-accent hover:underline">Terms and Conditions</Link>
          </p>
        </div>
      </Panel>
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "delete" ? "Delete your account?" : "Start your plan over?"}
        actions={
          <>
            <Button size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button size="sm" variant={confirm === "delete" ? "danger" : "primary"} loading={busy} onClick={confirmAction}>
              {confirm === "delete" ? "Delete account" : "Start over"}
            </Button>
          </>
        }
      >
        {confirm === "delete" ? "This deletes your login and all your StudentOS data. It can’t be undone." : "Your current plan and its sessions will be removed. Your profile and settings stay."}
        {error && <p className="mt-3 text-rose-400">{authErrorText[error].title}. {authErrorText[error].body}</p>}
      </Dialog>
    </>
  );
}
