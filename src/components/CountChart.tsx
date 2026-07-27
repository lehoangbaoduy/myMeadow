"use client";
import Image from "next/image";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Total", count: 4, fill: "white" },
  { name: "Female", count: 0, fill: "#FAE27C" },
  { name: "Male", count: 4, fill: "#F97316" },
];

const CountChart = () => {
  return (
    <div className="bg-white dark:bg-darkCard rounded-xl w-full h-full p-4 border border-meadowBorder dark:border-darkBorder">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Residents</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <div className="relative w-full h-[75%]">
        <ResponsiveContainer>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={32}
            data={data}
          >
            <RadialBar background dataKey="count" />
          </RadialBarChart>
        </ResponsiveContainer>
        <Image
          src="/maleFemale.png"
          alt=""
          width={50}
          height={50}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-meadowOrange rounded-full" />
          <h1 className="font-bold text-gray-800 dark:text-gray-100">4</h1>
          <h2 className="text-xs text-gray-400">Male (100%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-yellow rounded-full" />
          <h1 className="font-bold text-gray-800 dark:text-gray-100">0</h1>
          <h2 className="text-xs text-gray-400">Female (0%)</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChart;
