# Serviços Backend

Este documento descreve brevemente os serviços disponibilizados no backend após a refatoração.

- **AuthService**: centraliza regras de autenticação, como login e registro de usuários.
- **InventoryService**: lida com operações de inventário, incluindo listagem, consulta e criação.
- **ProductService**: encapsula buscas e manipulação de produtos, incluindo pesquisa por número de série.
- **UserService**: executa operações de CRUD de usuários com registro de auditoria.
- **ReportService**: gera relatórios finais, exportações CSV e validações de integridade.
- **ERPIntegrationService**: agrupa lógicas de integração com sistemas ERP externos.

Cada serviço é projetado para ser independente, facilitando testes e reutilização.
