// Opt-in: faz três chamadas reais ao provedor configurado, apenas com dados fictícios.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const pasta = await mkdtemp(join(tmpdir(), 'alvo-ia-real-'));
const servidor = createServer();
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
const porta = servidor.address().port;
await new Promise((r) => servidor.close(r));
const api = spawn(process.execPath, ['dist/main.js'], {
  env: { ...process.env, PORT: String(porta), DATABASE_PATH: join(pasta, 'teste.sqlite') },
  stdio: 'ignore',
});
const base = `http://127.0.0.1:${porta}/api`;
let cookie = '';
async function chamar(rota, dados, esperado = 200) {
  const form = dados instanceof FormData;
  const r = await fetch(base + rota, {
    method: dados === undefined ? 'GET' : 'POST',
    headers: {
      cookie,
      ...(dados !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
    },
    body: dados === undefined ? undefined : form ? dados : JSON.stringify(dados),
    signal: AbortSignal.timeout(180000),
  });
  const corpo = await r.json();
  assert.equal(r.status, esperado, `${rota}: ${JSON.stringify(corpo)}`);
  const c = r.headers.get('set-cookie');
  if (c) cookie = c.split(';')[0];
  return corpo;
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/health')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await chamar(
    '/auth/cadastro',
    { nome: 'Ana Fictícia', email: 'ia-ficticia@example.com', senha: 'SenhaFicticia123!' },
    201,
  );
  const configuracao = await chamar('/ia/provedores');
  const disponiveis = configuracao.provedores.filter((p) => p.disponivel);
  const escolhido =
    disponiveis.find((p) => p.id === (process.env.VALIDAR_IA_PROVEDOR || 'google')) ||
    disponiveis[0];
  assert.ok(escolhido, 'Nenhum provedor configurado no .env da API da sprint 2.');
  console.log(`Provedor: ${escolhido.nome}; modelo: ${escolhido.modelo}. Somente dados fictícios.`);
  const curriculo = {
    nome: 'Ana Fictícia',
    cargoAlvo: 'Assistente administrativo',
    email: 'ana-ficticia@example.com',
    resumo:
      'Profissional de apoio administrativo com experiência em Excel, organização de documentos e atendimento ao cliente.',
    experiencias: [
      {
        empresa: 'Empresa Fictícia',
        cargo: 'Assistente administrativo',
        inicio: '2023-01',
        atual: true,
        descricao:
          'Organizei documentos, atualizei planilhas Excel e apoiei o atendimento ao cliente.',
      },
    ],
    formacoes: [
      {
        curso: 'Administração',
        instituicao: 'Faculdade Fictícia',
        inicio: '2020',
        fim: '2023',
        situacao: 'concluido',
      },
    ],
    habilidades: ['Excel', 'Organização de documentos', 'Atendimento ao cliente'],
    competencias: [],
    idiomas: [],
    projetos: [],
    certificacoes: [],
    atividades: [],
  };
  const descricaoVaga =
    'Assistente administrativo — Empresa Exemplo. Atividades: organizar documentos, atualizar planilhas e apoiar o atendimento ao cliente. Requisitos: Excel e comunicação escrita. Diferencial: relatórios gerenciais.';
  const original = await chamar('/curriculos', curriculo, 201);
  const relatorio = await chamar('/ia/compatibilidade', {
    curriculo,
    descricaoVaga,
    provedor: escolhido.id,
  });
  assert.equal(relatorio.modo, 'ia');
  assert.ok(relatorio.requisitos.length);
  assert.ok(relatorio.compatibilidade >= 0 && relatorio.compatibilidade <= 100);
  console.log('OK relatório com IA real.');
  const resultado = await chamar('/ia/otimizar', {
    curriculo,
    descricaoVaga,
    provedor: escolhido.id,
  });
  assert.equal(resultado.modo, 'ia');
  assert.equal(resultado.curriculo.nome, curriculo.nome);
  assert.equal(resultado.curriculo.email, curriculo.email);
  assert.equal(resultado.curriculo.experiencias[0]?.empresa, curriculo.experiencias[0].empresa);
  const salvo = await chamar(
    '/curriculos',
    { ...resultado.curriculo, tipo: 'sob-medida', origemId: original.id },
    201,
  );
  assert.ok(salvo.id);
  console.log('OK otimização real, trava de identidade e salvamento no banco.');
  const pdf = await fetch(base + '/documentos/exportar', {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ curriculo: resultado.curriculo, formato: 'pdf' }),
  });
  assert.equal(pdf.status, 200);
  const bin = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bin.subarray(0, 4).toString(), '%PDF');
  console.log('OK PDF da versão gerada por IA.');
  const form = new FormData();
  form.set('arquivo', new Blob([bin]), 'curriculo-ficticio.pdf');
  form.set('provedor', escolhido.id);
  const leitura = await chamar('/documentos/ler', form);
  assert.equal(leitura.modo, 'ia');
  assert.equal(leitura.curriculo.nome, curriculo.nome);
  console.log('OK importação de PDF estruturada pela IA real.');
  console.log(
    'OK validação real concluída: relatório, otimização, persistência, exportação e leitura com IA.',
  );
} finally {
  if (api.exitCode === null) {
    const fim = once(api, 'exit');
    api.kill('SIGTERM');
    await fim;
  }
  await rm(pasta, { recursive: true, force: true });
}
