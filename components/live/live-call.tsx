"use client";

/* A 1:1 video call inside StudentOS for a live interview (recruiter ↔ student).
   Video and audio go straight between the two browsers (WebRTC, peer-to-peer); only
   the small connection messages pass through /api/partner. Nothing is recorded.
   Public STUN servers find a route; on very strict networks a call may not connect,
   and the page says so. The recruiter's browser starts the call ("host"); the
   student's answers ("guest"). Either can refresh and the call reconnects.
   The call only runs in the booked slot: before it the page waits and joins by
   itself at the start time; when the time is over it ends for both sides. */

import { useCallback, useEffect, useRef, useState } from "react";
import { partnerApi, type LiveSide, type LiveSignal } from "@/lib/partner";
import { slotState } from "@/lib/live-slot";
import { cn } from "@/lib/utils";

const ICE: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export type CallState = "starting" | "waiting" | "connecting" | "connected" | "lost" | "no-camera" | "ended" | "early" | "over";

/** `signal` sends the connection messages; by default to /api/partner (company drives). */
export type Signal = (body: Record<string, unknown>) => Promise<LiveSignal>;

export function useLiveCall(pid: string, room: string, opts: { warnings?: string[]; signal?: Signal } = {}) {
  const sigRef = useRef<Signal>(opts.signal ?? ((body) => partnerApi<LiveSignal>("live-signal", body)));
  if (opts.signal) sigRef.current = opts.signal;
  const [state, setState] = useState<CallState>("starting");
  const ended = useRef(false);
  const stopRef = useRef<() => void>(() => {});
  const endAllRef = useRef<(st: CallState) => void>(() => {});
  const [info, setInfo] = useState<LiveSignal | null>(null);
  const [other, setOther] = useState<LiveSide | null>(null);
  const [err, setErr] = useState("");
  const local = useRef<HTMLVideoElement>(null);
  const remote = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const me = useRef<LiveSide>({ sdp: null, cands: [], need: 0, warnings: [] });
  const side = useRef<"host" | "guest" | null>(null);
  const added = useRef(0); // other side's candidates already added
  const applied = useRef(0); // version of the remote description in use
  const dirty = useRef(true);
  const warnRef = useRef<string[]>([]);
  warnRef.current = opts.warnings ?? [];
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  const fresh = useCallback(() => {
    pc.current?.close();
    const p = new RTCPeerConnection({ iceServers: ICE });
    stream.current?.getTracks().forEach((t) => p.addTrack(t, stream.current!));
    p.ontrack = (e) => {
      if (remote.current && remote.current.srcObject !== e.streams[0]) {
        remote.current.srcObject = e.streams[0];
        void remote.current.play().catch(() => {});
      }
    };
    p.onicecandidate = (e) => {
      if (!e.candidate) return;
      me.current.cands = [...(me.current.cands ?? []), e.candidate.toJSON()].slice(-60);
      dirty.current = true;
    };
    p.onconnectionstatechange = () => {
      const s = p.connectionState;
      if (ended.current) return;
      if (s === "connected") setState("connected");
      else if (s === "failed" || s === "disconnected") setState("lost");
    };
    pc.current = p;
    added.current = 0;
    return p;
  }, []);

  useEffect(() => {
    let dead = false;
    let timer = 0;
    stopRef.current = () => {
      dead = true;
      window.clearTimeout(timer);
    };
    const tick = async () => {
      if (dead) return;
      try {
        const body: Record<string, unknown> = { pid, room };
        if (dirty.current || (side.current === "guest" && warnRef.current.length !== (me.current.warnings?.length ?? 0))) {
          me.current.warnings = warnRef.current;
          body.put = me.current;
          dirty.current = false;
        }
        const r = await sigRef.current(body);
        if (dead) return;
        setInfo(r);
        if (r.closed) {
          // the booked time is over: the call ends for both sides
          endAll(r.closed === "over" ? "over" : "early");
          return;
        }
        setOther(r.other);
        side.current = r.side;
        const o = r.other;
        const p = pc.current!;
        if (r.side === "host") {
          // the student (re)joined after our offer: start again with a new offer
          if (o?.need && o.need > (me.current.sdp?.v ?? 0)) {
            const np = fresh();
            const offer = await np.createOffer();
            await np.setLocalDescription(offer);
            me.current = { ...me.current, sdp: { type: "offer", sdp: offer.sdp!, v: Date.now() }, cands: [] };
            applied.current = 0;
            dirty.current = true;
            setState("connecting");
          } else if (o?.sdp?.type === "answer" && o.sdp.v === me.current.sdp?.v && applied.current !== o.sdp.v) {
            await p.setRemoteDescription({ type: "answer", sdp: o.sdp.sdp });
            applied.current = o.sdp.v;
          }
        } else if (o?.sdp?.type === "offer" && applied.current !== o.sdp.v) {
          const np = applied.current ? fresh() : p;
          await np.setRemoteDescription({ type: "offer", sdp: o.sdp.sdp });
          const ans = await np.createAnswer();
          await np.setLocalDescription(ans);
          applied.current = o.sdp.v;
          me.current = { ...me.current, sdp: { type: "answer", sdp: ans.sdp!, v: o.sdp.v }, cands: [] };
          dirty.current = true;
          setState("connecting");
        }
        if (o && !o.sdp) setState((s) => (s === "connected" ? s : "waiting"));
        // the other side's network candidates, once their description is in
        const cur = pc.current!;
        if (cur.remoteDescription && o?.cands?.length) {
          for (const c of o.cands.slice(added.current)) await cur.addIceCandidate(c).catch(() => {});
          added.current = o.cands.length;
        }
        if (!o) setState((s) => (s === "connected" ? s : "waiting"));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "failed");
      }
      // fast while connecting; slow once the call is up (saves server reads)
      const up = pc.current?.connectionState === "connected";
      timer = window.setTimeout(() => void tick(), up ? 8000 : 1200);
    };

    const endAll = (st: CallState) => {
      ended.current = true;
      dead = true;
      window.clearTimeout(timer);
      pc.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
      setState(st);
    };
    endAllRef.current = endAll;
    // first ask where the slot is: the camera only starts once it's open
    const peek = async () => {
      if (dead) return;
      try {
        const r = await sigRef.current({ pid, room });
        if (dead) return;
        setInfo(r);
        if (r.closed === "over") return setState("over");
        if (r.closed === "early") {
          setState("early");
          const wait = r.meta.at - (r.now ?? Date.now());
          timer = window.setTimeout(() => void peek(), Math.min(Math.max(wait + 500, 1000), 20000));
          return;
        }
        start();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "failed");
        timer = window.setTimeout(() => void peek(), 5000);
      }
    };
    const start = () => navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } })
      .then(async (st) => {
        if (dead) return st.getTracks().forEach((t) => t.stop());
        stream.current = st;
        if (local.current) {
          local.current.srcObject = st;
          void local.current.play().catch(() => {});
        }
        const p = fresh();
        // first contact decides our side; the host makes the offer, the guest asks for one
        const r = await sigRef.current({ pid, room });
        side.current = r.side;
        setInfo(r);
        if (r.side === "host") {
          const offer = await p.createOffer();
          await p.setLocalDescription(offer);
          me.current = { sdp: { type: "offer", sdp: offer.sdp!, v: Date.now() }, cands: [], need: 0 };
        } else {
          me.current = { sdp: null, cands: [], need: Date.now(), warnings: [] };
        }
        dirty.current = true;
        setState("waiting");
        void tick();
      })
      .catch((e) => {
        if (e?.name === "NotAllowedError" || e?.name === "NotFoundError") setState("no-camera");
        else setErr(e instanceof Error ? e.message : "failed");
      });
    void peek();
    return () => {
      dead = true;
      window.clearTimeout(timer);
      pc.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [pid, room, fresh]);

  const toggleMic = () => {
    const on = !mic;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    setMic(on);
  };
  const toggleCam = () => {
    const on = !cam;
    stream.current?.getVideoTracks().forEach((t) => (t.enabled = on));
    setCam(on);
  };
  /** ends the call on this side: stops polling, camera and mic */
  const hangUp = () => {
    ended.current = true;
    stopRef.current();
    pc.current?.close();
    stream.current?.getTracks().forEach((t) => t.stop());
    setState("ended");
  };
  return { state, info, other, err, local, remote, mic, cam, toggleMic, toggleCam, hangUp };
}

export function CallStage({ call, otherName, className, onEnd }: { call: ReturnType<typeof useLiveCall>; otherName: string; className?: string; onEnd?: () => void }) {
  const msg: Record<CallState, string> = {
    starting: "Starting your camera…",
    waiting: `Waiting for ${otherName} to join…`,
    connecting: "Connecting…",
    connected: "",
    lost: "The call dropped. It reconnects when both of you are on this page; refresh if it doesn’t.",
    "no-camera": "Allow camera and microphone for this site, then refresh.",
    ended: "You ended the call. Camera and mic are off.",
    early: "",
    over: "The interview time is over. The call has ended and camera and mic are off.",
  };
  const m = call.info?.meta;
  // outside the slot there's no camera and nothing to control
  const off = call.state === "early" || call.state === "over";
  const at = m ? new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
  if (m) msg.early = `The interview opens at ${at} and runs ${m.minutes} minutes. This page connects by itself at that time; keep it open.`;
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07070a]", className)}>
      <video ref={call.remote} playsInline autoPlay aria-label={`${otherName}’s video`} className="h-full w-full object-cover" />
      {call.state !== "connected" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {!["lost", "no-camera", "ended", "early", "over"].includes(call.state) && <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-accent" />}
          <p className="max-w-[360px] text-[14px] text-white/70">{msg[call.state]}</p>
          {call.state === "ended" && m && !slotState(m.at, m.minutes) && <button type="button" onClick={() => window.location.reload()} className="h-9 rounded-lg border border-white/15 px-4 text-[13px] text-white hover:border-white/35">Rejoin</button>}
        </div>
      )}
      <video ref={call.local} muted playsInline autoPlay aria-label="Your video" className={cn("absolute right-3 bottom-3 aspect-video w-[24%] min-w-[140px] rounded-xl border border-white/15 bg-black object-cover -scale-x-100 shadow-xl", off && "hidden")} />
      <div className={cn("absolute bottom-3 left-3 flex gap-2", off && "hidden")}>
        {!["ended", "over", "early"].includes(call.state) && (
          <button type="button" onClick={() => (onEnd ? onEnd() : window.confirm("End the interview for you? Your camera and mic turn off.") && call.hangUp())} className="h-10 rounded-xl bg-rose-600 px-3.5 text-[12.5px] font-semibold text-[#ffffff] hover:bg-rose-500">End interview</button>
        )}
        <button type="button" onClick={call.toggleMic} className={cn("h-10 rounded-xl px-3.5 text-[12.5px] font-medium backdrop-blur", call.mic ? "bg-white/15 text-white" : "bg-rose-500/80 text-white")}>{call.mic ? "Mute" : "Unmute"}</button>
        <button type="button" onClick={call.toggleCam} className={cn("h-10 rounded-xl px-3.5 text-[12.5px] font-medium backdrop-blur", call.cam ? "bg-white/15 text-white" : "bg-rose-500/80 text-white")}>{call.cam ? "Camera off" : "Camera on"}</button>
      </div>
      {call.state === "connected" && m && <TimeLeft end={m.at + m.minutes * 60_000} />}
      {call.state === "connected" && <span className="absolute top-3 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-[12px] text-white"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />{otherName}</span>}
    </div>
  );
}

/** minutes left in the slot; turns amber in the last 5 */
function TimeLeft({ end }: { end: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, []);
  const mins = Math.max(0, Math.ceil((end - now) / 60000));
  return <span className={cn("absolute top-3 right-3 rounded-lg px-2.5 py-1 text-[12px] font-medium", mins <= 5 ? "bg-amber-500/85 text-black" : "bg-black/55 text-white")}>{mins} min left</span>;
}
