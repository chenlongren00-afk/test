import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DataStore } from '../infra/data.store';
import { SessionStore } from '../infra/session.store';
import { InfraModule } from '../infra/infra.module';
@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'dev-only-change-me' }), InfraModule], controllers: [AuthController], providers: [AuthService, DataStore, SessionStore], exports: [DataStore, SessionStore, JwtModule] })
export class AuthModule {}
