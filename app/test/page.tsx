"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import {
  GuardShieldIcon,
  PhoneIcon,
  PhoneHangUpIcon,
  MicIcon,
  AlertIcon,
} from "../components/icons";
import { PhoneShell, StatusBar } from "../components/PhoneShell";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

interface TranscriptEntry {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

function TestPageInner() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [permissionError, setPermissionError] = useState(false);

  const conversation = useConversation({
    onMessage: (payload) => {
      setTranscript((prev) => [
        ...prev,
        {
          role: payload.role === "user" ? "user" : "ai",
          message: payload.message,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
    },
  });

  const { status, isSpeaking, mode } = conversation;
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleStart = useCallback(async () => {
    if (!AGENT_ID) {
      alert(
        "Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in your .env.local file first."
      );
      return;
    }

    if (!phoneNumber.trim()) {
      alert("Please enter a phone number first.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionError(false);
    } catch {
      setPermissionError(true);
      return;
    }

    setTranscript([]);
    conversation.startSession({
      agentId: AGENT_ID,
      dynamicVariables: {
        phone_number: phoneNumber,
      },
    });
  }, [conversation, phoneNumber]);

  const handleEnd = useCallback(() => {
    conversation.endSession();
  }, [conversation]);

  const handleToggleMute = useCallback(() => {
    conversation.setMuted(!conversation.isMuted);
  }, [conversation]);

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
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
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
            <h1 className="text-[18px] font-bold text-white">
              Scam Guard AI
            </h1>
            <p className="text-[12px] font-medium text-white/70">
              Transaction verification call
            </p>
          </div>
          <GuardShieldIcon className="h-[40px] w-[40px]" />
        </div>
      </div>

      {/* Call status banner */}
      <div
        className={`shrink-0 px-[22px] py-[10px] text-[13px] font-semibold ${
          isConnected
            ? "bg-[#dcfce7] text-[#166534]"
            : isConnecting
              ? "bg-[#fef9c3] text-[#854d0e]"
              : "bg-[#f0f2f7] text-[#6b7280]"
        }`}
      >
        <div className="flex items-center gap-[8px]">
          <span
            className={`h-[8px] w-[8px] rounded-full ${
              isConnected
                ? "bg-[#22c55e]"
                : isConnecting
                  ? "bg-[#eab308]"
                  : "bg-[#9ca3af]"
            }`}
          />
          {isConnected
            ? isSpeaking
              ? "Agent is speaking..."
              : mode === "listening"
                ? "Agent is listening..."
                : "Connected"
            : isConnecting
              ? "Connecting to agent..."
              : phoneNumber
                ? `Calling ${phoneNumber}`
                : "Enter phone number to start"}
        </div>
      </div>

      {/* Transcript area */}
      <div ref={scrollRef} className="tng-scroll flex-1 bg-[#f4f5f9]">
        {transcript.length === 0 && !isConnected && !isConnecting ? (
          <div className="flex h-full flex-col items-center justify-center px-[32px]">
            <GuardShieldIcon className="h-[72px] w-[72px] opacity-60" />
            <p className="mt-[16px] text-center text-[16px] font-bold text-tng-ink">
              Transaction Verification
            </p>
            <p className="mt-[8px] text-center text-[13px] leading-[1.5] text-[#6b7280]">
              Enter the customer's phone number below and press call. The AI
              Scam Guard will verify the transaction through a voice
              conversation. The transcript appears here in real time.
            </p>
            {!AGENT_ID && (
              <div className="mt-[16px] rounded-[12px] bg-[#fef2f2] px-[16px] py-[12px]">
                <p className="text-center text-[12px] font-medium text-[#991b1b]">
                  NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set. Add it to your
                  .env.local file.
                </p>
              </div>
            )}
            {permissionError && (
              <div className="mt-[12px] rounded-[12px] bg-[#fef2f2] px-[16px] py-[12px]">
                <p className="text-center text-[12px] font-medium text-[#991b1b]">
                  Microphone access denied. Please allow microphone access and
                  try again.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-[16px] py-[16px]">
            {transcript.map((entry, i) => (
              <TranscriptBubble key={i} entry={entry} />
            ))}
            {isConnected && transcript.length === 0 && (
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
                    Waiting for agent...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice visualizer when connected */}
      {isConnected && (
        <div className="shrink-0 border-t border-black/[0.06] bg-white px-[22px] py-[12px]">
          <div className="flex items-center justify-center gap-[4px]">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="tng-bar h-[24px] w-[3px] rounded-full bg-gradient-to-t from-tng-blue to-[#8b5cf6]"
                style={{
                  animationDelay: `${i * 75}ms`,
                  animationDuration: `${700 + (i % 3) * 200}ms`,
                  opacity: isSpeaking ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phone number input + call controls */}
      <div className="shrink-0 border-t border-black/[0.06] bg-white pb-[24px] pt-[14px]">
        {/* Phone number input */}
        {!isConnected && !isConnecting && (
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
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                    <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Call controls */}
        <div className="flex items-center justify-center gap-[24px]">
          {isConnected && (
            <button
              onClick={handleToggleMute}
              className={`grid h-[52px] w-[52px] place-items-center rounded-full transition active:scale-95 ${
                conversation.isMuted
                  ? "bg-[#fef2f2] text-[#ef4444]"
                  : "bg-[#f0f2f7] text-[#6b7280]"
              }`}
            >
              <MicIcon
                className="h-[24px] w-[24px]"
                muted={conversation.isMuted}
              />
            </button>
          )}

          {!isConnected ? (
            <button
              onClick={handleStart}
              disabled={isConnecting || !phoneNumber.trim()}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_8px_20px_-4px_rgba(34,197,94,0.5)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {isConnecting ? (
                <span className="flex gap-[3px]">
                  {[0, 1, 2].map((j) => (
                    <span
                      key={j}
                      className="tng-bar h-[16px] w-[3px] rounded-full bg-white"
                      style={{ animationDelay: `${j * 150}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <PhoneIcon className="h-[28px] w-[28px]" />
              )}
            </button>
          ) : (
            <button
              onClick={handleEnd}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#ef4444] text-white shadow-[0_8px_20px_-4px_rgba(239,68,68,0.5)] transition active:scale-95"
            >
              <PhoneHangUpIcon className="h-[28px] w-[28px]" />
            </button>
          )}

          {isConnected && (
            <button
              onClick={() => conversation.setVolume({ volume: 0.5 })}
              className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#f0f2f7] text-[#6b7280] transition active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[22px] w-[22px]"
                fill="none"
              >
                <path
                  d="M11 5L6 9H2v6h4l5 4V5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 8.5a4 4 0 010 7M19 5a9 9 0 010 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {!isConnected && !isConnecting && (
          <p className="mt-[10px] text-center text-[12px] font-medium text-[#9ca3af]">
            {phoneNumber.trim()
              ? "Tap to start verification call"
              : "Enter phone number to enable call"}
          </p>
        )}
      </div>
    </PhoneShell>
  );
}

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.role === "ai";
  const time = entry.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`mb-[10px] flex ${isAI ? "justify-start" : "justify-end"}`}>
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
          {time}
        </p>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <ConversationProvider>
      <TestPageInner />
    </ConversationProvider>
  );
}
