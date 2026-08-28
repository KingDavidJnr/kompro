# Email library

## Purpose

Shared email helpers for the Kompro backend. Centralises SMTP configuration and
the branded template so every notification looks consistent (logo header, brand
CTA, AGPL footer).

## Helpers

- `sendEmail({ to, subject, html, text })` - low level sender. `to` may be a
  string or an array (array is delivered as BCC so recipient addresses stay
  private). No-op when `SMTP_HOST` is not set.
- `sendNotification({ to, heading, paragraphs, buttonText, buttonUrl, footerNote })`
  - renders the shared template and sends it. Use this for most product
  notifications. `to` accepts a string or an array (BCC).
- `sendInvite`, `sendReset`, `acceptInvite`, `sendUserRemoved` - domain specific
  wrappers built on `sendNotification`.
- `isNewLoginIp(userId, ip)` (auth.service) - returns true when the IP has not
  been seen for that account before, used to decide whether to send the new
  sign-in alert.

All helpers are best-effort outside of the invite/reset flows: a send failure is
logged but does not abort the calling action.
