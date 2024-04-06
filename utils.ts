import dotenv from "dotenv";
import moment from "moment";
import path from "path";
import bs58 from "bs58";
dotenv.config({ path: path.join(__dirname, ".env") });
import crypto from "crypto";
import {
  ComputeBudgetProgram,
  Connection,
  GetProgramAccountsFilter,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { loadOrGenerateKeypair, loadPublicKeysFromFile } from "./src/Helpers";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

export function sleep(ms: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

/**
 * Returns the number with 'en' locale settings, ie 1,000
 * @param x number
 * @param minDecimal number
 * @param maxDecimal number
 */
export function toLocaleDecimal(
  x: string | number,
  minDecimal: number,
  maxDecimal: number
) {
  x = Number(x);
  return x.toLocaleString("en", {
    minimumFractionDigits: minDecimal,
    maximumFractionDigits: maxDecimal,
  });
}

/**
 * Runs the function if it's a function, returns the result or undefined
 * @param fn
 * @param args
 */
export const runIfFunction = (fn: any, ...args: any): any | undefined => {
  if (typeof fn == "function") {
    return fn(...args);
  }

  return undefined;
};

/**
 * Returns the ellipsized version of string
 * @param x string
 * @param leftCharLength number
 * @param rightCharLength number
 */
export function ellipsizeThis(
  x: string,
  leftCharLength: number,
  rightCharLength: number
) {
  if (!x) {
    return x;
  }

  let totalLength = leftCharLength + rightCharLength;

  if (totalLength >= x.length) {
    return x;
  }

  return (
    x.substring(0, leftCharLength) +
    "..." +
    x.substring(x.length - rightCharLength, x.length)
  );
}

/**
 * Returns the new object that has no reference to the old object to avoid mutations.
 * @param obj
 */
export const cloneObj = <T = any>(obj: { [key: string]: any }) => {
  return JSON.parse(JSON.stringify(obj)) as T;
};

/**
 * @returns string
 */
export const getRandomColor = () => {
  var letters = "0123456789ABCDEF".split("");
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const getRandomNumber = (
  min: number,
  max: number,
  isInteger = false,
  decimals: number = 3
) => {
  let rand = min + Math.random() * (max - min);
  if (isInteger) {
    return Math.round(rand);
  }

  // to x decimals
  return Math.floor(rand * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const getRandomChance = () => {
  return getRandomNumber(0, 100);
};

export const getRandomNumberAsString = (
  min: number,
  max: number,
  isInteger = false
) => {
  return getRandomNumber(min, max, isInteger).toString();
};

export const getRandomChanceAsString = () => {
  return getRandomNumberAsString(0, 100);
};

export const getUTCMoment = () => {
  return moment().utc();
};

export const getUTCDatetime = () => {
  return getUTCMoment().format("YYYY-MM-DD HH:mm:ss");
};

export const getUTCDate = () => {
  return getUTCMoment().format("YYYY-MM-DD");
};

export const isProduction = () => {
  return process.env.ENVIRONMENT === "production" || !process.env.ENVIRONMENT;
};

export const getRPCEndpoint = (): string => {
  return process.env.RPC_URL ? process.env.RPC_URL : clusterApiUrl("devnet");
};

export const getRPCEndpoint2 = (): string => {
  return process.env.RPC_URL2 ? process.env.RPC_URL2 : clusterApiUrl("devnet");
};

export const getRPCConsolidate = (): string => {
    return process.env.RPC_CONSOLIDATE ? process.env.RPC_CONSOLIDATE : clusterApiUrl("devnet");
  };

export const getRPCHelloMoon = (): string => {
    return process.env.HELLO_MOON ? process.env.HELLO_MOON : clusterApiUrl("devnet");
  };

export const getMinerCount = (): number => {
  return Number(process.env.MINER_COUNT!);
};

export const getAdminAccount = () => {
  return Keypair.fromSecretKey(bs58.decode(process.env.SECRET_KEY!));
};

export const _getAdminAccount = (): Keypair => {
  return loadOrGenerateKeypair("_admin");
};

export const addPriorityFeeToTransaction = (
  tx: Transaction,
  microLamports: number,
  limit: number
) => {
  // Create the priority fee instructions
  const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports,
  });

  const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: limit,
  });

  tx.instructions.unshift(computeLimitIx);
  tx.instructions.unshift(computePriceIx);

  return tx;
};

export //get associated token accounts that stores the SPL tokens
const getTokenAccounts = async (connection: Connection, address: string) => {
  try {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 165, //size of account (bytes), this is a constant
      },
      {
        memcmp: {
          offset: 32, //location of our query in the account (bytes)
          bytes: address, //our search criteria, a base58 encoded string
        },
      },
    ];

    const accounts = await connection.getParsedProgramAccounts(
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), //Associated Tokens Program
      { filters: filters }
    );

    /* accounts.forEach((account, i) => {
        //Parse the account data
        const parsedAccountInfo:any = account.account.data;
        const mintAddress:string = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        //Log results
        console.log(`Token Account No. ${i + 1}: ${account.pubkey.toString()}`);
        console.log(`--Token Mint: ${mintAddress}`);
        console.log(`--Token Balance: ${tokenBalance}`);
    }); */
    return accounts;
  } catch {
    return [];
  }
};

export const getInsertQuery = (
  columns: string[],
  values: any[][],
  table: string,
  returnId: boolean = false,
  schema: string = "public"
) => {
  let columnString = columns.join(",");
  let valueString = "";

  for (let value of values) {
    valueString += "(";
    for (let content of value) {
      if (typeof content === "string") {
        // sanitize insert query
        content = `${content.replace(/'/g, "''")}`;
        valueString += `'${content}'`;
      } else {
        valueString += `${content}`;
      }

      valueString += ",";
    }
    //remove last comma
    valueString = valueString.substring(0, valueString.length - 1);
    valueString += "),";
  }

  //remove last comma
  valueString = valueString.substring(0, valueString.length - 1);

  let query = `INSERT INTO ${schema}.${table} (${columnString}) VALUES ${valueString}`;
  if (returnId) {
    query += " RETURNING id";
  }
  query += ";";
  return query;
};

export const getHash = (string: string): string => {
  const hash = crypto.createHash("md5").update(string).digest("hex");
  return hash;
};

// check if the uuid is valid as sanitization
export const isValidUUID = (uuid: string) => {
  return (
    (uuid.match(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
    )?.length ?? 0) > 0
  );
};

// check if the email is valid
export const isValidMail = (email: string) => {
  let matches = email.match(/[\w-\+\.]+@([\w-]+\.)+[\w-]{2,10}/g);
  return matches && matches.length > 0;
};

/**
 * Convert bigint inside obj into string (faciliate JSON.stringify)
 * @param { any } obj
 */
export const convertBigIntToString = (obj: any) => {
  if (typeof obj === "object") {
    for (let key in obj) {
      if (typeof obj[key] === "bigint") {
        obj[key] = obj[key].toString();
      } else if (typeof obj[key] === "object") {
        obj[key] = convertBigIntToString(obj[key]);
      }
    }
  }

  return obj;
};

/**
 * Get server port from env
 * @param { string } url
 */
export const getServerPort = () => {
  return process.env.SERVER_PORT;
};

export const getLocalAccount = (account: string) => {
  return loadOrGenerateKeypair(account, ".user_keys");
};

export const getAddressSOLBalance = async (publicKey: PublicKey) => {
  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = getRPCEndpoint();

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new Connection(CLUSTER_URL, "confirmed");

  const result = await connection.getBalance(publicKey);
  return result / 1000000000;
};

export const sendSOLTo = async (
  toAccount: string,
  amount: number,
  keypair?: Keypair
) => {
  while (true) {
    try {
      // load the env variables and store the cluster RPC url
      const CLUSTER_URL = getRPCEndpoint();

      // create a new rpc connection, using the ReadApi wrapper
      const connection = new Connection(CLUSTER_URL, "confirmed");

      let lamports = Math.round(amount * 1000000000);

      let currentKeypair = keypair ?? getAdminAccount();
      let transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: currentKeypair.publicKey,
          toPubkey: new PublicKey(toAccount),
          lamports,
        })
      );

      transaction = addPriorityFeeToTransaction(
        transaction,
        1_000_000,
        200_000
      );
      // Send and confirm transaction
      // Note: feePayer is by default the first signer, or payer, if the parameter is not set
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.recentBlockhash = blockhash;
      let signature = await connection.sendTransaction(transaction, [
        currentKeypair,
      ]);
      await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature,
      });
      console.log({ signature });
      return signature;
    } catch (e) {
      console.log(e);
    }
  }
};

export const sendTokensTo = async (
  sendTo: string,
  token: string,
  tokenDecimals: number,
  amount: number,
  keypair?: Keypair
) => {
  while (true) {
    try {
      // load the env variables and store the cluster RPC url
      const CLUSTER_URL = getRPCConsolidate();

      // create a new rpc connection, using the ReadApi wrapper
      const connection = new Connection(CLUSTER_URL, "confirmed");
      let currentKeypair = keypair ?? getAdminAccount();

      const mintToken = new PublicKey(token);
      const recipientAddress = new PublicKey(sendTo);

      const transactionInstructions: TransactionInstruction[] = [];

      // get the sender's token account
      const associatedTokenFrom = await getAssociatedTokenAddress(
        mintToken,
        currentKeypair.publicKey
      );

      const fromAccount = await getAccount(connection, associatedTokenFrom);
      let { associatedTokenTo, transaction: createTransaction } =
        await getOrCreateAssociatedAccount(
          mintToken,
          currentKeypair.publicKey,
          recipientAddress
        );

      if (createTransaction) {
        transactionInstructions.push(createTransaction);
      }

      console.log({
        currentKeypair: currentKeypair.publicKey.toBase58(),
        sendTo,
        amount,
      });

      // the actual instructions
      transactionInstructions.push(
        createTransferInstruction(
          fromAccount.address, // source
          associatedTokenTo, // dest
          currentKeypair.publicKey,
          Math.round(amount * Math.pow(10, tokenDecimals))
        )
      );

      // send the transactions
      let transaction = new Transaction().add(...transactionInstructions);
      transaction = addPriorityFeeToTransaction(transaction, 1_000_000, 200_000);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("single");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = currentKeypair.publicKey;
      console.log("blockheight:" + lastValidBlockHeight);
      // Send and confirm transaction
      // Note: feePayer is by default the first signer, or payer, if the parameter is not set
      const signature = await connection.sendTransaction(transaction, [
        currentKeypair,
      ],{maxRetries:3, preflightCommitment:"confirmed", skipPreflight:true /*,minContextSlot:?*/});
      console.log("signature:" + signature);
      {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("single");
        const result = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        },"processed");
        console.log("confirmed tx: " + JSON.stringify(result));
      }
      return signature;
    } catch (e) {
      console.log("UTILS: " + e);
    }
  }
};

// return associatedTokenAddress and transaction
// if associatedTokenAddress exists, transaction is null
export const getOrCreateAssociatedAccount = async (
  mintToken: PublicKey,
  payer: PublicKey,
  recipient: PublicKey
) => {
  const connection = new Connection(getRPCEndpoint());

  // get the recipient's token account
  const associatedTokenTo = await getAssociatedTokenAddress(
    mintToken,
    recipient
  );

  let transaction: TransactionInstruction | null = null;

  // if recipient doesn't have token account
  // create token account for recipient
  if (!(await connection.getAccountInfo(associatedTokenTo))) {
    transaction = createAssociatedTokenAccountInstruction(
      payer,
      associatedTokenTo,
      recipient,
      mintToken
    );
  }

  return {
    associatedTokenTo,
    transaction,
  };
};

// non public key account
export const clawbackSOLFrom = async (keypair: Keypair) => {
  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = getRPCEndpoint();

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new Connection(CLUSTER_URL, "confirmed");

  let solBalance = await getAddressSOLBalance(keypair.publicKey);

  // leave 0.001 SOL
  let clawbackBalance = solBalance - 0.001;

  if (clawbackBalance <= 0) {
    return "";
  }

  let lamports = Math.round(clawbackBalance * 1000000000);

  let adminAccount = getAdminAccount();
  let transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: adminAccount.publicKey,
      lamports,
    })
  );
  // Send and confirm transaction
  // Note: feePayer is by default the first signer, or payer, if the parameter is not set

  let txSignature = await connection.sendTransaction(transaction, [keypair]);
  return txSignature;
};

export const getTransactions = async (address: string, numTx: number) => {
  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = getRPCEndpoint();

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new Connection(CLUSTER_URL, "confirmed");

  const pubKey = new PublicKey(address);
  let transactionList = await connection.getSignaturesForAddress(pubKey, {
    limit: numTx,
  });
  return transactionList;
};

export const getTx = async (txHash: string) => {
  const endpoint = getRPCEndpoint(); //Replace with your RPC Endpoint
  const connection = new Connection(endpoint);

  let tx = await connection.getParsedTransaction(txHash, {
    maxSupportedTransactionVersion: 0,
  });
  return tx;
};

export const getUserTokens = async (userAccount: PublicKey) => {
  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = await getRPCEndpoint();

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new Connection(CLUSTER_URL, "confirmed");

  let mintObject: {
    [mintAddress: string]: {
      amount: number;
      decimals: number;
      ata: string;
    };
  } = {};

  let userAccounts = await getTokenAccounts(connection, userAccount.toString());
  for (let account of userAccounts) {
    let anyAccount = account.account as any;
    let mint: string = anyAccount.data["parsed"]["info"]["mint"];
    let decimals: number =
      anyAccount.data["parsed"]["info"]["tokenAmount"]["decimals"];
    let accountAmount: number =
      anyAccount.data["parsed"]["info"]["tokenAmount"]["uiAmount"];

    let isFrozen = anyAccount.data["parsed"]["info"]["state"] === "frozen";
    // we dont add frozen states
    if (isFrozen) {
      continue;
    }

    mintObject[mint] = {
      amount: accountAmount,
      decimals,
      ata: account.pubkey.toBase58(),
    };
  }

  return mintObject;
};
