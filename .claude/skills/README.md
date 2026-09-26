# Skill desain untuk Claude Code

Dipakai saat mengerjakan tampilan Zusantara Core (kit UI `zusantara/ui`, halaman template, situs dokumentasi).

| Folder | Skill | Kapan dipakai |
|---|---|---|
| `taste/` | `design-taste-frontend` | Halaman marketing, landing, dan situs dokumentasi. Aturan anti-"AI slop" dan *pre-flight check*-nya berlaku untuk semua tampilan. |
| `redesign-existing-projects/` | `redesign-existing-projects` | Meningkatkan tampilan yang sudah ada (kit UI, halaman login, dasbor, admin): audit dulu, lalu perbaiki tanpa merusak fungsi. |

Sumber: https://github.com/Leonxlnx/taste-skill (commit `c184364`), lisensi MIT (lihat `LICENSE` di tiap folder). Disalin apa adanya; perbarui dengan menyalin ulang dari repo tersebut.

Aturan tambahan Zusantara Core yang menang atas skill:
- Brand tetap: Zusantara Teal `#2ED3B7` sebagai satu-satunya aksen UI, Heritage Gold hanya untuk logo/motif, font Plus Jakarta Sans (pedoman brand).
- Kit UI adalah HTML server-side tanpa framework frontend, jadi saran React/Tailwind/Motion di skill diterjemahkan ke CSS murni.
