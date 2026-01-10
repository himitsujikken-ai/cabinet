// src/utils/astro.ts

export const AstroLogic = {
    // 生年月日から本質などを分析する
    analyze: (birthDate: string): string => {
        if (!birthDate) return "データなし";
        const date = new Date(birthDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        // 簡易的な九星気学計算
        // ※立春(2/4)以前の生まれは前年扱いにするのが本格的ですが、
        // ここでは簡易ロジックとしてそのまま年を使用、または必要に応じて調整してください。
        // 今回はエラー回避を優先したロジックにします。

        const kyusei = AstroLogic.getKyusei(year);
        const season = AstroLogic.getSeason(month);

        // 十干（簡易）
        const jukkanList = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
        const jukkan = jukkanList[(year - 4) % 10] || "";

        return `
【運命座標】
・九星: ${kyusei.name}
・十干: ${jukkan}
・季節: ${season}
・現在地: あなたは今、${season}の時期にいます。
`.trim();
    },

    // 季節の判定
    getSeason: (m: number): string => {
        if (m >= 3 && m <= 5) return "春";
        if (m >= 6 && m <= 8) return "夏";
        if (m >= 9 && m <= 11) return "秋";
        return "冬";
    },

    // 九星算出ロジック（★ここを修正しました）
    getKyusei: (y: number) => {
        let s = 0;
        // 数値を文字列化して桁ごとに足す
        String(y).split('').forEach(n => {
            s += parseInt(n, 10);
        });

        // 1桁になるまで足し続ける（再帰的にreduceを使用）
        while (s > 9) {
            s = String(s).split('').reduce((acc: number, curr: string) => {
                return acc + parseInt(curr, 10);
            }, 0);
        }

        let t = 11 - s;
        if (t > 9) t -= 9;
        if (t <= 0) t += 9; // 念のため

        const dict: Record<number, string> = {
            1: "一白水星",
            2: "二黒土星",
            3: "三碧木星",
            4: "四緑木星",
            5: "五黄土星",
            6: "六白金星",
            7: "七赤金星",
            8: "八白土星",
            9: "九紫火星"
        };

        return { index: t, name: dict[t] || "不明" };
    },

    // ★新規追加: グラフ用データを生成する関数
    generateCycleData: (birthDate: string) => {
        const today = new Date();
        const birth = new Date(birthDate);

        // 生年月日が無効な場合はデフォルト値を返す
        if (isNaN(birth.getTime())) {
            return {
                elements: { wood: 50, fire: 50, earth: 50, metal: 50, water: 50 },
                planets: { jupiter: 0, saturn: 0, mars: 0, venus: 0, moon: 0 },
                logId: 0
            };
        }

        const diffTime = Math.abs(today.getTime() - birth.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 1. 五行バランス (擬似ロジック: 生年月日からハッシュ生成して変動させる)
        // ※本来は四柱推命などで精密計算しますが、ここでは演出用に変動させます
        const seed = birth.getDate() + birth.getMonth();
        const wood = (seed * 7) % 100;
        const fire = (seed * 3 + 20) % 100;
        const earth = (seed * 5 + 10) % 100;
        const metal = (seed * 2 + 30) % 100;
        const water = (100 - (wood + fire + earth + metal) / 4); // バランス調整

        // 2. 惑星サイクル (公転周期に基づく進行度 %)
        // 木星: 4333日, 土星: 10759日, 火星: 687日, 金星: 225日, 月: 29.5日
        const jupiter = (diffDays % 4333) / 4333 * 100;
        const saturn = (diffDays % 10759) / 10759 * 100;
        const mars = (diffDays % 687) / 687 * 100;
        const venus = (diffDays % 225) / 225 * 100;
        const moon = (diffDays % 29.5) / 29.5 * 100;

        return {
            elements: { wood, fire, earth, metal, water },
            planets: { jupiter, saturn, mars, venus, moon },
            logId: Math.floor(Math.random() * 900000) + 100000 // PID演出用
        };
    }
};