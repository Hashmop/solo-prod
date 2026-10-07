import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Coins,
  Flame,
  LayoutDashboard,
  ListChecks,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserRound,
  X,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'solo-prod-system-v3';
const LEGACY_TODOS_KEY = 'productivityTodos';
const FOCUS_PRESETS = [15, 25, 50];
const MODES = {
  focus: { label: 'Focus', seconds: 25 * 60 },
  shortBreak: { label: 'Short break', seconds: 5 * 60 },
};

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateFromKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const readJson = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

function makeInitialData() {
  const today = localDateKey(new Date());
  const saved = readJson(STORAGE_KEY, null);
  if (saved && typeof saved === 'object' && saved.logs && Array.isArray(saved.tasks)) {
    return {
      username: 'Player',
      xp: 0,
      coins: 0,
      tasks: [],
      logs: {},
      session: null,
      ...saved,
    };
  }

  // Bring forward the useful parts of the original app's local-only profile.
  const oldHeatmap = readJson('productivityHeatmap', []);
  const logs = {};
  if (Array.isArray(oldHeatmap)) {
    oldHeatmap.forEach((entry) => {
      if (entry?.date) {
        logs[entry.date] = {
          studySeconds: Math.max(0, Number(entry.studyTime) || 0),
          completedSessions: 0,
          claimedQuests: [],
        };
      }
    });
  }
  const oldDaily = readJson('productivityDailyTimers', {});
  const oldResetDate = window.localStorage.getItem('lastResetDate');
  const dailyRecordIsCurrent = !oldResetDate || localDateKey(new Date(oldResetDate)) === today;
  if (dailyRecordIsCurrent && Number(oldDaily.study) > 0) {
    logs[today] = {
      studySeconds: Math.max(logs[today]?.studySeconds || 0, Number(oldDaily.study)),
      completedSessions: logs[today]?.completedSessions || 0,
      claimedQuests: [],
    };
  }
  const oldTodos = readJson(LEGACY_TODOS_KEY, []);
  const tasks = Array.isArray(oldTodos)
    ? oldTodos.map((task, index) => {
        const done = Boolean(task?.completed ?? task?.done);
        return {
          id: String(task?.id ?? `legacy-${index}`),
          title: String(task?.title ?? task?.text ?? task?.name ?? '').trim(),
          done,
          rewarded: done,
          completedDate: done ? today : null,
          createdAt: task?.createdAt ?? new Date().toISOString(),
        };
      }).filter((task) => task.title)
    : [];

  return {
    username: window.localStorage.getItem('productivityUsername') || 'Player',
    xp: Math.max(0, Number(window.localStorage.getItem('productivityXp')) || 0),
    coins: Math.max(0, Number(window.localStorage.getItem('systemCurrency')) || 0),
    tasks,
    logs,
    session: null,
  };
}

function getPlayerLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, Number(totalXp) || 0);
  let needed = 100;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = 100 + (level - 1) * 50;
  }
  return { level, currentXp: remaining, nextLevelXp: needed };
}

function rankForLevel(level) {
  if (level >= 30) return 'S';
  if (level >= 20) return 'A';
  if (level >= 12) return 'B';
  if (level >= 7) return 'C';
  if (level >= 4) return 'D';
  return 'E';
}

function getStreak(logs, today) {
  let cursor = dateFromKey(today);
  if (!(logs[today]?.studySeconds > 0)) cursor = addDays(cursor, -1);
  let streak = 0;
  while ((logs[localDateKey(cursor)]?.studySeconds || 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function App() {
  const [data, setData] = useState(makeInitialData);
  const [now, setNow] = useState(Date.now());
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [selectedMode, setSelectedMode] = useState('focus');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [newTask, setNewTask] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [showManualLog, setShowManualLog] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.username);
  const [toast, setToast] = useState('');
  const [musicOn, setMusicOn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const audioRef = useRef(null);
  const toastTimer = useRef(null);
  const completedSessionId = useRef(null);

  const today = localDateKey(new Date());
  const todaysLog = data.logs[today] || { studySeconds: 0, completedSessions: 0, claimedQuests: [] };
  const todaySeconds = Number(todaysLog.studySeconds) || 0;
  const completedTasksToday = data.tasks.filter((task) => task.done && task.completedDate === today).length;
  const player = getPlayerLevel(data.xp);
  const rank = rankForLevel(player.level);
  const streak = getStreak(data.logs, today);
  const timerMode = data.session?.mode || selectedMode;
  const timerDuration = data.session?.durationSeconds ?? (
    selectedMode === 'focus' ? focusMinutes * 60 : MODES.shortBreak.seconds
  );
  const secondsLeft = data.session
    ? data.session.endsAt
      ? Math.max(0, Math.ceil((data.session.endsAt - now) / 1000))
      : Math.max(0, Number(data.session.remainingSeconds) || 0)
    : timerDuration;
  const timerProgress = timerDuration > 0 ? 1 - secondsLeft / timerDuration : 0;
  const timerCircumference = 2 * Math.PI * 104;

  const missions = useMemo(() => [
    {
      id: 'enter-gate',
      title: 'Enter the Gate',
      detail: 'Finish one focus session',
      progress: Math.min(Number(todaysLog.completedSessions) || 0, 1),
      goal: 1,
      reward: 50,
      icon: Target,
      format: (value, goal) => `${value}/${goal} session`,
    },
    {
      id: 'deep-work',
      title: 'Deep work',
      detail: 'Reach 60 focused minutes',
      progress: Math.min(todaySeconds, 60 * 60),
      goal: 60 * 60,
      reward: 100,
      icon: BookOpen,
      format: (value) => `${Math.floor(value / 60)} / 60 min`,
    },
    {
      id: 'clear-missions',
      title: 'Clear 3 missions',
      detail: 'Complete three items on your list',
      progress: Math.min(completedTasksToday, 3),
      goal: 3,
      reward: 75,
      icon: ListChecks,
      format: (value, goal) => `${value}/${goal} tasks`,
    },
  ], [completedTasksToday, todaySeconds, todaysLog.completedSessions]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const dayNumber = index - firstWeekday + 1;
      if (dayNumber < 1 || dayNumber > dayCount) return null;
      const date = new Date(year, month, dayNumber);
      const key = localDateKey(date);
      return { date, key, seconds: Number(data.logs[key]?.studySeconds) || 0, isToday: key === today, isFuture: key > today };
    });
  }, [calendarMonth, data.logs, today]);

  const weekDays = useMemo(() => {
    const current = dateFromKey(today);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(current, index - 6);
      const key = localDateKey(date);
      return { date, key, seconds: Number(data.logs[key]?.studySeconds) || 0 };
    });
  }, [data.logs, today]);
  const maxWeekMinutes = Math.max(60, ...weekDays.map((day) => day.seconds / 60));
  const monthMinutes = calendarCells.reduce((sum, day) => sum + (day?.seconds || 0), 0) / 60;
  const viewingCurrentMonth = calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() === new Date().getMonth();
  const calendarMonthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarMonth);
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const prettyName = data.username.trim() || 'Player';

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const session = data.session;
    if (!session?.endsAt || session.endsAt > now || completedSessionId.current === session.id) return;
    completedSessionId.current = session.id;
    setData((current) => {
      if (current.session?.id !== session.id) return current;
      const next = { ...current, session: null };
      if (session.mode !== 'focus') return next;
      const key = localDateKey(new Date());
      const day = current.logs[key] || { studySeconds: 0, completedSessions: 0, claimedQuests: [] };
      const seconds = Number(session.durationSeconds) || focusMinutes * 60;
      const xpGain = Math.max(5, Math.round(seconds / 30));
      return {
        ...next,
        xp: current.xp + xpGain,
        coins: current.coins + 10,
        logs: {
          ...current.logs,
          [key]: {
            ...day,
            studySeconds: (Number(day.studySeconds) || 0) + seconds,
            completedSessions: (Number(day.completedSessions) || 0) + 1,
            claimedQuests: day.claimedQuests || [],
          },
        },
      };
    });
    notify(session.mode === 'focus' ? 'Focus session cleared · +XP added to your profile' : 'Break complete · ready for another round.');
  }, [data.session, focusMinutes, now]);

  useEffect(() => {
    if (!toast) return undefined;
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(toastTimer.current);
  }, [toast]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  function notify(message) {
    setToast(message);
  }

  function startTimer() {
    const seconds = data.session?.remainingSeconds || timerDuration;
    const mode = data.session?.mode || selectedMode;
    const durationSeconds = data.session?.durationSeconds || timerDuration;
    setData((current) => ({
      ...current,
      session: {
        id: current.session?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode,
        durationSeconds,
        remainingSeconds: seconds,
        endsAt: Date.now() + seconds * 1000,
      },
    }));
  }

  function pauseTimer() {
    if (!data.session?.endsAt) return;
    const remainingSeconds = Math.max(0, Math.ceil((data.session.endsAt - Date.now()) / 1000));
    setData((current) => ({
      ...current,
      session: current.session ? { ...current.session, endsAt: null, remainingSeconds } : null,
    }));
  }

  function resetTimer() {
    setData((current) => ({ ...current, session: null }));
    setNow(Date.now());
  }

  function chooseMode(mode) {
    if (data.session?.endsAt) return;
    setData((current) => ({ ...current, session: null }));
    setSelectedMode(mode);
  }

  function logFocusMinutes(minutesValue) {
    const minutes = Math.min(240, Math.floor(Number(minutesValue)));
    if (!Number.isFinite(minutes) || minutes < 1) {
      notify('Enter a focus time from 1 to 240 minutes.');
      return;
    }
    const seconds = minutes * 60;
    const xpGain = Math.max(2, Math.round(minutes * 2));
    const key = localDateKey(new Date());
    setData((current) => {
      const day = current.logs[key] || { studySeconds: 0, completedSessions: 0, claimedQuests: [] };
      return {
        ...current,
        xp: current.xp + xpGain,
        coins: current.coins + Math.max(2, Math.floor(minutes / 10)),
        logs: {
          ...current.logs,
          [key]: {
            ...day,
            studySeconds: (Number(day.studySeconds) || 0) + seconds,
            completedSessions: (Number(day.completedSessions) || 0) + 1,
            claimedQuests: day.claimedQuests || [],
          },
        },
      };
    });
    setManualMinutes('');
    setShowManualLog(false);
    notify(`Focus logged · +${xpGain} XP`);
  }

  function addTask(event) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setData((current) => ({
      ...current,
      tasks: [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        done: false,
        rewarded: false,
        completedDate: null,
        createdAt: new Date().toISOString(),
      }, ...current.tasks],
    }));
    setNewTask('');
  }

  function addSuggestedTask(title) {
    setData((current) => ({
      ...current,
      tasks: [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        done: false,
        rewarded: false,
        completedDate: null,
        createdAt: new Date().toISOString(),
      }, ...current.tasks],
    }));
  }

  function toggleTask(id) {
    const key = localDateKey(new Date());
    setData((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const nowDone = !task.done;
      const firstReward = nowDone && !task.rewarded;
      return {
        ...current,
        xp: current.xp + (firstReward ? 15 : 0),
        coins: current.coins + (firstReward ? 3 : 0),
        tasks: current.tasks.map((item) => item.id === id
          ? { ...item, done: nowDone, rewarded: item.rewarded || firstReward, completedDate: nowDone ? key : null }
          : item),
      };
    });
  }

  function deleteTask(id) {
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }

  function claimMission(mission) {
    const key = localDateKey(new Date());
    setData((current) => {
      const day = current.logs[key] || { studySeconds: 0, completedSessions: 0, claimedQuests: [] };
      if ((day.claimedQuests || []).includes(mission.id)) return current;
      return {
        ...current,
        xp: current.xp + mission.reward,
        coins: current.coins + Math.max(5, Math.round(mission.reward / 10)),
        logs: {
          ...current.logs,
          [key]: { ...day, claimedQuests: [...(day.claimedQuests || []), mission.id] },
        },
      };
    });
    notify(`Mission reward claimed · +${mission.reward} XP`);
  }

  function saveName(event) {
    event.preventDefault();
    const username = nameDraft.trim().slice(0, 24) || 'Player';
    setData((current) => ({ ...current, username }));
    setProfileOpen(false);
    notify('Player profile updated.');
  }

  async function toggleMusic() {
    if (!audioRef.current) {
      audioRef.current = new Audio('/music/soloLofi.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.24;
    }
    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setMusicOn(true);
      } catch {
        notify('Audio could not start. Try pressing the button again.');
      }
    } else {
      audioRef.current.pause();
      setMusicOn(false);
    }
  }

  function jumpTo(id) {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const navItems = [
    { label: 'Overview', target: 'overview', icon: LayoutDashboard },
    { label: 'Focus room', target: 'focus-room', icon: Clock3 },
    { label: 'Daily missions', target: 'missions', icon: Target },
    { label: 'Task list', target: 'tasks', icon: ListChecks },
    { label: 'Progress', target: 'progress', icon: Activity },
  ];

  const activeSession = Boolean(data.session?.endsAt);
  const currentTasks = [...data.tasks].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => jumpTo('overview')} aria-label="Solo Prod home">
          <span className="brand-emblem"><Shield size={22} strokeWidth={1.8} /><span>S</span></span>
          <span className="brand-wordmark">SOLO<span>/</span>PROD<small>PLAYER SYSTEM</small></span>
        </button>

        <div className="side-section-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, target, icon: Icon }, index) => (
            <button className={`nav-item ${index === 0 ? 'nav-item-active' : ''}`} key={target} onClick={() => jumpTo(target)}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {index === 0 && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>

        <div className="side-quote">
          <Sparkles size={15} />
          <p>“You don't have to be great to start. You have to start to get stronger.”</p>
          <span>PLAYER SYSTEM · DAILY DIRECTIVE</span>
        </div>

        <div className="sidebar-bottom">
          <button className={`ambience-button ${musicOn ? 'ambience-on' : ''}`} onClick={toggleMusic}>
            <span className="ambience-icon"><Music2 size={16} /></span>
            <span><strong>{musicOn ? 'Ambience on' : 'Study ambience'}</strong><small>{musicOn ? 'Lofi field active' : 'Tap to set the mood'}</small></span>
            <span className={`sound-indicator ${musicOn ? 'sound-indicator-on' : ''}`}><i /><i /><i /></span>
          </button>
          <button className="player-mini" onClick={() => { setNameDraft(data.username); setProfileOpen(true); }}>
            <span className="player-avatar"><UserRound size={19} /></span>
            <span className="player-mini-info"><strong>{prettyName}</strong><small>Rank {rank} hunter · Lv. {player.level}</small></span>
            <ChevronRight size={15} className="player-mini-arrow" />
          </button>
          <div className="sidebar-footnote">Your progress stays on this device.</div>
        </div>
      </aside>

      <main className="workspace" id="overview">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-emblem"><Shield size={20} /><span>S</span></span><b>SOLO<span>/</span>PROD</b></div>
          <div className="topbar-context"><span className="context-pulse" /> PLAYER SYSTEM <span className="context-divider">/</span> <span className="context-muted">COMMAND CENTER</span></div>
          <div className="topbar-actions">
            <button className={`top-icon-button ${musicOn ? 'top-icon-active' : ''}`} title={musicOn ? 'Turn ambience off' : 'Turn ambience on'} onClick={toggleMusic}><Music2 size={16} /></button>
            <div className="top-rank"><span className="rank-diamond">{rank}</span><span>RANK <b>{rank}</b></span></div>
            <button className="top-profile" onClick={() => { setNameDraft(data.username); setProfileOpen(true); }} aria-label="Edit player profile"><span className="top-profile-avatar"><UserRound size={16} /></span></button>
          </div>
        </header>

        {mobileMenuOpen && <div className="mobile-nav-popover">
          {navItems.map(({ label, target, icon: Icon }) => <button key={target} onClick={() => jumpTo(target)}><Icon size={16} />{label}</button>)}
        </div>}

        <div className="mobile-nav-row">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={16} /> {mobileMenuOpen ? 'Close menu' : 'Navigate'}</button>
          <button onClick={toggleMusic}><Music2 size={16} /> {musicOn ? 'Sound on' : 'Sound off'}</button>
        </div>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> PERSONAL GROWTH PROTOCOL <span className="eyebrow-line" /></div>
              <h1>Welcome back, <em>{prettyName}</em></h1>
              <p className="page-subtitle">Your next level is built one focused session at a time.</p>
            </div>
            <div className="date-pill"><CalendarDays size={15} /><span>{dateLabel}</span></div>
          </section>

          <section className="hero-panel">
            <div className="hero-copy">
              <div className="hero-status"><span className="status-orb" /> SYSTEM LINK ESTABLISHED <span className="status-divider">·</span> ALL SYSTEMS NORMAL</div>
              <div className="hero-kicker">TODAY'S POTENTIAL IS UNLOCKED</div>
              <h2>Train your focus.<br /><span>Change your stats.</span></h2>
              <p>Every minute you show up counts. Stack small wins, clear your missions, and let the levels take care of themselves.</p>
              <button className="primary-cta" onClick={() => jumpTo('focus-room')}><Zap size={16} fill="currentColor" /> Start a focus session <ArrowRight size={16} /></button>
              <div className="hero-footnote"><span><Shield size={13} /> BUILT FOR YOUR REAL LIFE</span><span className="hero-foot-sep" /> <span>NO PERFECT DAYS REQUIRED</span></div>
            </div>
            <div className="hero-art-wrap">
              <div className="hero-art-grid" />
              <div className="hero-art-frame"><img src="/images/reawaken.jpg" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
              <div className="hero-art-overlay" />
              <div className="hero-art-caption"><span className="caption-line" /><span><small>PLAYER DIRECTIVE · 001</small><strong>Become stronger<br />than yesterday.</strong></span></div>
              <div className="art-corner art-corner-a" /><div className="art-corner art-corner-b" />
              <div className="art-level-chip"><Sparkles size={13} /> YOUR STORY STARTS HERE</div>
            </div>
            <div className="hero-glow" />
          </section>

          <section className="stats-strip" aria-label="Today's stats">
            <StatCard icon={Clock3} label="FOCUS TODAY" value={Math.floor(todaySeconds / 60)} suffix="min" note={todaySeconds ? 'Your time is adding up' : 'Start with one minute'} tone="cyan" />
            <StatCard icon={Flame} label="CURRENT STREAK" value={streak} suffix={streak === 1 ? 'day' : 'days'} note={streak ? 'Keep the chain alive' : 'Begin a new streak today'} tone="orange" />
            <StatCard icon={CheckCircle2} label="MISSIONS CLEARED" value={completedTasksToday} suffix="today" note="Every checked task earns XP" tone="violet" />
            <StatCard icon={Coins} label="SYSTEM COINS" value={data.coins} suffix="G" note="Earn them as you progress" tone="gold" />
          </section>

          <section className="dashboard-grid">
            <div className="main-column">
              <section className="panel focus-panel" id="focus-room">
                <div className="panel-heading focus-panel-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-cyan"><Clock3 size={17} /></span><div><h3>Focus room</h3><p>Make this block yours.</p></div></div>
                  <div className="focus-live"><span /> {activeSession ? 'SESSION LIVE' : data.session ? 'SESSION PAUSED' : 'READY WHEN YOU ARE'}</div>
                </div>
                <div className="timer-tabs" role="tablist" aria-label="Timer type">
                  {Object.entries(MODES).map(([mode, config]) => <button key={mode} role="tab" aria-selected={timerMode === mode} className={timerMode === mode ? 'timer-tab timer-tab-active' : 'timer-tab'} onClick={() => chooseMode(mode)} disabled={activeSession}>{config.label}</button>)}
                  <span className="timer-tab-note">{timerMode === 'focus' ? 'FOCUS BLOCK' : 'RESET YOUR MIND'}</span>
                </div>
                <div className="timer-stage">
                  <div className="timer-orbit timer-orbit-a" /><div className="timer-orbit timer-orbit-b" />
                  <div className="timer-ring-wrap">
                    <svg className="timer-ring" viewBox="0 0 240 240" aria-hidden="true">
                      <circle className="timer-ring-track" cx="120" cy="120" r="104" />
                      <circle className="timer-ring-progress" cx="120" cy="120" r="104" strokeDasharray={timerCircumference} strokeDashoffset={timerCircumference * timerProgress} />
                    </svg>
                    <div className="timer-readout">
                      <span className="timer-small-label">{timerMode === 'focus' ? 'TIME TO FOCUS' : 'TAKE A BREATH'}</span>
                      <strong aria-live="polite">{formatDuration(secondsLeft)}</strong>
                      <span className="timer-focus-tag"><span /> {data.session ? activeSession ? 'IN PROGRESS' : 'PAUSED' : 'READY'}</span>
                    </div>
                  </div>
                  <div className="timer-motivation"><Sparkles size={13} /> {timerMode === 'focus' ? 'One thing at a time. You’ve got this.' : 'Rest is part of getting stronger.'}</div>
                </div>
                <div className="timer-controls">
                  <div className="timer-presets" aria-label="Focus duration">
                    {FOCUS_PRESETS.map((minutes) => <button key={minutes} className={`preset-button ${focusMinutes === minutes ? 'preset-active' : ''}`} onClick={() => { if (!data.session) setFocusMinutes(minutes); }} disabled={Boolean(data.session)}>{minutes}<small>m</small></button>)}
                  </div>
                  <div className="timer-main-actions">
                    {activeSession
                      ? <button className="timer-start-button timer-pause-button" onClick={pauseTimer}><Pause size={17} fill="currentColor" /> Pause</button>
                      : <button className="timer-start-button" onClick={startTimer}><Play size={16} fill="currentColor" /> {data.session ? 'Resume focus' : timerMode === 'focus' ? 'Start focus' : 'Start break'}</button>}
                    <button className="timer-reset-button" onClick={resetTimer} title="Reset timer" aria-label="Reset timer"><RotateCcw size={17} /></button>
                  </div>
                </div>
                <div className="timer-footer"><span><Shield size={13} /> YOUR TIMER SAVES AUTOMATICALLY</span><button onClick={() => setShowManualLog(!showManualLog)}>{showManualLog ? 'Hide quick log' : 'Log time already studied'} <ChevronRight size={13} /></button></div>
                {showManualLog && <form className="manual-log-form" onSubmit={(event) => { event.preventDefault(); logFocusMinutes(manualMinutes); }}>
                  <div><strong>Log a past focus block</strong><small>Missed the timer? Add your study time here.</small></div>
                  <label className="manual-input-wrap"><input type="number" min="1" max="240" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} placeholder="25" aria-label="Minutes studied" /><span>MIN</span></label>
                  <button className="manual-log-button" type="submit"><Plus size={14} /> Add focus</button>
                </form>}
              </section>

              <section className="panel tasks-panel" id="tasks">
                <div className="panel-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-violet"><ListChecks size={17} /></span><div><h3>Today's missions</h3><p>Choose your next small win.</p></div></div>
                  <span className="task-count-pill">{data.tasks.filter((task) => task.done).length}/{data.tasks.length} DONE</span>
                </div>
                <form className="task-input-row" onSubmit={addTask}>
                  <span className="task-input-plus"><Plus size={17} /></span>
                  <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Add a task you want to finish…" aria-label="New task" maxLength={120} />
                  <button type="submit" disabled={!newTask.trim()} aria-label="Add task"><ArrowRight size={17} /></button>
                </form>
                {currentTasks.length > 0 ? <ul className="task-list">
                  {currentTasks.map((task) => <li className={`task-row ${task.done ? 'task-done' : ''}`} key={task.id}>
                    <button className="task-check" onClick={() => toggleTask(task.id)} aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>{task.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}</button>
                    <span className="task-title">{task.title}</span>
                    <span className="task-xp">{task.rewarded ? 'CLEARED' : '+15 XP'}</span>
                    <button className="task-delete" onClick={() => deleteTask(task.id)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>
                  </li>)}
                </ul> : <div className="task-empty">
                  <div className="empty-sigil"><Target size={18} /></div><strong>Your list is clear.</strong><span>Add a mission above or pick a quick start:</span>
                  <div className="task-suggestions">{['Review my notes', 'Do 5 practice questions', 'Plan tomorrow'].map((suggestion) => <button key={suggestion} onClick={() => addSuggestedTask(suggestion)}><Plus size={12} />{suggestion}</button>)}</div>
                </div>}
                <div className="task-panel-foot"><span><Zap size={12} /> Each mission is worth 15 XP the first time you clear it.</span><span>PRIVATE TO THIS DEVICE</span></div>
              </section>
            </div>

            <div className="side-column">
              <section className="panel mission-panel" id="missions">
                <div className="panel-heading">
                  <div className="panel-title-group"><span className="panel-icon panel-icon-orange"><Target size={17} /></span><div><h3>Daily directives</h3><p>Complete these for bonus rewards.</p></div></div>
                  <span className="reset-chip"><span /> RESETS DAILY</span>
                </div>
                <div className="directive-list">
                  {missions.map((mission, index) => {
                    const Icon = mission.icon;
                    const progress = mission.progress / mission.goal;
                    const claimed = (todaysLog.claimedQuests || []).includes(mission.id);
                    const complete = progress >= 1;
                    return <article className={`directive ${complete ? 'directive-complete' : ''}`} key={mission.id}>
                      <div className="directive-top"><span className={`directive-icon directive-icon-${index}`}><Icon size={15} /></span><div className="directive-copy"><strong>{mission.title}</strong><small>{mission.detail}</small></div><span className="directive-reward"><Zap size={12} />{mission.reward}</span></div>
                      <div className="directive-bottom"><div className="directive-meter"><span style={{ width: `${Math.min(progress * 100, 100)}%` }} /></div><span className="directive-progress">{mission.format(mission.progress, mission.goal)}</span></div>
                      {complete && <button className={`claim-button ${claimed ? 'claim-button-done' : ''}`} onClick={() => claimMission(mission)} disabled={claimed}>{claimed ? <><Check size={13} /> REWARD CLAIMED</> : <>CLAIM REWARD <ArrowRight size={13} /></>}</button>}
                    </article>;
                  })}
                </div>
                <div className="mission-footer"><Sparkles size={13} /><span>Rewards are yours to claim when you finish.</span></div>
              </section>

              <section className="panel level-panel">
                <div className="panel-heading level-panel-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-gold"><Award size={17} /></span><div><h3>Player status</h3><p>Your progress, at a glance.</p></div></div><span className="rank-label">RANK {rank}</span></div>
                <div className="level-identity"><div className="level-emblem"><span>{rank}</span><div /></div><div className="level-info"><span>HUNTER LEVEL</span><strong>{String(player.level).padStart(2, '0')} <small>LVL</small></strong><small className="level-role">{rank === 'E' ? 'Newly Awakened' : 'Rising Hunter'}</small></div><div className="level-spark"><Sparkles size={14} /></div></div>
                <div className="xp-track-heading"><span>EXPERIENCE</span><span>{player.currentXp} <i>/</i> {player.nextLevelXp} XP</span></div>
                <div className="xp-track"><span style={{ width: `${Math.min((player.currentXp / player.nextLevelXp) * 100, 100)}%` }} /></div>
                <div className="xp-track-note"><span>{player.nextLevelXp - player.currentXp} XP to level {player.level + 1}</span><span><Coins size={12} /> {data.coins} G</span></div>
              </section>

              <section className="panel week-panel" id="progress">
                <div className="panel-heading week-heading"><div className="panel-title-group"><span className="panel-icon panel-icon-cyan"><Activity size={17} /></span><div><h3>Progress &amp; history</h3><p>Consistency beats intensity.</p></div></div><span className="week-total"><b>{Math.floor(weekDays.reduce((sum, day) => sum + day.seconds, 0) / 60)}</b><small>THIS WEEK · MIN</small></span></div>
                <div className="week-chart" aria-label="Focus minutes for the last seven days">
                  {weekDays.map((day) => {
                    const minutes = Math.floor(day.seconds / 60);
                    const height = minutes ? Math.max(8, (minutes / maxWeekMinutes) * 100) : 4;
                    const selected = day.key === today;
                    return <div className="week-day" key={day.key} title={`${day.date.toLocaleDateString()}: ${minutes} focus minutes`}>
                      <span className="week-value">{minutes || ''}</span>
                      <div className={`week-bar ${selected ? 'week-bar-today' : ''}`} style={{ height: `${height}%` }}><i /></div>
                      <span className={`week-day-label ${selected ? 'week-day-today' : ''}`}>{day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                    </div>;
                  })}
                </div>
                <div className="calendar-heading">
                  <span className="calendar-kicker">FOCUS CALENDAR</span>
                  <div className="calendar-month-switch">
                    <button onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Show previous month"><ChevronLeft size={14} /></button>
                    <strong>{calendarMonthLabel}</strong>
                    <button onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} disabled={viewingCurrentMonth} aria-label="Show next month"><ChevronRight size={14} /></button>
                  </div>
                  <span className="calendar-month-total"><b>{Math.floor(monthMinutes)}</b><small>MIN</small></span>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
                <div className="calendar-grid" aria-label={`${calendarMonthLabel} focus calendar`}>
                  {calendarCells.map((day, index) => day ? <button
                    key={day.key}
                    className={`calendar-day heat-${day.seconds === 0 ? 0 : day.seconds < 20 * 60 ? 1 : day.seconds < 45 * 60 ? 2 : day.seconds < 90 * 60 ? 3 : 4}${day.isToday ? ' calendar-day-today' : ''}${day.isFuture ? ' calendar-day-future' : ''}`}
                    title={`${day.date.toLocaleDateString()}: ${Math.floor(day.seconds / 60)} focus minutes`}
                    aria-label={`${day.date.toLocaleDateString(undefined, { dateStyle: 'full' })}, ${Math.floor(day.seconds / 60)} focus minutes`}
                    disabled={day.isFuture}
                  >{day.date.getDate()}</button> : <span key={`empty-${index}`} className="calendar-day calendar-day-empty" aria-hidden="true" />)}
                </div>
                <div className="heatmap-foot"><span>Each month starts on its real weekday.</span><span><Flame size={13} /> {streak} DAY STREAK</span></div>
              </section>
            </div>
          </section>

          <section className="closing-directive">
            <div className="closing-sigil"><Trophy size={20} /></div><div><strong>The strongest version of you is built in ordinary moments.</strong><span>Choose one task. Give it your attention. That's a level up.</span></div><button onClick={() => jumpTo('focus-room')}>Back to focus <ArrowRight size={15} /></button>
          </section>
          <footer className="page-footer"><span>SOLO/PROD <i>·</i> YOUR PERSONAL PLAYER SYSTEM</span><span>MADE FOR PROGRESS, NOT PERFECTION</span></footer>
        </div>
      </main>

      {profileOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
        <form className="profile-modal" onSubmit={saveName} role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <button className="modal-close" type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={17} /></button>
          <span className="modal-emblem"><UserRound size={21} /></span><div className="eyebrow modal-eyebrow">PLAYER CONFIGURATION</div><h2 id="profile-title">Your hunter profile</h2><p>Personalise the name shown in your command center.</p>
          <label className="profile-field"><span>PLAYER NAME</span><input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={24} placeholder="Enter your name" /></label>
          <button className="primary-cta modal-save" type="submit">Save profile <ArrowRight size={15} /></button>
          <span className="modal-storage"><Shield size={13} /> Your progress is stored in this browser.</span>
        </form>
      </div>}

      {toast && <div className="toast" role="status"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, note, tone }) {
  return <article className={`stat-card stat-${tone}`}><span className="stat-icon"><Icon size={16} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}<small>{suffix}</small></strong><span className="stat-note">{note}</span><span className="stat-edge" /></article>;
}

export default App;
