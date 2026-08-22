import "dotenv/config";
import { verifyPerplDeployment } from "./perpl/client.js";

const result = await verifyPerplDeployment();
console.log(JSON.stringify(result, null, 2));
