# Demo script — trigger SUSPICIOUS + BLOCKED

## 1. Set up the transfer (on /transfer, parental control ON)
| Field | Value |
|---|---|
| Recipient name | `Quick Cash Enterprise` |
| Recipient bank | `Maybank` |
| **Account number** | `8842 1190 3321`  ← seeded as flagged |
| Amount | `10000` |
| Payment Type | `Instant Transfer (DuitNow)` |
| Reference | `Loan release fee` |

Continue → Confirm & Transfer → the "AI Scam Guard analyzing…" modal runs → your phone
rings. Answer it and follow the script below.

## 2. The call (you = the customer being scammed)

**Agent:** "Hello, is this Danial Ariff? …We've paused a transfer of RM 10,000 to Quick
Cash Enterprise. Can I verify a few details?"
**You:** "Yes, this is Danial. Okay, sure."

**Agent:** "Are you trying to send RM 10,000 to Quick Cash Enterprise?"
**You:** "Yes, that's right. I need to send it now."

**Agent:** "What is this payment for?"
**You:** "It's a processing fee. I got approved for a RM 50,000 loan, but they said I have
to pay RM 10,000 first to release it."

**Agent:** "How do you know Quick Cash Enterprise — is this someone you know personally?"
**You:** "No, I don't know them. A man called me this morning. I saw the loan advertised
on Facebook."

**Agent:** "Did anyone tell you to make this transfer, or ask you to hurry or keep it
secret?"
**You:** "Yes — he said I must pay within the hour or I lose the loan. He also told me not
to tell the bank, just to say it's money for family."

**If the agent probes more, keep reinforcing the scam signals:**
- "He's still on the other line waiting for me to confirm."
- "He said the bank might try to stop it, but it's safe."
- "I've never dealt with this company before."

**Agent (final):** something like *"…I'm going to stop this transfer to protect you.
Final decision: BLOCKED — advance-fee loan scam, flagged recipient, customer under
pressure."*

→ The app detects **BLOCKED** and shows the **Transfer rejected** page (balance
untouched, "SMS sent to guardian", contact-bank notice).

## Why it blocks (hits every rule)
- Recipient account is **FLAGGED** as a known suspicious account.
- Purpose is an **advance-fee loan scam** pattern.
- Customer **does not know** the recipient.
- Customer is under **time pressure** and was **coached to lie** to the bank.

## For the APPROVED demo (contrast)
Use a **normal** account (not `8842 1190 3321`), e.g. pay `Jonathan Lim`, and answer:
"It's my share of dinner last night, I've known him for years, nobody told me to send it."
The agent should end **Final decision: APPROVED**, and the transfer completes.
