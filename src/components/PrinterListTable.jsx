import { Link } from "react-router-dom";
import { formatDateTime, formatDisplayValue } from "../utils/formatters";
import StatusBadge from "./StatusBadge";

function OnlineBadge({ online }) {
  const cfg =
    online === true
      ? { c: "bg-green-50 text-green-700", dot: "bg-green-500", t: "Online" }
      : online === false
        ? { c: "bg-rose-50 text-rose-600", dot: "bg-rose-500", t: "Offline" }
        : { c: "bg-slate-100 text-slate-400", dot: "bg-slate-300", t: "—" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cfg.c}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.t}
    </span>
  );
}

function PrinterListTable({ printers, onOpenEdit, onDelete }) {
  return (
    <>
      {/* Desktop table */}
      <div className="panel hidden overflow-hidden md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">MAC / IP</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Print Usage</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last Used At</th>
              <th className="px-5 py-3">Last Used By</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {printers.map((printer) => (
              <tr
                key={printer.id || printer.identifier}
                className="group transition-colors duration-150 hover:bg-slate-50"
              >
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
                      {formatDisplayValue(printer.identifier || printer.id)}
                      {printer.connectionType === "NETWORK" && (
                        <OnlineBadge online={printer.online} />
                      )}
                    </span>
                    {printer.connectionType === "NETWORK" && printer.network && (
                      <span className="text-[11px] text-slate-400">
                        {`${printer.network.labelWidthMm}×${printer.network.labelHeightMm} mm`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-medium text-slate-900">
                    {formatDisplayValue(printer.name)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatDisplayValue(printer.printUsage)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={printer.status} />
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {formatDateTime(printer.lastUsedAt)}
                </td>
                <td className="px-5 py-3.5">
                  {printer.lastUsedBy ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold uppercase text-brand-700">
                        {String(printer.lastUsedBy)[0]}
                      </span>
                      {printer.lastUsedBy}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      to={`/printers/${encodeURIComponent(printer.id || printer.identifier)}`}
                    >
                      Detail
                    </Link>
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      type="button"
                      onClick={() => onOpenEdit(printer)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                      type="button"
                      onClick={() => onDelete(printer)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {printers.map((printer) => (
          <article
            key={printer.id || printer.identifier}
            className="panel overflow-hidden p-0"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-slate-500">
                  {formatDisplayValue(printer.identifier || printer.id)}
                  {printer.connectionType === "NETWORK" && printer.network
                    ? ` · ${printer.network.labelWidthMm}×${printer.network.labelHeightMm} mm`
                    : ""}
                </p>
                <h3 className="mt-0.5 truncate text-base font-bold text-slate-900">
                  {formatDisplayValue(printer.name)}
                </h3>
              </div>
              <StatusBadge status={printer.status} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Print Usage</p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {formatDisplayValue(printer.printUsage)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Last Used By</p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {formatDisplayValue(printer.lastUsedBy)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Last Used At</p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {formatDateTime(printer.lastUsedAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
              <Link
                className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-center text-xs font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
                to={`/printers/${encodeURIComponent(printer.id || printer.identifier)}`}
              >
                Detail
              </Link>
              <button
                className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
                type="button"
                onClick={() => onOpenEdit(printer)}
              >
                Edit
              </button>
              <button
                className="flex-1 rounded-lg border border-rose-100 bg-white py-1.5 text-xs font-semibold text-rose-500 shadow-sm transition hover:bg-rose-50"
                type="button"
                onClick={() => onDelete(printer)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default PrinterListTable;
