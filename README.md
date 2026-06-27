# Device Service Frontend

Frontend website untuk microservice **Device Service** dengan stack:

- React + Vite (JavaScript)
- Tailwind CSS
- Axios
- React Router

## Setup

1. Install dependencies:

```bash
npm install
```

2. Buat file `.env` (copy dari `.env.example`) dan isi:

```env
VITE_API_BASE_URL=http://localhost:3000
```

3. Jalankan project:

```bash
npm run dev
```

## Struktur Folder

```txt
src/
  api/            # axios instance
  components/     # komponen UI reusable
  hooks/          # custom hooks (toast + event refresh)
  pages/          # halaman utama (list/detail)
  services/       # wrapper endpoint API printer
  utils/          # helper format data
```

## Alur Data Singkat

- Semua request menggunakan base URL:
  - `${VITE_API_BASE_URL}/api/devices/printers`
- `src/services/printerService.js` menyediakan fungsi untuk:
  - list printer, detail printer
  - print logs, reset logs
  - reset printer
  - get/update max print count setting
- Halaman list (`/printers`):
  - fetch daftar printer + setting max print count
  - filter data by `identifier/name`
  - aksi: detail, reset
- Halaman detail (`/printers/:printerId`):
  - fetch detail printer + print logs + reset logs
  - tab `Print Logs` dan `Reset Logs`
  - aksi reset tersedia dari detail
- Setelah reset sukses:
  - tampilkan toast sukses
  - refresh data terkait (detail/log/list) via callback + event `printers:updated`

<!-- deploy_triger_runner -->
