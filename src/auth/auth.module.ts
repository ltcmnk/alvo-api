import {
  BadRequestException,
  Body,
  CanActivate,
  ConflictException,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  Global,
  HttpCode,
  HttpException,
  Injectable,
  Module,
  Patch,
  Post,
  Req,
  Res,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Banco } from '../banco/banco.module.js';

const derivar = promisify(scrypt);
const DIAS = 7 * 24 * 60 * 60;
const COOKIE = 'alvo_sessao';
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const Publico = (): MethodDecorator => SetMetadata('publico', true);
export interface Requisicao {
  usuarioId: number;
  ip: string;
  method: string;
  headers: { cookie?: string; origin?: string };
}
interface Resposta {
  cookie(nome: string, valor: string, opcoes: object): void;
}
interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
}
export class AcessoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(254)
  email: string;
  @IsString({ message: 'Informe sua senha.' })
  @Length(10, 128, { message: 'A senha deve ter de 10 a 128 caracteres.' })
  senha: string;
}
export class PerfilDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 120, { message: 'O nome deve ter de 2 a 120 caracteres.' })
  nome: string;
}
export class CadastroDto extends AcessoDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 120, { message: 'O nome deve ter de 2 a 120 caracteres.' })
  nome: string;
}
export class ConfirmarSenhaDto {
  @IsString()
  @IsNotEmpty({ message: 'Confirme sua senha para excluir a conta.' })
  @MaxLength(128)
  senha: string;
}
@Injectable()
export class AuthService {
  private readonly tentativas = new Map<string, { total: number; fim: number }>();
  constructor(
    private readonly banco: Banco,
    private readonly config: ConfigService,
  ) {}
  limitar(ip: string): void {
    const agora = Date.now();
    for (const [chave, valor] of this.tentativas)
      if (valor.fim < agora) this.tentativas.delete(chave);
    const item = this.tentativas.get(ip) ?? { total: 0, fim: agora + 900000 };
    item.total++;
    this.tentativas.set(ip, item);
    if (item.total > 20) throw new HttpException('Muitas tentativas. Aguarde 15 minutos.', 429);
  }
  async cadastrar(dados: CadastroDto, res: Resposta): Promise<object> {
    if (this.banco.db.prepare('SELECT id FROM usuarios WHERE email = ?').get(dados.email))
      throw new ConflictException('Este e-mail já está cadastrado. Entre com sua senha.');
    const salt = randomBytes(16).toString('hex');
    const hash = ((await derivar(dados.senha, salt, 64)) as Buffer).toString('hex');
    let id: number;
    try {
      id = Number(
        this.banco.db
          .prepare('INSERT INTO usuarios(nome,email,senha_hash,criado_em) VALUES(?,?,?,?)')
          .run(dados.nome, dados.email, salt + ':' + hash, new Date().toISOString())
          .lastInsertRowid,
      );
    } catch {
      throw new ConflictException('Não foi possível cadastrar este e-mail.');
    }
    return this.abrirSessao(id, res);
  }
  async entrar(dados: AcessoDto, res: Resposta): Promise<object> {
    const usuario = this.banco.db
      .prepare('SELECT * FROM usuarios WHERE email = ?')
      .get(dados.email) as unknown as Usuario | undefined;
    // Deriva também para conta inexistente: evita resposta rápida que denuncia o e-mail.
    const valido = await this.conferirSenha(
      dados.senha,
      usuario?.senha_hash ?? '00000000000000000000000000000000:' + '00'.repeat(64),
    );
    if (!usuario || !valido) throw new UnauthorizedException('E-mail ou senha incorretos.');
    return this.abrirSessao(usuario.id, res);
  }
  private async conferirSenha(senha: string, armazenado: string): Promise<boolean> {
    const [salt, esperado] = armazenado.split(':');
    const atual = (await derivar(senha, salt, 64)) as Buffer;
    return timingSafeEqual(atual, Buffer.from(esperado, 'hex'));
  }
  private cookie(res: Resposta, token: string, maxAge: number): void {
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/api',
      maxAge,
    });
  }
  private abrirSessao(id: number, res: Resposta): object {
    const token = randomBytes(32).toString('hex');
    this.banco.db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now());
    this.banco.db
      .prepare('INSERT INTO sessoes VALUES(?,?,?)')
      .run(hashToken(token), id, Date.now() + DIAS * 1000);
    this.cookie(res, token, DIAS * 1000);
    return this.perfil(id);
  }
  token(req: Requisicao): string {
    return (
      req.headers.cookie
        ?.split(';')
        .map((p) => p.trim())
        .find((p) => p.startsWith(COOKIE + '='))
        ?.slice(COOKIE.length + 1) ?? ''
    );
  }
  identificar(req: Requisicao): number {
    const sessao = this.banco.db
      .prepare('SELECT usuario_id FROM sessoes WHERE token_hash = ? AND expira_em > ?')
      .get(hashToken(this.token(req)), Date.now());
    if (!sessao) throw new UnauthorizedException('Entre na sua conta para continuar.');
    return Number(sessao.usuario_id);
  }
  perfil(id: number): object {
    const usuario = this.banco.db
      .prepare('SELECT id,nome,email,criado_em AS criadoEm FROM usuarios WHERE id = ?')
      .get(id);
    if (!usuario) throw new UnauthorizedException('Entre na sua conta para continuar.');
    return usuario;
  }
  atualizar(id: number, dados: PerfilDto): object {
    this.banco.db.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').run(dados.nome, id);
    return this.perfil(id);
  }
  sair(req: Requisicao, res: Resposta): void {
    this.banco.db
      .prepare('DELETE FROM sessoes WHERE token_hash = ?')
      .run(hashToken(this.token(req)));
    this.cookie(res, '', 0);
  }
  async excluir(req: Requisicao, senha: string, res: Resposta): Promise<void> {
    const usuario = this.banco.db
      .prepare('SELECT senha_hash FROM usuarios WHERE id = ?')
      .get(req.usuarioId);
    if (!usuario || !(await this.conferirSenha(senha, String(usuario.senha_hash))))
      throw new BadRequestException('Senha incorreta. A conta não foi excluída.');
    this.banco.db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.usuarioId);
    this.cookie(res, '', 0);
  }
}
@Injectable()
class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Requisicao>();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== this.config.get('FRONTEND_URL', 'http://localhost:5173')
    )
      throw new ForbiddenException('Origem da solicitação não permitida.');
    if (this.reflector.get('publico', context.getHandler())) return true;
    req.usuarioId = this.auth.identificar(req);
    return true;
  }
}
@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Publico()
  @Post('cadastro')
  cadastrar(
    @Body() dados: CadastroDto,
    @Req() req: Requisicao,
    @Res({ passthrough: true }) res: Resposta,
  ): Promise<object> {
    this.auth.limitar(req.ip);
    return this.auth.cadastrar(dados, res);
  }
  @Publico()
  @Post('entrar')
  @HttpCode(200)
  entrar(
    @Body() dados: AcessoDto,
    @Req() req: Requisicao,
    @Res({ passthrough: true }) res: Resposta,
  ): Promise<object> {
    this.auth.limitar(req.ip);
    return this.auth.entrar(dados, res);
  }
  @Get('sessao') perfil(@Req() req: Requisicao): object {
    return this.auth.perfil(req.usuarioId);
  }
  @Patch('perfil') atualizar(@Req() req: Requisicao, @Body() dados: PerfilDto): object {
    return this.auth.atualizar(req.usuarioId, dados);
  }
  @Post('sair')
  @HttpCode(204)
  sair(@Req() req: Requisicao, @Res({ passthrough: true }) res: Resposta): void {
    this.auth.sair(req, res);
  }
  @Delete('conta')
  @HttpCode(204)
  excluir(
    @Req() req: Requisicao,
    @Body() dados: ConfirmarSenhaDto,
    @Res({ passthrough: true }) res: Resposta,
  ): Promise<void> {
    return this.auth.excluir(req, dados.senha, res);
  }
}
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
