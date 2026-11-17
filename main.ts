// cbBTC race bot: patient hold, disaster-only exit.
//
// The economics of this race, from the kit's own numbers: a full-size round trip costs about
// 26 bps (4 bps fee + 2 bps slippage + constant-product impact, each way), so every round trip
// starts a quarter of a percent behind. On one-minute bars of a single pool that trades a few
// times a minute, that toll eats crossover, breakout and mean-reversion systems alive: graded
// on this kit's dev window, the active house baselines lose $24 to $106 while the two patient
// ones (buy-and-hold, and a momentum bot that in practice buys once and holds) finish ahead.
// The dev window also shows why the exit has to be slow: it slid about 1% early, chopped for
// hours and rallied late, so every "confirmed downtrend" exit fired mid-chop and every
// re-entry paid the toll again into the next dip.
//
// So this bot trades as little as the rules allow:
//   - Enter at the first tradable bar, ~98% of cash. Long only, cash earns nothing, and the
//     race is ranked on net PnL: the default state is invested.
//   - Exit only on a disaster: the close is 4% under the entry price, or the 720-minute
//     return is under -2% with the close under its 240-bar EMA (a slide that has lasted
//     half a day, not a wick). Ordinary 1-2% drawdowns are held through.
//   - After a disaster exit, re-enter only on a strong recovery: the close back over the
//     240-bar EMA and the 240-minute return over +0.5%.
// In a rising race this captures nearly the whole move for one round trip of costs; in a
// falling race it steps aside near -4% while holders ride the fall to the bottom, and the
// places pay the highest net PnLs whatever their sign; in a choppy race it behaves like
// buy-and-hold, which is what the costs reward. Orders cap slippage at 100 bps past the
// close they were decided on, so a fill into a liquidity gap is refused and retried on the
// next bar instead of filled for almost nothing.
//
// Everything runs on float64 closes with + - * / only, so two runs on the same bars give the
// same orders byte for byte.

import { runBars, type Bar } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 240;
const CRASH_STOP = 0.04;
const SLIDE_LOOKBACK = 720;
const SLIDE_RETURN = -0.02;
const RECOVERY_LOOKBACK = 240;
const RECOVERY_RETURN = 0.005;
const MAX_SLIPPAGE_BPS = 100;

const closes: number[] = [];
let ema: number | null = null;
let entryPrice: number | null = null;
/** True once the first entry is in; a later flat period is a post-disaster wait, not a start. */
let started = false;

function pushClose(bar: Bar): void {
  const c = Number(bar.c);
  closes.push(c);
  if (ema === null) {
    if (closes.length === EMA_SPAN) ema = closes.reduce((a, x) => a + x, 0) / EMA_SPAN;
  } else {
    ema += (2 / (EMA_SPAN + 1)) * (c - ema);
  }
}

function lookbackReturn(span: number): number | null {
  if (closes.length <= span) return null;
  return closes[closes.length - 1]! / closes[closes.length - 1 - span]! - 1;
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) if (bar.symbol === SYMBOL) pushClose(bar);
    if (state.warmingUp || closes.length === 0) return [];

    const held = state.positions.get(SYMBOL);
    const close = closes[closes.length - 1]!;

    if (held === undefined) {
      const recovery = lookbackReturn(RECOVERY_LOOKBACK);
      const recovered = ema !== null && close > ema && recovery !== null && recovery > RECOVERY_RETURN;
      if (!started || recovered) {
        const notional = (state.cash * 98n) / 100n;
        if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
        entryPrice = close;
        started = true;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    const slide = lookbackReturn(SLIDE_LOOKBACK);
    const crashed = entryPrice !== null && close <= entryPrice * (1 - CRASH_STOP);
    const slidAllDay = slide !== null && slide < SLIDE_RETURN && ema !== null && close < ema;
    if (crashed || slidAllDay) {
      entryPrice = null;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
