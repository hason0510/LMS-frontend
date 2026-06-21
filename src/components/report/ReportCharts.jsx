import React from "react";
import { Empty } from "antd";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie } from "recharts";

function truncateLabel(value, maxLength = 40) {
  if (value == null || value === "") return "—";
  const strValue = String(value);
  if (strValue.length <= maxLength) {
    return strValue;
  }
  return `${strValue.slice(0, maxLength - 1)}…`;
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
    <div className="!rounded-2xl !border !border-slate-200 !bg-white !p-3 !shadow-xl dark:!border-slate-700 dark:!bg-slate-900 !z-50 !relative">
      {label ? (
        <p className="!m-0 !mb-1 !leading-tight !text-sm !font-bold !text-slate-900 dark:!text-white">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="!space-y-0">
        {payload.map((entry) => {
          const rawName = entry.name || entry.payload?.label;
          const displayName = rawName && String(rawName).trim() ? rawName : null;
          const dotColor = entry.color || entry.payload?.color || entry.payload?.fill;
          const displayValue = valueFormatter ? valueFormatter(entry.value, entry.dataKey, entry.payload) : entry.value;

          // Khi không có tên (vd: histogram "count" đã được đổi thành " "),
          // chỉ hiển thị dấu chấm màu tím + số sát nhau, bỏ chữ "count".
          if (!displayName) {
            return (
              <div key={entry.dataKey || entry.name} className="!m-0 !flex !items-center !gap-2 !leading-none !text-sm">
                <span className="!h-2.5 !w-2.5 !rounded-full !shrink-0" style={{ backgroundColor: dotColor }} />
                <span className="!font-bold !text-slate-950 dark:!text-white">{displayValue}</span>
              </div>
            );
          }

          return (
            <div key={entry.dataKey || entry.name} className="!flex !items-center !justify-between !gap-4 !text-sm">
              <div className="!flex !items-center !gap-2 !text-slate-600 dark:!text-slate-300">
                <span className="!h-2.5 !w-2.5 !rounded-full !shrink-0" style={{ backgroundColor: dotColor }} />
                <span>{displayName}</span>
              </div>
              <span className="!font-semibold !text-slate-950 dark:!text-white">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartPanelState({ emptyText, loading = false, rows = 3 }) {
  if (loading) {
    return (
      <div className="!rounded-2xl border border-slate-200 bg-slate-50 !p-4 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white !p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="!mt-3 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="!mt-3 h-4 w-20 rounded-lg bg-slate-100 dark:bg-slate-800/80" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="!rounded-2xl border border-dashed border-slate-200 !py-10 dark:border-slate-800">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    </div>
  );
}

export function DonutSummaryChart({
  data,
  totalValue,
  totalLabel, // kept for compatibility but we might not show it exactly as before
  emptyText,
  valueFormatter = (value) => value,
  loading = false,
}) {
  if (loading) {
    return <ChartPanelState emptyText={emptyText} loading rows={3} />;
  }

  const safeData = Array.isArray(data) ? data.filter((item) => Number(item.value) > 0) : [];

  if (!safeData.length) {
    return <ChartPanelState emptyText={emptyText} />;
  }

  const total = totalValue > 0 ? totalValue : safeData.reduce((acc, curr) => acc + curr.value, 0);

  const dataWithPercent = safeData.map(item => ({
    ...item,
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 !gap-8 items-center w-full">
      {/* Left side: Pie Chart and Legend */}
      <div className="flex flex-col items-center justify-center">
        <div className="h-56 w-full max-w-[18rem]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={dataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="label"
                stroke="none"
              >
                {dataWithPercent.map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <ChartTooltip
                    labelFormatter={() => ''}
                    valueFormatter={(...args) => valueFormatter(...args)}
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend beneath the chart */}
        <div className="!mt-4 flex flex-wrap justify-center !gap-4">
          {dataWithPercent.map((item) => (
            <div key={item.label} className="flex items-center !gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate max-w-[120px]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side: Data Rows */}
      <div className="flex flex-col justify-center !gap-2 w-full">
        {dataWithPercent.map((item) => {
          // Add tone-based background for tags if we want to match colors roughly
          // We can use style for exact color matching.
          return (
            <div key={item.label} className="flex items-center !gap-3 border-b border-slate-100 !py-3 last:border-0 dark:border-slate-800/60">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                {item.label}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {valueFormatter(item.value)}
              </div>
              <div
                className="min-w-[2.5rem] rounded-full !px-2 !py-0.5 text-center text-xs font-bold"
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
              >
                {item.percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent === 0) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="!text-[11px] !font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CompactDonutChart({
  data,
  totalValue,
  emptyText,
  valueFormatter = (value) => value,
  loading = false,
}) {
  if (loading) {
    return <ChartPanelState emptyText={emptyText} loading rows={3} />;
  }

  const safeData = Array.isArray(data) ? data.filter((item) => Number(item.value) > 0) : [];

  if (!safeData.length) {
    return <ChartPanelState emptyText={emptyText} />;
  }

  return (
    <div className="!flex !flex-col !items-center !w-full">
      {/* Chart */}
      <div className="!h-[240px] !w-full !max-w-[240px] !mb-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={65}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
              nameKey="label"
              stroke="none"
            >
              {safeData.map((item, index) => (
                <Cell key={`cell-${index}`} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  labelFormatter={() => ''}
                  valueFormatter={(...args) => valueFormatter(...args)}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend List */}
      <div className="!w-full !flex !flex-col">
        {safeData.map((item) => (
          <div key={item.label} className="!flex !items-center !justify-between !py-3 !border-b !border-slate-100 dark:!border-slate-800 last:!border-0">
            <div className="!flex !items-center !gap-2">
              <span className="!h-2.5 !w-2.5 !rounded-full !shrink-0" style={{ backgroundColor: item.color }} />
              <span className="!text-[14px] !text-slate-700 dark:!text-slate-300">{item.label}</span>
            </div>
            <span className="!text-[15px] !font-bold !text-slate-900 dark:!text-white">{valueFormatter(item.value)}</span>
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
  xAxisLabel,
  valueFormatter = (value) => value,
  loading = false,
}) {
  if (loading) {
    return <ChartPanelState emptyText={emptyText} loading rows={3} />;
  }

  const safeData = Array.isArray(data) ? data.filter((item) => series.some((entry) => Number(item[entry.key]) > 0)) : [];

  if (!safeData.length) {
    return <ChartPanelState emptyText={emptyText} />;
  }

  const chartHeight = getVerticalChartHeight(safeData.length, {
    min: 240,
    max: 800,
    row: 40,
    base: 60,
  });

  return (
    <div style={{ height: `${chartHeight}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          layout="vertical"
          data={safeData}
          margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          barCategoryGap={12}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
          <XAxis 
            type="number" 
            hide={false} 
            allowDecimals={false}
            tick={{ fill: "#64748b", fontSize: 12 }} 
            axisLine={false} 
            tickLine={false} 
            label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -10, fill: "#64748b", fontSize: 12, fontWeight: 600 } : undefined}
          />
          <YAxis 
            type="category" 
            dataKey="label" 
            width={200} 
            tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600, lineHeight: "24px" }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(value) => truncateLabel(value, 40)}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={
              <ChartTooltip
                labelFormatter={(value) => value || "Không có tên"}
                valueFormatter={(...args) => valueFormatter(...args)}
              />
            }
          />
          {series.map((entry) => (
            <Bar key={entry.key} dataKey={entry.key} name={entry.label} stackId="a" fill={entry.color} maxBarSize={24} />
          ))}
        </BarChart>
      </ResponsiveContainer>
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
  xAxisAngle = -18,
  xAxisHeight = 54,
  xAxisTextAnchor = "end",
  disableCursor = false,
  marginBottom = 28,
  yDomain = [0, "auto"],
  loading = false,
}) {
  if (loading) {
    return <ChartPanelState emptyText={emptyText} loading rows={layout === "vertical" ? 4 : 2} />;
  }

  const safeData = Array.isArray(data) ? data.filter((item) => Number(item[dataKey]) >= 0) : [];

  if (!safeData.length) {
    return <ChartPanelState emptyText={emptyText} />;
  }

  const isVerticalLayout = layout === "vertical";
  const chartHeight = getVerticalChartHeight(safeData.length, {
    min: 220,
    max: 340,
    row: 26,
    base: 84,
  });

  if (isVerticalLayout) {
    const maxValue = Math.max(...safeData.map((item) => Number(item[dataKey]) || 0), 0);

    return (
      <div className="!space-y-3">
        {safeData.map((item, index) => {
          const value = Number(item[dataKey]) || 0;
          const width = barPercentKey
            ? clampPercent(item[barPercentKey])
            : maxValue > 0
              ? Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)
              : 0;
          return (
            <div key={`${item[labelKey]}-${index}`} className="min-w-0 !rounded-2xl border border-slate-200 bg-slate-50 !p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-start justify-between !gap-4">
                <div className="min-w-0">
                  <p className="!m-0 break-words text-sm font-bold leading-5 text-slate-900 dark:text-white">
                    {truncateLabel(item[labelKey], 56)}
                  </p>
                </div>
                <p className="!m-0 shrink-0 text-right text-sm font-semibold leading-5 text-slate-500 dark:text-slate-300">
                  {valueFormatter(value, dataKey, item)}
                </p>
              </div>

              <div className="!mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={safeData}
          layout="horizontal"
          margin={{ top: 6, right: 18, left: 4, bottom: marginBottom }}
          barCategoryGap={12}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey={labelKey}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={xAxisAngle}
            textAnchor={xAxisTextAnchor}
            height={xAxisHeight}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value) => (xTickFormatter ? xTickFormatter(value) : truncateLabel(value, 14))}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={yDomain}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            cursor={disableCursor ? false : { fill: "#f1f5f9" }}
            content={
              <ChartTooltip
                labelFormatter={(value) => value}
                valueFormatter={(...args) => valueFormatter(...args)}
              />
            }
          />
          <Bar dataKey={dataKey} name=" " radius={[8, 8, 0, 0]} fill={color} maxBarSize={26}>
            {safeData.map((item) => (
              <Cell key={`${item[labelKey]}-${item[dataKey]}`} fill={item.color || color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
