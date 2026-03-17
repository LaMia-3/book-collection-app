const RESEND_API_URL = "https://api.resend.com/emails";

const getPasswordResetFromEmail = (): string => {
  const value = process.env.PASSWORD_RESET_FROM_EMAIL?.trim();

  if (!value) {
    throw new Error("Missing PASSWORD_RESET_FROM_EMAIL environment variable.");
  }

  return value;
};

const getResendApiKey = (): string => {
  const value = process.env.RESEND_API_KEY?.trim();

  if (!value) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return value;
};

export const sendPasswordResetEmail = async ({
  email,
  expiresAt,
  otp,
  preferredName,
}: {
  email: string;
  expiresAt: Date;
  otp: string;
  preferredName?: string;
}): Promise<void> => {
  const recipientName = preferredName?.trim() || "there";
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getPasswordResetFromEmail(),
      to: [email],
      subject: "Your Book Collection App reset code",
      text: [
        `Hi ${recipientName},`,
        "",
        "We received a request to reset your password for Book Collection App.",
        `Your one-time reset code is: ${otp}`,
        "",
        `This code expires at ${expiresAt.toUTCString()} and can only be used once.`,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <p>Hi ${recipientName},</p>
          <p>We received a request to reset your password for Book Collection App.</p>
          <p>
            Use this one-time code to reset your password:
          </p>
          <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.3em;">${otp}</p>
          <p>This code expires at ${expiresAt.toUTCString()} and can only be used once.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Password reset email delivery failed: ${response.status} ${responseBody}`,
    );
  }
};
