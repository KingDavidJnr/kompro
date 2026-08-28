const { request, createAdminSession, uniqueEmail } = require('./helpers');

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
});
