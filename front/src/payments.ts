import { Address, Asset, encodeMuxedAccountToAddress, scValToNative, xdr } from "@stellar/stellar-sdk";
import { gatherTransactions, getAccount, getLedgerHeader, getOperations } from "./ingest";

type OpProcessor = (
    lcm: xdr.LedgerCloseMeta,
    txEnv: xdr.TransactionEnvelope,
    ops: xdr.Operation[]
) => undefined;
type PayProcessor = (
    lcm: xdr.LedgerCloseMeta,
    txEnv: xdr.TransactionEnvelope,
    payment: PaymentOp,
) => undefined;
type InvokeProcessor = (
    lcm: xdr.LedgerCloseMeta,
    txEnv: xdr.TransactionEnvelope,
    payment: InvokeOp,
) => undefined;

export interface Processor {
    onOperations: OpProcessor;
    onPayment: PayProcessor;
    onInvocation: InvokeProcessor;
    onRefresh: () => undefined;
}

export class InvokeOp {
    contract: string = "";
    functionName: string = "";
    args: any[] = [];

    render(): string {
        return `<div class="payment">
    <p>
        <span class='address'>${this.contract.substring(0, 8)}...</span>
        had ${this.functionName} invoked
    </p>
</div>`
    }
}

export class PaymentOp {
    source: string = "";
    destination: string = "";
    amount: string = "";
    asset: Asset = Asset.native();

    render(): string {
        return `
<div class='payment'>
    <p>
        <span class='address'>${this.source.substring(0, 8)}...</span>
            sent ${this.amount}
            <span class='asset'>${this.asset.getCode()}</span>
            to
        <span class='address'>${this.destination.substring(0, 8)}...</span></p>
</div>
`;
    }
}


export class PaymentIndexer {
    cache?: Map<number, xdr.LedgerCloseMeta>;
    addresses = new Set<string>();
    assets = new Set<string>();
    processors: Processor[] = [];
    defaultProcessor?: Processor;

    addAddress(addr: Address): boolean {
        const before = this.addresses.size;
        this.addresses.add(addr.toString());
        this.refresh();
        return this.addresses.size > before;
    }

    addAsset(asset: Asset): boolean {
        const before = this.assets.size;
        this.assets.add(asset.toString());
        this.refresh();
        return this.assets.size > before;
    }

    refresh() {
        if (this.cache) {
            console.info("Restarting indexing using local cache...");
            this.processors.forEach(p => p.onRefresh());

            Array.from(this.cache.entries())
                .forEach(([_, lcm]) => this.ingestLedger(lcm));
        }
    }

    addProcessor(func: Processor) {
        this.processors.push(func);
    }

    ingestLedger(lcm: xdr.LedgerCloseMeta, extraAddress?: string) {
        const seq = getLedgerHeader(lcm).ledgerSeq();
        if (!this.cache) {
            this.cache = new Map();
            this.cache.set(seq, lcm);
        } else if (!this.cache.has(seq)) {
            this.cache.set(seq, lcm);
        }

        gatherTransactions(lcm).forEach(txEnv => {
            const ops = getOperations(txEnv);
            this.processors.forEach(p => p.onOperations(lcm, txEnv, ops));

            ops.forEach(op => {
                switch (op.body().switch().value) {
                    case xdr.OperationType.invokeHostFunction().value:
                        const fn = op.body().invokeHostFunctionOp().hostFunction();
                        if (fn.switch().value === 0) {
                            const contract = Address.fromScAddress(
                                fn.invokeContract().contractAddress()
                            ).toString();
                            if (this.addresses.has(contract)) {
                                const details = new InvokeOp();
                                details.contract = contract;
                                details.functionName = fn.invokeContract().functionName().toString();
                                details.args = fn.invokeContract().args().map(scValToNative);
                                this.processors.forEach(p => p.onInvocation(lcm, txEnv, details));
                            }
                        }
                        break;

                    case xdr.OperationType.payment().value: {
                        let innerOp = op.body().value() as xdr.PaymentOp;
                        let asset = Asset.fromOperation(innerOp.asset());

                        const details = new PaymentOp();
                        details.asset = asset;
                        details.amount = (BigInt(innerOp.amount().toString()) / 1000000n).toString();
                        details.destination = encodeMuxedAccountToAddress(
                            innerOp.destination(),
                            true
                        );
                        details.source = op.sourceAccount() != null ?
                            encodeMuxedAccountToAddress(
                                op.sourceAccount()!,
                                true,
                            ) : getAccount(txEnv);

                        if (this.addresses.size === 0) {
                            this.defaultProcessor?.onPayment(lcm, txEnv, details);
                        }

                        if ([
                            details.asset.getIssuer(),
                            details.destination,
                            details.source,
                        ].some(s => {
                            return (
                                extraAddress ? s === extraAddress : this.addresses.has(s)
                            );
                        }) || [
                            details.asset.getCode(),
                        ].some(s => this.assets.has(s)) ||
                            details.asset.getCode() === 'XLM'
                        ) {
                            this.processors.forEach(p => p.onPayment(lcm, txEnv, details));
                        }
                        break;
                    }
                }
            })
        });
    }
}