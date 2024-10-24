from xdrlib3 import Packer, Unpacker

from stellar_sdk.xdr.base import Integer
from stellar_sdk.xdr.ledger_close_meta import LedgerCloseMeta


__all__ = ["LedgerCloseMetaBatch"]


class LedgerCloseMetaBatch:
    """
    struct LedgerCloseMetaBatch
    {
        // starting ledger sequence number in the batch
        uint32 startSequence;

        // ending ledger sequence number in the batch
        uint32 endSequence;

        // Ledger close meta for each ledger within the batch
        LedgerCloseMeta ledgerCloseMetas<>;
     };
     """

    def __init__(
        self,
        start_sequence,
        end_sequence,
        metas
    ) -> None:
        self.s = start_sequence
        self.e = end_sequence
        self.lcms = metas

    def pack(self, packer: Packer) -> None:
        Integer(self.s).pack(packer)
        Integer(self.e).pack(packer)

        for lcm in self.lcms:
            lcm.pack(packer)

    @classmethod
    def unpack(cls, unpacker: Unpacker):
        s = Integer.unpack(unpacker)
        e = Integer.unpack(unpacker)

        length = unpacker.unpack_uint()
        lcms = []
        for _ in range(length):
            lcms.append(LedgerCloseMeta.unpack(unpacker))

        return cls(s, e, lcms)

    def to_xdr_bytes(self) -> bytes:
        packer = Packer()
        self.pack(packer)
        return packer.get_buffer()

    @classmethod
    def from_xdr_bytes(cls, xdr: bytes):
        unpacker = Unpacker(xdr)
        return cls.unpack(unpacker)

    def to_xdr(self) -> str:
        xdr_bytes = self.to_xdr_bytes()
        return base64.b64encode(xdr_bytes).decode()

    @classmethod
    def from_xdr(cls, xdr: str):
        xdr_bytes = base64.b64decode(xdr.encode())
        return cls.from_xdr_bytes(xdr_bytes)

    def __hash__(self):
        return hash(
            (
                self.s,
                self.e,
                self.lcms,
            )
        )

    def __eq__(self, other: object):
        return NotImplemented

    def __repr__(self):
        out = []
        out.append(f"start={self.s}")
        out.append(f"end={self.e}")
        out.append(f"LCMs={len(self.lcms)}|{self.lcms}")
        return f"<LedgerCloseMetaBatch [{', '.join(out)}]>"
