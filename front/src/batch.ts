import { xdr, cereal } from "@stellar/stellar-sdk";
import { Buffer } from 'buffer'

globalThis.Buffer = Buffer


export class LedgerCloseMetaBatch {
    start: number = 0;
    end: number = 0;
    batch: xdr.LedgerCloseMeta[] = [];
}

export function readBatch(b64: string): LedgerCloseMetaBatch {
    let result = new LedgerCloseMetaBatch();

    let raw = Buffer.from(b64, "base64")
    const reader = new cereal.XdrReader(raw);
    const start = reader.readUInt32BE();
    const end = reader.readUInt32BE();

    result.start = start;
    result.end = end;

    const length = reader.readUInt32BE();
    let offset = 4*3; // advance 4 ints
    // this actually breaks if length > 1 lmao thankfully ours is 1 LCM per file
    for (let i = 0; i < length; i++) {
        const lcm = xdr.LedgerCloseMeta.fromXDR(raw.subarray(offset));
        result.batch.push(lcm);
        offset += lcm.toXDR().length;
    }

    return result;
}
