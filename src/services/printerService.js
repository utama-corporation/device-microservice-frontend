import api from "../api/api";

const normalizeData = (response) =>
  response?.data?.data || response?.data || null;
const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.printers)) return payload.printers;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.resetLogs)) return payload.resetLogs;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const printerService = {
  // Bluetooth: { mac, name }
  // Jaringan : { ipAddress, port, name, labelWidthMm, labelHeightMm, connectionType: "NETWORK" }
  addPrinter: async (payload) => {
    const response = await api.post("/", payload);
    return normalizeData(response);
  },
  updatePrinterName: async ({ id, identifier, name }) => {
    const candidates = [id, identifier].filter(Boolean);
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const response = await api.patch(`/${encodeURIComponent(candidate)}`, {
          name,
        });
        return normalizeData(response);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Gagal update printer.");
  },
  // Update nama + (untuk printer jaringan) IP / port / ukuran label.
  updatePrinter: async ({ id, identifier, ...body }) => {
    const candidates = [id, identifier].filter(Boolean);
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const response = await api.patch(
          `/${encodeURIComponent(candidate)}`,
          body,
        );
        return normalizeData(response);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Gagal update printer.");
  },
  deletePrinter: async ({ id, identifier }) => {
    const candidates = [id, identifier].filter(Boolean);
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const response = await api.delete(`/${encodeURIComponent(candidate)}`);
        return normalizeData(response);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Gagal menghapus printer.");
  },
  getPrinters: async () => {
    const response = await api.get("/");
    return normalizeList(normalizeData(response));
  },
  getPrinterDetail: async (printerId) => {
    const response = await api.get(`/${encodeURIComponent(printerId)}`);
    return normalizeData(response);
  },
  getPrinterLogs: async (printerId) => {
    const response = await api.get("/log", { params: { printerId } });
    return normalizeList(normalizeData(response));
  },
  getPrinterLogsPayload: async (printerId, page = 1, limit = 10) => {
    const response = await api.get("/log", {
      params: { printerId, page, limit },
    });
    return normalizeData(response);
  },
  getPrinterLogSummary: async (printerId, params = {}) => {
    const query = { printerId };
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    const response = await api.get("/log/summary", { params: query });
    return normalizeData(response);
  },
  addPrintLog: async (payload) => {
    const response = await api.post("/log", payload);
    return normalizeData(response);
  },
  getResetLogs: async (printerId) => {
    const response = await api.get("/reset", { params: { printerId } });
    return normalizeList(normalizeData(response));
  },
  getResetLogsPayload: async (printerId, page = 1, limit = 10) => {
    const response = await api.get("/reset", {
      params: { printerId, page, limit },
    });
    return normalizeData(response);
  },
  resetPrinter: async ({ printerId, remark }) => {
    const response = await api.post("/reset", { printerId, remark });
    return normalizeData(response);
  },
  getMaxPrintCountSetting: async () => {
    const response = await api.get("/settings/max-print-count");
    return normalizeData(response);
  },
  updateMaxPrintCountSetting: async (maxPrintCount) => {
    const response = await api.put("/settings/max-print-count", {
      maxPrintCount,
    });
    return normalizeData(response);
  },
};
