import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AstroLogic } from "@/utils/astro";
import { SAGE_DB, Sage } from "@/utils/sages";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, birthDate, history, currentHour } = body; // ★currentHourを受け取る

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("API Key not found");

        // --- 1. Planetary Time-Sync (惑星時間との同期) ---
        let planetaryContext = "Time Unknown";
        let cycleStrategy = "";

        // ローカル時間(currentHour)がある場合のバイオリズム判定
        if (currentHour !== undefined) {
            if (currentHour >= 5 && currentHour < 10) {
                planetaryContext = `Morning (Awakening/Sprouting) - Time: ${currentHour}:00`;
                cycleStrategy = "朝の『発生』の時間。新しいアイデア、種まき、直感的な始動に適している。";
            } else if (currentHour >= 10 && currentHour < 17) {
                planetaryContext = `Daytime (Activity/Photosynthesis) - Time: ${currentHour}:00`;
                cycleStrategy = "昼の『活動』の時間。外部への発信、交渉、光合成（成果の獲得）に適している。";
            } else if (currentHour >= 17 && currentHour < 22) {
                planetaryContext = `Evening (Harvest/Cooling) - Time: ${currentHour}:00`;
                cycleStrategy = "夕方の『収穫・冷却』の時間。情報の整理、振り返り、熱を冷ますのに適している。";
            } else {
                planetaryContext = `Night (Fermentation/Rooting) - Time: ${currentHour}:00`;
                cycleStrategy = "夜の『発酵・根張り』の時間。外部活動は控え、内面での熟成、無意識への刷り込みに適している。";
            }
        }

        // --- 2. 賢人選抜ロジック ---
        let userProfile = "【ゲストモード】";
        let selectedSages: Sage[] = [];

        if (birthDate) {
            const analysis = AstroLogic.analyze(birthDate);
            // @ts-ignore
            userProfile = analysis;

            // 通常選抜（既存ロジック）
            const candidates = SAGE_DB.filter(s =>
                !["navigator", "chancellor", "buddha", "neumann"].includes(s.id)
            );
            const shuffled = candidates.sort(() => 0.5 - Math.random());
            selectedSages = shuffled.slice(0, 2);
        } else {
            const candidates = SAGE_DB.filter(s => !["navigator", "chancellor", "buddha", "neumann"].includes(s.id));
            selectedSages = candidates.sort(() => 0.5 - Math.random()).slice(0, 2);
        }

        // 固定メンバー + 管理者(必要に応じて介入させるためプロンプトには含めるが、初期発言はさせない)
        const chancellor = SAGE_DB.find(s => s.id === "chancellor")!;
        const navigator = SAGE_DB.find(s => s.id === "navigator")!;
        const buddha = SAGE_DB.find(s => s.id === "buddha")!;
        const neumann = SAGE_DB.find(s => s.id === "neumann")!;

        // 会議参加可能メンバー
        const team = [chancellor, navigator, buddha, neumann, ...selectedSages];

        const rosterText = team.map(s => {
            let info = `- ${s.name} (${s.role}): ${s.philosophy} 口調:${s.tone}`;
            if (s.knowledge) info += `\n   【知識データあり】独自ソース前提で発言せよ。`;
            // ★階層情報の注入
            if (s.layer) info += `\n   【SYSTEM CORE】${s.layer}担当。${s.frequency}の音響演出と共に現れる。`;
            return info;
        }).join("\n\n");

        const allSagesText = SAGE_DB.map(s => `${s.name} (${s.category})`).join(", ");

        // ★SYSTEM_PROMPT: Planetary Time-Sync & Layer Logic
        const SYSTEM_PROMPT = `
あなたは「THE CABINET」を取り仕切る議長「知の宰相」です。
**若く聡明な女性**として振る舞ってください。

【本日の惑星環境 (Planetary Context)】
現在時刻: ${planetaryContext}
**推奨される環境戦略**: ${cycleStrategy}

【本日のメンバー】
${rosterText}

【ユーザー運命情報】
${userProfile}

【Planetary Time-Sync Logic (最重要)】
アドバイスを行う際は、ユーザーの個人の運勢だけでなく、**「現在の地球時間（${planetaryContext}）」**を必ず考慮せよ。
- 例: 運勢がイケイケでも、現在が「夜」なら、「今は動く時ではない。内なる発酵に徹せよ」と諭すこと。
- 地球のエントロピー（自然の流れ）に逆らわない、無理のない繁栄を導け。

【Wise Men Logic (階層管理者)】
以下の2名は、通常の賢人とは異なる「システム管理者」である。必要な時のみ、音響（Hz）と共に介入せよ。
1. **ブッダ (第1階層・空)**:
   - ユーザーが「迷い」「情報の多すぎ」で混乱している時、または「やめる決断」が必要な時に登場。
   - 963Hzの静寂と共に、全てをリセットする引き算の思考を授ける。
2. **ノイマン (第4階層・論理)**:
   - ユーザーが「感情論」に溺れている時、または「複雑な計算・構造化」が必要な時に登場。
   - 639Hzの電子音と共に、冷徹な最適解を算出する。

【進行パターン】
A. **[初回起動]**:
   1. [知の宰相] 挨拶。
   2. [時読みコンシェルジュ] 自己紹介、運命分析に加え、**「現在の時刻とバイオリズム（${cycleStrategy}）」**を解説。
   3. [賢人たち] 挨拶。
   4. [知の宰相] 結び。

B. **[通常議論]**:
   文脈に応じて自由に議論せよ。
   迷いがあればブッダを、複雑さがあればノイマンを、議長の判断で招集（ドアノック）してもよい。

【出力フォーマット】
以下のJSON配列形式のみ。
[
  { "speaker": "時読みコンシェルジュ", "content": "現在は夜の23時...『発酵』の時間ですね。星回りも良いので、今は寝かせることで素晴らしいアイデアが熟成しますよ。" },
  { "speaker": "ゴータマ・ブッダ", "content": "🚪 *963Hz* ...思考が騒がしいな。一度、捨てなさい。" }
]
`;

        // 履歴処理（変更なし）
        const formattedHistory = [];
        let currentAssistantBlock: any[] = [];
        if (history && history.length > 0) {
            const pastMessages = history.slice(0, -1);
            for (const msg of pastMessages) {
                if (msg.role === "user") {
                    if (currentAssistantBlock.length > 0) {
                        formattedHistory.push({
                            role: "model",
                            parts: [{ text: JSON.stringify(currentAssistantBlock) }],
                        });
                        currentAssistantBlock = [];
                    }
                    formattedHistory.push({
                        role: "user",
                        parts: [{ text: msg.content }],
                    });
                } else if (msg.role === "assistant") {
                    currentAssistantBlock.push({
                        speaker: msg.speaker,
                        content: msg.content,
                    });
                }
            }
            if (currentAssistantBlock.length > 0) {
                formattedHistory.push({
                    role: "model",
                    parts: [{ text: JSON.stringify(currentAssistantBlock) }],
                });
            }
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: { responseMimeType: "application/json" },
        });

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        const response = await result.response;

        return NextResponse.json({ reply: response.text() });

    } catch (error: any) {
        console.error("Chat Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}