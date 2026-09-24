/** Batas sel tabel LCS (baris lama × baris baru yang berbeda). Di atas ini, bagian tengah ditampilkan utuh. */
const MAX_CELLS = 4_000_000;

type Op = { kind: " " | "-" | "+"; text: string; oldNo: number; newNo: number };

/**
 * Diff per baris dalam format unified (`@@ -a,b +c,d @@`, lalu baris ` `, `-`, `+`) dengan `context`
 * baris konteks di sekitar setiap perubahan. Awalan & akhiran yang sama dipangkas dulu, jadi perubahan
 * kecil di file besar tetap cepat.
 */
export function unifiedDiff(before: string, after: string, context = 3): string {
  const a = before.split("\n");
  const b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const ops: Op[] = [];
  for (let i = 0; i < start; i++) ops.push({ kind: " ", text: a[i]!, oldNo: i + 1, newNo: i + 1 });
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  for (const op of diffMiddle(midA, midB)) {
    ops.push({
      kind: op.kind,
      text: op.text,
      oldNo: start + op.i + 1,
      newNo: start + op.j + 1,
    });
  }
  for (let i = endA, j = endB; i < a.length; i++, j++) ops.push({ kind: " ", text: a[i]!, oldNo: i + 1, newNo: j + 1 });

  return hunks(ops, context).join("\n");
}

/** Operasi diff untuk bagian tengah; i/j = indeks baris lama/baru (posisi sebelum baris ini). */
function diffMiddle(a: string[], b: string[]): { kind: Op["kind"]; text: string; i: number; j: number }[] {
  const out: { kind: Op["kind"]; text: string; i: number; j: number }[] = [];
  if (a.length * b.length > MAX_CELLS) {
    a.forEach((text, i) => out.push({ kind: "-", text, i, j: 0 }));
    b.forEach((text, j) => out.push({ kind: "+", text, i: a.length, j }));
    return out;
  }
  // Panjang LCS dari akhir: lcs[i][j] untuk a[i..], b[j..].
  const w = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * w + j] = a[i] === b[j] ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: " ", text: a[i]!, i, j });
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!)) {
      out.push({ kind: "-", text: a[i]!, i, j });
      i++;
    } else {
      out.push({ kind: "+", text: b[j]!, i, j });
      j++;
    }
  }
  return out;
}

function hunks(ops: Op[], context: number): string[] {
  const changed = ops.map((op, k) => (op.kind === " " ? -1 : k)).filter((k) => k >= 0);
  if (changed.length === 0) return [];
  const out: string[] = [];
  let k = 0;
  while (k < changed.length) {
    const from = Math.max(0, changed[k]! - context);
    let to = Math.min(ops.length - 1, changed[k]! + context);
    // Gabungkan perubahan yang berdekatan ke dalam satu hunk.
    while (k + 1 < changed.length && changed[k + 1]! - context <= to + 1) {
      k++;
      to = Math.min(ops.length - 1, changed[k]! + context);
    }
    k++;
    const slice = ops.slice(from, to + 1);
    const oldCount = slice.filter((o) => o.kind !== "+").length;
    const newCount = slice.filter((o) => o.kind !== "-").length;
    const first = slice[0]!;
    const oldStart = oldCount ? first.oldNo : first.oldNo - 1;
    const newStart = newCount ? first.newNo : first.newNo - 1;
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    for (const op of slice) out.push(`${op.kind}${op.text}`);
  }
  return out;
}
