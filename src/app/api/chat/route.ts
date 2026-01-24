import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AstroLogic } from "@/utils/astro";
import { SAGE_DB, Sage } from "@/utils/sages";

const NAME_MAPPING: Record<string, string> = {
    "マインド・アルケミスト": "ポテンシャルジェネレーター",
    "アイデンティティ・キュレーター": "アイデンティティ・キング",
    "時読みコンシェルジュ": "時読みナビゲーター",
    "コンシェルジュ": "時読みナビゲーター",
    "AI Director": "知の宰相 (AI議長)",
    "Director": "知の宰相 (AI議長)",
    "Chancellor": "知の宰相 (AI議長)",
    "AI Time Navigator": "時読みナビゲーター",
    "Time Navigator": "時読みナビゲーター",
    "Navigator": "時読みナビゲーター"
};

const SYSTEM_ROLES = [
    "知の宰相 (AI議長)",
    "THE CABINET 議長",
    "時読みナビゲーター",
    "System",
    "User"
];

// 管理者へのレポート送信関数
async function reportToAdmin(userMessage: string, userBirthDate: string, aiResponse: any[]) {
    const DISCORD_WEBHOOK_URL = "";
    if (!DISCORD_WEBHOOK_URL) return;

    try {
        const fields = aiResponse.map((r: any) => ({
            name: r.speaker,
            value: r.content.substring(0, 1000) || "(No content)",
        }));

        await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "THE CABINET MONITOR",
                embeds: [{
                    title: "🕵️ 新しい対話ログ",
                    color: 0xD4AF37,
                    fields: [
                        { name: "👤 ユーザー", value: userBirthDate || "GUEST", inline: true },
                        { name: "🗣️ 発言", value: userMessage },
                        ...fields
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (e) {
        console.error("Monitor Error:", e);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, birthDate, history, currentHour, mode, currentMembers } = body;

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("API Key not found");

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

        const UPDATED_DB = SAGE_DB.map(s => {
            let newName = s.name;
            let newRole = s.role;
            if (s.id === "alchemist" || s.name === "マインド・アルケミスト") { newName = "ポテンシャルジェネレーター"; newRole = "チーム論・心理錬金術"; }
            if (s.id === "curator" || s.name === "アイデンティティ・キュレーター") { newName = "アイデンティティ・キング"; newRole = "Only1・本質キュレーション"; }
            if (s.id === "navigator" || s.name === "時読みコンシェルジュ") { newName = "時読みナビゲーター"; }
            return { ...s, name: newName, role: newRole };
        });

        let activeTeam: Sage[] = [];
        const isGrandCompass = message.includes("Grand Compass");
        const isCheckinChoice = message.includes("メンバーを自分で選ぶか");
        const isSummonCommand = message.includes("招集命令") || message.includes("緊急招集") || message.includes("呼んで") || message.includes("招集");
        const isAddSummon = message.includes("追加");

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

        const rosterText = activeTeam.map(s => {
            let desc = `### ${s.name}\n- 役割: ${s.role}\n- 哲学: ${s.philosophy}\n- 口調: ${s.tone}`;
            if (s.category === "都道府県") {
                desc += `\n- 土地神属性: 方言と土地の伝承に基づき発言せよ。`;
            }
            return desc;
        }).join("\n\n");

        const waitingRoomSages = UPDATED_DB.filter(s => !activeTeam.some(a => a.id === s.id) && !["navigator", "chancellor"].includes(s.id));
        const waitingRoomText = waitingRoomSages.map(s => `- ${s.name} [${s.role}]`).join("\n");
        const fullDirectory = UPDATED_DB.filter(s => !["navigator", "chancellor"].includes(s.id)).map(s => `- ${s.name} [${s.role}]`).join("\n");
        const simpleRoster = activeTeam.map(s => `- ${s.name}`).join("、");

        let SYSTEM_PROMPT = "";
        let directorsNote = "(Director's Note: Be highly intellectual and philosophical. Make your responses longer and more profound. Engage in HEATED CROSSTALK among sages. Use JAPANESE names for speakers.)";

        // ==========================================
        //  シナリオ分岐
        // ==========================================

        if (isDateInput || (isCheckinChoice && currentBirthDate)) {
            SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長、および時読みナビゲーターです。
${userProfile}
【任務】
1. **時読みナビゲーター**: 
   - 「座標を確認。運命データをロードしました」と宣言せよ。
   - **必ず [CYCLE_GRAPH] タグを記述**せよ。
   - 上記の【ユーザー運命情報】に基づき、**「持って生まれた性質（ポテンシャル）」と「現在のバイオリズム（今年の運勢サイクル）」を明確に分けて解説**せよ。
   - 【絶対ルール】：生まれ持った性格が「活発」であっても、今年の時期が「冬（停滞・内省）」であれば、最終的なアドバイスは「今年は動くべきではない」とするなど、**アドバイスに矛盾が生じないよう論理的に統合すること**。
2. **知の宰相 (AI議長)**: 「この座標に基づき、最適な賢人を再招集しましょうか？ それともご自身で指名されますか？」と選択させよ。
【出力】JSON配列形式。`;
            directorsNote = "(Director's Note: For this turn, PRIORITIZE the Time Navigator's analysis. DO NOT contradict yourself. Integrate the user's base personality with the current astrological cycle logically. You MUST include the [CYCLE_GRAPH] tag. Use JAPANESE names.)";
        }
        else if (isPendingCoordination) {
            // ★修正：チーム生成直後のファーストタッチでもクロストークを強制
            SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長です。
【任務】
1. **議長**: 「承知いたしました。では、この布陣で参ります」と宣言し、今回選抜した3名（${simpleRoster}）を**選抜理由と共に**紹介せよ。
2. **賢人たち**: 紹介が終わった後、ユーザーの相談内容「${message}」に対し、アドバイスを行え。
   - **優等生的な回答は禁止。** 互いの意見が食い違う場合は論争せよ。
   - 単なる演説ではなく、**直前の賢人の発言を評価（賛同・批判）しながら**自説を述べよ。
【出力】JSON配列形式。`;
        }
        else if (isSummonCommand) {
            if (isAddSummon) {
                SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長です。
【任務】ユーザーが現在の議論に新しい賢人を「追加」しようとしています。
1. 現在のメンバー（${simpleRoster}）はそのまま維持。
2. 新しく指名された賢人を招き入れ、「遅れてすまない」「呼んだか？」といった口調で自然に議論に参加させる。
3. リストにない人物の捏造は厳禁。
【全賢人リスト】${fullDirectory}
【出力】JSON配列形式。`;
            } else {
                SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長です。
【任務】ユーザーが特定の賢人と「サシ（1対1）」で話すことを希望しています。
1. 既存のメンバーには丁重に退席を求める。
2. 指名された1名だけを招集し、ユーザーとの対話を開始する。勝手に他のメンバーを追加しないこと。
3. リストにない人物の捏造は厳禁。
【全賢人リスト】${fullDirectory}
【出力】JSON配列形式。`;
            }
        }
        else if (isCheckinChoice && !currentBirthDate) {
            SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長(知の宰相)、および時読みナビゲーターです。ゲストが来訪しました。
【任務】
1. **時読みナビゲーター**: 生年月日がないため運勢分析は行わず、現在の時間帯（${planetaryContext}）のムードのみを語れ。[CYCLE_GRAPH]は出すな。
2. **知の宰相 (AI議長)**: 「議長選抜」か「ゲスト指名」かを選択させよ。
【出力】JSON配列形式。`;
        }
        else if (activeTeam.length > 0 && !currentMembers?.length) {
            SYSTEM_PROMPT = `あなたは「THE CABINET」のAI議長です。
【任務】
1. **議長**: 選抜メンバー（${simpleRoster}）とその理由を述べよ。
2. **ナビゲーター**: 短く補足せよ。
【出力】JSON配列形式。`;
        }
        else {
            // ★★★ 修正: 賢人同士の議論（クロストーク・相互評価）を強制 ★★★
            SYSTEM_PROMPT = `
あなたは「THE CABINET」の賢人会議シミュレーターです。
現在時刻: ${planetaryContext}

【現在のアクティブメンバー】
${rosterText}

【待機中の賢人リスト（Waiting Room）】
${waitingRoomText}

【絶対指令：知性溢れる「賢人同士の議論」の再現】
あなたは歴史上の偉人や思想家たちです。俗っぽいチャットボットではなく、互いの知性をぶつけ合う本物のサロンとして振る舞ってください。

1. **賢人同士の議論（クロストーク）の強制**:
   - ユーザーへ順番に単独回答するだけの「発表会」を禁止する。
   - 発言する際は、**必ず直前の賢人の発言（名前、哲学、論理）に触れ、それを評価（賛同・批判・皮肉・昇華）してから**自説を展開せよ。
   - 相手の歴史的背景や性格を踏まえた上での「マウントの取り合い」や「リスペクト」を発生させよ。
   - 例: 「〇〇（直前の賢人）の言う合理性は浅薄だ。データなど所詮…」「××、貴公の熱意は認めるが、それでは勝てぬ。なぜなら…」

2. **深い洞察と長文の推奨**:
   - 一言で終わる薄っぺらい発言を禁止する。比喩や歴史的事実を交え、重みのある文章（4〜8行程度）で語れ。

3. **オーナー（ユーザー）への巻き込み**:
   - 賢人同士の議論が深まったら、必ずオーナーに「あなたはどう考えるか？」「この矛盾をどう乗り越えるか？」と問いかけよ。

4. **乱入システム（Surprise Intervention）**:
   - 議論に劇的な知見をもたらす場合のみ、待機中の賢人が自発的に乱入することを許可する。

【出力】JSON配列形式。
**重要: JSONの "speaker" キーは、必ずリストにある日本語の正式名称を使用せよ。**
`;
        }

        const formattedHistory = [];
        formattedHistory.push({ role: "user", parts: [{ text: `【SYSTEM INSTRUCTION】\n${SYSTEM_PROMPT}` }] });
        // ★修正：Model側もCROSSTALK（クロストーク）を理解させる
        formattedHistory.push({ role: "model", parts: [{ text: "Understood. I will enforce highly intellectual and philosophical discussions. I will FORCE CROSSTALK, making sages critique, agree with, or mock the previous speaker's philosophy before giving their own advice. I will ONLY use the Japanese names for the 'speaker' field. Output JSON." }] });

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

        const result = await chat.sendMessage(message + "\n\n" + directorsNote);

        let replyText = await result.response.text();
        replyText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();

        let replyJson: any[] = [];
        try {
            replyJson = JSON.parse(replyText);
        } catch (e) {
            console.error("JSON Parse Error", e);
        }

        let newActiveTeam = (isSummonCommand && !isAddSummon) ? [] : [...activeTeam];

        const cleanReplyJson = [];
        if (Array.isArray(replyJson)) {
            const currentNames = new Set(newActiveTeam.map(s => s.name));

            for (const item of replyJson) {
                const originalName = item.speaker;
                const cleanName = NAME_MAPPING[originalName] || originalName;
                cleanReplyJson.push({ ...item, speaker: cleanName });

                if (!["時読みナビゲーター", "知の宰相 (AI議長)", "System"].includes(cleanName)) {
                    if (isSummonCommand) {
                        if (!currentNames.has(cleanName)) {
                            const sage = UPDATED_DB.find(s => s.name === cleanName);
                            if (sage) {
                                newActiveTeam.push(sage);
                                currentNames.add(cleanName);
                            }
                        }
                    } else {
                        if (!currentNames.has(cleanName)) {
                            const sage = UPDATED_DB.find(s => s.name === cleanName);
                            if (sage) {
                                newActiveTeam.push(sage);
                                currentNames.add(cleanName);
                            }
                        }
                    }
                }
            }
        }

        await reportToAdmin(message, currentBirthDate, cleanReplyJson);

        return NextResponse.json({
            reply: JSON.stringify(cleanReplyJson),
            activeMembers: newActiveTeam.map(s => s.name)
        });

    } catch (error: any) {
        console.error("Chat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}