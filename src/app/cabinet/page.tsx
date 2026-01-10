"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Clock, Fingerprint } from 'lucide-react';
import { SAGE_DB, Sage } from "@/utils/sages";

type Message = {
    role: "user" | "assistant";
    speaker?: string;
    content: string;
};

// 辞書
const SPEAKER_ROLES: Record<string, string> = {
    "知の宰相 (AI議長)": "THE CABINET 議長",
    "時読みコンシェルジュ": "運命の秘書",
    "アイデンティティ・キュレーター": "Only1・本質キュレーション",
    "マインド・アルケミスト": "チーム論・心理錬金術",
    "属性デザイナー": "Only1・個性分析",
    "Mr.ポテンシャル解放": "チーム論・覚醒",
    "影の参謀 (オリジナル)": "プライベート・ナレッジベース",
    // システム管理者
    "ゴータマ・ブッダ": "Layer 1・空",
    "ジョン・フォン・ノイマン": "Layer 4・論理",
    // 既存賢人
    "坂本龍馬": "維新・突破力",
    "中村天風": "信念・心身統一",
    "空海": "俯瞰・密教",
    "最澄": "育成・一隅を照らす",
    "三上照夫": "戦略・黒幕",
    "仲小路彰": "歴史哲学・未来学",
    "千利休": "美意識・侘び寂び",
    "ガストン・ネサン": "生命循環・ソマチット",
    "ドネラ・メドウズ": "システム思考",
    "ココ・シャネル": "革新・スタイル",
    "マザー・テレサ": "愛・奉仕",
    "武則天": "統治・権力運用",
    "ヒルデガルト": "全体性・神秘",
    "マダム・C.J.ウォーカー": "起業・自立支援",
    "周恩来": "調整・不倒翁",
    "タレーラン": "外交・変節",
    "アイゼンハワー": "管理・マトリクス",
    "ガンジー": "非暴力・真理",
    "キング牧師": "言葉・夢",
    "孫子": "兵法・勝算",
    "マキャベリ": "権力・冷徹",
    "ニコラ・テスラ": "直感・未来技術",
    "マックス・プランク": "量子・意識",
    "レオナルド・ダ・ヴィンチ": "万能・観察",
    "渋沢栄一": "道徳経済・合本",
    "ロックフェラー": "資本・独占",
    "イブン・ハルドゥーン": "興亡・社会学"
};

// --- 周波数再生エンジン (Web Audio API) ---
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
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = [
        "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500",
        "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-indigo-500",
        "bg-violet-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
    ];
    if (name.includes("知の宰相")) return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F2E6C2] flex items-center justify-center text-[#554] font-serif font-bold shadow-md border border-white text-lg">
            宰
        </div>
    );
    if (name.includes("コンシェルジュ")) return (
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-serif shadow-sm text-sm">
            秘
        </div>
    );
    if (name.includes("影の参謀")) return (
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-serif shadow-sm text-sm border border-gray-600">
            影
        </div>
    );
    if (name.includes("ブッダ")) return (
        <div className="w-10 h-10 rounded-full bg-[#E6E6FA] flex items-center justify-center text-[#4B0082] font-serif font-bold shadow-md border border-white text-lg">
            空
        </div>
    );
    if (name.includes("ノイマン")) return (
        <div className="w-10 h-10 rounded-full bg-[#E0FFFF] flex items-center justify-center text-[#008B8B] font-serif font-bold shadow-md border border-white text-lg">
            数
        </div>
    );

    if (name.includes("Singularity") || name.includes("シンギュラリティ")) return (
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-mono shadow-[0_0_10px_#fff] text-xs border border-white animate-pulse">
            ∞
        </div>
    );

    const colorClass = colors[Math.abs(hash) % colors.length];
    const initial = name.charAt(0);
    return (
        <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white font-bold shadow-sm text-lg`}>
            {initial}
        </div>
    );
};

const Typewriter = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState("");
    const indexRef = useRef(0);
    useEffect(() => {
        indexRef.current = 0;
        setDisplayedText("");
        const intervalId = setInterval(() => {
            if (indexRef.current >= text.length) {
                clearInterval(intervalId);
                if (onComplete) onComplete();
                return;
            }
            const char = text.charAt(indexRef.current);
            setDisplayedText((prev) => prev + char);
            indexRef.current++;
        }, 20);
        return () => clearInterval(intervalId);
    }, [text]);
    return <span>{displayedText}</span>;
};

// ▼▼▼ 1. テーマの定義を追加 (Homeコンポーネントの外でもOK) ▼▼▼
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

export default function Home() {
    const [birthDate, setBirthDate] = useState("");
    const [dateInput, setDateInput] = useState({ year: '', month: '', day: '', time: '' });
    const [manualHour, setManualHour] = useState<number | null>(null);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [typingIndex, setTypingIndex] = useState<number>(-1);
    const [showSageList, setShowSageList] = useState(false);

    // ▼▼▼ 2. 新しいStateを追加 ▼▼▼
    const [showTeamSelector, setShowTeamSelector] = useState(false);

    // LEGACY Mode State
    const [legacyResult, setLegacyResult] = useState<{ title: string; name: string; philosophy: string; message: string } | null>(null);
    const [showLegacyModal, setShowLegacyModal] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setBirthDate(today);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingIndex]);

    // ★自動再生のuseEffectは削除しました

    const sendMessage = async (text: string, isSystemCommand = false, mode?: string) => {
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
            const currentHour = manualHour !== null ? manualHour : new Date().getHours();
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    birthDate,
                    history: messages,
                    currentHour: currentHour,
                    mode: mode // Pass mode to API
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // ★ LEGACY MODE HANDLING
            if (data.mode === "LEGACY") {
                const result = JSON.parse(data.reply);
                setLegacyResult(result);
                setShowLegacyModal(true);
                setIsLoading(false);
                return;
            }

            const script = JSON.parse(data.reply);
            const newMessages = script.map((item: any) => ({
                role: "assistant",
                speaker: item.speaker,
                content: item.content,
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

    const handleMenuAction = (action: string) => {
        switch (action) {
            case "LIST": setShowSageList(true); break;
            case "TEAM": setShowTeamSelector(true); break; // ★ここを追加
            case "CHANGE": sendMessage("議論の流れを変えたいわ。現在のメンバーを解散し、全く違う視点を持つメンバーに入れ替えて。", false); break;
            case "LOG": alert("現在の画面を上にスクロールすると、過去の対話を確認できます。"); break;
            case "COMPASS": sendMessage("【システム指令】Grand Compass起動。運勢を再診断し、最適なメンバーを再招集してください。"); break;
            case "INTERVENE": sendMessage("議論が膠着しているわ。新しい視点を持つ賢人を1名、介入（ドアノック）させて。"); break;
            case "LEGACY":
                // Trigger LEGACY mode analysis
                sendMessage("LEGACY_REQUEST", true, "LEGACY");
                break;
            case "SPECIAL":
                // Trigger SPECIAL mode session
                sendMessage("SPECIAL_REQUEST", true, "SPECIAL");
                break;
        }
    };

    // ▼▼▼ 3. チーム生成関数を追加 ▼▼▼
    const summonTaskForce = (themeLabel: string) => {
        setShowTeamSelector(false);
        sendMessage(`【緊急招集命令】\nテーマ：「${themeLabel}」\n\n議長、このテーマについて議論したい。\n現在のメンバーを一度解散し、このテーマに最も適した知見を持つ「3名の賢人」をあなたの判断で選抜・招集せよ。\n選抜理由と共に、議論を開始してください。`);
    };

    const summonSage = (sageName: string) => {
        setShowSageList(false);
        sendMessage(`【招集命令】\n${sageName}、会議に参加して意見を述べてくれ。`);
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
        "システム・管理者": ["System"],
        "現代・内閣": ["Modern", "Secret", "Legend"],
        "哲学・革新": ["Spirit", "Women"],
        "戦略・歴史": ["Strategy"]
    };

    // --- 1. エントランス画面 ---
    if (!isSetupComplete) {
        const handleSync = (e: React.FormEvent) => {
            e.preventDefault();
            // 座標同期処理
            const y = dateInput.year.padStart(4, '0');
            const m = dateInput.month.padStart(2, '0');
            const d = dateInput.day.padStart(2, '0');
            if (y && m && d) {
                setBirthDate(`${y}-${m}-${d}`);
            }
            if (dateInput.time) {
                const h = parseInt(dateInput.time.split(':')[0], 10);
                setManualHour(h);
            }
            setIsSetupComplete(true);
            setTypingIndex(-1);
            setTimeout(() => sendMessage("本日の会議を開始してください。"), 500);
        };

        const handleSkip = () => {
            setIsSetupComplete(true);
            setTypingIndex(-1);
            setTimeout(() => sendMessage("ゲストとして会議を開始します。"), 500);
        };

        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

                {/* 背景エフェクト */}
                <div className="absolute inset-0 z-0 opacity-20">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900 rounded-full blur-[128px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900 rounded-full blur-[128px]" />
                </div>

                <div className="relative z-10 max-w-md w-full space-y-12 text-center">

                    {/* メインタイトルエリア */}
                    <div className="space-y-4 animate-fade-in-up">
                        <p className="text-xs tracking-[0.3em] text-gray-400 uppercase">
                            The Cabinet
                        </p>
                        <h1 className="text-3xl md:text-4xl font-light tracking-wider leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                            人生を<br />
                            オーケストレーションする
                        </h1>
                    </div>

                    {/* 入力フォームエリア */}
                    <div className="backdrop-blur-sm bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl">
                        <form onSubmit={handleSync} className="space-y-8">

                            <div className="space-y-4">
                                <div className="flex items-center justify-center space-x-2 text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm tracking-widest">時間座標（クロノス）の同期</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="YYYY"
                                        className="bg-black/40 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                        value={dateInput.year}
                                        onChange={(e) => setDateInput({ ...dateInput, year: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="MM"
                                        className="bg-black/40 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                        value={dateInput.month}
                                        onChange={(e) => setDateInput({ ...dateInput, month: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="DD"
                                        className="bg-black/40 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                        value={dateInput.day}
                                        onChange={(e) => setDateInput({ ...dateInput, day: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="time"
                                    className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                                    value={dateInput.time}
                                    onChange={(e) => setDateInput({ ...dateInput, time: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    className="group relative w-full bg-white text-black py-4 px-6 rounded-lg font-medium tracking-wider hover:bg-gray-200 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center">
                                        座標を確定して入室
                                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </button>

                                {/* 同期なしチェックインボタン */}
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="w-full py-3 px-6 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 tracking-widest flex items-center justify-center"
                                >
                                    <Fingerprint className="w-3 h-3 mr-2" />
                                    同期せずにチェックイン
                                </button>
                            </div>

                        </form>
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
                    <h1 className="text-xl font-[family-name:var(--font-cinzel)] tracking-widest text-[#333]">THE CABINET</h1>
                    <p className="text-[10px] text-[#888] mt-1 font-sans">Private Salon v3.3</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {/* ▼▼▼ 追加 ▼▼▼ */}
                    <MenuButton icon="⚡" label="チーム生成 (3名選抜)" onClick={() => handleMenuAction("TEAM")} />

                    <MenuButton icon="📜" label="賢人一覧" onClick={() => handleMenuAction("LIST")} />
                    <MenuButton icon="🔄" label="メンバー交代" onClick={() => handleMenuAction("CHANGE")} />
                    <MenuButton icon="🧭" label="Grand Compass" onClick={() => handleMenuAction("COMPASS")} />
                    <MenuButton icon="⚡" label="介入を呼び込む" onClick={() => handleMenuAction("INTERVENE")} />
                    <div className="border-t border-[#eee] my-4"></div>
                    <MenuButton icon="🏛️" label="LEGACY (賢人化)" onClick={() => handleMenuAction("LEGACY")} />
                    <MenuButton icon="💎" label="スペシャルコンテンツ" onClick={() => handleMenuAction("SPECIAL")} />
                    <MenuButton icon="📝" label="過去の対話記録" onClick={() => handleMenuAction("LOG")} />
                </nav>
                <div className="p-4 text-xs text-[#aaa] text-center font-[family-name:var(--font-cinzel)]">
                    COORD: {birthDate.replace(/-/g, '.')}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-white">
                {/* Mobile Header */}
                <header className="md:hidden p-4 border-b border-[#eee] bg-white flex justify-between items-center sticky top-0 z-10">
                    <span className="font-[family-name:var(--font-cinzel)] font-bold">THE CABINET</span>
                    <div className="flex gap-2">
                        {/* ▼▼▼ 追加 ▼▼▼ */}
                        <button onClick={() => handleMenuAction("TEAM")} className="p-2 bg-[#f5f5f5] rounded text-lg">⚡</button>
                        <button onClick={() => handleMenuAction("LIST")} className="p-2 bg-[#f5f5f5] rounded text-lg">📜</button>
                        <button onClick={() => handleMenuAction("LEGACY")} className="p-2 bg-[#f5f5f5] rounded text-lg">🏛️</button>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
                    {messages.map((msg, index) => {
                        if (index > typingIndex) return null;
                        const isUser = msg.role === "user";
                        const roleText = msg.speaker && SPEAKER_ROLES[msg.speaker] ? SPEAKER_ROLES[msg.speaker] : "";

                        // ★周波数判定
                        const isBuddha = msg.speaker?.includes("ブッダ");
                        const isNeumann = msg.speaker?.includes("ノイマン");

                        return (
                            <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                                <div className={`flex max-w-[90%] md:max-w-[75%] gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className="flex-shrink-0 mt-1">
                                        {isUser ? (
                                            <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white text-xs font-sans">YOU</div>
                                        ) : (
                                            <Avatar name={msg.speaker || "?"} />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {!isUser && (
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[#333] text-sm font-sans">{msg.speaker}</span>
                                                <span className="text-xs text-[#888] font-sans">{roleText}</span>

                                                {/* ★周波数再生ボタン (手動) */}
                                                {isBuddha && (
                                                    <button
                                                        onClick={() => playFrequency(963)}
                                                        className="ml-2 px-2 py-0.5 bg-[#E6E6FA] text-[#4B0082] text-[10px] rounded-full hover:bg-[#D8BFD8] transition-colors flex items-center gap-1"
                                                    >
                                                        <span>🔊</span> 963Hz
                                                    </button>
                                                )}
                                                {isNeumann && (
                                                    <button
                                                        onClick={() => playFrequency(639)}
                                                        className="ml-2 px-2 py-0.5 bg-[#E0FFFF] text-[#008B8B] text-[10px] rounded-full hover:bg-[#AFEEEE] transition-colors flex items-center gap-1"
                                                    >
                                                        <span>🔊</span> 639Hz
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className={`
                      p-5 rounded-2xl text-[15px] leading-relaxed shadow-sm font-sans
                      ${isUser
                                                ? "bg-[#111] text-white rounded-tr-none"
                                                : getSpeakerStyle(msg.speaker) + " rounded-tl-none"
                                            }
                    `}>
                                            {isUser || index < typingIndex ? (
                                                msg.content
                                            ) : (
                                                <Typewriter
                                                    text={msg.content}
                                                    onComplete={() => setTypingIndex(prev => prev + 1)}
                                                />
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
                            <div className="h-10 bg-[#f9fafb] rounded-2xl w-40 flex items-center px-4 text-xs text-[#888]">
                                思考中...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white border-t border-[#eee]">
                    <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading || (messages.length > 0 && typingIndex < messages.length)}
                            placeholder="ここに議題を入力..."
                            className="w-full bg-[#f8f9fa] border border-[#ddd] text-[#333] px-6 py-4 rounded-full focus:outline-none focus:border-[#a38e5e] focus:ring-1 focus:ring-[#a38e5e] transition-all shadow-inner disabled:opacity-50 font-sans"
                        />
                        <button
                            type="submit"
                            disabled={!input || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#333] text-white rounded-full hover:bg-[#000] disabled:bg-[#ccc] transition-all"
                        >
                            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            </main>

            {/* Modal: Sage List */}
            {showSageList && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowSageList(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-[#eee] flex justify-between items-center bg-[#f9fafb]">
                            <h2 className="text-xl font-bold text-[#333]">賢人招集 (Click to Summon)</h2>
                            <button onClick={() => setShowSageList(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-[#fff]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {Object.entries(categoryGroups).map(([groupName, categories]) => (
                                    <div key={groupName} className="flex flex-col gap-4">
                                        <h3 className="text-[#a38e5e] font-serif border-b border-[#eee] pb-2 text-lg tracking-widest text-center mb-2">
                                            {groupName}
                                        </h3>
                                        <div className="flex flex-col gap-3">
                                            {SAGE_DB.filter(s => categories.includes(s.category) && !s.id.includes("chancellor")).map((sage) => (
                                                <button
                                                    key={sage.id}
                                                    onClick={() => summonSage(sage.name)}
                                                    className="flex gap-3 p-3 border border-[#eee] rounded-lg hover:border-[#a38e5e] hover:bg-[#fcfcfc] hover:shadow-md transition-all text-left group"
                                                >
                                                    <div className="group-hover:scale-105 transition-transform">
                                                        <Avatar name={sage.name} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#333] text-sm group-hover:text-[#a38e5e]">{sage.name}</div>
                                                        <div className="text-[10px] text-[#666] mt-0.5">{sage.role}</div>
                                                    </div>
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

            {/* ▼▼▼ 4. チーム生成モーダル (TaskForce Selector) ▼▼▼ */}
            {showTeamSelector && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" onClick={() => setShowTeamSelector(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>

                        {/* ヘッダー */}
                        <div className="p-6 border-b border-[#eee] bg-[#fafaf8] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-[#333] font-[family-name:var(--font-cinzel)] tracking-wider">
                                    TASK FORCE GENERATION
                                </h2>
                                <p className="text-xs text-[#a38e5e] mt-1">議長権限による緊急チーム編成</p>
                            </div>
                            <button onClick={() => setShowTeamSelector(false)} className="text-[#888] hover:text-[#333] text-2xl">×</button>
                        </div>

                        {/* グリッドメニュー */}
                        <div className="p-6 bg-white max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {TASKFORCE_THEMES.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => summonTaskForce(theme.label)}
                                        className="flex flex-col items-center justify-center p-4 border border-[#eee] rounded-lg hover:border-[#a38e5e] hover:bg-[#fafaf8] hover:shadow-md transition-all group text-center gap-2 h-32"
                                    >
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

            {/* Modal: LEGACY (Sage Ascension) */}
            {showLegacyModal && legacyResult && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md font-serif" onClick={() => setShowLegacyModal(false)}>
                    <div className="bg-[#1a1a1a] text-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden relative border border-[#D4AF37]" onClick={e => e.stopPropagation()}>
                        {/* Decoration */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>

                        <div className="p-8 flex flex-col items-center text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-[#888] text-xs tracking-[0.3em] uppercase">Sage Ascension</p>
                                <h2 className="text-3xl font-bold text-[#D4AF37] font-[family-name:var(--font-cinzel)]">{legacyResult.title}</h2>
                            </div>

                            <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] flex items-center justify-center text-3xl text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                {legacyResult.name ? legacyResult.name.charAt(0) : "S"}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xl font-light tracking-wide">{legacyResult.name}</h3>
                                <div className="w-10 h-[1px] bg-[#333] mx-auto"></div>
                                <p className="text-sm text-gray-300 leading-relaxed italic">
                                    "{legacyResult.philosophy}"
                                </p>
                            </div>

                            <div className="bg-[#333]/30 p-4 rounded border border-white/5 w-full">
                                <p className="text-xs text-[#aaa] leading-relaxed">
                                    {legacyResult.message}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowLegacyModal(false)}
                                className="mt-4 px-8 py-2 border border-[#555] text-xs tracking-widest hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors uppercase"
                            >
                                Accept Destiny
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .font-sans { font-family: 'Noto Sans JP', sans-serif; }
        .font-serif { font-family: 'Shippori Mincho', serif; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        .animate-fade-in { animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>
        </div>
    );
}

const MenuButton = ({ icon, label, onClick }: { icon: string, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#555] hover:bg-[#fff] hover:text-[#333] hover:shadow-sm rounded transition-all text-left group font-sans"
    >
        <span className="group-hover:scale-110 transition-transform text-lg">{icon}</span>
        <span>{label}</span>
    </button>
);
