import moment from "moment";
import { loadOrGenerateKeypair } from "./src/Helpers";
import {
  getAddressSOLBalance,
  getMinerCount,
  getRPCEndpoint,
  sendSOLTo,
} from "./utils";
import { spawn } from "child_process";

let running: string[] = [];
let mined = 0;
let totalTimeUsed = 0;
let lastMine = moment().unix();

const executeTask = async (index: number, pubkey: string) => {
  console.log(`Running: ${pubkey}`);
  if (!running.includes(pubkey)) running.push(pubkey);

  const command = __dirname.split("dist")[0] + `release\\ore`;
  let rpc = getRPCEndpoint();
  let keyLocation = __dirname.split("dist")[0] + `.local_keys\\${index}.json`;

  const args = [
    `--rpc`,
    rpc,
    `--keypair`,
    keyLocation,
    `--priority-fee`,
    `1200000`,
    `mine`,
    `--threads`,
    `10`,
  ];

  const child = spawn(command, args);
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", function (data) {
    if (data.includes("Success")) {
      console.log("stdout: " + `${pubkey}: ` + data);
      mined++;
      let currentMine = moment().unix();
      let diff = currentMine - lastMine;
      lastMine = currentMine;
      totalTimeUsed += diff;
    } else if (data.includes("Attempt")) {
      // do nothing
    } else if (!data) {
      // do nothing
    } else {
      //console.log("stdout: " + `${pubkey}: ` + data);
      // Don't really know what to look for in logs...
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", function (data) {
    console.log("stderr: " + `${pubkey} err: ` + data);
  });

  child.on("close", function (code) {
    console.log(`${index}: ${code}`);
    executeTask(index, pubkey);
  });
};

const MIN_BALANCE = 0.025;
// miner
(async () => {
  let minerCount = getMinerCount();
  let accounts: {
    pubkey: string;
    solBalance: number;
  }[] = [];

  for (var i = 0; i < minerCount; i++) {
    let account = loadOrGenerateKeypair(i.toString());
    let solBalance = await getAddressSOLBalance(account.publicKey);
    console.log({
      pubkey: account.publicKey.toBase58(),
      solBalance,
    });

    accounts.push({
      pubkey: account.publicKey.toBase58(),
      solBalance,
    });
  }

  accounts.forEach(async ({ pubkey, solBalance }, i) => {
    if (solBalance < 0.005) {
      console.log("sending sol");
      await sendSOLTo(pubkey, MIN_BALANCE + 0.005);
    }
    executeTask(i, pubkey);
  });

  setInterval(() => {
    console.log(`Total Mined: ${mined}`);
    console.log(
      `Average mine time(ms): ${Math.round((totalTimeUsed / mined) * 1000)}`
    );
  }, 60000);
})();
