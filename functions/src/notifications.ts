// functions/src/notifications.ts
// Cloud Function: Send email when a notification document is created
// Uses Firestore trigger + Nodemailer (or SendGrid / Mailgun — swap transporter)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Ensure admin is initialized (safe to call multiple times)
if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

// ============ EMAIL CONFIG ============
// Set these via:  firebase functions:config:set email.host="smtp.gmail.com" email.port="587" email.user="you@gmail.com" email.pass="app-password" email.from="Care General <noreply@caregencon.com>"
// OR use functions/.env file:
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=you@gmail.com
//   EMAIL_PASS=app-password
//   EMAIL_FROM=Care General <noreply@caregencon.com>

const getEmailConfig = () => ({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587", 10),
  user: process.env.EMAIL_USER || "",
  pass: process.env.EMAIL_PASS || "",
  from: process.env.EMAIL_FROM || "Care General Construction <noreply@caregencon.com>",
});

const createTransporter = () => {
  const config = getEmailConfig();
  if (!config.user || !config.pass) {
    console.warn("⚠️ Email credentials not configured — skipping email send");
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

// ============ EMAIL TEMPLATE ============

const buildEmailHtml = (
  title: string,
  message: string,
  recipientName: string,
  category: string,
  linkUrl?: string
) => {
  const categoryColors: Record<string, string> = {
    PROJECT: "#F15A2B",
    INVOICE: "#22C55E",
    MESSAGE: "#3B82F6",
    CALENDAR: "#8B5CF6",
    DOCUMENT: "#F59E0B",
    SYSTEM: "#6B7280",
  };

  const color = categoryColors[category] || "#F15A2B";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#050816;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#F15A2B;font-size:20px;font-weight:800;letter-spacing:-0.5px;">CAREGENCON</span>
                    <span style="color:rgba(255,255,255,0.5);font-size:14px;margin-left:8px;">Operations</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Category badge -->
          <tr>
            <td style="padding:24px 32px 0;">
              <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${color}15;color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                ${category.replace("_", " ")}
              </span>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td style="padding:16px 32px 0;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:-0.5px;">
                ${title}
              </h1>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding:12px 32px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#52525b;">
                Hi ${recipientName},
              </p>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#52525b;">
                ${message}
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          ${linkUrl ? `
          <tr>
            <td style="padding:24px 32px 0;">
              <a href="${linkUrl}" 
                 style="display:inline-block;padding:12px 28px;background:#F15A2B;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:-0.2px;">
                View in Portal →
              </a>
            </td>
          </tr>
          ` : ""}
          
          <!-- Footer -->
          <tr>
            <td style="padding:32px;border-top:1px solid #f4f4f5;margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                You're receiving this email because you have notifications enabled on your Care General Construction Portal account.
                <br/>
                <a href="#" style="color:#F15A2B;text-decoration:none;">Manage notification preferences</a>
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

// ============ FIRESTORE TRIGGER ============

/**
 * Triggered when a new document is created in the `notifications` collection.
 * Looks up the recipient's email, sends a branded email, then marks isEmailSent = true.
 */
export const onNotificationCreated = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const notificationId = context.params.notificationId;

    if (!data || !data.recipientId) {
      console.error("Notification missing recipientId:", notificationId);
      return;
    }

    // Don't email for low-priority or MESSAGE category (too noisy)
    const skipCategories = ["MESSAGE"];
    if (skipCategories.includes(data.category)) {
      console.log(`Skipping email for category: ${data.category}`);
      return;
    }

    if (data.priority === "LOW") {
      console.log("Skipping email for LOW priority notification");
      return;
    }

    try {
      // Look up recipient
      const userSnap = await db.collection("users").doc(data.recipientId).get();
      if (!userSnap.exists) {
        console.error("Recipient user not found:", data.recipientId);
        return;
      }

      const user = userSnap.data()!;
      const recipientEmail = user.email;
      const recipientName = user.name || "there";

      if (!recipientEmail) {
        console.error("Recipient has no email:", data.recipientId);
        return;
      }

      // Check user notification preferences (if they exist)
      // Users can opt out by having a `notificationPreferences.emailEnabled = false` field
      if (user.notificationPreferences?.emailEnabled === false) {
        console.log(`User ${data.recipientId} has emails disabled`);
        return;
      }

      // Build portal link
      const portalBaseUrl = process.env.PORTAL_URL || "https://caregencon.com";
      let linkUrl: string | undefined;
      if (data.linkType && data.linkId) {
        linkUrl = `${portalBaseUrl}?view=${data.linkType}&id=${data.linkId}`;
      } else {
        linkUrl = portalBaseUrl;
      }

      // Create transporter
      const transporter = createTransporter();
      if (!transporter) {
        console.warn("Email transporter not available — skipping");
        return;
      }

      const config = getEmailConfig();

      // Send email
      await transporter.sendMail({
        from: config.from,
        to: recipientEmail,
        subject: `${data.title} — Care General Construction`,
        html: buildEmailHtml(
          data.title,
          data.message,
          recipientName,
          data.category,
          linkUrl
        ),
      });

      // Mark as sent
      await snap.ref.update({ isEmailSent: true });

      console.log(
        `✅ Email sent to ${recipientEmail} for notification ${notificationId}`
      );
    } catch (error) {
      console.error("Failed to send notification email:", error);
      // Don't throw — we don't want to retry email sends on transient errors
    }
  });