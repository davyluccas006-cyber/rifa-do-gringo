# Rifa do Gringo

## Publicação
1. Instale Node.js 20+.
2. Rode `npm install`.
3. Crie `.env` a partir de `.env.example` e defina uma senha forte em `ADMIN_PASSWORD`.
4. Rode `npm start`.
5. Site público: `/`
6. Painel administrativo: `/admin`

O clique em uma cota apenas abre o WhatsApp. A cota só vira COMPRADA quando o administrador confirma no painel. O banco SQLite é persistente em `data/rifa.db`.

Para uso público em produção, hospede o projeto em um servidor com armazenamento persistente e HTTPS.