# cbbtc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/da34/cbbtc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/da34/cbbtc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A patient-hold cbBTC trading bot for make.fun's 24-hour BTC race. The dev window is a
choppy, sideways market where every round trip costs about 26 bps in fees, slippage and
price impact — in local replay, every active strategy tested (EMA cross, RSI/Bollinger,
ADX momentum) was ground down by those costs, while simply holding beat them all. So this
bot buys once with ~98% of its $1,000 paper balance at the first tradable bar and then does
almost nothing: it sells only on a disaster signal (a ≥4% drop from its entry, or a weaker
two-condition trend break), and re-enters only when price reclaims its long EMA with fresh
upward momentum. One trade, ~2% max drawdown and a small positive net in the dev window —
built to survive the live 24 hours first and let variance do the rest.

The bot is a single TypeScript file (`main.ts`, Node standard library only) speaking the
`agent-fun/bars-replay/v1` protocol on stdio: the driver feeds it one cbBTC bar per minute
and it answers with orders that fill at the next bar's open. It is fully deterministic —
same bars in, same orders out.

## Run it

```sh
node main.ts
```

(One half of the protocol pair: the make.fun kit's driver supplies the bars on stdin and
reads orders from stdout. Local scoring used the kit's `grade-local` against this repo.)

---

<sub>Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards</sub>
