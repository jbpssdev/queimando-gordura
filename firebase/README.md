# Firebase — Queimando Gordura 1.0

Configuração do Firebase Emulator Suite e regras de segurança do Cloud Firestore para a plataforma Queimando Gordura 1.0.

---

## 1. Regras de Segurança do Firestore (`firestore.rules`)

As regras negam categoricamente qualquer leitura ou escrita direta por clientes (anônimos ou autenticados via Firebase Client SDK):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Justificativa de Arquitetura
Toda operação sobre dados de usuário, perfil e futuras medições de saúde passa exclusivamente pela API NestJS autenticada. O backend utiliza o Firebase Admin SDK, que opera com credenciais privilegiadas e aplica as regras de autorização em nível de aplicação antes de consultar ou persistir dados. Dessa forma, nenhuma chave ou acesso vulnerável ao banco é exposto aos navegadores ou clientes externos.

---

## 2. Firebase Emulator Suite

Configuração em `firebase.json`:
- **Auth Emulator**: `127.0.0.1:9099`
- **Firestore Emulator**: `127.0.0.1:8080`
- **Emulator UI**: `127.0.0.1:4000`
- **Projeto padrão**: `demo-queimando-gordura` (definido em `.firebaserc`)

### Execução dos emuladores locais
Os emuladores utilizam a JRE portátil em `.tools/java` quando Java global não estiver no PATH:

```bash
# Iniciar emuladores em primeiro plano com interface Web:
npm run emulators

# Executar testes das regras de segurança:
npm run test:rules

# Executar testes integrados do backend com os emuladores:
npm run test:emulator --workspace backend
```
