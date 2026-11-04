import { NATIVE_INPUT_LIMITS } from '../../../src/shared/native/input';

/** The capabilities a current helper declares in its handshake reply; the plugin refuses a helper without all of them. */
export const HELLO_CAPABILITIES = Object.freeze({
	inputAdmission: 1, outputAbandon: 1, replySettlement: 1, localControl: 1, editorTransactions: 1, terminalTermination: 1,
});
export const HELLO_CURRENT = Object.freeze({ capabilities: HELLO_CAPABILITIES, inputLimits: NATIVE_INPUT_LIMITS });
