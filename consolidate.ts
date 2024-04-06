import { loadOrGenerateKeypair } from "./src/Helpers";
import {
  getAdminAccount,
  getMinerCount,
  getUserTokens,
  sendTokensTo,
} from "./utils";

const TOKEN_ADDRESS = "oreoN2tQbHXVaZsr3pf66A48miqcBXCDJozganhEJgz";
const MIN_HARVEST = 0.01;
const API_BACKOFF = 5; // 2 seconds

(async () => {
  let minerCount = getMinerCount();
  var tasks: Promise<void>[] = [];

  console.log("Consolidating to main");
  let collector = getAdminAccount();

  tasks = [];

  for (let i = 0; i < minerCount; i++) {
    tasks.push(
      new Promise(async (resolve, reject) => {
        let account = loadOrGenerateKeypair(i.toString());
        await new Promise<void>((resolve) => setTimeout(resolve, i * API_BACKOFF * 1000));
        while (true) {
          try {
            let mintData = await getUserTokens(account.publicKey);
            let oreData = mintData[TOKEN_ADDRESS];

            if (!oreData) {
              console.log("NO ORE DATA?!!?");
              // probably api slow or something... try again
              continue;
            }

            if (oreData.amount > MIN_HARVEST) {
              const lessAmount = oreData.amount - 0.00001;
              console.log("Index " + i);
              console.log("Sending " + lessAmount + " to main");
              const result = await sendTokensTo(
                collector.publicKey.toBase58(),
                TOKEN_ADDRESS,
                oreData.decimals,
                lessAmount,
                account
              );
              console.log("RESULT: " + result);
              console.log("Sent " + lessAmount + " to main");
              // sleep for abit, wait for blockchain to update.
              await new Promise<void>((resolve) => setTimeout(resolve, 5000));
            } else {
              // I have no more ore to send...
              console.log("Skipping: " + i);
              break;
            }
          } catch (error) {
            console.log("ERROR in catch:" + error);
          }
        }
        resolve();
      })
    );
  }
  await Promise.all(tasks);
})();
