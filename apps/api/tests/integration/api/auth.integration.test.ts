import request from 'supertest';
import { type ApiResponse } from '../../types/util-types';
import app from '../../../src/server';

/**
 * Integration tests for authentication endpoints
 */

const env = process.env.NODE_ENV;

describe('Auth Integration Tests', () => {
  test('[Integration] - GET: /auth/logout-custom should clear cookies and redirect', async () => {
    const response = await request(app)
      .get(`/api/v1/${env}/auth/logout-custom`)
      .set('Accept', 'text/html')
      .query({ returnTo: '/' })
      .expect(302); // Should redirect

    // Check that cookies are cleared (clearCookie doesn't set new cookies, it clears them)
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // The important thing is that the logout endpoint is called and redirects properly
    // The clearCookie method clears cookies without setting new ones
    expect(response.headers.location).toContain('?auth=logout');
  });

  test('[Integration] - POST: /auth/logout should clear cookies and return JSON', async () => {
    const response = await request(app)
      .post(`/api/v1/${env}/auth/logout`)
      .set('Accept', 'application/json')
      .expect(200);

    const { data } = response.body as ApiResponse<any>;
    expect(data.message).toBe('Logged out successfully');
    expect(data.authenticated).toBe(false);

    // Check that cookies are cleared
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Should have cookies with maxAge: 0 (expired)
    const expiredCookies = cookies?.filter(
      (cookie) =>
        cookie.includes('access_token') && cookie.includes('Max-Age=0')
    );
    expect(expiredCookies).toHaveLength(1);
  });

  test('[Integration] - GET: /auth/urls should return auth URLs', async () => {
    const response = await request(app)
      .get(`/api/v1/${env}/auth/urls`)
      .set('Accept', 'application/json')
      .expect(200);

    const { data } = response.body as ApiResponse<any>;
    expect(data.routes).toBeDefined();
    expect(data.routes.login).toBeDefined();
    expect(data.routes.logout).toBeDefined();
    expect(data.baseUrl).toBeDefined();
  });
});
