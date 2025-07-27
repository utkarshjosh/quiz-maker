import prisma from '@/lib/prisma';
import LogMessage from '@/decorators/log-message.decorator';

export default class UserService {
  @LogMessage<[any]>({ message: 'test-decorator' })
  public async createUser(data: any) {
    const user = await prisma.user.create({ data });
    return user;
  }

  public async getUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  }
}
