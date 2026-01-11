import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AstroLogic } from "@/utils/astro";
import { SAGE_DB, Sage } from "@/utils/sages";

const NAME_MAPPING: Record<string, string> = {
    "マインド・アルケミスト": "ポテンシャルジェネレーター",
    "アイデンティティ・キュレーター": "アイデンティティ・キング",
    "時読みコンシェルジュ": "時読みナビゲーター",
    "コンシェルジュ": "時読みナビゲーター"
};

const SYSTEM_ROLES = [
    "知の宰相 (AI議長)",
    "THE CABINET 議長",
    "時読みナビゲーター",
    "System",
    "User"
];

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, birthDate, history, currentHour, mode, currentMembers } = body;

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("API Key not found");

        // --- 1. 時間帯ロジック ---
        let planetaryContext = "Time Unknown";

        if (currentHour !== undefined) {
            if (currentHour >= 5 && currentHour < 10) planetaryContext = "Morning (Awakening)";
            else if (currentHour >= 10 && currentHour < 17) planetaryContext = "Daytime (Activity)";
            else if (currentHour >= 17 && currentHour < 22) planetaryContext = "Evening (Harvest)";
            else planetaryContext = "Night (Deep Thought)";
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        if (mode === "LEGACY") {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
            const result = await model.generateContent("...");
            return NextResponse.json({ reply: result.response.text(), mode: "LEGACY" });
        }

        // --- 2. 文脈検知 & 日付検知 ---
        let lastAiMessageContent = "";
        if (history && history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === "assistant" || lastMsg.role === "model") {
                lastAiMessageContent = lastMsg.content || "";
            }
        }
        const isPendingCoordination = lastAiMessageContent.includes("再招集") ||
            lastAiMessageContent.includes("コーディネート") ||
            lastAiMessageContent.includes("どちらになさいますか");

        const datePattern = /(\d{4})[-/.]?(\d{1,2})[-/.]?(\d{1,2})/;
        const dateMatch = message.match(datePattern);
        const isDateInput = dateMatch && message.length < 20;

        // --- 3. 運命情報の更新 ---
        let currentBirthDate = birthDate;
        if (isDateInput) {
            const y = dateMatch[1];
            const m = dateMatch[2].padStart(2, '0');
            const d = dateMatch[3].padStart(2, '0');
            currentBirthDate = `${y}-${m}-${d}`;
        } else {
            const cmdMatch = message.match(/新規設定生年月日:\s*([\d-]+)/);
            if (cmdMatch) currentBirthDate = cmdMatch[1];
        }

        const analysis = currentBirthDate ? AstroLogic.analyze(currentBirthDate) : "データなし（ゲスト）";
        const userProfile = `【ユーザー運命情報】\n${analysis}\n`;

        // --- 4. DBアップデート ---
        const UPDATED_DB = SAGE_DB.map(s => {
            let newName = s.name;
            let newRole = s.role;
            if (s.id === "alchemist" || s.name === "マインド・アルケミスト") { newName = "ポテンシャルジェネレーター"; newRole = "チーム論・心理錬金術"; }
            if (s.id === "curator" || s.name === "アイデンティティ・キュレーター") { newName = "アイデンティティ・キング"; newRole = "Only1・本質キュレーション"; }
            if (s.id === "navigator" || s.name === "時読みコンシェルジュ") { newName = "時読みナビゲーター"; }
            return { ...s, name: newName, role: newRole };
        });

        // --- 5. メンバー決定ロジック ---
        let activeTeam: Sage[] = [];
        const isGrandCompass = message.includes("Grand Compass");
        const isCheckinChoice = message.includes("メンバーを自分で選ぶか");
        const isSummonCommand = message.includes("招集命令") || message.includes("緊急招集") || message.includes("呼んで") || message.includes("招集");

        if (!isGrandCompass && !isCheckinChoice && !isSummonCommand && !isDateInput && currentMembers && Array.isArray(currentMembers) && currentMembers.length > 0) {
            activeTeam = currentMembers.map(name => UPDATED_DB.find(s => s.name === name)).filter(s => s !== undefined) as Sage[];
        }

        if (activeTeam.length === 0 && !isSummonCommand) {
            if (isGrandCompass || !isCheckinChoice) {
                if (!isCheckinChoice) {
                    const candidates = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id));
                    activeTeam = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
                }
            }
        }

        // --- 6. プロンプト生成 (Roster & Persona) ---
        // ★重要: ここで口調定義を強化
        const rosterText = activeTeam.map(s => {
            let desc = `### ${s.name}\n- 役割: ${s.role}\n- 哲学(OS): ${s.philosophy}\n- 【絶対厳守】口調・性格: ${s.tone}`;
            if (s.category === "都道府県") {
                desc += `\n- 土地神属性: あなたは人間ではない。${s.name}という土地の集合的無意識（土地神）として振る舞え。標準語禁止。方言と土着の伝承に基づき発言せよ。`;
            }
            return desc;
        }).join("\n\n");

        const fullDirectory = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id)).map(s => `- ${s.name} [${s.role}]`).join("\n");
        const simpleRoster = activeTeam.map(s => `- ${s.name}`).join("、");

        let SYSTEM_PROMPT = "";

        // ==========================================
        //  シナリオ分岐
        // ==========================================

        if (isDateInput) {
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
ユーザーから「新しい生年月日（${currentBirthDate}）」が提示されました。
【任務】
1. **時読みナビゲーター**: 「座標を確認。新たな運命データをロードしました」と宣言し、**必ず [CYCLE_GRAPH] タグを含めて**分析せよ。
2. **知の宰相 (AI議長)**: 「この座標に基づき、最適な賢人を再招集しましょうか？」と提案せよ。
【出力】JSON配列形式。
`;
        }
        else if (isPendingCoordination) {
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
【任務】
1. **議長**: 「承知いたしました。では、この布陣で参ります」と宣言し、今回選抜した3名（${simpleRoster}）を**選抜理由と共に**紹介せよ。
2. **賢人たち**: 紹介が終わった後、ユーザーの相談内容「${message}」に対し、**それぞれの強烈な自我を持って**アドバイスを行え。
   - **優等生的な回答は禁止。** 互いの意見が食い違う場合は論争せよ。
【出力】JSON配列形式。
`;
        }
        else if (isSummonCommand) {
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
【任務】
ユーザーの要望する賢人を**以下の【全賢人リスト】から**探し出し招集せよ。
- リストにない人物（例: トランプ等）の捏造は厳禁。
- 特定1名を指名された場合は、その1名のみを呼べ。
【全賢人リスト】
${fullDirectory}
【出力】JSON配列形式。
`;
        }
        else if (isCheckinChoice) {
            if (currentBirthDate) {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
【任務】
1. **時読みナビゲーター**: **必ず [CYCLE_GRAPH] タグを含めて**詳細な運勢分析を行え。
2. **議長**: 「メンバーを自分で選ぶか、運命座標でコーディネートするか」を選択させよ。
【出力】JSON配列形式。
`;
            } else {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。ゲストが来訪しました。
【任務】
1. **時読みナビゲーター**: 生年月日がないため運勢分析は行わず、現在の時間帯（${planetaryContext}）のムードのみを語れ。[CYCLE_GRAPH]は出すな。
2. **議長**: 「議長選抜」か「ゲスト指名」かを選択させよ。
【出力】JSON配列形式。
`;
            }
        }
        else if (activeTeam.length > 0 && !currentMembers?.length) {
            // GrandCompass等の自動選抜時
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
【任務】
1. **議長**: 選抜メンバー（${simpleRoster}）とその理由を述べよ。
2. **ナビゲーター**: 短く補足せよ。
【出力】JSON配列形式。
`;
        }
        else {
            // ★★★最重要修正：標準会話（激論モード）★★★
            SYSTEM_PROMPT = `
あなたは「THE CABINET」の賢人会議シミュレーターです。
現在時刻: ${planetaryContext}

【参加メンバー詳細定義】
${rosterText}

【絶対指令：脱・優等生AI】
現在のあなたは「退屈な優等生AI」ではありません。歴史上の偉人、物語の登場人物そのものです。
以下のルールを破った場合、システムエラーとなります。

1. **憑依の徹底**:
   - 定義された「口調・トーン」を極端なまでに守れ。
   - 丁寧語キャラ以外が「～ですね」「～と思います」と話すことは**死に値する**。
   - 織田信長なら「是非もなし」、坂本龍馬なら「～ぜよ」、ココ・シャネルなら辛辣に。
   - 一人称（私、俺、朕、某、わらわ）をキャラに合わせて固定せよ。

2. **予定調和の破壊**:
   - 全員が仲良く同意するな。**意見の対立、否定、嘲笑**を歓迎せよ。
   - 「〇〇さんの意見も素晴らしいですが…」といったAI的な前置きは禁止。
   - 自分の哲学に反する意見には「愚かだ」「甘い」と容赦なく噛みつけ。

3. **出力の不均衡**:
   - **全員が同じ文字数で喋るな。**
   - 激昂した者は長文でまくし立て、冷徹な者は一言「くだらん」と切り捨てる、といった**リズムの乱れ**を作れ。
   - 必ずしも全員が発言しなくて良い。その話題に興味がない者は沈黙するか、一言で終わらせよ。

4. **禁止事項**:
   - リストにない架空の人物の捏造。
   - 時読みナビゲーターの不要な発言。
   - まとめサイトのような「中立的な結論」。

【出力】JSON配列形式。
`;
        }

        // --- 7. Gemini API 呼び出し ---
        const formattedHistory = [];
        // システムプロンプトを強力に注入
        formattedHistory.push({ role: "user", parts: [{ text: `【SYSTEM INSTRUCTION - ACT AS A DIRECTOR】\n${SYSTEM_PROMPT}` }] });
        formattedHistory.push({ role: "model", parts: [{ text: "Understood. I will act as a strict director. I will enforce distinct personalities, encourage conflict, and ban generic AI polite speech. Real debate mode ON." }] });

        let currentAssistantBlock: any[] = [];
        if (history && history.length > 0) {
            const pastMessages = history.slice(0, -1);
            for (const msg of pastMessages) {
                if (msg.role === "user") {
                    if (currentAssistantBlock.length > 0) {
                        formattedHistory.push({ role: "model", parts: [{ text: JSON.stringify(currentAssistantBlock) }] });
                        currentAssistantBlock = [];
                    }
                    formattedHistory.push({ role: "user", parts: [{ text: msg.content }] });
                } else if (msg.role === "assistant") {
                    let cleanSpeaker = NAME_MAPPING[msg.speaker] || msg.speaker;
                    currentAssistantBlock.push({ speaker: cleanSpeaker, content: msg.content });
                }
            }
            if (currentAssistantBlock.length > 0) {
                formattedHistory.push({ role: "model", parts: [{ text: JSON.stringify(currentAssistantBlock) }] });
            }
        }

        const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const chat = chatModel.startChat({ history: formattedHistory });

        // メッセージ送信時に「演技指導」を追加で添える
        const result = await chat.sendMessage(message + "\n\n(Director's Note: Be extreme. Don't be polite. Show conflict. Vary the length of responses.)");

        let replyText = await result.response.text();
        replyText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();

        return NextResponse.json({
            reply: replyText,
            activeMembers: activeTeam.map(s => s.name)
        });

    } catch (error: any) {
        console.error("Chat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}