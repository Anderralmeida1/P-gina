/*
 * Servidor local para o formulário de cadastro de casos.
 * Escuta somente em 127.0.0.1 e grava nos JSONs do próprio workspace.
 * Usa apenas módulos nativos do Node.js; nenhum token do GitHub é necessário.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createHash } = require('node:crypto');

const HOST = '127.0.0.1';
const PORT = 4179;
const MAX_BODY_BYTES = 100 * 1024;
const INDEX_PATH = path.join(__dirname, 'index.html');
const DATA_DIRECTORY = path.resolve(__dirname, '..', '..', 'resources', 'data');

// Lista permitida: os valores recebidos nunca são usados como caminho arbitrário.
const CATEGORY_FILES = Object.freeze({
  'analises-defeito': 'analises-defeito.json',
  'analises-sugestao': 'analises-sugestao.json',
  'analises-falha': 'analises-falha.json'
});
const PRODUCT_LINES = new Set(['Alarmes', 'Sensores', 'Guardian']);
const CRITICALITIES = new Set(['Baixa', 'Média', 'Alta', 'Muito Alta']);

/** Envia uma resposta JSON com o status HTTP especificado. */
function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

/**
 * Lê o corpo JSON da requisição respeitando o limite de tamanho.
 * @returns {Promise<Object>} Dados enviados pelo formulário.
 */
function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;

    request.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('O formulário excedeu o tamanho permitido.'), { status: 413 }));
        return;
      }

      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(Object.assign(new Error('O conteúdo enviado deve ser um objeto JSON.'), { status: 400 }));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(Object.assign(new Error('O conteúdo enviado não é um JSON válido.'), { status: 400 }));
      }
    });

    request.on('error', reject);
  });
}

/** Valida uma data ISO recebida do campo HTML date e a converte para DD/MM/AAAA. */
function formatDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`${label}: informe uma data válida.`), { status: 400 });
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error(`${label}: informe uma data válida.`), { status: 400 });
  }

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** Valida os campos e cria um registro na estrutura usada pelos arquivos de análise. */
function createCase(input) {
  if (!Object.hasOwn(CATEGORY_FILES, input.categoria)) {
    throw Object.assign(new Error('Selecione uma categoria válida.'), { status: 400 });
  }

  if (!PRODUCT_LINES.has(input.linhaProduto)) {
    throw Object.assign(new Error('Selecione uma linha de produto válida.'), { status: 400 });
  }

  const numero = typeof input.caso === 'string' ? input.caso.trim() : '';
  if (!numero || numero.length > 100) {
    throw Object.assign(new Error('Informe um número de caso válido.'), { status: 400 });
  }

  const assunto = typeof input.assunto === 'string' ? input.assunto.trim() : '';
  if (!assunto || assunto.length > 200) {
    throw Object.assign(new Error('Informe um assunto válido (máximo de 200 caracteres).'), { status: 400 });
  }

  if (!CRITICALITIES.has(input.criticidade)) {
    throw Object.assign(new Error('Selecione uma criticidade válida.'), { status: 400 });
  }

  const resumo = Array.isArray(input.resumo)
    ? input.resumo.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
  if (resumo.length === 0 || resumo.some((item) => item.length > 5000)) {
    throw Object.assign(new Error('Informe pelo menos um item de resumo (máximo de 5000 caracteres por item).'), {
      status: 400
    });
  }

  return {
    categoria: input.categoria,
    registro: {
      caso: numero,
      assunto,
      linhaProduto: input.linhaProduto,
      criticidade: input.criticidade,
      dataAbertura: formatDate(input.dataAbertura, 'Data de abertura'),
      dataLimite: formatDate(input.dataLimite, 'Data limite'),
      resumo
    }
  };
}

/** Lê um arquivo de categoria validada e confirma seu formato básico. */
function loadCategoryData(category) {
  if (!Object.hasOwn(CATEGORY_FILES, category)) {
    throw Object.assign(new Error('Selecione uma categoria válida.'), { status: 400 });
  }

  const fileName = CATEGORY_FILES[category];
  const filePath = path.join(DATA_DIRECTORY, fileName);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data.casos)) {
    throw new Error(`O arquivo ${fileName} não contém uma lista "casos" válida.`);
  }

  return { fileName, filePath, data };
}

/** Gera uma impressão do registro para detectar alterações desde a seleção na tela. */
function fingerprint(record) {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

/** Grava o JSON por substituição atômica para evitar deixar o arquivo incompleto. */
function writeJsonAtomically(filePath, data) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx'
    });
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
    throw error;
  }
}

/** Atualiza o arquivo selecionado e bloqueia números de caso duplicados. */
function saveCase(input) {
  const { categoria, registro } = createCase(input);
  const { fileName, filePath, data } = loadCategoryData(categoria);
  if (data.casos.some((item) => String(item.caso || '').trim() === registro.caso)) {
    throw Object.assign(new Error(`O caso ${registro.caso} já existe nessa categoria.`), { status: 409 });
  }

  data.casos.push(registro);
  data.atualizadoEm = new Date().toLocaleDateString('pt-BR');
  writeJsonAtomically(filePath, data);

  return {
    message: `Caso ${registro.caso} salvo em ${fileName}.`,
    file: fileName
  };
}

/** Lista casos com rótulos legíveis e uma impressão para exclusão segura. */
function listCases(category) {
  const { data } = loadCategoryData(category);
  return data.casos.map((record, index) => ({
    index,
    fingerprint: fingerprint(record),
    label: `Caso ${record.caso || '(sem número)'} | ${record.criticidade || 'Sem criticidade'} | ` +
      `${record.dataAbertura || 'Sem data'} | ${record.linhaProduto || 'Sem linha de produto'} | ` +
      `registro ${index + 1}`
  }));
}

/** Exclui somente o registro selecionado se ele não mudou desde a listagem. */
function deleteCase(input) {
  const { fileName, filePath, data } = loadCategoryData(input.categoria);
  const index = Number(input.index);
  if (!Number.isInteger(index) || index < 0 || index >= data.casos.length) {
    throw Object.assign(new Error('Selecione um caso válido para excluir.'), { status: 400 });
  }

  const selectedRecord = data.casos[index];
  if (typeof input.fingerprint !== 'string' || fingerprint(selectedRecord) !== input.fingerprint) {
    throw Object.assign(
      new Error('A lista de casos foi alterada. Atualize a seleção e tente novamente.'),
      { status: 409 }
    );
  }

  data.casos.splice(index, 1);
  data.atualizadoEm = new Date().toLocaleDateString('pt-BR');
  writeJsonAtomically(filePath, data);

  return {
    message: `Caso ${selectedRecord.caso || ''} excluído de ${fileName}.`,
    file: fileName
  };
}

/** Cria o servidor local com apenas a página do formulário e a rota de gravação. */
const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);

  if (request.method === 'GET' && (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html')) {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(fs.readFileSync(INDEX_PATH));
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/casos') {
    try {
      sendJson(response, 200, { cases: listCases(requestUrl.searchParams.get('categoria')) });
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      console.error(`Falha ao listar casos: ${error.message}`);
      sendJson(response, status, {
        error: status === 500 ? 'Não foi possível ler o arquivo JSON.' : error.message
      });
    }
    return;
  }

  if (['POST', 'DELETE'].includes(request.method) && requestUrl.pathname === '/api/casos') {
    // Aceita somente requisições feitas pela página local do próprio formulário.
    const expectedOrigin = `http://${HOST}:${PORT}`;
    if (request.headers.origin && request.headers.origin !== expectedOrigin) {
      sendJson(response, 403, { error: 'Origem da requisição não permitida.' });
      return;
    }

    if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
      sendJson(response, 415, { error: 'O formulário deve enviar dados JSON.' });
      return;
    }

    try {
      const input = await readJsonBody(request);
      const result = request.method === 'DELETE' ? deleteCase(input) : saveCase(input);
      sendJson(response, request.method === 'DELETE' ? 200 : 201, result);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      console.error(`Falha ao processar caso: ${error.message}`);
      sendJson(response, status, {
        error: status === 500 ? 'Não foi possível gravar o arquivo JSON.' : error.message
      });
    }
    return;
  }

  sendJson(response, 404, { error: 'Rota não encontrada.' });
});

server.listen(PORT, HOST, () => {
  console.log(`Formulário de casos disponível em http://${HOST}:${PORT}`);
  console.log('Para encerrar, pressione Ctrl+C neste terminal do VS Code.');
});
