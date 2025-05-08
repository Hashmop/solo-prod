import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, BookOpen, Gamepad, Pause, RefreshCw, ChevronLeft, 
  ChevronRight, PlusCircle, Trash2, Edit, Check, User, X, Camera, Trophy, Star,
  Music, Skull, Gem, Coins, ScrollText, Ghost, Crosshair, Play, PlayCircle, Moon, Plus, VolumeX, Volume2, DollarSign, ArrowUpCircle, ExclamationMarkIcon
} from 'lucide-react';
import MusicPlayer from './MusicPlayer.jsx';

const ProductivityTracker = () => {
  // Shadow System
  const [shadows, setShadows] = useState(() => {
    const saved = localStorage.getItem('shadowArmy');
    return saved ? JSON.parse(saved) : [];
  });
  const [ariseCount, setAriseCount] = useState(() => {
    const saved = localStorage.getItem('ariseCount');
    return saved ? parseInt(saved) : 0;
  });
  const [shadowSlots, setShadowSlots] = useState(() => {
    const saved = localStorage.getItem('shadowSlots');
    return saved ? parseInt(saved) : 1;
  });
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('systemCurrency');
    return saved ? parseInt(saved) : 1000;
  });

  // Daily Quests
  const [dailyQuests, setDailyQuests] = useState([
    { 
      id: 1,
      title: "Dungeon Study Session",
      description: "Study for 1 hour in the Abyss",
      target: 3600,
      progress: 0,
      reward: { xp: 100, coins: 50 },
      completed: false
    },
    {
      id: 2,
      title: "Physical Training",
      description: "Complete 20 pushups",
      target: 20,
      progress: 0,
      reward: { xp: 50, coins: 25 },
      completed: false
    },
    {
      id: 3,
      title: "Mana Replenishment",
      description: "Drink 2 bottles of water",
      target: 2,
      progress: 0,
      reward: { xp: 30, coins: 15 },
      completed: false
    }
  ]);

  // Shadow Arise Mechanics
  const SHADOW_POOL = [
    {
      key: 'iggris',
      name: 'Igris',
      rank: 'Knight',
      rarity: 'Rare',
      baseBuffs: { xp: 0.10 },
      buffsPerLevel: { xp: 0.02 },
      description: 'Loyal knight. Increases XP gain.'
    },
    {
      key: 'beru',
      name: 'Beru',
      rank: 'Marshal',
      rarity: 'Legendary',
      baseBuffs: { xp: 0.15, studyEff: 0.05 },
      buffsPerLevel: { xp: 0.03, studyEff: 0.01 },
      description: 'Ant king. Boosts XP and study efficiency.'
    },
    {
      key: 'tusk',
      name: 'Tusk',
      rank: 'Mage',
      rarity: 'Epic',
      baseBuffs: { xp: 0.10, coins: 0.10 },
      buffsPerLevel: { xp: 0.02, coins: 0.02 },
      description: 'Orc shaman. Grants XP and bonus coins.'
    },
    {
      key: 'iron',
      name: 'Iron',
      rank: 'Tank',
      rarity: 'Rare',
      baseBuffs: { xp: 0.05, idle: 0.10 },
      buffsPerLevel: { xp: 0.01, idle: 0.02 },
      description: 'Steadfast knight. Turns idle time into XP.'
    },
    {
      key: 'fangs',
      name: 'Fangs',
      rank: 'Assassin',
      rarity: 'Uncommon',
      baseBuffs: { xp: 0.07, play: 0.05 },
      buffsPerLevel: { xp: 0.01, play: 0.01 },
      description: 'Silent killer. Makes playtime productive.'
    },
    {
      key: 'kaisel',
      name: 'Kaisel',
      rank: 'Mount',
      rarity: 'Epic',
      baseBuffs: { xp: 0.10, quest: 0.05 },
      buffsPerLevel: { xp: 0.02, quest: 0.01 },
      description: 'Flying wyvern. Helps finish tasks faster.'
    },
  ];
  const RARITY_COLORS = {
    Legendary: '#ffd700',
    Epic: '#a259ff',
    Rare: '#00f7ff',
    Uncommon: '#4ade80',
  };
  const MAX_SHADOW_LEVEL = 10;
  const LEVEL_UP_COST = lvl => 200 + lvl * 100;
  const BUFF_CAPS = { xp: 1.0, studyEff: 0.5, coins: 1.0, idle: 0.5, play: 0.5, quest: 0.5 };

  const getRandomShadowFromPool = () => {
    // Weighted by rarity
    const pool = [
      ...Array(1).fill(SHADOW_POOL[1]), // Beru (Legendary)
      ...Array(2).fill(SHADOW_POOL[2]), // Tusk (Epic)
      ...Array(2).fill(SHADOW_POOL[5]), // Kaisel (Epic)
      ...Array(4).fill(SHADOW_POOL[0]), // Igris (Rare)
      ...Array(4).fill(SHADOW_POOL[3]), // Iron (Rare)
      ...Array(7).fill(SHADOW_POOL[4]), // Fangs (Uncommon)
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // --- Unboxing Modal State ---
  const [unboxShadow, setUnboxShadow] = useState(null);

  // --- Update arise logic: one by one ---
  const attemptArise = () => {
    if (ariseCount === 0) {
      setAriseMessageType('error');
      setAriseMessage('You need to complete a Daily Gate to Arise a Shadow!');
      return;
    }
    if (shadows.length >= shadowSlots) {
      setAriseMessageType('error');
      setAriseMessage('No empty shadow slots!');
      return;
    }
    let newShadows = [...shadows];
    let shadowData = null;
    let tries = 0;
    while (tries < 10 && !shadowData) { // Try up to 10 times to get a non-duplicate
      if (Math.random() < 0.5) {
        const candidate = getRandomShadowFromPool();
        if (!newShadows.some(s => s.key === candidate.key)) {
          shadowData = {
            ...candidate,
            id: Date.now(),
            level: 1,
            obtained: new Date().toISOString(),
          };
        }
      }
      tries++;
    }
    if (shadowData) {
      setUnboxShadow(shadowData);
      setShadows(prev => [...prev, shadowData]);
      setAriseCount(prev => prev - 1);
    } else {
      setAriseMessageType('error');
      setAriseMessage('The Gate remains closed... Try again, Hunter!');
      setAriseCount(prev => prev - 1);
    }
  };

  // Update quest progress
  const updateQuestProgress = (questId, amount) => {
    setDailyQuests(prev => prev.map(quest => {
      if (quest.id === questId && !quest.completed) {
        const newProgress = quest.progress + amount;
        const completed = newProgress >= quest.target;
        
        if (completed) {
          setAriseCount(prev => prev + 1);
          setCurrency(prev => prev + quest.reward.coins);
          setXp(prev => prev + quest.reward.xp);
        }

        return {
          ...quest,
          progress: Math.min(newProgress, quest.target),
          completed
        };
      }
      return quest;
    }));
  };

  // Shop System
  const purchaseShadowSlot = () => {
    const cost = 500 + (shadowSlots * 250);
    if (currency >= cost) {
      setCurrency(prev => prev - cost);
      setShadowSlots(prev => prev + 1);
    }
  };

  const [manualTime, setManualTime] = useState({
    study: { minutes: '' },
    play: { minutes: '' },
    idle: { minutes: '' }
  });
  const handleManualInputChange = (type, field, value) => {
    setManualTime(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };
  
  
  // Update addManualTime to:
  const addManualTime = (type) => {
    const minutes = parseInt(manualTime[type].minutes) || 0;
    if (minutes > 0) {
      const totalSeconds = minutes * 60;
      
      setDailyTimers(prev => ({
        ...prev,
        [type]: prev[type] + totalSeconds
      }));
      
      setTotalTimers(prev => ({
        ...prev,
        [type]: prev[type] + totalSeconds
      }));
      // for study quest
      if (type === 'study') {
        updateQuestProgress(1, totalSeconds); // Update quest ID 1 (Study quest)
      }

      if (type === 'study') {
        const today = new Date().toISOString().split('T')[0];
        setHeatmapData(prev => 
          prev.map(item => 
            item.date === today
              ? { ...item, studyTime: item.studyTime + totalSeconds }
              : item
          )
        );
        updateLevel(totalSeconds);
      }

      setManualTime(prev => ({
        ...prev,
        [type]: { minutes: '' }
      }));
    }
  };


  // Timer States
  const [dailyTimers, setDailyTimers] = useState(() => {
    const saved = localStorage.getItem('productivityDailyTimers');
    return saved ? JSON.parse(saved) : { study: 0, play: 0, idle: 0 };
  });
  
  const [totalTimers, setTotalTimers] = useState(() => {
    const saved = localStorage.getItem('productivityTotalTimers');
    return saved ? JSON.parse(saved) : { study: 0, play: 0, idle: 0 };
  });

  const [activeTimer, setActiveTimer] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(() => {
    const saved = localStorage.getItem('lastResetDate');
    return saved ? new Date(saved) : new Date();
  });

  // Progression System
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('productivityLevel');
    return saved ? parseInt(saved) : 1;
  });
  
  const [xp, setXp] = useState(() => {
    const saved = localStorage.getItem('productivityXp');
    return saved ? parseInt(saved) : 0;
  });

  // Heatmap State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [heatmapData, setHeatmapData] = useState(() => {
    const saved = localStorage.getItem('productivityHeatmap');
    const parsedData = saved ? JSON.parse(saved) : [];
    
    // Get current month's data or initialize
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    return Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
      const date = new Date(currentYear, currentMonth, i + 1);
      const dateString = date.toISOString().split('T')[0];
      const existing = parsedData.find(d => d.date === dateString);
      return existing || { date: dateString, studyTime: 0 };
    });
  });

  // Todo List State
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('productivityTodos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);

  // Profile State
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('productivityUsername') || 'Productivity Pro';
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [profilePicture, setProfilePicture] = useState(() => {
    return localStorage.getItem('productivityProfilePic') || null;
  });
  //music
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);

  // --- NEW: For block hover/active effect ---
  const [hoveredBlock, setHoveredBlock] = useState(null);

  // --- NEW: Shadow slot cost ---
  const shadowSlotCost = 500 + (shadowSlots * 250);

  // Daily Reset Logic
  useEffect(() => {
    const checkDayChange = () => {
      const now = new Date();
      const lastReset = new Date(lastResetDate);
      
      if (now.toDateString() !== lastReset.toDateString()) {
        setTotalTimers(prev => ({
          study: prev.study + dailyTimers.study,
          play: prev.play + dailyTimers.play,
          idle: prev.idle + dailyTimers.idle,
        }));
        setDailyTimers({ study: 0, play: 0, idle: 0 });
        setLastResetDate(new Date());
      }
    };

    const interval = setInterval(checkDayChange, 60000);
    return () => clearInterval(interval);
  }, [lastResetDate, dailyTimers]);

  // Active Timer Effect
  useEffect(() => {
    let timer;
    if (activeTimer) {
      timer = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTimer]);
  // shadow and currency
useEffect(() => localStorage.setItem('shadowArmy', JSON.stringify(shadows)), [shadows]);
useEffect(() => localStorage.setItem('shadowSlots', shadowSlots), [shadowSlots]);
useEffect(() => localStorage.setItem('systemCurrency', currency), [currency]);

useEffect(() => {
  const updateHeatmapData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    setHeatmapData(prev => {
      const newData = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(year, month, i + 1);
        const dateString = date.toISOString().split('T')[0];
        const existing = prev.find(d => d.date === dateString) || 
                         JSON.parse(localStorage.getItem('productivityHeatmap'))?.find(d => d.date === dateString) || 
                         { date: dateString, studyTime: 0 };
        return existing;
      });
      return newData;
    });
  };
  
  updateHeatmapData();
}, [currentMonth]);

  // Persistence Effects
  useEffect(() => localStorage.setItem('productivityDailyTimers', JSON.stringify(dailyTimers)), [dailyTimers]);
  useEffect(() => localStorage.setItem('productivityTotalTimers', JSON.stringify(totalTimers)), [totalTimers]);
  useEffect(() => localStorage.setItem('lastResetDate', lastResetDate.toISOString()), [lastResetDate]);
  useEffect(() => localStorage.setItem('productivityHeatmap', JSON.stringify(heatmapData)), [heatmapData]);
  useEffect(() => localStorage.setItem('productivityTodos', JSON.stringify(todos)), [todos]);
  useEffect(() => localStorage.setItem('productivityUsername', username), [username]);
  useEffect(() => {
    if (profilePicture) localStorage.setItem('productivityProfilePic', profilePicture);
  }, [profilePicture]);
  useEffect(() => {
    localStorage.setItem('productivityLevel', level);
    localStorage.setItem('productivityXp', xp);
  }, [level, xp]);

  // --- Level calculation: always derive from XP ---
  useEffect(() => {
    const newLevel = Math.floor(xp / 3600) + 1;
    if (newLevel !== level) setLevel(newLevel);
  }, [xp]);

  // --- Persist ariseCount in localStorage ---
  useEffect(() => {
    localStorage.setItem('ariseCount', ariseCount);
  }, [ariseCount]);

  // Helper Functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}m` : null,
      `${remainingSeconds}s`
    ].filter(Boolean).join(' ');
  };

  const calculateProductivity = (timers) => {
    const { study, play } = timers;
    const totalTime = study + play;
    return totalTime > 0 ? Math.round((study / totalTime) * 100) : 0;
  };

  const calculateXpPercentage = () => ((xp % 3600) / 3600 * 100).toFixed(1);

  // Timer Controls
  const startTimer = (type) => {
    if (activeTimer === type) {
      // Log the time and stop the timer
      setDailyTimers(prev => ({
        ...prev,
        [activeTimer]: prev[activeTimer] + currentTime
      }));
      if (activeTimer === 'study') {
        updateQuestProgress(1, currentTime);
        const today = new Date().toISOString().split('T')[0];
        setHeatmapData(prev =>
          prev.map(item =>
            item.date === today
              ? { ...item, studyTime: item.studyTime + currentTime }
              : item
          )
        );
        updateLevel(currentTime);
      }
      setCurrentTime(0);
      setActiveTimer(null);
      return;
    }
    // Switch to new activity, keep timer running from currentTime
    setActiveTimer(type);
  };

  const stopTimer = () => {
    if (activeTimer) {
      setDailyTimers(prev => ({
        ...prev,
        [activeTimer]: prev[activeTimer] + currentTime
      }));

      if (activeTimer === 'study') {

        // quest progress update
        updateQuestProgress(1, currentTime); // Update study quest
        
        const today = new Date().toISOString().split('T')[0];
        setHeatmapData(prev => 
          prev.map(item => 
            item.date === today
              ? { ...item, studyTime: item.studyTime + currentTime }
              : item
          )
        );
        updateLevel(currentTime);
      }
      
      setActiveTimer(null);
      setCurrentTime(0);
    }
  };

  const resetTimer = () => {
    setActiveTimer(null);
    setCurrentTime(0);
  };

  // Progression System
  const updateLevel = (studySeconds) => {
    // Calculate total XP buff from all shadows (base + per level)
    const xpBonus = shadows.reduce((sum, s) => {
      const base = s.baseBuffs?.xp || 0;
      const perLvl = s.buffsPerLevel?.xp || 0;
      return sum + base + perLvl * (s.level - 1);
    }, 0);
    const totalXp = xp + studySeconds * (1 + xpBonus);
    setXp(totalXp);
  };

  // --- NEW: Role/rank system ---
  const ranks = [
    { min: 100, name: 'National Level Hunter', color: '#ff6b35' },
    { min: 80, name: 'S-Rank Hunter', color: '#d100d1' },
    { min: 60, name: 'A-Rank Hunter', color: '#4169E1' },
    { min: 40, name: 'B-Rank Hunter', color: '#FF6347' },
    { min: 20, name: 'C-Rank Hunter', color: '#FFD700' },
    { min: 10, name: 'D-Rank Hunter', color: '#ADFF2F' },
    { min: 1, name: 'E-Rank Hunter', color: '#90EE90' },
    { min: 0, name: 'Civilian', color: '#666' },
  ];
  const getRank = (level) => ranks.find(r => level >= r.min) || ranks[ranks.length - 1];

  const [playerAccepted, setPlayerAccepted] = useState(() => {
    const saved = localStorage.getItem('playerAccepted');
    return saved ? JSON.parse(saved) : false;
  });
  const [notification, setNotification] = useState(null);
  const prevLevel = useRef(level);
  const prevRank = useRef(getRank(level).name);

  // --- Show initial Player modal ---
  useEffect(() => {
    if (!playerAccepted) {
      setNotification({
        type: 'player',
        message: 'You have acquired the qualifications to be a Player. Will you accept?',
      });
    }
  }, [playerAccepted]);

  // --- Show notification on level up or rank change ---
  useEffect(() => {
    const newRank = getRank(level).name;
    if (level > prevLevel.current) {
      setNotification({
        type: 'level',
        message: `Level Up!\nYou are now Level ${level}.`,
      });
    }
    if (newRank !== prevRank.current) {
      setNotification({
        type: 'rank',
        message: `Your rank has changed to ${newRank}!`,
      });
      prevRank.current = newRank;
    }
    prevLevel.current = level;
  }, [level]);

  // --- Accept Player modal handler ---
  const handleAcceptPlayer = () => {
    setPlayerAccepted(true);
    localStorage.setItem('playerAccepted', 'true');
    setNotification(null);
  };

  // --- Notification Modal component ---
  const NotificationModal = ({ type, message, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative w-full max-w-md mx-auto rounded-xl border-2 border-[#00f7ff] bg-[#0a0a1a] shadow-2xl p-0 overflow-hidden" style={{ boxShadow: '0 0 40px #00f7ff55' }}>
        <div className="flex flex-col items-center p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full border-2 border-[#00f7ff] p-2"><ExclamationMarkIcon /></div>
            <span className="text-[#00f7ff] text-2xl font-bold tracking-widest">NOTIFICATION</span>
          </div>
          <div className="text-[#b8eaff] text-center whitespace-pre-line text-lg mb-6">{message}</div>
          {type === 'player' && (
            <button
              onClick={handleAcceptPlayer}
              className="px-6 py-2 rounded bg-[#00f7ff] text-[#0a0a1a] font-bold text-lg shadow hover:bg-[#00e6e6] transition"
            >
              Accept
            </button>
          )}
          {type !== 'player' && (
            <button
              onClick={onClose}
              className="px-6 py-2 rounded bg-[#00f7ff] text-[#0a0a1a] font-bold text-lg shadow hover:bg-[#00e6e6] transition"
            >
              Close
            </button>
          )}
        </div>
        <div className="absolute inset-0 pointer-events-none">
          {/* Neon border SVG overlay for extra Solo Leveling effect */}
          <svg width="100%" height="100%" className="absolute inset-0 w-full h-full">
            <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)" rx="24" fill="none" stroke="#00f7ff" strokeWidth="2" opacity="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );

  // --- Exclamation icon for modal ---
  function ExclamationMarkIcon() {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f7ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16" r="1.2" /></svg>
    );
  }

  // Heatmap Functions
  const getHeatmapColor = (studySeconds) => {
    return '#1a1a2b';
  };

  const renderHeatmap = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    return [
      ...Array(firstDay).fill().map((_, i) => (
        <div key={`empty-${i}`} className="w-10 h-10 m-1 bg-transparent" />
      )),
      ...Array(daysInMonth).fill().map((_, i) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
        const dateString = date.toISOString().split('T')[0];
        const dayData = heatmapData.find(d => d.date === dateString);
        const studyHours = Math.round((dayData?.studyTime || 0) / 3600);
        return (
          <div
            key={i + 1}
            className="w-10 h-10 m-1 rounded-lg border border-[#00f7ff]/30 bg-[#1a1a2b] flex items-center justify-center transition-all duration-200 hover:scale-105 hover:border-[#00f7ff] hover:shadow-[0_0_12px_2px_rgba(0,247,255,0.10)]"
            title={`${dateString}\nStudied: ${studyHours} hour${studyHours !== 1 ? 's' : ''}`}
          >
            <span className="text-white text-sm font-bold">{i + 1}</span>
          </div>
        );
      })
    ];
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction));
  };

  // Todo Functions
  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { 
        id: Date.now(), 
        text: newTodo.trim(), 
        completed: false 
      }]);
      setNewTodo('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      editingTodoId ? updateTodo() : addTodo();
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const updateTodo = () => {
    if (newTodo.trim()) {
      setTodos(todos.map(todo => 
        todo.id === editingTodoId 
          ? { ...todo, text: newTodo.trim() }
          : todo
      ));
      setNewTodo('');
      setEditingTodoId(null);
    }
  };

  const startEditTodo = (todo) => {
    setNewTodo(todo.text);
    setEditingTodoId(todo.id);
  };

  // Add new component implementations:
  const DailyQuests = ({ quests, updateQuestProgress, ariseCount, attemptArise }) => (
    <div className="bg-system-secondary p-6 rounded-xl border border-system-accent/30">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="text-system-accent" size={28} />
        <h2 className="text-2xl font-bold glow">DAILY GATES</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-dungeon-accent">{ariseCount}</span>
          <button
            onClick={attemptArise}
            className="bg-dungeon-accent/90 hover:bg-dungeon-accent p-2 rounded-lg"
          >
            <Ghost size={24} />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`bg-dungeon-primary/50 p-4 rounded-lg flex flex-col gap-2 transition-all duration-200 border border-transparent hover:scale-105 hover:border-[#00f7ff] hover:shadow-[0_0_24px_4px_rgba(0,247,255,0.15)]`}
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                className={`p-2 rounded-full border-2 flex items-center justify-center transition-all duration-200
                  ${quest.completed ? 'bg-green-900/50 border-green-400 text-green-300 cursor-not-allowed' : 'bg-dungeon-secondary border-[#00f7ff]/40 text-[#00f7ff] hover:bg-[#00f7ff]/10 hover:border-[#00f7ff] hover:scale-110 cursor-pointer'}`}
                disabled={quest.completed}
                onClick={() => !quest.completed && updateQuestProgress(quest.id, quest.target - quest.progress)}
                title={quest.completed ? 'Completed' : 'Mark as complete'}
                style={{ minWidth: 40, minHeight: 40 }}
              >
                {quest.completed ? <Check size={20} /> : <Crosshair size={20} />}
              </button>
              <div>
                <h3 className="font-bold">{quest.title}</h3>
                <p className="text-sm text-dungeon-text/70">{quest.description}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-[#00f7ff] font-bold">{quest.progress}/{quest.target}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-dungeon-primary h-2 rounded-full">
                <div
                  className="h-full bg-dungeon-accent rounded-full transition-all"
                  style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Shadow Odds Tooltip ---
  const shadowOdds = [
    { name: 'Beru', rarity: 'Legendary', percent: 1 },
    { name: 'Tusk', rarity: 'Epic', percent: 2 },
    { name: 'Kaisel', rarity: 'Epic', percent: 2 },
    { name: 'Igris', rarity: 'Rare', percent: 4 },
    { name: 'Iron', rarity: 'Rare', percent: 4 },
    { name: 'Fangs', rarity: 'Uncommon', percent: 7 },
  ];
  const getShadowOddsTooltip = () => (
    <div className="bg-[#0a2233] border-2 border-[#00f7ff] rounded-lg px-4 py-2 shadow-lg z-50 min-w-[220px] text-center animate-fade-in">
      <div className="text-[#00f7ff] font-bold mb-2">Shadow Summon Odds</div>
      {shadowOdds.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-sm mb-1">
          <span className="font-bold" style={{ color: RARITY_COLORS[s.rarity] }}>{s.name}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: RARITY_COLORS[s.rarity], color: '#0a0a1a' }}>{s.rarity}</span>
          <span className="ml-2 text-[#b8eaff]">{s.percent}%</span>
        </div>
      ))}
    </div>
  );

  // --- Update ShadowInventory UI: add odds tooltip icon ---
  const [showOdds, setShowOdds] = useState(false);
  const ShadowInventory = ({ shadows, shadowSlots, currency, purchaseShadowSlot }) => (
    <div className="bg-system-secondary p-6 rounded-xl border border-system-accent/30">
      <div className="flex items-center gap-3 mb-6">
        <Skull className="text-system-accent" size={28} />
        <h2 className="text-2xl font-bold glow flex items-center gap-2">SHADOW ARMY
          <span
            className="ml-2 cursor-pointer relative"
            onMouseEnter={() => setShowOdds(true)}
            onMouseLeave={() => setShowOdds(false)}
          >
            <span className="inline-block w-5 h-5 rounded-full bg-[#00f7ff]/20 border border-[#00f7ff] flex items-center justify-center text-[#00f7ff] font-bold text-xs">?</span>
            {showOdds && (
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50">{getShadowOddsTooltip()}</span>
            )}
          </span>
        </h2>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Coins size={20} />
            <span>{currency}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[...Array(shadowSlots)].map((_, i) => (
          <div
            key={i}
            className={`bg-[#1a1a2b] text-[#00f7ff] rounded-lg p-4 cursor-pointer transition-all duration-200 select-none flex flex-col items-center justify-center border border-transparent ${activeTimer === i ? 'bg-[#083A48] border-2 border-[#00f7ff] shadow-[0_0_32px_8px_rgba(0,247,255,0.35)] scale-105' : 'hover:scale-105 hover:border-[#00f7ff] hover:shadow-[0_0_24px_4px_rgba(0,247,255,0.15)]'}`}
            onClick={() => startTimer(i)}
            onMouseEnter={() => setHoveredBlock(i)}
            onMouseLeave={() => setHoveredBlock(null)}
            style={{ minHeight: 140, minWidth: 0 }}
          >
            {shadows[i] ? (
              <>
                {/* Remove button, visible on hover */}
                <button
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-[#1a1a2b] border border-[#00f7ff]/40 text-[#00f7ff] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ff4650] hover:text-white hover:border-[#ff4650]"
                  style={{ boxShadow: '0 0 8px 2px #00f7ff22' }}
                  title="Remove Shadow"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeShadow(i);
                  }}
                >
                  <X size={16} />
                </button>
                <Ghost size={36} className="text-[#00f7ff] group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#00f7ff] transition-all duration-200" />
                {hoveredBlock === i && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-[#0a2233] border-2 border-[#00f7ff] rounded-lg px-4 py-2 shadow-lg z-20 min-w-[220px] text-center animate-fade-in">
                    <div className="text-2xl font-bold mb-1 tracking-wider" style={{ color: RARITY_COLORS[shadows[i].rarity] }}>{shadows[i].name}</div>
                    <div className="mb-1 px-2 py-0.5 rounded-full text-xs font-bold inline-block" style={{ background: RARITY_COLORS[shadows[i].rarity], color: '#0a0a1a' }}>{shadows[i].rarity}</div>
                    <div className="text-[#b8eaff] text-sm mb-1">{shadows[i].rank} &bull; Lv. {shadows[i].level}</div>
                    <div className="flex flex-col gap-1 mb-1">
                      {Object.entries(shadows[i].baseBuffs).map(([buff, val]) => (
                        <div key={buff} className="flex items-center gap-2 text-xs">
                          <span className="font-bold" style={{ color: '#00f7ff' }}>+
                            {Math.round((val + (shadows[i].buffsPerLevel?.[buff] || 0) * (shadows[i].level - 1)) * 100)}%
                          </span>
                          <span className="text-[#b8eaff]" title={
                            buff === 'xp' ? 'XP Gain: Increases all XP earned.' :
                            buff === 'studyEff' ? 'Study Timer Efficiency: Each second of study counts for more.' :
                            buff === 'coins' ? 'Bonus Coins: More coins from quests.' :
                            buff === 'idle' ? 'Idle Conversion: Idle time gives XP.' :
                            buff === 'play' ? 'Play Conversion: Play time gives XP.' :
                            buff === 'quest' ? 'Quest Speed: Complete quests faster.' :
                            ''
                          }>
                            {buff === 'xp' ? 'XP Gain' :
                             buff === 'studyEff' ? 'Study Efficiency' :
                             buff === 'coins' ? 'Bonus Coins' :
                             buff === 'idle' ? 'Idle→XP' :
                             buff === 'play' ? 'Play→XP' :
                             buff === 'quest' ? 'Quest Speed' :
                             buff}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-[#b8eaff] italic mb-1 text-center">{shadows[i].description}</div>
                    <div className="flex items-center gap-2 justify-center mt-2">
                      <span className="text-sm font-bold">Lv. {shadows[i].level}</span>
                      <button
                        className={`ml-2 px-2 py-1 rounded bg-[#00f7ff] text-[#0a0a1a] text-xs font-bold shadow hover:bg-[#00e6e6] transition ${shadows[i].level >= MAX_SHADOW_LEVEL || currency < LEVEL_UP_COST(shadows[i].level) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={shadows[i].level >= MAX_SHADOW_LEVEL || currency < LEVEL_UP_COST(shadows[i].level)}
                        onClick={(e) => {
                          e.stopPropagation();
                          levelUpShadow(i);
                        }}
                        title={shadows[i].level >= MAX_SHADOW_LEVEL ? 'Max Level' : currency < LEVEL_UP_COST(shadows[i].level) ? 'Not enough coins' : `Level Up (${LEVEL_UP_COST(shadows[i].level)} coins)`}
                      >
                        Level Up
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Ghost className="text-[#00f7ff]/30 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#00f7ff] transition-all duration-200" size={36} />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={purchaseShadowSlot}
        className="w-full bg-dungeon-accent/90 hover:bg-dungeon-accent p-2 rounded-lg flex items-center justify-center gap-2"
      >
        <Gem size={18} />
        Purchase Shadow Slot ({500 + (shadowSlots * 250)} Coins)
      </button>
    </div>
  );


  // Profile Components
  const ProfileModal = () => {
    const totalProductivity = calculateProductivity(totalTimers);
    const totalStudyHours = Math.floor(totalTimers.study / 3600);
    const currentTitle = getRank(level);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-system-primary rounded-2xl w-11/12 max-w-2xl p-8 relative border border-system-accent">
          <button 
            onClick={() => setIsProfileOpen(false)}
            className="absolute top-4 right-4 text-gray-300 hover:text-white"
          >
            <X size={28} />
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div className="relative group mx-auto w-40 h-40">
                <div className="w-full h-full rounded-full border-4 border-cyan-500 overflow-hidden">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      key={profilePicture}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <User className="w-20 h-20 text-gray-500" />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="profile-pic-upload"
                  className="absolute bottom-0 right-0 bg-cyan-600 p-2 rounded-full cursor-pointer hover:bg-cyan-500"
                >
                  <Camera size={20} className="text-white" />
                  <input 
                    type="file" 
                    id="profile-pic-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                  />
                </label>
              </div>

              <div className="text-center">
                {isEditingUsername ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none"
                      autoFocus
                      maxLength={20}
                    />
                    <button
                      onClick={() => setIsEditingUsername(false)}
                      className="bg-cyan-600 text-white p-2 rounded-lg"
                    >
                      <Check />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{username}</h2>
                      <button
                        onClick={() => setIsEditingUsername(true)}
                        className="text-gray-400 hover:text-cyan-300"
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800/50"
                      style={{ color: currentTitle.color }}
                    >
                      {currentTitle.name}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-700 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="text-amber-400" />
                  <h3 className="text-xl font-semibold">Level {level}</h3>
                </div>
                <div className="relative pt-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-cyan-400">Progress</span>
                    <span className="text-cyan-400">{calculateXpPercentage()}%</span>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 rounded-full bg-gray-800">
                    <div
                      style={{ width: `${calculateXpPercentage()}%` }}
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Star className="text-cyan-400" /> Lifetime Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard 
                    title="Total Study" 
                    value={formatTime(totalTimers.study)} 
                    icon={<BookOpen className="text-cyan-400" />}
                  />
                  <StatCard 
                    title="Total Play" 
                    value={formatTime(totalTimers.play)} 
                    icon={<Gamepad className="text-green-400" />}
                  />
                  <StatCard 
                    title="Productivity" 
                    value={`${totalProductivity}%`} 
                    icon={<Clock className="text-purple-400" />}
                  />
                </div>
                
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, icon }) => (
    <div className="bg-gray-700 p-3 rounded-lg flex items-center gap-3 min-w-0">
      <div className="p-2 bg-gray-800 rounded-lg shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-400 truncate">{title}</p>
        <p className="text-lg font-bold truncate">{value}</p>
      </div>
    </div>
  );

  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setProfilePicture(reader.result);
          localStorage.setItem('productivityProfilePic', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const currentTitle = getRank(level);

  // --- NEW: Neon block style helper ---
  const neonBlock = (type) =>
    `system-panel p-4 cursor-pointer transition-all duration-200 select-none flex flex-col items-center justify-center ` +
    (activeTimer === type
      ? 'border-2 border-[#00f7ff] shadow-[0_0_24px_4px_rgba(0,247,255,0.8)] bg-[#00f7ff]/10 scale-105 z-10'
      : hoveredBlock === type
        ? 'border-2 border-[#00f7ff] shadow-[0_0_12px_2px_rgba(0,247,255,0.4)] bg-[#00f7ff]/5 scale-105'
        : 'border border-[#00f7ff]/20');

  // --- NEW: Pause handler logs time, deselects activity, and hides buttons ---
  const handlePause = () => {
    if (activeTimer) {
      setDailyTimers(prev => ({
        ...prev,
        [activeTimer]: prev[activeTimer] + currentTime
      }));
      if (activeTimer === 'study') {
        updateQuestProgress(1, currentTime);
        const today = new Date().toISOString().split('T')[0];
        setHeatmapData(prev =>
          prev.map(item =>
            item.date === today
              ? { ...item, studyTime: item.studyTime + currentTime }
              : item
          )
        );
        updateLevel(currentTime);
      }
      setActiveTimer(null);
      setCurrentTime(0);
    }
  };

  // --- NEW: Activity color helper: selected block uses same lighter blue as todo hover ---
  const activityBg = (type) =>
    activeTimer === type
      ? 'bg-[#00f7ff]/20 text-[#00f7ff] shadow-[0_0_32px_6px_rgba(0,247,255,0.35)]'
      : hoveredBlock === type
        ? 'bg-[#193a4d]/40 text-[#00f7ff] shadow-[0_0_12px_2px_rgba(0,247,255,0.10)]'
        : 'bg-[#1a1a2b] text-[#00f7ff] hover:bg-[#193a4d]/40 transition-colors';

  // --- NEW: Arise message state ---
  const [ariseMessage, setAriseMessage] = useState(null);
  const [ariseMessageType, setAriseMessageType] = useState('info');

  // Add state for hovered shadow index
  const [hoveredShadow, setHoveredShadow] = useState(null);

  // --- Shadow Level Up ---
  const levelUpShadow = idx => {
    setShadows(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      if (s.level >= MAX_SHADOW_LEVEL) return s;
      if (currency < LEVEL_UP_COST(s.level)) return s;
      setCurrency(c => c - LEVEL_UP_COST(s.level));
      setAriseMessageType('success');
      setAriseMessage(`${s.name} leveled up! Now Level ${s.level + 1}`);
      return { ...s, level: s.level + 1 };
    }));
  };

  // --- Calculate total buffs (with caps) ---
  const getTotalBuffs = () => {
    const total = { xp: 0, studyEff: 0, coins: 0, idle: 0, play: 0, quest: 0 };
    for (const s of shadows) {
      for (const k in total) {
        const base = s.baseBuffs?.[k] || 0;
        const perLvl = s.buffsPerLevel?.[k] || 0;
        total[k] += base + perLvl * (s.level - 1);
      }
    }
    for (const k in total) total[k] = Math.min(total[k], BUFF_CAPS[k]);
    return total;
  };

  // --- Unboxing Modal UI ---
  const UnboxModal = ({ shadow, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fade-in">
      <div className="relative w-full max-w-xs mx-auto rounded-2xl border-4 border-[#00f7ff] bg-[#0a0a1a] shadow-2xl p-0 overflow-hidden animate-pulse" style={{ boxShadow: '0 0 60px #00f7ff88' }}>
        <div className="flex flex-col items-center p-8 animate-fade-in">
          <div className="mb-4 animate-bounce">
            <Ghost size={48} className="text-[#00f7ff] drop-shadow-glow" />
          </div>
          <div className="text-2xl font-bold mb-2 tracking-wider" style={{ color: RARITY_COLORS[shadow.rarity] }}>{shadow.name}</div>
          <div className="mb-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: RARITY_COLORS[shadow.rarity], color: '#0a0a1a' }}>{shadow.rarity}</div>
          <div className="text-[#b8eaff] text-sm mb-2">{shadow.rank}</div>
          <div className="flex flex-col gap-1 mb-2">
            {Object.entries(shadow.baseBuffs).map(([buff, val]) => (
              <div key={buff} className="flex items-center gap-2 text-xs">
                <span className="font-bold" style={{ color: '#00f7ff' }}>+
                  {Math.round(val * 100)}%
                </span>
                <span className="text-[#b8eaff]" title={
                  buff === 'xp' ? 'XP Gain: Increases all XP earned.' :
                  buff === 'studyEff' ? 'Study Timer Efficiency: Each second of study counts for more.' :
                  buff === 'coins' ? 'Bonus Coins: More coins from quests.' :
                  buff === 'idle' ? 'Idle Conversion: Idle time gives XP.' :
                  buff === 'play' ? 'Play Conversion: Play time gives XP.' :
                  buff === 'quest' ? 'Quest Speed: Complete quests faster.' :
                  ''
                }>
                  {buff === 'xp' ? 'XP Gain' :
                   buff === 'studyEff' ? 'Study Efficiency' :
                   buff === 'coins' ? 'Bonus Coins' :
                   buff === 'idle' ? 'Idle→XP' :
                   buff === 'play' ? 'Play→XP' :
                   buff === 'quest' ? 'Quest Speed' :
                   buff}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-[#b8eaff] italic mb-4 text-center">{shadow.description}</div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-[#00f7ff] text-[#0a0a1a] font-bold text-lg shadow hover:bg-[#00e6e6] transition mt-2"
          >
            Continue
          </button>
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" className="absolute inset-0 w-full h-full">
            <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)" rx="24" fill="none" stroke="#00f7ff" strokeWidth="2" opacity="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );

  // --- Remove shadow function ---
  const removeShadow = idx => {
    setShadows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-6 max-w-6xl mx-auto font-mono text-[#00f7ff]">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 border-b border-[#00f7ff]/20 pb-4">
        <h1 className="text-4xl font-bold glow-text">THE SYSTEM</h1>
        <div className="flex items-center gap-6">
          {/* --- NEW: Show total money --- */}
          <div className="flex items-center gap-2 text-xl font-bold text-[#00f7ff] bg-[#001a1a] px-4 py-2 rounded-lg border border-[#00f7ff]/40">
            <DollarSign className="w-6 h-6" />
            {currency}
          </div>
          <div className="text-xl">
            <span className="ml-3 px-3 py-1 rounded-full border border-[#00f7ff]/40 text-sm font-bold" style={{ color: getRank(level).color }}>{getRank(level).name}</span>
          </div>
          {/* --- Show profile picture in header, update with state --- */}
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="p-1 hover:bg-[#00f7ff]/10 rounded-full"
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-[#00f7ff]"
                key={profilePicture}
              />
            ) : (
            <User className="w-8 h-8" />
            )}
          </button>
        </div>
      </div>
  
      {/* After the header section, add a glowing level bar: */}
      <div className="w-full flex flex-col items-center mb-8">
        <div className="w-full max-w-2xl px-4">
          <div className="relative h-5 bg-[#0a2233] rounded-full overflow-hidden border-2 border-[#00f7ff]/40 shadow-[0_0_16px_2px_rgba(0,247,255,0.25)]">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00f7ff] to-[#00bfff] rounded-full shadow-[0_0_24px_8px_rgba(0,247,255,0.4)] transition-all duration-500"
              style={{ width: `${calculateXpPercentage()}%` }}
            ></div>
            <div className="relative z-10 flex justify-between items-center h-full px-3 text-xs text-[#b8eaff] font-bold tracking-wider">
              <span>Level {level}</span>
              <span>{Math.floor(xp % 3600)}/{3600} XP</span>
            </div>
          </div>
        </div>
      </div>
  
      {/* --- NEW: Arise message UI --- */}
      {ariseMessage && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg border-2 text-lg font-bold transition-all duration-300
          ${ariseMessageType === 'success' ? 'bg-[#0a1a1a] border-[#00f7ff] text-[#00f7ff]' : ''}
          ${ariseMessageType === 'error' ? 'bg-[#1a0a0a] border-[#ff4650] text-[#ff4650]' : ''}
        `}>
          {ariseMessage}
          <button className="ml-4 text-sm underline" onClick={() => setAriseMessage(null)}>Dismiss</button>
        </div>
      )}
  
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Timer Cards */}
          <div className="grid grid-cols-3 gap-4">
            {['study', 'play', 'idle'].map((type) => (
              <div
                key={type}
                className={`bg-[#1a1a2b] text-[#00f7ff] rounded-lg p-4 cursor-pointer transition-all duration-200 select-none flex flex-col items-center justify-center border border-transparent ${activeTimer === type ? 'bg-[#083A48] border-2 border-[#00f7ff] shadow-[0_0_32px_8px_rgba(0,247,255,0.35)] scale-105' : 'hover:scale-105 hover:border-[#00f7ff] hover:shadow-[0_0_24px_4px_rgba(0,247,255,0.15)]'}`}
                onClick={() => startTimer(type)}
                onMouseEnter={() => setHoveredBlock(type)}
                onMouseLeave={() => setHoveredBlock(null)}
                style={{ minHeight: 140, minWidth: 0 }}
              >
                <div className="text-lg mb-2 tracking-wider">{type.toUpperCase()}</div>
                <div className="text-3xl font-bold mb-3">
                  {formatTime(activeTimer === type ? currentTime : dailyTimers[type])}
                </div>
                {/* Manual Time Input */}
                {type !== 'idle' && (
                  <div className="mt-4 w-full">
                    <input
                      type="number"
                      placeholder="+ Add mins"
                      value={manualTime[type].minutes}
                      onChange={(e) => handleManualInputChange(type, 'minutes', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addManualTime(type)}
                      className="system-input mt-2 w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
  
          {/* Pause/Refresh controls below activities, centered */}
          {activeTimer && (
            <div className="flex justify-center gap-4 my-6">
              <button 
                onClick={handlePause}
                className="system-button bg-[#00f7ff] text-[#0a0a1a] hover:bg-[#00f7ff]/90"
              >
                <Pause size={28} />
              </button>
              <button 
                onClick={resetTimer}
                className="system-button bg-[#ff4650] hover:bg-[#ff4650]/90"
              >
                <RefreshCw size={28} />
              </button>
            </div>
          )}
  
          {/* Todo List */}
          <div className="system-panel p-6">
            <h2 className="text-xl font-bold mb-4">Todo List</h2>
            <div className="flex mb-4">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={handleKeyDown}
                className="system-input flex-grow"
                placeholder="Enter a new todo"
              />
              <button 
                onClick={editingTodoId ? updateTodo : addTodo}
                className="system-button ml-2"
              >
                {editingTodoId ? <Check size={20} /> : <PlusCircle size={20} />}
              </button>
            </div>
            <div className="space-y-2">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center p-2 hover:bg-[#00f7ff]/5 rounded">
                  {/* --- Custom neon checkbox --- */}
                  <label className="relative flex items-center cursor-pointer mr-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                      className="peer appearance-none w-5 h-5 rounded border-2 border-[#00f7ff] bg-[#0a0a1a] checked:bg-[#00f7ff] checked:border-[#00f7ff] focus:ring-2 focus:ring-[#00f7ff] transition-all duration-200"
                      style={{ boxShadow: todo.completed ? '0 0 8px 2px #00f7ff' : 'none' }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-[#0a0a1a] text-lg font-bold peer-checked:opacity-100 opacity-0 transition">✓</span>
                  </label>
                  <span
                    className={`flex-grow ${todo.completed ? 'line-through text-[#00f7ff]/50' : ''}`}
                    onDoubleClick={() => startEditTodo(todo)}
                    style={{ cursor: 'pointer' }}
                  >
                    {todo.text}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditTodo(todo)} 
                      className="system-icon-button"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => deleteTodo(todo.id)} 
                      className="system-icon-button text-[#ff4650]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* Heatmap */}
          <div className="system-panel p-6">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => changeMonth(-1)} className="system-icon-button">
                <ChevronLeft />
              </button>
              <h2 className="text-xl font-bold">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => changeMonth(1)} className="system-icon-button">
                <ChevronRight />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="text-sm font-bold">{day}</div>
              ))}
              {renderHeatmap()}
            </div>
          </div>
        </div>
  
        {/* Right Column */}
        <div className="space-y-6">
          {/* Daily Quests */}
          <div className="system-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <ScrollText size={24} />
              <h2 className="text-xl font-bold">Daily Gates</h2>
              {/* --- NEW: Arise button beside title --- */}
                <button
                  onClick={attemptArise}
                className="system-button ml-2 bg-[#00f7ff]/10 hover:bg-[#00f7ff]/20 flex items-center gap-1"
                >
                <ArrowUpCircle size={22} /> Arise
                </button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm">{ariseCount}</span>
              </div>
            </div>
            <div className="space-y-4">
              {dailyQuests.map(quest => (
                <div
                  key={quest.id}
                  className={`bg-dungeon-primary/50 p-4 rounded-lg flex flex-col gap-2 transition-all duration-200 border border-transparent hover:scale-105 hover:border-[#00f7ff] hover:shadow-[0_0_24px_4px_rgba(0,247,255,0.15)]`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      className={`p-2 rounded-full border-2 flex items-center justify-center transition-all duration-200
                        ${quest.completed ? 'bg-green-900/50 border-green-400 text-green-300 cursor-not-allowed' : 'bg-dungeon-secondary border-[#00f7ff]/40 text-[#00f7ff] hover:bg-[#00f7ff]/10 hover:border-[#00f7ff] hover:scale-110 cursor-pointer'}`}
                      disabled={quest.completed}
                      onClick={() => !quest.completed && updateQuestProgress(quest.id, quest.target - quest.progress)}
                      title={quest.completed ? 'Completed' : 'Mark as complete'}
                      style={{ minWidth: 40, minHeight: 40 }}
                    >
                      {quest.completed ? <Check size={20} /> : <Crosshair size={20} />}
                    </button>
                    <div>
                      <h3 className="font-bold">{quest.title}</h3>
                      <p className="text-sm text-dungeon-text/70">{quest.description}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-sm text-[#00f7ff] font-bold">{quest.progress}/{quest.target}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-dungeon-primary h-2 rounded-full">
                      <div
                        className="h-full bg-dungeon-accent rounded-full transition-all"
                        style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          {/* Shadow Inventory */}
          <div className="system-panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <Skull size={24} />
              <h2 className="text-xl font-bold">Shadow Army</h2>
              <button
                onClick={purchaseShadowSlot}
                className="system-button ml-auto bg-[#00f7ff]/10 hover:bg-[#00f7ff]/20 flex flex-col items-center px-3 py-2 min-w-[120px]"
              >
                <span className="flex items-center gap-1"><Gem size={18} /> + Slot</span>
                <span className="text-xs mt-1 whitespace-nowrap">({shadowSlotCost} <DollarSign className="inline w-4 h-4" />)</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(shadowSlots)].map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-[#1a1a2b] rounded-lg flex items-center justify-center relative group"
                  onMouseEnter={() => setHoveredShadow(i)}
                  onMouseLeave={() => setHoveredShadow(null)}
                >
                  {shadows[i] ? (
                    <>
                      {/* Remove button, visible on hover */}
                      <button
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-[#1a1a2b] border border-[#00f7ff]/40 text-[#00f7ff] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ff4650] hover:text-white hover:border-[#ff4650]"
                        style={{ boxShadow: '0 0 8px 2px #00f7ff22' }}
                        title="Remove Shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeShadow(i);
                        }}
                      >
                        <X size={16} />
                      </button>
                      <Ghost size={36} className="text-[#00f7ff] group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#00f7ff] transition-all duration-200" />
                      {hoveredShadow === i && (
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-[#0a2233] border-2 border-[#00f7ff] rounded-lg px-4 py-2 shadow-lg z-20 min-w-[220px] text-center animate-fade-in">
                          <div className="text-2xl font-bold mb-1 tracking-wider" style={{ color: RARITY_COLORS[shadows[i].rarity] }}>{shadows[i].name}</div>
                          <div className="mb-1 px-2 py-0.5 rounded-full text-xs font-bold inline-block" style={{ background: RARITY_COLORS[shadows[i].rarity], color: '#0a0a1a' }}>{shadows[i].rarity}</div>
                          <div className="text-[#b8eaff] text-sm mb-1">{shadows[i].rank} &bull; Lv. {shadows[i].level}</div>
                          <div className="flex flex-col gap-1 mb-1">
                            {Object.entries(shadows[i].baseBuffs).map(([buff, val]) => (
                              <div key={buff} className="flex items-center gap-2 text-xs">
                                <span className="font-bold" style={{ color: '#00f7ff' }}>+
                                  {Math.round((val + (shadows[i].buffsPerLevel?.[buff] || 0) * (shadows[i].level - 1)) * 100)}%
                                </span>
                                <span className="text-[#b8eaff]" title={
                                  buff === 'xp' ? 'XP Gain: Increases all XP earned.' :
                                  buff === 'studyEff' ? 'Study Timer Efficiency: Each second of study counts for more.' :
                                  buff === 'coins' ? 'Bonus Coins: More coins from quests.' :
                                  buff === 'idle' ? 'Idle Conversion: Idle time gives XP.' :
                                  buff === 'play' ? 'Play Conversion: Play time gives XP.' :
                                  buff === 'quest' ? 'Quest Speed: Complete quests faster.' :
                                  ''
                                }>
                                  {buff === 'xp' ? 'XP Gain' :
                                   buff === 'studyEff' ? 'Study Efficiency' :
                                   buff === 'coins' ? 'Bonus Coins' :
                                   buff === 'idle' ? 'Idle→XP' :
                                   buff === 'play' ? 'Play→XP' :
                                   buff === 'quest' ? 'Quest Speed' :
                                   buff}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-[#b8eaff] italic mb-1 text-center">{shadows[i].description}</div>
                          <div className="flex items-center gap-2 justify-center mt-2">
                            <span className="text-sm font-bold">Lv. {shadows[i].level}</span>
                            <button
                              className={`ml-2 px-2 py-1 rounded bg-[#00f7ff] text-[#0a0a1a] text-xs font-bold shadow hover:bg-[#00e6e6] transition ${shadows[i].level >= MAX_SHADOW_LEVEL || currency < LEVEL_UP_COST(shadows[i].level) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={shadows[i].level >= MAX_SHADOW_LEVEL || currency < LEVEL_UP_COST(shadows[i].level)}
                              onClick={(e) => {
                                e.stopPropagation();
                                levelUpShadow(i);
                              }}
                              title={shadows[i].level >= MAX_SHADOW_LEVEL ? 'Max Level' : currency < LEVEL_UP_COST(shadows[i].level) ? 'Not enough coins' : `Level Up (${LEVEL_UP_COST(shadows[i].level)} coins)`}
                            >
                              Level Up
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Ghost className="text-[#00f7ff]/30 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#00f7ff] transition-all duration-200" size={36} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  
      {/* Music Player */}
      <button 
        onClick={() => setShowMusicPlayer(!showMusicPlayer)}
        className="fixed bottom-4 left-4 system-button"
      >
        <Music size={24} />
      </button>
  
      {/* Modals */}
      {showMusicPlayer && <MusicPlayer />}
      {isProfileOpen && <ProfileModal />}
      {notification && (
        <NotificationModal
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {unboxShadow && <UnboxModal shadow={unboxShadow} onClose={() => setUnboxShadow(null)} />}
    </div>
  );
};

export default ProductivityTracker;