// Dimuat sebelum semua test (lihat script "test" di package.json): test tidak boleh terpengaruh
// preferensi bahasa global developer (~/.zentara/settings.json) atau env ZENTARA_LANG.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.ZENTARA_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-home-"));
delete process.env.ZENTARA_LANG;
