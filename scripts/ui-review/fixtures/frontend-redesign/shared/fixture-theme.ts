import type { Plugin } from 'obsidian';
import { SettingsStore, type SettingsPersistence } from '../../../../../src/shared/settings/store';
import { ThemeRuntime } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';

 const hostKeys=['background-primary','background-secondary','background-secondary-alt','text-normal','text-muted','interactive-accent','text-on-accent','text-accent'];

export function configureFixtureHost(docs:Record<string,Document>,sample:Record<string,unknown>) {
   for(const doc of Object.values(docs)) {
    const dark=sample.theme==='ink',surface=dark?'#1d1c19':'#ffffff';
    doc.body.classList.toggle('theme-dark',dark);doc.body.classList.toggle('theme-light',!dark);
    for(const key of hostKeys)doc.body.style.removeProperty(`--${key}`);
    if(sample.source==='obsidian') {
     const colors={'background-primary':surface,'background-secondary':surface,'background-secondary-alt':surface,'text-normal':dark?'#eeeeee':'#111111','text-muted':dark?'#cccccc':'#444444','interactive-accent':dark?'#6fb4af':'#24575a','text-on-accent':dark?'#0f1f1e':'#ffffff','text-accent':sample.hostMode==='unsafe'?(dark?surface:'#767676'):(dark?'#eeeeee':'#111111')};
     for(const [key,value]of Object.entries(colors))doc.body.style.setProperty(`--${key}`,value);
    }
    for(const leaf of doc.querySelectorAll<HTMLElement>('[data-huhu-leaf]')){leaf.style.background='var(--hu-canvas)';leaf.style.color='var(--hu-fg)';}
   }
}

/** Memory-only settings and host palette; all root/portal propagation is production ThemeRuntime. */
export async function installFixtureTheme(docs: Record<string, Document>, options: { save?: SettingsPersistence['save'] } = {}) {
 const win = docs.main!.defaultView!;
 const store = new SettingsStore({load:async()=>null,save:options.save ?? (async(_scope,file)=>file)},{timers:{set:(cb,ms)=>win.setTimeout(cb,ms),clear:id=>win.clearTimeout(id as number)}});
 await store.load();
 const settings=store.bind('theme',themeSettings), cleanup:Array<()=>void>=[];
 new ThemeRuntime(settings).attach({app:{workspace:{iterateAllLeaves:(visit:(leaf:unknown)=>void)=>Object.values(docs).forEach(doc=>visit({view:{containerEl:doc.body}})),on:()=>({})}},registerEvent:()=>{},register:(fn:()=>void)=>cleanup.push(fn)} as unknown as Plugin);
 return {
  store,
  settings,
  async configure(sample:Record<string,unknown>) {
   configureFixtureHost(docs,sample);
   await settings.update(()=>themeSettings.normalize({preset:sample.theme,accent:sample.accent,source:sample.source,density:sample.density,uiSize:sample.uiSize,motion:sample.motion??'system',fontInterface:sample.fontInterface??'default',fontInterfaceCustom:sample.fontInterfaceCustom??''}),{persist:'immediate'});
  },
  async dispose(){cleanup.splice(0).reverse().forEach(fn=>fn());await store.dispose();}
 };
}
