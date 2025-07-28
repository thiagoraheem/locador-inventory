# Parâmetros / Regras de Inventário

## 🔒 Congelamento de Dados

Antes do início de qualquer contagem, os seguintes dados são **congelados** a partir da integração com o sistema externo (Locador ou equivalente):

- Lista de produtos com seus respectivos **números de série**
- Categorias e grupos/subgrupos dos produtos
- Estoque atual por produto/local
- Endereçamento e locais físicos de armazenamento

> ⚠️ O congelamento ocorre até 24h antes do início do inventário e impede alterações no sistema base enquanto as contagens estiverem ativas.

---

## 🔢 Regras de Contagem

### Contagem 1 (Obrigatória)
- Realizada por um primeiro colaborador.
- Input manual no sistema com hora e usuário identificados.

### Contagem 2 (Obrigatória)
- Realizada por um segundo colaborador **diferente do primeiro**.
- Também é registrada de forma cega (sem acesso à contagem anterior ou ao estoque congelado).

### Comparação entre as duas primeiras contagens:
- **Se uma das duas contagens (1ª ou 2ª) for igual ao estoque congelado:** o valor do estoque é mantido como correto.
- **Se 1ª e 2ª contagens forem iguais entre si, mas diferentes do estoque:** considera-se **divergência válida**, e assume-se o valor da **2ª contagem** como o valor final.
- **Se houver divergência entre 1ª e 2ª contagens e nenhuma for igual ao estoque congelado:** habilita-se a **3ª contagem obrigatória**.

### Contagem 3 (Condicional)
- Executada por um terceiro colaborador designado.
- Considerada o **valor final** para aquele item específico.

---

## ✅ Cálculo do Resultado Final

| Situação                                   | Valor Final Considerado     | Divergência? |
|-------------------------------------------|------------------------------|--------------|
| 1ª == 2ª == estoque                        | Estoque congelado            | ❌ Não       |
| 1ª ou 2ª == estoque                        | Estoque congelado            | ❌ Não       |
| 1ª == 2ª ≠ estoque                         | 2ª Contagem                  | ✅ Sim       |
| 1ª ≠ 2ª ≠ estoque                          | 3ª Contagem (obrigatória)    | ✅ Sim       |

---

## 📄 Relatório Final

Ao término do inventário, o sistema deve gerar um relatório completo contendo:

- Identificação do inventário (tipo, data, filial)
- Listagem de produtos contados
- Quantidade por contagem (1ª, 2ª, 3ª quando houver)
- Estoque congelado
- Valor final assumido
- Divergência (Sim/Não)
- Valor da divergência em quantidade e percentual
- Indicadores de desempenho:
  - Total de itens com divergência
  - % de acuracidade
  - Valor financeiro total das sobras e faltas

O relatório será exportável em **PDF** e **Excel**, com assinatura eletrônica do responsável.

---

## 🔐 Regras de Segurança e Rastreabilidade

- Cada contagem é registrada com usuário, data/hora e localização.
- Acesso às contagens é controlado por papel de usuário.
- Logs de auditoria são mantidos para todos os ajustes e decisões finais.
