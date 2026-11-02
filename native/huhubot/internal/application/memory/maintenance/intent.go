// Package maintenance contains only the fixed application-owned task text.
// Scheduling, credentials, requests and accounting remain in the Executor.
package maintenance

// Intent never interpolates source text or model-supplied identity.
const Intent = "Maintain this agent's private memory from the authorized input. Preserve the supplied source boundaries. Use only the supplied target item identities for corrections. An incomplete or partial source cannot establish a complete observation; if useful, describe it only as an inference. Return the bounded candidate JSON required by the engine; do not call tools."
