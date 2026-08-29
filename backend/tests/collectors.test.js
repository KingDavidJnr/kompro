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

  it('returns a collector run history derived from the audit log', async () => {
    const create = await request(app)
      .post('/api/evidence/collectors')
      .set('Cookie', admin.cookie)
      .send({
        name: 'History proof',
        type: 'sql',
        enabled: true,
        cadenceMinutes: 360,
        params: { sql: 'SELECT 1 AS title', titleColumn: 'title' },
      });
    expect(create.status).toBe(201);
    const id = create.body.data.collector.id;

    await request(app).post(`/api/evidence/collectors/${id}/run`).set('Cookie', admin.cookie);

    const res = await request(app)
      .get(`/api/evidence/collectors/${id}/runs`)
      .set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data.runs)).toBe(true);
    expect(res.body.data.runs[0].action).toBe('collect');

    await prisma.collectorConfig.deleteMany({ where: { id } });
  });

  it('returns 404 run history for an unknown collector', async () => {
    const res = await request(app)
      .get('/api/evidence/collectors/does-not-exist/runs')
      .set('Cookie', admin.cookie);
    expect(res.status).toBe(404);
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

const httpCollector = require('../src/modules/evidence/collectors/http');
const fileCollector = require('../src/modules/evidence/collectors/file');
const { getCollector } = require('../src/modules/evidence/collectors');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('Collector adapters', () => {
  it('registers sql, http and file collectors', () => {
    expect(getCollector('sql').type).toBe('sql');
    expect(getCollector('http').type).toBe('http');
    expect(getCollector('file').type).toBe('file');
  });

  it('http collector maps a REST response with apiKey auth', async () => {
    const fetchMock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ workflow_runs: [{ name: 'build', head_commit: { message: 'fixed' } }] }),
    });
    const items = await httpCollector.collect({
      fetch: fetchMock,
      params: {
        url: 'https://api.github.com/repos/x/y/actions/runs',
        headers: { Accept: 'application/vnd.github+json' },
        auth: { type: 'apiKey', header: 'Authorization', prefix: 'Bearer ', value: '{{secret.token}}' },
        itemsPath: 'workflow_runs',
        mapping: { title: 'name', description: 'head_commit.message' },
      },
      secrets: { token: 'abc' },
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('build');
    expect(items[0].description).toBe('fixed');
  });

  it('http collector performs an oauth2 client-credentials exchange', async () => {
    let sentAuth;
    const fetchMock = async (url, opts) => {
      if (String(url).includes('/oauth2/v1/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok123' }) };
      }
      sentAuth = opts.headers.Authorization;
      return {
        ok: true,
        status: 200,
        json: async () => ({ users: [{ profile: { email: 'a@b.com', login: 'a' } }] }),
      };
    };
    const items = await httpCollector.collect({
      fetch: fetchMock,
      params: {
        url: 'https://x.okta.com/api/v1/users',
        auth: {
          type: 'oauth2',
          tokenUrl: 'https://x.okta.com/oauth2/v1/token',
          clientId: '{{secret.clientId}}',
          clientSecret: '{{secret.clientSecret}}',
        },
        itemsPath: 'users',
        mapping: { title: 'profile.email' },
      },
      secrets: { clientId: 'cid', clientSecret: 'csec' },
    });
    expect(sentAuth).toBe('Bearer tok123');
    expect(items[0].title).toBe('a@b.com');
  });

  it('http collector signs AWS requests with SigV4', async () => {
    let captured;
    const fetchMock = async (url, opts) => {
      captured = opts.headers;
      return { ok: true, status: 200, json: async () => ({ findings: [] }) };
    };
    await httpCollector.collect({
      fetch: fetchMock,
      params: {
        method: 'POST',
        url: 'https://securityhub.us-east-1.amazonaws.com/accounts/123/findings',
        auth: {
          type: 'aws',
          service: 'securityhub',
          region: 'us-east-1',
          accessKeyId: '{{secret.accessKeyId}}',
          secretAccessKey: '{{secret.secretAccessKey}}',
        },
        itemsPath: 'findings',
        mapping: { title: 'Title' },
      },
      secrets: { accessKeyId: 'AKID', secretAccessKey: 'secret' },
    });
    expect(captured.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//);
    expect(captured['X-Amz-Date']).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it('file collector reads files from a directory', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kompro-file-'));
    fs.writeFileSync(path.join(dir, 'report.json'), 'hello compliance');
    const items = await fileCollector.collect({ params: { path: dir, pattern: '*.json' } });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('report.json');
    expect(items[0].content).toContain('hello compliance');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('ingests a file collector end to end and tags the evidence', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kompro-file-e2e-'));
    fs.writeFileSync(path.join(dir, 'proof.json'), 'end-to-end proof');
    const cfg = await prisma.collectorConfig.create({
      data: { name: 'File proof', type: 'file', enabled: true, params: { path: dir } },
    });
    const result = await collectorService.runCollectorNow(cfg.id);
    expect(result.status).toBe('success');
    expect(result.added).toBeGreaterThanOrEqual(1);

    const evidence = await prisma.evidence.findFirst({
      where: { collectorId: cfg.id, source: 'automated_check' },
    });
    expect(evidence).toBeTruthy();
    expect(evidence.content).toContain('end-to-end proof');

    await prisma.evidence.deleteMany({ where: { collectorId: cfg.id } });
    await prisma.collectorConfig.deleteMany({ where: { id: cfg.id } });
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
