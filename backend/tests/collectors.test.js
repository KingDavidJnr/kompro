const { request, app, createAdminSession, prisma } = require('./helpers');
const collectorService = require('../src/modules/evidence/collector.service');

// The shared remote test database adds latency; give the multi-request
// scenarios enough headroom to complete.
jest.setTimeout(120000);

describe('Evidence collectors', () => {
  let admin;
  let controlId;

  beforeAll(async () => {
    admin = await createAdminSession('collectors');
    const control = await prisma.control.create({
      data: { title: 'Collector test control' },
    });
    controlId = control.id;
  });

  afterAll(async () => {
    if (controlId) {
      await prisma.control.deleteMany({ where: { id: controlId } });
    }
  });

  it('creates a collector with secrets stored encrypted (admin only)', async () => {
    const res = await request(app)
      .post('/api/evidence/collectors')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Stale controls',
        type: 'sql',
        enabled: false,
        cadenceMinutes: 360,
        params: { sql: 'SELECT 1 AS title', titleColumn: 'title' },
        secrets: { apiKey: 'super-secret' },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.collector.id).toBeTruthy();

    // Secrets must be encrypted at rest, never stored as plaintext.
    const row = await prisma.collectorConfig.findUnique({
      where: { id: res.body.data.collector.id },
    });
    expect(typeof row.secrets).toBe('string');
    expect(row.secrets).toContain('.');
    expect(row.secrets).not.toContain('super-secret');

    await prisma.collectorConfig.deleteMany({ where: { id: row.id } });
  });

  it('lists configured collectors', async () => {
    const res = await request(app).get('/api/evidence/collectors').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.collectors)).toBe(true);
  });

  it('runs a SQL collector and ingests attributed, automated evidence', async () => {
    const create = await request(app)
      .post('/api/evidence/collectors')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Control proof',
        type: 'sql',
        enabled: true,
        cadenceMinutes: 360,
        params: {
          sql: `SELECT id, title FROM "Control" WHERE id = '${controlId}'`,
          titleColumn: 'title',
          controlIdColumn: 'id',
        },
      });
    expect(create.status).toBe(201);
    const id = create.body.data.collector.id;

    const run = await request(app)
      .post(`/api/evidence/collectors/${id}/run`)
      .set('Cookie', admin.cookie);
    expect(run.status).toBe(200);
    expect(run.body.data.status).toBe('success');
    expect(run.body.data.added).toBeGreaterThanOrEqual(1);

    const evidence = await prisma.evidence.findFirst({
      where: { controlId, source: 'automated_check' },
    });
    expect(evidence).toBeTruthy();
    expect(evidence.collectedAt).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'collect', entity: 'evidence', entityId: id },
    });
    expect(audit).toBeTruthy();

    await prisma.collectorConfig.deleteMany({ where: { id } });
  });

  it('runs due collectors through the scheduler service', async () => {
    const created = await prisma.collectorConfig.create({
      data: {
        name: 'Due test',
        type: 'sql',
        enabled: true,
        cadenceMinutes: 360,
        params: { sql: 'SELECT 1 AS title', titleColumn: 'title' },
        nextRunAt: new Date(Date.now() - 1000),
      },
    });

    const results = await collectorService.runDueCollectors();
    expect(results.some((r) => r.status === 'success' || r.status === 'error')).toBe(true);

    const after = await prisma.collectorConfig.findUnique({ where: { id: created.id } });
    expect(after.lastRunAt).toBeTruthy();

    await prisma.collectorConfig.deleteMany({ where: { id: created.id } });
  });
});
