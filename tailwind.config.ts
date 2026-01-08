import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // The Deep Wisdom Palette
                cabinet: {
                    bg: "#0A0A0C",      // Ink Black (背景)
                    mahogany: "#1A0F0A",// Deep Mahogany (深み)
                    paper: "#E6E1D3",   // Old Parchment (羊皮紙)
                    ink: "#1F2937",     // Dark Ink (文字色用)
                    gold: "#C2A878",    // Antique Brass (アクセント)
                    leather: "#3E2C20", // Leather Brown (サブ)
                },
            },
            fontFamily: {
                serif: ['var(--font-noto-serif)', 'serif'],
            },
        },
    },
    plugins: [],
};
export default config;