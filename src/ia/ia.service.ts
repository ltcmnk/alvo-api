import { Injectable } from '@nestjs/common';
import { analisarVaga } from '../ats/analise-vaga.js';
import type { AnaliseVaga } from '../ats/analise-vaga.js';
import { analisarLeituraAts } from '../ats/documento.js';
import type { LeituraAts } from '../ats/documento.js';
import { pontuarAts } from '../ats/pontuacao.js';
import type { PontuacaoAts } from '../ats/pontuacao.js';
import { completarConteudo } from '../curriculos/curriculos.service.js';
import type { CreateCurriculoDto } from '../curriculos/dto/create-curriculo.dto.js';
import type { ConteudoCurriculo } from '../curriculos/interfaces/curriculo.interface.js';
import { otimizacaoDemonstracao, relatorioDemonstracao } from './modo-demonstracao.js';
import * as prompts from './prompts.js';
import { gerarJson, listarProvedores } from './provedores.js';
import type { IdProvedor, Provedor } from './provedores.js';
import {
  conteudoCurriculoSchema,
  otimizacaoSchema,
  relatorioCompatibilidadeSchema,
} from './schemas.js';
import type { OtimizacaoIa, RelatorioCompatibilidadeIa } from './schemas.js';
import { aplicarTravas } from './travas.js';

/** Quem gerou a resposta: um provedor de IA ou as regras do modo demonstração. */
interface Origem {
  modo: 'ia' | 'demonstracao';
  provedor?: IdProvedor;
}

export type Relatorio = RelatorioCompatibilidadeIa &
  Origem & { compatibilidade: number; analiseVaga: AnaliseVaga };

export type ResultadoOtimizacao = Omit<OtimizacaoIa, 'curriculo'> &
  Origem & {
    curriculo: ConteudoCurriculo;
    notaAntes: PontuacaoAts;
    notaDepois: PontuacaoAts;
    /** % das palavras-chave da vaga presentes antes e depois (só quando há vaga). */
    compatibilidade?: { antes: number; depois: number };
    travas: { removidos: string[]; numerosParaConferir: string[] };
    leituraAts: LeituraAts;
  };

// Requisito obrigatório pesa o dobro do desejável; atender parcialmente vale metade
const PESO_TIPO = { obrigatorio: 2, desejavel: 1 };
const VALOR_STATUS = { atende: 1, parcial: 0.5, nao_atende: 0 };

/** Percentual de compatibilidade a partir dos requisitos avaliados (calculado aqui, não pela IA). */
export function calcularCompatibilidade(
  requisitos: RelatorioCompatibilidadeIa['requisitos'],
): number {
  const total = requisitos.reduce((soma, r) => soma + PESO_TIPO[r.tipo], 0);
  const obtido = requisitos.reduce(
    (soma, r) => soma + PESO_TIPO[r.tipo] * VALOR_STATUS[r.status],
    0,
  );
  return total === 0 ? 0 : Math.round((obtido / total) * 100);
}

function origem(provedor?: IdProvedor): Origem {
  return provedor ? { modo: 'ia', provedor } : { modo: 'demonstracao' };
}

@Injectable()
export class IaService {
  /** Provedores com o status da chave e se o app está em modo demonstração. */
  provedores(): { provedores: Provedor[]; modoDemonstracao: boolean } {
    const provedores = listarProvedores();
    return { provedores, modoDemonstracao: !provedores.some((p) => p.disponivel) };
  }

  /** Análise automática da vaga, por regras: instantânea e sem custo. */
  analisarVaga(descricaoVaga: string): AnaliseVaga {
    return analisarVaga(descricaoVaga);
  }

  /**
   * Relatório de compatibilidade gerado antes de salvar: requisitos atendidos e em falta,
   * como preencher os gaps e projetos que contam como experiência prática.
   */
  async gerarRelatorio(
    dados: CreateCurriculoDto,
    descricaoVaga: string,
    provedor?: IdProvedor,
  ): Promise<Relatorio> {
    const curriculo = completarConteudo(dados);
    const relatorio = provedor
      ? await gerarJson(provedor, {
          sistema: prompts.SISTEMA_COMPATIBILIDADE,
          usuario: prompts.pedidoCompatibilidade(curriculo, descricaoVaga),
          schema: relatorioCompatibilidadeSchema,
          nome: 'relatorio_compatibilidade',
        })
      : relatorioDemonstracao(curriculo, descricaoVaga);
    return {
      ...relatorio,
      ...origem(provedor),
      compatibilidade: calcularCompatibilidade(relatorio.requisitos),
      analiseVaga: analisarVaga(descricaoVaga),
    };
  }

  /** Otimiza o currículo para ATS (e para a vaga, se houver) e mede o antes e depois. */
  async otimizar(
    dados: CreateCurriculoDto,
    descricaoVaga?: string,
    provedor?: IdProvedor,
  ): Promise<ResultadoOtimizacao> {
    const original = completarConteudo(dados);
    const resposta = provedor
      ? await gerarJson(provedor, {
          sistema: prompts.SISTEMA_OTIMIZACAO,
          usuario: prompts.pedidoOtimizacao(original, descricaoVaga),
          schema: otimizacaoSchema,
          nome: 'curriculo_otimizado',
        })
      : otimizacaoDemonstracao(original, descricaoVaga);

    const gerado = completarConteudo({
      ...(resposta.curriculo as CreateCurriculoDto),
      cargoAlvo: original.cargoAlvo,
    });
    const { curriculo, removidos, numerosParaConferir } = aplicarTravas(original, gerado);
    const palavrasVaga = descricaoVaga ? analisarVaga(descricaoVaga).palavrasChave : undefined;
    const [notaAntes, notaDepois] = [
      pontuarAts(original, palavrasVaga),
      pontuarAts(curriculo, palavrasVaga),
    ];
    const notaPalavras = (nota: PontuacaoAts) =>
      nota.criterios.find((c) => c.id === 'palavrasChave')!.nota;

    return {
      ...resposta,
      ...origem(provedor),
      curriculo,
      notaAntes,
      notaDepois,
      compatibilidade: palavrasVaga?.length
        ? { antes: notaPalavras(notaAntes), depois: notaPalavras(notaDepois) }
        : undefined,
      travas: { removidos, numerosParaConferir },
      leituraAts: analisarLeituraAts(curriculo),
    };
  }

  /** Organiza nos campos do currículo o texto extraído de um PDF/DOCX (usado pela leitura de arquivo). */
  async estruturar(texto: string, provedor: IdProvedor): Promise<ConteudoCurriculo> {
    const estruturado = await gerarJson(provedor, {
      sistema: prompts.SISTEMA_ESTRUTURAR,
      usuario: prompts.pedidoEstruturar(texto),
      schema: conteudoCurriculoSchema,
      nome: 'curriculo',
    });
    return completarConteudo(estruturado as CreateCurriculoDto);
  }
}
