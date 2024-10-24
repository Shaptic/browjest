import { LedgerCloseMetaBatch, readBatch } from "./batch";
import { BUCKET } from "./gcloud";
import { Schema } from "./schema";

const API_URL =
    `http://localhost:8080`;
    // `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`;
    // `https://storage.googleapis.com/${BUCKET}`;

function buildBatchURL(ledgerSeq: number): string {
    return `${API_URL}/ledgers/pubnet/${Schema.getFilename(ledgerSeq)}`;
}

interface CDPReader {
    getLedger(ledgerSeq: number): Promise<LedgerCloseMetaBatch>;
    getLatestLedger(): Promise<number>;
}

class PythonReader implements CDPReader {
    setAuthCode(_: any) {}
    async getLedger(ledgerSeq: number) {
        return fetch(buildBatchURL(ledgerSeq))
            .then(r => r.text())
            .then(b64 => readBatch(b64));
    }

    async getLatestLedger() {
        return fetch(`${API_URL}/latest`)
            .then(r => r.json())
            .then(js => js.latest);
    }
}

export class GCSReader extends PythonReader {
    code: string = "";
    setAuthCode(code: string) {
        this.code = code;
    }

    async getLedger(ledgerSeq: number) {
        return fetch(buildBatchURL(ledgerSeq), {
            cache: "no-cache",
            method: "GET",
            redirect: "follow",
            headers: {
                "Authorization": `Bearer ${this.code}`,
            },
        })
            .then(r => r.blob())
            .then(bin => bin.arrayBuffer())
            .then(bin => readBatch(Buffer.from(bin).toString("base64")));
    }

    async getLatestLedger() {
        return 54068621;
    }
}

export const CDPReader = new PythonReader();