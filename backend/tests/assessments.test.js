const { request, app, createAdminSession } = require('./helpers');
const emailService = require('../src/lib/email');

describe('Assessment notifications', () => {
  let admin;
  let controlId;
  beforeAll(async () => {
    admin = await createAdminSession('assess');
    const me = await request(app).get('/api/auth/me').set('Cookie', admin.cookie);
    admin.id = me.body.data.user.id;
    const control = await request(app)
      .post('/api/controls')
      .set('Cookie', admin.cookie)
      .send({ title: `Control ${Date.now()}`, category: 'security' });
    controlId = control.body.data.control.id;
  });

  it('emails the assessor when assigned', async () => {
    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .post('/api/assessments')
      .set('Cookie', admin.cookie)
      .send({
        controlId,
        result: 'satisfied',
        assessorId: admin.id,
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      });
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('emails the new assessor when reassigned', async () => {
    const initial = await createAdminSession('assessInitial');
    const me = await request(app).get('/api/auth/me').set('Cookie', initial.cookie);
    const initialId = me.body.data.user.id;

    const created = await request(app)
      .post('/api/assessments')
      .set('Cookie', admin.cookie)
      .send({ controlId, result: 'satisfied', assessorId: initialId });
    const id = created.body.data.assessment.id;

    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .patch(`/api/assessments/${id}`)
      .set('Cookie', admin.cookie)
      .send({ assessorId: admin.id });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
