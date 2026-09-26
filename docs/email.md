---
title: Email
order: 2
group: Back-End
description: Kirim email lewat SMTP dengan sendMail(), dicetak ke log saat pengembangan dan dikumpulkan saat test.
---

# Email

```ts
import { sendMail } from "zusantara";

await sendMail({
  to: "sari@mail.id",
  subject: "Pesanan Anda diterima",
  text: "Terima kasih, pesanan #1042 sedang kami proses.",
  html: "<p>Terima kasih, pesanan <b>#1042</b> sedang kami proses.</p>",
});
```

Pilihan lain: `from`, `cc`, `bcc`, `replyTo`, `headers`, dan `attachments` (`{ filename, content, contentType }`). Subjek dan nama dengan huruf non-ASCII dikodekan otomatis.

Kirim email dari [job](jobs.html), bukan langsung dari route. Pengguna tidak perlu menunggu server email, dan email yang gagal dicoba lagi.

## Pengaturan

Tujuan pengiriman diatur dengan env `MAIL_URL`, dan alamat pengirim dengan `MAIL_FROM` atau `mail.from` di config:

```bash
# .env
MAIL_URL=smtp://user:password@smtp.example.com:587   # STARTTLS bila server mendukung
# MAIL_URL=smtps://user:password@smtp.example.com:465 # TLS langsung
MAIL_FROM="Aplikasi Sari <halo@sari.id>"
```

```js
// zusantara.config.mjs
export default {
  mail: { from: "Aplikasi Sari <halo@sari.id>" }, // env MAIL_URL / MAIL_FROM menimpa nilai ini
};
```

Karakter khusus di user atau password harus di-encode untuk URL, mis. `@` menjadi `%40`.

| Kondisi | Yang terjadi |
|---|---|
| `MAIL_URL` berisi `smtp://` atau `smtps://` | email dikirim lewat SMTP |
| pengembangan tanpa `MAIL_URL` | email dicetak ke log dan disimpan di `.zusantara/mail/*.eml` |
| `NODE_ENV=test` | email dikumpulkan di `outbox` |
| produksi tanpa `MAIL_URL` | `sendMail()` melempar error, jadi email tidak hilang diam-diam |

## Menguji email

```ts
import { outbox } from "zusantara";

await jobs.drain();
const mail = outbox.find((m) => m.to.includes("sari@mail.id"));
assert.match(mail!.subject, /Selamat datang/);
```

Setiap email di `outbox` berisi `from`, `to`, `subject`, `text`, `html`, dan `raw` (pesan lengkap). Kosongkan dengan `outbox.length = 0` di antara test bila perlu.
