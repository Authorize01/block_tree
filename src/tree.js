
const block = {
    sha256:function(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = ascii[lengthProperty] * 8;
        var hash = (this.sha256.h = this.sha256.h || []);
        var k = (this.sha256.k = this.sha256.k || []);
        var primeCounter = k[lengthProperty];
      
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << (((3 - i) % 4) * 8);
        }
        words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
        words[words[lengthProperty]] = asciiBitLength;
      
        for (j = 0; j < words[lengthProperty]; ) {
            var w = words.slice(j, (j += 16));
            var oldHash = hash;
            hash = hash.slice(0, 8);
      
            for (i = 0; i < 64; i++) {
                var i2 = i + j;
                var w15 = w[i - 15],
                    w2 = w[i - 2];
                var a = hash[0],
                    e = hash[4];
                var temp1 =
                    hash[7] +
                    (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + 
                    ((e & hash[5]) ^ (~e & hash[6])) + 
                    k[i] +
                  
                    (w[i] =
                        i < 16
                            ? w[i]
                            : (w[i - 16] +
                                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + 
                                  w[i - 7] +
                                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                              0);
                var temp2 =
                    (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + 
                    ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); 
      
                hash = [(temp1 + temp2) | 0].concat(hash); 
                hash[4] = (hash[4] + temp1) | 0;
            }
      
            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }
        let szOut=[]
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += (b < 16 ? 0 : '') + b.toString(16);
                szOut.push(b)
            }
        }
        return szOut;
    },
    CRC32:function(num,CRC=0xFFFFFFFF){
        var block = new Array(256);
        var i, j, k; 
        for (i = 0; i < 256; i++) {
          k = i;
          for (j = 0; j < 8; j++) {
            if (k & 1) {
              k = 0xEDB88320 ^ (k >>> 1);
            } else {
              k = k >>> 1;
            }
          }
          block[i] = k;
        } 
        CRC= (CRC >>> 8) ^ block[(CRC ^ Number(num) & 0xFF) & 0xFF];
        return (CRC ^ 0xFFFFFFFF) >>> 0;
    },
    H8byte:function(str,CRC=0xFFFFFFFF){
        this.sha256(str).map(i=>CRC=this.CRC32(i,CRC))
        return CRC
    },
    fixed:function(leave){
        if(leave.length % 2 == 1){
            leave.push(leave[leave.length-1])
        }
        return leave
    },
    combined:function(hash){
        if(hash.length % 2 == 0){
            hash = hash[0]+hash[1]
        }
        return hash
    },
    chained:function(leave){
        let leaf = []
        if(leave.length == 1){
            return leave
        }else if(leave.length % 2 == 1){
            leave = this.fixed(leave)
        }
        while(leave.length){
            leaf.push(this.combined(leave.slice(0,2)))
            leave=leave.slice(2)
        }
        return leaf
    },
    tree:function(leave){
        let tr = [leave]
        while(leave.length > 1){
            leave=this.chained(leave);tr.push(leave);   
        }
        return tr
    },
    proof:function(h,tree){
        let id = tree[0].indexOf(h)
        let proof = [{id:id%2,hash:h}]
        id = id % 2 == 0 ? id + 1:id - 1
        tree.slice(0,-1).map(tx=>{
            proof.push({id:id % 2,hash:tx[id]})
            id=Math.floor(id / 2);
            id=id % 2==0 ? id + 1:id - 1;
        })
        if(!proof[1].id){
            proof=proof.slice(0,2).reverse().concat(proof.slice(2,proof.length))
        }
        return proof
    },
    isValid:function(h,proof){
        let valid = [];
        if(!proof[1].hash){return false};
        if(proof[0].hash != h){
            return false
        }else{
            proof=proof.slice(1)
        };
        proof.map((hx,i)=>{
            if(hx.id){valid[i]=[h,hx.hash];
            }else{valid[i]=[hx.hash,h];}
            h=this.combined(valid[i]);
        })
        return valid;
    },
    push:function(d,proof){
        let h = proof[0].hash 
        if(!proof[1].hash){return false}
        if(proof[0].hash==proof[1].hash){
            d=[[proof[0].hash].concat(d)]
        }else{
            d=[[proof[0].hash,proof[1].hash].concat(d)]
        }
        proof=proof.slice(2)
        for(var i=0;i < proof.length;i++){
            if(proof[i].id==0){
                d[i+1]=[proof[i].hash].concat(this.chained(d[i]))
            }else{
                d[i+1]=this.fixed(this.chained(d[i]))
            }
        }
        d = {
            data:d[0],
            root:this.chained(d[d.length-1])
        }

        while(d.root.length > 1){
            d.root=this.chained(d.root)
        }
        return d
    },
    mineVerify:function(h0,h1){
       let h2 = this.tree(h1.data)
       let id = h0.indexOf(h1.data[0]) != -1
       if(!id){return false}
        if(id){
            h0=h0.slice(0,h0.length-id).concat(h1.data.slice(1))
        }
        h0 = this.tree(h0)
        let v = h0[h0.length-1][0]==h1.root[0]
        return v
    },
    BitUnpack:function(a,b){
        let szOut=[]
        while(a){
            szOut.push(a & BigInt(('0xf').padEnd(b+2,'f')))
            a >>= BigInt(b * 4)
        }
        return szOut
    },
    BitPack:function(a,b){
        let byte=0n
        let bit = 0n
        while(a.length){
            byte |= (BigInt(a[0]) & BigInt(('0xf').padEnd(b+2,'f'))) << bit
            bit += BigInt(b * 4)
            a=a.slice(1)
        }
        return byte
    },
    core:function(h){
        let level = h[h.length-1]     
        let tree =this.tree(h)
        let next = this.proof(level,tree)
        let prev = this.proof(h[0],tree)
        return [next,prev]
    },
    exc:function(core,h){
       let p = core.proof
       p = this.isValid(core.proof[0].hash,core.proof)
       p.push([this.combined(p[0])])
       p[0]=this.fixed(p[0].concat(h))
       return p
    },
    Genesis:function(tx){
        let dblock=[1]
        dblock[1]=this.H8byte(tx)
        dblock[2]=Math.floor(Date.now()/1000)
        return dblock
    },
    encLength: function (num) {
        if (num <= 0x7f) {
            if (num == 0) {
                num = [0x80]
            } else {
                num = [Number(num)]
            }
        } else {
            let R0 = vcode.hexToBytes('0x' + num.toString(16))
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
    RLP_encode: function (tx) {
        let data = []
        let cx = 0, cy = 0, cz = []
        for (var i in tx) {
            try {
                tx[i] = BigInt(tx[i])
            } catch (e) {
                tx[i] = BigInt(vcode.asciiToHex(tx[i]))
            }
            cx = this.encLength(tx[i])
            cy += cx.length
            cz = cz.concat(cx)
            data.push(tx[i])
        }

        cz = [cy].concat(cz)
        if (cz.length <= 0xf7) {
            cz = [0xf8].concat(cz)
        }
        return vcode.bytesToHex(cz)
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
}

export default block;


