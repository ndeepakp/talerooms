import { afterEach, describe, expect, it, vi } from "vitest";
import { sendVerificationCode } from "./verification-email";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("verification delivery",()=>{
  it("fails closed when delivery is unconfigured",async()=>{
    vi.stubEnv("AUTH_EMAIL_MODE","");vi.stubEnv("RESEND_API_KEY","");vi.stubEnv("AUTH_EMAIL_FROM","");
    await expect(sendVerificationCode({email:"reader@example.test",otp:"123456"})).rejects.toThrow("not configured");
  });
  it("never enables the local test sink in production",async()=>{
    vi.stubEnv("NODE_ENV","production");vi.stubEnv("AUTH_EMAIL_MODE","local-test");vi.stubEnv("RESEND_API_KEY","");vi.stubEnv("AUTH_EMAIL_FROM","");
    await expect(sendVerificationCode({email:"reader@example.test",otp:"123456"})).rejects.toThrow("not configured");
  });
  it("rejects real recipients in the local test sink",async()=>{
    vi.stubEnv("NODE_ENV","test");vi.stubEnv("AUTH_EMAIL_MODE","local-test");
    await expect(sendVerificationCode({email:"someone@example.com",otp:"123456"})).rejects.toThrow("example.test");
  });
  it("sends a transactional message and surfaces provider failure safely",async()=>{
    vi.stubEnv("AUTH_EMAIL_MODE","");vi.stubEnv("RESEND_API_KEY","test-key");vi.stubEnv("AUTH_EMAIL_FROM","Talerooms <verify@example.test>");
    const fetcher=vi.fn().mockResolvedValue({ok:false});vi.stubGlobal("fetch",fetcher);
    await expect(sendVerificationCode({email:"reader@example.test",otp:"123456"})).rejects.toThrow("delivery failed");
    expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails",expect.objectContaining({method:"POST"}));
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({to:["reader@example.test"],subject:"Your Talerooms verification code"});
  });
});
