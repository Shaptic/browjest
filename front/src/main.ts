import './style.css'
import $ from "jquery";

import {
    getHash,
    getLedgerHash,
    getLedgerHeader,
} from './ingest.ts'
import { CDPReader } from './reader.ts';
import { PaymentIndexer } from './payments.ts';
import { Address } from '@stellar/stellar-sdk';

const here = new URL(window.location.href);
const code = here.searchParams.get("code");
if (!code) {
    // import { authenticate } from './gcloud.ts';
    // authenticate();
} else {
    // TODO: exchange the auth code for a token+refresh
}

attachHooks();

const indexer = new PaymentIndexer();
const initialFilters: Address[] = [
    // TODO: Add support for C addresses
    // Address.fromString(Asset.native().contractId(Networks.PUBLIC)),
    // Address.fromString("CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY"),
    // Address.fromString("GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN")
    Address.fromString("GAKGC35HMNB7A3Q2V5SQU6VJC2JFTZB6I7ZW77SJSMRCOX2ZFBGJOCHH"),
    Address.fromString("GAPV2C4BTHXPL2IVYDXJ5PUU7Q3LAXU7OAQDP7KVYHLCNM2JTAJNOQQI"),
    Address.fromString("GCSAZVWXZKWS4XS223M5F54H2B6XPIIXZZGP7KEAIU6YSL5HDRGCI3DG"),
    Address.fromString("GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM"),
    Address.fromString("GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO"),
];
initialFilters.forEach((addr) => addFilter(addr.toString()));

function addFilter(f: string) {
    if (indexer.addAddress(Address.fromString(f.trim()))) {
        $("#filters").append(`<li>${f.substring(0, 18)}...`);
    }
}

indexer.addProcessor({
    onOperations: (lcm, txEnv, ops) => {
        return;
        let opTotal = ops.length;
        const ledgerSeq = getLedgerHeader(lcm).ledgerSeq();
        console.log($(`#ledger-${ledgerSeq}`));
        $(`#ledger-${ledgerSeq} h4`).prepend(`<p>${opTotal} total operations</p>`);
    },
    onPayment: (lcm, txEnv, payment) => {
        const ul = $(`#ledger-${getLedgerHeader(lcm).ledgerSeq()} > ul`);
        const hash = getHash(txEnv).slice(0, 7);
        let li = $(`li#tx-${hash}`);
        if (li.length >= 1) {
            li.children("ul")
                .append($("<li>")
                .append($(payment.render())))
        } else {
            li = $(`<li id='tx-${hash}'>`).html(
                `Transaction <span class="address">${hash}</span>
                contains payments matching your filters:`
            );
            ul.prepend(
                li.append(
                    $("<ul>")
                        .append($("<li>")
                        .append($(payment.render())))
                )
            );
        }
    },
    onInvocation: (lcm, txEnv, invoke) => {
        const ul = $(`#ledger-${getLedgerHeader(lcm).ledgerSeq()} > ul`);
        const hash = getHash(txEnv).slice(0, 7);
        let li = $(`li#tx-${hash}`);
        if (li.length >= 1) {
            li.children("ul")
                .append($("<li>")
                .append($(invoke.render())))
        } else {
            li = $(`<li id='tx-${hash}'>`).html(
                `Transaction <span class="address">${hash}</span>
                contains invocations matching your filters:`
            );
            ul.prepend(
                li.append(
                    $("<ul>")
                        .append($("<li>")
                        .append($(invoke.render())))
                )
            );
        }
    },
    onRefresh: () => {
        $(".ledger ul").children().remove();
    }
})

async function attachHooks() {
    $("#addFilter").on("click", () => {
        addFilter($("#filter").val() as string);
    });
    $("#load").on("click", function () {
        loadLedgers($("#ledgerNum").prop("value"), 1);
    })

    let initialStreamer: any;
    let stream = async () => {
        const ldgs = $(".ledger");
        let lcl: number;
        if (ldgs.length) {
            let m = ldgs.first().prop("id").match(/ledger-(\d+)/);
            lcl = parseInt(m[1]) + 1;
        } else {
            lcl = await CDPReader.getLatestLedger() - 10;
            lcl = await loadLedgers(lcl, 5);
        }

        initialStreamer = setInterval(
            async () => {
                const remote = await CDPReader.getLatestLedger();
                if (remote > lcl) {
                    lcl = await loadLedgers(lcl, remote - lcl);
                }
            },
            4000
        );
    };

    $("#stopStream")
        .hide()
        .on("click", function() {
            $(this).hide();
            clearInterval(initialStreamer);
            $("#startStream").show();
        });

    $("#startStream")
        .on("click", function() {
            $(this).hide();
            stream();
            $("#stopStream").show();
        });
}

async function loadLedgers(ledgerSeq: number, count?: number): Promise<number> {
    if (ledgerSeq <= 0) {
        throw new Error(`invalid ledgerSeq: ${ledgerSeq}`);
    }

    for (let i = 0; i < (count ?? 10); i++) {
        const lcmb = await CDPReader.getLedger(ledgerSeq);

        const main = $("#ledgers");
        lcmb.batch.forEach(lcm => {
            const ledgerSeq = getLedgerHeader(lcm).ledgerSeq();
            const headerHash = getLedgerHash(lcm);

            const ledger = $(`<div class='ledger' id='ledger-${ledgerSeq}'>`);
            const ul = $("<ul style='font-size: smaller; text-align: left;'>");

            ledger.append(ul);
            main.prepend(ledger);
            ledger.prepend($(`<h4>Ledger ${ledgerSeq} (${headerHash.slice(0, 7)})</h4>`));
            indexer.ingestLedger(lcm);
        });

        ledgerSeq++;
    }

    return ledgerSeq;
};
