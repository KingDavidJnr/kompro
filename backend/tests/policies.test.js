const { request, app, createAdminSession } = require('./helpers');
const emailService = require('../src/lib/email');

describe('Policy notifications', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('policy');
    const me = await request(app).get('/api/auth/me').set('Cookie', admin.cookie);
    admin.id = me.body.data.user.id;
  });

  it('emails active users when a policy is published', async () => {
    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .post('/api/policies')
      .set('Cookie', admin.cookie)
      .send({ title: `Policy ${Date.now()}`, status: 'active', description: 'New policy' });
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('emails active users when a draft policy is published via update', async () => {
    const draft = await request(app)
      .post('/api/policies')
      .set('Cookie', admin.cookie)
      .send({ title: `Draft ${Date.now()}`, status: 'draft' });
    const id = draft.body.data.policy.id;

    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .patch(`/api/policies/${id}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
