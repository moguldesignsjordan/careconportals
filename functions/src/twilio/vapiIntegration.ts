// functions/src/twilio/vapiIntegration.ts
// Fetch call recordings, transcripts, and summaries from VAPI AI
// VAPI stores recordings separately from Twilio — this bridges the two.
//
// Setup: Add VAPI_API_KEY to functions/.env
// VAPI Dashboard → Account → API Keys → copy Private Key

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const getDb = () => admin.firestore();

const VAPI_BASE_URL = "https://api.vapi.ai";

const getVapiKey = (): string => {
  const key = process.env.VAPI_API_KEY || "";
  if (!key) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "VAPI_API_KEY not configured in functions/.env"
    );
  }
  return key;
};

// ── Verify admin ─────────────────────────────────────────────────────

const verifyAdmin = async (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }
  const db = getDb();
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }
};

// ── Types ────────────────────────────────────────────────────────────

interface VapiCallSummary {
  id: string;
  type: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;           // seconds
  recordingUrl: string | null;
  stereoRecordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  customerPhone: string | null;
  assistantPhone: string | null;
  phoneCallProviderId: string | null; // Twilio call SID
  messages: VapiMessage[];
  costBreakdown: any | null;
}

interface VapiMessage {
  role: string;
  message: string;
  time: number;         // seconds into call
  secondsFromStart: number;
}

// ── Get VAPI call detail by Twilio SID ───────────────────────────────

interface GetVapiCallByTwilioSidRequest {
  twilioCallSid: string;
}

export const getVapiCallByTwilioSid = functions.https.onCall(
  async (data: GetVapiCallByTwilioSidRequest, context) => {
    await verifyAdmin(context);

    const { twilioCallSid } = data;
    if (!twilioCallSid) {
      throw new functions.https.HttpsError("invalid-argument", "twilioCallSid required");
    }

    const apiKey = getVapiKey();

    try {
      // VAPI's list endpoint — fetch recent calls and match by phoneCallProviderId
      // The API supports limit and pagination
      const url = `${VAPI_BASE_URL}/call?limit=100`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("VAPI API error:", response.status, errBody);
        throw new functions.https.HttpsError("internal", "Failed to fetch from VAPI");
      }

      const calls = (await response.json()) as any[];

      // Find the call matching this Twilio SID
      const match = calls.find(
        (c: any) =>
          c.phoneCallProviderId === twilioCallSid ||
          c.phoneCallProviderByoPhoneCallId === twilioCallSid
      );

      if (!match) {
        return { found: false, call: null };
      }

      // Extract the useful data
      const vapiCall: VapiCallSummary = {
        id: match.id,
        type: match.type || "unknown",
        status: match.status || "unknown",
        startedAt: match.startedAt || null,
        endedAt: match.endedAt || null,
        duration: match.endedAt && match.startedAt
          ? Math.round(
              (new Date(match.endedAt).getTime() - new Date(match.startedAt).getTime()) / 1000
            )
          : null,
        recordingUrl: match.artifact?.recordingUrl || match.recordingUrl || null,
        stereoRecordingUrl: match.artifact?.stereoRecordingUrl || match.stereoRecordingUrl || null,
        transcript: match.artifact?.transcript || match.transcript || null,
        summary: match.analysis?.summary || match.summary || null,
        customerPhone: match.customer?.number || null,
        assistantPhone: match.phoneNumber?.number || null,
        phoneCallProviderId: match.phoneCallProviderId || null,
        messages: (match.artifact?.messages || match.messages || [])
          .filter((m: any) => m.role && m.message)
          .map((m: any) => ({
            role: m.role,
            message: m.message || m.content || "",
            time: m.time || m.secondsFromStart || 0,
            secondsFromStart: m.secondsFromStart || m.time || 0,
          })),
        costBreakdown: match.costBreakdown || match.costs || null,
      };

      return { found: true, call: vapiCall };
    } catch (error: any) {
      console.error("Error fetching VAPI call:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", error.message || "VAPI fetch failed");
    }
  }
);

// ── Get VAPI call detail by VAPI ID ──────────────────────────────────

interface GetVapiCallByIdRequest {
  vapiCallId: string;
}

export const getVapiCallById = functions.https.onCall(
  async (data: GetVapiCallByIdRequest, context) => {
    await verifyAdmin(context);

    const { vapiCallId } = data;
    if (!vapiCallId) {
      throw new functions.https.HttpsError("invalid-argument", "vapiCallId required");
    }

    const apiKey = getVapiKey();

    try {
      const response = await fetch(`${VAPI_BASE_URL}/call/${vapiCallId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { found: false, call: null };
        }
        throw new functions.https.HttpsError("internal", "Failed to fetch call from VAPI");
      }

      const match = (await response.json()) as any;

      const vapiCall: VapiCallSummary = {
        id: match.id,
        type: match.type || "unknown",
        status: match.status || "unknown",
        startedAt: match.startedAt || null,
        endedAt: match.endedAt || null,
        duration: match.endedAt && match.startedAt
          ? Math.round(
              (new Date(match.endedAt).getTime() - new Date(match.startedAt).getTime()) / 1000
            )
          : null,
        recordingUrl: match.artifact?.recordingUrl || match.recordingUrl || null,
        stereoRecordingUrl: match.artifact?.stereoRecordingUrl || match.stereoRecordingUrl || null,
        transcript: match.artifact?.transcript || match.transcript || null,
        summary: match.analysis?.summary || match.summary || null,
        customerPhone: match.customer?.number || null,
        assistantPhone: match.phoneNumber?.number || null,
        phoneCallProviderId: match.phoneCallProviderId || null,
        messages: (match.artifact?.messages || match.messages || [])
          .filter((m: any) => m.role && m.message)
          .map((m: any) => ({
            role: m.role,
            message: m.message || m.content || "",
            time: m.time || m.secondsFromStart || 0,
            secondsFromStart: m.secondsFromStart || m.time || 0,
          })),
        costBreakdown: match.costBreakdown || match.costs || null,
      };

      return { found: true, call: vapiCall };
    } catch (error: any) {
      console.error("Error fetching VAPI call by ID:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", error.message || "VAPI fetch failed");
    }
  }
);

// ── List recent VAPI calls ───────────────────────────────────────────

interface ListVapiCallsRequest {
  limit?: number;
}

export const listVapiCalls = functions.https.onCall(
  async (data: ListVapiCallsRequest, context) => {
    await verifyAdmin(context);

    const apiKey = getVapiKey();
    const limit = Math.min(data.limit || 50, 100);

    try {
      const response = await fetch(`${VAPI_BASE_URL}/call?limit=${limit}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new functions.https.HttpsError("internal", "Failed to list VAPI calls");
      }

      const calls = (await response.json()) as any[];

      const summaries: VapiCallSummary[] = calls.map((c: any) => ({
        id: c.id,
        type: c.type || "unknown",
        status: c.status || "unknown",
        startedAt: c.startedAt || null,
        endedAt: c.endedAt || null,
        duration: c.endedAt && c.startedAt
          ? Math.round(
              (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000
            )
          : null,
        recordingUrl: c.artifact?.recordingUrl || c.recordingUrl || null,
        stereoRecordingUrl: c.artifact?.stereoRecordingUrl || c.stereoRecordingUrl || null,
        transcript: c.artifact?.transcript || c.transcript || null,
        summary: c.analysis?.summary || c.summary || null,
        customerPhone: c.customer?.number || null,
        assistantPhone: c.phoneNumber?.number || null,
        phoneCallProviderId: c.phoneCallProviderId || null,
        messages: [],  // Skip messages for list view to reduce payload
        costBreakdown: null,
      }));

      return { calls: summaries, total: summaries.length };
    } catch (error: any) {
      console.error("Error listing VAPI calls:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", error.message || "VAPI list failed");
    }
  }
);