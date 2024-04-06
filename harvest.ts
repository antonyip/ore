import { getMinerCount, getRPCEndpoint, getRPCHelloMoon } from "./utils";
import { spawn } from "child_process";

const MIN_HARVEST = 0.02; // minimum amount to harvest before triggering
const API_BACKOFF = 2; // 2 seconds
let totalHarvestable = 0;

const executeTask = (index: number) => {
  return new Promise<number>(async (resolve, reject) => {
    // its only resolved when there's not enough ores to mine
    const command = __dirname.split("dist")[0] + `release\\ore`;
    let rpc = getRPCHelloMoon();
    let keyLocation = __dirname.split("dist")[0] + `.local_keys\\${index}.json`;
    const args = [
      `--rpc`,
      rpc,
      `--keypair`,
      keyLocation,
      `--priority-fee`,
      `2000000`,
      `rewards`,
    ];

    // spawn the child and wait for complete
    const child = spawn(command, args);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", async function (data) {
      let oreAmount = Number(data.split(" ")[0].trim());
      totalHarvestable += oreAmount;
      // check how much ore there is to mine
      console.log({ oreAmount, totalHarvestable });
      if (oreAmount > MIN_HARVEST) {
        try {
          console.log("Start executeClaimTask!" + index);
          var returnValue = await executeClaimTask(index);
          console.log("Resolved executeClaimTask!" + index);
          // sleep for abit, just in case
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
          resolve(returnValue);
          return 1; //let the next loop check for no more ores
        } catch (error) {
          console.log("Error executeClaimTask!" + index);
          return 1; // error not important, try again.
        }
      } else {
        console.log("Skipping (NO ORE): " + index);
        resolve(0);
        return 0;
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", function (data) {
      console.log(`${index} ore.exe stderr: ` + data);
      // errors here are from the binary, mostly nothing we can do about it.
    });

    child.on("close", function (data) {
      // do nothing on close
      // return 1;
    });
  });
};

const executeClaimTask = (index: number) => {
  return new Promise<number>((resolve, reject) => {
    const command = __dirname.split("dist")[0] + `release\\ore`;
    let rpc = getRPCEndpoint();
    let keyLocation = __dirname.split("dist")[0] + `.local_keys\\${index}.json`;
    const args = [
      `--rpc`,
      rpc,
      `--keypair`,
      keyLocation,
      `--priority-fee`,
      `2000000`,
      `claim`,
    ];

    const child = spawn(command, args);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", async function (data) {
      console.log(`${index}: ` + data);
      if (data.includes("failed") || data.includes("Max retries")) {
        // do nothing, let the parent script as it checks the balance.
        resolve(1);
        return 1
      } else if (data.includes("Attempt")) {
        // resolve(1)
        // do nothing, in progress
      } 
      else if (data.include("Claimed")) {
        // seems like we claimed successfully.. sleep abit and let it resolve on the next check
        await new Promise<void>((resolve) => setTimeout(resolve, 5000));
        resolve(1)
        return 1
      }else {
        console.log("CHECK ME:" + data);
        resolve(1)
        return 1;
      }
    });
  });
};

(async () => {
  let minerCount = getMinerCount();
  var tasks: Promise<void>[] = [];
  console.log("Collecting Rewards from " + minerCount + " miners");

  for (let i = 0; i < minerCount; i++) {
    tasks.push(
      new Promise<void>(async (resolve, reject) => {
        await new Promise<void>((resolve) => setTimeout(resolve, i * API_BACKOFF * 1000));
        console.log("Claiming " + i);
        try {
          var returnValue = 1;
          while (returnValue) {
            returnValue = await executeTask(i);
          }
          //break; 1
          //resolve(); //2
          return;
        } catch (error) {
          console.log(error);
          //reject(error); //2
          throw error; // SHOULD NEVER HAPPEN
          // i don't really care about errors here, just try again.
        }
        //resolve(); 1
      })
    );
  }
  await Promise.all(tasks);
})();
