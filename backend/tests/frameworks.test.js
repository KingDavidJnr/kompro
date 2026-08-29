const { request, app, createAdminSession, prisma } = require('./helpers');

// The shared remote test database adds latency; give the multi-request
// scenarios enough headroom to complete.
jest.setTimeout(120000);

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

  it('computes readiness with percentage, breakdown and gaps', async () => {
    // Seed the scenario directly to avoid one HTTP round trip per entity on the
    // slow shared test database; only the readiness endpoint is exercised over HTTP.
    const fw = await prisma.framework.create({
      data: { name: `Readiness FW ${Date.now()}`, enabled: true },
    });
    const [c1, c2, c3] = await Promise.all([
      prisma.control.create({ data: { title: `Readiness c1 ${Date.now()}` } }),
      prisma.control.create({ data: { title: `Readiness c2 ${Date.now()}` } }),
      prisma.control.create({ data: { title: `Readiness c3 ${Date.now()}` } }),
    ]);
    const [r1, r2, r3, r4] = await Promise.all([
      prisma.frameworkRequirement.create({ data: { frameworkId: fw.id, code: 'A.1', title: 'R1' } }),
      prisma.frameworkRequirement.create({ data: { frameworkId: fw.id, code: 'A.2', title: 'R2' } }),
      prisma.frameworkRequirement.create({ data: { frameworkId: fw.id, code: 'A.3', title: 'R3' } }),
      prisma.frameworkRequirement.create({ data: { frameworkId: fw.id, code: 'A.4', title: 'R4' } }),
    ]);
    // r1 -> c1 (satisfied), r2 -> c2 (unsatisfied), r3 -> c3 (unassessed), r4 -> unmapped.
    await Promise.all([
      prisma.mapping.create({ data: { requirementId: r1.id, controlId: c1.id } }),
      prisma.mapping.create({ data: { requirementId: r2.id, controlId: c2.id } }),
      prisma.mapping.create({ data: { requirementId: r3.id, controlId: c3.id } }),
      prisma.assessment.create({ data: { controlId: c1.id, result: 'satisfied' } }),
      prisma.assessment.create({ data: { controlId: c2.id, result: 'unsatisfied' } }),
    ]);

    const res = await request(app).get(`/api/frameworks/${fw.id}/readiness`).set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.totalRequirements).toBe(4);
    expect(data.satisfied).toBe(1);
    expect(data.readinessPercent).toBe(25);
    expect(data.breakdown.satisfied).toBe(1);
    expect(data.breakdown.unsatisfied).toBe(1);
    expect(data.breakdown.unassessed).toBe(1);
    expect(data.breakdown.unmapped).toBe(1);
    expect(data.gaps).toHaveLength(3);
    const gapStatuses = data.gaps.map((g) => g.status).sort();
    expect(gapStatuses).toEqual(['unassessed', 'unmapped', 'unsatisfied']);
    // The satisfied requirement is not listed as a gap.
    const gapReqIds = data.gaps.map((g) => g.requirement.id);
    expect(gapReqIds).not.toContain(r1.id);

    await prisma.framework.delete({ where: { id: fw.id } });
    await prisma.control.deleteMany({ where: { id: { in: [c1.id, c2.id, c3.id] } } });
  });
});
