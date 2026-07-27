"use client";
import Image from "next/image";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Utility colors — matches bar/line charts
const UTIL_COLORS = {
  Electric: "#F59E0B",
  Gas: "#EF4444",
  Water: "#06B6D4",
  WiFi: "#8B5CF6",
};

// Static data for now (latest month: Mar 2026)
const data = [
  { name: "Electric", value: 100 },
  { name: "Gas", value: 62 },
  { name: "Water", value: 35 },
  { name: "WiFi", value: 40 },
];

const total = data.reduce((sum, d) => sum + d.value, 0);

const BillChart = () => {
  return (
    <div className="bg-white dark:bg-darkCard rounded-xl w-full h-full p-4 border border-gray-400 dark:border-darkBorder">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Total Bill</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {/* DONUT CHART */}
      <div className="relative w-full h-[75%]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={UTIL_COLORS[entry.name as keyof typeof UTIL_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`$${value}`, undefined]}
              contentStyle={{ borderRadius: "8px", borderColor: "#e5e7eb" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* CENTER TOTAL */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">${total}</div>
          <div className="text-xs text-gray-400">Mar 2026</div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex justify-center gap-4 flex-wrap">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: UTIL_COLORS[d.name as keyof typeof UTIL_COLORS] }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillChart;
