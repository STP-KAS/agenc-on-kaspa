// Fund a native AgencKas covenant on Testnet-10 and cancel it.
// Cancel returns the deposit to the buyer. The fee is a separate small coin.
// Prints transaction ids only.

import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const WASM = process.env.KASPA_WASM;
const WS_FROM = process.env.KASPA_WS_FROM;
const SECRET = process.env.FAUCET_SECRET;
const SILVERC = process.env.SILVERC;
const ENGINE = process.env.AGENC_ENGINE;
const REWARD = 100_000_000n;
const FEE_CHIP = 100_000_000n;

function need(name, value) {
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function loadKey() {
  const secret = readFileSync(need("FAUCET_SECRET", SECRET), "utf8");
  const pkLine = secret.split(/\r?\n/).find((line) => line.startsWith("receive-0-private-key:"));
  if (!pkLine) throw new Error("secret file has no receive key");
  return pkLine.split(":").slice(1).join(":").trim();
}

function xonly(kaspa, privateKey) {
  const hex = privateKey.toPublicKey().toXOnlyPublicKey().toString();
  const bytes = [...Buffer.from(hex, "hex")];
  if (bytes.length !== 32) throw new Error(`pubkey is ${bytes.length} bytes`);
  return bytes;
}

function freshKey(kaspa) {
  return new kaspa.PrivateKey(randomBytes(32).toString("hex"));
}

async function send(kaspa, rpc, key, from, outputs, priorityFee) {
  const { entries } = await rpc.getUtxosByAddresses([from]);
  const { transactions } = await kaspa.createTransactions({
    entries,
    outputs,
    priorityFee,
    changeAddress: from,
    networkId: "testnet-10",
  });
  const ids = [];
  for (const pending of transactions) {
    await pending.sign([key]);
    const id = await pending.submit(rpc);
    ids.push(String(id));
  }
  return ids;
}

async function ensureCoin(kaspa, rpc, key, from, target) {
  for (let step = 0; step < 24; step++) {
    const { entries } = await rpc.getUtxosByAddresses([from]);
    const fit = entries.find((row) => {
      const amount = BigInt(row.amount);
      return amount >= target + 1_000_000n && amount <= target * 8n;
    });
    if (fit) return fit;
    const bigger = entries
      .filter((row) => BigInt(row.amount) > target * 8n)
      .sort((a, b) => (BigInt(a.amount) < BigInt(b.amount) ? -1 : 1));
    if (!bigger.length) throw new Error("no coin large enough to split");
    const half = BigInt(bigger[0].amount) / 2n;
    await send(kaspa, rpc, key, from, [{ address: from, amount: half }], 100_000n);
    process.stdout.write(`split ${step + 1}\n`);
  }
  throw new Error("could not make a coin near the test size");
}

function entryOf(utxo, address) {
  return {
    address,
    outpoint: {
      transactionId: utxo.outpoint.transactionId,
      index: utxo.outpoint.index,
    },
    scriptPublicKey: utxo.entry.scriptPublicKey,
    amount: BigInt(utxo.amount),
    isCoinbase: Boolean(utxo.entry.isCoinbase),
    blockDaaScore: BigInt(utxo.entry.blockDaaScore),
  };
}

async function main() {
  need("KASPA_WASM", WASM);
  need("KASPA_WS_FROM", WS_FROM);
  need("SILVERC", SILVERC);
  need("AGENC_ENGINE", ENGINE);
  const require = createRequire(WS_FROM);
  globalThis.WebSocket = require("websocket").w3cwebsocket;
  const kaspa = await import(pathToFileURL(WASM).href);
  const buyerKey = new kaspa.PrivateKey(loadKey());
  const net = new kaspa.NetworkId("testnet-10");
  const from = buyerKey.toAddress(net).toString();
  const buyerPub = xonly(kaspa, buyerKey);
  const others = [freshKey(kaspa), freshKey(kaspa), freshKey(kaspa), freshKey(kaspa)].map((key) => xonly(kaspa, key));
  const ctor = [
    { kind: "bytes", value: buyerPub },
    ...others.map((pub) => ({ kind: "bytes", value: pub })),
    { kind: "int", value: Number(REWARD) },
    { kind: "int", value: 0 },
    { kind: "int", value: 0 },
    { kind: "int", value: 500 },
    { kind: "int", value: 250 },
    { kind: "int", value: 250 },
    { kind: "int", value: 2_000_000_000 },
    { kind: "int", value: 2_000_000_001 },
    { kind: "int", value: 2_000_000_002 },
    { kind: "bytes", value: Array.from({ length: 32 }, () => 0x11) },
  ];
  const dir = process.env.RESUME_DIR || mkdtempSync(join(tmpdir(), "agenc-"));
  const argsPath = join(dir, "args.json");
  const artifactPath = join(dir, "escrow.json");
  if (!process.env.RESUME_DIR) {
    writeFileSync(argsPath, JSON.stringify(ctor));
    const compiled = spawnSync(
      SILVERC,
      [join(process.cwd(), "native", "escrow.sil"), "--constructor-args", argsPath, "-o", artifactPath],
      { encoding: "utf8" },
    );
    if (compiled.status !== 0) throw new Error(compiled.stderr || compiled.stdout || "silverc failed");
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const bytecode = Buffer.from(artifact.contracts.AgencKas.compiled.bytecode);
  const locking = kaspa.payToScriptHashScript(bytecode);
  const covenantAddress = kaspa.addressFromScriptPublicKey(locking, net).toString();

  const rpc = new kaspa.RpcClient({
    resolver: new kaspa.Resolver(),
    encoding: kaspa.Encoding.Borsh,
    networkId: net,
  });
  await rpc.connect();
  const info = await rpc.getServerInfo();
  if (!String(info.networkId).includes("testnet-10")) throw new Error("resolver is not testnet-10");

  if (!process.env.RESUME_DIR) {
    await ensureCoin(kaspa, rpc, buyerKey, from, REWARD);
    await ensureCoin(kaspa, rpc, buyerKey, from, FEE_CHIP);
    const fundIds = await send(kaspa, rpc, buyerKey, from, [{ address: covenantAddress, amount: REWARD }], 100_000n);
    process.stdout.write(`funded ${fundIds.join(",")}\n`);
    const chipIds = await send(kaspa, rpc, buyerKey, from, [{ address: from, amount: FEE_CHIP }], 100_000n);
    process.stdout.write(`fee-chip ${chipIds.join(",")}\n`);
  }

  let covenantUtxo;
  let feeUtxo;
  for (let attempt = 0; attempt < 20; attempt++) {
    const cov = await rpc.getUtxosByAddresses([covenantAddress]);
    const wallet = await rpc.getUtxosByAddresses([from]);
    covenantUtxo = cov.entries.find((row) => BigInt(row.amount) === REWARD);
    feeUtxo = wallet.entries.find((row) => BigInt(row.amount) === FEE_CHIP);
    if (covenantUtxo && feeUtxo) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!covenantUtxo || !feeUtxo) {
    const { entries } = await rpc.getUtxosByAddresses([covenantAddress]);
    const amounts = entries.map((row) => String(row.amount)).join(",");
    throw new Error(`deposit not visible, covenant outputs: ${amounts || "none"}`);
  }

  const zeroSig = "00".repeat(65);
  const placeholder = spawnSync(
    ENGINE,
    ["--sigscript", artifactPath, "cancel", bytecode.toString("hex"), zeroSig],
    { encoding: "utf8" },
  );
  if (placeholder.status !== 0) throw new Error(placeholder.stderr || "placeholder sigscript failed");

  if (
    String(covenantUtxo.outpoint.transactionId) === String(feeUtxo.outpoint.transactionId) &&
    covenantUtxo.outpoint.index === feeUtxo.outpoint.index
  ) {
    throw new Error("fee coin and deposit are the same output");
  }
  const cancelTx = kaspa.createTransaction(
    [entryOf(covenantUtxo, covenantAddress), entryOf(feeUtxo, from)],
    [{ address: from, amount: REWARD }],
    0n,
    "",
    1,
  );
  cancelTx.version = 0;
  const covenantIndex = cancelTx.inputs.findIndex((input) => String(input.signatureScript ?? "") === "");
  const scriptIndex = covenantIndex === -1 ? 0 : covenantIndex;
  const feeIndex = scriptIndex === 0 ? 1 : 0;
  for (const input of cancelTx.inputs) {
    input.computeBudget = 0;
    input.sigOpCount = 1;
  }
  cancelTx.inputs[scriptIndex].sigOpCount = 2;
  if (cancelTx.inputs[feeIndex]) cancelTx.inputs[feeIndex].sequence = 9n;
  cancelTx.inputs[scriptIndex].signatureScript = placeholder.stdout.trim();
  let buyerSig = String(kaspa.createInputSignature(cancelTx, scriptIndex, buyerKey)).replace(/^0x/, "").trim();
  if (buyerSig.length === 132 && buyerSig.startsWith("41")) buyerSig = buyerSig.slice(2);
  const finalScript = spawnSync(
    ENGINE,
    ["--sigscript", artifactPath, "cancel", bytecode.toString("hex"), buyerSig],
    { encoding: "utf8" },
  );
  if (finalScript.status !== 0) throw new Error(finalScript.stderr || "sigscript failed");
  cancelTx.inputs[scriptIndex].signatureScript = finalScript.stdout.trim();
  const signedFee = kaspa.signTransaction(cancelTx, [buyerKey], false);
  signedFee.version = 0;
  for (const input of signedFee.inputs) {
    input.computeBudget = 0;
    input.sigOpCount = 1;
  }
  signedFee.inputs[scriptIndex].sigOpCount = 2;
  if (signedFee.inputs[scriptIndex]) signedFee.inputs[scriptIndex].signatureScript = finalScript.stdout.trim();
  const seen = signedFee.serializeToObject();
  process.stdout.write(
    `version ${signedFee.version} budgets ${seen.inputs.map((input) => input.computeBudget).join(",")} lens ${(seen.inputs.map((input) => String(input.signatureScript || "").length)).join(",")} amounts ${seen.inputs.map((input) => input.utxo.amount).join(",")}\n`,
  );
  const rebuilt = kaspa.Transaction.deserializeFromObject(seen);
  const canceled = await rpc.submitTransaction({ transaction: rebuilt });
  process.stdout.write(`canceled ${String(canceled.transactionId)}\n`);
  await rpc.disconnect();
}

main().catch((err) => {
  const text = String(err && err.stack ? err.stack : err).replace(/kaspa(?:test)?:[a-z0-9]+/gi, "[address]");
  process.stderr.write(`${text}\n`);
  process.exit(1);
});
