// src/components/FateCycleDashboard.tsx
import React from 'react';

type CycleData = {
    elements: { wood: number; fire: number; earth: number; metal: number; water: number };
    planets: { jupiter: number; saturn: number; mars: number; venus: number; moon: number };
    logId: number;
};

export default function FateCycleDashboard({ data }: { data: CycleData }) {
    if (!data) return null;

    return (
        <div className="w-full bg-[#0a0f1c] border border-[#1f2937] rounded-lg p-4 my-4 font-mono text-xs shadow-2xl overflow-hidden relative">
            {/* 背景のグリッド線演出 */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* ヘッダー */}
            <div className="flex justify-between items-end mb-6 relative z-10 border-b border-[#333] pb-2">
                <div>
                    <h3 className="text-[#a38e5e] font-bold tracking-widest text-sm mb-1">ASTRO-LOGIC ANALYZER</h3>
                    <p className="text-gray-500">SYSTEM READY / PID: {data.logId}</p>
                </div>
                <div className="text-right">
                    <div className="flex gap-1">
                        <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-green-500">LIVE</span>
                    </div>
                </div>
            </div>

            {/* 1. 五行バーチャート (Elements) */}
            <div className="grid grid-cols-5 gap-2 mb-8 relative z-10 h-24 items-end">
                {[
                    { label: "木行 (Wood)", val: data.elements.wood, color: "bg-emerald-500" },
                    { label: "火行 (Fire)", val: data.elements.fire, color: "bg-red-600" },
                    { label: "土行 (Earth)", val: data.elements.earth, color: "bg-yellow-600" },
                    { label: "金行 (Metal)", val: data.elements.metal, color: "bg-gray-300" },
                    { label: "水行 (Water)", val: data.elements.water, color: "bg-blue-600" }
                ].map((el, i) => (
                    <div key={i} className="flex flex-col items-center group h-full justify-end">
                        <div className="w-full bg-gray-800 rounded-sm relative overflow-hidden" style={{ height: '100%' }}>
                            <div
                                className={`absolute bottom-0 left-0 w-full ${el.color} transition-all duration-1000 ease-out opacity-80 group-hover:opacity-100`}
                                style={{ height: `${Math.min(el.val, 100)}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-[9px] text-gray-400 uppercase tracking-tighter text-center">{el.label.split(' ')[0]}</div>
                        <div className="text-[10px] text-white font-bold">{Math.round(el.val)}</div>
                    </div>
                ))}
            </div>

            {/* 2. 惑星サイクル (Planets) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 relative z-10">
                {[
                    { label: "木星 (Jupiter 12y)", val: data.planets.jupiter, color: "bg-emerald-400" },
                    { label: "土星 (Saturn 29.5y)", val: data.planets.saturn, color: "bg-yellow-700" },
                    { label: "火星 (Mars 780d)", val: data.planets.mars, color: "bg-red-500" },
                    { label: "金星 (Venus 584d)", val: data.planets.venus, color: "bg-pink-400" },
                    { label: "月相 (Moon 29.5d)", val: data.planets.moon, color: "bg-blue-300" },
                ].map((planet, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="flex justify-between text-gray-400 mb-1">
                            <span>{planet.label}</span>
                            <span>{Math.round(planet.val)}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${planet.color} shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
                                style={{ width: `${planet.val}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* フッターログ */}
            <div className="mt-6 pt-4 border-t border-[#333] text-gray-500 relative z-10">
                <div className="flex justify-between">
                    <span>VECTOR: {data.elements.fire > 50 ? "FORWARD THRUST" : "INTERNAL STOCK"}</span>
                    <span>RISK: {data.elements.water < 20 ? "HIGH FRICTION" : "STABLE"}</span>
                </div>
                <div className="mt-1 text-xs text-[#a38e5e]">
                    Analysis Complete. Cycle synchronization active.
                </div>
            </div>
        </div>
    );
}
