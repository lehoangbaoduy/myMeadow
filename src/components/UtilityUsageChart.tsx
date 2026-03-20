"use client";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";

const data = [
  {
    name: "Apr",
    electric: 60,
    gas: 40,
    water: 40,
    wifi: 40,
  },
  {
    name: "May",
    electric: 70,
    gas: 60,
    water: 60,
    wifi: 60,
  },
  {
    name: "Jun",
    electric: 90,
    gas: 75,
    water: 60,
    wifi: 60,
  },
  {
    name: "Jul",
    electric: 90,
    gas: 75,
    water: 60,
    wifi: 60,
  },
  {
    name: "Aug",
    electric: 65,
    gas: 55,
    water: 60,
    wifi: 60,
  },
  {
    name: "Sep",
    electric: 65,
    gas: 55,
    water: 60,
    wifi: 60,
  },
  {
    name: "Oct",
    electric: 65,
    gas: 55,
    water: 60,
    wifi: 60,
  },
];

const UtilityUsageChart = () => {
  return (
    <div className="bg-white dark:bg-darkCard rounded-lg p-4 h-full border border-gray-400 dark:border-darkBorder">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Utility Usage</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart width={500} height={300} data={data} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis />
          <Tooltip
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
          />
          <Bar
            dataKey="electric"
            fill="#F59E0B"
            legendType="circle"
            barSize={10}
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="gas"
            fill="#EF4444"
            legendType="circle"
            barSize={10}
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="water"
            fill="#06B6D4"
            legendType="circle"
            barSize={10}
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="wifi"
            fill="#8B5CF6"
            legendType="circle"
            barSize={10}
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UtilityUsageChart;
