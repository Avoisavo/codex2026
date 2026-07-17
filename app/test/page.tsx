"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GuardShieldIcon,
  PhoneIcon,
  PhoneHangUpIcon,
  AlertIcon,
} from "../components/icons";
import { PhoneShell, StatusBar } from "../components/PhoneShell";

interface TranscriptEntry {
  role: "user" | "ai";
  message: string;
  time: number;
}

type CallStatus = "idle" | "calling" | "active" | "ended" | "error";

export default function TestPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [endReason, setEndReason] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTranscriptLenRef = useRef(0);
  const aiWaitingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const SILENCE_TIMEOUT = 15_000;

  const startPolling = useCallback(
    (convId: string) => {
      stopPolling();
      prevTranscriptLenRef.current = 0;
      aiWaitingSinceRef.current = null;

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/transcript?id=${convId}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.transcript && data.transcript.length > 0) {
            if (data.transcript.length > prevTranscriptLenRef.current) {
              const newEntries = data.transcript.slice(
                prevTranscriptLenRef.current
              );
              prevTranscriptLenRef.current = data.transcript.length;

              const hasNewUserMsg = newEntries.some(
                (e: TranscriptEntry) => e.role === "user"
              );
              if (hasNewUserMsg) {
                aiWaitingSinceRef.current = null;
              }

              const lastEntry =
                data.transcript[data.transcript.length - 1];
              if (lastEntry.role === "ai" && !hasNewUserMsg) {
                aiWaitingSinceRef.current = Date.now();
              }
            }

            if (
              aiWaitingSinceRef.current !== null &&
              Date.now() - aiWaitingSinceRef.current > SILENCE_TIMEOUT
            ) {
              setEndReason("No response for 15 seconds - call auto-ended");
              setCallStatus("ended");
              stopPolling();
              return;
            }

            setTranscript(data.transcript);
          }

          if (data.status === "done") {
            setCallStatus("ended");
            stopPolling();
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleCall = useCallback(async () => {
    const cleaned = phoneNumber.trim();
    if (!cleaned) return;

    setCallStatus("calling");
    setTranscript([]);
    setErrorMsg("");
    setEndReason("");
    setConversationId(null);

    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_number: cleaned }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error)
        );
        setCallStatus("error");
        return;
      }

      setConversationId(data.conversation_id);
      setCallStatus("active");
      startPolling(data.conversation_id);
    } catch (err) {
      setErrorMsg("Network error - make sure the dev server is running.");
      setCallStatus("error");
    }
  }, [phoneNumber, startPolling]);

  const handleHangUp = useCallback(() => {
    stopPolling();
    setCallStatus("ended");
  }, [stopPolling]);

  const handleReset = useCallback(() => {
    stopPolling();
    setCallStatus("idle");
    setTranscript([]);
    setConversationId(null);
    setErrorMsg("");
    setEndReason("");
  }, [stopPolling]);

  const isIdle = callStatus === "idle" || callStatus === "error";
  const isActive = callStatus === "active";
  const isCalling = callStatus === "calling";
  const isEnded = callStatus === "ended";

  return (
    <PhoneShell>
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-br from-[#1273e8] via-[#2a3dc7] to-[#5b2f9e]">
        <StatusBar tone="light" />
        <div className="flex items-center gap-[14px] px-[22px] pb-[20px] pt-[2px]">
          <Link
            href="/"
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white/15 text-white transition active:bg-white/25"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
            >
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-white">Scam Guard AI</h1>
            <p className="text-[12px] font-medium text-white/70">
              Transaction verification call
            </p>
          </div>
          <GuardShieldIcon className="h-[40px] w-[40px]" />
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`shrink-0 px-[22px] py-[10px] text-[13px] font-semibold ${
          isActive
            ? "bg-[#dcfce7] text-[#166534]"
            : isCalling
              ? "bg-[#fef9c3] text-[#854d0e]"
              : isEnded
                ? "bg-[#f0f2f7] text-[#6b7280]"
                : callStatus === "error"
                  ? "bg-[#fef2f2] text-[#991b1b]"
                  : "bg-[#f0f2f7] text-[#6b7280]"
        }`}
      >
        <div className="flex items-center gap-[8px]">
          <span
            className={`h-[8px] w-[8px] rounded-full ${
              isActive
                ? "bg-[#22c55e]"
                : isCalling
                  ? "bg-[#eab308]"
                  : callStatus === "error"
                    ? "bg-[#ef4444]"
                    : "bg-[#9ca3af]"
            }`}
          />
          {isActive
            ? "Call in progress - transcript updating live"
            : isCalling
              ? `Ringing ${phoneNumber}...`
              : isEnded
                ? endReason || "Call ended"
                : callStatus === "error"
                  ? "Call failed"
                  : "Enter phone number to start"}
        </div>
      </div>

      {/* Transcript area */}
      <div ref={scrollRef} className="tng-scroll flex-1 bg-[#f4f5f9]">
        {transcript.length === 0 && isIdle ? (
          <div className="flex h-full flex-col items-center justify-center px-[32px]">
            <GuardShieldIcon className="h-[72px] w-[72px] opacity-60" />
            <p className="mt-[16px] text-center text-[16px] font-bold text-tng-ink">
              Transaction Verification
            </p>
            <p className="mt-[8px] text-center text-[13px] leading-[1.5] text-[#6b7280]">
              Enter a phone number and press call. The AI Scam Guard will call
              that number and verify the transaction. The transcript appears here
              in real time.
            </p>
            {errorMsg && (
              <div className="mt-[16px] rounded-[12px] bg-[#fef2f2] px-[16px] py-[12px]">
                <p className="text-center text-[12px] font-medium text-[#991b1b]">
                  {errorMsg}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-[16px] py-[16px]">
            {transcript.map((entry, i) => (
              <TranscriptBubble key={i} entry={entry} />
            ))}
            {(isCalling || (isActive && transcript.length === 0)) && (
              <div className="flex justify-center py-[20px]">
                <div className="flex items-center gap-[8px] rounded-full bg-white px-[16px] py-[8px] shadow-sm">
                  <span className="flex gap-[3px]">
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="tng-bar h-[14px] w-[3px] rounded-full bg-tng-blue"
                        style={{ animationDelay: `${j * 150}ms` }}
                      />
                    ))}
                  </span>
                  <span className="text-[13px] font-medium text-[#6b7280]">
                    {isCalling
                      ? "Ringing phone..."
                      : "Waiting for conversation..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice visualizer when active */}
      {isActive && (
        <div className="shrink-0 border-t border-black/[0.06] bg-white px-[22px] py-[12px]">
          <div className="flex items-center justify-center gap-[4px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="tng-bar h-[24px] w-[3px] rounded-full bg-gradient-to-t from-tng-blue to-[#8b5cf6]"
                style={{
                  animationDelay: `${i * 75}ms`,
                  animationDuration: `${700 + (i % 3) * 200}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-black/[0.06] bg-white pb-[24px] pt-[14px]">
        {/* Phone number input */}
        {(isIdle || isEnded) && (
          <div className="mb-[14px] px-[22px]">
            <div className="flex items-center gap-[10px] rounded-[14px] bg-[#f0f2f7] px-[14px] py-[10px]">
              <PhoneIcon className="h-[20px] w-[20px] shrink-0 text-[#9ca3af]" />
              <input
                type="tel"
                placeholder="e.g. +60123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 bg-transparent text-[15px] font-medium text-tng-ink outline-none placeholder:text-[#9ca3af]"
              />
              {phoneNumber && (
                <button
                  onClick={() => setPhoneNumber("")}
                  className="text-[#9ca3af] transition active:text-tng-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                  >
                    <path
                      d="M6 6 18 18M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Call controls */}
        <div className="flex items-center justify-center gap-[24px]">
          {isEnded && (
            <button
              onClick={handleReset}
              className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#f0f2f7] text-[#6b7280] transition active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[22px] w-[22px]"
                fill="none"
              >
                <path
                  d="M1 4v6h6M23 20v-6h-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {isIdle || isEnded ? (
            <button
              onClick={handleCall}
              disabled={!phoneNumber.trim() || isCalling}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_8px_20px_-4px_rgba(34,197,94,0.5)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              <PhoneIcon className="h-[28px] w-[28px]" />
            </button>
          ) : isCalling ? (
            <button
              disabled
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#eab308] text-white shadow-[0_8px_20px_-4px_rgba(234,179,8,0.5)]"
            >
              <span className="flex gap-[3px]">
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    className="tng-bar h-[16px] w-[3px] rounded-full bg-white"
                    style={{ animationDelay: `${j * 150}ms` }}
                  />
                ))}
              </span>
            </button>
          ) : isActive ? (
            <button
              onClick={handleHangUp}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#ef4444] text-white shadow-[0_8px_20px_-4px_rgba(239,68,68,0.5)] transition active:scale-95"
            >
              <PhoneHangUpIcon className="h-[28px] w-[28px]" />
            </button>
          ) : null}
        </div>

        {(isIdle || isEnded) && (
          <p className="mt-[10px] text-center text-[12px] font-medium text-[#9ca3af]">
            {phoneNumber.trim()
              ? "Tap to call this number"
              : "Enter phone number to enable call"}
          </p>
        )}

        {conversationId && isEnded && (
          <p className="mt-[6px] text-center text-[11px] text-[#9ca3af]">
            Conversation ID: {conversationId}
          </p>
        )}
      </div>
    </PhoneShell>
  );
}

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.role === "ai";
  const mins = Math.floor(entry.time / 60);
  const secs = Math.floor(entry.time % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      className={`mb-[10px] flex ${isAI ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[80%] rounded-[16px] px-[14px] py-[10px] ${
          isAI
            ? "rounded-bl-[4px] bg-white shadow-sm"
            : "rounded-br-[4px] bg-tng-blue text-white"
        }`}
      >
        {isAI && (
          <div className="mb-[4px] flex items-center gap-[6px]">
            <AlertIcon className="h-[13px] w-[13px] text-tng-blue" />
            <span className="text-[11px] font-bold text-tng-blue">
              Scam Guard
            </span>
          </div>
        )}
        <p className="text-[14px] leading-[1.45]">{entry.message}</p>
        <p
          className={`mt-[4px] text-[10px] ${
            isAI ? "text-[#9ca3af]" : "text-white/60"
          }`}
        >
          {timeStr}
        </p>
      </div>
    </div>
  );
}
