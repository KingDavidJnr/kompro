const fs = require('fs');
const os = require('os');
const path = require('path');
const { request, app, createAdminSession } = require('./helpers');
const emailService = require('../src/lib/email');

describe('Evidence file storage', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('evidence');
    const me = await request(app).get('/api/auth/me').set('Cookie', admin.cookie);
    admin.id = me.body.data.user.id;
  });

  it('uploads a file, serves it back, then deletes it', async () => {
    const content = 'hello kompro evidence';
    const tmp = path.join(os.tmpdir(), `kompro-test-${Date.now()}.txt`);
    fs.writeFileSync(tmp, content);

    const form = request(app)
      .post('/api/evidence')
      .set('Cookie', admin.cookie);
    form.field('title', 'Test Evidence');
    form.field('source', 'manual');
    form.attach('file', tmp);
    const res = await form;
    expect(res.status).toBe(201);
    const id = res.body.data.evidence.id;
    expect(res.body.data.evidence.filePath).toBeTruthy();

    const download = await request(app).get(`/api/evidence/${id}/file`).set('Cookie', admin.cookie);
    expect(download.status).toBe(200);
    expect(download.text).toBe(content);

    const del = await request(app).delete(`/api/evidence/${id}`).set('Cookie', admin.cookie);
    expect(del.status).toBe(200);

    fs.unlinkSync(tmp);
  });

  it('requests evidence from a user and emails them', async () => {
    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .post('/api/evidence/request')
      .set('Cookie', admin.cookie)
      .send({ title: 'Please provide firewall config', requestedFromUserId: admin.id });
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('emails the uploader when their evidence is accepted', async () => {
    const content = 'evidence for status test';
    const tmp = path.join(os.tmpdir(), `kompro-status-${Date.now()}.txt`);
    fs.writeFileSync(tmp, content);

    const form = request(app).post('/api/evidence').set('Cookie', admin.cookie);
    form.field('title', 'Status Test');
    form.field('source', 'manual');
    form.attach('file', tmp);
    const created = await form;
    const id = created.body.data.evidence.id;

    const spy = jest.spyOn(emailService, 'sendNotification');
    const res = await request(app)
      .patch(`/api/evidence/${id}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();

    fs.unlinkSync(tmp);
  });
});
