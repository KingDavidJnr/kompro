const { request, app, createAdminSession, uniqueEmail } = require('./helpers');
const emailService = require('../src/lib/email');
const prisma = require('../src/lib/prisma');

describe('Auth', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('auth');
  });

  it('registers the first user as admin and authenticates', async () => {
    const me = await request(app).get('/api/auth/me').set('Cookie', admin.cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(admin.email);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rate limits login per account email, not per IP', async () => {
    const email = uniqueEmail('ratelimit');
    let lastStatus = 200;
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'whatever' });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('emails the user on sign-in from a new IP', async () => {
    const email = uniqueEmail('newip');
    await request(app).post('/api/auth/register').send({ email, password: 'Sup3rSecret!123', name: 'NewIp' });
    // Seed a prior sign-in from a different address so this one is "new".
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.auditLog.create({
      data: { actorId: user.id, action: 'login', entity: 'user', entityId: user.id, ip: '10.0.0.1' },
    });

    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Sup3rSecret!123' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
