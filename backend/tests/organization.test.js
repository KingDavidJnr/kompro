const { request, app, createAdminSession } = require('./helpers');

describe('Organization settings', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('org');
  });

  it('returns the single organization record', async () => {
    const res = await request(app).get('/api/org/settings').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.organization.id).toBeTruthy();
    expect(res.body.data.organization.name).toBeTruthy();
  });

  it('updates organization settings', async () => {
    const displayName = `Acme Corp ${Date.now()}`;
    const res = await request(app)
      .patch('/api/org/settings')
      .set('Cookie', admin.cookie)
      .send({ displayName });
    expect(res.status).toBe(200);
    expect(res.body.data.organization.displayName).toBe(displayName);
  });
});
