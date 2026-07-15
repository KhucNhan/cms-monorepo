import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

vi.mock('bcrypt');
vi.mock('axios');

describe('AuthService.exchangeGoogleCode — existing users only, no auto-create', () => {
  let prismaMock: any;
  let usersServiceMock: any;
  let service: AuthService;
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock = { user: { update: vi.fn() } };
    usersServiceMock = { findUserByGoogleProfile: vi.fn() };
    service = new AuthService(
      prismaMock,
      { sign: vi.fn().mockReturnValue('jwt') } as any,
      usersServiceMock,
    );
    process.env['GOOGLE_CLIENT_ID'] = 'client-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'client-secret';
    process.env['GOOGLE_CALLBACK_URL'] = 'https://api.example.com/callback';
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('không tìm thấy user khớp → trả về null, KHÔNG có bất kỳ đường nào tạo user mới', async () => {
    (axios.post as any).mockResolvedValue({ data: { access_token: 'google-token' } });
    (axios.get as any).mockResolvedValue({
      data: { id: 'google-123', email: 'unknown@gmail.com', verified_email: true },
    });
    usersServiceMock.findUserByGoogleProfile.mockResolvedValue(null);

    const result = await service.exchangeGoogleCode('auth-code');

    expect(result).toBeNull();
    expect(usersServiceMock.findUserByGoogleProfile).toHaveBeenCalledWith({
      googleId: 'google-123',
      email: 'unknown@gmail.com',
      displayName: null,
      avatarUrl: null,
    });
  });

  it('email chưa verified_email → reject ngay, không gọi tới UsersService', async () => {
    (axios.post as any).mockResolvedValue({ data: { access_token: 'google-token' } });
    (axios.get as any).mockResolvedValue({
      data: { id: 'google-123', email: 'x@gmail.com', verified_email: false },
    });

    const result = await service.exchangeGoogleCode('auth-code');

    expect(result).toBeNull();
    expect(usersServiceMock.findUserByGoogleProfile).not.toHaveBeenCalled();
  });

  it('tìm thấy user khớp → issue JWT qua loginWithGoogle bình thường', async () => {
    (axios.post as any).mockResolvedValue({ data: { access_token: 'google-token' } });
    (axios.get as any).mockResolvedValue({
      data: {
        id: 'google-123',
        email: 'admin@cms.com',
        name: 'Admin',
        picture: 'pic.jpg',
        verified_email: true,
      },
    });
    usersServiceMock.findUserByGoogleProfile.mockResolvedValue({
      id: 'u1',
      email: 'admin@cms.com',
      roleId: 'r1',
      role: { rolePermissions: [] },
    });
    (bcrypt.hash as any).mockResolvedValue('hash');

    const result = await service.exchangeGoogleCode('auth-code');

    expect(result).toEqual({ accessToken: 'jwt', refreshToken: 'jwt' });
  });
});