/**
 * Overdue assessment notifier.
 *
 * Scans for assessments whose due date has passed and that have not yet been
 * flagged as notified, emails the assigned assessor, and marks them notified so
 * each overdue assessment is reported only once. Intended to be run on a schedule
 * (for example via cron calling `npm run notify:due`).
 */

const prisma = require('../src/lib/prisma');
const emailService = require('../src/lib/email');
const config = require('../src/config');

async function main() {
  if (!config.smtp.host) {
    console.log('SMTP is not configured; no overdue notices sent.');
    return;
  }

  const now = new Date();
  const overdue = await prisma.assessment.findMany({
    where: { dueDate: { lt: now }, overdueNotified: false, assessorId: { not: null } },
    include: {
      control: { select: { title: true } },
      assessor: { select: { email: true, name: true } },
    },
  });

  let sent = 0;
  for (const assessment of overdue) {
    try {
      await emailService.sendNotification({
        to: assessment.assessor.email,
        heading: `Overdue assessment on ${config.orgName}`,
        paragraphs: [
          `Hi ${assessment.assessor.name || 'there'},`,
          `The assessment for control "${assessment.control.title}" on ${config.orgName} was due by ${assessment.dueDate.toUTCString()} and is now overdue.`,
        ],
      });
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { overdueNotified: true },
      });
      sent += 1;
    } catch (err) {
      console.error(`Failed overdue notice for assessment ${assessment.id}: ${err.message}`);
    }
  }

  console.log(`Sent ${sent} overdue assessment notification(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
