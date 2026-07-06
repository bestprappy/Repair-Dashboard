"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompact, paletteColor } from "../lib/transform";
import type {
  CompanyStatDatum,
  GroupCountDatum,
  StatusDatum,
} from "../lib/selectors";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
const LABEL_FILL = "var(--foreground)";
const GRID_STROKE = "var(--border)";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

/** Coerce a recharts value/label (string | number | array) into a number. */
function toNum(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

/** Vertical bar chart of record counts per status, one color per bar. */
export function StatusBarChart({ data }: { data: StatusDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="status"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={62}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={formatCompact}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [toNum(value).toLocaleString(), "Records"]}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.status} fill={paletteColor(index)} />
          ))}
          <LabelList
            dataKey="count"
            position="top"
            fill={LABEL_FILL}
            fontSize={10}
            fontWeight={700}
            formatter={(value) => formatCompact(toNum(value))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut chart of status ratio with an external percentage legend. */
export function StatusPieChart({ data }: { data: StatusDatum[] }) {
  const items = data
    .map((datum, index) => ({ ...datum, color: paletteColor(index) }))
    .filter((datum) => datum.count > 0);

  return (
    <div className="flex h-full flex-col items-center gap-5 sm:flex-row">
      <ul className="flex w-full min-w-[150px] flex-col gap-1.5 sm:w-auto">
        {items.map((item) => (
          <li
            key={item.status}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate">{item.status}</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground/80">
              {item.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
      <div className="h-full min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${toNum(value).toLocaleString()} records`, ""]}
            />
            <Pie
              data={items}
              dataKey="count"
              nameKey="status"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={1.5}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {items.map((item) => (
                <Cell key={item.status} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface MonthlyBarChartProps {
  labels: string[];
  values: number[];
  color: string;
}

/** Vertical bars of monthly amount for a single group. */
export function MonthlyBarChart({ labels, values, color }: MonthlyBarChartProps) {
  const data = labels.map((label, index) => ({ label, value: values[index] }));
  // With many months the per-bar labels collide; the y-axis + tooltip suffice.
  const showLabels = labels.length <= 14;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={formatCompact}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`฿${toNum(value).toLocaleString()}`, "Amount"]}
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} fill={color}>
          {showLabels ? (
            <LabelList
              dataKey="value"
              position="top"
              fill={LABEL_FILL}
              fontSize={10}
              fontWeight={700}
              formatter={(value) => (toNum(value) > 0 ? formatCompact(toNum(value)) : "")}
            />
          ) : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CompanyStatBarChartProps {
  data: CompanyStatDatum[];
  /** Which numeric field to plot. */
  metric: "total" | "passRate";
  color: string;
}

/**
 * Horizontal bars comparing companies on a single metric. Company names are
 * long and numerous, so the category axis is vertical for readability.
 */
export function CompanyStatBarChart({
  data,
  metric,
  color,
}: CompanyStatBarChartProps) {
  const isRate = metric === "passRate";
  const formatValue = (value: number) =>
    isRate ? `${value.toFixed(1)}%` : value.toLocaleString();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          domain={isRate ? [0, 100] : undefined}
          tick={AXIS_TICK}
          tickFormatter={(value) => (isRate ? `${toNum(value)}%` : formatCompact(toNum(value)))}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="company"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={130}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [
            formatValue(toNum(value)),
            isRate ? "PASS Rate" : "Total Repairs",
          ]}
        />
        <Bar dataKey={metric} radius={[0, 4, 4, 0]} fill={color}>
          <LabelList
            dataKey={metric}
            position="right"
            fill={LABEL_FILL}
            fontSize={10}
            fontWeight={700}
            formatter={(value) => formatValue(toNum(value))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GroupCountChartProps {
  data: GroupCountDatum[];
  color: string;
}

/** Group count bars; switches to horizontal layout when there are many groups. */
export function GroupCountChart({ data, color }: GroupCountChartProps) {
  const horizontal = data.length > 4;

  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
      contentStyle={tooltipStyle}
      formatter={(value, _name, item) => {
        const amount = (item?.payload as GroupCountDatum | undefined)?.amount ?? 0;
        return [
          `${toNum(value).toLocaleString()} · ฿${amount.toLocaleString()}`,
          "Count · Amount",
        ];
      }}
    />
  );

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={formatCompact}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="group"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          {tooltip}
          <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={color}>
            <LabelList
              dataKey="count"
              position="right"
              fill={LABEL_FILL}
              fontSize={10}
              fontWeight={700}
              formatter={(value) => toNum(value).toLocaleString()}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="group"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={56}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={formatCompact}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        {tooltip}
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={color}>
          <LabelList
            dataKey="count"
            position="top"
            fill={LABEL_FILL}
            fontSize={10}
            fontWeight={700}
            formatter={(value) => toNum(value).toLocaleString()}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
