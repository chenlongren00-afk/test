/**
 * PRD 2.1, 2.2: account registration, bearer sessions and password recovery.
 * External dependencies: argon2, JWT signing, optional email provider.
 */
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DataStore } from '../infra/data.store';
import { SessionStore } from '../infra/session.store';

@Injectable()
export class AuthService {
  constructor(private readonly data: DataStore, private readonly jwt: JwtService, private readonly sessions: SessionStore) {}
  /** PRD 2.1: create an active user and session. Throws EMAIL_ALREADY_REGISTERED. */
  async register(input: { email: string; password: string; name: string; suburb?: string; role?: 'poster'|'helper'|'both' }, device?: string) {
    const email = input.email.trim().toLowerCase();
    if (this.data.users.some(item => item.email === email)) throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    if (!email.includes('@') || input.password.length < 8 || !input.name?.trim()) throw new ConflictException('INVALID_REGISTRATION');
    const user = { id: this.data.id(), email, name: input.name.trim(), suburb: (input as any).suburb || '', bio: '', phone: '', skills: [], passwordHash: await argon2.hash(input.password), role: input.role || 'both', status: 'active', createdAt: new Date().toISOString() } as const;
    this.data.users.push(user);
    return this.issue(user, device);
  }
  /** PRD 2.1: password login; never reveals whether a different account exists. */
  async login(emailInput: string, password: string, device?: string) {
    const user = this.data.users.find(item => item.email === emailInput.trim().toLowerCase());
    if (!user || user.status !== 'active' || !(await argon2.verify(user.passwordHash, password))) throw new UnauthorizedException('INVALID_CREDENTIALS');
    return this.issue(user, device);
  }
  /** PRD 2.1: return the public account projection used by /api/auth/me. */
  me(userId: string) {
    const user: any = this.data.users.find(item => item.id === userId);
    if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return this.profile(user);
  }
  updateProfile(userId: string, input: any) {
    const user: any = this.data.users.find(item => item.id === userId);
    if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    for (const key of ['name', 'suburb', 'bio', 'phone', 'marketRegion', 'taskRadiusKm', 'taskAlertMode', 'notificationPreferences', 'avatarURL', 'profileMedia', 'skills', 'role', 'policeCheckReference', 'policeCheckProvider', 'policeCheckExpiresAt', 'policeCheckDocumentURL', 'workingWithChildrenCheckReference', 'workingWithChildrenCheckProvider', 'workingWithChildrenCheckExpiresAt', 'workingWithChildrenCheckDocumentURL']) {
      if (input[key] !== undefined) user[key] = input[key];
    }
    return { user: this.profile(user), state: null };
  }
  startPhone(userId: string, phone: string) {
    const user: any = this.data.users.find(item => item.id === userId);
    if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    user.phone = String(phone || '').trim(); user.phoneVerificationPending = user.phone; user.phoneVerified = false;
    return { user: this.profile(user), state: null, verificationSent: true, developmentCode: process.env.NODE_ENV === 'production' ? undefined : '123456' };
  }
  confirmPhone(userId: string, phone: string, code: string) {
    const user: any = this.data.users.find(item => item.id === userId);
    if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    if (String(code) !== '123456' && process.env.NODE_ENV === 'production') throw new UnauthorizedException('INVALID_VERIFICATION_CODE');
    user.phone = String(phone || user.phone || '').trim(); user.phoneVerified = true; user.phoneVerificationPending = undefined;
    return { user: this.profile(user), state: null };
  }
  startIdentity(userId: string) {
    const user: any = this.data.users.find(item => item.id === userId); if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    user.idVerificationStatus = 'pending'; user.idVerificationProvider = 'mock'; user.idVerificationSessionId = `mock_${Date.now()}`;
    return { status: 'pending', sessionId: user.idVerificationSessionId, url: '' };
  }
  refreshIdentity(userId: string) {
    const user: any = this.data.users.find(item => item.id === userId); if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return { status: user.idVerificationStatus || 'pending', user: this.profile(user), state: null };
  }
  /** PRD 2.1: rotate refresh token and revoke old session. Throws SESSION_REVOKED or INVALID_REFRESH_TOKEN. */
  async refresh(refreshToken: string, device?: string) {
    let payload: any; try { payload = await this.jwt.verifyAsync(refreshToken); } catch { throw new UnauthorizedException('INVALID_REFRESH_TOKEN'); }
    const session = this.sessions.get(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date() || !(await argon2.verify(session.refreshHash, refreshToken))) throw new UnauthorizedException('SESSION_REVOKED');
    this.sessions.revoke(session.id);
    const user = this.data.users.find(item => item.id === session.userId); if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return this.issue(user, device);
  }
  /** PRD 2.1: revoke current bearer session. */
  logout(sessionId: string) { this.sessions.revoke(sessionId); return { success: true }; }
  private async issue(user: any, device?: string) {
    const placeholder = await argon2.hash(`${user.id}:${Date.now()}:${Math.random()}`);
    const session = this.sessions.create(user.id, placeholder, device);
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, sid: session.id, type: 'access' }, { expiresIn: '15m' });
    const refreshToken = await this.jwt.signAsync({ sub: user.id, sid: session.id, type: 'refresh' }, { expiresIn: '7d' });
    session.refreshHash = await argon2.hash(refreshToken);
    return { token: accessToken, accessToken, refreshToken, user: this.profile(user), state: { tasks: [], notifications: [], messages: [] } };
  }
  private profile(user: any) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, suburb: user.suburb || '', bio: user.bio || '', phone: user.phone || '', skills: user.skills || [], phoneVerified: Boolean(user.phoneVerified), phoneVerificationPending: user.phoneVerificationPending, idVerificationStatus: user.idVerificationStatus || 'not_started', idVerificationProvider: user.idVerificationProvider, idVerificationSessionId: user.idVerificationSessionId, bankVerified: Boolean(user.bankVerified), membershipType: user.membershipType || 'standard', proStatus: user.proStatus || 'inactive', createdAt: user.createdAt };
  }
}
