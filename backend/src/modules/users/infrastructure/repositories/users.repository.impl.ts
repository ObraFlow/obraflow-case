import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DATABASE } from '../../../../database/database.module';
import { Database } from '../../../../database/database.types';
import { users } from '../../../../database/schema';
import {
  CreateUserData,
  UsersRepository,
} from '../../domain/repositories/users.repository';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UsersRepositoryImpl implements UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<User[]> {
    const usersData = this.db.select().from(users).orderBy(asc(users.id));
    return usersData.then((data) =>
      data.map((user) => this.toDomainEntity(user)),
    );
  }

  async create(data: CreateUserData): Promise<User | null> {
    const newUser = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: 'hashed_password',
        createdAt: new Date(),
      })
      .returning();

    if (newUser.length === 0) {
      return null;
    }

    return this.toDomainEntity(newUser[0]);
  }

  toDomainEntity(data: unknown): User {
    const userData = data as {
      id: number;
      name: string;
      email: string;
      passwordHash: string;
      createdAt: Date;
    };

    return User.create({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      passwordHash: userData.passwordHash,
      createdAt: userData.createdAt,
    });
  }
}
