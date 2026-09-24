# agenc-on-kaspa

Experimental. Not advice. Not Kaspa core. Not an audit. Not the AgenC marketplace.

tetsuo, this is an invitation to read, not a correction. STP is a clown with good intentions. The desk that wrote this is Grok Build on a Windows machine. If it is noise, kick it out.

The program this reads is [tetsuo-ai/agenc-protocol](https://github.com/tetsuo-ai/agenc-protocol) at `18795f05496e7a09d7830a27b17cc37720e500cc`. The pin board it was checked against is [STP-KAS/kaspa-master-file](https://github.com/STP-KAS/kaspa-master-file). The implementation that followed this reading is [STP-KAS/KagenC](https://github.com/STP-KAS/KagenC).

## What

AgenC, on Solana, is a live escrow for hiring an agent. A buyer locks native SOL. A worker claims, commits a hash of the work, and the buyer accepts. One settlement pays four legs: worker, protocol treasury, operator, referrer. The worker keeps at least 60% because the combined fee cap is 4000 basis points. Each leg is floored, and the dust stays with the worker. The live protocol fee they record is 500 basis points. Production, in their own document, is 101 instructions, revision 5, program `HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK`. Private zk completion is not in that surface.

This repository is that money loop on Kaspa, in the object Kaspa actually has: one covenant output. The sompi on the output are the escrow. `native/escrow.sil` is the covenant, SilverScript v1.0.0, compiler commit `3ed9733`. `native/machine.mjs` is the same rules as integers, so they can be tested without a node. `kcc-if/` is the other shape, and it does not broadcast.

## Why

The part of AgenC that has to be true under failure is small. The buyer can disappear. The worker can disappear. The resolver can disappear. The coins still have to move, and nobody should be able to move them to a fifth party.

An upgradeable program can hold that promise, and AgenC has spent real effort on it: cancel, expire, bonds, a Squads vault. Their own upgrade note still says the member keys live on one host. A covenant does not have an upgrade. The script that locked the coins is the script that pays them. That is the piece Kaspa fits.

The rest of the 101 instructions is a product: listings, a bid book, a moderation roster, a feed, governance, goods. Those are accounts. They are already running on Solana. Copying them onto a UTXO chain would be a costume.

## How

`native/escrow.sil` is one output.

- Open. The buyer can cancel. The whole deposit goes back to the buyer. A sibling input pays the miner, so the covenant never hardcodes a fee and never skims one.
- Claim. The worker binds a key. The output value is conserved, plus the worker bond if there is one. `validateOutputState` checks the next script and does not check the amount, so the entry checks `tx.outputs[0].value` itself.
- Submit. The worker commits a non-zero artifact hash. The coins stay.
- Accept. The buyer signs. The outputs are the worker share, then the treasury, operator, and referrer when those legs are non-zero, then the bonds back to the side that posted them. The amounts sum to the input.
- Reject. The artifact is cleared and the worker is still bound. This is how a buyer sends the work back.
- Expire. After `deadlineDaa`, a claimed task with no submission unbinds and returns the worker bond.
- Auto-accept. After `reviewDaa`, a submitted task pays the same split without the buyer. A dispute blocks this path.
- Resolve, or silence. A disputed task pays the worker or refunds the buyer when the resolver signs. If the resolver never shows up, `silenceDaa` pays the worker. The coins are not stuck.

The basis points are fixed in the covenant when it is created. AgenC also has a reputation discount of 5, 10, or 15 basis points. That discount reads a reputation account. This covenant does not invent one, so the discount is not applied. The snapshotted fee is the fee.

SilverScript v1.0.0 can say `require(tx.daa >= reviewDaa)`. It cannot say "before this score". Claim and submit therefore have no upper DAA bound in the script. After the deadline, expire and submit can race. If submit wins, the buyer still has until `reviewDaa` to reject or dispute. That race is written down here because hiding it would make the fit look cleaner than the compiler is.

`engine/` runs cancel, claim, and accept inside the script engine from that same compiler, including a short refund and a redirected worker share. Both of those are refused.

On Testnet-10 the same cancel path was funded and spent. The funding transaction is `146e78d5e34594ae0bfa9fcc78ca8b9819e9575c43726f78f1ab632cc8ec0e5f`. The cancel is `2a048ec2c082f5cc6c4ec6e002ce26243dd4e4823df9918beef6f36673572eb9`. The deposit came back to the buyer. The cancel path costs about 112,290 script units. A version-0 input with sigop count 1 only covers 109,999, so the input has to commit sigop count 2. That is a relay limit, measured on the public node, not a guess. Claim and accept were not broadcast. They passed in the local engine.

## Does it need KCC, or Tether, or another stable?

The hire loop does not.

AgenC's 4-way settlement is native SOL. The code path that pays an operator or a referrer rejects a token mint. A goods purchase can be an SPL token. The mint is the listing's choice. Tether is not named.

Kaspa today has no spendable L1 stable, and KCC-20 is still Draft. There are several covenants using that name and they are not one program. Building a fifth and calling it the standard would be a false fit.

`kcc-if/` is the hire loop with the pot as a fungible amount: same extension on every output, non-negative integers, sum conserved, KAS reserved for the miner. It runs in tests. `broadcastToken` throws while the master file still says there is no Final KCC-20 and no spendable L1 stable. If those sentences change, the gate opens and the covenant still has to be written against whichever ABI actually became the file. This directory does not guess.

## Is Kaspa a better fit than Solana?

For the escrow, yes. The coins are the escrow. Four payees are four outputs of one transaction. There is no rent account to close, and no upgrade key that can change the split after the deposit. Amounts are integers. A vanished buyer, worker, or resolver has a path that is already in the script.

For the marketplace they shipped, no. Solana is where the 101-instruction program has been live since 2026-06-11, revision 5 since 2026-07-22. Listings, the bid book, the attestor roster, reputation, and the goods serial are account-shaped, and they already exist there. A Kaspa covenant that pretended to be that product would be worse than the original.

Use Kaspa when the thing you need is the locked coins and the split. Keep Solana when the thing you need is the marketplace they already run. A stable does not decide that. The hire loop did not need one on either chain.

## Conclusion

The fit is the escrow, in native KAS, with the fee math they published and the amount check their script compiler does not emit for you. It is not a port of the product, not a stablecoin, and not a bridge to vProgs or DAGKnight. Those two were looked at. The private-zk path is quarantined on their side, vProgs is research, and DAGKnight is a proposed ordering change. None of them pays the worker.

The tests are `node --test` with `KASPA_MASTER_JSON` pointed at the master file, and `cargo run --release` in `engine/`. The org reading, with the repos and the open threads that mattered, is in [READING.md](READING.md).

Kick this out if it wastes your time.
