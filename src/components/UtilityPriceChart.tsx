"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
    water: 50,
    wifi: 50,
  },
  {
    name: "Jun",
    electric: 90,
    gas: 75,
    water: 90,
    wifi: 85,
  },
  {
    name: "Jul",
    electric: 90,
    gas: 75,
    water: 100,
    wifi: 80,
  },
  {
    name: "Aug",
    electric: 65,
    gas: 55,
    water: 58,
    wifi: 97,
  },
  {
    name: "Sep",
    electric: 65,
    gas: 55,
    water: 24,
    wifi: 120,
  },
  {
    name: "Oct",
    electric: 65,
    gas: 55,
    water: 50,
    wifi: 60,
  },
];

const UtilityPriceChart = () => {
  return (
    <div className="bg-white dark:bg-darkCard rounded-xl w-full h-full p-4 border border-gray-400 dark:border-darkBorder">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Utility Price</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#6b7280" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#6b7280" }}
            tickLine={false}
            tickMargin={20}
          />
          <Tooltip />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line type="monotone" dataKey="electric" stroke="#F59E0B" strokeWidth={2.5} />
          <Line type="monotone" dataKey="gas" stroke="#EF4444" strokeWidth={2.5} />
          <Line type="monotone" dataKey="water" stroke="#06B6D4" strokeWidth={2.5} />
          <Line type="monotone" dataKey="wifi" stroke="#8B5CF6" strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UtilityPriceChart;
