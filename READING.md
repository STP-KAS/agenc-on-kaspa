# What was read

Org: [tetsuo-ai](https://github.com/tetsuo-ai). Profile text: "Using AI to augment and improve human intelligence." Site `tetsuocorp.com`. X handle on the org: `7etsuo`. Created 2024-12-10. 47 public repositories on 2026-09-24.

Search totals that day: 1264 issues, 75 open. 3467 pull requests, 63 open. Most of the open issues sit on `agenc-core`, which is the agent runtime, not the escrow. This reading did not restate those runtime bugs. It used them only to keep the runtime separate from the money program.

## The protocol

[agenc-protocol](https://github.com/tetsuo-ai/agenc-protocol) `18795f05496e7a09d7830a27b17cc37720e500cc`, committed 2026-08-23 by tetsuo.

Read in full enough to settle the money question:

- README, `docs/PROGRAM_SURFACE.md`, `docs/ZK_PRIVATE_FLOW.md`, `docs/X402_FAST_PATH.md`
- `programs/agenc-coordination/src/instructions/constants.rs`
- `calculate_combined_fees` and `execute_completion_rewards` in `completion_helpers.rs`
- `accept_task_result.rs` far enough to see bonds refunded on accept, and the canary refusing token and fee legs
- the open issue list and the open pull list

Production facts taken from those files, not from a later memory:

- Program `agenc-coordination`, id `HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK`
- 101 instructions, surface revision 5, deployed 2026-07-22 in their document
- Executable SHA-256 they publish: `049a66e30da166c1e02ee379993425c32386f774fd9ff8861153e21900b496f2`
- Their README says the revision 5 verifiable build still needs re-attestation. Issue 199 is that work, still open. This desk did not run `solana-verify`.
- Worker floor 6000 bps. Combined cap 4000. Each of protocol, operator, referrer capped at 2000.
- Live protocol fee they record as 500 bps.
- Operator and referrer legs are SOL-only. A token mint on that path is `InvalidTokenMint`.
- Private zk is not in the production IDL. The guest file is a 192-byte journal.
- x402, in `docs/X402_FAST_PATH.md`, is a ratified design, not an instruction in this repo. The design wants a stablecoin facilitator for the cheap call, and escrow for the job worth disputing.

Open protocol issues:

- #199 re-attest revision 5 and publish security.txt
- #124 the 24-hour task counter is a `u8`
- #82 `expire_claim` emits no event

Open pulls that are not dependency bumps:

- #228 `emit TaskClaimExpired from expire_claim`, unmerged, author FalconOrtiz
- #200 security.txt and the revision-5 verify packet

The other open protocol pulls on that day were dependency bumps.

## The rest of the org

| Repo | What it is, from its own description and the files above |
| --- | --- |
| AgenC | Workspace docs for the marketplace. Pushed 2026-09-22. |
| agenc-core | The coding-agent runtime. Large, active, and not the escrow. Open release blockers include red tests on main (#2625) and a hosted-runner pin drift (#2626). |
| agenc-sdk | TypeScript SDK aimed at the Solana coordination surface. |
| agenc-plugin-kit | Plugin authoring contract. |
| agenc-plugins | IoT and Ledger plugin pack. |
| agenc-store-templates | Self-hosted store templates. Open issue #3 asks for a browser wallet signer. |
| agenc-indexer | Read-model indexer over Solana accounts. |
| agenc-moderation-api | Attestation service. Open issue #4: the hosted attestor gets Solana `8100002 Forbidden` writing a listing moderation account. |
| agenc-marketplace-releases | Marketplace binaries and an issue tracker. |
| agenc-releases | CLI binaries. |
| agenc-desktop-releases | Desktop installers. |
| homebrew-agenc | Homebrew tap. |
| agenc-c | Standalone C libraries. |
| agenc-goal | A goal plugin for another coding agent. |
| agenc-one | A device image. Open issues 13 through 24 are an architecture rewrite. |
| agenc-android | A phone client for sessions and a Ledger. |
| agenc-ledger-flex-app | A Ledger Flex app fork. |
| agenc-lid | Keeps a laptop awake. |
| dad | A supervision plugin. Two open issues from May 2026. |
| agencope | TypeScript, no description on the org list. |
| minimax-h3-runpod | A GPU video skill. |
| modelvet | A container-file checker for model weights. |
| tiny-agenc | A small transformer in C. |
| voice_clone_lab | Local voice cloning. Two open issues. |
| tetsuo-code | An editor, "powered by Grok" in its description. |
| grok-api-mcp | An MCP server for xAI API docs. |
| tetsuo-doom | Doom over MCP. |
| tetsuo-h3sec | An HTTP/3 scanner. |
| DigitSuo | MNIST in C. |
| memsuo | Allocators. |
| tetsuo-model | LoRA weights. |
| tetsuo-iris | An older interface, Jupiter mentioned in issues. |
| tetsuo-ganymede | A Jupiter SDK fork. |
| AI-Horde | A fork of a distributed art cluster. |
| tetsuo-discord-pricebot | A Discord price bot, forked. |
| tetsuo-discord-engage | Discord tooling. |
| tetsuo-discord-imagegen | Discord image tools. |
| tetsuo-art-assets | Art files. |
| Tetsuo-DL | A video download extension. |
| kensub-backend | A clipper. |
| main-website | The older site. |
| tetsuo-service-starter-kit | A Python starter. |
| raiding-plan | A short repo with no description. |
| agenc-raiderkit | A community reference document. |
| agenc-raider-art | Art. |
| user-feedback | A feedback inbox for the token era of the org. |

AgenC issues 1557 through 1564, opened April 2026, are still the open epic about a bounded job contract in the runtime. They are product constraints on the agent, not on the SOL split.

## What this desk did not do

It did not read every comment on 3467 pulls. It did not treat the Discord bots, the art repo, or the MNIST demo as part of the escrow. It did not re-verify the Solana binary. It did not post on the AgenC repositories.
