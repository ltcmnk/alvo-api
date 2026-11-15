// HTTP real, banco descartável e arquivos gerados pela própria API. Não usa dados pessoais.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
const temporario = await mkdtemp(join(tmpdir(), 'alvo-s2-'));
const banco = join(temporario, 'teste.sqlite');
let filho,
  saida = '',
  total = 0;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const portaLivre = async () => {
  const s = createServer();
  s.listen(0, '127.0.0.1');
  await once(s, 'listening');
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
};
const porta = await portaLivre();
const base = `http://127.0.0.1:${porta}/api`;
const ortografia = createServer(async (req, res) => {
  let corpo = '';
  for await (const parte of req) corpo += parte;
  if (corpo.includes('FALHA_EXTERNA')) {
    res.writeHead(503).end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      matches: [
        {
          offset: 0,
          length: 4,
          message: 'Possível erro.',
          replacements: [{ value: 'texto' }],
          rule: { issueType: 'misspelling' },
        },
      ],
    }),
  );
});
ortografia.listen(0, '127.0.0.1');
await once(ortografia, 'listening');
async function iniciar() {
  filho = spawn(process.execPath, ['dist/main.js'], {
    env: {
      ...process.env,
      PORT: String(porta),
      DATABASE_PATH: banco,
      FRONTEND_URL: 'http://localhost:5172',
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
      LANGUAGETOOL_URL: `http://127.0.0.1:${ortografia.address().port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  filho.stdout.on('data', (d) => {
    saida += d;
  });
  filho.stderr.on('data', (d) => {
    saida += d;
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/health')).ok) return;
    } catch {}
    await pausa(100);
  }
  throw new Error('API não iniciou: ' + saida);
}
async function parar() {
  if (filho && filho.exitCode === null) {
    const fim = once(filho, 'exit');
    filho.kill('SIGTERM');
    await fim;
  }
}
function cliente() {
  let cookie = '';
  return async (rota, method = 'GET', dados, esperado = 200, extras = {}) => {
    const form = dados instanceof FormData;
    const r = await fetch(base + rota, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(!form && dados !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extras,
      },
      body: dados === undefined ? undefined : form ? dados : JSON.stringify(dados),
    });
    const texto = await r.text();
    assert.equal(r.status, esperado, `${method} ${rota}: ${texto.slice(0, 300)}`);
    total++;
    const recebido = r.headers.get('set-cookie');
    if (recebido) cookie = recebido.split(';')[0];
    return {
      data: r.headers.get('content-type')?.includes('json') && texto ? JSON.parse(texto) : texto,
      headers: r.headers,
    };
  };
}
const curriculo = {
  nome: 'Ana Teste',
  cargoAlvo: 'Assistente administrativo',
  email: 'ana@example.com',
  resumo:
    'Profissional de apoio administrativo com experiência em Excel, organização de documentos e atendimento ao cliente.',
  experiencias: [
    {
      empresa: 'Empresa Fictícia',
      cargo: 'Assistente',
      inicio: '2023-01',
      atual: true,
      descricao:
        'Organizei documentos e atualizei planilhas Excel para apoiar o atendimento ao cliente.',
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
  habilidades: ['Excel', 'Organização', 'Atendimento ao cliente'],
  idiomas: [],
  projetos: [],
  competencias: [],
  certificacoes: [],
  atividades: [],
};
const descricaoVaga =
  'Assistente administrativo. Atividades: organizar documentos e atualizar planilhas. Requisitos: Excel, comunicação escrita, atendimento ao cliente e trabalho em equipe. Diferencial: relatórios gerenciais.';
const senha = 'SenhaFicticia123!';
try {
  await iniciar();
  const a = cliente(),
    b = cliente(),
    anon = cliente();
  await anon('/health');
  await anon('/curriculos', 'GET', undefined, 401);
  await anon('/ia/provedores', 'GET', undefined, 401);
  await anon('/auth/cadastro', 'POST', { nome: 'A', email: 'invalido', senha: 'curta' }, 400);
  const cadastro = await a(
    '/auth/cadastro',
    'POST',
    { nome: 'Ana Teste', email: ' ANA@example.com ', senha },
    201,
  );
  assert.equal(cadastro.data.email, 'ana@example.com');
  assert.ok(!JSON.stringify(cadastro.data).includes('senha'));
  assert.match(cadastro.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(cadastro.headers.get('set-cookie'), /SameSite=Strict/i);
  await anon('/auth/cadastro', 'POST', { nome: 'Ana Outra', email: 'ana@example.com', senha }, 409);
  await anon('/auth/entrar', 'POST', { email: 'ana@example.com', senha: 'SenhaErrada123!' }, 401);
  await a('/auth/sessao');
  await a('/auth/perfil', 'PATCH', { nome: 'Ana Atualizada' });
  assert.deepEqual((await a('/curriculos')).data, []);
  await a('/curriculos', 'POST', {}, 400);
  // Use the enum actually accepted by this version.
  curriculo.formacoes[0].situacao = 'concluido';
  const c = (await a('/curriculos', 'POST', curriculo, 201)).data;
  assert.ok(c.id);
  assert.ok(c.pontuacao >= 0 && c.pontuacao <= 100);
  assert.equal((await a(`/curriculos/${c.id}`)).data.nome, curriculo.nome);
  const editado = { ...curriculo, resumo: curriculo.resumo + ' Texto revisado para exportação.' };
  await a(`/curriculos/${c.id}`, 'PUT', editado);
  assert.equal((await a(`/curriculos/${c.id}`)).data.resumo, editado.resumo);
  await a('/curriculos/nao-numero', 'GET', undefined, 400);
  await a('/curriculos/999999', 'GET', undefined, 404);
  await a('/auth/sair', 'POST', undefined, 204);
  await a('/curriculos', 'GET', undefined, 401);
  await a('/auth/entrar', 'POST', { email: 'ana@example.com', senha });
  await b(
    '/auth/cadastro',
    'POST',
    { nome: 'Bruno Teste', email: 'bruno@example.com', senha },
    201,
  );
  assert.deepEqual((await b('/curriculos')).data, []);
  for (const method of ['GET', 'PUT', 'DELETE'])
    await b(`/curriculos/${c.id}`, method, method === 'PUT' ? curriculo : undefined, 404);
  await b('/curriculos', 'POST', { ...curriculo, origemId: c.id }, 404);
  await b('/vagas', 'POST', { empresa: 'Outra', cargo: 'Cargo', curriculoId: c.id }, 404);
  const v = (
    await a(
      '/vagas',
      'POST',
      { empresa: 'Empresa Fictícia', cargo: 'Assistente', curriculoId: c.id },
      201,
    )
  ).data;
  await a(`/vagas/${v.id}`, 'PATCH', { status: 'entrevista', notas: 'Entrevista agendada.' });
  for (const method of ['PATCH', 'DELETE'])
    await b(`/vagas/${v.id}`, method, method === 'PATCH' ? { status: 'oferta' } : undefined, 404);
  await a(`/vagas/${v.id}`, 'PATCH', { status: 'invalido' }, 400);
  await a('/vagas', 'POST', {}, 400);
  await a('/curriculos/previa-ats', 'POST', editado);
  await a('/ia/analisar-vaga', 'POST', { descricaoVaga });
  await a('/ia/compatibilidade', 'POST', { curriculo, descricaoVaga: 'curta' }, 400);
  const rel = (await a('/ia/compatibilidade', 'POST', { curriculo, descricaoVaga })).data;
  assert.equal(rel.modo, 'demonstracao');
  assert.ok(Array.isArray(rel.requisitos));
  const otim = (await a('/ia/otimizar', 'POST', { curriculo, descricaoVaga })).data;
  assert.equal(otim.modo, 'demonstracao');
  assert.equal(otim.curriculo.nome, curriculo.nome);
  assert.ok(otim.notaDepois.total >= otim.notaAntes.total, 'A otimização não pode baixar a nota.');
  assert.ok(Array.isArray(otim.travas.restaurados));
  await a('/curriculos', 'POST', { ...otim.curriculo, origemId: c.id, tipo: 'sob-medida' }, 201);
  // Binary downloads and round-trip PDF/DOCX parsing.
  const entrada = await a('/auth/entrar', 'POST', { email: 'ana@example.com', senha });
  const cookie = entrada.headers.get('set-cookie').split(';')[0];
  for (const formato of ['pdf', 'docx', 'tex']) {
    const r = await fetch(base + '/documentos/exportar', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculo: editado, formato }),
    });
    assert.equal(r.status, 200);
    total++;
    const bin = Buffer.from(await r.arrayBuffer());
    assert.ok(bin.length > 100);
    assert.match(r.headers.get('content-disposition'), /attachment/);
    if (formato === 'tex') {
      assert.match(bin.toString(), /Texto revisado/);
      continue;
    }
    assert.ok(
      formato === 'pdf'
        ? bin.subarray(0, 4).toString() === '%PDF'
        : bin.subarray(0, 2).toString() === 'PK',
    );
    const form = new FormData();
    form.set('arquivo', new Blob([bin]), `curriculo.${formato}`);
    const leitura = (await a('/documentos/ler', 'POST', form)).data;
    assert.match(leitura.texto, /Texto revisado/);
    assert.equal(leitura.modo, 'regras');
  }
  await a('/documentos/exportar', 'POST', { curriculo, formato: 'png' }, 400);
  await a('/documentos/ler', 'POST', new FormData(), 400);
  const invalido = new FormData();
  invalido.set('arquivo', new Blob(['arquivo inválido']), 'teste.txt');
  await a('/documentos/ler', 'POST', invalido, 400);
  const corrompido = new FormData();
  corrompido.set('arquivo', new Blob(['%PDF-1.7 arquivo corrompido']), 'teste.pdf');
  await a('/documentos/ler', 'POST', corrompido, 400);
  const docxCorrompido = new FormData();
  docxCorrompido.set('arquivo', new Blob(['PKarquivo inválido']), 'teste.docx');
  await a('/documentos/ler', 'POST', docxCorrompido, 400);
  const grande = new FormData();
  grande.set('arquivo', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), 'grande.pdf');
  await a('/documentos/ler', 'POST', grande, 413);
  const correcoes = (
    await a('/documentos/ortografia', 'POST', { campos: [{ id: 'resumo', texto: 'test errado' }] })
  ).data;
  assert.equal(correcoes.correcoes[0].campoId, 'resumo');
  await a(
    '/documentos/ortografia',
    'POST',
    { campos: [{ id: 'resumo', texto: 'FALHA_EXTERNA' }] },
    502,
  );
  await a('/documentos/ortografia', 'POST', { campos: [] });
  await a('/auth/perfil', 'PATCH', { nome: 'Inválido' }, 403, {
    Origin: 'https://site-externo.example',
  });
  await parar();
  await iniciar();
  assert.equal((await a(`/curriculos/${c.id}`)).data.resumo, editado.resumo);
  assert.equal((await a('/vagas')).data[0].status, 'entrevista');
  assert.equal((await a('/auth/sessao')).data.nome, 'Ana Atualizada');
  await a(`/curriculos/${c.id}`, 'DELETE', undefined, 204);
  assert.equal((await a('/vagas')).data[0].curriculoId, undefined);
  await a(`/vagas/${v.id}`, 'DELETE', undefined, 204);
  await a(`/vagas/${v.id}`, 'DELETE', undefined, 404);
  await a('/auth/conta', 'DELETE', { senha: 'errada' }, 400);
  await a('/auth/conta', 'DELETE', { senha }, 204);
  await a('/auth/sessao', 'GET', undefined, 401);
  await a('/auth/cadastro', 'POST', { nome: 'Ana Nova', email: 'ana@example.com', senha }, 201);
  assert.deepEqual((await a('/curriculos')).data, []);
  assert.deepEqual((await a('/vagas')).data, []);
  await b('/auth/sessao');
  const db = new DatabaseSync(banco);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM curriculos').get().total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM vagas').get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM vagas WHERE status = 'entrevista'").get().total, 0);
  db.exec('UPDATE sessoes SET expira_em = 0');
  db.close();
  await b('/auth/sessao', 'GET', undefined, 401);
  let limitado = false;
  for (let i = 0; i < 21; i++) {
    const r = await fetch(base + '/auth/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inexistente@example.com', senha: 'SenhaErrada123!' }),
    });
    total++;
    if (r.status === 429) {
      limitado = true;
      break;
    }
    assert.equal(r.status, 401);
  }
  assert.ok(limitado, 'Tentativas de acesso devem ter limite.');
  console.log(
    `OK: ${total} verificações HTTP, persistência após reinício, isolamento, documentos e exclusão em cascata.`,
  );
} finally {
  await parar();
  await new Promise((r) => ortografia.close(r));
  await rm(temporario, { recursive: true, force: true });
}
