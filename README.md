# Tesserate

Projeto Web3 com foco em escrow + governanca, cobrindo os requisitos de entrega:

- ERC-20
- NFT (ERC-721)
- Contrato de Staking com recompensa
- Governanca basica (DAO simplificada)
- Integracao com oraculo (Chainlink)
- Integracao com backend Web3

## Checklist de Requisitos

1. ERC-20: `TesserateGovernanceToken` (`TGT`) com supply fixo de 1.000.000.
2. NFT: `GuaranteeNFT` e `YieldRightNFT` (ERC-721).
3. Staking: `TGTStaking` para stake/unstake de TGT, poder de voto e recompensas em USDC.
4. DAO simplificada: `TgtDao` com proposta, voto, quorum e execucao.
5. Oraculo: `ChainlinkPriceOracle` com validacao de stale price.
6. Backend Web3: API HTTP read-only em `backend/server.js` usando `ethers`.

## Contratos

### `contracts/TesserateGovernanceToken.sol`
- Token de governanca `TGT`.
- Supply fixo: `1_000_000 * 10^18`.
- Sem funcao de mint publica para inflacao futura.

### `contracts/GuaranteeNFT.sol`
- NFT que representa o direito do funcionario ao saque do principal.

### `contracts/YieldRightNFT.sol`
- NFT que representa o direito da empresa ao saque do yield.

### `contracts/EscrowVault.sol`
- Recebe deposito da empresa em USDC e envia para Aave.
- Valida que o deposito vale mais de `1 USD` usando `ChainlinkPriceOracle`.
- Expoe `getDepositUsdValue(...)` para o frontend mostrar o valor estimado em USD antes do deposito.
- Cria os dois NFTs (funcionario e empresa).
- Libera principal para o dono do `GuaranteeNFT` apos o lock configurado no deploy.
- Libera yield para o dono do `YieldRightNFT` apos o lock configurado no deploy.
- Se o principal for liberado antes do claim manual do yield, o contrato liquida o yield pendente para o dono do `YieldRightNFT` antes de sacar o principal da Aave.
- Aplica taxa da plataforma com desconto por saldo de TGT:
  - `< 1000 TGT`: 10%
  - `>= 1000 TGT`: 9%
  - `>= 2000 TGT`: 8%
  - `>= 4000 TGT`: 7%
  - `>= 10000 TGT`: 5%
- Divide a taxa cobrada sobre o yield:
  - 50% para operacao da plataforma (`platformFeeRecipient`);
  - 50% para o contrato de staking (`stakingRewardsContract`), distribuido automaticamente como recompensa em USDC quando houver TGT em stake.
  - Se ainda nao houver TGT em stake, a parte de recompensas e redirecionada para a plataforma para evitar captura por um primeiro staker tardio.

### `contracts/TGTStaking.sol`
- Stake/unstake de TGT.
- Recebe recompensas em USDC via `notifyRewardAmount(...)` quando o `EscrowVault` cobra taxa.
- Tambem permite financiamento manual de recompensas em USDC via `fundRewards(...)`.
- Saque de recompensas acumuladas em USDC via `claimRewards()`.
- O poder de voto so e liberado depois do delay configurado no deploy.
- Depois do delay, o usuario chama `activateVotingPower()` para ativar o voto na DAO.
- Novo stake fica como `pendingVotingPower` e nao zera o voto ja ativo; depois do delay, `activateVotingPower()` soma a parte pendente ao voto ativo.
- Unstake remove primeiro do stake pendente; se precisar mexer no voto ativo, reduz apenas a parte sacada.
- Exposicao de `stakedBalance` e `totalStaked` para uso em governanca.
- A base de quorum da DAO usa o total de poder de voto ativo, evitando loop por todos os stakers na criacao de propostas.
- As recompensas sao financiadas por 50% das taxas em USDC cobradas pelo protocolo.

### `contracts/TgtDao.sol`
- DAO basica baseada no staking:
  - `propose(...)`
  - `vote(...)`
  - `execute(...)`
  - `cancel(...)`
- Para propor/votar, a conta precisa ter poder de voto maduro pelo `TGTStaking`.
- TGT em stake tambem conta para os descontos de taxa no `EscrowVault`.
- Parametros ajustaveis pelo owner:
  - `votingDelay`
  - `votingPeriod`
  - `proposalThreshold`
  - `quorumBps`

### `contracts/ChainlinkPriceOracle.sol`
- Registro de feed por token.
- Leitura de preco com Chainlink (`latestRoundData`).
- Validacao de `maxPriceAge` para evitar preco stale.
- Conversao para USD em escala `1e18`.

## Mocks de Teste

- `contracts/mocks/MockERC20.sol`
- `contracts/mocks/MockAavePool.sol`
- `contracts/mocks/MockGovernanceTarget.sol`
- `contracts/mocks/MockAggregatorV3.sol`

## Deployments

Rede alvo para testes: **Base Sepolia**.

Contratos deployados na Base Sepolia:

| Contrato | Endereco | Explorer |
| --- | --- | --- |
| `ChainlinkPriceOracle` | `0x932b80193477530A109108413f1b928a2C39D413` | [BaseScan](https://sepolia.basescan.org/address/0x932b80193477530A109108413f1b928a2C39D413) |
| `GuaranteeNFT` | `0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F` | [BaseScan](https://sepolia.basescan.org/address/0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F) |
| `TesserateGovernanceToken` | `0xf5535cA66aedd684E782D216B2182dE480c1e0BD` | [BaseScan](https://sepolia.basescan.org/address/0xf5535cA66aedd684E782D216B2182dE480c1e0BD) |
| `YieldRightNFT` | `0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9` | [BaseScan](https://sepolia.basescan.org/address/0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9) |
| `TGTStaking` | `0x4bDFEA9Edd3Fea2F489f67Cb8D625A4fD8694b65` | [BaseScan](https://sepolia.basescan.org/address/0x4bDFEA9Edd3Fea2F489f67Cb8D625A4fD8694b65) |
| `TestTgtFaucet` | `0x37C77bFC3CFcfE6c494954EBA56889fF3b8DD5Ec` | [BaseScan](https://sepolia.basescan.org/address/0x37C77bFC3CFcfE6c494954EBA56889fF3b8DD5Ec) |
| `EscrowVault` | `0xFBB1E514A9ce0D201209A175936ebeb73EEB1d0D` | [BaseScan](https://sepolia.basescan.org/address/0xFBB1E514A9ce0D201209A175936ebeb73EEB1d0D) |
| `TgtDao` | `0x47269034e3B78dF1806a63752B4CD59d96CA2Df4` | [BaseScan](https://sepolia.basescan.org/address/0x47269034e3B78dF1806a63752B4CD59d96CA2Df4) |

O deploy usa Hardhat Ignition, que guarda o estado em `ignition/deployments/chain-84532`.
Por isso, `npm run deploy:base-sepolia` reaproveita os contratos ja deployados quando o modulo
ja foi concluido. Depois de mudar os contratos e querer publicar bytecode novo, use o deploy com
reset:

```bash
npm run deploy:reset:base-sepolia
```

Se fizer um novo deploy ou redeploy, rode:

```bash
npm run frontend:sync:base-sepolia
```

Enderecos externos usados no deploy Base Sepolia:

| Recurso | Endereco |
| --- | --- |
| Aave V3 Pool | `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27` |
| USDC Aave Base Sepolia | `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` |
| USDC/USD price feed | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` |

### Modo teste da Base Sepolia

O arquivo `ignition/parameters/base-sepolia.json` deixa os tempos curtos para avaliacao:

| Regra | Valor de teste |
| --- | --- |
| Lock do escrow | entrada em minutos, minimo `1`, maximo `60` |
| Voting power do staking | libera depois de `60` segundos de stake |
| Periodo de votacao da DAO | `120` segundos (`2` minutos) |
| Delay inicial da DAO | `0` segundos |
| Cooldown do faucet de TGT | `60` segundos |

Os enderecos dos contratos Tesserate ficam em:

```text
ignition/deployments/chain-84532/deployed_addresses.json
```

## Backend Web3

Arquivo principal: `backend/server.js`

Endpoints principais:

- `GET /health`
- `GET /contracts/config`
- `GET /staking/:address`
- `GET /dao/proposal/:id`
- `GET /oracle/price?token=0x...`
- `GET /oracle/usd-value?token=0x...&amount=...&tokenDecimals=...`
- `GET /escrow/claimable?yieldRightTokenId=...`

Variaveis de ambiente de exemplo em: `backend/.env.example`

Este backend e somente leitura. Operacoes que mudam estado na chain (stake, vote, claim etc.) devem ser assinadas pela wallet do usuario no frontend.

## Mini Frontend

Arquivo principal: `frontend/index.html`

O mini frontend usa JavaScript no navegador e `ethers.js` para interagir com os contratos na Base Sepolia. Ele permite:

- conectar a MetaMask;
- trocar/adicionar a rede Base Sepolia na wallet;
- abrir faucet de ETH da Base Sepolia para gas de teste;
- abrir os contratos no explorer da Base Sepolia;
- consultar saldo de TGT, stake, recompensas com atualizacao automatica, poder de voto ativo, stake pendente e tempo restante para ativacao;
- aprovar e fazer stake de TGT;
- fazer unstake, ativar poder de voto e sacar recompensas;
- listar os `GuaranteeNFTs` e `YieldRightNFTs` da carteira, com valor ligado ao escrow, tempo restante em tempo real e botoes de resgate direto;
- criar, consultar, votar, executar e cancelar proposals da DAO;
- simular valor em USD e criar escrow;
- configurar um faucet de teste para jurados receberem TGT na Base Sepolia.

Subir o frontend local:

```bash
npm run frontend:start
```

Acesse: `http://localhost:5173`

### ETH de teste para gas

Para assinar transacoes na Base Sepolia, a carteira precisa de ETH de teste. O frontend tem um botao **Faucet ETH** que abre o faucet da Coinbase Developer Platform:

```text
https://portal.cdp.coinbase.com/products/faucet
```

Selecione **Base Sepolia**, cole/conecte a carteira e solicite ETH de teste. A documentacao da Base lista esse e outros faucets de Base Sepolia em `https://docs.base.org/base-chain/network-information/network-faucets`.

### Faucet de TGT para avaliadores

Como o supply inicial do TGT fica na carteira de deploy, use um faucet em Base Sepolia para permitir que avaliadores recebam tokens de teste.
O faucet nao cria novos TGT: ele apenas distribui os TGT que forem transferidos da carteira de deploy para o contrato `TestTgtFaucet`.
No deploy Base Sepolia, o `TestTgtFaucet` e criado junto com o modulo principal.

Depois do deploy, abasteca o faucet com TGT:

```bash
npm run fund:faucet
```

O script usa automaticamente o `TestTgtFaucet` do arquivo `ignition/deployments/chain-84532/deployed_addresses.json`.
Se existir um `FAUCET_ADDRESS` antigo no `.env`, ele sera ignorado quando houver um faucet no deploy atual. Para este deploy, o faucet correto e:

```text
0x37C77bFC3CFcfE6c494954EBA56889fF3b8DD5Ec
```

No frontend, abra a aba **Staking** e clique em **Claim TGT**. Depois de rodar `npm run frontend:sync:base-sepolia`, o endereco do faucet fica preenchido automaticamente.

Na Base Sepolia de teste, o faucet libera `2000 TGT` por carteira a cada 1 minuto. Isso permite testar saldo, stake, unstake, tiers de desconto e parte do fluxo do protocolo. A DAO exige 1 minuto de stake maduro para criar/votar proposals, conforme a regra configurada no contrato `TGTStaking`. Se a carteira adicionar mais TGT ao stake depois de ja ter voto ativo, o voto atual continua valendo e apenas o novo valor fica pendente por 1 minuto.

### USDC de teste para o escrow

O `EscrowVault` na Base Sepolia usa o USDC listado no mercado da Aave Base Sepolia:

```text
0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f
```

Para pegar o USDC correto, conecte a carteira em **Base Sepolia** no faucet da Aave e selecione o asset USDC:

```text
https://app.aave.com/faucet/
```

Se a carteira receber outro USDC, o escrow nao vai aceitar esse token. O endereco precisa bater com `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f`.

Observacao: se o deposito reverter com `execution reverted: 51`, esse erro vem da Aave V3 e significa `SUPPLY_CAP_EXCEEDED`. Tente um valor menor; se o erro continuar, use o deploy demo abaixo para uma apresentacao sem depender do limite da testnet.

Para uma apresentacao 100% testavel por avaliadores, existe um deploy demo separado com `MockERC20` e `MockAavePool`:

```bash
npm run deploy:demo:base-sepolia
```

Esse deploy demo mantem os fluxos principais do protocolo, mas usa USDC mock com `mint` publico e uma pool Aave mockada, evitando depender de faucet externo ou liquidez de testnet.

### Exemplo de escrita no frontend (ethers v6)

```js
import { ethers } from "ethers";

async function getWalletContracts() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  const configResponse = await fetch("http://localhost:3001/contracts/config");
  const config = await configResponse.json();

  const staking = new ethers.Contract(config.stakingAddress, config.abis.staking, signer);
  const dao = new ethers.Contract(config.daoAddress, config.abis.dao, signer);
  const escrow = new ethers.Contract(config.escrowVaultAddress, config.abis.escrow, signer);

  return { staking, dao, escrow };
}

export async function stake(amountWei) {
  const { staking } = await getWalletContracts();
  const tx = await staking.stake(amountWei);
  return tx.wait();
}

export async function claimStakingRewards() {
  const { staking } = await getWalletContracts();
  const tx = await staking.claimRewards();
  return tx.wait();
}

export async function previewDepositUsdValue(paymentToken, amountWei) {
  const { escrow } = await getWalletContracts();
  return escrow.getDepositUsdValue(paymentToken, amountWei);
}

export async function vote(proposalId, support) {
  const { dao } = await getWalletContracts();
  const tx = await dao.vote(BigInt(proposalId), support);
  return tx.wait();
}

export async function claimYield(yieldRightTokenId) {
  const { escrow } = await getWalletContracts();
  const tx = await escrow.claimYield(BigInt(yieldRightTokenId));
  return tx.wait();
}
```

## Deploy (Ignition)

Modulo: `ignition/modules/TesserateCore.ts`

Esse modulo faz deploy de:

- `GuaranteeNFT`
- `YieldRightNFT`
- `TesserateGovernanceToken`
- `TGTStaking`
- `TgtDao`
- `ChainlinkPriceOracle`
- `EscrowVault`
- `TestTgtFaucet`

E conecta o `EscrowVault` ao token de governanca e ao `TGTStaking`.
O modulo tambem configura um feed inicial no `ChainlinkPriceOracle`.
Informe `paymentToken` como o endereco do USDC usado pelo protocolo e `paymentTokenPriceFeed` como o feed USDC/USD.

## Comandos

Instalar dependencias:

```bash
npm install
```

Compilar:

```bash
npm run compile
```

Rodar testes:

```bash
npm test
```

Subir backend local:

```bash
npm run backend:start
```

Subir mini frontend local:

```bash
npm run frontend:start
```

Deploy completo na Base Sepolia:

```bash
npm run deploy:base-sepolia
```

Verificar contratos na Base Sepolia:

```bash
npm run verify:base-sepolia
```

Sincronizar os enderecos do deploy no frontend:

```bash
npm run frontend:sync:base-sepolia
```

Smoke test na Base Sepolia:

```bash
npm run smoke:base-sepolia
```

Deploy demo com USDC e Aave mockados:

```bash
npm run deploy:demo:base-sepolia
```

Abastecer o faucet com TGT:

```bash
npm run fund:faucet
```

## Testes

A suite cobre:

- fluxo do escrow em USDC com fees por tier de TGT;
- split 50/50 das taxas entre plataforma e recompensas de staking em USDC;
- supply fixo do TGT;
- staking (stake/unstake, recompensas e poder de voto maduro);
- DAO (proposta, voto, quorum, execucao);
- oraculo Chainlink (preco e stale check).

## Observacoes

- O projeto nao foi auditado.
- Antes de producao, recomenda-se auditoria externa e hardening adicional.
