import { Networks, TransactionBuilder, xdr, StrKey, encodeMuxedAccountToAddress } from "@stellar/stellar-sdk"

export class LedgerTransactionReader {
    envelopesByHash = new Map<string, xdr.TransactionEnvelope>();

    constructor(lcm: xdr.LedgerCloseMeta) {
        gatherTransactions(lcm).forEach(txEnv => {
            const tx = TransactionBuilder.fromXDR(txEnv, Networks.PUBLIC);
            this.envelopesByHash.set(tx.hash().toString("hex"), txEnv);
        });
    }
}

export function getHash(txEnv: xdr.TransactionEnvelope): string {
  const tx = TransactionBuilder.fromXDR(txEnv, Networks.PUBLIC);
  return tx.hash().toString("hex");
}

export function gatherTransactions(lcm: xdr.LedgerCloseMeta): xdr.TransactionEnvelope[] {
    let envelopes: xdr.TransactionEnvelope[] = [];

    switch (lcm.switch()) {
      case 0:
        envelopes = envelopes.concat(envelopes, lcm.v0().txSet().txes());
        break;

      case 1:
        lcm.v1().txSet().v1TxSet().phases().forEach(set => {
            set.v0Components().forEach(component => {
                const current = component.txsMaybeDiscountedFee().txes();
                envelopes = envelopes.concat(envelopes, current);
            })
        });
        break;
    }

    return envelopes
}

export function getAccount(env: xdr.TransactionEnvelope) {
    switch (env.switch().value) {
      case 0: // txV0
        return StrKey.encodeEd25519PublicKey(
          env.v0().tx().sourceAccountEd25519());

      case 2: // txV1
        return encodeMuxedAccountToAddress(env.v1().tx().sourceAccount(), true)

      case 5: // txFeeBump
        return encodeMuxedAccountToAddress(
          env.feeBump().tx().innerTx().v1().tx().sourceAccount(), true);

      default:
        console.error("Unknown type:", env.switch())
        return "";
    }
}

export function getOperations(env: xdr.TransactionEnvelope) {
    switch (env.switch().value) {
      case 0: // txV0
      case 2: // txV1
        return (
          env.value().tx() as xdr.Transaction|xdr.TransactionV0
        ).operations();

      case 5: // txFeeBump
        return env.feeBump().tx().innerTx().v1().tx().operations();

      default:
        console.error("Unknown type:", env.switch())
        return [];
    }
}

export function getLedgerHeader(lcm: xdr.LedgerCloseMeta): xdr.LedgerHeader {
    return lcm.value().ledgerHeader().header();
}

export function getLedgerHash(lcm: xdr.LedgerCloseMeta): string {
    return lcm.value().ledgerHeader().hash().toString("hex")
}
