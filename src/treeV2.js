const block = {
    encLength: function (num) {
        num = this.BitPack(num,2)
        if (num <= 0x7f) {
            if (num == 0) {
                num = [0x80]
            } else {
                num = [Number(num)]
            }
        } else {
            let R0 = this.BitUnpack(num,2)
            num = [0x80 + R0.length].concat(R0)
        }
        return num
    },
    decLength: function (bytes) {
        let number = 0;
        for (let i = 0; i < bytes.length; i++) {
            number = number * 256 + bytes[i];
        }
        return number;
    },
    BitUnpack: function (a, b) {
        let szOut = []
        while (a) {
            szOut.unshift(Number(a & BigInt(('0xf').padEnd(b + 2, 'f'))))
            a >>= BigInt(b * 4)
        }
        return szOut
    },
    BitPack: function (a, b) {
        let byte = 0n
        let bit = 0n
        a.reverse()
        while (a.length) {
            byte |= (BigInt(a[0]) & BigInt(('0xf').padEnd(b + 2, 'f'))) << bit
            bit += BigInt(b * 4)
            a = a.slice(1)
        }
        return byte
    },
    Buffer: function (data) {
        let type = typeof data
        if ('string' == type) {
            try {
                data = this.BitUnpack(BigInt(data),2)
            } catch (e) {
                try {
                    data = this.BitUnpack(BigInt(`0x${data}`),2)
                } catch (e) {
                    data = data.split('').map(i => i.charCodeAt(i))
                }
            }
        }
        return new Uint8Array(data)
    },
    RLP_encode: function (tx) {
        let data = []
        let cx = 0, cy = 0, cz = []
        for (var i in tx) {
            cx = this.encLength(this.Buffer(tx[i]))
            cy += cx.length
            cz = cz.concat(cx)
            data.push(tx[i])
        }

        cz = [cy].concat(cz)
        if (cz.length <= 0xf7) {
            cz = [0xf8].concat(cz)
        }
        return this.BitPack(cz,2).toString(16)
    },
    RLP_decode: function (d) {
        d = vcode.hexToBytes(d)
        let part = []
        while (d.length) {
            let dx = this.opcode(d)
            let size = (d.length - dx.length)
            size = size > 1 ? d.slice(1, size) : d.slice(0, size)
            part.push(vcode.bytesToHex(size))
            d = dx
        }
        return part.slice(1)
    },
    opcode: function (value) {
        let R0, R1
        if (value[0] <= 0x7f) {
            value = value.slice(1)
        } else if (value[0] <= 0xb7) {
            R0 = value[0] - 0x80
            value = value.slice(R0 + 1)
        } else if (value[0] <= 0xbf) {
            R0 = value[0] - 0xb7
            R1 = this.decLength(value.slice(1, R0 + 1))
            value = value.slice(R0 + 1, R1 + 1 + R0)
        } else if (value[0] <= 0xf7) {
            R0 = value[0] - 0xc0
            value = value.slice(R0 + 1)
        } else {
            R0 = value[0] - 0xf7
            R1 = this.decLength(value.slice(1, R0 + 1))
            value = value.slice(R0 + 1, R1 + 1 + R0)
        }
        return value;
    },
    fixed: function (leave) {
        if (leave.length % 2 == 1) {
            leave.push(leave[leave.length - 1])
        }
        return leave
    },
    combined: function (hash) {
        if (hash.length % 2 == 0) {
            hash = hash[0] + hash[1]
        }
        return hash
    },
    chained: function (leave) {
        let chain = []
        while (leave.length) {
            chain.push(this.combined(leave.slice(0, 2)))
            leave = leave.slice(2)
        }
        return chain
    },
    leaves: function (data) {
        if (!data.length) { return false }
        var leave = [];
        data.forEach(function (i) {
            if (!leave.includes(i)) {
                leave.push(i);
            }
        });
        leave = this.fixed(leave)
        let level = [leave]
        while (leave.length > 1) {
            leave = this.chained(leave);
            level.push(leave);
        }
        return level;
    },
    proof: function (i, leave) {
        leave = this.leaves(leave)
        let id = leave[0].indexOf(i)
        let proof = [{ id: id % 2, hash: i }]
        id = id % 2 == 0 ? id + 1 : id - 1
        leave.slice(0, -1).map(tx => {
            proof.push({ id: id % 2, hash: tx[id] })
            id = Math.floor(id / 2);
            id = id % 2 == 0 ? id + 1 : id - 1;
        })
        if (!proof[1].id) {
            proof = proof.slice(0, 2).reverse().concat(proof.slice(2, proof.length))
        }
        return proof
    },
    root: function (leave) {
        leave = this.leaves(leave)
        return leave[leave.length - 1][0]
    },
    verify: function (proof, root) {
        let h = proof[0].hash, valid = []
        if (!proof[1].hash) { return false };
        if (proof[0].hash != h) {
            return false
        } else {
            proof = proof.slice(1)
        };
        proof.map((hx, i) => {
            if (hx.id) {
                valid[i] = [h, hx.hash];
            } else {
                valid[i] = [hx.hash, h];
            }
            h = this.combined(valid[i]);
        });
        valid = valid[valid.length - 1].length > 1 ? this.combined(valid[valid.length - 1]) : valid[valid.length - 1]
        return valid == root
    }
}

export default block
