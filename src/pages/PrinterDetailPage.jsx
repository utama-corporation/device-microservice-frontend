import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import ResetPrinterModal from "../components/ResetPrinterModal";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import { printerService } from "../services/printerService";
import { formatDateTime, formatDisplayValue } from "../utils/formatters";

const LIMIT = 10;

function getLast14DaysRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 13);
  const fmt = (d) => d.toLocaleDateString("en-CA");
  return { from: fmt(from), to: fmt(to) };
}

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return value;
}

const SOURCE_APP_BADGE_MAP = {
  WPS: "bg-emerald-100 text-emerald-700",
  PPS: "bg-brand-100 text-brand-700",
};

const getSourceAppBadge = (sourceApp) =>
  SOURCE_APP_BADGE_MAP[String(sourceApp || "").toUpperCase()] ??
  "bg-amber-100 text-amber-700";

const formatDateLong = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatCompactDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const USER_COLORS = [
  "#1087dc",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0891b2",
  "#be185d",
];

function buildPieSegments(items, getColor) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((s, item) => s + (item.count ?? 0), 0);
  let offset = 0;
  const enriched = items.map((item, index) => {
    const count = item.count ?? 0;
    const percent = total > 0 ? count / total : 0;
    const dash = percent * circumference;
    const segment = {
      ...item,
      color: getColor(item, index),
      percent,
      dash,
      offset,
    };
    offset += dash;
    return segment;
  });
  return { enriched, total, radius, circumference };
}

function MiniDonut({
  enriched,
  total,
  radius,
  circumference,
  centerValue,
  centerLabel,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [animMounted, setAnimMounted] = useState(false);

  useEffect(() => {
    setAnimMounted(false);
    const t = setTimeout(() => setAnimMounted(true), 50);
    return () => clearTimeout(t);
  }, [enriched]);

  const hovered = hoveredIndex !== null ? enriched[hoveredIndex] : null;

  const displayValue = hovered ? hovered.count : (centerValue ?? total);
  const displayLabel = hovered ? hovered.label : (centerLabel ?? "prints");
  const displayPct = hovered ? `${(hovered.percent * 100).toFixed(1)}%` : null;

  return (
    <div className="relative mx-auto h-36 w-36 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
        />
        {enriched.map((item, i) => {
          const isHovered = hoveredIndex === i;
          const isDimmed = hoveredIndex !== null && !isHovered;
          return (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? 22 : 16}
              strokeDasharray={
                animMounted
                  ? `${item.dash} ${circumference - item.dash}`
                  : `0 ${circumference}`
              }
              strokeDashoffset={-item.offset}
              strokeLinecap="round"
              opacity={isDimmed ? 0.3 : 1}
              style={{
                cursor: "pointer",
                transition:
                  "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1), stroke-width 0.2s ease, opacity 0.2s ease",
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span
          className="text-lg font-bold leading-tight transition-colors duration-200"
          style={{ color: hovered ? hovered.color : "#0f172a" }}
        >
          {displayValue}
        </span>
        <span className="mt-0.5 line-clamp-1 max-w-[80px] text-[10px] font-semibold text-slate-500">
          {displayLabel}
        </span>
        {displayPct && (
          <span
            className="text-[10px] font-bold"
            style={{ color: hovered?.color }}
          >
            {displayPct}
          </span>
        )}
      </div>
    </div>
  );
}

function LegendRow({ item, renderIcon }) {
  const animCount = useCountUp(item.count);
  const [barMounted, setBarMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarMounted(true), 50);
    return () => clearTimeout(t);
  }, [item.count]);
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
      {renderIcon(item)}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-slate-700">
            {item.label}
          </span>
          <span className="shrink-0 text-sm font-bold text-slate-900">
            {animCount}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: barMounted
                ? `${Math.max(item.percent * 100, item.count > 0 ? 6 : 0)}%`
                : "0%",
              backgroundColor: item.color,
            }}
          />
        </div>
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-400">
        {(item.percent * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function PieSection({ title, pie, renderIcon, centerValue, centerLabel }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      {pie.enriched.length === 0 ? (
        <p className="text-sm text-slate-400">No data.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <MiniDonut
            {...pie}
            centerValue={centerValue}
            centerLabel={centerLabel}
          />
          <div className="w-full space-y-2">
            {pie.enriched.map((item, i) => (
              <LegendRow key={i} item={item} renderIcon={renderIcon} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DailySummary({ summaryData }) {
  return (
    <div className="space-y-5">
      <PrintSummaryCard summaryData={summaryData} />
      <DailyProgressChart summaryData={summaryData} />
    </div>
  );
}

function PrintSummaryCard({ summaryData }) {
  if (!summaryData) return null;

  const sourceApps = Array.isArray(summaryData.sourceAppSummary)
    ? summaryData.sourceAppSummary
    : [];

  const dailySummary = Array.isArray(summaryData.dailySummary)
    ? summaryData.dailySummary
    : [];

  const userMap = {};
  for (const day of dailySummary) {
    for (const user of Array.isArray(day.users) ? day.users : []) {
      const key = user.printBy || "unknown";
      userMap[key] = (userMap[key] ?? 0) + (user.printCount ?? 0);
    }
  }

  const appItems = sourceApps.map((item) => ({
    label: item.sourceApp,
    count: item.count ?? 0,
  }));

  const userItems = Object.entries(userMap)
    .map(([printBy, count]) => ({ label: printBy, count }))
    .sort((a, b) => b.count - a.count);

  const appPie = buildPieSegments(appItems, (item) => {
    const key = String(item.label || "").toUpperCase();
    if (key === "WPS" || key === "WIPS") return "#059669";
    if (key === "PPS") return "#1087dc";
    return "#d97706";
  });

  const userPie = buildPieSegments(
    userItems,
    (_, index) => USER_COLORS[index % USER_COLORS.length],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-sm font-semibold text-slate-700">
          Print Distribution
        </p>
        <p className="text-xs text-slate-500">
          Breakdown by source app and user
        </p>
      </div>
      <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <PieSection
          title="By Source App"
          pie={appPie}
          renderIcon={(item) => (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
        />
        <PieSection
          title="By User"
          pie={userPie}
          centerValue={userItems.length}
          centerLabel="users"
          renderIcon={(item) => (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: item.color }}
            >
              {String(item.label)[0]}
            </span>
          )}
        />
      </div>
    </div>
  );
}

const BAR_COLORS_HEX = ["#1087dc", "#7c3aed", "#059669", "#d97706", "#e11d48"];

function DailyProgressChart({ summaryData }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [summaryData]);

  const handleBarMouseMove = (e, day) => {
    setTooltip({ x: e.clientX, y: e.clientY, day });
  };

  const handleBarMouseLeave = () => {
    setTooltip(null);
  };

  if (!summaryData) return null;

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const dailySummary = (
    Array.isArray(summaryData.dailySummary) ? summaryData.dailySummary : []
  ).filter((d) => !d.date || d.date <= todayStr);

  if (dailySummary.length === 0) {
    return (
      <EmptyState
        title="No daily data"
        description="There is no daily data for the selected date range."
      />
    );
  }

  const maxDailyCount = Math.max(
    ...dailySummary.map((item) => item.totalPrintCount ?? 0),
    1,
  );

  const totalAll = dailySummary.reduce(
    (s, d) => s + (d.totalPrintCount ?? 0),
    0,
  );
  const avgCount = Math.round(totalAll / dailySummary.length);

  const selectedDay =
    selectedIndex !== null ? dailySummary[selectedIndex] : null;
  const selectedUsers = Array.isArray(selectedDay?.users)
    ? selectedDay.users
    : [];
  const selectedColor =
    selectedIndex !== null
      ? BAR_COLORS_HEX[selectedIndex % BAR_COLORS_HEX.length]
      : null;

  const animTotal = useCountUp(totalAll);
  const animMax = useCountUp(maxDailyCount);
  const animAvg = useCountUp(avgCount);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-sm font-semibold text-slate-700">Daily Summary</p>
        <p className="text-xs text-slate-500">Click a bar to view daily details.</p>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-slate-900">{animTotal}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Max/day</span>
            <span className="font-bold text-slate-900">{animMax}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Avg/day</span>
            <span className="font-bold text-slate-900">{animAvg}</span>
          </div>
          {selectedIndex !== null && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              onClick={() => setSelectedIndex(null)}
            >
              ✕ Close detail
            </button>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[56px_minmax(0,1fr)]">
          {/* skala kiri */}
          <div className="relative hidden h-[280px] shrink-0 text-right text-[11px] text-slate-400 lg:block">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <span
                key={ratio}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(1 - ratio) * 100}%` }}
              >
                {Math.ceil(maxDailyCount * ratio)}
              </span>
            ))}
          </div>

          {/* area bar */}
          <div className="relative h-[280px] min-w-0">
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  className="absolute inset-x-0 border-t border-dashed border-slate-200"
                  style={{ top: `${pct}%` }}
                />
              ))}
            </div>

            {avgCount > 0 && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 hidden lg:block"
                style={{
                  top: `${((maxDailyCount - avgCount) / maxDailyCount) * 100}%`,
                }}
              >
                <div className="border-t-2 border-dashed border-brand-400 opacity-50" />
                <span className="absolute right-0 -top-4 text-[10px] font-semibold text-brand-500">
                  avg
                </span>
              </div>
            )}

            <div
              className="grid h-full items-end gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${dailySummary.length}, minmax(0, 1fr))`,
              }}
            >
              {dailySummary.map((day, index) => {
                const total = day.totalPrintCount ?? 0;
                const barPct =
                  total > 0 ? Math.max((total / maxDailyCount) * 100, 4) : 0;
                const colorHex = BAR_COLORS_HEX[index % BAR_COLORS_HEX.length];
                const isSelected = selectedIndex === index;
                const isDimmed =
                  selectedIndex !== null && selectedIndex !== index;

                return (
                  <div
                    key={day.date}
                    className={`relative flex h-full cursor-pointer items-end justify-center rounded-t-xl px-1 transition-all duration-200 ${
                      isSelected ? "bg-slate-100" : "hover:bg-slate-100"
                    } ${isDimmed ? "opacity-40" : ""}`}
                    onClick={() => setSelectedIndex(isSelected ? null : index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedIndex(isSelected ? null : index);
                    }}
                    onMouseMove={(e) => handleBarMouseMove(e, day)}
                    onMouseLeave={handleBarMouseLeave}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${day.date}: ${total} print`}
                  >
                    <div
                      className="relative w-full max-w-10 rounded-t-lg transition-all duration-700 ease-out"
                      style={{
                        height: mounted ? `${barPct}%` : "0%",
                        backgroundColor: colorHex,
                        opacity: isSelected ? 1 : isDimmed ? 0.5 : 0.8,
                        boxShadow: isSelected
                          ? `0 4px 14px 0 ${colorHex}55`
                          : "none",
                        transform: isSelected ? "scaleX(1.08)" : "scaleX(1)",
                      }}
                    >
                      {total > 0 && (
                        <span
                          className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold transition-colors duration-200 ${
                            isSelected ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {total}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* spacer skala kiri untuk baris tanggal */}
          <div className="hidden lg:block" />

          {/* baris tanggal — di bawah garis 0 */}
          <div
            className="mt-2 grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${dailySummary.length}, minmax(0, 1fr))`,
            }}
          >
            {dailySummary.map((day, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div key={day.date} className="text-center">
                  <p
                    className={`text-[11px] font-semibold transition-colors duration-200 ${
                      isSelected ? "text-brand-600" : "text-slate-500"
                    }`}
                  >
                    {formatCompactDate(day.date)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div
            className="mt-5 overflow-hidden rounded-2xl border transition-all duration-300"
            style={{ borderColor: `${selectedColor}44` }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              style={{ backgroundColor: `${selectedColor}12` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedColor }}
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedDay.date}
                  </p>
                  <p className="text-xs text-slate-500">Detail per user</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedDay.totalPrintCount ?? 0} prints
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
                  {selectedUsers.length} user
                </span>
              </div>
            </div>

            <div className="p-4">
              {selectedUsers.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No user data available.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedUsers.map((user, i) => {
                    const pct =
                      (selectedDay.totalPrintCount ?? 0) > 0
                        ? ((user.printCount ?? 0) /
                            (selectedDay.totalPrintCount ?? 1)) *
                          100
                        : 0;
                    return (
                      <div
                        key={`${selectedDay.date}-${user.printBy || "anon"}-${i}`}
                        className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-700">
                            {user.printBy || "unknown"}
                          </span>
                          <span className="shrink-0 text-sm font-bold text-slate-900">
                            {user.printCount ?? 0}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: selectedColor,
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          {user.logCount ?? 0} log · {pct.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="mb-2 border-b border-slate-100 pb-2">
            <p className="text-xs font-semibold text-slate-500">
              {formatDateLong(tooltip.day.date)}
            </p>
            <p className="text-base font-bold text-slate-900">
              {tooltip.day.totalPrintCount ?? 0}{" "}
              <span className="text-xs font-normal text-slate-500">prints</span>
            </p>
          </div>
          <div className="space-y-1">
            {(Array.isArray(tooltip.day.users) ? tooltip.day.users : [])
              .length === 0 ? (
              <p className="text-xs text-slate-400">No user data.</p>
            ) : (
              tooltip.day.users.map((user, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-xs text-slate-600">
                    {user.printBy || "unknown"}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-slate-900">
                    {user.printCount ?? 0}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          &larr; Prev
        </button>
        <button
          className="btn-secondary"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}

function PrinterDetailPage() {
  const { printerId } = useParams();
  const [printer, setPrinter] = useState(null);
  const [printLogs, setPrintLogs] = useState([]);
  const [resetLogs, setResetLogs] = useState([]);
  const [printMeta, setPrintMeta] = useState({ page: 1, totalPages: 1 });
  const [resetMeta, setResetMeta] = useState({ page: 1, totalPages: 1 });
  const [avgPrintCountAtReset, setAvgPrintCountAtReset] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryFrom, setSummaryFrom] = useState(() => getLast14DaysRange().from);
  const [summaryTo, setSummaryTo] = useState(() => getLast14DaysRange().to);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [activeTab, setActiveTab] = useState("print-logs");
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupId, setLookupId] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);

  const loadSummary = useCallback(async (printerKey, params = {}) => {
    if (!printerKey) return null;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const payload = await printerService.getPrinterLogSummary(
        printerKey,
        params,
      );
      setSummaryData(payload || null);
      setSummaryFrom(payload?.range?.from ?? params.from ?? "");
      setSummaryTo(payload?.range?.to ?? params.to ?? "");
      return payload;
    } catch (loadError) {
      setSummaryData(null);
      setSummaryError(loadError.message || "Failed to load summary.");
      return null;
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!printerId) return;
    setLoading(true);
    setError("");
    setSummaryError("");
    try {
      const routeValue = decodeURIComponent(printerId);
      let printerData = null;
      let lookupValue = routeValue;

      try {
        printerData = await printerService.getPrinterDetail(routeValue);
      } catch (detailError) {
        const message = String(detailError?.message || "").toLowerCase();
        if (!message.includes("not found")) throw detailError;

        const printers = await printerService.getPrinters();
        const matched = printers.find((item) => {
          const id = String(item.id || "").toLowerCase();
          const identifier = String(item.identifier || "").toLowerCase();
          const target = routeValue.toLowerCase();
          return id === target || identifier === target;
        });
        if (matched?.id) {
          try {
            printerData = await printerService.getPrinterDetail(matched.id);
          } catch {
            printerData = matched;
          }
          lookupValue = matched.identifier || matched.id || routeValue;
        }
      }

      lookupValue = printerData?.identifier || lookupValue;
      setLookupId(lookupValue);

      const [printLogResult, resetResult, summaryResult] =
        await Promise.allSettled([
          printerService.getPrinterLogsPayload(lookupValue, 1, LIMIT),
          printerService.getResetLogsPayload(lookupValue, 1, LIMIT),
          printerService.getPrinterLogSummary(lookupValue, getLast14DaysRange()),
        ]);

      const printPayload =
        printLogResult.status === "fulfilled" ? printLogResult.value : null;
      const resetPayload =
        resetResult.status === "fulfilled" ? resetResult.value : null;
      const summaryPayload =
        summaryResult.status === "fulfilled" ? summaryResult.value : null;

      const resolvedPrinter =
        printerData || printPayload?.printer || resetPayload?.printer || null;

      if (!resolvedPrinter) throw new Error("Printer not found");

      setPrinter(resolvedPrinter);

      setPrintLogs(
        Array.isArray(printPayload?.logs)
          ? printPayload.logs
          : Array.isArray(printPayload)
            ? printPayload
            : [],
      );
      setPrintMeta({
        page: printPayload?.pagination?.page ?? 1,
        totalPages: printPayload?.pagination?.totalPages ?? 1,
      });

      setResetLogs(
        Array.isArray(resetPayload?.resetLogs)
          ? resetPayload.resetLogs
          : Array.isArray(resetPayload)
            ? resetPayload
            : [],
      );
      setResetMeta({
        page: resetPayload?.pagination?.page ?? 1,
        totalPages: resetPayload?.pagination?.totalPages ?? 1,
      });
      setAvgPrintCountAtReset(resetPayload?.printer?.avgPrintCountAtReset ?? null);

      if (summaryPayload) {
        setSummaryData(summaryPayload);
        setSummaryFrom(summaryPayload?.range?.from ?? "");
        setSummaryTo(summaryPayload?.range?.to ?? "");
      } else {
        setSummaryData(null);
        setSummaryFrom("");
        setSummaryTo("");
        if (summaryResult.status === "rejected") {
          setSummaryError(
            summaryResult.reason?.message || "Failed to load summary.",
          );
        }
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load printer details.");
    } finally {
      setLoading(false);
    }
  }, [printerId]);

  const loadPrintPage = useCallback(
    async (page) => {
      if (!lookupId) return;
      setLogLoading(true);
      try {
        const payload = await printerService.getPrinterLogsPayload(
          lookupId,
          page,
          LIMIT,
        );
        setPrintLogs(
          Array.isArray(payload?.logs)
            ? payload.logs
            : Array.isArray(payload)
              ? payload
              : [],
        );
        setPrintMeta({
          page: payload?.pagination?.page ?? page,
          totalPages: payload?.pagination?.totalPages ?? 1,
        });
      } finally {
        setLogLoading(false);
      }
    },
    [lookupId],
  );

  const loadResetPage = useCallback(
    async (page) => {
      if (!lookupId) return;
      setLogLoading(true);
      try {
        const payload = await printerService.getResetLogsPayload(
          lookupId,
          page,
          LIMIT,
        );
        setResetLogs(
          Array.isArray(payload?.resetLogs)
            ? payload.resetLogs
            : Array.isArray(payload)
              ? payload
              : [],
        );
        setResetMeta({
          page: payload?.pagination?.page ?? page,
          totalPages: payload?.pagination?.totalPages ?? 1,
        });
        setAvgPrintCountAtReset(payload?.printer?.avgPrintCountAtReset ?? null);
      } finally {
        setLogLoading(false);
      }
    },
    [lookupId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loader text="Loading printer details..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!printer)
    return (
      <EmptyState
        title="Printer not found"
        description={`No data available for printer ${printerId}.`}
      />
    );

  const logRows = activeTab === "print-logs" ? printLogs : resetLogs;
  const meta = activeTab === "print-logs" ? printMeta : resetMeta;
  const onPageChange =
    activeTab === "print-logs" ? loadPrintPage : loadResetPage;

  const applySummaryRange = async () => {
    if (!lookupId) return;
    await loadSummary(lookupId, {
      from: summaryFrom || undefined,
      to: summaryTo || undefined,
    });
  };

  const resetSummaryRange = async () => {
    if (!lookupId) return;
    const range = getLast14DaysRange();
    setSummaryFrom(range.from);
    setSummaryTo(range.to);
    await loadSummary(lookupId, range);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/printers" className="btn-secondary">
          Back to List
        </Link>
        <div className="flex gap-2">
          <button
            className="btn-danger"
            type="button"
            onClick={() => setResetOpen(true)}
          >
            Reset Printer
          </button>
        </div>
      </div>

      <article className="panel p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Device</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {formatDisplayValue(printer.name)}
            </h1>
            <p className="mt-1 text-slate-600">
              {formatDisplayValue(printer.identifier)}
            </p>
          </div>
          <StatusBadge status={printer.status} />
        </div>

        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-slate-500">Print Usage</p>
            <p className="font-semibold text-slate-900">
              {formatDisplayValue(printer.printUsage)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Last Used At</p>
            <p className="font-semibold text-slate-900">
              {formatDateTime(printer.lastUsedAt)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Last Used By</p>
            <p className="font-semibold text-slate-900">
              {formatDisplayValue(printer.lastUsedBy)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-500">From</span>
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-brand-500"
                type="date"
                value={summaryFrom}
                onChange={(event) => setSummaryFrom(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-500">To</span>
              <input
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-brand-500"
                type="date"
                value={summaryTo}
                onChange={(event) => setSummaryTo(event.target.value)}
              />
            </label>
            <button
              className="btn-secondary"
              type="button"
              onClick={applySummaryRange}
              disabled={summaryLoading}
            >
              Apply
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={resetSummaryRange}
              disabled={summaryLoading}
            >
              Reset
            </button>
          </div>

          {summaryLoading && (
            <div className="py-3 text-sm text-slate-500">
              Loading summary...
            </div>
          )}

          {!summaryLoading && summaryError && (
            <ErrorState message={summaryError} onRetry={resetSummaryRange} />
          )}

          {!summaryLoading && !summaryError && (
            <div className="mt-4">
              <DailySummary summaryData={summaryData} />
            </div>
          )}
        </div>
      </article>

      <article className="panel p-5">
        <Tabs
          tabs={[
            { value: "print-logs", label: "Print Logs" },
            { value: "reset-logs", label: "Reset Logs" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-4">
          {logLoading && (
            <div className="py-6 text-center text-sm text-slate-400">
              Loading logs...
            </div>
          )}

          {!logLoading && logRows.length === 0 && (
            <EmptyState
              title={
                activeTab === "print-logs" ? "No print logs" : "No reset logs"
              }
              description="No log data available for this printer."
            />
          )}

          {!logLoading && logRows.length > 0 && (
            <div className="overflow-x-auto">
              {activeTab === "print-logs" ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">ID</th>
                      <th className="px-3 py-2 font-semibold">sourceApp</th>
                      <th className="px-3 py-2 font-semibold">printBy</th>
                      <th className="px-3 py-2 font-semibold">totalLabel</th>
                      <th className="px-3 py-2 font-semibold">printedAt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printLogs.map((log) => {
                      const badgeClass = getSourceAppBadge(log.sourceApp);
                      return (
                        <tr key={log.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {formatDisplayValue(log.id)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                            >
                              {formatDisplayValue(log.sourceApp)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {formatDisplayValue(log.printBy)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDisplayValue(log.totalLabel)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDateTime(log.printedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <>
                  {avgPrintCountAtReset !== null && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Rata-rata print sebelum reset</span>
                      <span className="font-bold text-slate-900">{avgPrintCountAtReset}x</span>
                    </div>
                  )}
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">ID</th>
                        <th className="px-3 py-2 font-semibold">doneBy</th>
                        <th className="px-3 py-2 font-semibold">doneAt</th>
                        <th className="px-3 py-2 font-semibold">Print saat Reset</th>
                        <th className="px-3 py-2 font-semibold">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resetLogs.map((log) => (
                        <tr key={log.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {formatDisplayValue(log.id)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDisplayValue(log.doneBy)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDateTime(log.doneAt)}
                          </td>
                          <td className="px-3 py-2">
                            {log.printCountAtReset !== null && log.printCountAtReset !== undefined ? (
                              <span className="font-semibold text-slate-800">{log.printCountAtReset}x</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {log.remark ? (
                              log.remark
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>

              )}

              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={onPageChange}
                loading={logLoading}
              />
            </div>
          )}
        </div>
      </article>

      <ResetPrinterModal
        isOpen={resetOpen}
        printer={printer}
        onClose={() => setResetOpen(false)}
        onSuccess={loadData}
      />
    </section>
  );
}

export default PrinterDetailPage;
