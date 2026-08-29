/**
 * Integration tests for the new GRC modules: Risk, Incidents, ITSM, Audit
 * Program and Policy lifecycle. Uses an admin session so every permission is
 * present; cleans up created rows at the end.
 */

const { request, app, prisma, createAdminSession } = require('./helpers');

let cookie;

beforeAll(async () => {
  ({ cookie } = await createAdminSession('grc'));
});

afterAll(async () => {
  // Best-effort cleanup of rows created during the run.
  await prisma.correctiveAction.deleteMany({});
  await prisma.nonconformity.deleteMany({});
  await prisma.auditPlan.deleteMany({});
  await prisma.incidentAction.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.capacityPlan.deleteMany({});
  await prisma.change.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.riskTreatment.deleteMany({});
  await prisma.kri.deleteMany({});
  await prisma.riskScenario.deleteMany({});
  await prisma.risk.deleteMany({});
  await prisma.policyVersion.deleteMany({});
  await prisma.policyChangeRequest.deleteMany({});
  await prisma.policyReview.deleteMany({});
  await prisma.policyException.deleteMany({});
  await prisma.policy.deleteMany({});
});

describe('Risk Management', () => {
  let riskId;

  test('creates a risk with computed score', async () => {
    const res = await request(app)
      .post('/api/risks')
      .set('Cookie', cookie)
      .send({ title: 'Data breach', likelihood: 4, impact: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.risk.score).toBe(20);
    riskId = res.body.data.risk.id;
  });

  test('adds scenario, KRI and treatment', async () => {
    const s = await request(app).post(`/api/risks/${riskId}/scenarios`).set('Cookie', cookie).send({ title: 'Phishing' });
    expect(s.status).toBe(201);

    const k = await request(app).post(`/api/risks/${riskId}/kris`).set('Cookie', cookie).send({ title: 'Failed logins', threshold: 10, currentValue: 15 });
    expect(k.status).toBe(201);
    expect(k.body.data.kri.status).toBe('breach');

    const t = await request(app).post(`/api/risks/${riskId}/treatments`).set('Cookie', cookie).send({ title: 'MFA rollout' });
    expect(t.status).toBe(201);
  });

  test('lists risks', async () => {
    const res = await request(app).get('/api/risks').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.risks)).toBe(true);
  });
});

describe('Incidents', () => {
  test('creates incident and response action', async () => {
    const inc = await request(app).post('/api/incidents').set('Cookie', cookie).send({ title: 'Outage', severity: 'high' });
    expect(inc.status).toBe(201);
    const id = inc.body.data.incident.id;

    const act = await request(app).post(`/api/incidents/${id}/actions`).set('Cookie', cookie).send({ action: 'Restart service' });
    expect(act.status).toBe(201);

    const upd = await request(app).patch(`/api/incidents/${id}/actions/${act.body.data.action.id}`).set('Cookie', cookie).send({ status: 'done' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.action.doneAt).toBeTruthy();
  });
});

describe('ITSM', () => {
  test('creates asset, change and capacity plan', async () => {
    const asset = await request(app).post('/api/itsm/assets').set('Cookie', cookie).send({ name: 'Web server' });
    expect(asset.status).toBe(201);
    const assetId = asset.body.data.asset.id;

    const change = await request(app).post('/api/itsm/changes').set('Cookie', cookie).send({ title: 'Patch', assetId });
    expect(change.status).toBe(201);

    const cap = await request(app).post('/api/itsm/capacity').set('Cookie', cookie).send({ resource: 'CPU', currentCapacity: 60 });
    expect(cap.status).toBe(201);
  });
});

describe('Audit Program', () => {
  test('creates plan with nonconformity and corrective action', async () => {
    const plan = await request(app).post('/api/audit-program').set('Cookie', cookie).send({ title: 'ISO surveillance' });
    expect(plan.status).toBe(201);
    const planId = plan.body.data.plan.id;

    const nc = await request(app).post(`/api/audit-program/${planId}/nonconformities`).set('Cookie', cookie).send({ description: 'Missing log' });
    expect(nc.status).toBe(201);
    const nid = nc.body.data.nonconformity.id;

    const ca = await request(app).post(`/api/audit-program/${planId}/nonconformities/${nid}/corrective-actions`).set('Cookie', cookie).send({ description: 'Add logging' });
    expect(ca.status).toBe(201);
  });
});

describe('Policy lifecycle', () => {
  test('creates policy plus version, change request, review and exception', async () => {
    const policy = await request(app).post('/api/policies').set('Cookie', cookie).send({ title: 'Acceptable use', content: 'Be good' });
    expect(policy.status).toBe(201);
    const pid = policy.body.data.policy.id;

    const ver = await request(app).post(`/api/policies/${pid}/versions`).set('Cookie', cookie).send({ content: 'Be very good' });
    expect(ver.status).toBe(201);
    expect(ver.body.data.version.version).toBe(2);

    const cr = await request(app).post(`/api/policies/${pid}/change-requests`).set('Cookie', cookie).send({ reason: 'Update' });
    expect(cr.status).toBe(201);

    const rev = await request(app).post(`/api/policies/${pid}/reviews`).set('Cookie', cookie).send({ notes: 'Annual' });
    expect(rev.status).toBe(201);

    const exc = await request(app).post(`/api/policies/${pid}/exceptions`).set('Cookie', cookie).send({ reason: 'Legacy system' });
    expect(exc.status).toBe(201);
  });
});
