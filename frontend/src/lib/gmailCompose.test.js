import { gmailComposeUrl, OFFICIAL_GMAIL } from "./gmailCompose";

describe("gmailComposeUrl", () => {
  test("builds a URL with the official authuser and encoded fields", () => {
    const url = gmailComposeUrl({ to: "customer@example.com", subject: "Re: Your enquiry (order #42)" });
    expect(url).toBeTruthy();
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://mail.google.com/mail/");
    expect(u.searchParams.get("view")).toBe("cm");
    expect(u.searchParams.get("authuser")).toBe(OFFICIAL_GMAIL);
    expect(u.searchParams.get("to")).toBe("customer@example.com");
    expect(u.searchParams.get("su")).toBe("Re: Your enquiry (order #42)");
  });

  test("does not use mailto:", () => {
    const url = gmailComposeUrl({ to: "x@y.com", subject: "hi" });
    expect(url.startsWith("mailto:")).toBe(false);
    expect(url.startsWith("https://mail.google.com/")).toBe(true);
  });

  test("returns null for missing/invalid recipients", () => {
    expect(gmailComposeUrl({ to: "" })).toBeNull();
    expect(gmailComposeUrl({ to: "not-an-email" })).toBeNull();
    expect(gmailComposeUrl({})).toBeNull();
  });

  test("safely encodes special characters", () => {
    const url = gmailComposeUrl({ to: "x@y.com", subject: "50% off & more #now" });
    expect(url).toContain("su=50%25+off+%26+more+%23now");
  });
});
