import { useEffect, useState } from "react";
import { emitPrintersUpdated } from "../hooks/usePrinterEvents";
import { useToast } from "../hooks/useToast";
import { printerService } from "../services/printerService";
import Modal from "./Modal";

const IPV4_REGEX =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function EditPrinterModal({ isOpen, onClose, printer, onSuccess }) {
  const isNetwork = printer?.connectionType === "NETWORK";

  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");
  const [labelWidthMm, setLabelWidthMm] = useState("100");
  const [labelHeightMm, setLabelHeightMm] = useState("150");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setName(printer?.name || "");
    setIpAddress(printer?.network?.ipAddress || printer?.identifier || "");
    setPort(String(printer?.network?.port ?? 9100));
    setLabelWidthMm(String(printer?.network?.labelWidthMm ?? 100));
    setLabelHeightMm(String(printer?.network?.labelHeightMm ?? 150));
  }, [isOpen, printer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      addToast({ type: "error", message: "Name wajib diisi." });
      return;
    }
    if (!printer?.id && !printer?.identifier) {
      addToast({ type: "error", message: "Data printer tidak valid." });
      return;
    }

    const body = { name: name.trim() };
    if (isNetwork) {
      if (!IPV4_REGEX.test(ipAddress.trim())) {
        addToast({ type: "error", message: "IP address tidak valid." });
        return;
      }
      const w = Number(labelWidthMm);
      const h = Number(labelHeightMm);
      if (!(w > 0) || !(h > 0)) {
        addToast({ type: "error", message: "Ukuran label tidak valid." });
        return;
      }
      body.ipAddress = ipAddress.trim();
      body.port = Number(port) || 9100;
      body.labelWidthMm = w;
      body.labelHeightMm = h;
    }

    try {
      setIsSubmitting(true);
      await printerService.updatePrinter({
        id: printer?.id,
        identifier: printer?.identifier,
        ...body,
      });
      addToast({ type: "success", message: "Printer berhasil diupdate." });
      emitPrintersUpdated();
      onSuccess?.();
      onClose();
    } catch (error) {
      addToast({
        type: "error",
        message: error.message || "Gagal update printer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Edit Printer" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {isNetwork ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="label" htmlFor="edit-printer-ip">
                  IP Address
                </label>
                <input
                  id="edit-printer-ip"
                  className="input"
                  value={ipAddress}
                  onChange={(event) => setIpAddress(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-printer-port">
                  Port
                </label>
                <input
                  id="edit-printer-port"
                  className="input"
                  inputMode="numeric"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="edit-printer-w">
                  Lebar label (mm)
                </label>
                <input
                  id="edit-printer-w"
                  className="input"
                  inputMode="decimal"
                  value={labelWidthMm}
                  onChange={(event) => setLabelWidthMm(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-printer-h">
                  Panjang label (mm)
                </label>
                <input
                  id="edit-printer-h"
                  className="input"
                  inputMode="decimal"
                  value={labelHeightMm}
                  onChange={(event) => setLabelHeightMm(event.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="edit-printer-identifier">
              MAC Address
            </label>
            <input
              id="edit-printer-identifier"
              className="input bg-slate-100"
              value={printer?.identifier || "-"}
              readOnly
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="edit-printer-name">
            Name
          </label>
          <input
            id="edit-printer-name"
            className="input"
            placeholder="PANDA 2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPrinterModal;
