# Demo script — Quick Cash high-risk protection

This scenario demonstrates the complete protected flow. It does **not** make the AI the final authority, and it never shares a banking OTP with the trusted contact.

## 1. Configure Family Guard

On `/settings`:

1. Accept the account-holder consent notice.
2. Add the account-holder phone (only needed for a real demo call).
3. Set soft / trusted-approval / hard limits to RM500 / RM1,000 / RM10,000.
4. Enable Family Guard.
5. Add and accept Sarah Tan as a primary trusted contact.
6. Turn on intelligence feedback if you want the terminal outcome to update the demo graph.

Voice consent is optional when using the deterministic demo assessment.

## 2. Load the suspicious scenario

On `/transfer`, press Space while no field is focused, or click **Fill demo transfer**.

| Field | Value |
|---|---|
| Recipient | `Quick Cash Enterprise` |
| Bank | `Maybank` |
| Account | `8842 1190 3321` |
| Amount | `10000` |
| Reference | `Investment deposit` |
| Request origin | `Investment group` |
| Context | Urgency, secrecy, and guaranteed reward/profit |
| Notes | WhatsApp number + example investment website |

Continue through review and submit the safety answers.

## 3. Explain what the agents found

Point out the simulated agent trace:

- Transaction Agent: new recipient, protected limits, and unusual amount.
- Conversation Agent: urgency, secrecy, and guaranteed returns.
- Entity Agent: masked account, phone, and website clues.
- Graph Agent: the recipient is connected to two synthetic prior reports.
- Scam Pattern Agent: investment-scam indicators.
- Education Agent: independent verification and credential-safety advice.
- Orchestrator: **High risk — do not proceed**.

Then show the Scam Link Map. Emphasise that the connections are corroborated demo evidence, not proof of fraud or a bank verdict.

## 4A. Deterministic assessment (recommended for judging)

Click **Continue to verification**, then **Use demo assessment**.

The result moves the exact frozen transfer to `awaiting_guardian`. The balance remains unchanged.

## 4B. Optional safe voice call

Click **Request verification call** only after voice consent is enabled. The screen shows a temporary safety phrase. The call must repeat it and begin with:

> I will never ask for your password, PIN, OTP, TAC, or Secure2u approval.

Suggested account-holder answers:

- “I joined a WhatsApp investment group.”
- “They promised a 30% return.”
- “They said the opportunity ends today.”
- “They asked me not to discuss it with my family.”
- “I have never paid this company before.”

The final spoken result should be a recommendation only:

> **HIGH RISK — do not transfer. Pause and verify the company independently.**

The AI result still cannot release or debit the transfer.

## 5. Trusted-contact review

Open `/family-guard`. The account holder sees that the transfer is waiting for Sarah; Sarah’s dashboard shows only assigned protected requests.

For the local demo, use transaction-bound Family Guard code `4821` unless the environment overrides it. Explain:

> This is not the account holder’s bank OTP, TAC, PIN, or Secure2u approval.

The high-risk screen deliberately has no one-tap release action. Choose:

- **Request bank review** — held, no debit;
- **Reject transfer** — stopped, no debit; or
- **Report as suspicious** — stopped and added as user-reported evidence when feedback consent is on.

The learning card explains urgency, secrecy, and guaranteed-return manipulation.

## 6. Contrast with a releasable case

Use a small amount to an unflagged recipient and answer:

- someone known personally;
- no urgency;
- no secrecy;
- no promised reward;
- no device/banking access request.

Use the demo assessment’s `low_risk` recommendation, then approve with the trusted-contact code. The exact amount is debited once. Reusing the same version/code fails, preventing a double debit.

## Closing line

> **The parent confirms the story. The AI explains the risk. The trusted contact confirms the decision.**

> **Scammers exploit emotion. Scam Guard gives people back the time and clarity to think.**
