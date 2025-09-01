import prisma from '@/lib/prisma';

export interface CreateUserData {
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  profileData?: any;
}

export interface UpdateUserData {
  auth0Id?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  profileData?: any;
}

export default class UserService {
  public async createUser(data: CreateUserData) {
    const user = await prisma.user.create({
      data: {
        ...data,
        profileData: data.profileData || {},
      },
    });
    return user;
  }

  public async getUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  }

  public async getUserByAuth0Id(auth0Id: string) {
    const user = await prisma.user.findUnique({ where: { auth0Id } });
    return user;
  }

  public async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user;
  }

  public async updateUser(id: string, data: UpdateUserData) {
    console.log('update user data', data);
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return user;
  }

  public async updateLastLogin(id: string) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });
    return user;
  }

  public async verifyUserEmail(id: string) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
    return user;
  }

  public async deleteUser(id: string) {
    const user = await prisma.user.delete({ where: { id } });
    return user;
  }

  public async findOrCreateUser(auth0Data: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  }) {
    // Try to find existing user by Auth0 ID
    let user = await this.getUserByAuth0Id(auth0Data.sub);

    if (!user) {
      // Try to find by email
      user = await this.getUserByEmail(auth0Data.email);

      if (user) {
        // Link existing user to Auth0
        user = await this.updateUser(user.id, {
          auth0Id: auth0Data.sub,
          picture: auth0Data.picture,
          emailVerified: auth0Data.email_verified ?? false,
        });
      } else {
        // Create new user
        user = await this.createUser({
          auth0Id: auth0Data.sub,
          email: auth0Data.email,
          name: auth0Data.name,
          picture: auth0Data.picture,
          emailVerified: auth0Data.email_verified ?? false,
        });
      }
    } else {
      // Update existing user's information
      user = await this.updateUser(user.id, {
        name: auth0Data.name,
        picture: auth0Data.picture,
        emailVerified: auth0Data.email_verified ?? false,
        auth0Id: auth0Data.sub,
      });
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }
}
