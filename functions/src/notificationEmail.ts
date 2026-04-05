// functions/src/notificationEmail.ts
// Firebase Cloud Function — Send email + SMS when a notification is created

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// ⚠️  DO NOT call admin.initializeApp() here — index.ts does it.
// ⚠️  DO NOT call admin.firestore() at the top level either.
//     When index.ts does `export { ... } from "./notificationEmail"`,
//     this file is loaded BEFORE initializeApp() runs, so a top-level
//     `const db = admin.firestore()` would crash.

// ── Helper: get Firestore lazily ─────────────────────────────────────
const getDb = () => admin.firestore();

// ============ SMTP CONFIG ============

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const smtpFrom =
  process.env.SMTP_FROM ||
  "\"Care Construction\" <noreply@caregeneralconstruction.com>";
const portalUrl =
  process.env.PORTAL_URL || "https://your-portal-url.vercel.app";

// ============ TWILIO CONFIG ============

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  enabled: process.env.TWILIO_ENABLED === "true",
});

// ============ TWILIO SMS HELPER ============

/**
 * Send an SMS via Twilio REST API (native fetch, no SDK).
 * Returns the message SID on success, null on failure.
 */
const sendTwilioSMS = async (
  to: string,
  body: string
): Promise<string | null> => {
  const config = getTwilioConfig();

  if (!config.enabled) {
    console.log("Twilio disabled — skipping SMS");
    return null;
  }

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    console.error("Twilio config incomplete:", {
      hasSid: !!config.accountSid,
      hasToken: !!config.authToken,
      hasPhone: !!config.phoneNumber,
    });
    return null;
  }

  // Validate E.164 format
  if (!to.match(/^\+[1-9]\d{6,14}$/)) {
    console.error("Invalid phone number format:", to);
    return null;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " +
          Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
            "base64"
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: config.phoneNumber,
        Body: body,
      }).toString(),
    });

    const result = (await response.json()) as any;

    if (!response.ok) {
      console.error("Twilio API error:", JSON.stringify(result));
      return null;
    }

    console.log(`✅ SMS sent to ${to} — SID: ${result.sid}`);
    return result.sid;
  } catch (error: any) {
    console.error("Error sending SMS:", error.message);
    return null;
  }
};

// ============ QUIET HOURS CHECK ============

/**
 * Returns true if current time is within the user's quiet hours window.
 */
const isQuietHours = (quietHours?: {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone?: string;
}): boolean => {
  if (!quietHours?.enabled) return false;

  const now = new Date();
  const currentHour = now.getHours(); // Server timezone — for production use timezone-aware logic
  const {startHour, endHour} = quietHours;

  if (startHour > endHour) {
    // Overnight window (e.g. 22:00 – 07:00)
    return currentHour >= startHour || currentHour < endHour;
  }
  // Same-day window (e.g. 08:00 – 17:00)
  return currentHour >= startHour && currentHour < endHour;
};

// ============ CATEGORY COLORS ============

const CATEGORY_COLORS: Record<string, string> = {
  PROJECT: "#F15A2B",
  project: "#F15A2B",
  MESSAGE: "#3B82F6",
  message: "#3B82F6",
  INVOICE: "#10B981",
  invoice: "#10B981",
  MILESTONE: "#8B5CF6",
  milestone: "#8B5CF6",
  DOCUMENT: "#F59E0B",
  document: "#F59E0B",
  CALENDAR: "#14B8A6",
  calendar: "#14B8A6",
  SYSTEM: "#6B7280",
  system: "#6B7280",
};

// ============ EMAIL TEMPLATE ============

const buildEmailHtml = (data: {
  title: string;
  message: string;
  category: string;
  senderName?: string;
  recipientName?: string;
  ctaUrl?: string;
}) => {
  const color = CATEGORY_COLORS[data.category] || "#F15A2B";
  const categoryLabel = data.category.replace("_", " ").toUpperCase();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f9fafb; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#050816; padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#F15A2B; font-size:20px; font-weight:800; letter-spacing:-0.5px;">CAREGENCON</span>
                    <span style="color:rgba(255,255,255,0.5); font-size:12px; margin-left:8px;">Operations</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category pill -->
          <tr>
            <td style="padding:24px 32px 0;">
              <span style="display:inline-block; padding:4px 12px; border-radius:999px; background-color:${color}15; color:${color}; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                ${categoryLabel}
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:16px 32px 24px;">
              ${data.recipientName ? `<p style="margin:0 0 4px; color:#9ca3af; font-size:13px;">Hi ${data.recipientName},</p>` : ""}
              <h2 style="margin:0 0 8px; color:#111827; font-size:18px; font-weight:700;">${data.title}</h2>
              <p style="margin:0 0 16px; color:#6b7280; font-size:14px; line-height:1.6;">${data.message}</p>
              ${data.senderName ? `<p style="margin:0 0 16px; color:#9ca3af; font-size:12px;">&mdash; ${data.senderName}</p>` : ""}
              
              ${
  data.ctaUrl
    ? `<a href="${data.ctaUrl}" style="display:inline-block; padding:10px 24px; background-color:#F15A2B; color:#ffffff; font-size:13px; font-weight:600; text-decoration:none; border-radius:10px;">View in Portal →</a>`
    : ""
}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f3f4f6;">
              <p style="margin:0; color:#d1d5db; font-size:11px; text-align:center;">
                Care General Construction &middot; You received this because you have notifications enabled.
                <br />
                <a href="${portalUrl}/settings" style="color:#F15A2B; text-decoration:none;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ============ MAIN TRIGGER: EMAIL + SMS ============

/**
 * Triggered when a new notification document is created.
 * 1. Looks up the recipient
 * 2. Sends email (if enabled and not in quiet hours / digest mode)
 * 3. Sends SMS (if enabled, phone on file, and category qualifies)
 * 4. Marks isEmailSent / isSmsSent on the notification doc
 */
export const sendNotificationEmail = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const db = getDb();
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    if (!notification || !notification.recipientId) {
      console.error("Notification missing recipientId:", notificationId);
      return;
    }

    try {
      // ── 1. Look up recipient (single read for both email + SMS) ──
      const recipientDoc = await db
        .collection("users")
        .doc(notification.recipientId)
        .get();

      if (!recipientDoc.exists) {
        console.log(
          `Recipient ${notification.recipientId} not found — skipping.`
        );
        return;
      }

      const recipient = recipientDoc.data()!;
      const recipientEmail = recipient.email;
      const recipientName = recipient.name || "there";
      const recipientPhone = recipient.phone || recipient.phoneNumber || null;
      const category = notification.category || "SYSTEM";

      // Build portal link (shared by email CTA and potential SMS link)
      let ctaUrl = portalUrl;
      if (notification.link?.view) {
        ctaUrl = `${portalUrl}?view=${notification.link.view}`;
        if (notification.link.entityId) {
          ctaUrl += `&id=${notification.link.entityId}`;
        }
      }

      // Track what we sent
      const updateFields: Record<string, any> = {};

      // ── 2. EMAIL ──────────────────────────────────────────────────
      const emailPrefs = recipient.emailNotificationPreferences || {
        enabled: true,
        categories: {},
        digestMode: "instant",
      };

      let emailSent = false;

      const shouldSendEmail =
        emailPrefs.enabled !== false &&
        emailPrefs.categories?.[category] !== false &&
        emailPrefs.digestMode !== "daily" &&
        !isQuietHours(emailPrefs.quietHours) &&
        !!recipientEmail;

      if (shouldSendEmail) {
        try {
          const htmlContent = buildEmailHtml({
            title: notification.title,
            message: notification.message,
            category,
            senderName: notification.senderName,
            recipientName,
            ctaUrl,
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: recipientEmail,
            subject: `${notification.title} — Care Construction`,
            html: htmlContent,
          });

          emailSent = true;
          updateFields.isEmailSent = true;
          console.log(
            `✅ Email sent to ${recipientEmail} for ${notificationId}`
          );
        } catch (emailError) {
          console.error(
            `❌ Email failed for ${notificationId}:`,
            emailError
          );
        }
      } else {
        console.log(
          `Skipping email for ${notificationId} — ` +
          `enabled:${emailPrefs.enabled}, cat:${category}, ` +
          `digest:${emailPrefs.digestMode}, hasEmail:${!!recipientEmail}`
        );
      }

      // ── 3. SMS ────────────────────────────────────────────────────
      const smsPrefs = recipient.smsNotificationPreferences || {
        enabled: false, // Opt-in by default
        categories: {},
      };

      // Categories that warrant an SMS (keep SMS for important stuff)
      const smsCategoryWhitelist = [
        "INVOICE", "PROJECT", "MILESTONE", "CALENDAR", "SYSTEM",
      ];
      // Priorities that always get SMS regardless of category
      const smsAlwaysPriorities = ["high", "urgent"];

      const categoryQualifies =
        smsCategoryWhitelist.includes(category.toUpperCase()) ||
        smsAlwaysPriorities.includes(notification.priority);

      const shouldSendSMS =
        smsPrefs.enabled === true &&
        smsPrefs.categories?.[category] !== false &&
        categoryQualifies &&
        !isQuietHours(smsPrefs.quietHours) &&
        !!recipientPhone;

      if (shouldSendSMS) {
        // Build SMS body — keep concise (160 char segments)
        const smsBody = `Care Construction: ${notification.title}\n${notification.message}`.slice(
          0,
          320
        );

        const sid = await sendTwilioSMS(recipientPhone, smsBody);

        if (sid) {
          updateFields.isSmsSent = true;
          updateFields.smsSid = sid;
          console.log(
            `✅ SMS sent to ${recipientPhone} for ${notificationId}`
          );
        }
      } else {
        console.log(
          `Skipping SMS for ${notificationId} — ` +
          `enabled:${smsPrefs.enabled}, cat:${category}, ` +
          `qualifies:${categoryQualifies}, hasPhone:${!!recipientPhone}`
        );
      }

      // ── 4. Update notification doc ────────────────────────────────
      if (Object.keys(updateFields).length > 0) {
        await snap.ref.update(updateFields);
      }
    } catch (error) {
      console.error(
        `❌ Notification handler failed for ${notificationId}:`,
        error
      );
    }
  });

// ============ DAILY DIGEST (Email + SMS summary) ============

export const sendDailyDigest = functions.pubsub
  .schedule("every day 08:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = getDb();

    try {
      // Get all users with daily digest enabled
      const usersSnapshot = await db
        .collection("users")
        .where("emailNotificationPreferences.digestMode", "==", "daily")
        .where("emailNotificationPreferences.enabled", "==", true)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (!userData.email) continue;

        // Get unread, un-emailed notifications from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const notificationsSnapshot = await db
          .collection("notifications")
          .where("recipientId", "==", userDoc.id)
          .where("isEmailSent", "==", false)
          .where("createdAt", ">=", yesterday.toISOString())
          .orderBy("createdAt", "desc")
          .get();

        if (notificationsSnapshot.empty) continue;

        const notifications = notificationsSnapshot.docs.map((d) => d.data());

        // ── Build digest email ──
        const notificationList = notifications
          .map(
            (n) =>
              `<li style="margin-bottom:8px;">` +
              `<strong>${n.title}</strong><br/>` +
              `<span style="color:#6b7280;">${n.message}</span></li>`
          )
          .join("");

        const digestHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#050816; padding:24px 32px;">
          <span style="color:#F15A2B; font-size:20px; font-weight:800;">CAREGENCON</span>
          <span style="color:rgba(255,255,255,0.5); font-size:12px; margin-left:8px;">Daily Digest</span>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 8px; color:#9ca3af; font-size:13px;">Hi ${userData.name},</p>
          <h2 style="margin:0 0 16px; color:#111827; font-size:18px; font-weight:700;">
            You have ${notifications.length} notification${notifications.length > 1 ? "s" : ""} from yesterday
          </h2>
          <ul style="padding-left:16px; color:#374151; font-size:13px; line-height:1.6;">
            ${notificationList}
          </ul>
          <a href="${portalUrl}" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#F15A2B; color:#fff; font-size:13px; font-weight:600; text-decoration:none; border-radius:10px;">Open Portal →</a>
        </td></tr>
        <tr><td style="padding:16px 32px; border-top:1px solid #f3f4f6;">
          <p style="margin:0; color:#d1d5db; font-size:11px; text-align:center;">
            <a href="${portalUrl}/settings" style="color:#F15A2B; text-decoration:none;">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        // Send digest email
        await transporter.sendMail({
          from: smtpFrom,
          to: userData.email,
          subject:
            `Daily Update: ${notifications.length} new notification` +
            `${notifications.length > 1 ? "s" : ""} — Care Construction`,
          html: digestHtml,
        });

        // ── Optional: Send SMS digest summary ──
        const smsPrefs = userData.smsNotificationPreferences;
        const userPhone = userData.phone || userData.phoneNumber;

        if (smsPrefs?.enabled && userPhone) {
          const smsDigest =
            `Care Construction Daily Digest: You have ${notifications.length} ` +
            `new notification${notifications.length > 1 ? "s" : ""}. ` +
            `Open your portal to review.`;

          await sendTwilioSMS(userPhone, smsDigest);
        }

        // Mark all as emailed
        const batch = db.batch();
        notificationsSnapshot.docs.forEach((d) => {
          batch.update(d.ref, {isEmailSent: true});
        });
        await batch.commit();

        console.log(
          `✅ Daily digest sent to ${userData.email} ` +
          `(${notifications.length} items)`
        );
      }
    } catch (error) {
      console.error("❌ Daily digest error:", error);
    }
  });