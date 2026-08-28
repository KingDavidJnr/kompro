# Scheduled notification scripts

These scripts run outside the API process (cron, CI job, or `npm run` from the
command line) and read the same backend `.env` as the server.

## notify-due

`npm run notify:due`

Scans assessments that are overdue: their `dueDate` is in the past, they still
have an `assessorId`, and `overdueNotified` is false. For each one it emails the
assessor once via `sendNotification` and sets `overdueNotified = true` so the
notification is not repeated on the next run.

Run this on a schedule (for example daily) so assessors are reminded about
assessments that missed their due date. It is safe to run repeatedly; already
notified assessments are skipped.
