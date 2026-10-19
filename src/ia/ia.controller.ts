import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { AnaliseVaga } from '../ats/analise-vaga.js';
import { AnalisarVagaDto, OtimizarDto, RelatorioDto } from './dto/ia.dto.js';
import { IaService } from './ia.service.js';
import type { Relatorio, ResultadoOtimizacao } from './ia.service.js';
import type { Provedor } from './provedores.js';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  /** GET /api/ia/provedores — provedores de IA e quais têm chave configurada. */
  @Get('provedores')
  provedores(): { provedores: Provedor[]; modoDemonstracao: boolean } {
    return this.iaService.provedores();
  }

  /** POST /api/ia/analisar-vaga — palavras-chave, requisitos e senioridade da vaga (sem IA, instantâneo). */
  @Post('analisar-vaga')
  @HttpCode(HttpStatus.OK)
  analisarVaga(@Body() dados: AnalisarVagaDto): AnaliseVaga {
    return this.iaService.analisarVaga(dados.descricaoVaga);
  }

  /** POST /api/ia/compatibilidade — relatório de compatibilidade currículo × vaga, antes de salvar. */
  @Post('compatibilidade')
  @HttpCode(HttpStatus.OK)
  compatibilidade(@Body() dados: RelatorioDto): Promise<Relatorio> {
    return this.iaService.gerarRelatorio(dados.curriculo, dados.descricaoVaga, dados.provedor);
  }

  /** POST /api/ia/otimizar — currículo otimizado com nota ATS antes e depois. Não salva nada. */
  @Post('otimizar')
  @HttpCode(HttpStatus.OK)
  otimizar(@Body() dados: OtimizarDto): Promise<ResultadoOtimizacao> {
    return this.iaService.otimizar(dados.curriculo, dados.descricaoVaga, dados.provedor);
  }
}
