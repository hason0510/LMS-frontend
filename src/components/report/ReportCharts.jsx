import React from "react";
import { Empty } from "antd";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function truncateLabel(value, maxLength = 24) {
  if (!value || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function getVerticalChartHeight(itemsCount, { min = 180, max = 320, row = 42, base = 54 } = {}) {
  return Math.max(min, Math.min(max, itemsCount * row + base));
}

function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.max(0, Math.min(100, numericValue));
}

function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {label ? (
        <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey || entry.name} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-950 dark:text-white">
              {valueFormatter ? valueFormatter(entry.value, entry.dataKey, entry.payload) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutSummaryChart({ data, totalValue, totalLabel, emptyText, valueFormatter = (value) => value }) {
  const safeData = Array.isArray(data) ? data.filter((item) => Number(item.value) > 0) : [];

  if (!safeData.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="m-0 text-sm font-medium text-slate-500 dark:text-slate-400">{totalLabel}</p>
            <p className="m-0 mt-2 text-4xl font-black text-slate-950 dark:text-white">{valueFormatter(totalValue)}</p>
          </div>

          <div className="w-full lg:max-w-[28rem]">
            <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="flex h-full w-full overflow-hidden rounded-full">
                {safeData.map((item) => {
                  const width = totalValue > 0 ? `${(item.value / totalValue) * 100}%` : "0%";
                  return (
                    <div
                      key={item.key || item.label}
                      title={`${item.label}: ${valueFormatter(item.value)}`}
                      style={{ width, backgroundColor: item.color }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {safeData.map((item) => (
          <div
            key={item.key || item.label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 truncate">{item.label}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {Math.round((item.value / totalValue) * 100)}%
              </span>
            </div>
            <p className="m-0 mt-2 text-2xl font-black text-slate-950 dark:text-white">{valueFormatter(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedStatusBarChart({
  data,
  series,
  emptyText,
  valueFormatter = (value) => value,
}) {
  const safeData = Array.isArray(data) ? data.filter((item) => series.some((entry) => Number(item[entry.key]) > 0)) : [];

  if (!safeData.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {safeData.map((item) => {
          const total = series.reduce((sum, entry) => sum + (Number(item[entry.key]) || 0), 0);

          return (
            <div key={item.id || item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                  {item.totalStudents != null ? (
                    <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {valueFormatter(item.totalStudents)}
                    </p>
                  ) : null}
                </div>
                <p className="m-0 shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {valueFormatter(total)}
                </p>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="flex h-full w-full overflow-hidden rounded-full">
                  {series.map((entry) => {
                    const value = Number(item[entry.key]) || 0;
                    const width = total > 0 ? `${(value / total) * 100}%` : "0%";
                    return <div key={`${item.id || item.label}-${entry.key}`} style={{ width, backgroundColor: entry.color }} />;
                  })}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {series.map((entry) => (
                  <div
                    key={`${item.id || item.label}-${entry.key}-label`}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{valueFormatter(item[entry.key] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SingleSeriesBarChart({
  data,
  dataKey = "value",
  labelKey = "label",
  emptyText,
  layout = "horizontal",
  color = "#137fec",
  valueFormatter = (value) => value,
  yTickFormatter,
  xTickFormatter,
  barPercentKey,
}) {
  const safeData = Array.isArray(data) ? data.filter((item) => Number(item[dataKey]) >= 0) : [];

  if (!safeData.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  const isVerticalLayout = layout === "vertical";
  const chartHeight = 220;

  if (isVerticalLayout) {
    const maxValue = Math.max(...safeData.map((item) => Number(item[dataKey]) || 0), 0);

    return (
      <div className="space-y-4">
        {safeData.map((item, index) => {
          const value = Number(item[dataKey]) || 0;
          const width = barPercentKey
            ? clampPercent(item[barPercentKey])
            : maxValue > 0
            ? Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)
            : 0;
          return (
            <div key={`${item[labelKey]}-${index}`} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="m-0 break-words text-sm font-bold leading-5 text-slate-900 dark:text-white">
                    {truncateLabel(item[labelKey], 56)}
                  </p>
                </div>
                <p className="m-0 shrink-0 text-right text-sm font-semibold leading-5 text-slate-500 dark:text-slate-300">
                  {valueFormatter(value, dataKey, item)}
                </p>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: item.color || color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ height: `${chartHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={safeData}
          layout="horizontal"
          margin={{ top: 6, right: 18, left: 4, bottom: 28 }}
          barCategoryGap={12}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={54}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value) => (xTickFormatter ? xTickFormatter(value) : truncateLabel(value, 14))}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(value) => value}
                valueFormatter={(...args) => valueFormatter(...args)}
              />
            }
          />
          <Bar dataKey={dataKey} radius={[8, 8, 0, 0]} fill={color} maxBarSize={26}>
            {safeData.map((item) => (
              <Cell key={`${item[labelKey]}-${item[dataKey]}`} fill={item.color || color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
