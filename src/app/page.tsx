"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SAGE_DB, Sage } from "@/utils/sages";
import { AstroLogic } from "@/utils/astro";
import FateCycleDashboard from "@/components/FateCycleDashboard";

type Message = {
  role: "user" | "assistant";
  speaker?: string;
  content: string;
};

const TASKFORCE_THEMES = [
  { id: "wealth", label: "富と経済戦略", icon: "💰", desc: "資産・ビジネス・収益" },
  { id: "mental", label: "心身の浄化", icon: "🌿", desc: "疲労・ストレス・健康" },
  { id: "mission", label: "人生の岐路", icon: "🛤️", desc: "キャリア・天命・決断" },
  { id: "leadership", label: "帝王学・統率", icon: "👑", desc: "組織・対人・マネジメント" },
  { id: "crisis", label: "逆境突破", icon: "🔥", desc: "トラブル解決・急所" },
  { id: "creation", label: "創造とアイデア", icon: "💡", desc: "企画・直感・ゼロイチ" },
  { id: "future", label: "未来予測", icon: "🔮", desc: "時代読み・トレンド" },
  { id: "learning", label: "知の探究", icon: "📚", desc: "学習・スキル・教養" },
  { id: "love", label: "愛と調和", icon: "❤️", desc: "家族・パートナー・感情" },
];

const SPEAKER_ROLES: Record<string, string> = {
  "知の宰相 (AI議長)": "THE CABINET 議長",
  "時読みナビゲーター": "時読み/進行",
  "アイデンティティ・キング": "Only1・本質キュレーション",
  "ポテンシャルジェネレーター": "チーム論・心理錬金術",
};

const playFrequency = (hz: number) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(hz, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 4.5);
  } catch (e) {
    console.error("Audio Playback Error:", e);
  }
};

const Avatar = ({ name }: { name: string }) => {
  let hash = 0;
  const safeName = name || "?";
  for (let i = 0; i < safeName.length; i++) hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500",
    "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-indigo-500",
    "bg-violet-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
  ];
  if (safeName.includes("知の宰相")) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F2E6C2] flex items-center justify-center text-[#554] font-serif font-bold shadow-md border border-white text-lg">宰</div>;
  if (safeName.includes("ナビゲーター")) return <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-serif shadow-sm text-sm">時</div>;
  if (safeName.includes("影の参謀")) return <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-serif shadow-sm text-sm border border-gray-600">影</div>;
  if (safeName.includes("ブッダ")) return <div className="w-10 h-10 rounded-full bg-[#E6E6FA] flex items-center justify-center text-[#4B0082] font-serif font-bold shadow-md border border-white text-lg">空</div>;

  const colorClass = colors[Math.abs(hash) % colors.length];
  const initial = safeName.charAt(0);
  return <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold shadow-sm text-lg`}>{initial}</div>;
};

// ★★★ 修正: instantプロパティを追加し、過去ログはアニメーションをスキップする ★★★
const Typewriter = ({ text, onComplete, instant = false }: { text: string; onComplete?: () => void, instant?: boolean }) => {
  const [displayedText, setDisplayedText] = useState(instant ? text : "");
  const indexRef = useRef(0);

  useEffect(() => {
    // インスタント表示モードなら、全テキストを即座に表示して終了
    if (instant) {
      setDisplayedText(text);
      if (onComplete) onComplete();
      return;
    }

    indexRef.current = 0;
    setDisplayedText("");
    const safeText = text || "";
    const intervalId = setInterval(() => {
      if (indexRef.current >= safeText.length) {
        clearInterval(intervalId);
        if (onComplete) onComplete();
        return;
      }
      const char = safeText.charAt(indexRef.current);
      setDisplayedText((prev) => prev + char);
      indexRef.current++;
    }, 20);
    return () => clearInterval(intervalId);
  }, [text, instant]);

  return (
    <span className="whitespace-pre-wrap">
      {displayedText.split(/(\*\*.*?\*\*)/).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ?
          <strong key={i} className="text-[#a38e5e]">{part.slice(2, -2)}</strong> : part
      )}
    </span>
  );
};

export default function Home() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingIndex, setTypingIndex] = useState<number>(-1);
  const [showSageList, setShowSageList] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedSageForSummon, setSelectedSageForSummon] = useState<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedBirthDate = localStorage.getItem("cabinet_birthdate");
    const savedHistory = localStorage.getItem("cabinet_history");
    const savedMembers = localStorage.getItem("cabinet_members");

    if (savedBirthDate) setBirthDate(savedBirthDate);
    if (savedMembers) {
      try { setCurrentMembers(JSON.parse(savedMembers)); } catch (e) { }
    }
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (parsedHistory.length > 0) {
          setMessages(parsedHistory);
          setIsSetupComplete(true);
          // 過去ログを読み込んだ際は、typingIndexを最大にして全過去ログのタイピングをスキップさせる
          setTypingIndex(parsedHistory.length);
        }
      } catch (e) { console.error("Failed to load history:", e); }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("cabinet_history", JSON.stringify(messages));
    localStorage.setItem("cabinet_members", JSON.stringify(currentMembers));
    localStorage.setItem("cabinet_birthdate", birthDate);
  }, [messages, currentMembers, birthDate, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingIndex]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const sendMessage = async (text: string, isSystemCommand = false, membersOverride?: string[], birthDateOverride?: string) => {
    if ((!text.trim() && !isSystemCommand) || isLoading) return;

    const datePattern = /(\d{4})[-/.]?(\d{1,2})[-/.]?(\d{1,2})/;
    const match = text.match(datePattern);

    let tempBirthDate = birthDateOverride !== undefined ? birthDateOverride : birthDate;

    if (match && text.length < 20) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      setBirthDate(formattedDate);
      tempBirthDate = formattedDate;
      localStorage.setItem("cabinet_birthdate", formattedDate);
    }

    if (!isSystemCommand) {
      const userMessage: Message = { role: "user", content: text };
      setMessages((prev) => {
        const newHistory = [...prev, userMessage];
        setTypingIndex(newHistory.length);
        return newHistory;
      });
      setInput("");
    }

    setIsLoading(true);

    try {
      const currentHour = new Date().getHours();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          birthDate: tempBirthDate,
          history: messages,
          currentHour: currentHour,
          currentMembers: membersOverride !== undefined ? membersOverride : currentMembers
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.activeMembers && Array.isArray(data.activeMembers)) {
        setCurrentMembers(data.activeMembers);
      }

      const script = JSON.parse(data.reply);
      const newMessages = script.map((item: any) => ({
        role: "assistant",
        speaker: item.speaker,
        content: item.content || "",
      }));

      setMessages((prev) => {
        const updated = [...prev, ...newMessages];
        setTypingIndex(prev.length);
        return updated;
      });

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", speaker: "System", content: "通信エラーが発生しました。" }]);
      setTypingIndex((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const clearHistory = () => {
    if (confirm("これまでの対話履歴と設定をすべて消去しますか？\n（この操作は取り消せません）")) {
      localStorage.removeItem("cabinet_history");
      localStorage.removeItem("cabinet_birthdate");
      localStorage.removeItem("cabinet_members");
      setMessages([]);
      setCurrentMembers([]);
      setBirthDate("");
      setIsSetupComplete(false);
      alert("記憶をリセットしました。");
    }
  };

  const handleGoToTop = () => {
    setIsSetupComplete(false);
  };

  const handleResume = () => {
    setIsSetupComplete(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleMenuAction = (action: string) => {
    setShowMobileMenu(false);

    switch (action) {
      case "LIST": setShowSageList(true); break;
      case "TEAM": setShowTeamSelector(true); break;
      case "CHANGE": sendMessage("議論の流れを変えたいわ。現在のメンバーを解散し、全く違う視点を持つメンバーに入れ替えて。", false); break;
      case "COMPASS":
        if (!birthDate) {
          const inputDate = prompt("Grand Compassによる運命再診断には、正確な生年月日が必要です。\n入力例: 1990-01-01");
          if (inputDate) {
            setBirthDate(inputDate);
            sendMessage(`【システム指令】Grand Compass起動。運勢を再診断し、最適なメンバーを再招集してください。(新規設定生年月日: ${inputDate})`, true, undefined, inputDate);
          }
        } else {
          sendMessage("【システム指令】Grand Compass再起動（設定済み）。現在の生年月日で既に分析済みであり、その座標で稼働中であることをオーナーに伝えてください。もし生年月日を変更して再診断したい場合は、一度「記憶の消去(Reset)」を行う必要があると案内してください。その上で、現在の運命座標に基づいてメンバーを再選抜（リシャッフル）してください。", true);
        }
        break;
      case "INTERVENE": sendMessage("議論が膠着しているわ。新しい視点を持つ賢人を1名、介入（ドアノック）させて。"); break;
      case "RESET": clearHistory(); break;
      case "LEGACY": alert("LEGACY Project (賢人化)\n\n現在、機能調整中です。\n(Coming Soon...)"); break;
      case "SPECIAL": router.push("/dual-axis"); break;
      case "PRIVACY": setShowPrivacyModal(true); break;
      case "MANUAL": setShowManualModal(true); break;
    }
  };

  const summonSageConfirm = (type: "ADD" | "SOLO") => {
    if (!selectedSageForSummon) return;

    const sageName = selectedSageForSummon;
    setSelectedSageForSummon(null);
    setShowSageList(false);

    if (type === "ADD") {
      sendMessage(`【招集命令】\n${sageName}を、現在の議論に「追加招集」せよ。\n既存メンバーはそのままで、この賢人を参加させてくれ。`);
    } else {
      sendMessage(`【招集命令】\n${sageName}と「サシ（1対1）」で話したい。\n他のメンバーは退席させ、この賢人だけを呼んでくれ。`);
    }
  };

  const summonTaskForce = (themeLabel: string) => {
    setShowTeamSelector(false);
    sendMessage(`【緊急招集命令】
テーマ：「${themeLabel}」

議長、このテーマについて議論したい。
現在のメンバーを一度解散し、このテーマに最も適した知見を持つ「3名の賢人」をあなたの判断で選抜・招集せよ。
選抜理由と共に、議論を開始してください。`);
  };

  const getSpeakerStyle = (speaker?: string) => {
    if (!speaker || speaker === "System") return "bg-gray-100 text-gray-500";
    if (speaker?.includes("知の宰相")) {
      return "border-l-4 border-[#D4AF37] bg-white text-[#333] shadow-md";
    }
    let hash = 0;
    for (let i = 0; i < (speaker || "").length; i++) hash = (speaker || "").charCodeAt(i) + ((hash << 5) - hash);
    const colors = [
      "border-orange-300", "border-purple-300", "border-red-300", "border-emerald-300",
      "border-yellow-300", "border-pink-300", "border-cyan-300"
    ];
    return `border-l-4 ${colors[Math.abs(hash) % colors.length]} bg-white text-[#333] border-opacity-50`;
  };

  const categoryGroups = {
    "システム・管理者": ["システム・管理者", "System"],
    "現代・内閣": ["現代・内閣", "Modern", "Secret", "Legend"],
    "哲学・革新": ["哲学・革新", "Spirit", "Women"],
    "戦略・歴史": ["戦略・歴史", "Strategy"],
    "日本史・維新・武将": ["日本史・維新・武将"],
    "世界史・戦略": ["世界史・戦略"],
    "科学・芸術・哲学": ["科学・芸術・哲学"],
    "都道府県": ["都道府県"]
  };

  if (!isSetupComplete) {
    const hasHistory = messages.length > 0;
    return (
      <div className="min-h-screen bg-[#fafaf8] text-[#1a1a1a] flex flex-col items-center justify-center p-6 relative font-serif">
        <div className="max-w-xl w-full flex flex-col items-center space-y-16 z-10 animate-fade-in">
          <div className="text-center space-y-8">
            <h1 className="text-6xl tracking-[0.15em] text-[#1a1a1a] font-normal font-[family-name:var(--font-cinzel)]">
              THE CABINET
            </h1>
            <p className="text-sm text-[#a38e5e] tracking-[0.2em] font-[family-name:var(--font-shippori)]">
              人生をオーケストレーションする、<br className="md:hidden" />知のプライベートサロン
            </p>
          </div>
          <div className="w-24 h-[1px] bg-[#a38e5e]/50"></div>
          <div className="w-full flex flex-col items-center space-y-12">

            {hasHistory && (
              <button
                onClick={handleResume}
                className="w-full max-w-xs px-10 py-4 bg-[#333] text-white border border-[#333] tracking-[0.2em] text-xs hover:bg-[#555] transition-all duration-500 uppercase font-[family-name:var(--font-cinzel)] shadow-lg"
              >
                Resume Session <br />
                <span className="text-[10px] opacity-70 font-sans tracking-normal">前回の続きから再開する</span>
              </button>
            )}

            {hasHistory && <p className="text-xs text-[#888] font-sans -mt-8">or</p>}

            <div className="relative w-full max-w-xs group">
              <label className="block text-center text-[10px] text-[#aaa] tracking-[0.3em] mb-2 font-sans">
                {hasHistory ? "新たな座標でリセットする" : "あなたの生まれた座標と同期する"}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-transparent border-b border-[#ddd] text-center text-2xl text-[#333] py-2 focus:border-[#a38e5e] focus:outline-none transition-colors font-[family-name:var(--font-cinzel)] cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                if (hasHistory) {
                  if (!confirm("新しい日付で開始しますか？\nこれまでの対話履歴はリセットされます。")) return;
                  setMessages([]);
                  setCurrentMembers([]);
                }

                if (!birthDate) {
                  const today = new Date().toISOString().split('T')[0];
                  setBirthDate(today);
                }
                setIsSetupComplete(true);
                setTypingIndex(-1);

                if (!hasHistory) {
                  setShowManualModal(true);
                }

                setTimeout(() => sendMessage("【システム指令】チェックイン処理。オーナーに「メンバーを自分で選ぶか、議長に任せるか」の選択肢を提示し、操作方法を案内せよ。", true, [], birthDate), 500);
              }}
              className="px-10 py-4 border border-[#ddd] text-[#333] tracking-[0.2em] text-xs hover:border-[#a38e5e] hover:text-[#a38e5e] transition-all duration-700 uppercase font-[family-name:var(--font-cinzel)]"
            >
              {hasHistory ? "New Session" : "Enter the Cabinet"}
            </button>

            <button
              onClick={() => {
                if (hasHistory) {
                  if (!confirm("ゲストとして新規開始しますか？\nこれまでの対話履歴はリセットされます。")) return;
                  setMessages([]);
                  setCurrentMembers([]);
                }
                setBirthDate("");
                localStorage.removeItem("cabinet_birthdate");

                setIsSetupComplete(true);
                setTypingIndex(-1);

                if (!hasHistory) {
                  setShowManualModal(true);
                }

                setTimeout(() => sendMessage("【システム指令】ゲストチェックイン処理。オーナーに「メンバーを自分で選ぶか、議長に任せるか」の選択肢を提示し、操作方法（サイドバー/ハンバーガーメニュー）を案内せよ。", true, [], ""), 500);
              }}
              className="mt-4 text-[10px] text-[#999] hover:text-[#a38e5e] tracking-[0.1em] border-b border-transparent hover:border-[#a38e5e] pb-0.5 transition-colors font-sans"
            >
              同期せずにチェックイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fff] text-[#1f1f1f] font-sans overflow-hidden">
      <aside className="w-64 bg-[#f9fafb] border-r border-[#eee] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#eee]">
          <button onClick={handleGoToTop} className="text-left group w-full">
            <h1 className="text-xl font-[family-name:var(--font-cinzel)] tracking-widest text-[#333] group-hover:text-[#a38e5e] transition-colors">THE CABINET</h1>
            <p className="text-[10px] text-[#888] mt-1 font-sans group-hover:text-[#a38e5e] transition-colors">Private Salon v3.3</p>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <MenuButton icon="⚡" label="チーム生成 (3名選抜)" onClick={() => handleMenuAction("TEAM")} />
          <MenuButton icon="📜" label="賢人一覧" onClick={() => handleMenuAction("LIST")} />
          <MenuButton icon="🔄" label="メンバー交代" onClick={() => handleMenuAction("CHANGE")} />
          <MenuButton icon="🧭" label="Grand Compass" onClick={() => handleMenuAction("COMPASS")} />
          <MenuButton icon="🚪" label="介入を呼び込む" onClick={() => handleMenuAction("INTERVENE")} />
          <div className="border-t border-[#eee] my-4"></div>
          <MenuButton icon="📖" label="操作マニュアル" onClick={() => handleMenuAction("MANUAL")} />
          <MenuButton icon="🗑️" label="記憶の消去 (Reset)" onClick={() => handleMenuAction("RESET")} />
          <MenuButton icon="🏛️" label="LEGACY (賢人化)" onClick={() => handleMenuAction("LEGACY")} />
          <MenuButton icon="💎" label="2軸チャット (Dual Axis)" onClick={() => handleMenuAction("SPECIAL")} />
          <MenuButton icon="🔒" label="プライバシー規定" onClick={() => handleMenuAction("PRIVACY")} />
        </nav>
        <div className="p-4 text-xs text-[#aaa] text-center font-[family-name:var(--font-cinzel)]">
          COORD: {birthDate ? birthDate.replace(/-/g, '.') : "GUEST"}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-white">
        <header className="md:hidden p-4 border-b border-[#eee] bg-white flex justify-between items-center sticky top-0 z-20">
          <button onClick={handleGoToTop}>
            <span className="font-[family-name:var(--font-cinzel)] font-bold text-lg hover:text-[#a38e5e] transition-colors">THE CABINET</span>
          </button>
          <button onClick={() => setShowMobileMenu(true)} className="p-2 text-2xl text-[#333]">
            ☰
          </button>
        </header>

        {showMobileMenu && (
          <div className="fixed inset-0 z-50 bg-[#fafaf8] flex flex-col animate-fade-in font-sans">
            <div className="p-4 border-b border-[#eee] flex justify-between items-center bg-white">
              <h2 className="font-[family-name:var(--font-cinzel)] font-bold text-xl text-[#333]">MENU</h2>
              <button onClick={() => setShowMobileMenu(false)} className="text-3xl text-[#888] hover:text-[#333]">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs text-[#a38e5e] tracking-widest border-b border-[#a38e5e]/30 pb-1 mb-2">ACTIONS</h3>
                <MenuButton icon="⚡" label="チーム生成 (3名選抜)" onClick={() => handleMenuAction("TEAM")} />
                <MenuButton icon="📜" label="賢人一覧" onClick={() => handleMenuAction("LIST")} />
                <MenuButton icon="🔄" label="メンバー交代" onClick={() => handleMenuAction("CHANGE")} />
                <MenuButton icon="🧭" label="Grand Compass" onClick={() => handleMenuAction("COMPASS")} />
                <MenuButton icon="🚪" label="介入を呼び込む" onClick={() => handleMenuAction("INTERVENE")} />
              </div>
              <div className="space-y-3 pt-4">
                <h3 className="text-xs text-[#a38e5e] tracking-widest border-b border-[#a38e5e]/30 pb-1 mb-2">SYSTEM</h3>
                <MenuButton icon="📖" label="操作マニュアル" onClick={() => handleMenuAction("MANUAL")} />
                <MenuButton icon="🗑️" label="記憶の消去 (Reset)" onClick={() => handleMenuAction("RESET")} />
                <MenuButton icon="🏛️" label="LEGACY (賢人化)" onClick={() => handleMenuAction("LEGACY")} />
                <MenuButton icon="💎" label="2軸チャット (Dual Axis)" onClick={() => handleMenuAction("SPECIAL")} />
                <MenuButton icon="🔒" label="プライバシー規定" onClick={() => handleMenuAction("PRIVACY")} />
              </div>
              <div className="pt-8 text-center text-xs text-[#ccc] font-[family-name:var(--font-cinzel)]">
                COORD: {birthDate ? birthDate : "GUEST"}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          {messages.map((msg, index) => {
            if (index > typingIndex) return null;
            const isUser = msg.role === "user";
            const roleText = msg.speaker && SPEAKER_ROLES[msg.speaker] ? SPEAKER_ROLES[msg.speaker] : "";
            const isBuddha = msg.speaker?.includes("ブッダ");

            return (
              <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                <div className={`flex max-w-[90%] md:max-w-[75%] gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="flex-shrink-0 mt-1">
                    {isUser ? <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white text-xs font-sans">YOU</div> : <Avatar name={msg.speaker || "?"} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!isUser && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1e40af] text-base font-sans tracking-wide">{msg.speaker}</span>
                        <span className="text-xs text-[#888] font-sans">{roleText}</span>
                        {isBuddha && (
                          <button onClick={() => playFrequency(963)} className="ml-2 px-2 py-0.5 bg-[#E6E6FA] text-[#4B0082] text-[10px] rounded-full hover:bg-[#D8BFD8] transition-colors flex items-center gap-1">
                            <span>🔊</span> 963Hz
                          </button>
                        )}
                      </div>
                    )}
                    <div className={`p-5 rounded-2xl text-[15px] leading-relaxed shadow-sm font-sans ${isUser ? "bg-[#111] text-white rounded-tr-none" : getSpeakerStyle(msg.speaker) + " rounded-tl-none"}`}>
                      {(!isUser && msg.content.includes("[CYCLE_GRAPH]") && birthDate && birthDate.length > 4) && (
                        <div className="mb-4">
                          <FateCycleDashboard data={AstroLogic.generateCycleData(birthDate)} />
                        </div>
                      )}

                      {/* ★★★ 修正: 過去ログ(index < typingIndex)とユーザー発言はinstant=trueで一瞬で表示 ★★★ */}
                      {isUser || index < typingIndex ? (
                        <Typewriter text={msg.content.replace("[CYCLE_GRAPH]", "")} instant={true} />
                      ) : (
                        <Typewriter text={msg.content.replace("[CYCLE_GRAPH]", "")} onComplete={() => setTypingIndex(prev => prev + 1)} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && typingIndex === messages.length && (
            <div className="flex gap-4 animate-pulse ml-2">
              <div className="w-10 h-10 rounded-full bg-[#eee]"></div>
              <div className="h-10 bg-[#f9fafb] rounded-2xl w-40 flex items-center px-4 text-xs text-[#888]">思考中...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-[#eee]">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || (messages.length > 0 && typingIndex < messages.length)}
                placeholder="ここに議題を入力... (Shift+Enterで改行)"
                rows={1}
                className="w-full bg-[#f8f9fa] border border-[#ddd] text-[#333] pl-6 pr-14 py-4 rounded-2xl focus:outline-none focus:border-[#a38e5e] focus:ring-1 focus:ring-[#a38e5e] transition-all shadow-inner disabled:opacity-50 font-sans resize-none overflow-hidden min-h-[56px] max-h-[200px]"
              />
              <button
                type="submit"
                disabled={!input || isLoading}
                className="absolute right-2 bottom-2 p-3 bg-[#333] text-white rounded-full hover:bg-[#000] disabled:bg-[#ccc] transition-all shadow-md z-10"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal: Sage List & Summon Options */}
      {showSageList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowSageList(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#eee] flex justify-between items-center bg-[#f9fafb]">
              <h2 className="text-xl font-bold text-[#333]">賢人招集 (Click to Summon)</h2>
              <button onClick={() => setShowSageList(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#fff]">
              <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
                {Object.entries(categoryGroups).map(([groupName, categories]) => (
                  <div key={groupName} className="break-inside-avoid mb-8 flex flex-col gap-4">
                    <h3 className="text-[#a38e5e] font-serif border-b border-[#eee] pb-2 text-lg tracking-widest text-center mb-2">{groupName}</h3>
                    <div className="flex flex-col gap-3">
                      {SAGE_DB.filter(s => categories.includes(s.category) && !s.id.includes("chancellor")).map((sage) => (
                        <button
                          key={sage.id}
                          onClick={() => setSelectedSageForSummon(sage.name)}
                          className="flex gap-3 p-3 border border-[#eee] rounded-lg hover:border-[#a38e5e] hover:bg-[#fcfcfc] hover:shadow-md transition-all text-left group"
                        >
                          <div className="group-hover:scale-105 transition-transform"><Avatar name={sage.name} /></div>
                          <div><div className="font-bold text-[#333] text-sm group-hover:text-[#a38e5e]">{sage.name}</div><div className="text-[10px] text-[#666] mt-0.5">{sage.role}</div></div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedSageForSummon && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 animate-fade-in">
                <h3 className="text-2xl font-bold text-[#333] mb-2 font-[family-name:var(--font-cinzel)]">{selectedSageForSummon}</h3>
                <p className="text-sm text-[#666] mb-8">この賢人をどのように招集しますか？</p>

                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
                  <button
                    onClick={() => summonSageConfirm("ADD")}
                    className="flex-1 p-6 border border-[#a38e5e] rounded-xl hover:bg-[#a38e5e] hover:text-white transition-all group text-center shadow-sm"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">➕</div>
                    <div className="font-bold text-lg mb-1">追加招集</div>
                    <div className="text-[10px] opacity-70">現在の議論に参加させる</div>
                  </button>

                  <button
                    onClick={() => summonSageConfirm("SOLO")}
                    className="flex-1 p-6 border border-[#333] rounded-xl hover:bg-[#333] hover:text-white transition-all group text-center shadow-sm"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔄</div>
                    <div className="font-bold text-lg mb-1">サシで話す</div>
                    <div className="text-[10px] opacity-70">他のメンバーを退席させ入れ替える</div>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedSageForSummon(null)}
                  className="mt-12 text-sm text-[#888] hover:text-[#333] border-b border-transparent hover:border-[#333] transition-colors"
                >
                  キャンセルして戻る
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal: TaskForce Selector */}
      {showTeamSelector && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowTeamSelector(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#eee] bg-[#fafaf8] flex justify-between items-center">
              <div><h2 className="text-xl font-bold text-[#333] font-[family-name:var(--font-cinzel)] tracking-wider">TASK FORCE GENERATION</h2><p className="text-xs text-[#a38e5e] mt-1">議長権限による緊急チーム編成</p></div>
              <button onClick={() => setShowTeamSelector(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
            </div>
            <div className="p-6 bg-white max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {TASKFORCE_THEMES.map((theme) => (
                  <button key={theme.id} onClick={() => summonTaskForce(theme.label)} className="flex flex-col items-center justify-center p-4 border border-[#eee] rounded-lg hover:border-[#a38e5e] hover:bg-[#fafaf8] hover:shadow-md transition-all group text-center gap-2 h-32">
                    <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{theme.icon}</span>
                    <span className="font-bold text-[#333] text-sm group-hover:text-[#a38e5e]">{theme.label}</span>
                    <span className="text-[10px] text-[#888]">{theme.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Privacy Policy */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowPrivacyModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#eee] bg-[#fafaf8] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#333] font-[family-name:var(--font-cinzel)]">PRIVACY POLICY</h2>
              <button onClick={() => setShowPrivacyModal(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
            </div>
            <div className="p-6 bg-white overflow-y-auto max-h-[60vh] text-sm text-[#555] leading-relaxed space-y-4">
              <h3 className="font-bold text-[#333] text-base mb-2">【THE CABINET は、あなたの秘密をサーバーに残しません】</h3>
              <p>当サービスは、ユーザーのプライバシーと対話の秘匿性を最優先に設計されています。</p>
              <div className="bg-[#f9fafb] p-4 rounded-lg space-y-2 border border-[#eee]">
                <h4 className="font-bold text-[#333]">1. データはあなたの端末だけに</h4>
                <p className="text-xs">過去の対話履歴や設定（生年月日など）は、すべてお客様ご自身のブラウザ内（ローカルストレージ）にのみ保存されます。運営側が管理するサーバーやデータベースに、個人の会話ログが永続的に保存・閲覧されることはありません。</p>
              </div>
              <div className="bg-[#f9fafb] p-4 rounded-lg space-y-2 border border-[#eee]">
                <h4 className="font-bold text-[#333]">2. リセット権限はあなたに</h4>
                <p className="text-xs">メニュー内の「記憶の消去 (Reset)」を実行、またはブラウザのキャッシュを削除することで、全てのデータは完全に消滅します。</p>
              </div>
              <div className="bg-[#f9fafb] p-4 rounded-lg space-y-2 border border-[#eee]">
                <h4 className="font-bold text-[#333]">3. AI処理の安全性</h4>
                <p className="text-xs">会話の生成には Google Gemini API を使用しています。入力されたデータは回答生成のために一時的に処理されますが、当サービスの運営者がその内容を傍受・監視することはありません。</p>
              </div>
              <p className="text-xs text-[#888] pt-2 text-center">安心してお使いいただける「完全なプライベート空間」を目指しています。</p>
            </div>
            <div className="p-4 border-t border-[#eee] bg-[#fafaf8] text-center">
              <button onClick={() => setShowPrivacyModal(false)} className="px-6 py-2 bg-[#333] text-white text-xs rounded-full hover:bg-[#555] transition-colors">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowManualModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#eee] bg-[#fafaf8] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#333] font-[family-name:var(--font-cinzel)]">USER MANUAL</h2>
                <p className="text-xs text-[#a38e5e] mt-1">THE CABINET 操作マニュアル</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
            </div>
            <div className="p-6 bg-white overflow-y-auto max-h-[70vh] text-sm text-[#444] leading-relaxed space-y-6">

              <section>
                <h3 className="font-bold text-[#333] text-base mb-3 flex items-center gap-2"><span className="text-[#a38e5e]">1.</span> はじめに</h3>
                <p className="text-sm">「THE CABINET」へようこそ。<br />ここは単なるAIチャットではありません。歴史上の偉人、物語の登場人物、そして土地の守り神たち（賢人）が、あなたの思考を深め、人生の意思決定をサポートする「極秘のプライベートサロン」です。</p>
              </section>

              <section>
                <h3 className="font-bold text-[#333] text-base mb-3 flex items-center gap-2"><span className="text-[#a38e5e]">2.</span> 基本的な対話の進め方</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>画面下部の入力欄から、相談したいテーマや悩みを入力してください（Shift + Enterで改行）。</li>
                  <li>賢人たちが、それぞれの強烈な個性と哲学に基づきアドバイスを行います。</li>
                  <li><strong>優等生的な会話はありません。</strong> 賢人同士で意見が対立したり、あなたに厳しい問いかけ（「オーナー、あなたはどう思う？」）を投げかけてくることがあります。それに答える形で議論を深めてください。</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-[#333] text-base mb-3 flex items-center gap-2"><span className="text-[#a38e5e]">3.</span> 賢人の招集について（重要）</h3>
                <p className="text-sm mb-3">メニューの「📜 賢人一覧」から特定の人物をクリックすると、以下の2つの招集方法を選択できます。</p>
                <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#eee] space-y-3">
                  <div>
                    <span className="font-bold text-[#333]">➕ 追加招集：</span><br />
                    <span className="text-xs">現在の議論メンバーはそのままに、その賢人を「アドバイザー」として途中参加させます。</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#333]">🔄 サシで話す：</span><br />
                    <span className="text-xs">他のメンバーには全員退席してもらい、<strong>指名した賢人とあなただけの「1対1」の対話</strong>を開始します。深く語り合いたい時に最適です。</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-[#333] text-base mb-3 flex items-center gap-2"><span className="text-[#a38e5e]">4.</span> メニュー機能</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex gap-2"><span>⚡</span><span><strong>チーム生成:</strong> テーマ別に最適な3名を自動招集</span></div>
                  <div className="flex gap-2"><span>🔄</span><span><strong>メンバー交代:</strong> 全く違う視点のメンバーに入れ替え</span></div>
                  <div className="flex gap-2"><span>🧭</span><span><strong>Grand Compass:</strong> あなたの運命座標で再診断</span></div>
                  <div className="flex gap-2"><span>🚪</span><span><strong>介入を呼び込む:</strong> 待機中の賢人がランダムに乱入</span></div>
                  <div className="flex gap-2"><span>🗑️</span><span><strong>記憶の消去 (Reset):</strong> 対話履歴と設定を完全消去</span></div>
                </div>
              </section>

              <p className="text-xs text-[#888] pt-4 text-center border-t border-[#eee]">
                THE CABINET は、あなたの秘密をサーバーに残しません。<br />どうぞ、誰にも言えない本音で賢人たちと対話してください。
              </p>

            </div>
            <div className="p-4 border-t border-[#eee] bg-[#fafaf8] text-center">
              <button onClick={() => setShowManualModal(false)} className="px-8 py-3 bg-[#333] text-white text-sm font-bold rounded-full hover:bg-[#555] shadow-lg transition-all">
                理解してサロンへ進む
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{` .font-sans { font-family: 'Noto Sans JP', sans-serif; } .font-serif { font-family: 'Shippori Mincho', serif; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; } .animate-fade-in { animation: fadeInUp 0.8s ease-out forwards; } `}</style>
    </div>
  );
}

const MenuButton = ({ icon, label, onClick }: { icon: string, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#555] hover:bg-[#fff] hover:text-[#333] hover:shadow-sm rounded transition-all text-left group font-sans">
    <span className="group-hover:scale-110 transition-transform text-lg">{icon}</span><span>{label}</span>
  </button>
);