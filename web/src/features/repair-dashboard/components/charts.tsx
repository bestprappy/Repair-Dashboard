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

import { formatCompact, formatCurrency, statusColor } from "../lib/transform";
import { OTHER_STATUS } from "../lib/selectors";
import type {
  CompanyStatDatum,
  GroupCountDatum,
  RankDatum,
  StatusDatum,
  StatusMonthlySeries,
} from "../lib/selectors";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
const LABEL_FILL = "var(--foreground)";
const GRID_STROKE = "var(--border)";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 12px 32px color-mix(in oklch, var(--foreground) 12%, transparent)",
  padding: "10px 12px",
} as const;

/** Coerce a recharts value/label (string | number | array) into a number. */
function toNum(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

/** Vertical bar chart of record counts per status, one color per bar. */
export function StatusBarChart({ data }: { data: StatusDatum[] }) {
  const visible = data.filter((datum) => datum.count > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={visible} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
        <XAxis
          dataKey="status"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={62}
          tickFormatter={(value) => {
            const label = String(value);
            return label.length > 15 ? `${label.slice(0, 14)}…` : label;
          }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={formatCompact}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--primary)", opacity: 0.06 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [toNum(value).toLocaleString(), "Records"]}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]} isAnimationActive={false}>
          {visible.map((entry, index) => (
            <Cell key={entry.status} fill={statusColor(entry.status, index)} />
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
    .map((datum, index) => ({ ...datum, color: statusColor(datum.status, index) }))
    .filter((datum) => datum.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

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
      <div className="relative h-full min-h-[180px] flex-1">
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
              isAnimationActive={false}
            >
              {items.map((item) => (
                <Cell key={item.status} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="font-heading text-xl font-semibold tracking-tight tabular-nums">
            {formatCompact(total)}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            records
          </span>
        </div>
      </div>
    </div>
  );
}

interface MonthlyBarChartProps {
  labels: string[];
  values: number[];
  color: string;
  /** Value semantics: baht amounts (default) or plain record counts. */
  format?: "currency" | "count";
}

/** Vertical bars of a monthly series for a single group or model. */
export function MonthlyBarChart({
  labels,
  values,
  color,
  format = "currency",
}: MonthlyBarChartProps) {
  const data = labels.map((label, index) => ({ label, value: values[index] }));
  // With many months the per-bar labels collide; the y-axis + tooltip suffice.
  const showLabels = labels.length <= 14;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
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
          cursor={{ fill: "var(--primary)", opacity: 0.06 }}
          contentStyle={tooltipStyle}
          formatter={(value) =>
            format === "count"
              ? [toNum(value).toLocaleString(), "Records"]
              : [formatCurrency(toNum(value), 2), "Amount"]
          }
        />
        <Bar
          dataKey="value"
          radius={[5, 5, 0, 0]}
          fill={color}
          isAnimationActive={false}
        >
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
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
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
          cursor={{ fill: "var(--primary)", opacity: 0.06 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [
            formatValue(toNum(value)),
            isRate ? "PASS Rate" : "Total Repairs",
          ]}
        />
        <Bar
          dataKey={metric}
          radius={[0, 4, 4, 0]}
          fill={color}
          isAnimationActive={false}
        >
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

/** Neutral fill for the folded "OTHER" status series in stacked charts. */
const OTHER_SERIES_COLOR = "var(--muted-foreground)";

function statusSeriesColor(status: string, index: number): string {
  return status === OTHER_STATUS
    ? OTHER_SERIES_COLOR
    : statusColor(status, index);
}

interface StatusMonthlyStackChartProps {
  labels: string[];
  series: StatusMonthlySeries[];
  monthTotals: number[];
}

/**
 * Stacked monthly record counts, one segment per status. Segments keep a
 * card-colored gap and the stack top carries the month total label so the
 * values stay readable without relying on color alone.
 */
export function StatusMonthlyStackChart({
  labels,
  series,
  monthTotals,
}: StatusMonthlyStackChartProps) {
  const data = labels.map((label, index) => {
    const entry: Record<string, string | number> = {
      label,
      __total: monthTotals[index],
    };
    for (const s of series) entry[s.status] = s.values[index];
    return entry;
  });
  const legend = series.map((s, index) => ({
    status: s.status,
    color: statusSeriesColor(s.status, index),
  }));
  const showTotals = labels.length <= 14;

  return (
    <div className="flex h-full flex-col gap-3">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-1">
        {legend.map((item) => (
          <li
            key={item.status}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.status}
          </li>
        ))}
      </ul>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
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
              cursor={{ fill: "var(--primary)", opacity: 0.06 }}
              contentStyle={tooltipStyle}
              formatter={(value, name) => [toNum(value).toLocaleString(), name]}
            />
            {series.map((s, index) => (
              <Bar
                key={s.status}
                dataKey={s.status}
                stackId="status"
                fill={statusSeriesColor(s.status, index)}
                stroke="var(--card)"
                strokeWidth={1.5}
                isAnimationActive={false}
                radius={
                  index === series.length - 1 ? [4, 4, 0, 0] : undefined
                }
              >
                {index === series.length - 1 && showTotals ? (
                  <LabelList
                    dataKey="__total"
                    position="top"
                    fill={LABEL_FILL}
                    fontSize={10}
                    fontWeight={700}
                    formatter={(value) => formatCompact(toNum(value))}
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface RankBarChartProps {
  data: RankDatum[];
  color: string;
  /** Tooltip name for the value, e.g. "Records". */
  name: string;
  /** Optional selection for relationship drill-downs. */
  selectedLabel?: string;
  onSelect?: (label: string) => void;
}

/** Horizontal top-N bars for one labeled count series (models, causes…). */
export function RankBarChart({
  data,
  color,
  name,
  selectedLabel,
  onSelect,
}: RankBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickFormatter={(value) => formatCompact(toNum(value))}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={150}
          interval={0}
          tickFormatter={(value) => {
            const label = String(value);
            return label.length > 20 ? `${label.slice(0, 19)}…` : label;
          }}
        />
        <Tooltip
          cursor={{ fill: "var(--primary)", opacity: 0.06 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [toNum(value).toLocaleString(), name]}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          fill={color}
          maxBarSize={22}
          isAnimationActive={false}
        >
          {onSelect
            ? data.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={color}
                  fillOpacity={
                    !selectedLabel || selectedLabel === entry.label ? 1 : 0.38
                  }
                  cursor="pointer"
                  onClick={() => onSelect(entry.label)}
                />
              ))
            : null}
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

interface GroupCountChartProps {
  data: GroupCountDatum[];
  color: string;
}

/** Group count bars; switches to horizontal layout when there are many groups. */
export function GroupCountChart({ data, color }: GroupCountChartProps) {
  const horizontal = data.length > 4;

  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--primary)", opacity: 0.06 }}
      contentStyle={tooltipStyle}
      formatter={(value, _name, item) => {
        const amount = (item?.payload as GroupCountDatum | undefined)?.amount ?? 0;
        return [
          `${toNum(value).toLocaleString()} · ${formatCurrency(amount, 2)}`,
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
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
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
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            fill={color}
            isAnimationActive={false}
          >
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
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 5" />
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
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          fill={color}
          isAnimationActive={false}
        >
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
