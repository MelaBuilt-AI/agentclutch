import { access } from "node:fs/promises";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { runToolWrapperFileDeleteExample } from "../src/index.js";

describe("tool-wrapper-file-delete runnable example", () => {
  it("creates a temp file and deletes it only after approve_once", async () => {
    const result = await runToolWrapperFileDeleteExample();

    expect(result.card.proposed_action.kind).toBe("file.delete");
    expect(result.card.consequence.class).toBe("local_file_delete");
    expect(result.deleteResult?.deleted).toBe(true);
    await expect(access(result.filePath)).rejects.toThrow();
  });

  it("keeps deletion inside the generated temp workspace and removes it afterward", async () => {
    const result = await runToolWrapperFileDeleteExample();
    const tempDir = dirname(result.filePath);

    expect(result.deleteResult?.path.startsWith(`${tempDir}/`)).toBe(true);
    expect(result.card.proposed_action.changed_fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "relativePath",
          after: "tmp/stale-report.csv",
        }),
      ]),
    );
    await expect(access(tempDir)).rejects.toThrow();
  });
});
