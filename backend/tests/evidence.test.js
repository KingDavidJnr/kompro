const fs = require('fs');
const os = require('os');
const path = require('path');
const { request, app, createAdminSession } = require('./helpers');

describe('Evidence file storage', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('evidence');
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
});
