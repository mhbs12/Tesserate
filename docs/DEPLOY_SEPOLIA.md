# Deploy em Sepolia

## 1. Configure o `.env`

Copie `.env.example` para `.env` e preencha:

```env
SEPOLIA_RPC_URL=https://...
SEPOLIA_PRIVATE_KEY=0x...
```

Esses valores sao usados apenas pelo Hardhat para fazer deploy. O frontend usa MetaMask do usuario.

## 2. Configure os parametros publicos

Edite `ignition/parameters/sepolia.json`:

```json
{
  "TesserateCoreModule": {
    "aavePool": "0x...",
    "paymentToken": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "paymentTokenPriceFeed": "0x..."
  }
}
```

- `aavePool`: endereco do Aave Pool na rede escolhida.
- `paymentToken`: USDC da Sepolia. O valor acima e o endereco oficial da Circle para USDC em Ethereum Sepolia.
- `paymentTokenPriceFeed`: feed Chainlink USDC/USD da mesma rede.

Nao faca deploy com `0x0000000000000000000000000000000000000000`.

## 3. Compile e teste

```bash
npm run compile
npm test
```

## 4. Deploy

```bash
npm run deploy:sepolia
```
