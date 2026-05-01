// functions/src/twilioAdmin.ts
// Admin-facing Twilio functions: message history, call logs, send SMS
// Exports: getTwilioMessages, getTwilioCalls, adminSendSMS

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const getDb = () => admin.firestore();

// ── Twilio config ────────────────────────────────────────────────────

const getTwilioConfig = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  enabled: process.env.TWILIO_ENABLED === "true",
});

const twilioAuthHeader = () => {
  const { accountSid, authToken } = getTwilioConfig();
  return (
    "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  );
};

// ── Verify caller is admin ───────────────────────────────────────────
// FIX: Uses "ADMIN" (uppercase) to match the UserRole enum in Firestore.
// The original had "admin" (lowercase) which caused every call to fail.

const verifyAdmin = async (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  const db = getDb();
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();

  if (!userDoc.exists || userData?.role !== "ADMIN") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can access Twilio functions"
    );
  }
  return userData;
};

// ── Get Twilio Message History ───────────────────────────────────────

interface GetMessagesRequest {
  pageSize?: number;
  pageToken?: string;
  dateSentAfter?: string;
  dateSentBefore?: string;
  direction?: "inbound" | "outbound-api" | "outbound-call" | "outbound-reply" | "all";
  searchPhone?: string;
}

export const getTwilioMessages = functions.https.onCall(
  async (data: GetMessagesRequest, context) => {
    await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.enabled || !config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const pageSize = Math.min(data.pageSize || 50, 100);

    try {
      const params = new URLSearchParams();
      params.set("PageSize", String(pageSize));
      if (data.dateSentAfter) params.set("DateSent>", data.dateSentAfter);
      if (data.dateSentBefore) params.set("DateSent<", data.dateSentBefore);

      let url: string;
      if (data.pageToken) {
        url = data.pageToken; // Twilio pagination uses full URIs
      } else {
        url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: twilioAuthHeader() },
      });

      const result = (await response.json()) as any;
      if (!response.ok) {
        console.error("Twilio Messages API error:", JSON.stringify(result));
        throw new functions.https.HttpsError(
          "internal",
          "Failed to fetch messages from Twilio"
        );
      }

      let messages = result.messages || [];

      // Filter by direction
      if (data.direction && data.direction !== "all") {
        messages = messages.filter((m: any) => m.direction === data.direction);
      }

      // Filter by phone number
      if (data.searchPhone) {
        const search = data.searchPhone.replace(/\D/g, "");
        messages = messages.filter(
          (m: any) =>
            m.from?.replace(/\D/g, "").includes(search) ||
            m.to?.replace(/\D/g, "").includes(search)
        );
      }

      const cleaned = messages.map((m: any) => ({
        sid: m.sid,
        from: m.from,
        to: m.to,
        body: m.body,
        status: m.status,
        direction: m.direction,
        dateSent: m.date_sent,
        dateCreated: m.date_created,
        dateUpdated: m.date_updated,
        price: m.price,
        priceUnit: m.price_unit,
        numSegments: m.num_segments,
        errorCode: m.error_code,
        errorMessage: m.error_message,
      }));

      return {
        messages: cleaned,
        nextPageToken: result.next_page_uri
          ? `https://api.twilio.com${result.next_page_uri}`
          : null,
        previousPageToken: result.previous_page_uri
          ? `https://api.twilio.com${result.previous_page_uri}`
          : null,
        total: result.total || cleaned.length,
      };
    } catch (error: any) {
      console.error("Error fetching Twilio messages:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch messages"
      );
    }
  }
);

// ── Get Twilio Call Logs ─────────────────────────────────────────────

interface GetCallsRequest {
  pageSize?: number;
  pageToken?: string;
  startTimeAfter?: string;
  startTimeBefore?: string;
  status?: string;
  searchPhone?: string;
}

export const getTwilioCalls = functions.https.onCall(
  async (data: GetCallsRequest, context) => {
    await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.enabled || !config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const pageSize = Math.min(data.pageSize || 50, 100);

    try {
      const params = new URLSearchParams();
      params.set("PageSize", String(pageSize));
      if (data.startTimeAfter) params.set("StartTime>", data.startTimeAfter);
      if (data.startTimeBefore) params.set("StartTime<", data.startTimeBefore);
      if (data.status) params.set("Status", data.status);

      let url: string;
      if (data.pageToken) {
        url = data.pageToken;
      } else {
        url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: twilioAuthHeader() },
      });

      const result = (await response.json()) as any;
      if (!response.ok) {
        console.error("Twilio Calls API error:", JSON.stringify(result));
        throw new functions.https.HttpsError(
          "internal",
          "Failed to fetch calls from Twilio"
        );
      }

      let calls = result.calls || [];

      if (data.searchPhone) {
        const search = data.searchPhone.replace(/\D/g, "");
        calls = calls.filter(
          (c: any) =>
            c.from?.replace(/\D/g, "").includes(search) ||
            c.to?.replace(/\D/g, "").includes(search)
        );
      }

      const cleaned = calls.map((c: any) => ({
        sid: c.sid,
        from: c.from,
        to: c.to,
        status: c.status,
        direction: c.direction,
        duration: c.duration,
        startTime: c.start_time,
        endTime: c.end_time,
        dateCreated: c.date_created,
        price: c.price,
        priceUnit: c.price_unit,
        callerName: c.caller_name,
      }));

      return {
        calls: cleaned,
        nextPageToken: result.next_page_uri
          ? `https://api.twilio.com${result.next_page_uri}`
          : null,
        previousPageToken: result.previous_page_uri
          ? `https://api.twilio.com${result.previous_page_uri}`
          : null,
        total: result.total || cleaned.length,
      };
    } catch (error: any) {
      console.error("Error fetching Twilio calls:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch calls"
      );
    }
  }
);

// ── Admin Send SMS (with audit log) ──────────────────────────────────

interface AdminSendSmsRequest {
  to: string;
  message: string;
  recipientName?: string;
}

export const adminSendSMS = functions.https.onCall(
  async (data: AdminSendSmsRequest, context) => {
    const adminUser = await verifyAdmin(context);

    const config = getTwilioConfig();
    if (!config.enabled || !config.accountSid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Twilio is not configured"
      );
    }

    const { to, message, recipientName } = data;
    if (!to || !message) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: to, message"
      );
    }

    if (!to.match(/^\+[1-9]\d{6,14}$/)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Phone number must be in E.164 format (e.g. +1XXXXXXXXXX)"
      );
    }

    if (message.length > 1600) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Message too long — max 1600 characters (10 SMS segments)"
      );
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: twilioAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: config.phoneNumber,
          Body: message,
        }).toString(),
      });

      const result = (await response.json()) as any;
      if (!response.ok) {
        console.error("Twilio send error:", JSON.stringify(result));
        throw new functions.https.HttpsError(
          "internal",
          result.message || "Failed to send SMS"
        );
      }

      // Audit log
      const db = getDb();
      await db.collection("smsLogs").add({
        sid: result.sid,
        to,
        from: config.phoneNumber,
        body: message,
        recipientName: recipientName || null,
        sentBy: context.auth!.uid,
        sentByName: adminUser.name || "Admin",
        direction: "outbound",
        status: result.status,
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Admin SMS sent to ${to} — SID: ${result.sid}`);

      return {
        success: true,
        messageSid: result.sid,
        status: result.status,
      };
    } catch (error: any) {
      console.error("Admin SMS error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to send SMS"
      );
    }
  }
);