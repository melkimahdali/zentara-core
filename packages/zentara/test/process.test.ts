import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { platformCommand, quoteWindowsArg } from "../src/process.js";

describe("platformCommand", () => {
  it("Linux/macOS: tidak berubah dan tanpa shell", () => {
    assert.deepEqual(platformCommand("npm", ["run", "test"], "linux"), { command: "npm", args: ["run", "test"], shell: false });
  });

  it("Windows: npm lewat shell dengan argumen berspasi dikutip", () => {
    const cmd = platformCommand("npm", ["install", "-D", "C:\\Users\\Budi Santoso\\paket.tgz"], "win32");
    assert.deepEqual(cmd, { command: 'npm install -D "C:\\Users\\Budi Santoso\\paket.tgz"', args: [], shell: true });
  });

  it("Windows: program dengan path absolut (node.exe) tanpa shell", () => {
    const node = "C:\\Program Files\\nodejs\\node.exe";
    assert.deepEqual(platformCommand(node, ["cli.js", "routes"], "win32"), { command: node, args: ["cli.js", "routes"], shell: false });
  });

  it("mengutip argumen kosong dan tanda kutip", () => {
    assert.equal(quoteWindowsArg(""), '""');
    assert.equal(quoteWindowsArg('a"b'), '"a""b"');
    assert.equal(quoteWindowsArg("run"), "run");
    assert.equal(quoteWindowsArg("file:C:\\x\\a.tgz"), "file:C:\\x\\a.tgz");
  });
});
