# Bridges that were considered

## vProgs

AgenC's private completion path is three instructions: `complete_task_private`, `initialize_zk_config`, and `update_zk_image_id`. On the production surface they document at commit `18795f05`, those instructions are absent. `initialize_zk_config` in the development build returns `PrivateTaskCreationDisabled`. The file `zkvm/guest` in that repo is a 192-byte journal layout, not a guest binary this desk can anchor.

kaspanet/vprogs is a research prototype. It is not a product testnet. A bridge from a quarantined Solana feature to a research guest would not settle the escrow. The escrow in `native/escrow.sil` commits the artifact as a 32-byte hash. That is the whole verification this covenant needs.

## DAGKnight

DAGKnight is KIP-2, Proposed. The ordering parameter of a future network is not an input to this escrow. The clock the covenant can actually use is a DAA lock: `require(tx.daa >= reviewDaa)` and the same form for the silence window. SilverScript v1.0.0 exposes that clock only as "not before". It does not expose a "before this score" comparison. The machine is written for that fact. A DAGKnight bridge would not add the missing comparison, and it is not shipped.

No bridge is included.
