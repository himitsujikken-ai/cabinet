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

        // --- 時間帯ロジック ---
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

        // --- 運命情報の更新 ---
        let currentBirthDate = birthDate;
        const dateMatch = message.match(/新規設定生年月日:\s*([\d-]+)/);
        if (dateMatch) {
            currentBirthDate = dateMatch[1];
        }
        const analysis = currentBirthDate ? AstroLogic.analyze(currentBirthDate) : "データなし（ゲスト）";
        const userProfile = `【ユーザー運命情報・周期律】\n${analysis}\n\n※時読みナビゲーターは、この「運命情報」と「現在時刻」を掛け合わせてアドバイスせよ。`;

        // --- DBアップデート ---
        const UPDATED_DB = SAGE_DB.map(s => {
            let newName = s.name;
            let newRole = s.role;
            if (s.id === "alchemist" || s.name === "マインド・アルケミスト") { newName = "ポテンシャルジェネレーター"; newRole = "チーム論・心理錬金術"; }
            if (s.id === "curator" || s.name === "アイデンティティ・キュレーター") { newName = "アイデンティティ・キング"; newRole = "Only1・本質キュレーション"; }
            if (s.id === "navigator" || s.name === "時読みコンシェルジュ") { newName = "時読みナビゲーター"; }
            return { ...s, name: newName, role: newRole };
        });

        // --- メンバー決定ロジック ---
        let activeTeam: Sage[] = [];
        const isGrandCompass = message.includes("Grand Compass");
        const isGrandCompassExisting = message.includes("Grand Compass再起動（設定済み）");
        const isCheckinChoice = message.includes("メンバーを自分で選ぶか");
        const isSummonCommand = message.includes("招集命令") || message.includes("緊急招集") || message.includes("呼んで") || message.includes("招集");

        // 1. クライアントからの名簿引き継ぎ
        if (!isGrandCompass && !isCheckinChoice && !isSummonCommand && currentMembers && Array.isArray(currentMembers) && currentMembers.length > 0) {
            activeTeam = currentMembers.map(name => UPDATED_DB.find(s => s.name === name)).filter(s => s !== undefined) as Sage[];
        }

        // 2. メンバー自動選抜
        if (activeTeam.length === 0 && !isSummonCommand) {
            if (isGrandCompass || !isCheckinChoice) {
                if (!isCheckinChoice) {
                    const candidates = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id));
                    activeTeam = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
                }
            }
        }

        // --- プロンプト生成 ---
        const rosterText = activeTeam.map(s => {
            let desc = `- ${s.name} (${s.role}): ${s.philosophy} 口調:${s.tone}`;
            if (s.category === "都道府県") desc += `\n   【重要：民話OS搭載】...（略）`;
            return desc;
        }).join("\n\n");

        const fullDirectory = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id)).map(s => `- ${s.name} [${s.role}]`).join("\n");
        const simpleRoster = activeTeam.map(s => `- ${s.name}`).join("、");

        let SYSTEM_PROMPT = "";

        if (isSummonCommand) {
            // 招集命令
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。ユーザーの希望する賢人を招集してください。
【最重要任務】
1. ユーザーの言葉から賢人を推測し、**必ず以下の【全賢人リスト】の中から**選んでください。
2. リストにない人物の捏造は厳禁です。
3. 合計3名になるよう、相性の良い賢人をリストから補完してください。
【全賢人リスト】
${fullDirectory}
【出力】JSON配列形式。
`;
        } else if (isCheckinChoice) {
            // ★修正: チェックイン時の選択肢提示プロンプト（質問を減らしてスマートに）
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
オーナーがチェックインしました。**まだ賢人は選抜しないでください（activeTeamは空です）。**

【任務】
1. **時読みナビゲーター**:
   - 冒頭で「ようこそ、オーナー様。私は13種類の統計学と膨大な天文学データを統合し...」と自己紹介してください。
   - **【重要】**: 発言の冒頭または末尾に、必ず **[CYCLE_GRAPH]** というタグを含めてください。これにより、オーナーの端末に「運命周期律のビジュアル分析ボード」が表示されます。
   - 分析ボードが表示された前提で、「ご覧ください。現在のあなたの運気は...」と、グラフを指し示すように解説を始めてください。
   - 長文で詳細に語ってください。

2. **知の宰相 (AI議長)**: 
   - ナビゲーターの分析を受け、優雅に「オーナー様、新たな議題の幕開けですね。本日の賢人選抜について、ご意向をお聞かせください」と切り出してください。
   - 続けて、以下の選択肢を**箇条書きスタイル**でスマートに提示してください。
     - **運命によるコーディネート**: 生年月日と惑星配置に基づき、私が最適な賢人を選抜する。
     - **オーナーによる指名**: サイドバー（メニュー）より、お好きな賢人を招集する。
   - 最後に一言、「どちらになさいますか？」とだけ添えてください。

【出力フォーマット】
JSON配列形式のみ。**日本語のみを使用せよ。**
[
  { "speaker": "時読みナビゲーター", "content": "[CYCLE_GRAPH] オーナー様、ようこそ...（分析結果）" },
  { "speaker": "知の宰相 (AI議長)", "content": "オーナー様、新たな議題の幕開けですね。本日の賢人選抜について、ご意向をお聞かせください。\n\n・**運命によるコーディネート**: ...\n・**オーナーによる指名**: ...\n\nどちらになさいますか？" }
]
`;
        } else if (isGrandCompassExisting) {
            // 設定済みGrand Compass
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
オーナーが「Grand Compass」を押しましたが、既に生年月日は設定済みです。
【任務】
1. **知の宰相 (AI議長)**: 
   - 「Grand Compassによる分析は完了しております」と伝え、生年月日変更には『記憶の消去(Reset)』が必要と案内してください。
   - 「現在の座標に基づき、賢人を再選抜しました」と宣言し、今回選ばれた3名（${simpleRoster}）を紹介してください。
2. **時読みナビゲーター**: 短く補足。
3. **賢人**: 待機。
【出力】JSON配列形式。
`;
        } else if (activeTeam.length > 0 && !currentMembers?.length && isGrandCompass) {
            // 新規Grand Compass
            SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
Grand Compassにより、本日の賢人選抜を行いました。
【任務】
1. **議長**: 「この3名（${simpleRoster}）を選抜しました」と宣言し、**運命データに基づいた選抜理由**を語れ。
2. **ナビゲーター**: 運勢と時間のアドバイスを行え。
${userProfile}
【出力】JSON配列形式。
`;
        } else if (activeTeam.length > 0 && !currentMembers?.length) {
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

        // 標準ロジック
        if (!SYSTEM_PROMPT) {
            const hasSageSpoken = history && history.some((msg: any) => msg.role === "assistant" && msg.speaker && !SYSTEM_ROLES.includes(msg.speaker));
            const isFirstTurn = !hasSageSpoken || isGrandCompass;

            if (isFirstTurn && activeTeam.length > 0) {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」のAI議長です。
【任務】
1. **議長**: 「（${simpleRoster}）を選抜しました」と宣言し、理由を語れ。
2. **ナビゲーター**: 運勢と時間（${planetaryContext}）のアドバイスを行え。${timeInstruction}
3. **賢人**: 待機せよ。
${userProfile}
【出力】JSON配列形式。
`;
            } else {
                SYSTEM_PROMPT = `
あなたは「THE CABINET」の賢人会議シミュレーターです。
現在時刻: ${planetaryContext}
【参加メンバー】
${rosterText}

【ルール】
1. 日本語のみ。
2. ナビゲーターは指名以外沈黙。
3. 長文・感情表現（🔥✨）を徹底。
4. クロストーク推奨。
【出力】JSON配列形式。
`;
            }
        }

        const formattedHistory = [];
        formattedHistory.push({ role: "user", parts: [{ text: `【SYSTEM INSTRUCTION】\n${SYSTEM_PROMPT}` }] });
        formattedHistory.push({ role: "model", parts: [{ text: "Understood. Japanese ONLY. Output JSON." }] });

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