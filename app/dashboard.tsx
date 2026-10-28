"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  LayoutDashboard,
  DoorOpen,
  Target,
  CalendarDays,
  BarChart3,
  Trophy,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Check,
  CheckCheck,
  Clock,
  Flame,
  Users,
  Link as LinkIcon,
  ExternalLink,
  BookOpen,
  Code2,
  Cloud,
  Terminal,
  Lock,
  Settings,
  LogOut,
  Heart,
  MessageCircle,
  Send,
  X,
  Copy,
  CheckCircle2,
  Timer,
  Lightbulb,
  RefreshCw,
  Menu,
  ShieldCheck,
  Flag,
  GitBranch,
  Sparkles,
  Info,
  Headphones,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createDemo, emptyWorkspace, Workspace, Row } from "./data";
import { authClient } from "../lib/auth-client";
type View =
  | "home"
  | "rooms"
  | "goals"
  | "calendar"
  | "stats"
  | "leaderboard"
  | "notifications"
  | "vision"
  | "room";
type Modal = (Row & { type: string }) | null;
type Focus = {
  roomId: string;
  resourceId: string;
  duration: number;
  elapsed: number;
  startedAt: number | null;
  id: string;
  mode: string;
};
const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
const dayKey = (d: string | Date) => new Date(d).toLocaleDateString("en-CA");
const mins = (sec: number) => {
  const m = Math.round(sec / 60);
  return m >= 60
    ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`
    : `${m} min`;
};
const dateLabel = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const dateTime = (d: string) =>
  new Date(d).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const weekStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};
const validLink = (v: string) => {
  try {
    return ["https:", "http:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
function Avatar({
  name,
  size = 32,
  index = 0,
}: {
  name: string;
  size?: number;
  index?: number;
}) {
  return (
    <span
      className={`avatar av${index % 5}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      title={name}
    >
      {name
        .split(/[ @.-]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <i />
        <i />
        <i />
        <i />
      </span>
      happen<span className="brand-dot">.</span>
    </div>
  );
}
function Progress({
  value,
  color = "green",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div
      className={`progress ${color}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sparkles size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<Workspace | null>(null);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [view, setView] = useState<View>("home");
  const [roomId, setRoomId] = useState("cloud");
  const [roomTab, setRoomTab] = useState("resources");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("steps");
  const [mobile, setMobile] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const loadLive = useCallback(
    async (showError = true) => {
      try {
        const r = await fetch("/api/workspace", { cache: "no-store" });
        if (r.status === 401) {
          setAuthed(false);
          setData({ ...emptyWorkspace });
          return false;
        }
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
        setAuthed(true);
        return true;
      } catch (e) {
        if (showError)
          notify((e as Error).message || "Connexion indisponible.");
        return false;
      }
    },
    [notify],
  );
  const modalType = modal?.type;
  const reminderBucket = Math.floor(tick / 30000);
  const plans = data?.plans;
  // Initialize browser-owned demo storage after hydration.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let d = createDemo();
      try {
        const saved = localStorage.getItem("happen-demo-v1");
        if (saved) d = JSON.parse(saved);
        const f = localStorage.getItem("happen-focus-v1");
        if (f) setFocus(JSON.parse(f));
      } catch {}
      setData(d);
      setHydrated(true);
      if (
        localStorage.getItem("happen-mode") === "live" ||
        new URLSearchParams(window.location.search).get("space") === "live"
      ) {
        setMode("live");
        setData({ ...emptyWorkspace });
        loadLive();
      }
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (invite) {
        setMode("live");
        setData({ ...emptyWorkspace });
        loadLive().then(() => setModal({ type: "join", invite }));
      }
    });
    return () => {
      active = false;
    };
  }, [loadLive]);
  useEffect(() => {
    if (hydrated && data && mode === "demo")
      localStorage.setItem("happen-demo-v1", JSON.stringify(data));
  }, [data, mode, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (focus) localStorage.setItem("happen-focus-v1", JSON.stringify(focus));
    else localStorage.removeItem("happen-focus-v1");
  }, [focus, hydrated]);
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!modalType) return;
    dialogRef.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [modalType]);
  useEffect(() => {
    if (mode !== "live") return;
    const t = setInterval(() => {
      if (!document.hidden) loadLive(false);
    }, 45000);
    return () => clearInterval(t);
  }, [mode, loadLive]);
  useEffect(() => {
    if (!plans) return;
    const upcoming = plans.find((p) => {
      const n = new Date(p.starts_at).getTime() - Date.now();
      return n > 0 && n < 300000 && !sessionStorage.getItem("remind-" + p.id);
    });
    if (upcoming) {
      sessionStorage.setItem("remind-" + upcoming.id, "1");
      queueMicrotask(() => notify(`Dans moins de 5 min : ${upcoming.title}`));
    }
  }, [reminderBucket, plans, notify]);
  async function changeMode(next: "demo" | "live") {
    if (focus) {
      notify("Termine ta session avant de changer d’espace.");
      return;
    }
    setModal(null);
    setView("home");
    setFilter("all");
    setQuery("");
    setMode(next);
    localStorage.setItem("happen-mode", next);
    if (next === "live") {
      setAuthed(false);
      setData({ ...emptyWorkspace });
      await loadLive();
    } else {
      try {
        const d = localStorage.getItem("happen-demo-v1");
        setData(d ? JSON.parse(d) : createDemo());
      } catch {
        setData(createDemo());
      }
    }
  }
  function go(v: View) {
    setView(v);
    setMobile(false);
    setFilter("all");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openRoom(id: string) {
    setRoomId(id);
    setRoomTab("resources");
    go("room");
  }
  function open(m: Modal) {
    setError("");
    setModal(m);
  }
  const close = () => {
    if (!busy) {
      setModal(null);
      setError("");
    }
  };
  async function mutate(payload: Row, success?: string): Promise<Row | null> {
    setBusy(true);
    setError("");
    try {
      if (mode === "live") {
        const r = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const res = await r.json();
        if (!r.ok) throw Error(res.error);
        await loadLive();
        if (success) notify(success);
        return res;
      }
      const d = JSON.parse(JSON.stringify(data)) as Workspace;
      const id = newId();
      const now = new Date().toISOString();
      const uid = d.user.id;
      switch (payload.action) {
        case "profile":
          d.user.name = payload.name;
          d.members = d.members.map((m) =>
            m.user_id === uid ? { ...m, name: payload.name } : m,
          );
          break;
        case "createRoom":
          d.rooms.unshift({
            id,
            name: payload.name,
            description: payload.description,
            topic: payload.topic,
            color: payload.color,
            invite: "demo-" + id,
            owner: uid,
            created_at: now,
          });
          d.members.push({
            room_id: id,
            user_id: uid,
            name: d.user.name,
            joined_at: now,
          });
          break;
        case "addResource":
          d.resources.push({
            id,
            room_id: payload.roomId,
            title: payload.title,
            url: payload.url,
            kind: payload.kind,
            modules: payload.modules,
            due_date: payload.dueDate,
            created_by: uid,
          });
          break;
        case "toggleModule":
          d.completions = d.completions.filter(
            (c) =>
              !(
                c.resource_id === payload.resourceId &&
                c.user_id === uid &&
                c.module_index === payload.index
              ),
          );
          if (payload.completed)
            d.completions.push({
              resource_id: payload.resourceId,
              user_id: uid,
              module_index: payload.index,
              created_at: now,
            });
          break;
        case "checkin":
          d.checkins.unshift({
            id,
            room_id: payload.roomId,
            user_id: uid,
            name: d.user.name,
            resource_id: payload.resourceId,
            text: payload.text,
            link: payload.link,
            created_at: now,
            approved_by: null,
          });
          break;
        case "session":
          if (!d.sessions.some((s) => s.id === payload.sessionId))
            d.sessions.unshift({
              id: payload.sessionId,
              room_id: payload.roomId,
              user_id: uid,
              resource_id: payload.resourceId,
              seconds: payload.seconds,
              created_at: now,
            });
          break;
        case "react":
          if (
            d.reactions.some(
              (r) => r.checkin_id === payload.checkinId && r.user_id === uid,
            )
          )
            d.reactions = d.reactions.filter(
              (r) => !(r.checkin_id === payload.checkinId && r.user_id === uid),
            );
          else
            d.reactions.push({ checkin_id: payload.checkinId, user_id: uid });
          break;
        case "approve": {
          const p = d.checkins.find((p) => p.id === payload.checkinId);
          if (p && p.user_id !== uid && p.link) p.approved_by = uid;
          else throw Error("Seul un autre membre peut valider une preuve.");
          break;
        }
        case "addPlan":
          d.plans.push({
            id,
            room_id: payload.roomId,
            user_id: uid,
            title: payload.title,
            starts_at: payload.startsAt,
            minutes: payload.minutes,
          });
          d.plans.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          break;
        case "joinRoom":
          throw Error("Les invitations fonctionnent dans ton espace réel.");
      }
      setData(d);
      if (success) notify(success);
      return { ok: true, id };
    } catch (e) {
      const message = (e as Error).message || "Une erreur est survenue.";
      setError(message);
      notify(message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function calendarURL(p: Row) {
    return (
      "/api/calendar?" +
      new URLSearchParams({
        id: p.id,
        title: p.title,
        start: p.starts_at,
        minutes: String(p.minutes),
        demo: String(mode === "demo"),
      }).toString()
    );
  }
  async function finishFocus() {
    if (!focus) return;
    const elapsed =
      focus.elapsed +
      (focus.startedAt
        ? Math.max(0, (Date.now() - focus.startedAt) / 1000)
        : 0);
    if (elapsed < 1) {
      notify("Ta session vient de commencer.");
      return;
    }
    const res = await mutate(
      {
        action: "session",
        roomId: focus.roomId,
        resourceId: focus.resourceId,
        seconds: Math.min(Math.round(elapsed), focus.duration * 60),
        sessionId: focus.id,
      },
      "Session enregistrée. Partage maintenant ton avancée !",
    );
    if (res) {
      const f = focus;
      setFocus(null);
      open({ type: "checkin", roomId: f.roomId, resourceId: f.resourceId });
    }
  }
  if (!data)
    return (
      <div className="loading">
        <Brand />
        <p>Ton prochain niveau t’attend.</p>
        <span />
      </div>
    );
  const uid = data.user.id;
  const userName = data.user.name || "toi";
  const mySessions = data.sessions.filter((s) => s.user_id === uid);
  const myCompletions = data.completions.filter((c) => c.user_id === uid);
  const weekSeconds = mySessions
    .filter((s) => new Date(s.created_at).getTime() >= weekStart())
    .reduce((a, s) => a + s.seconds, 0);
  const weeklySteps = myCompletions.filter(
    (s) => new Date(s.created_at).getTime() >= weekStart(),
  ).length;
  const room = data.rooms.find((r) => r.id === roomId);
  const selectedResources = data.resources.filter((r) => r.room_id === roomId);
  const members = data.members.filter((m) => m.room_id === roomId);
  const uniqueMembers = [
    ...new Map(data.members.map((m) => [m.user_id, m])).values(),
  ];
  const trendValues = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return mySessions
      .filter((s) => dayKey(s.created_at) === dayKey(d))
      .reduce((a, s) => a + s.seconds, 0);
  });
  const trendMax = Math.max(1, ...trendValues);
  const trendPath = trendValues
    .map(
      (v, i) => `${i ? "L" : "M"}${(i * 100) / 6} ${27 - (v / trendMax) * 24}`,
    )
    .join(" ");
  const completed = (r: Row, u = uid) =>
    data.completions.filter((c) => c.resource_id === r.id && c.user_id === u)
      .length;
  const percent = (r: Row, u = uid) =>
    Math.round((completed(r, u) / r.modules.length) * 100);
  const activeResources = data.resources.filter((r) => percent(r) < 100);
  const nextResource = activeResources[0];
  const modalResource = data.resources.find(
    (resource) => resource.id === modal?.resourceId,
  );
  const today = dayKey(new Date());
  const daySet = new Set(
    [...mySessions, ...myCompletions].map((s) => dayKey(s.created_at)),
  );
  let streak = 0;
  const sd = new Date();
  if (!daySet.has(dayKey(sd))) sd.setDate(sd.getDate() - 1);
  for (let i = 0; i < 365 && daySet.has(dayKey(sd)); i++) {
    streak++;
    sd.setDate(sd.getDate() - 1);
  }
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart() + i * 86400000);
    return {
      key: dayKey(d),
      label: ["L", "M", "M", "J", "V", "S", "D"][i],
      active: daySet.has(dayKey(d)),
      today: dayKey(d) === today,
    };
  });
  const upcoming = data.plans.filter(
    (p) => new Date(p.starts_at).getTime() + p.minutes * 60000 >= tick,
  );
  const pending = data.checkins.filter(
    (p) => p.user_id !== uid && p.link && !p.approved_by,
  );
  const titles: Record<View, string> = {
    home: "Vue d’ensemble",
    rooms: "Mes rooms",
    goals: "Mes objectifs",
    calendar: "Mon planning",
    stats: "Ma progression",
    leaderboard: "Le classement",
    notifications: "Notifications",
    vision: "La vision",
    room: room?.name || "Ma room",
  };
  const nav = [
    { id: "home", label: "Vue d’ensemble", icon: LayoutDashboard },
    {
      id: "rooms",
      label: "Mes rooms",
      icon: DoorOpen,
      count: data.rooms.length,
    },
    { id: "goals", label: "Mes objectifs", icon: Target },
    { id: "calendar", label: "Mon planning", icon: CalendarDays },
    { id: "stats", label: "Ma progression", icon: BarChart3 },
    { id: "leaderboard", label: "Classement", icon: Trophy },
  ];
  const focusElapsed = focus
    ? Math.min(
        focus.duration * 60,
        focus.elapsed +
          (focus.startedAt ? Math.max(0, (tick - focus.startedAt) / 1000) : 0),
      )
    : 0;
  const remaining = focus
    ? Math.max(0, Math.ceil(focus.duration * 60 - focusElapsed))
    : 0;
  const focusReady = !!focus && remaining === 0;
  function roomCard(r: Row) {
    const ms = data!.members.filter((m) => m.room_id === r.id);
    const rs = data!.resources.filter((t) => t.room_id === r.id);
    const pc = rs.length
      ? Math.round(rs.reduce((a, t) => a + percent(t), 0) / rs.length)
      : 0;
    return (
      <button
        className={`room-card ${r.color}`}
        key={r.id}
        onClick={() => openRoom(r.id)}
      >
        <div className="room-art">
          <div className="art-grid" />
          <span className="room-symbol">
            {r.color === "blue" ? (
              <Cloud />
            ) : r.color === "violet" ? (
              <Code2 />
            ) : (
              <GitBranch />
            )}
          </span>
          <span className="art-tag">
            <Lock size={10} /> ROOM PRIVÉE
          </span>
          <span className="art-terminal">
            {r.color === "blue"
              ? "$ build. deploy. repeat."
              : r.color === "violet"
                ? "<learn_together />"
                : 'git commit -m "progress"'}
            <i />
          </span>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
        </div>
        <div className="room-card-body">
          <div className="row-between">
            <h3>{r.name}</h3>
            <ArrowUpRight size={19} />
          </div>
          <p>{r.description}</p>
          <div className="room-card-members">
            <div className="avatar-stack">
              {ms.slice(0, 4).map((m, i) => (
                <Avatar
                  key={m.user_id}
                  name={m.name || "Membre"}
                  size={25}
                  index={i}
                />
              ))}
            </div>
            <span>
              {ms.length} membre{ms.length > 1 ? "s" : ""}
            </span>
            <span className="room-goals">
              {rs.length} objectif{rs.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="row-between progress-caption">
            <span>Ta progression</span>
            <strong>{pc}%</strong>
          </div>
          <Progress value={pc} color={r.color} />
        </div>
      </button>
    );
  }
  function resourceCard(r: Row, compact = false) {
    const pc = percent(r);
    const rr = data!.rooms.find((x) => x.id === r.room_id);
    return (
      <article
        className={`resource-card ${compact ? "compact" : ""}`}
        key={r.id}
      >
        <div className={`resource-icon ${rr?.color || "green"}`}>
          {r.kind === "Playlist" ? <Play size={21} /> : <BookOpen size={21} />}
        </div>
        <div className="resource-main">
          <div className="eyebrow">
            {r.kind} <span>·</span> {rr?.name}
          </div>
          <button
            className="text-button resource-title"
            onClick={() => open({ type: "resource", resourceId: r.id })}
          >
            {r.title}
          </button>
          <div className="row-between progress-caption">
            <span>
              {completed(r)} / {r.modules.length} étapes terminées
            </span>
            <strong>{pc}%</strong>
          </div>
          <Progress value={pc} color={rr?.color} />
        </div>
        <button
          className={`btn ${pc === 100 ? "subtle" : "secondary"} small`}
          onClick={() => open({ type: "resource", resourceId: r.id })}
        >
          {pc === 100 ? (
            <>
              <Check size={14} />
              Terminé
            </>
          ) : (
            <>
              Reprendre <ArrowRight size={14} />
            </>
          )}
        </button>
      </article>
    );
  }
  function feed(posts: Row[]) {
    return posts.length ? (
      posts.map((post) => {
        const rr = data!.rooms.find((r) => r.id === post.room_id);
        const rs = data!.resources.find((r) => r.id === post.resource_id);
        const likes = data!.reactions.filter((r) => r.checkin_id === post.id);
        const liked = likes.some((r) => r.user_id === uid);
        return (
          <article className="post" key={post.id}>
            <div className="post-header">
              <Avatar
                name={post.name || "Membre"}
                index={uniqueMembers.findIndex(
                  (m) => m.user_id === post.user_id,
                )}
              />
              <div>
                <strong>
                  {post.name || "Membre"}{" "}
                  {post.user_id === uid && <span className="muted">(toi)</span>}
                </strong>
                <p>
                  {rr?.name} <span>·</span>{" "}
                  {dayKey(post.created_at) === today
                    ? "Aujourd’hui"
                    : dateLabel(post.created_at)}
                </p>
              </div>
              <span className={`tag ${post.approved_by ? "green" : "neutral"}`}>
                {post.approved_by ? (
                  <>
                    <ShieldCheck size={12} />
                    Validé par un pair
                  </>
                ) : (
                  <>
                    <Flag size={11} />
                    Check-in
                  </>
                )}
              </span>
            </div>
            <p className="post-text">{post.text}</p>
            {rs && (
              <div className="post-resource">
                <BookOpen size={13} />
                {rs.title}
              </div>
            )}
            {post.link && (
              <a
                className="proof-link"
                href={post.link}
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon size={14} /> Voir la preuve <ExternalLink size={12} />
              </a>
            )}
            <div className="post-actions">
              <button
                className={liked ? "liked" : ""}
                onClick={() =>
                  mutate({
                    action: "react",
                    roomId: post.room_id,
                    checkinId: post.id,
                  })
                }
                disabled={busy}
              >
                <Heart size={15} fill={liked ? "currentColor" : "none"} />
                {likes.length || ""} Encourager
              </button>
              {post.user_id !== uid && post.link && !post.approved_by && (
                <button onClick={() => open({ type: "approve", post })}>
                  <CheckCheck size={15} />
                  Examiner la preuve
                </button>
              )}
              <button
                className="reply-button"
                onClick={() =>
                  open({
                    type: "checkin",
                    roomId: post.room_id,
                    text: `@${post.name} `,
                  })
                }
              >
                <MessageCircle size={15} />
                Répondre
              </button>
            </div>
          </article>
        );
      })
    ) : (
      <Empty
        title="Vos prochaines victoires seront ici."
        description="Partage une étape terminée, un blocage ou une preuve de ce que tu as appris."
        action={
          <button
            className="btn secondary"
            onClick={() => open({ type: "checkin", roomId })}
          >
            Faire un check-in
          </button>
        }
      />
    );
  }
  function leaderboard(full = false) {
    const rows = uniqueMembers
      .map((m): Row => ({
        ...m,
        steps: data!.completions.filter(
          (c) =>
            c.user_id === m.user_id &&
            new Date(c.created_at).getTime() >= weekStart(),
        ).length,
        proofs: data!.checkins.filter(
          (c) =>
            c.user_id === m.user_id &&
            c.approved_by &&
            new Date(c.created_at).getTime() >= weekStart(),
        ).length,
        seconds: data!.sessions
          .filter(
            (s) =>
              s.user_id === m.user_id &&
              new Date(s.created_at).getTime() >= weekStart(),
          )
          .reduce((a, s) => a + s.seconds, 0),
      }))
      .sort((a, b) =>
        sort === "proofs"
          ? b.proofs - a.proofs || b.steps - a.steps
          : b.steps - a.steps || b.proofs - a.proofs,
      );
    return (
      <section className="panel leaderboard">
        <div className="panel-title">
          <div>
            <h3>
              {full ? "On se tire vers le haut." : "La régularité gagne."}
            </h3>
            <p>Cette semaine · dans tes rooms</p>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Trier le classement"
          >
            <option value="steps">Étapes terminées</option>
            <option value="proofs">Preuves validées</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Membre</th>
                <th>Étapes</th>
                <th>Preuves validées</th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, full ? 100 : 5).map((m, i) => (
                <tr key={m.user_id} className={m.user_id === uid ? "you" : ""}>
                  <td>
                    <span className={i < 3 ? "rank rank" + i : ""}>
                      {i === 0 ? <Trophy size={15} /> : i + 1}
                    </span>
                  </td>
                  <td>
                    <Avatar name={m.name || "Membre"} index={i} size={27} />
                    <strong>{m.name || "Membre"}</strong>
                    {m.user_id === uid && <span className="you-tag">toi</span>}
                  </td>
                  <td>{m.steps}</td>
                  <td>{m.proofs}</td>
                  <td>{mins(m.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="table-empty">
              Le classement apparaîtra avec les premiers membres de ta room.
            </p>
          )}
        </div>
      </section>
    );
  }
  function planItem(p: Row) {
    const rr = data!.rooms.find((r) => r.id === p.room_id);
    return (
      <div className="plan-item" key={p.id}>
        <div className={`plan-date ${rr?.color}`}>
          <span>
            {new Date(p.starts_at)
              .toLocaleDateString("fr-FR", { month: "short" })
              .replace(".", "")}
          </span>
          <strong>{new Date(p.starts_at).getDate()}</strong>
        </div>
        <div className="plan-info">
          <strong>{p.title}</strong>
          <p>
            {new Date(p.starts_at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            <span>·</span> {p.minutes} min <span>·</span> {rr?.name}
          </p>
        </div>
        <a
          className="icon-button"
          title="Ajouter au calendrier avec un rappel"
          aria-label={`Rappel pour ${p.title}`}
          href={calendarURL(p)}
          download="happen-session.ics"
        >
          <Bell size={16} />
        </a>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-only icon-button"
            onClick={() => setMobile(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="workspace-switch"
          onClick={() => open({ type: "mode" })}
        >
          <span className="workspace-icon">
            <Users size={16} />
          </span>
          <span>
            <strong>Le crew de {userName.split(" ")[0]}</strong>
            <small>
              {mode === "demo" ? "Espace de démonstration" : "Espace personnel"}
            </small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">TON ESPACE</div>
        <nav aria-label="Navigation principale">
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => go(n.id as View)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.count !== undefined && <small>{n.count}</small>}
            </button>
          ))}
        </nav>
        <div className="nav-label rooms-label">
          TES ROOMS
          <button
            aria-label="Créer une room"
            onClick={() => open({ type: "createRoom" })}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="sidebar-rooms">
          {data.rooms.map((r) => (
            <button
              key={r.id}
              className={view === "room" && roomId === r.id ? "selected" : ""}
              onClick={() => openRoom(r.id)}
            >
              <span className={`room-dot ${r.color}`} />
              {r.name}
              <Lock size={11} />
            </button>
          ))}
        </div>
        <button
          className="focus-button"
          onClick={() =>
            open({
              type: "focus",
              roomId: data.rooms[0]?.id,
              resourceId: nextResource?.id,
            })
          }
        >
          <Play size={15} fill="currentColor" />
          Lancer un focus<span>↗</span>
        </button>
        <div className="sidebar-bottom">
          <button className="vision-link" onClick={() => go("vision")}>
            <Lightbulb size={16} />
            Pourquoi Happen ?<ArrowUpRight size={13} />
          </button>
          <div className="sidebar-note">
            <span className="tiny-dot" />
            Un petit pas. Tous les jours.
          </div>
          <button className="profile" onClick={() => open({ type: "profile" })}>
            <Avatar name={userName} size={35} />
            <span>
              <strong>{userName}</strong>
              <small>
                {mode === "demo" ? "Profil de démonstration" : "Ton profil"}
              </small>
            </span>
            <Settings size={15} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-shade"
          aria-label="Fermer la navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-only icon-button"
              aria-label="Ouvrir le menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Mon espace</span>
            <ChevronRight size={13} />
            <strong>{titles[view]}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className={`mode-badge ${mode}`}
              onClick={() => open({ type: "mode" })}
            >
              <span />
              {mode === "demo" ? "Démo interactive" : "Mon espace"}
              <ChevronDown size={12} />
            </button>
            <button
              className="icon-button search-trigger"
              aria-label="Rechercher une room ou un objectif"
              onClick={() => open({ type: "search" })}
            >
              <Search size={18} />
            </button>
            <button
              className={`icon-button ${view === "notifications" ? "selected" : ""}`}
              aria-label="Voir les notifications"
              onClick={() => go("notifications")}
            >
              <Bell size={18} />
              {pending.length > 0 && <i className="notification-dot" />}
            </button>
            <span className="topbar-divider" />
            <Avatar name={userName} size={29} />
          </div>
        </header>
        <main className="content">
          {mode === "live" && !authed ? (
            <div className="signin-panel">
              <span className="eyebrow">TON NOUVEAU POINT DE DÉPART</span>
              <h1>
                Prêts à progresser
                <br />
                pour de vrai ?
              </h1>
              <p>
                Connecte-toi pour créer tes rooms et retrouver ta progression
                sur tous tes appareils.
              </p>
              <a className="btn primary" href="/sign-in">
                Me connecter à Happen <ArrowRight size={16} />
              </a>
              <button
                className="text-button"
                onClick={() => changeMode("demo")}
              >
                Explorer la démo d’abord
              </button>
            </div>
          ) : (
            <>
              {(view === "home" || view === "rooms") && (
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {new Date().toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      <span className="heading-line" />
                    </div>
                    <h1>
                      {view === "home" ? (
                        <>
                          On avance, {userName.split(" ")[0]}{" "}
                          <span className="wave">✳</span>
                        </>
                      ) : (
                        "Ta prochaine aventure, en équipe."
                      )}
                    </h1>
                    <p>
                      {view === "home"
                        ? "Les grandes compétences se construisent avec de petites habitudes."
                        : "Des objectifs communs. Des progrès qui se voient."}
                    </p>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={() => open({ type: "createRoom" })}
                  >
                    <Plus size={16} />
                    Créer une room
                  </button>
                </div>
              )}
              {view === "home" && (
                <div className="dashboard-grid">
                  <div className="main-column">
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="hero-kicker">
                          <span />
                          LEARNING IS BETTER TOGETHER
                        </span>
                        <h2>
                          Le prochain niveau,
                          <br />
                          <em>ensemble.</em>
                        </h2>
                        <p>
                          Tes objectifs. Ton crew. Et cette fois,
                          <br />
                          vous allez jusqu’au bout.
                        </p>
                        <button
                          className="btn primary"
                          onClick={() =>
                            open({
                              type: nextResource ? "focus" : "createRoom",
                              roomId: nextResource?.room_id,
                              resourceId: nextResource?.id,
                            })
                          }
                        >
                          {nextResource ? (
                            <Play size={14} fill="currentColor" />
                          ) : (
                            <Plus size={15} />
                          )}{" "}
                          {nextResource
                            ? "C’est parti pour un focus"
                            : "Créer ma première room"}
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <div className="hero-illustration" aria-hidden="true">
                        <div className="hero-orbit o1" />
                        <div className="hero-orbit o2" />
                        <div className="hero-orbit o3" />
                        <div className="float-chip chip-code">
                          <Terminal size={18} />
                          <span>
                            just keep building
                            <span className="code-cursor">_</span>
                          </span>
                        </div>
                        <div className="hero-stack stack-back" />
                        <div className="hero-stack stack-middle" />
                        <div className="hero-stack stack-front">
                          <GitBranch size={39} />
                          <span>+1 skill unlocked</span>
                        </div>
                        <div className="float-chip chip-check">
                          <span>
                            <Check size={13} />
                          </span>
                          Un pas de plus.
                        </div>
                        <span className="hero-spark s1">✦</span>
                        <span className="hero-spark s2">+</span>
                      </div>
                    </section>
                    <div className="metrics">
                      <div>
                        <span>
                          <Clock size={14} />
                          Temps focus
                        </span>
                        <strong>{mins(weekSeconds)}</strong>
                        <small>cette semaine</small>
                        <svg viewBox="0 0 100 30">
                          <path d={trendPath} />
                        </svg>
                      </div>
                      <div>
                        <span>
                          <CheckCircle2 size={14} />
                          Étapes terminées
                        </span>
                        <strong>
                          {weeklySteps}
                          <i>étapes</i>
                        </strong>
                        <small>cette semaine</small>
                        <span className="metric-symbol">
                          <CheckCheck />
                        </span>
                      </div>
                      <div>
                        <span>
                          <Flame size={14} />
                          Ta régularité
                        </span>
                        <strong>
                          {streak}
                          <i>jour{streak > 1 ? "s" : ""}</i>
                        </strong>
                        <small>
                          {daySet.has(today)
                            ? "tu as répondu présent"
                            : "un pas aujourd’hui ?"}
                        </small>
                        <span className="metric-symbol flame">
                          <Flame />
                        </span>
                      </div>
                    </div>
                    <div className="section-heading">
                      <h2>
                        Tes rooms <span>{data.rooms.length}</span>
                      </h2>
                      <button className="text-link" onClick={() => go("rooms")}>
                        Tout voir
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                    <div className="rooms-grid">
                      {data.rooms.slice(0, 2).map(roomCard)}
                      {!data.rooms.length && (
                        <button
                          className="create-room-card"
                          onClick={() => open({ type: "createRoom" })}
                        >
                          <Plus size={25} />
                          <h3>Tout commence par une room.</h3>
                          <p>
                            Réunis tes potes autour de votre prochain objectif.
                          </p>
                        </button>
                      )}
                    </div>
                    <div className="section-heading">
                      <h2>Ton prochain pas</h2>
                      <button className="text-link" onClick={() => go("goals")}>
                        Mes objectifs
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {nextResource ? (
                      resourceCard(nextResource, true)
                    ) : (
                      <Empty
                        title="Qu’est-ce que tu veux apprendre ?"
                        description="Ajoute une formation, une playlist ou un projet et découpe-le en étapes."
                        action={
                          <button
                            className="btn secondary"
                            onClick={() =>
                              open({
                                type: data.rooms.length
                                  ? "addResource"
                                  : "createRoom",
                                roomId: data.rooms[0]?.id,
                              })
                            }
                          >
                            <Plus size={14} />
                            Ajouter un objectif
                          </button>
                        }
                      />
                    )}
                    <div className="section-heading feed-heading">
                      <div>
                        <h2>Le journal du crew</h2>
                        <p>Ce qu’on apprend. Ce qu’on construit.</p>
                      </div>
                      <button
                        className="btn secondary small"
                        onClick={() =>
                          open({ type: "checkin", roomId: data.rooms[0]?.id })
                        }
                      >
                        <Plus size={14} />
                        Mon check-in
                      </button>
                    </div>
                    <section className="panel feed">
                      {feed(data.checkins.slice(0, 3))}
                    </section>
                    {leaderboard()}
                  </div>
                  <aside className="right-column">
                    <section className="panel streak-panel">
                      <div className="row-between">
                        <span className="small-label">ON GARDE LE RYTHME</span>
                        <Flame size={17} className="orange-text" />
                      </div>
                      <div className="streak-value">
                        <strong>{streak}</strong>
                        <div>
                          jours de suite
                          <span>
                            {streak
                              ? "Continue sur ta lancée."
                              : "Ton premier jour t’attend."}
                          </span>
                        </div>
                      </div>
                      <div className="streak-days">
                        {weekDays.map((d, i) => (
                          <div key={i}>
                            <span
                              className={`${d.active ? "done" : ""} ${d.today ? "today" : ""}`}
                              title={d.key}
                            >
                              {d.active ? (
                                <Check size={15} />
                              ) : d.today ? (
                                <span className="tiny-dot" />
                              ) : (
                                "·"
                              )}
                            </span>
                            <small>{d.label}</small>
                          </div>
                        ))}
                      </div>
                      <div className="streak-footer">
                        <span className={daySet.has(today) ? "green-text" : ""}>
                          {daySet.has(today) ? (
                            <>
                              <CheckCircle2 size={13} />
                              Aujourd’hui, c’est fait.
                            </>
                          ) : (
                            <>Une session suffit à lancer la série.</>
                          )}
                        </span>
                      </div>
                    </section>
                    <section className="panel agenda-panel">
                      <div className="panel-title">
                        <h3>
                          <CalendarDays size={16} />À ton agenda
                        </h3>
                        <button
                          className="icon-button"
                          aria-label="Planifier une session"
                          onClick={() =>
                            open({ type: "addPlan", roomId: data.rooms[0]?.id })
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      {upcoming.slice(0, 2).map(planItem)}
                      {!upcoming.length && (
                        <p className="small-empty">
                          Bloque ton prochain créneau, avant que la semaine
                          file.
                        </p>
                      )}
                      <button
                        className="panel-footer-button"
                        onClick={() => go("calendar")}
                      >
                        Voir mon planning
                        <ArrowRight size={13} />
                      </button>
                    </section>
                    <section className="buddy-card">
                      <div className="buddy-top">
                        <span className="buddy-icon">
                          <Users size={18} />
                        </span>
                        <span>Ton accountability crew</span>
                      </div>
                      <h3>
                        Un petit coup
                        <br />
                        de pouce fait tout.
                      </h3>
                      <p>
                        Un blocage ? Une victoire ?<br />
                        Tes potes sont là pour ça.
                      </p>
                      <div className="buddy-people">
                        <div className="avatar-stack">
                          {uniqueMembers
                            .filter((m) => m.user_id !== uid)
                            .slice(0, 3)
                            .map((m, i) => (
                              <Avatar
                                name={m.name || "Membre"}
                                key={m.user_id}
                                index={i + 1}
                                size={33}
                              />
                            ))}
                        </div>
                        <span>
                          {uniqueMembers.length > 1
                            ? `${uniqueMembers.length - 1} mate${uniqueMembers.length > 2 ? "s" : ""} à tes côtés`
                            : "Invite ton premier mate"}
                        </span>
                      </div>
                      <button
                        className="btn secondary"
                        onClick={() =>
                          open({
                            type: uniqueMembers.length > 1 ? "buddy" : "invite",
                            roomId: data.rooms[0]?.id,
                          })
                        }
                      >
                        {uniqueMembers.length > 1
                          ? "Planifier un duo"
                          : "Inviter mes potes"}
                        <ArrowUpRight size={14} />
                      </button>
                    </section>
                    <section className="weekly-note">
                      <span>✦</span>
                      <p>
                        « Une vidéo de moins dans
                        <br />
                        ta liste. Une compétence
                        <br />
                        de plus dans ta vie. »
                      </p>
                      <small>LE MANTRA DU CREW</small>
                    </section>
                    {mode === "demo" && (
                      <button
                        className="demo-note"
                        onClick={() => open({ type: "mode" })}
                      >
                        <Info size={14} />
                        <span>
                          Membres et activités fictifs.
                          <br />
                          <strong>
                            Créer mon vrai espace
                            <ArrowUpRight size={11} />
                          </strong>
                        </span>
                      </button>
                    )}
                  </aside>
                </div>
              )}
              {view === "rooms" && (
                <>
                  <div className="filter-toolbar">
                    <div className="input-search">
                      <Search size={16} />
                      <input
                        aria-label="Rechercher mes rooms"
                        placeholder="Trouver une room…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <button
                      className="text-link"
                      onClick={() => open({ type: "join" })}
                    >
                      <LinkIcon size={14} />
                      Rejoindre avec une invitation
                    </button>
                  </div>
                  <div className="rooms-grid full">
                    {data.rooms
                      .filter((r) =>
                        r.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map(roomCard)}
                    <button
                      className="create-room-card"
                      onClick={() => open({ type: "createRoom" })}
                    >
                      <Plus size={25} />
                      <h3>La prochaine room, c’est la vôtre.</h3>
                      <p>Un nom, une envie d’apprendre et quelques potes.</p>
                    </button>
                  </div>
                </>
              )}
              {view === "room" && room && (
                <>
                  <button
                    className="text-link back-link"
                    onClick={() => go("rooms")}
                  >
                    <ArrowLeft size={14} />
                    Mes rooms
                  </button>
                  <section className={`room-detail-header ${room.color}`}>
                    <div className="room-detail-icon">
                      {room.color === "blue" ? (
                        <Cloud size={30} />
                      ) : (
                        <Code2 size={30} />
                      )}
                    </div>
                    <div>
                      <span className="eyebrow">
                        <Lock size={11} />
                        ROOM PRIVÉE · {room.topic}
                      </span>
                      <h1>{room.name}</h1>
                      <p>{room.description}</p>
                      <div className="detail-members">
                        <div className="avatar-stack">
                          {members.slice(0, 5).map((m, i) => (
                            <Avatar
                              name={m.name || "Membre"}
                              index={i}
                              key={m.user_id}
                              size={25}
                            />
                          ))}
                        </div>
                        {members.length} membre{members.length > 1 ? "s" : ""}{" "}
                        <span>·</span> {selectedResources.length} objectif
                        {selectedResources.length > 1 ? "s" : ""} commun
                        {selectedResources.length > 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      className="btn secondary"
                      onClick={() => open({ type: "invite", roomId })}
                    >
                      <Plus size={15} />
                      Inviter
                    </button>
                  </section>
                  <div
                    className="room-tabs"
                    role="tablist"
                    aria-label="Contenu de la room"
                  >
                    {(
                      [
                        ["resources", "Objectifs & parcours", Target],
                        ["journal", "Le journal", MessageCircle],
                        ["members", "Le crew", Users],
                      ] as [string, string, LucideIcon][]
                    ).map(([id, label, Icon]) => (
                      <button
                        role="tab"
                        aria-selected={roomTab === id}
                        key={id}
                        className={roomTab === id ? "active" : ""}
                        onClick={() => setRoomTab(id)}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                    <button
                      className="btn primary small"
                      onClick={() =>
                        open({
                          type: "focus",
                          roomId,
                          resourceId: selectedResources[0]?.id,
                        })
                      }
                    >
                      <Play size={13} fill="currentColor" />
                      Lancer un focus
                    </button>
                  </div>
                  {roomTab === "resources" && (
                    <>
                      <div className="section-heading">
                        <div>
                          <h2>Une étape après l’autre.</h2>
                          <p>
                            Chacun avance à son rythme. Le crew garde le cap.
                          </p>
                        </div>
                        <button
                          className="btn secondary"
                          onClick={() => open({ type: "addResource", roomId })}
                        >
                          <Plus size={15} />
                          Ajouter un objectif
                        </button>
                      </div>
                      <div className="resources-list">
                        {selectedResources.map((r) => resourceCard(r))}
                      </div>
                      {!selectedResources.length && (
                        <Empty
                          title="Dessinez votre prochain niveau."
                          description="Ajoutez une ressource et transformez-la en étapes mesurables."
                          action={
                            <button
                              className="btn primary"
                              onClick={() =>
                                open({ type: "addResource", roomId })
                              }
                            >
                              Créer le premier objectif
                            </button>
                          }
                        />
                      )}
                    </>
                  )}
                  {roomTab === "journal" && (
                    <>
                      <div className="section-heading">
                        <h2>Vos progrès, au même endroit.</h2>
                        <button
                          className="btn primary small"
                          onClick={() => open({ type: "checkin", roomId })}
                        >
                          <Plus size={14} />
                          Mon check-in
                        </button>
                      </div>
                      <section className="panel feed">
                        {feed(
                          data.checkins.filter((p) => p.room_id === roomId),
                        )}
                      </section>
                    </>
                  )}
                  {roomTab === "members" && (
                    <div className="member-grid">
                      {members.map((m, i) => (
                        <article className="panel member-card" key={m.user_id}>
                          <Avatar
                            name={m.name || "Membre"}
                            size={48}
                            index={i}
                          />
                          <h3>
                            {m.name || "Membre"}{" "}
                            {m.user_id === uid && (
                              <span className="you-tag">toi</span>
                            )}
                          </h3>
                          <p>
                            {
                              data.completions.filter(
                                (c) =>
                                  c.user_id === m.user_id &&
                                  selectedResources.some(
                                    (r) => r.id === c.resource_id,
                                  ),
                              ).length
                            }{" "}
                            étapes terminées
                          </p>
                          <span className="tag neutral">
                            {room.owner === m.user_id
                              ? "Créateur de la room"
                              : "Membre du crew"}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {view === "goals" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        APPRENDRE. PRATIQUER. PROUVER.
                      </span>
                      <h1>Des envies aux compétences.</h1>
                      <p>
                        Toutes tes formations et playlists. Un vrai plan pour
                        les terminer.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() =>
                        open({ type: "addResource", roomId: data.rooms[0]?.id })
                      }
                    >
                      <Plus size={15} />
                      Nouvel objectif
                    </button>
                  </div>
                  <div className="filter-toolbar">
                    <div className="segmented">
                      {[
                        ["all", "Tous"],
                        ["active", "En cours"],
                        ["done", "Terminés"],
                      ].map(([v, t]) => (
                        <button
                          className={filter === v ? "active" : ""}
                          key={v}
                          onClick={() => setFilter(v)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="input-search">
                      <Search size={15} />
                      <input
                        placeholder="Rechercher un objectif…"
                        aria-label="Rechercher un objectif"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="resources-list">
                    {data.resources
                      .filter(
                        (r) =>
                          r.title.toLowerCase().includes(query.toLowerCase()) &&
                          (filter === "all" ||
                            (filter === "done" && percent(r) === 100) ||
                            (filter === "active" && percent(r) < 100)),
                      )
                      .map((r) => resourceCard(r))}
                  </div>
                  {!data.resources.length && (
                    <Empty
                      title="Une ambition devient un objectif quand on la découpe."
                      description="Ajoute ton premier parcours dans une room."
                      action={
                        <button
                          className="btn secondary"
                          onClick={() =>
                            open({
                              type: data.rooms.length
                                ? "addResource"
                                : "createRoom",
                              roomId: data.rooms[0]?.id,
                            })
                          }
                        >
                          C’est parti
                          <ArrowRight size={14} />
                        </button>
                      }
                    />
                  )}
                </>
              )}
              {view === "calendar" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        DU TEMPS POUR TON PROCHAIN NIVEAU
                      </span>
                      <h1>Ça se met dans l’agenda.</h1>
                      <p>Un créneau bloqué, c’est déjà un engagement.</p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() =>
                        open({ type: "addPlan", roomId: data.rooms[0]?.id })
                      }
                    >
                      <Plus size={15} />
                      Planifier une session
                    </button>
                  </div>
                  <div className="calendar-layout">
                    <section className="panel calendar-panel">
                      <div className="panel-title">
                        <h3>Les prochains rendez-vous</h3>
                        <span className="tag neutral">
                          {upcoming.length} sessions
                        </span>
                      </div>
                      {upcoming.map(planItem)}
                      {!upcoming.length && (
                        <Empty
                          title="Ton agenda attend le crew."
                          description="Choisis un créneau réaliste et tiens ce rendez-vous avec toi-même."
                        />
                      )}
                    </section>
                    <section className="panel reminder-info">
                      <Bell size={24} />
                      <h3>Le rappel qui te retrouve.</h3>
                      <p>
                        Ajoute une session à Google Agenda, Apple Calendrier ou
                        Outlook avec le bouton cloche.
                      </p>
                      <div>
                        <Check size={15} />
                        Un rappel 15 minutes avant
                      </div>
                      <div>
                        <Check size={15} />
                        Même quand Happen est fermé
                      </div>
                      <small>
                        Le fichier .ics doit être ouvert et enregistré dans ton
                        calendrier. Les alertes dépendent de ses réglages. Ici,
                        un rappel apparaît aussi si la page est ouverte.
                      </small>
                    </section>
                  </div>
                </>
              )}
              {view === "stats" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        LE PROGRÈS SE VOIT DANS LA DURÉE
                      </span>
                      <h1>Regarde le chemin parcouru.</h1>
                      <p>
                        Du temps investi. Des étapes franchies. Des preuves
                        concrètes.
                      </p>
                    </div>
                    <span className="tag neutral">Graphique · 28 jours</span>
                  </div>
                  <div className="stat-summary">
                    {[
                      [
                        "Focus · 28 jours",
                        mins(
                          mySessions
                            .filter(
                              (s) =>
                                new Date(s.created_at).getTime() >
                                tick - 28 * 86400000,
                            )
                            .reduce((a, s) => a + s.seconds, 0),
                        ),
                      ],
                      ["Étapes · total", myCompletions.length],
                      [
                        "Objectifs atteints",
                        data.resources.filter((r) => percent(r) === 100).length,
                      ],
                      [
                        "Preuves · total",
                        data.checkins.filter(
                          (p) => p.user_id === uid && p.approved_by,
                        ).length,
                      ],
                    ].map(([l, v]) => (
                      <div className="panel" key={l}>
                        <span>{l}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <section className="panel chart-panel">
                    <div className="panel-title">
                      <h3>Ton rythme d’apprentissage</h3>
                      <span className="chart-legend">
                        <span />
                        Temps focus par jour
                      </span>
                    </div>
                    <div className="bar-chart">
                      {Array.from({ length: 28 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - 27 + i);
                        const s = mySessions
                          .filter((s) => dayKey(s.created_at) === dayKey(d))
                          .reduce((a, s) => a + s.seconds, 0);
                        const max = Math.max(
                          3600,
                          ...Array.from({ length: 28 }, (_, j) => {
                            const x = new Date();
                            x.setDate(x.getDate() - j);
                            return mySessions
                              .filter((s) => dayKey(s.created_at) === dayKey(x))
                              .reduce((a, s) => a + s.seconds, 0);
                          }),
                        );
                        return (
                          <div
                            key={i}
                            title={`${dateLabel(d.toISOString())} : ${mins(s)}`}
                          >
                            <div
                              style={{
                                height: `${Math.max(2, (s / max) * 100)}%`,
                              }}
                            />
                            <small>
                              {i % 7 === 0 || i === 27 ? d.getDate() : ""}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="panel heatmap-panel">
                    <div className="panel-title">
                      <div>
                        <h3>Chaque petit carré compte.</h3>
                        <p>
                          Les 12 dernières semaines · sessions et étapes
                          terminées
                        </p>
                      </div>
                      <Flame size={19} />
                    </div>
                    <div className="heatmap">
                      {Array.from({ length: 84 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - 83 + i);
                        const c =
                          mySessions.filter(
                            (s) => dayKey(s.created_at) === dayKey(d),
                          ).length +
                          myCompletions.filter(
                            (s) => dayKey(s.created_at) === dayKey(d),
                          ).length;
                        return (
                          <span
                            className={`level${Math.min(4, c)}`}
                            key={i}
                            title={`${dateLabel(d.toISOString())} : ${c} activité(s)`}
                          />
                        );
                      })}
                    </div>
                    <p className="stat-footnote">
                      Le temps et les étapes sont déclarés par les membres. Une
                      preuve est validée après examen par un autre membre.
                    </p>
                  </section>
                </>
              )}
              {view === "leaderboard" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        LA MEILLEURE COMPÉTITION EST COLLECTIVE
                      </span>
                      <h1>Quand l’un avance, tout le crew gagne.</h1>
                      <p>
                        Les étapes et les preuves passent en premier. Chacun
                        garde son rythme.
                      </p>
                    </div>
                    <Trophy size={36} className="orange-text" />
                  </div>
                  {leaderboard(true)}
                  <div className="principle-note">
                    <ShieldCheck size={19} />
                    <p>
                      Une « preuve validée » est un livrable examiné par un
                      autre membre. Terminer une vidéo reste une étape déclarée,
                      pas une compétence certifiée.
                    </p>
                  </div>
                </>
              )}
              {view === "notifications" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        JUSTE CE QU’IL FAUT POUR GARDER LE CAP
                      </span>
                      <h1>Ton crew te fait signe.</h1>
                      <p>
                        Les prochains rendez-vous et les preuves qui attendent
                        un regard.
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Actualiser les notifications"
                      onClick={() =>
                        mode === "live"
                          ? loadLive()
                          : notify("Tu es à jour dans la démo.")
                      }
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  <section className="panel notifications-panel">
                    {pending.map((p) => (
                      <button
                        className="notification-item"
                        key={p.id}
                        onClick={() => open({ type: "approve", post: p })}
                      >
                        <span className="notification-icon">
                          <ShieldCheck size={20} />
                        </span>
                        <div>
                          <strong>{p.name} a partagé une preuve.</strong>
                          <p>
                            Prends un instant pour examiner son travail dans{" "}
                            {data.rooms.find((r) => r.id === p.room_id)?.name}.
                          </p>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                    {upcoming.slice(0, 5).map((p) => (
                      <button
                        className="notification-item"
                        key={p.id}
                        onClick={() => go("calendar")}
                      >
                        <span className="notification-icon blue">
                          <CalendarDays size={20} />
                        </span>
                        <div>
                          <strong>{p.title}</strong>
                          <p>
                            {dateTime(p.starts_at)} · {p.minutes} minutes
                          </p>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                    {!pending.length && !upcoming.length && (
                      <Empty
                        title="Tout est à jour."
                        description="Planifie une session ou partage un check-in pour lancer la dynamique."
                      />
                    )}
                  </section>
                </>
              )}
              {view === "vision" && (
                <div className="vision-page">
                  <div className="eyebrow">LE POURQUOI DERRIÈRE LE PRODUIT</div>
                  <h1>
                    Moins de « je m’y mets lundi ».
                    <br />
                    <span>Plus de « regarde ce que j’ai fait ».</span>
                  </h1>
                  <p className="vision-lead">
                    Happen transforme les formations qu’on sauvegarde en
                    compétences qu’on construit avec ses potes.
                  </p>
                  <div className="vision-loop">
                    {(
                      [
                        [
                          Target,
                          "01",
                          "S’engager",
                          "Une ressource, des étapes et une échéance.",
                        ],
                        [
                          Timer,
                          "02",
                          "Se retrouver",
                          "Un créneau, une room et du temps dédié.",
                        ],
                        [
                          Code2,
                          "03",
                          "Montrer",
                          "Un check-in et un livrable concret.",
                        ],
                        [
                          Users,
                          "04",
                          "Se soutenir",
                          "Un retour, une validation et le prochain pas.",
                        ],
                      ] as [LucideIcon, string, string, string][]
                    ).map(([Icon, n, t, d]) => (
                      <article className="panel" key={n}>
                        <span>{n}</span>
                        <Icon size={24} />
                        <h3>{t}</h3>
                        <p>{d}</p>
                      </article>
                    ))}
                  </div>
                  <h2>Trois références. Une direction claire.</h2>
                  <div className="reference-grid">
                    <article className="panel">
                      <span className="tag green">RÉFÉRENCE PRINCIPALE</span>
                      <h3>Nuzz ↗</h3>
                      <p>
                        Fond sombre, accents verts, navigation latérale, fil
                        social, série quotidienne et présence du groupe.
                      </p>
                      <a
                        href="https://nuzz.space/about"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Présentation publique
                        <ArrowUpRight size={14} />
                      </a>
                      <small>
                        Accueil et présentation explorés. L’accès aux rooms, au
                        planning et aux statistiques privées demande une
                        connexion ; ces parcours n’ont pas été testés.
                      </small>
                    </article>
                    <article className="panel">
                      <span className="tag neutral">SUIVI & LISIBILITÉ</span>
                      <h3>DataFast ↗</h3>
                      <p>
                        Indicateurs lisibles au premier regard, filtres
                        explicites et détails accessibles au clic. Adaptés ici
                        au progrès individuel.
                      </p>
                      <a
                        href="https://datafa.st/demo"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Démo publique
                        <ArrowUpRight size={14} />
                      </a>
                      <small>
                        Accueil et démo publique examinés, dont le suivi, les
                        périodes et les tableaux de détail.
                      </small>
                    </article>
                    <article className="panel">
                      <span className="tag neutral">PREUVES & ÉMULATION</span>
                      <h3>TrustMRR ↗</h3>
                      <p>
                        Tableaux comparables, classement lisible et provenance
                        visible. Ici, la preuve est examinée par un pair, sans
                        certification automatique.
                      </p>
                      <a
                        href="https://trustmrr.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir la plateforme
                        <ArrowUpRight size={14} />
                      </a>
                      <small>
                        Accueil, classement, fiche publique et statistiques
                        examinés. Aucun parcours d’achat ou de vente testé.
                      </small>
                    </article>
                  </div>
                  <section className="panel vision-scope">
                    <h2>Ce que cette première version permet</h2>
                    <p>
                      Créer et rejoindre une room par invitation, ajouter des
                      ressources et des étapes, suivre sa progression,
                      enregistrer une session focus, partager un check-in et
                      valider la preuve d’un autre membre. Les créneaux sont
                      partagés dans la room et exportables vers un calendrier.
                    </p>
                    <h3>Les prochaines briques</h3>
                    <p>
                      Import automatique des playlists YouTube, rappels par
                      e-mail ou Discord et présence en direct pendant les
                      sessions. Cette version conserve les liens des ressources
                      ; le découpage des étapes reste manuel. La visioconférence
                      et les messages externes ne sont pas intégrés.
                    </p>
                    <h3>Passer de la démo au crew</h3>
                    <p>
                      La démo utilise des personnes et activités fictives,
                      enregistrées sur cet appareil. « Mon espace » utilise ton
                      compte et des données enregistrées sur le serveur. Chaque
                      membre crée son compte Happen. Un lien d’invitation permet
                      ensuite de rejoindre votre room privée.
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => changeMode("live")}
                    >
                      Ouvrir mon espace
                      <ArrowRight size={15} />
                    </button>
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>
              happen<span className="green-text">.</span>
            </span>
            <p>Un peu plus compétents. Un peu moins seuls.</p>
            <span>Built for the crew ↗</span>
          </footer>
        </main>
      </div>
      {focus && (
        <div className={`focus-dock ${focusReady ? "completed" : ""}`}>
          <span className="focus-dock-icon">
            {focusReady ? <CheckCheck size={19} /> : <Headphones size={19} />}
          </span>
          <div>
            <strong>
              {focusReady ? "Session terminée. Bien joué !" : "Dans ta bulle."}
            </strong>
            <small>
              {data.rooms.find((r) => r.id === focus.roomId)?.name} ·{" "}
              {data.resources.find((r) => r.id === focus.resourceId)?.title ||
                "Focus libre"}
            </small>
          </div>
          <span className="timer-digits">
            {String(Math.floor(remaining / 60)).padStart(2, "0")}
            <i>:</i>
            {String(remaining % 60).padStart(2, "0")}
          </span>
          {!focusReady && (
            <button
              className="icon-button"
              aria-label={
                focus.startedAt ? "Mettre en pause" : "Reprendre le focus"
              }
              onClick={() =>
                setFocus((f) =>
                  f
                    ? {
                        ...f,
                        elapsed: focusElapsed,
                        startedAt: f.startedAt ? null : Date.now(),
                      }
                    : null,
                )
              }
            >
              {focus.startedAt ? <Pause size={19} /> : <Play size={19} />}
            </button>
          )}
          <button
            className="btn primary small"
            onClick={finishFocus}
            disabled={busy}
          >
            Terminer <Check size={14} />
          </button>
          <button
            className="icon-button"
            title="Abandonner la session"
            aria-label="Abandonner la session"
            onClick={() => open({ type: "cancelFocus" })}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Fermer la notification"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {modal && (
        <dialog
          ref={dialogRef}
          className={`modal modal-${modal.type}`}
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          onClick={(e) => {
            if (e.target === dialogRef.current) close();
          }}
        >
          <div className="modal-inner">
            <button
              className="modal-close icon-button"
              aria-label="Fermer la fenêtre"
              onClick={close}
              disabled={busy}
            >
              <X size={20} />
            </button>
            {modal.type === "mode" && (
              <>
                <span className="modal-kicker">CHOISIS TON ESPACE</span>
                <h2>On explore ou on se lance ?</h2>
                <p className="modal-intro">
                  La démo montre le produit en action. Ton espace démarre avec
                  tes propres rooms.
                </p>
                <button
                  className="mode-option"
                  onClick={() => changeMode("demo")}
                >
                  <span className="mode-option-icon">
                    <Sparkles size={23} />
                  </span>
                  <span>
                    <strong>Explorer la démo</strong>
                    <small>
                      Membres fictifs, interactions libres sur cet appareil.
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  className="mode-option"
                  onClick={() => changeMode("live")}
                >
                  <span className="mode-option-icon blue">
                    <DoorOpen size={23} />
                  </span>
                  <span>
                    <strong>Créer mon vrai espace</strong>
                    <small>
                      Tes rooms et tes progrès enregistrés avec ton compte.
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {modal.type === "createRoom" && (
              <>
                <span className="modal-kicker">UN NOUVEAU DÉPART</span>
                <h2>Rassemble ton crew.</h2>
                <p className="modal-intro">
                  Un objectif commun. Un endroit pour avancer ensemble.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const res = await mutate(
                      {
                        action: "createRoom",
                        name: f.get("name"),
                        description: f.get("description"),
                        topic: f.get("topic"),
                        color: f.get("color"),
                      },
                      "Ta room est prête. Premier pas : ajouter un objectif.",
                    );
                    if (res) {
                      close();
                      openRoom(res.id);
                    }
                  }}
                >
                  <label>
                    Nom de la room
                    <input
                      name="name"
                      placeholder="Ex. Cloud crew, 100 jours de code…"
                      required
                      maxLength={80}
                      autoFocus
                    />
                  </label>
                  <label>
                    Votre cap
                    <textarea
                      name="description"
                      placeholder="Qu’est-ce que vous voulez savoir faire ensemble ?"
                      rows={3}
                      maxLength={400}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Domaine
                      <select name="topic">
                        <option>Cloud & DevOps</option>
                        <option>Frontend</option>
                        <option>Backend</option>
                        <option>Data & IA</option>
                        <option>Cybersécurité</option>
                        <option>Autre</option>
                      </select>
                    </label>
                    <label>
                      Couleur
                      <select name="color">
                        <option value="blue">Bleu cloud</option>
                        <option value="violet">Violet builder</option>
                        <option value="green">Vert stack</option>
                        <option value="orange">Orange énergie</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-note">
                    <Lock size={13} />
                    La room est privée. Seuls les membres peuvent voir son
                    contenu.
                  </div>
                  {mode === "demo" && (
                    <p className="demo-form-note">
                      Tu es dans la démo. Cette room restera sur cet appareil.
                    </p>
                  )}
                  <ErrorMessage error={error} />
                  <button className="btn primary submit" disabled={busy}>
                    {busy ? "Création…" : "Créer la room"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </>
            )}
            {modal.type === "addResource" && (
              <>
                <span className="modal-kicker">DU CONTENU AU PROGRÈS</span>
                <h2>Donne un cap à la room.</h2>
                <p className="modal-intro">
                  Ajoute ta formation ou playlist et découpe-la en étapes
                  concrètes. Chaque membre suivra sa propre progression.
                </p>
                {!data.rooms.length ? (
                  <Empty
                    title="D’abord, une room."
                    description="Crée une room pour accueillir ton premier objectif."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => open({ type: "createRoom" })}
                      >
                        Créer une room
                      </button>
                    }
                  />
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const url = String(f.get("url"));
                      if (url && !validLink(url)) {
                        setError("Ajoute un lien http:// ou https:// valide.");
                        return;
                      }
                      const res = await mutate(
                        {
                          action: "addResource",
                          roomId: f.get("room"),
                          title: f.get("title"),
                          url,
                          kind: f.get("kind"),
                          dueDate: f.get("dueDate"),
                          modules: String(f.get("modules"))
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                        "Objectif ajouté. À vous de jouer !",
                      );
                      if (res) close();
                    }}
                  >
                    <label>
                      Room
                      <select
                        name="room"
                        defaultValue={modal.roomId || data.rooms[0]?.id}
                      >
                        {data.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Nom de l’objectif
                      <input
                        name="title"
                        placeholder="Ex. Déployer ma première application sur AWS"
                        maxLength={150}
                        required
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Format
                        <select name="kind">
                          <option>Formation</option>
                          <option>Playlist</option>
                          <option>Projet</option>
                          <option>Documentation</option>
                        </select>
                      </label>
                      <label>
                        Échéance souhaitée
                        <input
                          type="date"
                          name="dueDate"
                          min={new Date().toLocaleDateString("en-CA")}
                        />
                      </label>
                    </div>
                    <label>
                      Lien de la ressource <span>facultatif</span>
                      <input
                        name="url"
                        type="url"
                        placeholder="https://youtube.com/playlist?list=…"
                      />
                    </label>
                    <label>
                      Étapes <span>une par ligne</span>
                      <textarea
                        name="modules"
                        required
                        rows={5}
                        placeholder={
                          "Comprendre les fondamentaux\nFaire le premier exercice\nConstruire un mini-projet\nPartager une démonstration"
                        }
                      />
                    </label>
                    <small className="form-hint">
                      Le lien est conservé. Les étapes sont ajoutées
                      manuellement, sans import automatique.
                    </small>
                    <ErrorMessage error={error} />
                    <button className="btn primary submit" disabled={busy}>
                      {busy ? "Ajout…" : "Ajouter l’objectif"}
                      <Plus size={15} />
                    </button>
                  </form>
                )}
              </>
            )}
            {modal.type === "resource" && modalResource && (
              <>
                <span className="modal-kicker">
                  {modalResource.kind} ·{" "}
                  {data.rooms.find((x) => x.id === modalResource.room_id)?.name}
                </span>
                <h2>{modalResource.title}</h2>
                <div className="resource-modal-meta">
                  <span>
                    {completed(modalResource)} / {modalResource.modules.length}{" "}
                    étapes
                  </span>
                  {modalResource.due_date && (
                    <span>
                      <CalendarDays size={13} />
                      Cap au {dateLabel(modalResource.due_date)}
                    </span>
                  )}
                </div>
                <Progress value={percent(modalResource)} />
                <div className="module-list">
                  {modalResource.modules.map((m: string, i: number) => {
                    const checked = data.completions.some(
                      (c) =>
                        c.resource_id === modalResource.id &&
                        c.user_id === uid &&
                        c.module_index === i,
                    );
                    return (
                      <label
                        key={i}
                        className={checked ? "module done" : "module"}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const isChecked = e.currentTarget.checked;
                            void mutate({
                              action: "toggleModule",
                              roomId: modalResource.room_id,
                              resourceId: modalResource.id,
                              index: i,
                              completed: isChecked,
                            });
                          }}
                        />
                        <span className="module-check">
                          {checked ? <Check size={13} /> : <span>{i + 1}</span>}
                        </span>
                        <span>{m}</span>
                        <CheckCircle2 size={15} />
                      </label>
                    );
                  })}
                </div>
                <ErrorMessage error={error} />
                <div className="resource-modal-buttons">
                  {modalResource.url && (
                    <a
                      href={modalResource.url}
                      className="btn secondary"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir la ressource
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    className="btn primary"
                    onClick={() =>
                      open({
                        type: "focus",
                        roomId: modalResource.room_id,
                        resourceId: modalResource.id,
                      })
                    }
                  >
                    <Play size={13} fill="currentColor" />
                    Lancer un focus
                  </button>
                </div>
                <button
                  className="text-link checkin-link"
                  onClick={() =>
                    open({
                      type: "checkin",
                      roomId: modalResource.room_id,
                      resourceId: modalResource.id,
                    })
                  }
                >
                  Partager ce que j’ai appris
                  <ArrowRight size={14} />
                </button>
              </>
            )}
            {modal.type === "checkin" && (
              <>
                <span className="modal-kicker">TON PETIT PAS COMPTE</span>
                <h2>Alors, tu as appris quoi ?</h2>
                <p className="modal-intro">
                  Partage une avancée, un blocage ou un livrable. Le crew est là
                  pour ça.
                </p>
                {!data.rooms.length ? (
                  <Empty
                    title="Ton journal a besoin d’une room."
                    description="Crée ton premier espace pour partager tes progrès."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => open({ type: "createRoom" })}
                      >
                        Créer une room
                      </button>
                    }
                  />
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const link = String(f.get("link"));
                      if (link && !validLink(link)) {
                        setError(
                          "Le lien de preuve doit commencer par http:// ou https://.",
                        );
                        return;
                      }
                      const resource = String(f.get("resource") || "");
                      const rid = resource
                        ? data.resources.find((r) => r.id === resource)?.room_id
                        : f.get("room");
                      const res = await mutate(
                        {
                          action: "checkin",
                          roomId: rid,
                          resourceId: resource,
                          text: f.get("text"),
                          link,
                        },
                        "Check-in partagé. Le crew peut maintenant te soutenir.",
                      );
                      if (res) close();
                    }}
                  >
                    <label>
                      Room
                      <select
                        name="room"
                        defaultValue={modal.roomId || data.rooms[0].id}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            roomId: e.target.value,
                            resourceId: "",
                          })
                        }
                      >
                        {data.rooms.map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Objectif <span>facultatif</span>
                      <select
                        key={modal.roomId}
                        name="resource"
                        defaultValue={modal.resourceId || ""}
                      >
                        <option value="">Avancée libre</option>
                        {data.resources
                          .filter(
                            (r) =>
                              r.room_id === (modal.roomId || data.rooms[0].id),
                          )
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Ton avancée
                      <textarea
                        name="text"
                        rows={5}
                        placeholder="Aujourd’hui, j’ai… Mon prochain pas sera… J’ai besoin d’aide sur…"
                        defaultValue={modal.text || ""}
                        maxLength={2500}
                        required
                        autoFocus
                      />
                    </label>
                    <label>
                      Une preuve à partager ? <span>facultatif</span>
                      <input
                        name="link"
                        type="url"
                        placeholder="Lien vers ton code, une démo ou tes notes"
                      />
                    </label>
                    <div className="form-note">
                      <ShieldCheck size={15} />
                      Un autre membre pourra examiner et valider ton livrable.
                    </div>
                    <ErrorMessage error={error} />
                    <button className="btn primary submit" disabled={busy}>
                      {busy ? "Publication…" : "Partager avec le crew"}
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </>
            )}
            {modal.type === "focus" && (
              <>
                <span className="modal-kicker">UN MOMENT POUR CONSTRUIRE</span>
                <h2>On se met dans la bulle.</h2>
                <p className="modal-intro">
                  Choisis ton objectif, éloigne les distractions et fais le
                  prochain petit pas.
                </p>
                {focus ? (
                  <Empty
                    title="Tu es déjà dans ta bulle."
                    description="Termine ta session en cours avant d’en commencer une autre."
                    action={
                      <button className="btn primary" onClick={close}>
                        Retour au focus
                      </button>
                    }
                  />
                ) : !data.rooms.length ? (
                  <Empty
                    title="Tout commence par une room."
                    description="Crée un espace pour tes sessions d’apprentissage."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => open({ type: "createRoom" })}
                      >
                        Créer une room
                      </button>
                    }
                  />
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      setFocus({
                        roomId: String(f.get("room")),
                        resourceId: String(f.get("resource")),
                        duration: Number(f.get("duration")),
                        elapsed: 0,
                        startedAt: Date.now(),
                        id: newId(),
                        mode,
                      });
                      close();
                      notify("C’est parti. Un petit pas, sans interruption.");
                    }}
                  >
                    <label>
                      Dans quelle room ?
                      <select
                        name="room"
                        defaultValue={modal.roomId || data.rooms[0]?.id}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            roomId: e.target.value,
                            resourceId: "",
                          })
                        }
                      >
                        {data.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ton objectif
                      <select
                        key={modal.roomId}
                        name="resource"
                        defaultValue={modal.resourceId || ""}
                      >
                        <option value="">Focus libre</option>
                        {data.resources
                          .filter(
                            (r) =>
                              r.room_id === (modal.roomId || data.rooms[0].id),
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    <fieldset className="duration-picker">
                      <legend>Combien de temps ?</legend>
                      {[25, 45, 60, 90].map((n, i) => (
                        <label key={n}>
                          <input
                            type="radio"
                            name="duration"
                            value={n}
                            defaultChecked={i === 0}
                          />
                          <span>
                            {n}
                            <small>min</small>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="form-note">
                      <Headphones size={16} />
                      Le minuteur continue si tu changes d’onglet. Tu pourras
                      partager ton avancée en terminant.
                    </div>
                    <button className="btn primary submit">
                      <Play size={14} fill="currentColor" />
                      Lancer ma session
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </>
            )}
            {modal.type === "addPlan" && (
              <>
                <span className="modal-kicker">
                  PRENDS RENDEZ-VOUS AVEC TES OBJECTIFS
                </span>
                <h2>Bloquons ce créneau.</h2>
                <p className="modal-intro">
                  La session sera visible dans ta room. Ajoute-la ensuite à ton
                  calendrier pour recevoir un rappel.
                </p>
                {!data.rooms.length ? (
                  <Empty
                    title="Il te faut une room."
                    description="Réunis d’abord ton crew."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => open({ type: "createRoom" })}
                      >
                        Créer une room
                      </button>
                    }
                  />
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const startsAt = new Date(
                        String(f.get("date")),
                      ).toISOString();
                      if (new Date(startsAt).getTime() < Date.now()) {
                        setError("Choisis un créneau dans le futur.");
                        return;
                      }
                      const payload = {
                        action: "addPlan",
                        title: f.get("title"),
                        roomId: f.get("room"),
                        startsAt,
                        minutes: Number(f.get("minutes")),
                      };
                      const res = await mutate(
                        payload,
                        "Session planifiée. Ajoute-la à ton calendrier pour le rappel.",
                      );
                      if (res)
                        open({
                          type: "planned",
                          plan: {
                            id: res.id,
                            title: payload.title,
                            room_id: payload.roomId,
                            starts_at: startsAt,
                            minutes: payload.minutes,
                          },
                        });
                    }}
                  >
                    <label>
                      Nom de la session
                      <input
                        name="title"
                        placeholder="Ex. Session cloud : premier déploiement"
                        required
                        maxLength={150}
                        defaultValue={
                          modal.buddy ? `Session duo avec ${modal.buddy}` : ""
                        }
                      />
                    </label>
                    <label>
                      Room
                      <select
                        name="room"
                        defaultValue={modal.roomId || data.rooms[0]?.id}
                      >
                        {data.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-row">
                      <label>
                        Quand ? <span>heure locale</span>
                        <input name="date" type="datetime-local" required />
                      </label>
                      <label>
                        Durée
                        <select name="minutes">
                          {[25, 45, 60, 90, 120].map((n) => (
                            <option key={n} value={n}>
                              {n} minutes
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <ErrorMessage error={error} />
                    <button className="btn primary submit" disabled={busy}>
                      {busy ? "Planification…" : "Bloquer le créneau"}
                      <CalendarDays size={15} />
                    </button>
                  </form>
                )}
              </>
            )}
            {modal.type === "planned" && (
              <>
                <span className="success-mark">
                  <Check size={30} />
                </span>
                <h2>C’est dans le planning.</h2>
                <p className="modal-intro">
                  {modal.plan.title}
                  <br />
                  {dateTime(modal.plan.starts_at)}
                </p>
                <a
                  className="btn primary submit"
                  href={calendarURL(modal.plan)}
                  download="happen-session.ics"
                >
                  <Bell size={15} />
                  Ajouter au calendrier avec rappel
                </a>
                <p className="form-hint centered">
                  Ouvre et enregistre le fichier .ics dans ton calendrier. Il
                  contient une alerte 15 minutes avant la session.
                </p>
                <button className="text-link checkin-link" onClick={close}>
                  C’est compris
                  <Check size={14} />
                </button>
              </>
            )}
            {modal.type === "invite" && (
              <>
                <span className="modal-kicker">
                  LE PROCHAIN NIVEAU SE PARTAGE
                </span>
                <h2>Fais entrer tes potes.</h2>
                {!data.rooms.length ? (
                  <Empty
                    title="D’abord, votre room."
                    description="Donne un point de rendez-vous à ton crew."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => open({ type: "createRoom" })}
                      >
                        Créer une room
                      </button>
                    }
                  />
                ) : mode === "demo" ? (
                  <>
                    <p className="modal-intro">
                      Les invitations sont disponibles dans ton espace réel. Les
                      membres de cette démo sont fictifs.
                    </p>
                    <button
                      className="btn primary submit"
                      onClick={() => changeMode("live")}
                    >
                      Créer mon vrai espace
                      <ArrowRight size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="modal-intro">
                      Chaque ami crée son compte Happen. Ce lien lui permettra
                      ensuite de rejoindre votre room.
                    </p>
                    <label>
                      Room
                      <select
                        value={modal.roomId || data.rooms[0]?.id}
                        onChange={(e) =>
                          setModal({ ...modal, roomId: e.target.value })
                        }
                      >
                        {data.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="invite-link">
                      <input
                        readOnly
                        aria-label="Lien d’invitation"
                        value={`${window.location.origin}/?invite=${data.rooms.find((r) => r.id === (modal.roomId || data.rooms[0].id))?.invite}`}
                      />
                      <button
                        className="btn primary small"
                        onClick={async () => {
                          const url = `${window.location.origin}/?invite=${data.rooms.find((r) => r.id === (modal.roomId || data.rooms[0].id))?.invite}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            notify("Lien d’invitation copié.");
                          } catch {
                            setError("Sélectionne et copie le lien affiché.");
                          }
                        }}
                      >
                        <Copy size={15} />
                        Copier
                      </button>
                    </div>
                    <div className="form-note">
                      <Lock size={15} />
                      Quiconque possède ce lien et un compte Happen peut
                      rejoindre cette room.
                    </div>
                    <ErrorMessage error={error} />
                  </>
                )}
              </>
            )}
            {modal.type === "join" && (
              <>
                <span className="modal-kicker">TA PLACE EST DANS LE CREW</span>
                <h2>Rejoins une room.</h2>
                <p className="modal-intro">
                  Colle le lien d’invitation que ton pote t’a envoyé.
                </p>
                {mode === "demo" ? (
                  <button
                    className="btn primary submit"
                    onClick={() => changeMode("live")}
                  >
                    Ouvrir mon espace réel
                    <ArrowRight size={15} />
                  </button>
                ) : !authed ? (
                  <a
                    className="btn primary submit"
                    href={`/sign-in?invite=${encodeURIComponent(modal.invite || "")}`}
                  >
                    Me connecter pour rejoindre
                    <ArrowRight size={15} />
                  </a>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      let invite = String(f.get("invite"));
                      try {
                        invite =
                          new URL(invite).searchParams.get("invite") || invite;
                      } catch {}
                      const res = await mutate(
                        { action: "joinRoom", invite },
                        "Bienvenue dans la room !",
                      );
                      if (res) {
                        close();
                        openRoom(res.id);
                        window.history.replaceState(null, "", "/");
                      }
                    }}
                  >
                    <label>
                      Lien ou code d’invitation
                      <input
                        name="invite"
                        required
                        defaultValue={modal.invite || ""}
                        placeholder="https://…/?invite=…"
                      />
                    </label>
                    <ErrorMessage error={error} />
                    <button className="btn primary submit" disabled={busy}>
                      Rejoindre la room
                      <ArrowRight size={15} />
                    </button>
                  </form>
                )}
              </>
            )}
            {modal.type === "buddy" && (
              <>
                <span className="modal-kicker">LE POUVOIR DU DUO</span>
                <h2>Qui embarque avec toi ?</h2>
                <p className="modal-intro">
                  Propose un créneau commun, visible dans votre room. Le partage
                  avec ton pote se fait depuis le planning.
                </p>
                <div className="buddy-list">
                  {uniqueMembers
                    .filter((m) => m.user_id !== uid)
                    .map((m, i) => (
                      <button
                        key={m.user_id}
                        onClick={() =>
                          open({
                            type: "addPlan",
                            roomId: m.room_id,
                            buddy: m.name,
                          })
                        }
                      >
                        <Avatar name={m.name || "Membre"} index={i} size={39} />
                        <span>
                          <strong>{m.name}</strong>
                          <small>
                            {data.rooms.find((r) => r.id === m.room_id)?.name}
                          </small>
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                </div>
              </>
            )}
            {modal.type === "approve" && (
              <>
                <span className="modal-kicker">UN REGARD QUI FAIT AVANCER</span>
                <h2>Le travail de {modal.post.name}.</h2>
                <p className="review-text">{modal.post.text}</p>
                <a
                  className="btn secondary submit"
                  href={modal.post.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir et examiner la preuve
                  <ExternalLink size={15} />
                </a>
                <p className="modal-intro">
                  Après l’avoir consultée, confirme que le livrable montre bien
                  le travail annoncé. La validation sera attribuée à ton profil.
                </p>
                <ErrorMessage error={error} />
                <button
                  className="btn primary submit"
                  disabled={busy}
                  onClick={async () => {
                    const res = await mutate(
                      {
                        action: "approve",
                        roomId: modal.post.room_id,
                        checkinId: modal.post.id,
                      },
                      "Preuve validée. Merci d’avoir pris le temps !",
                    );
                    if (res) close();
                  }}
                >
                  <ShieldCheck size={16} />
                  J’ai examiné et je valide
                </button>
              </>
            )}
            {modal.type === "profile" && (
              <>
                <span className="modal-kicker">TON PROFIL</span>
                <h2>Comment le crew t’appelle ?</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const res = await mutate(
                      { action: "profile", name: f.get("name") },
                      "Profil mis à jour.",
                    );
                    if (res) close();
                  }}
                >
                  <label>
                    Ton prénom
                    <input
                      required
                      name="name"
                      defaultValue={userName}
                      maxLength={60}
                    />
                  </label>
                  <ErrorMessage error={error} />
                  <button className="btn primary submit" disabled={busy}>
                    Enregistrer
                    <Check size={15} />
                  </button>
                </form>
                <button
                  className="text-link checkin-link"
                  onClick={() => open({ type: "mode" })}
                >
                  Changer d’espace
                  <ChevronRight size={14} />
                </button>
                {mode === "live" && authed && (
                  <button
                    className="text-link checkin-link"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const result = await authClient.signOut();
                        if (result.error)
                          throw new Error(
                            "Déconnexion impossible. Réessaie dans un instant.",
                          );
                        setAuthed(false);
                        setData({ ...emptyWorkspace });
                        setFocus(null);
                        setModal(null);
                        notify("Tu es déconnecté.");
                      } catch {
                        notify(
                          "Déconnexion impossible. Réessaie dans un instant.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Me déconnecter
                    <LogOut size={14} />
                  </button>
                )}
              </>
            )}
            {modal.type === "search" && (
              <>
                <span className="modal-kicker">TROUVE TON PROCHAIN PAS</span>
                <h2>On cherche quoi ?</h2>
                <div className="input-search large">
                  <Search size={18} />
                  <input
                    autoFocus
                    placeholder="Une room, un objectif…"
                    aria-label="Recherche globale"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="search-results">
                  {data.rooms
                    .filter((r) =>
                      r.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          close();
                          openRoom(r.id);
                        }}
                      >
                        <DoorOpen size={17} />
                        <span>
                          {r.name}
                          <small>Room</small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  {data.resources
                    .filter((r) =>
                      r.title.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() =>
                          open({ type: "resource", resourceId: r.id })
                        }
                      >
                        <BookOpen size={17} />
                        <span>
                          {r.title}
                          <small>Objectif</small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  {!data.rooms.some((r) =>
                    r.name.toLowerCase().includes(query.toLowerCase()),
                  ) &&
                    !data.resources.some((r) =>
                      r.title.toLowerCase().includes(query.toLowerCase()),
                    ) && (
                      <p className="small-empty">
                        Aucun résultat. Essaie un autre mot.
                      </p>
                    )}
                </div>
              </>
            )}
            {modal.type === "cancelFocus" && (
              <>
                <span className="modal-kicker">
                  UNE PAUSE DANS LA PROGRESSION
                </span>
                <h2>On arrête là ?</h2>
                <p className="modal-intro">
                  Tu peux enregistrer le temps déjà passé, ou abandonner cette
                  session sans l’ajouter à ta progression.
                </p>
                <button
                  className="btn primary submit"
                  onClick={finishFocus}
                  disabled={busy}
                >
                  Enregistrer et partager
                  <Check size={15} />
                </button>
                <button
                  className="btn secondary submit"
                  onClick={() => {
                    setFocus(null);
                    close();
                    notify(
                      "Session abandonnée. Tu peux recommencer quand tu veux.",
                    );
                  }}
                >
                  Abandonner la session
                </button>
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
