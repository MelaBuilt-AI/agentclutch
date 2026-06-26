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

  it("does not expose the full email body in the Action Card raw payload", async () => {
    const result = await runPromptGuardSendEmailExample();
    const raw = result.card.proposed_action.raw;

    expect(raw).toMatchObject({
      to: ["client@example.com"],
      cc: ["account-team@example.com"],
      subject: "Next steps from today",
      bodyPreview: expect.stringContaining("Thanks for the call today")
    });
    expect(raw).not.toHaveProperty("body");
    expect(JSON.stringify(result.card)).not.toContain("Best,\\nAlex");
    expect(result.sentEmail?.body).toContain("Best,\nAlex");
  });
});
