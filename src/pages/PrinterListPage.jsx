import { useCallback, useEffect, useMemo, useState } from "react";
import AddPrinterModal from "../components/AddPrinterModal";
import EmptyState from "../components/EmptyState";
import EditPrinterModal from "../components/EditPrinterModal";
import ErrorState from "../components/ErrorState";
import Loader from "../components/Loader";
import PrinterListTable from "../components/PrinterListTable";
import SearchBar from "../components/SearchBar";
import SettingMaxPrintCountModal from "../components/SettingMaxPrintCountModal";
import Tabs from "../components/Tabs";
import { onPrintersUpdated } from "../hooks/usePrinterEvents";
import { useToast } from "../hooks/useToast";
import { printerService } from "../services/printerService";

function PrinterListPage() {
  const [printers, setPrinters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addPrinterOpen, setAddPrinterOpen] = useState(false);
  const [maxPrintOpen, setMaxPrintOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState(null);
  const [maxPrintCount, setMaxPrintCount] = useState(null);
  const [tab, setTab] = useState("BLUETOOTH");
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [printerData, maxPrintCountData] = await Promise.all([
        printerService.getPrinters(),
        printerService.getMaxPrintCountSetting(),
      ]);
      setPrinters(
        Array.isArray(printerData)
          ? printerData
          : [printerData].filter(Boolean),
      );
      setMaxPrintCount(
        maxPrintCountData?.maxPrintCount ?? maxPrintCountData?.value ?? null,
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to load printer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => onPrintersUpdated(loadData), [loadData]);

  const counts = useMemo(() => {
    let network = 0;
    for (const p of printers) {
      if (p.connectionType === "NETWORK") network += 1;
    }
    return { network, bluetooth: printers.length - network };
  }, [printers]);

  const filteredPrinters = useMemo(() => {
    const byTab = printers.filter((p) =>
      tab === "NETWORK"
        ? p.connectionType === "NETWORK"
        : p.connectionType !== "NETWORK",
    );
    if (!search.trim()) return byTab;
    const keyword = search.toLowerCase();
    return byTab.filter((printer) => {
      const identifier = String(
        printer.identifier || printer.id || "",
      ).toLowerCase();
      const name = String(printer.name || "").toLowerCase();
      return identifier.includes(keyword) || name.includes(keyword);
    });
  }, [printers, search, tab]);

  const handleDeletePrinter = async (printer) => {
    if (!printer?.id && !printer?.identifier) {
      addToast({ type: "error", message: "Invalid printer data." });
      return;
    }

    const displayId = printer?.identifier || printer?.id;
    const confirmed = window.confirm(`Delete printer ${displayId}?`);
    if (!confirmed) return;

    try {
      await printerService.deletePrinter({
        id: printer?.id,
        identifier: printer?.identifier,
      });
      addToast({ type: "success", message: "Printer deleted successfully." });
      loadData();
    } catch (deleteError) {
      addToast({
        type: "error",
        message: deleteError.message || "Failed to delete printer.",
      });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Printer List</h1>
          <p className="text-sm text-slate-600">
            Manage printers, view usage details, and perform resets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setMaxPrintOpen(true)}
          >
            Print Limit
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={() => setAddPrinterOpen(true)}
          >
            Add Printer
          </button>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "BLUETOOTH", label: `Bluetooth (${counts.bluetooth})` },
          { value: "NETWORK", label: `Jaringan (${counts.network})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <SearchBar value={search} onChange={setSearch} />

      {loading && <Loader text="Loading printers..." />}
      {!loading && error && <ErrorState message={error} onRetry={loadData} />}
      {!loading && !error && filteredPrinters.length === 0 && (
        <EmptyState
          title="No printers found"
          description="Try a different keyword."
        />
      )}
      {!loading && !error && filteredPrinters.length > 0 && (
        <PrinterListTable
          printers={filteredPrinters}
          onOpenEdit={setSelectedForEdit}
          onDelete={handleDeletePrinter}
        />
      )}
      <EditPrinterModal
        isOpen={Boolean(selectedForEdit)}
        printer={selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        onSuccess={loadData}
      />
      <SettingMaxPrintCountModal
        isOpen={maxPrintOpen}
        value={maxPrintCount}
        onClose={() => setMaxPrintOpen(false)}
        onUpdated={(val) => {
          setMaxPrintCount(val);
          loadData();
        }}
      />
      <AddPrinterModal
        isOpen={addPrinterOpen}
        defaultType={tab}
        onClose={() => setAddPrinterOpen(false)}
        onSuccess={loadData}
      />
    </section>
  );
}

export default PrinterListPage;
