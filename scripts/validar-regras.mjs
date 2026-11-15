import assert from 'node:assert/strict';
import { completarConteudo } from '../dist/curriculos/curriculos.service.js';
import { aplicarTravas } from '../dist/ia/travas.js';
import { pontuarAts } from '../dist/ats/pontuacao.js';
import { calcularCompatibilidade } from '../dist/ia/ia.service.js';
import { garantirNota } from '../dist/ia/garantia-nota.js';
import { analisarVaga } from '../dist/ats/analise-vaga.js';
const original = completarConteudo({
  nome: 'Ana Teste',
  cargoAlvo: 'Assistente',
  email: 'ana@example.com',
  habilidades: ['Excel'],
  experiencias: [
    {
      empresa: 'Empresa Fictícia',
      cargo: 'Estagiária',
      inicio: '2020',
      descricao: 'Organizei documentos.',
    },
    {
      empresa: 'Empresa Fictícia',
      cargo: 'Assistente',
      inicio: '2022',
      descricao: 'Atualizei planilhas.',
    },
  ],
});
const gerado = structuredClone(original);
gerado.nome = 'Nome inventado';
gerado.email = 'outro@example.com';
gerado.habilidades.push('Python');
gerado.experiencias.reverse();
gerado.experiencias[0].descricao = 'Atualizei planilhas e reduzi o tempo em 37%.';
gerado.experiencias.push({
  empresa: 'Empresa Inventada',
  cargo: 'Diretora',
  descricao: 'Liderei a equipe.',
});
const resultado = aplicarTravas(original, gerado);
assert.equal(resultado.curriculo.nome, original.nome);
assert.equal(resultado.curriculo.email, original.email);
assert.ok(!resultado.curriculo.habilidades.includes('Python'));
assert.ok(resultado.curriculo.habilidades.includes('Excel'));
assert.equal(resultado.curriculo.experiencias.length, 2);
assert.equal(
  resultado.curriculo.experiencias[0].cargo,
  'Assistente',
  'Cargos na mesma empresa não podem ser confundidos.',
);
assert.equal(resultado.curriculo.experiencias[0].inicio, '2022');
assert.ok(resultado.numerosParaConferir.includes('37%'));
assert.ok(resultado.removidos.some((x) => x.includes('Empresa Inventada')));
const nota = pontuarAts(original);
assert.deepEqual(pontuarAts(original), nota);
assert.ok(nota.total >= 0 && nota.total <= 100);
assert.equal(
  nota.criterios.reduce((s, c) => s + c.peso, 0),
  100,
);
assert.equal(
  calcularCompatibilidade([
    { tipo: 'obrigatorio', status: 'atende' },
    { tipo: 'desejavel', status: 'nao_atende' },
  ]),
  67,
);

// Garantia de nota: nenhuma reescrita da IA pode baixar a nota geral nem a da vaga
const completo = completarConteudo({
  nome: 'Ana Teste',
  cargoAlvo: 'Assistente administrativo',
  email: 'ana@example.com',
  telefone: '11 90000-0000',
  resumo:
    'Assistente administrativa com experiência em Excel, organização de documentos, atendimento ao cliente e elaboração de relatórios semanais para a coordenação da equipe administrativa.',
  habilidades: ['Excel', 'Power BI', 'Atendimento ao cliente', 'Organização', 'Relatórios'],
  experiencias: [
    {
      empresa: 'Empresa Fictícia',
      cargo: 'Assistente',
      inicio: '2022-01',
      descricao: 'Organizei 300 documentos por mês.\nAtendi clientes por telefone e e-mail.',
    },
  ],
  formacoes: [{ curso: 'Administração', instituicao: 'Faculdade Fictícia', inicio: '2019' }],
});
const palavras = analisarVaga(
  'Assistente administrativo. Requisitos: Excel, Power BI, atendimento ao cliente e relatórios.',
).palavrasChave;
const nota2 = (c) => [pontuarAts(c).total, pontuarAts(c, palavras).total];
const piores = [
  { ...completo, resumo: 'Curto.' },
  { ...completo, habilidades: ['Excel'] },
  { ...completo, experiencias: [] },
  {
    ...completo,
    experiencias: [{ ...completo.experiencias[0], descricao: 'Responsável por tarefas diversas' }],
  },
  { ...completo, resumo: 'Curto.', habilidades: [], experiencias: [], projetos: [] },
];
for (const gerado of piores) {
  const { curriculo, restaurados } = garantirNota(completo, gerado, palavras);
  const [antesGeral, antesVaga] = nota2(completo);
  const [depoisGeral, depoisVaga] = nota2(curriculo);
  assert.ok(depoisGeral >= antesGeral, `nota geral caiu: ${antesGeral} → ${depoisGeral}`);
  assert.ok(depoisVaga >= antesVaga, `nota da vaga caiu: ${antesVaga} → ${depoisVaga}`);
  assert.ok(restaurados.length > 0);
}
// Reescrita que melhora a nota é mantida sem restaurar nada
const melhor = { ...completo, habilidades: [...completo.habilidades, 'Pacote Office'] };
assert.deepEqual(garantirNota(completo, melhor, palavras).restaurados, []);
assert.equal(garantirNota(completo, melhor, palavras).curriculo, melhor);
console.log('OK: regras ATS, pesos, estabilidade, proteção de fatos, números para revisão e garantia de nota.');
