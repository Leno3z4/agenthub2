import "dotenv/config";
import { getPerplContext } from "./perpl/api.js";
import { verifyPerplDeployment } from "./perpl/client.js";

const [deployment, context] = await Promise.all([
  verifyPerplDeployment(),
  getPerplContext(),
]);

console.log(JSON.stringify({
  deployment,
  markets: context.markets.map(({ id, symbol, config, state }) => ({
    id,
    symbol,
    open: config.is_open,
    bid: state.bid,
    ask: state.ask,
  })),
}, null, 2));
