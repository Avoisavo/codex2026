# Codex 2026 - Scam Guard AI

A Touch 'n Go eWallet UI clone with an AI-powered **Scam Guard** that calls users to verify suspicious transactions. Built with Next.js, ElevenLabs Conversational AI, and Twilio.

## Features

- **Touch 'n Go eWallet UI** (`/`) - Pixel-accurate clone of the Touch 'n Go home screen, rendered inside a phone frame. All icons are inline SVGs.
- **Scam Guard AI** (`/test`) - Enter a phone number, press call, and the AI agent rings that number to ask verification questions (purpose of transaction, relationship with recipient, signs of nervousness). Live transcript streams to the UI in real time.

## How It Works

1. User enters a phone number on the `/test` page and presses call
2. The app hits `/api/call`, which triggers an **ElevenLabs outbound call** via Twilio
3. The AI agent calls the phone number and conducts a scam-verification conversation
4. The frontend polls `/api/transcript` every 2 seconds to fetch the live transcript from ElevenLabs
5. Transcript bubbles appear in the UI as the conversation progresses

## Tech Stack

- **Next.js 16** with App Router and Turbopack
- **React 19** / TypeScript / Tailwind CSS v4
- **ElevenLabs Conversational AI** - AI agent with outbound calling
- **Twilio** - Phone number provisioning and call routing

## Getting Started

### Prerequisites

- Node.js 18+
- An [ElevenLabs](https://elevenlabs.io) account with a Conversational AI agent
- A [Twilio](https://www.twilio.com) account with a phone number

### Setup

1. Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd codex2026
npm install
```

2. Create a `.env.local` file in the project root:

```env
# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) for the eWallet UI, or [http://localhost:3000/test](http://localhost:3000/test) for the Scam Guard AI.

### Twilio Trial Limitation

On a Twilio trial account, you can only call **verified phone numbers**. Add numbers at:
[Twilio Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)

Upgrading to a paid Twilio account removes this restriction.

## Project Structure

```
app/
  page.tsx                    # Touch 'n Go eWallet home UI
  test/page.tsx               # Scam Guard AI - phone call + live transcript
  api/
    call/route.ts             # POST - triggers ElevenLabs outbound call
    transcript/route.ts       # GET  - fetches conversation transcript
  components/
    icons.tsx                 # All SVG icons
    PhoneShell.tsx            # Phone frame wrapper (440x956)
    BottomNav.tsx             # Bottom navigation bar
    home/HomeInteractive.tsx  # Client-side interactive components for home page
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/call` | POST | Accepts `{ to_number }`, triggers an outbound call via ElevenLabs + Twilio |
| `/api/transcript` | GET | Accepts `?id=conversation_id`, returns live transcript from ElevenLabs |

## License

Private project.
