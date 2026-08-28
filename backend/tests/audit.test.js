const { request, app, createAdminSession, uniqueEmail, prisma } = require('./helpers');
const emailService = require('../src/lib/email');

describe('Audit log', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('audit');
  });

  it('records an audit entry when a user is invited', async () => {
    const email = uniqueEmail('auditin');
    await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, name: 'Audited' });

    const list = await request(app)
      .get('/api/audit')
      .set('Cookie', admin.cookie)
      .query({ entity: 'user', action: 'invite' });
    expect(list.status).toBe(200);
    expect(list.body.data.entries.length).toBeGreaterThanOrEqual(1);
  });

  it('exports audit entries as CSV', async () => {
    const exp = await request(app)
      .get('/api/audit/export')
      .set('Cookie', admin.cookie)
      .query({ format: 'csv' });
    expect(exp.status).toBe(200);
    expect(exp.headers['content-type']).toMatch(/text\/csv/);
  });

  it('emails the admin when the audit log is exported', async () => {
    const spy = jest.spyOn(emailService, 'sendNotification');
    const exp = await request(app)
      .get('/api/audit/export')
      .set('Cookie', admin.cookie)
      .query({ format: 'json' });
    expect(exp.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('lets an admin purge old entries (audited)', async () => {
    const adminUser = await prisma.user.findUnique({ where: { email: admin.email } });
    const oldEntry = await prisma.auditLog.create({
      data: {
        action: 'system',
        entity: 'audit',
        entityId: 'purge-test-old',
        actorId: adminUser.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    const recentEntry = await prisma.auditLog.create({
      data: {
        action: 'system',
        entity: 'audit',
        entityId: 'purge-test-recent',
        actorId: adminUser.id,
      },
    });

    const res = await request(app).post('/api/audit/purge').set('Cookie', admin.cookie).send({ days: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBeGreaterThanOrEqual(1);

    const oldGone = await prisma.auditLog.findUnique({ where: { id: oldEntry.id } });
    expect(oldGone).toBeNull();
    const recentStill = await prisma.auditLog.findUnique({ where: { id: recentEntry.id } });
    expect(recentStill).toBeTruthy();

    const purgeEntry = await prisma.auditLog.findFirst({
      where: { action: 'purge', entity: 'audit' },
    });
    expect(purgeEntry).toBeTruthy();
  });
});
