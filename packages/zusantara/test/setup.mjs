// Dimuat sebelum semua test (lihat script "test" di package.json): test tidak boleh terpengaruh
// preferensi bahasa global developer (~/.zusantara/settings.json) atau env ZUSANTARA_LANG.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.ZUSANTARA_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-home-"));
delete process.env.ZUSANTARA_LANG;
delete process.env.ZENTARA_LANG;
