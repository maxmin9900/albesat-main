"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const GOLD = "#c9a24b";
const CRIMSON = "#8b1e2d";
const LAPIS = "#3fa8a0";
const SILK = "#d8cbb0";

const tooltipStyle = {
  background: "#12121c",
  border: "1px solid #262636",
  borderRadius: 8,
  color: "#f0e6d2",
  fontSize: 12,
};

export function RevenueDonut({
  direct,
  auction,
}: {
  direct: number;
  auction: number;
}) {
  const data = [
    { name: "Direct sales", value: direct },
    { name: "Auction", value: auction },
  ];
  const empty = direct + auction === 0;

  return (
    <div className="h-64">
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          No revenue recorded.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
            >
              <Cell fill={GOLD} />
              <Cell fill={CRIMSON} />
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: SILK }}
              formatter={(v) => <span style={{ color: SILK }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function CityBar({
  data,
}: {
  data: { city: string; count: number }[];
}) {
  return (
    <div className="h-64">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          No data available.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="city"
              tick={{ fill: SILK, fontSize: 11 }}
              axisLine={{ stroke: "#262636" }}
            />
            <YAxis
              tick={{ fill: "#8a8a9a", fontSize: 11 }}
              axisLine={{ stroke: "#262636" }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
            <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function EngagementBar({
  data,
  color = "views",
}: {
  data: { title: string; value: number }[];
  color?: "views" | "favorites";
}) {
  return (
    <div className="h-64">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          No data available.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis
              type="number"
              tick={{ fill: "#8a8a9a", fontSize: 11 }}
              axisLine={{ stroke: "#262636" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="title"
              tick={{ fill: SILK, fontSize: 11 }}
              width={110}
              axisLine={{ stroke: "#262636" }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
            <Bar
              dataKey="value"
              fill={color === "views" ? LAPIS : CRIMSON}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
