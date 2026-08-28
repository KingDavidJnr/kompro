const { request, app, createAdminSession } = require('./helpers');

describe('Frameworks, requirements and mappings', () => {
  let admin;
  let controlId;
  beforeAll(async () => {
    admin = await createAdminSession('frameworks');
    const control = await request(app)
      .post('/api/controls')
      .set('Cookie', admin.cookie)
      .send({ title: `Map Control ${Date.now()}`, category: 'security' });
    controlId = control.body.data.control.id;
  });

  it('creates, reads, lists and derives a framework', async () => {
    const create = await request(app)
      .post('/api/frameworks')
      .set('Cookie', admin.cookie)
      .send({ name: `Framework ${Date.now()}`, description: 'Test', enabled: true });
    expect(create.status).toBe(201);
    const fwId = create.body.data.framework.id;

    const get = await request(app).get(`/api/frameworks/${fwId}`).set('Cookie', admin.cookie);
    expect(get.status).toBe(200);

    const list = await request(app).get('/api/frameworks').set('Cookie', admin.cookie);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data.frameworks)).toBe(true);

    const status = await request(app)
      .get(`/api/frameworks/${fwId}/status`)
      .set('Cookie', admin.cookie);
    expect(status.status).toBe(200);
    expect(status.body.data).toHaveProperty('status');
  });

  it('creates a requirement, maps it to a control, then removes both', async () => {
    const fwName = `FW ${Date.now()}`;
    const fw = await request(app)
      .post('/api/frameworks')
      .set('Cookie', admin.cookie)
      .send({ name: fwName });
    const fwId = fw.body.data.framework.id;

    const req = await request(app)
      .post('/api/requirements')
      .set('Cookie', admin.cookie)
      .send({ frameworkId: fwId, code: 'A.1', title: `Requirement ${Date.now()}` });
    expect(req.status).toBe(201);
    const reqId = req.body.data.requirement.id;

    const listReq = await request(app).get('/api/requirements').set('Cookie', admin.cookie);
    expect(listReq.status).toBe(200);
    expect(Array.isArray(listReq.body.data.requirements)).toBe(true);

    const map = await request(app)
      .post(`/api/requirements/${reqId}/mappings`)
      .set('Cookie', admin.cookie)
      .send({ controlId });
    expect(map.status).toBe(201);
    expect(map.body.data.mapping).toBeTruthy();

    const unmap = await request(app)
      .delete(`/api/requirements/${reqId}/mappings/${controlId}`)
      .set('Cookie', admin.cookie);
    expect(unmap.status).toBe(200);

    const delReq = await request(app).delete(`/api/requirements/${reqId}`).set('Cookie', admin.cookie);
    expect(delReq.status).toBe(200);

    const delFw = await request(app).delete(`/api/frameworks/${fwId}`).set('Cookie', admin.cookie);
    expect(delFw.status).toBe(200);
  });
});
