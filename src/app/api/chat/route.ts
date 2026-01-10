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
        let timeInstruction = "";

        if (currentHour !== undefined) {
            if (currentHour >= 5 && currentHour < 10) {
                planetaryContext = "Morning (Awakening / Planting)";
                timeInstruction = `現在は朝(${currentHour}時)です。「発生」「始動」の時間帯です。`;
            }
            else if (currentHour >= 10 && currentHour < 17) {
                planetaryContext = "Daytime (Activity / Growth)";
                timeInstruction = `現在は昼(${currentHour}時)です。「活動」「光合成」の時間帯です。「夜」と言ってはいけません。`;
            }
            else if (currentHour >= 17 && currentHour < 22) {
                planetaryContext = "Evening (Harvest / Review)";
                timeInstruction = `現在は夕方・夜の始まり(${currentHour}時)です。「収穫」「整理」「冷却」の時間帯です。`;
            }
            else {
                planetaryContext = "Night (Fermentation / Rooting)";
                timeInstruction = `現在は深夜(${currentHour}時)です。「発酵」「根張り」「内省」の時間帯です。`;
            }
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        if (mode === "LEGACY") {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
            const result = await model.generateContent("...");
            return NextResponse.json({ reply: result.response.text(), mode: "LEGACY" });
        }

        // --- 2. 日付入力の検知ロジック ---
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
        const userProfile = `【ユーザー運命情報・周期律】\n${analysis}\n\n※時読みナビゲーターは、この「運命情報」と「現在時刻」を掛け合わせてアドバイスせよ。`;

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
        const isGrandCompassExisting = message.includes("Grand Compass再起動（設定済み）");
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

        // --- 6. プロンプト生成 (Roster) ---
        const rosterText = activeTeam.map(s => {
            let desc = `- ${s.name} (${s.role}): ${s.philosophy} 口調:${s.tone}`;
            if (s.category === "都道府県") {
                desc += `\n   【重要：土地神OS搭載】あなたは単なる方言キャラクターではない。${s.name}の「擬人化された土地神」である。\n   発言には必ず、その土地固有の「民話・伝承」「地形・気候による影響」「歴史的背景」「県民性（気質）」を論理的根拠として組み込め。\n   単に方言で喋るだけでなく、その土地の風土に根ざした深い知恵と哲学でアドバイスせよ。`;
            }
            return desc;
        }).join("\n\n");

        const fullDirectory = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id)).map(s => `- ${s.name} [${s.role}]`).join("\n");
        const simpleRoster = activeTeam.map(s => `- ${s.name}`).join("、");

        let SYSTEM_PROMPT = "";

        // ==========================================
        //  シナリオ分岐 (優先度順)
        // ==========================================

        if (isDateInput) {
            // 日付更新時
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
ユーザーから「新しい生年月日（${currentBirthDate}）」が提示されました。

【任務】
1. **時読みナビゲーター**:
   - 「座標を確認。新たな運命データをロードしました」と宣言してください。
   - **必ず発言に [CYCLE_GRAPH] タグを含めてください。**
   - 「ご覧ください。この座標が示すあなたの運命周期は...」と、グラフを指し示すように詳細な分析を行ってください。

2. **知の宰相 (AI議長)**:
   - 「オーナー様、新たな座標の同期、ありがとうございます」と感謝を述べてください。
   - 「この新しい運命座標に基づき、最適な賢人たちを再招集（コーディネート）いたしましょうか？」と提案してください。

【出力フォーマット】JSON配列形式。
`;
        }
        else if (isSummonCommand) {
            // ★修正: 招集命令（単独指名の尊重）
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。ユーザーの希望する賢人を招集してください。

【最重要任務】
1. ユーザーの言葉から賢人を推測し、**必ず以下の【全賢人リスト】の中から**選んでください。
2. リストにない人物の捏造は厳禁です。
3. **【重要】ユーザーが特定の1名を指名した場合、その1名のみを招集してください。**
   - 勝手に他のメンバーを補充して3名にする必要はありません。
   - ユーザーとの1対1の対話の場を作ってください。
   - ただし、「チームを作れ」「3人呼んで」等と言われた場合はこの限りではありません。

【全賢人リスト】
${fullDirectory}

【出力】JSON配列形式。
`;
        }
        else if (isCheckinChoice) {
            // チェックイン時
            if (currentBirthDate) {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
オーナーがチェックインしました。
【任務】
1. **時読みナビゲーター**: 自己紹介し、**必ず [CYCLE_GRAPH] タグを含めて**詳細な運勢分析を行ってください。
2. **知の宰相 (AI議長)**: 「メンバーを自分で選ぶか、運命座標でコーディネートするか」の選択肢を箇条書きで提示してください。
【出力】JSON配列形式。
`;
            } else {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
**ゲストユーザー（生年月日データなし）**がチェックインしました。
【任務】
1. **時読みナビゲーター**:
   - 「ようこそ、ゲスト様。私は時読みナビゲーターです」と挨拶してください。
   - **【重要】生年月日データがないため、嘘の運勢分析や [CYCLE_GRAPH] の表示は禁止です。**
   - 代わりに、現在の時刻（${planetaryContext}）に基づき、「今の時間は〇〇な空気感が流れています」と、時間帯のムードだけを**文章で**伝えてください。
   - 「もし生年月日を設定していただければ、詳細な運命分析が可能ですが、このままでも十分対話は楽しめます」と優しく添えてください。

2. **知の宰相 (AI議長)**: 
   - 「ゲスト様、ようこそ。本日の賢人選抜について、ご意向をお聞かせください」と切り出してください。
   - 以下の選択肢を**箇条書きスタイル**で提示してください。
     - **議長による直感選抜**: 現在の場の空気に合わせて、私が3名を選抜する。
     - **ゲストによる指名**: サイドバー（メニュー）より、お好きな賢人を招集する。
   - 最後に「どちらになさいますか？」と添えてください。

【出力フォーマット】
JSON配列形式のみ。**日本語のみ。**
[
  { "speaker": "時読みナビゲーター", "content": "ようこそゲスト様。現在は...（時間帯の解説）...まずはこの空気感の中で対話を楽しみましょう。" },
  { "speaker": "知の宰相 (AI議長)", "content": "ゲスト様、ようこそ。本日の賢人選抜について、ご意向をお聞かせください。\n\n・**議長による直感選抜**\n・**ゲストによる指名**\n\nどちらになさいますか？" }
]
`;
            }
        }
        else if (isGrandCompassExisting) {
            // 設定済みGrand Compass
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
既に分析済みの状態でGrand Compassが押されました。
【任務】
1. **議長**: 「分析は完了しています。再設定にはリセットが必要です」と案内し、現在の座標で賢人を再選抜（${simpleRoster}）して紹介してください。
2. **ナビゲーター**: 沈黙せよ。
【出力】JSON配列形式。
`;
        }
        else if (activeTeam.length > 0 && !currentMembers?.length && isGrandCompass) {
            // 新規Grand Compass
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
Grand Compassにより、本日の賢人選抜を行いました。
【任務】
1. **議長**: 「この3名（${simpleRoster}）を選抜しました」と宣言し、運命データに基づいた選抜理由を語れ。
2. **ナビゲーター**: 運勢と時間のアドバイスを行え。
${userProfile}
【出力】JSON配列形式。
`;
        }
        else if (activeTeam.length > 0 && !currentMembers?.length) {
            // 通常の自動選抜
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
本日の賢人選抜を行いました。
【任務】
1. **議長**: 「（${simpleRoster}）を選抜しました」と宣言し、理由を語れ。
2. **ナビゲーター**: 短く補足せよ。
${userProfile}
【出力】JSON配列形式。
`;
        }
        else {
            // ★修正: 標準会話モード（フォーマット指定を追加）
            SYSTEM_PROMPT = `
あなたは「THE CABINET」の賢人会議シミュレーターです。
現在時刻: ${planetaryContext}
【参加メンバー】
${rosterText}

【絶対ルール】
1. **言語**: 完全な日本語を使用せよ。
2. **時読みナビゲーターの完全沈黙**: 
   - ユーザーから「時読み」「運勢」「ナビゲーター」と**指名されない限り、絶対に発言してはいけません**。
   - 「システム」や「アップロード」などの機能的な質問には、**知の宰相 (AI議長)** が代表して答えてください。
   - ナビゲーターをJSON出力に含めないでください。
3. **賢人の挙動**:
   - メンバー同士で活発に議論せよ。
   - 長文・感情表現（🔥✨）を徹底。
   - 都道府県賢人は、方言だけでなくその土地の「民話・風習・歴史」を引用して語れ。
4. **【重要】フォーマット**:
   - 箇条書きやポイントを列挙する場合は、必ず**Markdownのリスト記法（- 項目）**を使用し、適度な改行を入れて読みやすくせよ。
   - 重要なキーワードや数字（1. 2. 3.）は、**太字（**text**）**で強調せよ。
   - 密なテキストの塊（Wall of Text）は禁止する。ブログ記事のような読みやすさを目指せ。

【出力】JSON配列形式。
`;
        }

        // --- 7. Gemini API 呼び出し ---
        const formattedHistory = [];
        formattedHistory.push({ role: "user", parts: [{ text: `【SYSTEM INSTRUCTION】\n${SYSTEM_PROMPT}` }] });
        formattedHistory.push({ role: "model", parts: [{ text: "Understood. Japanese ONLY. Navigator MUST be silent in standard mode. Use Markdown and Bold for readability. Single summon if requested. Output JSON." }] });

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
        const result = await chat.sendMessage(message);

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