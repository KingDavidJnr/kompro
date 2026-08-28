const { request, createAdminSession, uniqueEmail, getInviteToken } = require('./helpers');

describe('User invite + accept', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('invite');
  });

  it('invites a user by email (delivers email) and leaves them inactive', async () => {
    const email = uniqueEmail('invite');
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, name: 'Invitee' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.active).toBe(false);

    // An invitation was persisted (and an email sent to the Gmail inbox).
    const token = await getInviteToken(email);
    expect(token).toBeTruthy();
  });

  it('accepts the invitation using its token', async () => {
    const email = uniqueEmail('accept');
    await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, name: 'Acceptor' });
    const token = await getInviteToken(email);
    expect(token).toBeTruthy();

    const accept = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token, password: 'NewPass!234' });
    expect(accept.status).toBe(200);
    expect(accept.body.data.user.active).toBe(true);

    // The newly set credentials now authenticate.
    const login = await request(app).post('/api/auth/login').send({ email, password: 'NewPass!234' });
    expect(login.status).toBe(200);
  });

  it('resends an invitation', async () => {
    const email = uniqueEmail('resend');
    const created = await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, name: 'Resendee' });
    const id = created.body.data.user.id;

    const res = await request(app)
      .post(`/api/users/${id}/resend-invite`)
      .set('Cookie', admin.cookie);
    expect(res.status).toBe(200);

    const token = await getInviteToken(email);
    expect(token).toBeTruthy();
  });
});
