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
    }
};