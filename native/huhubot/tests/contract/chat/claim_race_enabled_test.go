//go:build race

package chat_test

// Only preparation uses a normal-mode, publicly constructed immutable input.
// Recovery, CAS, Claim and all final assertions still run in this race binary.
const claimFairnessRace = true
