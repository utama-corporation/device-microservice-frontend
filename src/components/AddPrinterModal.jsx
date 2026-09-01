import { useEffect, useState } from "react";
import { emitPrintersUpdated } from "../hooks/usePrinterEvents";
import { useToast } from "../hooks/useToast";
import { printerService } from "../services/printerService";
import Modal from "./Modal";

const IPV4_REGEX =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function AddPrinterModal({ isOpen, onClose, onSuccess, defaultType = "BLUETOOTH" }) {
  const [type, setType] = useState(defaultType);
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");
  const [labelWidthMm, setLabelWidthMm] = useState("100");
  const [labelHeightMm, setLabelHeightMm] = useState("150");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setMac("");
      setName("");
      setIpAddress("");
      setPort("9100");
      setLabelWidthMm("100");
      setLabelHeightMm("150");
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      addToast({ type: "error", message: "Name is required." });
      return;
    }

    let payload;
    if (type === "NETWORK") {
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
      payload = {
        connectionType: "NETWORK",
        ipAddress: ipAddress.trim(),
        port: Number(port) || 9100,
        name: name.trim(),
        labelWidthMm: w,
        labelHeightMm: h,
      };
    } else {
      if (!mac.trim()) {
        addToast({ type: "error", message: "MAC address is required." });
        return;
      }
      payload = { connectionType: "BLUETOOTH", mac: mac.trim(), name: name.trim() };
    }

    try {
      setIsSubmitting(true);
      await printerService.addPrinter(payload);
      addToast({ type: "success", message: "Printer added successfully." });
      emitPrintersUpdated();
      onSuccess?.();
      onClose();
    } catch (error) {
      addToast({
        type: "error",
        message: error.message || "Failed to add printer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Add Printer" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          {[
            { value: "BLUETOOTH", label: "Bluetooth" },
            { value: "NETWORK", label: "Jaringan (IP)" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                type === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {type === "BLUETOOTH" ? (
          <div>
            <label className="label" htmlFor="add-printer-mac">
              MAC
            </label>
            <input
              id="add-printer-mac"
              className="input"
              placeholder="AA:BB:CC:DD:EE:FF"
              value={mac}
              onChange={(event) => setMac(event.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="label" htmlFor="add-printer-ip">
                  IP Address
                </label>
                <input
                  id="add-printer-ip"
                  className="input"
                  placeholder="192.168.11.97"
                  value={ipAddress}
                  onChange={(event) => setIpAddress(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="add-printer-port">
                  Port
                </label>
                <input
                  id="add-printer-port"
                  className="input"
                  inputMode="numeric"
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="add-printer-w">
                  Lebar label (mm)
                </label>
                <input
                  id="add-printer-w"
                  className="input"
                  inputMode="decimal"
                  value={labelWidthMm}
                  onChange={(event) => setLabelWidthMm(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="add-printer-h">
                  Panjang label (mm)
                </label>
                <input
                  id="add-printer-h"
                  className="input"
                  inputMode="decimal"
                  value={labelHeightMm}
                  onChange={(event) => setLabelHeightMm(event.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="label" htmlFor="add-printer-name">
            Name
          </label>
          <input
            id="add-printer-name"
            className="input"
            placeholder={type === "NETWORK" ? "XPRINTER GUDANG" : "PANDA 1"}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Printer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddPrinterModal;
