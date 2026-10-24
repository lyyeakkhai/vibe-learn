import { Injectable } from '@nestjs/common';
import { CreateAuthModuleDto } from './dto/create-auth-module.dto';
import { UpdateAuthModuleDto } from './dto/update-auth-module.dto';

@Injectable()
export class AuthModuleService {
  create(_createAuthModuleDto: CreateAuthModuleDto) {
    return 'This action adds a new authModule';
  }

  findAll() {
    return `This action returns all authModule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} authModule`;
  }

  update(id: number, _updateAuthModuleDto: UpdateAuthModuleDto) {
    return `This action updates a #${id} authModule`;
  }

  remove(id: number) {
    return `This action removes a #${id} authModule`;
  }
}
