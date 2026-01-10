"use client";

import { useState, useRef, useEffect } from "react";
import { SAGE_DB, Sage } from "@/utils/sages";
import FateCycleDashboard from "@/components/FateCycleDashboard";
import { AstroLogic } from "@/utils/astro";

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
  // 安全装置: nameが空の場合は「?」にする
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

// ★修正: Typewriterの安全化（textがundefinedでも落ちないようにする）
const Typewriter = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText("");

    // 安全装置: textが空なら空文字として扱う
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
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function Home() {
  const [birthDate, setBirthDate] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingIndex, setTypingIndex] = useState<number>(-1);
  const [showSageList, setShowSageList] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendMessage = async (text: string, isSystemCommand = false, membersOverride?: string[]) => {
    if ((!text.trim() && !isSystemCommand) || isLoading) return;

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
          birthDate,
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
        // ★修正: contentがundefinedでも空文字を入れて落ちないようにする
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
    switch (action) {
      case "LIST": setShowSageList(true); break;
      case "TEAM": setShowTeamSelector(true); break;
      case "CHANGE": sendMessage("議論の流れを変えたいわ。現在のメンバーを解散し、全く違う視点を持つメンバーに入れ替えて。", false); break;
      case "LOG": alert("現在の画面を上にスクロールすると、過去の対話を確認できます。"); break;
      case "COMPASS":
        if (!birthDate) {
          // 生年月日がない場合（ゲスト）：入力を求めてから通常起動
          const inputDate = prompt("Grand Compassによる運命再診断には、正確な生年月日が必要です。\n入力例: 1990-01-01");
          if (inputDate) {
            setBirthDate(inputDate);
            sendMessage(`【システム指令】Grand Compass起動。運勢を再診断し、最適なメンバーを再招集してください。(新規設定生年月日: ${inputDate})`, true);
          }
        } else {
          // 生年月日がある場合（設定済み）：仕様案内とリシャッフルを指示
          // システムコマンドとして送信（第2引数true）
          sendMessage("【システム指令】Grand Compass再起動（設定済み）。現在の生年月日で既に分析済みであり、その座標で稼働中であることをオーナーに伝えてください。もし生年月日を変更して再診断したい場合は、一度「記憶の消去(Reset)」を行う必要があると案内してください。その上で、現在の運命座標に基づいてメンバーを再選抜（リシャッフル）してください。", true);
        }
        break;
      case "INTERVENE": sendMessage("議論が膠着しているわ。新しい視点を持つ賢人を1名、介入（ドアノック）させて。"); break;
      case "RESET": clearHistory(); break;
      case "LEGACY": alert("LEGACY Project (賢人化)\n\n現在、機能調整中です。\n(Coming Soon...)"); break;
      case "SPECIAL": alert("Special Content\n\n現在、鋭意制作中です。ご期待ください。\n(Coming Soon...)"); break;
    }
  };

  const summonSage = (sageName: string) => {
    setShowSageList(false);
    sendMessage(`【招集命令】\n${sageName}、会議に参加して意見を述べてくれ。`);
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
    "都道府県": ["都道府県"]
  };

  // --- 1. エントランス画面 ---
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
                // システムコマンド送信（第2引数trueで履歴に残さない）
                setTimeout(() => sendMessage("【システム指令】チェックイン処理。オーナーに「メンバーを自分で選ぶか、議長に任せるか」の選択肢を提示し、操作方法（サイドバー/ハンバーガーメニューから賢人一覧やチーム生成を選択できること）を案内せよ。", true, []), 500);
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
                setIsSetupComplete(true);
                setTypingIndex(-1);
                // システムコマンド送信（第2引数trueで履歴に残さない）
                setTimeout(() => sendMessage("【システム指令】ゲストチェックイン処理。オーナーに「メンバーを自分で選ぶか、議長に任せるか」の選択肢を提示し、操作方法（サイドバー/ハンバーガーメニュー）を案内せよ。", true, []), 500);
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

  // --- 2. メインチャット画面 ---
  return (
    <div className="flex h-screen bg-[#fff] text-[#1f1f1f] font-sans overflow-hidden">
      {/* Sidebar */}
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
          <MenuButton icon="🗑️" label="記憶の消去 (Reset)" onClick={() => handleMenuAction("RESET")} />
          <MenuButton icon="🏛️" label="LEGACY (賢人化)" onClick={() => handleMenuAction("LEGACY")} />
          <MenuButton icon="💎" label="スペシャルコンテンツ" onClick={() => handleMenuAction("SPECIAL")} />
        </nav>
        <div className="p-4 text-xs text-[#aaa] text-center font-[family-name:var(--font-cinzel)]">
          COORD: {birthDate ? birthDate.replace(/-/g, '.') : "GUEST"}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-white">
        {/* Mobile Header */}
        <header className="md:hidden p-4 border-b border-[#eee] bg-white flex justify-between items-center sticky top-0 z-10">
          <button onClick={handleGoToTop}>
            <span className="font-[family-name:var(--font-cinzel)] font-bold hover:text-[#a38e5e] transition-colors">THE CABINET</span>
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleMenuAction("TEAM")} className="p-2 bg-[#f5f5f5] rounded text-lg">⚡</button>
            <button onClick={() => handleMenuAction("LIST")} className="p-2 bg-[#f5f5f5] rounded text-lg">📜</button>
            <button onClick={() => handleMenuAction("RESET")} className="p-2 bg-[#f5f5f5] rounded text-lg">🗑️</button>
          </div>
        </header>

        {/* Chat Area */}
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
                        <span className="font-bold text-[#333] text-sm font-sans">{msg.speaker}</span>
                        <span className="text-xs text-[#888] font-sans">{roleText}</span>
                        {isBuddha && (
                          <button onClick={() => playFrequency(963)} className="ml-2 px-2 py-0.5 bg-[#E6E6FA] text-[#4B0082] text-[10px] rounded-full hover:bg-[#D8BFD8] transition-colors flex items-center gap-1">
                            <span>🔊</span> 963Hz
                          </button>
                        )}
                      </div>
                    )}
                    <div className={`p-5 rounded-2xl text-[15px] leading-relaxed shadow-sm font-sans ${isUser ? "bg-[#111] text-white rounded-tr-none" : getSpeakerStyle(msg.speaker) + " rounded-tl-none"}`}>
                      {/* ★グラフ表示ロジック追加 */}
                      {(!isUser && msg.content.includes("[CYCLE_GRAPH]") && birthDate) && (
                        <div className="mb-4">
                          {/* birthDateを使ってリアルタイムにデータを生成して渡す */}
                          <FateCycleDashboard data={AstroLogic.generateCycleData(birthDate)} />
                        </div>
                      )}

                      {/* テキスト表示（タグは削除して表示） */}
                      {isUser || index < typingIndex ? (
                        msg.content.replace("[CYCLE_GRAPH]", "")
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

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-[#eee]">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading || (messages.length > 0 && typingIndex < messages.length)} placeholder="ここに議題を入力..." className="w-full bg-[#f8f9fa] border border-[#ddd] text-[#333] px-6 py-4 rounded-full focus:outline-none focus:border-[#a38e5e] focus:ring-1 focus:ring-[#a38e5e] transition-all shadow-inner disabled:opacity-50 font-sans" />
            <button type="submit" disabled={!input || isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#333] text-white rounded-full hover:bg-[#000] disabled:bg-[#ccc] transition-all">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </main>

      {/* Modal: Sage List (Masonry Layout) */}
      {showSageList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowSageList(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
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
                        <button key={sage.id} onClick={() => summonSage(sage.name)} className="flex gap-3 p-3 border border-[#eee] rounded-lg hover:border-[#a38e5e] hover:bg-[#fcfcfc] hover:shadow-md transition-all text-left group">
                          <div className="group-hover:scale-105 transition-transform"><Avatar name={sage.name} /></div>
                          <div><div className="font-bold text-[#333] text-sm group-hover:text-[#a38e5e]">{sage.name}</div><div className="text-[10px] text-[#666] mt-0.5">{sage.role}</div></div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
      <style jsx global>{` .font-sans { font-family: 'Noto Sans JP', sans-serif; } .font-serif { font-family: 'Shippori Mincho', serif; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; } .animate-fade-in { animation: fadeInUp 0.8s ease-out forwards; } `}</style>
    </div>
  );
}

const MenuButton = ({ icon, label, onClick }: { icon: string, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#555] hover:bg-[#fff] hover:text-[#333] hover:shadow-sm rounded transition-all text-left group font-sans">
    <span className="group-hover:scale-110 transition-transform text-lg">{icon}</span><span>{label}</span>
  </button>
);