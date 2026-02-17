// functions/src/notificationEmail.ts
// Firebase Cloud Function — Send email when a notification is created
//
// Setup:
//   1. cd functions && npm install nodemailer @types/nodemailer
//   2. Add to functions/.env (same file as your Square keys):
//        SMTP_HOST=smtp.gmail.com
//        SMTP_PORT=587
//        SMTP_USER=your-email@gmail.com
//        SMTP_PASS=your-app-password
//        SMTP_FROM=Care Construction <noreply@caregeneralconstruction.com>
//        PORTAL_URL=https://your-portal-url.vercel.app
//
//   3. Add ONE export to the BOTTOM of functions/src/index.ts:
//        export { sendNotificationEmail, sendDailyDigest } from "./notificationEmail";
//
//   4. Deploy: firebase deploy --only functions

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// ⚠️  DO NOT call admin.initializeApp() here — index.ts does it.
//
// ⚠️  DO NOT call admin.firestore() at the top level either.
//     When index.ts does `export { ... } from "./notificationEmail"`,
//     this file is loaded BEFORE initializeApp() runs, so a top-level
//     `const db = admin.firestore()` would crash. Instead, we call it
//     lazily inside each function body.

// ── Helper: get Firestore lazily ─────────────────────────────────────
const getDb = () => admin.firestore();

// ── SMTP transporter (reads from functions/.env) ─────────────────────
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

// ── Category color mapping for email template ────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  project: "#F15A2B",
  message: "#3B82F6",
  invoice: "#10B981",
  milestone: "#8B5CF6",
  document: "#F59E0B",
  calendar: "#14B8A6",
  system: "#6B7280",
};

// ── Email HTML template ─────────────────────────────────────────────
const buildEmailHtml = (data: {
  title: string;
  message: string;
  category: string;
  senderName?: string;
  recipientName?: string;
  ctaUrl?: string;
}) => {
  const color = CATEGORY_COLORS[data.category] || "#F15A2B";
  const categoryLabel =
    data.category.charAt(0).toUpperCase() + data.category.slice(1);

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
    ? `<a href="${data.ctaUrl}" style="display:inline-block; padding:10px 24px; background-color:#F15A2B; color:#ffffff; font-size:13px; font-weight:600; text-decoration:none; border-radius:10px;">View in Portal</a>`
    : ""
}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px; border-top:1px solid #f3f4f6;">
              <p style="margin:0; color:#d1d5db; font-size:11px; text-align:center;">
                Care General Construction &middot; You received this because you have email notifications enabled.
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

// ── Cloud Function: Firestore onCreate trigger ──────────────────────
export const sendNotificationEmail = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const db = getDb(); // ← lazy load after initializeApp has run
    const notification = snap.data();
    const notificationId = context.params.notificationId;

    try {
      // 1. Get the recipient's user doc
      const recipientDoc = await db
        .collection("users")
        .doc(notification.recipientId)
        .get();

      if (!recipientDoc.exists) {
        console.log(
          `Recipient ${notification.recipientId} not found, skipping email.`
        );
        return;
      }

      const recipient = recipientDoc.data()!;
      const recipientEmail = recipient.email;
      const recipientName = recipient.name;

      if (!recipientEmail) {
        console.log(
          `Recipient ${notification.recipientId} has no email, skipping.`
        );
        return;
      }

      // 2. Check email preferences
      const prefs = recipient.emailNotificationPreferences || {
        enabled: true,
        categories: {},
        digestMode: "instant",
      };

      // Skip if email notifications are disabled
      if (prefs.enabled === false) {
        console.log(
          `Email notifications disabled for ${recipientEmail}, skipping.`
        );
        return;
      }

      // Skip if this category is disabled
      const category = notification.category || "system";
      if (prefs.categories && prefs.categories[category] === false) {
        console.log(
          `Category "${category}" disabled for ${recipientEmail}, skipping.`
        );
        return;
      }

      // Skip if digest mode is "daily" (handled by sendDailyDigest)
      if (prefs.digestMode === "daily") {
        console.log(
          `Digest mode for ${recipientEmail}, deferring to daily email.`
        );
        return;
      }

      // 3. Check quiet hours
      if (prefs.quietHours?.enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const {startHour, endHour} = prefs.quietHours;

        if (startHour > endHour) {
          // Overnight (e.g. 22:00 - 07:00)
          if (currentHour >= startHour || currentHour < endHour) {
            console.log(
              `Quiet hours active for ${recipientEmail}, skipping.`
            );
            return;
          }
        } else {
          if (currentHour >= startHour && currentHour < endHour) {
            console.log(
              `Quiet hours active for ${recipientEmail}, skipping.`
            );
            return;
          }
        }
      }

      // 4. Build the portal URL for the CTA button
      let ctaUrl = portalUrl;
      if (notification.link?.view) {
        ctaUrl = `${portalUrl}?view=${notification.link.view}`;
        if (notification.link.entityId) {
          ctaUrl += `&id=${notification.link.entityId}`;
        }
      }

      // 5. Send the email
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

      console.log(
        `✅ Email sent to ${recipientEmail} for notification ${notificationId}`
      );

      // 6. Mark the notification as email-sent
      await snap.ref.update({isEmailSent: true});
    } catch (error) {
      console.error(
        `❌ Failed to send email for notification ${notificationId}:`,
        error
      );
    }
  });

// ── Optional: Daily digest scheduled function ───────────────────────
export const sendDailyDigest = functions.pubsub
  .schedule("every day 08:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    const db = getDb(); // ← lazy load after initializeApp has run

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

        // Build digest email
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
          <a href="${portalUrl}" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#F15A2B; color:#fff; font-size:13px; font-weight:600; text-decoration:none; border-radius:10px;">Open Portal</a>
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

        await transporter.sendMail({
          from: smtpFrom,
          to: userData.email,
          subject:
            `Daily Update: ${notifications.length} new notification` +
            `${notifications.length > 1 ? "s" : ""} — Care Construction`,
          html: digestHtml,
        });

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