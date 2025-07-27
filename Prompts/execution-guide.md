
# Guia de Execução dos Prompts

## Como Usar Este Sistema de Prompts

### Sequência de Execução
Execute os prompts na seguinte ordem:

1. **01-database.md** - Alterações no banco de dados
2. **02-backend.md** - APIs e lógica de negócio  
3. **03-frontend.md** - Interfaces de usuário
4. **04-integration.md** - Integração e testes finais

### Metodologia

#### Para cada prompt:
1. **Leia completamente** o arquivo do prompt
2. **Copie o conteúdo** completo do prompt
3. **Cole no Agent** e execute
4. **Verifique** se todas as tarefas foram completadas
5. **Teste** as funcionalidades antes de prosseguir

#### Validação entre etapas:
- Após **01-database**: Verifique se as tabelas foram criadas/alteradas corretamente
- Após **02-backend**: Teste as APIs com Postman ou similar
- Após **03-frontend**: Verifique se as telas carregam sem erro
- Após **04-integration**: Execute testes completos

### Dependências Importantes

- **Database → Backend**: Backend depende do schema atualizado
- **Backend → Frontend**: Frontend depende das APIs funcionando
- **Frontend → Integration**: Integração depende de todos os componentes

### Dicas para o Agent

#### Contexto sempre presente:
```
Sistema de inventário existente sendo refatorado para suportar:
- Múltiplas contagens (C1, C2, C3, C4)
- Status detalhados (Aberto, 1ª contagem, 2ª contagem, 3ª contagem, Auditoria, Divergência, Fechado)
- Mesa de Controle com KPIs
- Controle de patrimônio
- Seleção de locais e categorias
- Auditoria completa
```

#### Se houver erro:
1. Identifique qual prompt/etapa causou o problema
2. Corrija o problema específico
3. Re-execute o prompt da etapa
4. Continue com as próximas etapas

### Checklist de Conclusão

Após executar todos os prompts, o sistema deve ter:

- ✅ Banco de dados com todas as novas tabelas/campos
- ✅ APIs funcionando para todas as operações
- ✅ Mesa de Controle operacional
- ✅ Contagens individuais funcionando
- ✅ Controle de patrimônio implementado
- ✅ Auditoria completa
- ✅ Interface responsiva e intuitiva
- ✅ Validações de regras de negócio
- ✅ Performance adequada

### Troubleshooting

Se algo não funcionar:
1. Verifique os logs do console
2. Confirme se a etapa anterior foi completada
3. Re-execute o prompt problemático
4. Consulte o README.md para referência
