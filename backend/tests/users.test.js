const { request, createAdminSession, uniqueEmail } = require('./helpers');

describe('Users CRUD + lifecycle', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('users');
  });

  it('creates, reads, updates and lists users', async () => {
    const email = uniqueEmail('crud');
    const create = await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, password: 'Temp1234!a', name: 'CRUD' });
    expect(create.status).toBe(201);
    const id = create.body.data.user.id;

    const get = await request(app).get(`/api/users/${id}`).set('Cookie', admin.cookie);
    expect(get.status).toBe(200);
    expect(get.body.data.user.email).toBe(email);

    const update = await request(app)
      .patch(`/api/users/${id}`)
      .set('Cookie', admin.cookie)
      .send({ name: 'Updated' });
    expect(update.status).toBe(200);
    expect(update.body.data.user.name).toBe('Updated');

    const list = await request(app).get('/api/users').set('Cookie', admin.cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('refuses to delete the last admin', async () => {
    const me = await request(app).get('/api/auth/me').set('Cookie', admin.cookie);
    const id = me.body.data.user.id;
    const del = await request(app).delete(`/api/users/${id}`).set('Cookie', admin.cookie);
    expect(del.status).toBe(400);
    expect(del.body.message).toMatch(/last admin/i);
  });

  it('deactivates and reactivates a user', async () => {
    const email = uniqueEmail('lifecycle');
    const create = await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, password: 'Temp1234!a', name: 'Life' });
    const id = create.body.data.user.id;

    const deact = await request(app).post(`/api/users/${id}/deactivate`).set('Cookie', admin.cookie);
    expect(deact.status).toBe(200);
    expect(deact.body.data.user.active).toBe(false);

    const react = await request(app).post(`/api/users/${id}/reactivate`).set('Cookie', admin.cookie);
    expect(react.status).toBe(200);
    expect(react.body.data.user.active).toBe(true);
  });
});
