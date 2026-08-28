const { request, createAdminSession, uniqueEmail, getInviteToken, getResetToken } = require('./helpers');

describe('Password reset', () => {
  let admin;
  beforeAll(async () => {
    admin = await createAdminSession('pw');
  });

  it('resets a password via the forgot/reset flow', async () => {
    const email = uniqueEmail('reset');
    await request(app)
      .post('/api/users')
      .set('Cookie', admin.cookie)
      .send({ email, name: 'ResetMe' });
    const inviteToken = await getInviteToken(email);
    await request(app)
      .post('/api/auth/accept-invite')
      .send({ token: inviteToken, password: 'Initial1!xx' });

    // Request a reset (email delivered to Gmail).
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);
    const resetToken = await getResetToken(email);
    expect(resetToken).toBeTruthy();

    // Complete the reset.
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'BrandNew9!zz' });
    expect(reset.status).toBe(200);

    // Old password is rejected; new password works.
    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: 'Initial1!xx' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email, password: 'BrandNew9!zz' });
    expect(newLogin.status).toBe(200);
  });
});
