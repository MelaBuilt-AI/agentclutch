import { describe, expect, it } from "vitest";
import { runPromptGuardSendEmailExample } from "../src/index.js";

describe("prompt-guard-send-email runnable example", () => {
  it("shows recipient/body preview before simulating an approved send", async () => {
    const result = await runPromptGuardSendEmailExample();

    expect(result.card.proposed_action.kind).toBe("email.send");
    expect(result.card.consequence.class).toBe("external_message_send");
    expect(result.sentEmail?.to).toEqual(["client@example.com"]);
    expect(result.sentEmail?.body).toContain("next steps");
    expect(result.recorderEvents).toHaveLength(4);
  });
});
