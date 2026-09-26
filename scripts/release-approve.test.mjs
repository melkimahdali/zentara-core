import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStagedIds, supportsStage } from "./release-approve.mjs";

describe("release-approve", () => {
  it("membaca ID dari anotasi baru", () => {
    const text = [
      "zusantara@0.6.3 stage-id=909e6d9c-ce57-450f-b3ab-8dd4117923eb",
      "create-zusantara@0.6.3 stage-id=9c2fd820-b3db-42a2-8a87-9f816fb50eb6",
      "The ubuntu-latest label will migrate",
    ].join("\n");
    assert.deepEqual(parseStagedIds(text), [
      { name: "zusantara", version: "0.6.3", id: "909e6d9c-ce57-450f-b3ab-8dd4117923eb" },
      { name: "create-zusantara", version: "0.6.3", id: "9c2fd820-b3db-42a2-8a87-9f816fb50eb6" },
    ]);
  });

  it("membaca ID dari log run lama", () => {
    const log = "2026-09-24T05:14:16.5592601Z + zusantara@0.6.2 (staged with id 909e6d9c-ce57-450f-b3ab-8dd4117923eb)\n" +
      "2026-09-24T05:14:21.4074814Z + create-zusantara@0.6.2 (staged with id 9c2fd820-b3db-42a2-8a87-9f816fb50eb6)";
    assert.deepEqual(parseStagedIds(log).map((s) => `${s.name}@${s.version}=${s.id.slice(0, 8)}`), [
      "zusantara@0.6.2=909e6d9c",
      "create-zusantara@0.6.2=9c2fd820",
    ]);
  });

  it("tanpa ID -> kosong; versi npm yang mendukung stage", () => {
    assert.deepEqual(parseStagedIds("tidak ada apa-apa"), []);
    assert.equal(supportsStage("11.7.0"), false);
    assert.equal(supportsStage("11.16.0"), true);
    assert.equal(supportsStage("11.20.0"), true);
    assert.equal(supportsStage("12.1.0"), true);
  });
});
