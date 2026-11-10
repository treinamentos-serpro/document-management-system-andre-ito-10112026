# Especificação - Document Management System

> Especificação derivada do modelo `spec-template.md`,
> preparada para o desenvolvimento guiado por especificação (Spec Driven Development).
> Este documento descreve requisitos, contratos e plano. Não contém código de implementação.

## 1. Objetivo

Entregar uma aplicação web que permita a um usuário enviar, listar e baixar documentos, armazenando os arquivos localmente no servidor e mantendo os metadados em memória nesta fase inicial.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (cada documento pertence a um dono e cada usuário vê apenas os próprios documentos)

### Fora do escopo

- Armazenamento externo ou em nuvem (S3, Google Drive, Azure Blob etc.)
- Serviços de upload de terceiros
- Versionamento de documentos
- Autenticação completa (login, senha, tokens, sessões); nesta fase a identidade do usuário é informada de forma simples (ver seção 6)
- Persistência em banco de dados; metadados ficam em memória e são perdidos ao reiniciar o servidor
- Exclusão, edição ou compartilhamento de documentos
- Pré-visualização de conteúdo no navegador

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O usuário pode enviar um documento (arquivo único por requisição) associado ao seu identificador |
| RF-02 | O usuário pode listar os documentos que enviou |
| RF-03 | O usuário pode baixar um documento pelo identificador, desde que seja o dono do documento |
| RF-04 | O sistema rejeita envios sem arquivo ou sem identificação do usuário, informando o motivo |
| RF-05 | O sistema rejeita arquivos acima do tamanho máximo configurado |
| RF-06 | O frontend exibe a lista de documentos do usuário e permite enviar um novo documento e baixar cada um |
| RF-07 | O frontend exibe mensagens de erro compreensíveis em português quando uma operação falha |

## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | Arquivos gravados no filesystem local da aplicação em `backend/storage`, via `multer` com `diskStorage` |
| RNF-02 | Metadados mantidos em memória nesta fase, sem banco de dados |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor), com valores padrão seguros para desenvolvimento |
| RNF-04 | Backend em Node.js + Express (CommonJS) com testes usando o runner nativo do Node (`node:test`) |
| RNF-05 | Frontend em React + Vite (ESM), com comunicação com o backend via `fetch` no prefixo `/api` (proxy Vite) |
| RNF-06 | Nomes de símbolos de código em inglês; mensagens ao usuário e comentários em português |
| RNF-07 | Código em JavaScript puro, sem TypeScript nesta fase |
| RNF-08 | O nome original do arquivo nunca é usado como caminho no disco, evitando travessia de diretório |
| RNF-09 | Os arquivos enviados não são acessíveis por URL estática; apenas pelo endpoint de download |

## 5. Modelo de dados (metadados do documento)

Entidade `Document`, mantida em memória:

| Campo        | Tipo   | Descrição |
| ------------ | ------ | --------- |
| id           | string | Identificador único do documento (UUID v4 gerado pelo servidor) |
| originalName | string | Nome original do arquivo enviado, usado apenas para exibição e download |
| storedName   | string | Nome do arquivo gravado em `backend/storage` (interno, não exposto na API) |
| mimeType     | string | Tipo MIME informado no envio |
| size         | number | Tamanho em bytes |
| uploadedAt   | string | Data/hora do upload em ISO 8601 (UTC) |
| owner        | string | Identificador do usuário dono do documento |

Regras:

- `id` e `storedName` são gerados pelo servidor; o cliente não os define.
- A API externa retorna apenas `id`, `originalName`, `mimeType`, `size`, `uploadedAt` e `owner`.
- Não há versionamento: cada upload cria um novo documento.
- A coleção de documentos é uma estrutura em memória do processo; reiniciar o servidor esvazia a lista, mas os arquivos já gravados permanecem em disco (ver riscos na seção 7).

## 6. Contratos de API

Base: rotas expostas pelo backend sem prefixo. O frontend chama essas rotas com o prefixo `/api`, que o proxy do Vite encaminha ao backend removendo o prefixo.

### Identificação do usuário

- Nesta fase, o usuário é informado pelo cabeçalho `X-User-Id` em todas as rotas.
- Cabeçalho ausente ou vazio resulta em `400 Bad Request`.
- Premissa a validar: o valor é um identificador livre (por exemplo, e-mail ou nome). Não há verificação de credenciais.

### Formato de erro (padrão para todas as rotas)

```json
{
  "error": {
    "code": "CODIGO_DO_ERRO",
    "message": "Mensagem em português para o usuário"
  }
}
```

Códigos de erro previstos:

| HTTP | code               | Quando ocorre |
| ---- | ------------------ | ------------- |
| 400  | MISSING_USER       | Cabeçalho `X-User-Id` ausente ou vazio |
| 400  | MISSING_FILE       | Requisição de upload sem campo de arquivo |
| 404  | DOCUMENT_NOT_FOUND | Documento inexistente ou pertencente a outro usuário |
| 413  | FILE_TOO_LARGE     | Arquivo acima de `MAX_FILE_SIZE_BYTES` |
| 500  | INTERNAL_ERROR     | Falha inesperada, incluindo erro de leitura ou gravação em disco |

Decisão: documento de outro usuário responde `404`, e não `403`, para não revelar a existência do identificador.

### POST /upload

- Entrada: `multipart/form-data` com um campo de arquivo chamado `file` e o cabeçalho `X-User-Id`.
- Saída `201 Created`: metadados do documento criado.

```json
{
  "id": "3f2c1a7e-8b4d-4e9a-9c1f-2d6e5b7a8c90",
  "originalName": "contrato.pdf",
  "mimeType": "application/pdf",
  "size": 48213,
  "uploadedAt": "2026-11-10T19:40:00.000Z",
  "owner": "maria@exemplo.com"
}
```

- Erros: `400 MISSING_USER`, `400 MISSING_FILE`, `413 FILE_TOO_LARGE`, `500 INTERNAL_ERROR`.

### GET /documents

- Entrada: cabeçalho `X-User-Id`.
- Saída `200 OK`: lista com os metadados dos documentos do usuário, na ordem de upload (mais recentes primeiro). Lista vazia é resposta válida.

```json
{
  "items": [
    {
      "id": "3f2c1a7e-8b4d-4e9a-9c1f-2d6e5b7a8c90",
      "originalName": "contrato.pdf",
      "mimeType": "application/pdf",
      "size": 48213,
      "uploadedAt": "2026-11-10T19:40:00.000Z",
      "owner": "maria@exemplo.com"
    }
  ]
}
```

- Erros: `400 MISSING_USER`, `500 INTERNAL_ERROR`.

### GET /documents/:id/download

- Entrada: parâmetro `id` na URL e cabeçalho `X-User-Id`.
- Saída `200 OK`: corpo binário do arquivo, com:
  - `Content-Type` igual ao `mimeType` do documento;
  - `Content-Length` igual ao `size`;
  - `Content-Disposition: attachment` com o `originalName` (codificado conforme RFC 5987 quando houver caracteres não ASCII).
- Erros: `400 MISSING_USER`, `404 DOCUMENT_NOT_FOUND`, `500 INTERNAL_ERROR`.

### Configuração (variáveis de ambiente)

| Variável            | Padrão            | Descrição |
| ------------------- | ----------------- | --------- |
| PORT                | 3000              | Porta HTTP do backend |
| STORAGE_DIR         | `backend/storage` | Pasta local onde os arquivos são gravados |
| MAX_FILE_SIZE_BYTES | 10485760 (10 MB)  | Tamanho máximo aceito por arquivo |

## 7. Decisões arquiteturais

### Backend: Clean Architecture simples

Em `backend/src`, com fluxo de dependência `routes -> controllers -> services -> repositories`:

- `routes/`: declaram os endpoints e delegam aos controllers.
- `controllers/`: convertem HTTP em chamadas de serviço, validam entrada básica (cabeçalho, presença do arquivo) e montam a resposta.
- `services/`: regras de negócio (vínculo ao dono, regra de 404 para outro dono, montagem de metadados, limite de tamanho).
- `repositories/`: guardam os metadados em memória e fazem a gravação e leitura dos arquivos em disco.

Camadas internas não importam camadas externas. Services não conhecem Express nem `multer`.

### Armazenamento local com multer

- `multer` com `diskStorage` grava os arquivos em `STORAGE_DIR` (padrão `backend/storage`).
- O `storedName` é gerado pelo servidor (UUID mais extensão segura), nunca o nome original.
- `limits.fileSize` aplica `MAX_FILE_SIZE_BYTES`; o erro do multer é convertido para `413`.
- Nenhum provedor externo é usado.

### Riscos e pontos em aberto

| Tema | Risco | Mitigação / decisão |
| ---- | ----- | ------------------- |
| Metadados em memória | Perda da lista ao reiniciar; arquivos órfãos em disco | Aceito nesta fase. Documentado; migrar para persistência em fase futura |
| Identificação por cabeçalho | Qualquer cliente pode se passar por outro usuário | Aceito para o escopo atual; autenticação fica fora do escopo |
| Tipo MIME informado pelo cliente | Pode não corresponder ao conteúdo real | Usado apenas para `Content-Type` no download; validação de conteúdo fora do escopo |
| Tamanho de arquivo | Uploads grandes consomem disco e memória | Limite configurável por `MAX_FILE_SIZE_BYTES` |
| Crescimento do storage | Sem exclusão, o disco cresce indefinidamente | Fora do escopo; registrado como evolução futura |

### Frontend

- React com componentes funcionais e hooks, organizado em `components/`, `pages/` e `services/`.
- `services/` concentra as chamadas `fetch` ao prefixo `/api`, incluindo o cabeçalho `X-User-Id`.
- Componentes reutilizáveis (por exemplo, exibição de erro e item da lista) para evitar duplicação.
- O identificador do usuário é informado na interface (campo simples) e persistido no `localStorage`.

## 8. Plano de execução

Plano em etapas na ordem de implementação. Cada etapa tem critérios de aceite verificáveis. A implementação ainda não foi iniciada.

### Etapa 1 - Base do backend

- Escopo: estrutura de pastas da Clean Architecture, aplicação Express, leitura de variáveis de ambiente, tratamento de erros padronizado e rota de saúde mínima.
- Critérios de aceite:
  - Servidor sobe na porta configurada por `PORT`.
  - Respostas de erro seguem o formato da seção 6.
  - Testes com `node:test` executam sem falhas.

### Etapa 2 - Repositório de documentos e armazenamento

- Escopo: repositório em memória para metadados e configuração do `multer` com `diskStorage` em `STORAGE_DIR`, com limite `MAX_FILE_SIZE_BYTES`.
- Critérios de aceite:
  - Metadados podem ser criados, listados por dono e buscados por id.
  - Arquivo gravado usa `storedName` gerado pelo servidor.
  - Pasta de storage é criada se não existir.

### Etapa 3 - Upload (RF-01, RF-04, RF-05)

- Escopo: service, controller e rota de `POST /upload`.
- Critérios de aceite:
  - Upload válido retorna `201` com metadados da seção 6.
  - Ausência de arquivo retorna `400 MISSING_FILE`.
  - Ausência de `X-User-Id` retorna `400 MISSING_USER`.
  - Arquivo acima do limite retorna `413 FILE_TOO_LARGE`.

### Etapa 4 - Listagem (RF-02)

- Escopo: service, controller e rota de `GET /documents`, filtrando pelo dono.
- Critérios de aceite:
  - Retorna apenas documentos do usuário informado.
  - Lista vazia retorna `200` com `items: []`.
  - Ordem: mais recentes primeiro.

### Etapa 5 - Download (RF-03)

- Escopo: service, controller e rota de `GET /documents/:id/download`, com cabeçalhos da seção 6.
- Critérios de aceite:
  - Dono recebe o arquivo com `Content-Type`, `Content-Length` e `Content-Disposition` corretos.
  - Outro usuário ou id inexistente recebe `404 DOCUMENT_NOT_FOUND`.
  - Arquivo ausente em disco resulta em `500 INTERNAL_ERROR` com log no servidor.

### Etapa 6 - Frontend base

- Escopo: projeto React + Vite, proxy `/api` para o backend, camada `services/` e campo de identificação do usuário com persistência em `localStorage`.
- Critérios de aceite:
  - `npm run dev` sobe a aplicação.
  - Requisições a `/api/documents` chegam ao backend.

### Etapa 7 - Telas de upload e listagem (RF-06, RF-07)

- Escopo: componente de envio, lista de documentos, botão de download e exibição de erros em português.
- Critérios de aceite:
  - Envio atualiza a lista sem recarregar a página.
  - Erros da API aparecem como mensagem ao usuário.
  - Download abre o arquivo com o nome original.

### Etapa 8 - Validação integrada e documentação

- Escopo: testes de integração ponta a ponta da API (upload, listagem, download, erros), atualização do README com instruções de execução e variáveis de ambiente.
- Critérios de aceite:
  - Fluxo completo upload -> listagem -> download passa nos testes.
  - Todas as variáveis da seção 6 estão documentadas.
  - Nenhuma funcionalidade existente é quebrada.