// check-models.js
const fs = require('fs');
const https = require('https');

// .env.local から APIキーを探す簡易ロジック
let apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    try {
        if (fs.existsSync('.env.local')) {
            const envFile = fs.readFileSync('.env.local', 'utf8');
            const match = envFile.match(/GOOGLE_API_KEY=(.+)/);
            if (match) {
                apiKey = match[1].trim().replace(/"/g, '').replace(/'/g, ''); // 余計なクォートを削除
            }
        }
    } catch (e) {
        // 無視
    }
}

// それでもなければ、ユーザーに入力を促す
if (!apiKey || apiKey.includes("API_KEY")) {
    console.error("❌ エラー: APIキーが見つかりません。");
    console.error(".env.local ファイルを確認するか、コード内の apiKey 変数に直接キーを書き込んで試してください。");
    process.exit(1);
}

console.log(`🔍 APIキーを確認しました: ${apiKey.slice(0, 5)}...`);
console.log("📡 Googleのサーバーに、利用可能なモデル一覧を問い合わせています...");

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);

            if (response.error) {
                console.error("\n❌ Google APIエラー:", response.error.message);
                return;
            }

            if (!response.models) {
                console.error("\n❌ モデルが見つかりませんでした。APIキーが有効か確認してください。");
                return;
            }

            console.log("\n✅ 【成功】このAPIキーで現在利用可能なモデル一覧（チャット用）:");
            console.log("==================================================");

            const chatModels = response.models.filter(m =>
                m.supportedGenerationMethods.includes("generateContent")
            );

            chatModels.forEach(model => {
                // "models/gemini-1.5-flash" のような形式で出力
                console.log(`- ${model.name.replace('models/', '')}`);
            });

            console.log("==================================================");
            console.log("👉 上記のリストにある名前のいずれかを、route.ts に設定してください。");

        } catch (e) {
            console.error("❌ 解析エラー:", e.message);
            console.log("生データ:", data);
        }
    });

}).on("error", (err) => {
    console.error("❌ 通信エラー:", err.message);
});
