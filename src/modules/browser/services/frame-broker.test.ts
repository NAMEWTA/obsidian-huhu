import { expect,it,vi } from 'vitest';
import type { BrowserFrame } from '../core/contracts';
import { FrameBroker } from './frame-broker';
const frame=(id:string,version=1):BrowserFrame=>({spaceId:'s',pageId:'p',runtimeId:'r',documentId:'d',epoch:2,viewportVersion:version,frameId:id,width:100,height:80,cssWidth:100,cssHeight:80,mime:'image/jpeg',data:new Uint8Array(5),capturedAt:0,inputSequence:0});
it('shares one producer and bounds each viewer to one in-flight plus the newest frame',()=>{
 const watch=vi.fn(async()=>{}),broker=new FrameBroker(watch),a=vi.fn(),b=vi.fn();
 const sa=broker.subscribe({spaceId:'s',pageId:'p',viewerId:'a'},a),sb=broker.subscribe({spaceId:'s',pageId:'p',viewerId:'b'},b);
 expect(watch).toHaveBeenCalledTimes(1);broker.publish(frame('1'));broker.publish(frame('2'));broker.publish(frame('3'));
 expect(a).toHaveBeenCalledTimes(1);expect(broker.stats('s').queuedFrameBytes).toBe(20);sa.ack('1');expect(a.mock.calls[1]?.[0].frameId).toBe('3');expect(b).toHaveBeenCalledTimes(1);
 sa.dispose();expect(watch).toHaveBeenCalledTimes(1);sb.dispose();expect(watch).toHaveBeenLastCalledWith('s','p',false);
});
it('geometry barrier rejects old input and retains a fresh frame arriving before the geometry ACK',()=>{
 const broker=new FrameBroker(async()=>{}),receive=vi.fn(),sub=broker.subscribe({spaceId:'s',pageId:'p',viewerId:'v'},receive);
 broker.publish(frame('old'));sub.ack('old');expect(broker.frame('v','old')).toBeDefined();broker.barrier('s','p',true);expect(broker.frame('v','old')).toBeUndefined();
 broker.publish(frame('new',2));expect(receive).toHaveBeenCalledTimes(1);broker.barrier('s','p',false,2);expect(receive.mock.calls[1]?.[0].frameId).toBe('new');sub.ack('new');expect(broker.frame('v','new')?.viewportVersion).toBe(2);
});
it('invalidates frame eligibility on controller/document changes',()=>{const broker=new FrameBroker(async()=>{}),sub=broker.subscribe({spaceId:'s',pageId:'p',viewerId:'v'},()=>{});broker.publish(frame('a'));sub.ack('a');broker.invalidate('s');expect(broker.frame('v','a')).toBeUndefined();});
it('a new authority clears a failed geometry barrier and Space counters remain scoped',async()=>{
 const watch=vi.fn(async()=>{}),broker=new FrameBroker(watch),receive=vi.fn(),sub=broker.subscribe({spaceId:'s',pageId:'p',viewerId:'v'},receive);
 broker.barrier('s','p',true);broker.publish(frame('stale'));broker.reset('s');broker.publish(frame('fresh',2));sub.ack('fresh');
 expect(broker.frame('v','fresh')?.viewportVersion).toBe(2);expect(broker.stats('unrelated').framesReceived).toBe(0);
 await broker.restart('s');expect(watch).toHaveBeenCalledTimes(2);expect(watch).toHaveBeenLastCalledWith('s','p',true);
});
