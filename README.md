# Painel PV

Site estático para consultar casos de análise de produtos e uma ferramenta local
para cadastrar ou excluir casos nos arquivos JSON do projeto.

## Requisitos

- Visual Studio Code.
- Git, para clonar o repositório e compartilhar alterações.
- Node.js 18 ou superior, para executar a ferramenta local de cadastro e exclusão.
- Navegador atualizado.
- Acesso à internet para carregar as bibliotecas e fontes externas usadas pelo site.

Não é necessário instalar dependências com npm: o servidor local usa apenas
módulos nativos do Node.js. A extensão **Live Server** do VS Code é opcional e
serve apenas para visualizar o site principal.

## Usar o site

1. Abra a pasta do projeto em um servidor web local. Uma opção é instalar a
   extensão **Live Server** e usar **Open with Live Server** no `index.html`.
2. No navegador, escolha uma categoria para consultar os casos.

O site precisa ser servido por HTTP para ler os arquivos JSON. Abrir `index.html`
diretamente como `file://` pode impedir o carregamento dos dados. O site também
usa recursos hospedados em CDNs; sem internet, fontes ou estilos externos podem
não carregar.

## Cadastrar ou excluir casos localmente

1. Abra a pasta raiz do projeto no VS Code.
2. Confirme que o Node.js está instalado, executando `node --version` no terminal.
3. Abra a paleta de comandos com `Ctrl+Shift+P`, escolha **Tasks: Run Task** e
   execute **Iniciar formulário de casos**.
4. Abra `http://127.0.0.1:4179/` no navegador.
5. Selecione a categoria para listar os casos. Use os formulários para cadastrar
   ou excluir um caso. Ao cadastrar, informe também a linha de produto. A
   exclusão pede confirmação.
6. Pare o servidor com `Ctrl+C` no terminal da tarefa quando terminar.

Abra a ferramenta pelo endereço local acima, não pelo arquivo
`tools/cadastro-casos/index.html`. O servidor precisa continuar ativo enquanto a
página estiver em uso. Ele escuta somente no próprio computador e grava as
alterações nos arquivos em `resources/data/` da pasta aberta no VS Code. Confira
as alterações no painel **Source Control** antes de fazer commit.

## Cadastrar ou excluir pelo GitHub

O repositório também possui formulários manuais do GitHub Actions:

1. Abra a aba **Actions** do repositório.
2. Escolha **Cadastrar caso** ou **Excluir caso**.
3. Selecione **Run workflow**, informe os campos e inicie a execução.

É necessário ter acesso ao repositório e permissão para executar workflows. A
ação grava um commit no branch selecionado no formulário do workflow. Confira o
branch antes de executar; não use essa opção para testar dados fictícios em um
branch compartilhado.

## Colaborar no código com VS Code

1. Peça acesso de colaborador ao repositório, se ainda não tiver permissão.
2. Clone o projeto e abra a pasta raiz no VS Code:

   ```text
   https://github.com/Anderralmeida1/P-gina.git
   ```

   Ou execute no terminal:

   ```bash
   git clone https://github.com/Anderralmeida1/P-gina.git
   ```

   No VS Code, escolha **File > Open Folder** para abrir a pasta clonada.
3. Crie um branch para sua tarefa antes de editar. No VS Code, use o indicador
   de branch na barra inferior ou o painel **Source Control**.
4. Edite os arquivos e confira a alteração em **Source Control**. Para mudanças
   nos dados, preserve o JSON válido e a estrutura descrita abaixo.
5. Valide o que alterou, faça commit no seu branch e envie-o ao GitHub.
6. Abra um Pull Request para revisão e integração ao branch principal.

### Extensões opcionais

- **Live Server**: inicia um servidor estático para visualizar o site principal.
- **GitHub Pull Requests and Issues**: permite trabalhar com Pull Requests pelo
  VS Code; também é possível usar o site do GitHub.

As extensões não são necessárias para editar ou executar a ferramenta de casos.
VS Code, Git e Node.js podem ser instalados pelos sites oficiais de seus
respectivos projetos.

## Estrutura do projeto

- `index.html`: seleção de categoria/modelo do painel.
- `painel.html`: visualização dos casos da categoria selecionada.
- `resources/data/modelos.json`: catálogo que associa nomes às categorias.
- `resources/data/analises-*.json`: dados exibidos e atualizados pelas ferramentas.
- `resources/js/`: carregamento, navegação e renderização do painel.
- `tools/cadastro-casos/`: interface e servidor local para cadastrar/excluir casos.
- `.vscode/tasks.json`: tarefa que inicia o servidor local.
- `.github/workflows/`: formulários de cadastro e exclusão pelo GitHub Actions.

Cada arquivo de análise contém informações do produto, a data de atualização e
uma lista `casos`. Os registros usam esta estrutura:

```json
{
  "caso": "12345678",
  "linhaProduto": "Alarmes",
  "criticidade": "Baixa",
  "dataAbertura": "27/11/2026",
  "dataLimite": "10/12/2026",
  "imagem": "",
  "resumo": ["Primeiro item", "Segundo item"]
}
```

`linhaProduto` aceita `Alarmes`, `Sensores` ou `Guardian`. No painel, os filtros
são botões flutuantes: os selecionados ficam verdes e podem ser combinados para
exibir os casos de qualquer uma das linhas escolhidas. Ao desativar todos os
botões, todos os casos voltam a ser exibidos. As datas dos arquivos são
armazenadas no formato `DD/MM/AAAA`. O catálogo de modelos deve apontar para o
nome do arquivo sem a extensão `.json`.

## Verificações antes de enviar alterações

O projeto não possui uma suíte de testes ou comandos npm configurados. Para
validar mudanças:

- Confira alterações de whitespace com `git diff --check`.
- Para mudanças no servidor, valide a sintaxe com
  `node --check tools/cadastro-casos/server.js`.
- Teste manualmente as páginas e a funcionalidade que foi alterada.
- Para mudanças nos dados, valide que os arquivos continuam sendo JSON válido e
  que cada categoria possui uma lista `casos`.
