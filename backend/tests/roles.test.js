const { request, app, createAdminSession } = require('./helpers');

describe('Roles and permissions', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('roles');
  });

  it('lists roles', async () => {
    const res = await request(app).get('/api/roles').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.roles)).toBe(true);
  });

  it('lists the seeded permission set', async () => {
    const res = await request(app).get('/api/roles/permissions').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.permissions)).toBe(true);
    expect(res.body.data.permissions.length).toBeGreaterThan(0);
  });

  it('creates, reads, updates and deletes a role', async () => {
    const name = `tester-${Date.now()}`;
    const create = await request(app)
      .post('/api/roles')
      .set('Cookie', admin.cookie)
      .send({ name, description: 'Test role', permissions: ['org:read'] });
    expect(create.status).toBe(201);
    expect(create.body.data.role.id).toBeTruthy();
    const id = create.body.data.role.id;

    const get = await request(app).get(`/api/roles/${id}`).set('Cookie', admin.cookie);
    expect(get.status).toBe(200);
    expect(get.body.data.role.name).toBe(name);

    const update = await request(app)
      .patch(`/api/roles/${id}`)
      .set('Cookie', admin.cookie)
      .send({ description: 'Updated' });
    expect(update.status).toBe(200);
    expect(update.body.data.role.description).toBe('Updated');

    const del = await request(app).delete(`/api/roles/${id}`).set('Cookie', admin.cookie);
    expect(del.status).toBe(200);
  });

  it('rejects a role with an unknown permission', async () => {
    const name = `badperm-${Date.now()}`;
    const res = await request(app)
      .post('/api/roles')
      .set('Cookie', admin.cookie)
      .send({ name, permissions: ['does:not-exist'] });
    expect(res.status).toBe(400);
  });
});
