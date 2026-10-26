import{AgentBrowserError}from'../../../core/contracts';
export function encodedDimensions(bytes:Uint8Array,mime:'image/png'|'image/jpeg'):{width:number;height:number}{
 const data=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'&&data.length>=24&&data.readUInt32BE(0)===0x89504e47)return{width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
 if(mime==='image/jpeg'&&data.length>4&&data[0]===255&&data[1]===216){let at=2;while(at+4<=data.length){if(data[at]!==255)break;const marker=data[at+1]!;const n=data.readUInt16BE(at+2);if(n<2||at+2+n>data.length)break;if([0xc0,0xc1,0xc2,0xc3].includes(marker)&&n>=8)return{height:data.readUInt16BE(at+5),width:data.readUInt16BE(at+7)};at+=2+n;}}
 throw new AgentBrowserError('browser_frame_invalid');
}
