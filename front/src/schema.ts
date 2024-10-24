const MaxUint32 = 0xFFFFFFFF;

interface Schema {
    LedgersPerFile: number;
    FilesPerPartition: number;

    getSequenceNumberStartBoundary(ledgerSeq: number): number;
    getSequenceNumberEndBoundary(ledgerSeq: number): number;
    getFilename(ledgerSeq: number): string;
}

class SDFSchema implements Schema {
    LedgersPerFile = 1;
    FilesPerPartition = 64000;

    getSequenceNumberStartBoundary(ledgerSeq: number): number {
        return (this.LedgersPerFile == 0) ? 0 : (
            Math.floor(ledgerSeq / this.LedgersPerFile) * this.LedgersPerFile
        );
    }

    getSequenceNumberEndBoundary(ledgerSeq: number): number {
        return this.getSequenceNumberStartBoundary(ledgerSeq) + this.LedgersPerFile - 1;
    }

    getFilename(ledgerSeq: number): string {
        let objectKey: string = "";
        if (this.FilesPerPartition > 1) {
            const partitionSize = this.LedgersPerFile * this.FilesPerPartition
            const partitionStart = Math.floor(ledgerSeq / partitionSize) * partitionSize;
            const partitionEnd = partitionStart + partitionSize - 1

            const prefix = (MaxUint32 - partitionStart).toString(16).padStart(8, '0');
            objectKey = `${prefix}--${partitionStart}-${partitionEnd}/`;
        }

        const fileStart = this.getSequenceNumberStartBoundary(ledgerSeq)
        const fileEnd = this.getSequenceNumberEndBoundary(ledgerSeq)
        const prefix = (MaxUint32-fileStart).toString(16).padStart(8, '0');
        objectKey += `${prefix}--${fileStart}`

        // Multiple ledgers per file
        if (fileStart != fileEnd) {
            objectKey += `-{fileEnd}`;
        }

        objectKey = `${objectKey.toUpperCase()}.xdr.zstd`;
        return objectKey
    }
}

export let Schema = new SDFSchema();