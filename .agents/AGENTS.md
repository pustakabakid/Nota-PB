# AI_NO_NATIVE_UI_RULE.md
### Aturan Wajib: Larangan Elemen UI Bawaan Browser

Dokumen ini adalah tambahan wajib untuk `AI_DESIGN_SYSTEM.md` dan `AI_UI_REVIEW_SYSTEM.md` dalam Antigravity Protocol. Injeksikan ke setiap sesi coding (system prompt / awal task) agar AI tidak "membajak jalan pintas" dengan komponen native browser.

---

## 1. ATURAN INTI

**DILARANG KERAS** menggunakan elemen form/interaktif bawaan browser tanpa styling ulang penuh. Semua elemen berikut WAJIB dibangun ulang sebagai custom component yang mengikuti design token proyek (warna, radius, spacing, typography, dark/light mode):

| Elemen Native (DILARANG apa adanya) | Wajib Diganti Dengan |
|---|---|
| `<input type="date" />`, `<input type="datetime-local" />` | Custom date picker / calendar popover buatan sendiri |
| `<select>` / `<option>` | Custom dropdown/select (listbox) dengan animasi & styling sendiri |
| `<input type="checkbox" />` polos | Custom checkbox (ikon check custom, radius, warna sesuai tema) |
| `<input type="radio" />` polos | Custom radio button bertema |
| `<input type="range" />` | Custom slider |
| `<input type="file" />` polos | Custom dropzone/upload area |
| `alert()`, `confirm()`, `prompt()` | Custom modal/dialog/toast |
| `<select multiple>` | Custom multi-select dengan chips/tags |
| Tooltip bawaan (`title="..."`) | Custom tooltip component |
| Scrollbar default browser | Custom-styled scrollbar (tetap ikuti tema) |
| `<input type="time" />` | Custom time picker |
| `<input type="color" />` | Custom color swatch picker (jika relevan) |

**Pengecualian yang DIIZINKAN tetap native:**
- `<input type="text" />`, `<input type="password" />`, `<textarea>` — boleh native asal sudah di-restyle total (border, radius, focus-ring, background) mengikuti token desain. Karena elemen ini tidak punya "chrome" browser yang mengganggu (beda dengan calendar/dropdown popup native).

---

## 2. KENAPA ATURAN INI ADA

- Elemen native seperti calendar picker dan dropdown menggunakan **UI rendering milik OS/browser**, bukan CSS proyek — sehingga TIDAK BISA di-theme, muncul beda di tiap browser/device, dan merusak konsistensi visual dark/light mode.
- Ini adalah pelanggaran serius terhadap `AI_DESIGN_SYSTEM.md` meskipun secara fungsional "jalan".

---

## 3. INSTRUKSI TEKNIS UNTUK AI

Saat membangun komponen interaktif apa pun:

1. **Cek dulu**: apakah elemen ini punya native browser chrome (popup, kalender, dropdown list)? Jika ya → wajib custom build.
2. **Gunakan headless/unstyled primitives** atau custom component buatan sendiri, lalu styling 100% mengikuti design token proyek ini.
3. **Semua state visual wajib ikut token desain proyek**: warna primary/secondary, radius, shadow, dark/light mode, animasi transisi (bukan snap instan).
4. **Aksesibilitas tidak boleh dikorbankan**: custom component tetap harus keyboard-navigable dan punya aria-label yang benar.
5. **Sebelum submit/selesai task**, AI wajib self-check: "Apakah ada elemen di UI ini yang masih render native browser chrome (popup kalender OS, dropdown list OS)?" Jika ya → perbaiki sebelum dianggap selesai.
