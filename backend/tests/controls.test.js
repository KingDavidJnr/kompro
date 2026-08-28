const { request, app, createAdminSession } = require('./helpers');

describe('Controls module', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('controls');
  });

  it('creates, reads, updates and deletes a control', async () => {
    const create = await request(app)
      .post('/api/controls')
      .set('Cookie', admin.cookie)
      .send({ title: `Control ${Date.now()}`, category: 'security', status: 'not_implemented' });
    expect(create.status).toBe(201);
    expect(create.body.data.control.id).toBeTruthy();
    // New controls default to not_implemented when omitted.
    expect(create.body.data.control.status).toBe('not_implemented');
    const id = create.body.data.control.id;

    const get = await request(app).get(`/api/controls/${id}`).set('Cookie', admin.cookie);
    expect(get.status).toBe(200);
    expect(get.body.data.control.id).toBe(id);

    const update = await request(app)
      .patch(`/api/controls/${id}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'implemented' });
    expect(update.status).toBe(200);
    expect(update.body.data.control.status).toBe('implemented');

    const del = await request(app).delete(`/api/controls/${id}`).set('Cookie', admin.cookie);
    expect(del.status).toBe(200);
  });

  it('lists controls', async () => {
    const res = await request(app).get('/api/controls').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.controls)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(0);
  });

  it('rejects a control with no title', async () => {
    const res = await request(app)
      .post('/api/controls')
      .set('Cookie', admin.cookie)
      .send({ category: 'security' });
    expect(res.status).toBe(400);
  });
});
