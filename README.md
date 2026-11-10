# Document Management System com GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey andre-koji-ito!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-andre-ito-10112026/issues/1)

---

## Execução e testes

- Backend: `npm --prefix backend install` e `npm --prefix backend run dev`.
- Frontend: `npm --prefix frontend install` e `npm --prefix frontend run dev`.
- Testes: `npm --prefix backend test` e `npm --prefix frontend test`.
- Build do frontend: `npm --prefix frontend run build`.

O backend usa `PORT` (padrão `3000`), `STORAGE_DIR` (padrão `backend/storage`) e `MAX_FILE_SIZE_BYTES` (padrão 10 MiB). O upload aceita até 16 campos adicionais, com até 64 KiB por campo e 17 partes no total.

## Publicação e segurança

O proxy `/api` do Vite funciona apenas no desenvolvimento. Para servir o build, configure o servidor HTTP ou proxy reverso para servir `frontend/dist` e encaminhar `/api/` ao backend, removendo o prefixo. Por exemplo, no bloco `server` do Nginx:

```nginx
root /caminho/para/frontend/dist;

location / {
	try_files $uri $uri/ /index.html;
}

location /api/ {
	proxy_pass http://127.0.0.1:3000/;
}
```

Configure HTTPS, limites de taxa e de corpo no proxy, compatíveis com o limite de arquivo e a sobrecarga multipart. Proteja o backend contra acesso direto não autorizado e monitore o espaço em disco. Restrinja a escrita em `STORAGE_DIR` ao processo da aplicação e não o sirva como diretório estático.

O cabeçalho `X-User-Id` não autentica usuários: qualquer cliente pode se passar por outro. Não use esta versão para documentos confidenciais. Os metadados permanecem em memória e são perdidos ao reiniciar; os arquivos continuam em disco e podem ficar órfãos. Planeje backup, verificação e limpeza manual cuidadosa, além de quotas no filesystem; autenticação e persistência de metadados estão fora do escopo atual.

---

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)

