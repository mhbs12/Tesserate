# Relatorio de Auditoria - Tesserate

## Resumo

Este relatorio registra uma auditoria simples do MVP Tesserate usando Hardhat,
Slither e Mythril, conforme solicitado no enunciado do trabalho. A auditoria foi
feita sobre os contratos Solidity do protocolo e sobre os contratos ja
deployados na Base Sepolia.

Resultado geral: os testes Hardhat passaram, o Slither encontrou achados
principalmente de reentrancy potencial, uso de timestamp, validacao parcial de
retorno de oracle e itens informacionais/otimizacoes. O Mythril retornou muitos
alertas de overflow aritmetico em bytecode deployado; apos revisao manual, esses
alertas foram classificados como falsos positivos provaveis ou nao confirmados,
pois o projeto usa Solidity `^0.8.x`, que ja aplica checagem automatica de
overflow/underflow.

Este relatorio nao substitui uma auditoria profissional.

## Escopo

Contratos analisados:

- `contracts/ChainlinkPriceOracle.sol`
- `contracts/EscrowVault.sol`
- `contracts/GuaranteeNFT.sol`
- `contracts/TesserateGovernanceToken.sol`
- `contracts/TestTgtFaucet.sol`
- `contracts/TgtDao.sol`
- `contracts/TGTStaking.sol`
- `contracts/YieldRightNFT.sol`

Fora do escopo principal:

- contratos mock em `contracts/mocks/`;
- artefatos gerados em `artifacts/`, `cache/` e `types/`;
- frontend, scripts de deploy e configuracoes locais.

## Ambiente

Arquivos brutos da auditoria:

- `reports/audit/raw/hardhat-compile.txt`
- `reports/audit/raw/hardhat-test.txt`
- `reports/audit/raw/slither-checklist.md`
- `reports/audit/raw/slither-results.json`
- `reports/audit/raw/mythril-*.md`

Versoes registradas:

| Ferramenta | Versao |
| --- | --- |
| Node.js | `v24.15.0` |
| npm | `11.12.1` |
| Hardhat | `3.4.0` |
| Slither | `0.11.5` |
| solc | `0.8.28+commit.7893614a.Linux.g++` |
| Mythril | `v0.24.8` |

## Comandos

Hardhat:

```bash
npm run compile
npm test
```

Slither:

```bash
slither contracts \
  --solc-remaps "@openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink" \
  --solc-args "--optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules" \
  --filter-paths "node_modules|artifacts|cache|test|types|contracts/mocks|.deps|reports" \
  --checklist > reports/audit/raw/slither-checklist.md 2>&1
```

```bash
slither contracts \
  --solc-remaps "@openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink" \
  --solc-args "--optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules" \
  --filter-paths "node_modules|artifacts|cache|test|types|contracts/mocks|.deps|reports" \
  --json reports/audit/raw/slither-results.json > reports/audit/raw/slither-json-console.txt 2>&1
```

Mythril, exemplo por contrato deployado:

```bash
myth analyze -a <CONTRACT_ADDRESS> \
  --rpc sepolia.base.org:443 \
  --rpctls True \
  --execution-timeout 120 \
  -t 3 \
  -o markdown > reports/audit/raw/mythril-<ContractName>.md 2>&1
```

## Resultado dos testes Hardhat

O comando `npm test` executou a suite de testes automatizados com sucesso:

```text
27 passing (1s)
27 passing (27 mocha)
```

Cobertura funcional da suite:

- supply fixo do token `TGT`;
- criacao e resgate de escrow;
- validacao de deposito maior que 1 USD;
- tiers de taxa por saldo/stake de TGT;
- split 50/50 da taxa entre plataforma e recompensas de staking;
- staking, unstake, rewards e maturacao de poder de voto;
- DAO com proposta, voto, quorum, execucao e protecao contra reuso de votos;
- oracle Chainlink com preco valido e rejeicao de preco stale.

## Resultado do Slither

O Slither gerou `38` detectores:

| Impacto | Quantidade |
| --- | ---: |
| Medium | 2 |
| Low | 15 |
| Optimization | 4 |
| Informational | 17 |

Resumo por tipo:

| Detector | Quantidade | Classificacao |
| --- | ---: | --- |
| `reentrancy-no-eth` | 1 | Revisado, mitigado |
| `reentrancy-benign` | 1 | Revisado, mitigado |
| `unused-return` | 1 | Melhoria recomendada |
| `timestamp` | 14 | Aceito por regra de negocio |
| `low-level-calls` | 1 | Intencional na DAO |
| `immutable-states` | 4 | Otimizacao |
| `naming-convention` | 16 | Informacional |

### AUD-01 - Reentrancy potencial em `EscrowVault.releasePayment`

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Medium |
| Arquivo | `contracts/EscrowVault.sol` |
| Linhas | `336-359` |
| Status | Aceito com mitigacoes |

O Slither apontou que `releasePayment` chama `_settleYield`, que por sua vez
faz chamadas externas para Aave e para o contrato de staking antes de
`service.principalReleased = true`.

Revisao manual:

- `releasePayment` e `claimYield` usam `nonReentrant`;
- `_settleYield` e uma funcao `private`, sem entrada externa direta;
- `service.claimedYield` e atualizado antes das chamadas externas de saque e
  notificacao de reward;
- as transferencias de ERC-20 usam `SafeERC20`;
- a suite Hardhat cobre resgate de principal, resgate de yield e liquidacao de
  yield pendente antes do principal.

Conclusao: o achado e relevante para revisao, mas a exploracao direta fica
mitigada por `ReentrancyGuard` e pela atualizacao de `claimedYield` antes dos
efeitos externos. Para producao, seria recomendavel uma revisao adicional da
ordem de efeitos ou uso de flag intermediaria de liquidacao.

### AUD-02 - Reentrancy benigno em `EscrowVault.deposit`

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Low |
| Arquivo | `contracts/EscrowVault.sol` |
| Linhas | `273-332` |
| Status | Aceito com mitigacoes |

O Slither apontou chamadas externas para Aave e para os contratos NFT antes de
escrever `services[guaranteeTokenId]` e `yieldRightToGuaranteeToken`.

Revisao manual:

- `deposit` usa `nonReentrant`;
- o fluxo depende dos token IDs retornados pelos contratos NFT;
- os contratos NFT sao parte do protocolo e possuem mint restrito ao
  `EscrowVault`;
- o deposito exige USDC configurado, valor maior que 1 USD pelo oracle e
  duracao dentro dos limites.

Conclusao: classificado como risco baixo e aceito no MVP. Em ambiente de
producao, a dependencia em contratos externos deve ser revisada junto com a
configuracao dos enderecos deployados.

### AUD-03 - Retorno parcial do Chainlink `latestRoundData`

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Medium |
| Arquivo | `contracts/ChainlinkPriceOracle.sol` |
| Linhas | `47-58` |
| Status | Melhoria recomendada |

O Slither apontou que `getLatestPrice` ignora parte do retorno de
`latestRoundData`.

Revisao manual:

- o contrato valida `answer > 0`;
- valida `answerUpdatedAt > 0`;
- valida `block.timestamp - answerUpdatedAt <= maxPriceAge`;
- nao valida explicitamente `roundId` e `answeredInRound`.

Conclusao: o comportamento atual e suficiente para o MVP academico, mas uma
versao de producao deveria ler `roundId` e `answeredInRound` para rejeitar
rounds incompletos ou inconsistentes.

### AUD-04 - Uso de `block.timestamp`

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Low |
| Arquivos | `EscrowVault.sol`, `TgtDao.sol`, `TGTStaking.sol`, `TestTgtFaucet.sol`, `ChainlinkPriceOracle.sol` |
| Status | Aceito por regra de negocio |

O Slither apontou uso de timestamp em locks de escrow, periodo de votacao,
delay de staking, cooldown do faucet e validacao de preco stale.

Conclusao: o uso de `block.timestamp` e intencional, pois o protocolo depende de
janelas de tempo. O risco residual e a pequena manipulacao possivel de timestamp
por validadores, considerada aceitavel para locks e janelas de minutos no MVP.

### AUD-05 - Chamada low-level na DAO

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Informational |
| Arquivo | `contracts/TgtDao.sol` |
| Linhas | `210-222` |
| Status | Intencional |

`TgtDao.execute` usa `proposal.target.call{value: proposal.value}(proposal.data)`
para executar a acao aprovada pela governanca.

Conclusao: o uso de low-level call e esperado em contratos de governanca. A
funcao exige proposta existente, estado `Succeeded`, usa `nonReentrant`, marca
`executed = true` antes da chamada e reverte se a chamada falhar.

### AUD-06 - Otimizacoes e estilo

| Campo | Valor |
| --- | --- |
| Ferramenta | Slither |
| Severidade | Optimization / Informational |
| Status | Sem impacto de seguranca |

O Slither apontou:

- variaveis de `EscrowVault` que poderiam ser `immutable`;
- parametros com prefixo `_` fora do padrao `mixedCase`;
- constante `VOTING_POWER_DELAY` sinalizada por convencao de nome.

Conclusao: esses achados nao indicam vulnerabilidade. Podem ser tratados em uma
rodada futura de limpeza/otimizacao.

## Resultado do Mythril

O Mythril foi executado contra bytecode deployado na Base Sepolia. Os arquivos
brutos ficam em `reports/audit/raw/mythril-*.md`.

Resumo:

| Contrato | Resultado |
| --- | --- |
| `ChainlinkPriceOracle` | Alertas SWC-101 |
| `EscrowVault` | Alertas SWC-101 |
| `GuaranteeNFT` | Alertas SWC-101 |
| `TesserateGovernanceToken` | Alertas SWC-101 |
| `YieldRightNFT` | Alertas SWC-101 |
| `TGTStaking` | Alertas SWC-101 e SWC-107 |
| `TgtDao` | Saida parcial com alertas SWC-101 e interrupcao registrada |
| `TestTgtFaucet` | Execucao interrompida antes de resultado util |

### AUD-07 - Alertas de integer arithmetic no Mythril

| Campo | Valor |
| --- | --- |
| Ferramenta | Mythril |
| Severidade reportada | High |
| SWC | `SWC-101` |
| Status | Nao confirmado / falso positivo provavel |

O Mythril reportou varios alertas de integer overflow/underflow em bytecode
deployado. A maioria apareceu em seletores desconhecidos, getters, funcoes da
OpenZeppelin ou trechos onde o Solidity `^0.8.x` ja adiciona checagem
automatica de overflow/underflow.

Revisao manual:

- todos os contratos usam Solidity `^0.8.20`;
- operacoes criticas de divisao/multiplicacao usam `Math.mulDiv` quando
  apropriado;
- os testes Hardhat cobrem cenarios de taxas, recompensas pequenas, rounding da
  Aave, quorum e staking;
- o Mythril analisou bytecode deployado, sem contexto completo de fonte e
  invariantes do protocolo.

Conclusao: os alertas SWC-101 foram registrados, mas nao foram confirmados como
vulnerabilidades exploraveis no escopo do MVP.

### AUD-08 - Alertas de reentrancy no Mythril

| Campo | Valor |
| --- | --- |
| Ferramenta | Mythril |
| Severidade reportada | Low |
| SWC | `SWC-107` |
| Status | Nao confirmado / mitigado |

O Mythril reportou tres alertas SWC-107 no `TGTStaking`. Revisao manual mostra
que as funcoes de movimentacao de tokens e recompensas usam `nonReentrant` e
`SafeERC20`.

Conclusao: nao foi confirmado caminho exploravel. O achado permanece registrado
como alerta automatizado de baixa severidade.

## Conclusao

Para o escopo academico do MVP, o projeto atende aos principais requisitos de
seguranca solicitados:

- uso de Solidity `^0.8.x`;
- contratos baseados em OpenZeppelin;
- uso de `Ownable` para funcoes administrativas;
- uso de `ReentrancyGuard` em funcoes sensiveis;
- uso de `SafeERC20` para transferencias;
- validacao de preco stale no oracle;
- suite Hardhat com `27` testes passando.

Nenhuma vulnerabilidade critica foi confirmada manualmente. Os principais
pontos de atencao para uma versao de producao seriam:

1. reforcar a validacao dos retornos de `latestRoundData`;
2. revisar a ordem de efeitos/chamadas externas no `EscrowVault`;
3. considerar `immutable` para dependencias fixas do `EscrowVault`;
4. ampliar testes com fuzzing/invariants;
5. fazer auditoria externa antes de qualquer uso real.
