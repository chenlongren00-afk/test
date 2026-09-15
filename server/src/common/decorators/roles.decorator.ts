import { SetMetadata } from '@nestjs/common';
import { AdminRole, UserRole } from '../constants';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<UserRole | AdminRole>) => SetMetadata(ROLES_KEY, roles);
