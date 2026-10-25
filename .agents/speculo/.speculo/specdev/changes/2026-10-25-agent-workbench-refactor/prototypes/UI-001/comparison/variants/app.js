(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const variant = document.body.dataset.variant;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',
    terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 5-6 13 0 18 6-5 6-13 0-18Z"/>',
    history:'<path d="M3 5v5h5M4 9a9 9 0 1 1 0 7m8-9v6l4 2"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    split:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/>',
    command:'<path d="M8 8H5a3 3 0 1 1 3-3v14a3 3 0 1 1-3-3h14a3 3 0 1 1-3 3V5a3 3 0 1 1 3 3H8Z"/>',
    sliders:'<path d="M6 3v6m0 6v6M12 3v10m0 6v2m6-18v2m0 6v10"/><path d="M3 9h6v6H3Zm6 4h6v6H9Zm6-8h6v6h-6Z"/>'
  };
  function paintIcons() { document.querySelectorAll('[data-icon]').forEach(e => { e.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[e.dataset.icon] || ''}</svg>`; }); }
  const initial = () => ({
    spaces:[{id:'space-terminal',name:'终端重构',cwd:'项目 / obsidian-huhu',external:false},{id:'space-docs',name:'文档维护',cwd:'本机授权目录 / workspace-docs',external:true}],
    sessions:[{id:'ses-main',name:'主控',provider:'Codex',space:'space-terminal',status:'idle',visible:true,log:[]},{id:'ses-review',name:'代码审阅',provider:'Claude Code',space:'space-terminal',status:'idle',visible:variant==='a',log:[]},{id:'ses-shell',name:'构建验证',provider:'Shell',space:'space-terminal',status:'working',visible:false,log:[]},{id:'ses-docs',name:'文档助手',provider:'Codex',space:'space-docs',status:'idle',visible:false,log:[]}],
    current:'space-terminal',focus:'ses-main',partner:'ses-review',target:'ses-review',scope:'space',tool:'control',tab:'terminals',split:variant==='a',vertical:false,ratio:50,
    messages:[{id:'msg-01',from:'文档助手',target:'ses-main',body:'文档中已补充视图关闭与停止运行的区别，请核对。',read:false,ack:false},{id:'msg-02',from:'主控',target:'ses-review',body:'请检查输入仲裁与后台会话恢复的边界。',read:false,ack:false}],
    feedback:null,screen:false,scenario:'default',history:'default',query:'',preview:null,notes:{},agentEnabled:true,restored:false,newCounter:0
  });
  let state=initial(), timer, toastTimer, operation=0, lastTrigger;
  const statusText = {idle:'空闲',working:'工作中',blocked:'待确认',stopped:'已停止',unknown:'状态未知'};
  const getSession=id=>state.sessions.find(s=>s.id===id);
  const currentSpace=()=>state.spaces.find(s=>s.id===state.current);
  const getTarget=()=>getSession(state.target);
  const badge=s=>`<span class="badge ${s.status}"><span class="dot ${s.status}"></span>${statusText[s.status]}</span>`;
  function notify(text) { clearTimeout(toastTimer); $('#toast').textContent=text; $('#toast').hidden=false; toastTimer=setTimeout(()=>{$('#toast').hidden=true;},4000); }
  function openModal(title,body,actions='') {
    lastTrigger=document.activeElement; const d=$('#modal');
    d.innerHTML=`<div class="dialog-heading"><h2 id="modal-title">${title}</h2><button data-action="close-dialog" data-dialog="modal" aria-label="关闭对话框">×</button></div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
    if(!d.open)d.showModal();
  }
  function closeModal(){ $('#modal').close(); }
  function sidebarHTML(){
    return `<div class="sidebar-heading"><h2>智能体</h2><div class="spacer"></div><button data-action="create-space" aria-label="新建空间">＋</button></div>
      <div class="section-label" style="padding-top:0">当前 Vault · 个人知识库</div>
      ${state.spaces.map((sp,i)=>`<button class="space-item ${sp.id===state.current?'selected':''}" data-action="space" data-id="${sp.id}"><span class="space-icon">${String(i+1).padStart(2,'0')}</span><span class="grow"><strong class="truncate" title="${esc(sp.name)}">${esc(sp.name)}</strong><small>${state.sessions.filter(s=>s.space===sp.id&&s.status!=='stopped').length} 个运行 · ${sp.external?'库外已授权':'Vault 内目录'}</small></span></button>`).join('')}
      ${state.spaces.length?'':'<p class="muted small">尚未创建空间</p>'}
      <button class="full outline mt" data-action="create-space">＋ 新建空间</button>
      <div class="session-tree"><div class="section-label">当前空间 · 会话 <span>${state.sessions.filter(s=>s.space===state.current).length}</span></div>
      ${state.sessions.filter(s=>s.space===state.current).map(s=>`<button class="session ${s.id===state.focus?'selected':''}" data-action="session" data-id="${s.id}"><span class="dot ${s.status}"></span><span class="grow"><span class="truncate" title="${esc(s.name)}">${esc(s.name)}</span><small>${s.provider} · ${statusText[s.status]}${!s.visible&&s.status!=='stopped'?' · 后台':''}</small></span>${state.messages.some(m=>m.target===s.id&&!m.ack)?'<span class="badge accent">'+state.messages.filter(m=>m.target===s.id&&!m.ack).length+'</span>':''}</button>`).join('')}</div>
      <div class="section-label">工具</div><button class="session" data-action="history">↶ <span>本 Vault 历史</span></button><button class="session" data-action="web">◎ <span>参考资料</span><span class="badge">网页</span></button>
      <div class="sidebar-note">${esc(currentSpace()?.cwd||'创建空间后可绑定工作目录')}<br>关闭面板后，可从会话列表再次显示。</div>`;
  }
  function terminalHTML(s){
    const focused=s.id===state.focus;
    let content='';
    if(s.status==='stopped')content=`<div class="empty"><h2>运行已结束</h2><p>会话记录仍然保留。继续会话会启动新的运行。</p><button class="outline" data-action="resume-session" data-id="${s.id}">继续会话</button></div>`;
    else if(s.provider==='Shell')content=`<p><span class="term-pass">❯</span> pnpm run build</p><p class="muted">&gt; tsc -noEmit -skipLibCheck<br>&gt; node scripts/build-styles.mjs --check</p><p class="term-tool">正在检查类型与样式…</p><p class="term-meta">这是演示输出，未执行真实命令。</p>`;
    else if(s.id==='ses-review')content=`<strong class="term-brand">✳ Claude Code</strong><p class="term-meta">系统账号 · 项目 / obsidian-huhu</p><div class="term-user">审查终端运行与显示面板的关系。</div><p>我会先核对会话身份与关闭逻辑。</p><p class="term-tool">● Read WorkspaceLayout.tsx</p><p class="muted">  已检查面板切换与关闭入口。<br>  后台会话不应依赖 React 视图存活。</p><p class="term-pass">✓ 审阅意见已整理</p><p>关闭视图后保留运行；停止操作单独提供，并核实进程退出。</p>`;
    else content=`<strong class="term-brand">›_ Codex</strong><p class="term-meta">系统账号 · 项目 / obsidian-huhu<br>当前会话：${esc(s.id)}</p><div class="term-user">把代码审阅交给另一个终端，并查看它的反馈。</div><p>我会定位审阅终端，然后提交输入、等待状态变化并读取屏幕。</p><p class="term-tool">• 已发现代码审阅 · Claude Code</p><p class="muted">  Space：终端重构<br>  会话：ses-review<br>  输入：可用</p><p>可以在右侧控制面中查看同一目标。跨空间操作会明确显示目标归属。</p><p class="term-meta">终端状态只描述运行情况，结论还需读取输出或核对产物。</p>`;
    if(s.status==='blocked')content+=`<div class="native-approval"><p>需要你确认 · 原生终端审批</p><p class="small">Claude Code 请求执行：pnpm run build</p><div class="row wrap"><button class="outline" data-action="human-approve" data-id="${s.id}">允许本次</button><button class="outline" data-action="human-reject" data-id="${s.id}">拒绝</button></div></div>`;
    if(s.status==='unknown')content+=`<div class="callout warning">连接已中断，暂时无法确认运行状态。<button data-action="reconnect">重新连接</button></div>`;
    content+=s.log.map(l=>`<p class="${l.kind==='input'?'term-user':'term-tool'}">${esc(l.text)}</p>`).join('');
    return `<article class="pane ${focused?'focused':''}" data-session="${s.id}"><header class="pane-head"><button data-action="focus" data-id="${s.id}" aria-label="聚焦${esc(s.name)}">${s.provider==='Shell'?'$':'›_'}</button><strong class="grow" title="${esc(s.name)}">${esc(s.name)}</strong>${badge(s)}<button data-action="detach" data-id="${s.id}" aria-label="关闭${esc(s.name)}显示面板">×</button></header><div class="terminal" tabindex="0" aria-label="${esc(s.name)}终端输出">${content}</div><form class="terminal-input" data-session="${s.id}"><span aria-hidden="true">›</span><input id="input-${s.id}" aria-label="${esc(s.name)}原生终端输入" placeholder="输入内容，Enter 提交" ${['stopped','blocked','unknown'].includes(s.status)?'disabled':''}><button type="submit" aria-label="提交到${esc(s.name)}" ${['stopped','blocked','unknown'].includes(s.status)?'disabled':''}>↵</button></form><div class="pane-caption">${s.provider} · ${statusText[s.status]} · ${focused?'当前焦点':'点击标题聚焦'}</div></article>`;
  }
  function stageHTML(){
    if(state.tab==='web')return `<div class="web-address">◎　参考资料 / 终端协作 · 离线示例网页</div>${!state.agentEnabled?'<div class="banner">智能体模块已关闭，网页保持打开。<button class="outline" data-action="enable-agent">启用智能体</button></div>':''}<article class="web-page"><span class="badge">参考资料</span><h2>让多个终端<br>一起完成一件事。</h2><p>这是原型内的离线网页示例。正式产品沿用网页标签、浏览器配置和收藏入口；网页不依赖 Space 或 Agent 运行。</p><h3>01　发现与定位</h3><p>找到明确的终端身份，再查看它的状态。相同目录可以拥有不同的工作空间。</p><h3>02　输入与等待</h3><p>提交文本到原生终端，等待可观察的状态变化。需要人工确认时回到原终端。</p><h3>03　读取与核对</h3><p>读取终端输出，或检查实际生成的文件。状态变化本身不代表任务成功。</p><button class="outline mt" data-action="agent">返回智能体</button></article>`;
    if(!state.agentEnabled)return `<div class="empty"><h2>智能体已停用</h2><p>会话记录已保留。参考资料网页仍可继续使用。</p><button class="primary" data-action="enable-agent">启用智能体</button><button data-action="web">打开参考资料</button></div>`;
    if(!state.spaces.length)return `<div class="empty"><h2>从一个空间开始</h2><p>空间组织终端与 Agent。选择工作目录后，再创建需要的终端。</p><button class="primary" data-action="create-space">新建空间</button><button data-action="web">先打开参考资料</button></div>`;
    if(state.scenario==='loading')return `<div class="empty"><h2>正在连接终端…</h2><p>已有会话记录保留，暂时不可提交输入。</p><button class="outline" data-action="reconnect">重新检查连接</button></div>`;
    const inSpace=state.sessions.filter(s=>s.space===state.current&&s.visible);
    if(!inSpace.length)return `<div class="empty"><h2>${state.sessions.some(s=>s.space===state.current)?'面板已关闭，会话仍在后台':'这个空间还没有终端'}</h2><p>从会话列表再次显示已有终端，或创建一个 Agent / Shell。</p><button class="primary" data-action="new-terminal">新建终端</button><button class="outline" data-action="spaces">显示会话列表</button></div>`;
    let chosen=[getSession(state.focus),getSession(state.partner),...inSpace].filter((s,i,a)=>s&&s.visible&&s.space===state.current&&a.findIndex(x=>x?.id===s.id)===i).slice(0,state.split?2:1);
    return `${state.restored?'<div class="banner">已恢复布局；上次运行已结束。<button class="outline" data-action="resume-session" data-id="'+state.focus+'">明确继续</button></div>':''}<div class="terminal-grid ${chosen.length<2?'single':''} ${state.vertical?'vertical':''}" style="--split:${state.ratio/(100-state.ratio)}fr">${chosen.map((s,i)=>(i?`<div class="split-handle"><input type="range" min="25" max="75" value="${state.ratio}" aria-label="调整分屏比例" id="split-ratio"></div>`:'')+terminalHTML(s)).join('')}</div>`;
  }
  function controlHTML(){
    const t=getTarget(); const options=state.sessions.filter(s=>state.scope==='vault'||s.space===state.current);
    if(!t)return `<div class="empty"><h2>没有可控制的终端</h2><button class="outline" data-action="new-terminal">新建终端</button></div>`;
    const sp=state.spaces.find(s=>s.id===t.space);
    const blocked=!state.agentEnabled||['blocked','stopped','unknown'].includes(t.status);
    return `<div class="control-layout"><section class="tool-section"><h2 class="tool-title">目标终端</h2><label for="target-scope">查找范围</label><select id="target-scope"><option value="space" ${state.scope==='space'?'selected':''}>当前空间</option><option value="vault" ${state.scope==='vault'?'selected':''}>本 Vault 的所有空间</option></select><label class="mt" for="target-session">明确选择目标</label><select id="target-session">${options.map(s=>`<option value="${s.id}" ${s.id===t.id?'selected':''}>${esc(s.name)} · ${s.provider}</option>`).join('')}</select><div class="target-meta">${esc(sp?.name||'未知空间')} · <code>${esc(t.id)}</code><br>${esc(sp?.cwd||'')}<br>${badge(t)} ${t.space!==state.current?'<span class="badge accent">跨 Space · 同 Vault</span>':''}</div><div class="row mt wrap"><button class="outline" data-action="locate">定位面板</button><button class="outline" data-action="attach-target">分屏显示</button></div><div class="mt callout">控制目标由会话身份确定，切换面板不会改变发送目标。</div></section>
    <section class="tool-section"><div class="row tool-title"><h2>发送到原生终端</h2></div><label for="prompt">输入内容</label><textarea id="prompt" placeholder="例如：检查关闭面板后会话是否仍可恢复。" ${blocked?'disabled':''}>${esc(state.promptDraft||'请检查终端输入仲裁，并把结论写入审阅记录。')}</textarea><p class="target-meta">来源：${esc(getSession(state.focus)?.name||'用户')} · 提交文本与 Enter</p>${t.status==='blocked'?'<div class="callout warning mt">目标正在等待人工确认。普通协作输入暂停。<button data-action="locate">回到原终端处理</button></div>':''}
    <div class="row wrap mt"><button class="primary" data-action="send-wait" ${blocked?'disabled':''}>发送并等待</button><button class="outline" data-action="send-only" ${blocked?'disabled':''}>只发送</button></div>
    ${state.feedback?`<div class="feedback" role="status"><strong>${esc(state.feedback.title)}</strong><br>${esc(state.feedback.body)}${state.feedback.kind==='waiting'?'<br><button class="outline mt" data-action="cancel-wait">取消等待</button>':''}${state.feedback.kind==='timeout'?'<br><button class="outline mt" data-action="retry-wait">再次等待状态</button>':''}</div>`:''}
    <div class="row wrap mt"><button class="outline" data-action="read-screen" ${t.status==='stopped'?'disabled':''}>读取屏幕</button><button class="danger" data-action="stop" ${t.status==='stopped'?'disabled':''}>停止运行</button></div>
    ${state.screen?`<pre class="screen-preview">会话 ${esc(t.id)} · 当前屏幕快照\n${esc(t.log.at(-1)?.text||'关闭视图后保留运行；停止操作单独核实。')}\n[有界快照 · 不代表完整对话]</pre>`:''}
    <p class="target-meta mt">输入已提交或状态为空闲，都不代表任务已完成。请读取输出或核对实际产物。</p></section></div>`;
  }
  function inboxHTML(){
    const mine=state.messages.filter(m=>m.target===state.focus);
    return `<h2>会话邮箱</h2><p class="target-meta">${esc(getSession(state.focus)?.name||'当前会话')} · Agent 主动读取后确认收到</p><div class="callout mt">消息只进入邮箱，不启动新运行，也不自动输入原生终端。</div>
    ${mine.length?mine.map(m=>`<article class="mail-item"><div class="mail-heading">${esc(m.from)}<span class="badge">${m.ack?'已确认收到':m.read?'已读取':'未读'}</span></div>${m.read?`<p>${esc(m.body)}</p><button class="outline" data-action="ack" data-id="${m.id}" ${m.ack?'disabled':''}>确认收到</button>`:`<p>有一条待主动读取的消息</p><button class="outline" data-action="read-message" data-id="${m.id}">读取消息</button>`}</article>`).join(''):'<p class="muted mt">暂无消息</p>'}
    <section class="tool-section mt"><h3>发送被动通知</h3><p class="target-meta">收件人：${esc(getTarget()?.name||'未选择目标')}</p><label class="mt" for="mail-body">消息正文</label><textarea id="mail-body" placeholder="留一条通知，不打断对方的终端。"></textarea><button class="outline mt" data-action="send-message" ${!getTarget()?'disabled':''}>发送到邮箱</button></section>`;
  }
  const records=[{id:'history-01',title:'终端状态与恢复边界',provider:'Codex',origin:'本机 · 系统账号',time:'今天 10:24',missing:false},{id:'history-02',title:'面板关闭后继续代码审阅',provider:'Claude Code',origin:'本机 · 系统账号',time:'昨天 18:42',missing:false},{id:'history-03',title:'旧设备上的会话记录',provider:'Codex',origin:'来源设备不可用',time:'10 月 20 日',missing:true}];
  function historyHTML(){
    const r=records.find(r=>r.id===state.preview);
    if(r)return `<button class="outline" data-action="back-history">← 返回历史</button><h2 class="mt">${r.title}</h2><p class="target-meta">${r.provider} · ${r.origin}<br>归属：个人知识库 / 终端重构</p>${r.missing?'<div class="callout error mt">原生来源不可用。元数据和标注仍保留，当前不能预览原生正文或继续。可重新关联正确来源后重试。</div><button class="outline mt" data-action="retry-source">重新检查来源</button>':`<div class="screen-preview">只读预览 · 示例原生对话\n\n用户：关闭面板后如何恢复？\nAgent：从会话列表重新附加；进程无需重启。\n\n此处不会启动 Agent。</div><button class="primary mt" data-action="resume-history">继续原生会话</button>`}<label for="annotation" class="mt">HUHU 标注</label><textarea id="annotation">${esc(state.notes[r.id]??'保留视图与运行分离的结论。')}</textarea><button class="outline mt" data-action="save-note">保存标注</button>`;
    const found=records.filter(r=>r.title.includes(state.query));
    return `<div class="row"><h2 class="grow">当前 Vault 历史</h2><button data-action="reload-history" aria-label="刷新历史">↻</button></div><p class="target-meta">个人知识库 · ${records.length} 条示例记录</p><label class="mt" for="history-search">搜索标题或元数据</label><input id="history-search" value="${esc(state.query)}" placeholder="搜索本 Vault 的历史…"><div id="history-results">${state.history==='loading'?'<div class="empty"><p>正在读取原生来源…</p></div>':`${state.history==='partial'?'<div class="callout warning mt">1 个来源暂不可读。其他记录可继续浏览。<button data-action="reload-history">重试来源</button></div>':''}${found.length?found.map(r=>`<article class="history-item"><button data-action="preview" data-id="${r.id}">${r.title}</button><p>${r.provider} · ${r.time}</p><span class="badge">${r.missing?'来源不可用':'可预览'}</span></article>`).join(''):'<div class="empty"><h2>没有匹配的历史</h2><p>只查当前 Vault 的标题和元数据。</p><button class="outline" data-action="clear-search">清除搜索</button></div>'}`}</div>`;
  }
  function renderInspector(){
    const active=document.activeElement; const aid=active?.id; const start=active?.selectionStart; const end=active?.selectionEnd;
    $('#inspector-content').innerHTML=`<div class="tool-tabs" role="tablist" aria-label="终端工具"><button role="tab" data-action="control" aria-selected="${state.tool==='control'}" tabindex="${state.tool==='control'?0:-1}" id="tool-control">控制</button><button role="tab" data-action="inbox" aria-selected="${state.tool==='inbox'}" tabindex="${state.tool==='inbox'?0:-1}" id="tool-inbox">通知${state.messages.some(m=>m.target===state.focus&&!m.ack)?' · '+state.messages.filter(m=>m.target===state.focus&&!m.ack).length:''}</button><button role="tab" data-action="history" aria-selected="${state.tool==='history'}" tabindex="${state.tool==='history'?0:-1}" id="tool-history">历史</button><button class="close-tool" data-action="close-tool" aria-label="关闭工具面板">×</button></div><div class="tool-content" role="tabpanel" aria-labelledby="tool-${state.tool}">${state.tool==='control'?controlHTML():state.tool==='inbox'?inboxHTML():historyHTML()}</div>`;
    if(aid){const el=document.getElementById(aid);if(el){el.focus({preventScroll:true});if(typeof start==='number'&&el.setSelectionRange)el.setSelectionRange(start,end);}}
  }
  function render(){
    $('#sidebar').innerHTML=sidebarHTML(); if($('#sheet').open)$('#sheet-content').innerHTML=sidebarHTML();
    $('#current-space').textContent=currentSpace()?.name||'未创建空间';
    $('#tabs').innerHTML=`<button class="${state.tab==='terminals'?'selected':''}" data-action="agent">›_ 终端${state.agentEnabled?'':' · 已停用'}</button><button class="${state.tab==='web'?'selected':''}" data-action="web">◎ 参考资料 <span class="badge">网页</span></button><div class="spacer"></div>`;
    $('#stage').innerHTML=stageHTML();
    if($('#deck'))$('#deck').innerHTML=state.sessions.filter(s=>s.space===state.current).map(s=>`<div class="deck-row"><span class="truncate">${esc(s.name)}</span>${badge(s)}<span class="mono">${s.provider} · ${s.visible?'已显示':'后台'}</span><div class="spacer"></div><button data-action="session" data-id="${s.id}">打开终端</button><button data-action="target" data-id="${s.id}">控制</button></div>`).join('');
    renderInspector(); paintIcons();
  }
  function tool(which){ state.tool=which; const d=$('#inspector'); const small=matchMedia('(max-width:959px)').matches; if(!d.open){if(small)d.showModal();else d.show();}renderInspector(); }
  function showSession(id){ const s=getSession(id); if(!s)return;state.current=s.space;state.focus=id;s.visible=true;state.tab='terminals';if($('#sheet').open)$('#sheet').close();render(); }
  function selectTarget(id){state.target=id;state.feedback=null;state.screen=false;state.scope=getTarget()?.space===state.current?'space':'vault';render();tool('control');}
  function send(wait){
    const t=getTarget(), prompt=$('#prompt')?.value.trim();if(!t||!prompt)return notify('先输入要提交的内容。');
    if(['blocked','stopped','unknown'].includes(t.status)||!state.agentEnabled)return notify('目标当前不可提交普通协作输入。');
    state.promptDraft=prompt;const alreadyWorking=t.status==='working';t.log.push({kind:'input',text:prompt});t.status='working';state.feedback={kind:wait?'waiting':'sent',title:'输入已提交',body:wait?'正在等待目标状态变化；这不是逐任务结果。':'仅提交输入，不自动等待或判定结果。'};render();const op=++operation;clearTimeout(timer);
    timer=setTimeout(()=>{if(op!==operation)return;if(state.scenario==='timeout'){if(wait&&state.target===t.id){state.feedback={kind:'timeout',title:'等待超时 · 目标仍在运行',body:'没有重发输入，也没有停止终端。可以再次等待或读取屏幕。'};render();}return;}t.status='idle';t.log.push({kind:'output',text:'审阅结论已写入示例审阅记录。请核对实际产物。'});if(wait&&state.target===t.id)state.feedback={kind:'matched',title:'观察到空闲',body:alreadyWorking?'发送时目标已经工作中。状态匹配不代表这条输入已完成，请核对输出。':'状态发生变化；请读取屏幕或检查产物，确认实际结果。'};render();},1800);
  }
  function createSpace(){openModal('新建空间',`<div class="stack"><p>空间只组织会话。创建后再启动需要的终端。</p><div><label for="space-name">空间名称</label><input id="space-name" required placeholder="例如：终端重构"></div><div><label for="space-directory">工作目录</label><select id="space-directory"><option value="vault">当前 Vault 目录</option><option value="external">选择库外本机目录（演示）</option></select></div><label class="row"><input type="checkbox" id="external-allow" style="width:auto">明确允许使用所选库外目录</label><p class="small">演示目录为 workspace-docs。正式界面使用本机目录选择器，不以手填路径代替授权。</p></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-space">创建空间</button>`);}
  function newTerminal(){if(!state.agentEnabled)return notify('请先启用智能体模块。');if(!state.spaces.length)return createSpace();openModal('新建终端',`<div class="stack"><p>创建到「${esc(currentSpace().name)}」，打开原生终端。</p><div><label for="new-provider">终端类型</label><select id="new-provider">${['Shell','Codex','Claude Code','Gemini CLI','OpenCode','Pi','Grok'].map(x=>`<option>${x}</option>`).join('')}</select></div><div><label for="new-name">会话名称</label><input id="new-name" placeholder="例如：验证测试"></div><label class="row"><input type="checkbox" id="background-start" style="width:auto">在后台启动，不切换当前面板</label></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-terminal">创建终端</button>`);}
  function palette(){openModal('命令与会话',`<label for="palette-search">查找当前 Vault 的会话或操作</label><input id="palette-search" placeholder="输入名称…"><div class="palette-list" id="palette-results">${paletteItems('')}</div>`);$('#palette-search').focus();}
  function paletteItems(q){const items=state.sessions.filter(s=>(s.name+s.provider).includes(q)).map(s=>`<button data-action="session" data-id="${s.id}">${esc(s.name)}<small>${esc(state.spaces.find(sp=>sp.id===s.space)?.name||'')} · ${s.provider}</small></button>`);if(!q||'新建空间'.includes(q))items.push('<button data-action="create-space">＋ 新建空间<small>不启动进程</small></button>');if(!q||'本 Vault 历史'.includes(q))items.push('<button data-action="history">↶ 本 Vault 历史</button>');return items.join('')||'<p class="muted">没有匹配的会话或操作。</p>';}
  const scenarios={default:'默认双终端',empty:'空 Space',noSpaces:'无 Space',loading:'连接中',lost:'连接失联',approval:'原生权限审批',timeout:'等待超时',historyError:'历史来源失败',restore:'重启后恢复',long:'长名称与文案',disabled:'关闭 Agent，保留网页'};
  function scenario(name){clearTimeout(timer);operation++;state=initial();state.scenario=name; if(name==='empty'){state.current='space-empty';state.spaces.push({id:'space-empty',name:'新的工作空间',cwd:'当前 Vault',external:false});}if(name==='noSpaces'){state.spaces=[];state.sessions=[];state.current=null;}if(name==='lost')state.sessions.forEach(s=>s.status='unknown');if(name==='approval'){getSession('ses-review').status='blocked';getSession('ses-review').visible=true;state.focus='ses-review';state.split=true;}if(name==='historyError'){state.history='partial';state.tool='history';}if(name==='restore'){state.restored=true;state.sessions.forEach(s=>s.status='stopped');}if(name==='long'){state.spaces[0].name='终端协作与跨空间恢复验证——含很长的中文名称、English context and additional details';state.sessions[0].name='主控智能体：验证所有终端面板在复杂任务中仍可稳定恢复';state.promptDraft='请认真检查终端控制、原生权限审批与跨空间目标识别，在长中文名称以及 English mixed content 下核对可读性。'.repeat(4);}if(name==='disabled'){state.agentEnabled=false;state.sessions.forEach(s=>s.status='stopped');state.tab='web';}closeModal();render();if(['approval','timeout','historyError'].includes(name))tool(state.tool);else if(matchMedia('(max-width:959px)').matches||name==='disabled')$('#inspector').close();notify('已切换演示：'+scenarios[name]);}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
    if(a==='theme'){document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';return;}
    if(a==='close-dialog'){document.getElementById(b.dataset.dialog).close();return;}
    if(a==='scenarios'){openModal('状态演示',`<p>所有状态均为本页模拟，可随时重置。</p><div class="scenario-grid mt">${Object.entries(scenarios).map(([k,v])=>`<button data-action="scenario" data-id="${k}">${v}</button>`).join('')}</div>`);return;}
    if(a==='scenario'){scenario(id);return;}if(a==='reset'){scenario('default');return;}
    if(a==='spaces'){lastTrigger=b;$('#sheet-content').innerHTML=sidebarHTML();$('#sheet').showModal();return;}
    if(a==='create-space'){if($('#sheet').open)$('#sheet').close();createSpace();return;}
    if(a==='confirm-space'){const name=$('#space-name').value.trim();if(!name){$('#space-name').setCustomValidity('请输入空间名称');$('#space-name').reportValidity();return;}const ext=$('#space-directory').value==='external';if(ext&&!$('#external-allow').checked){$('#external-allow').setCustomValidity('请明确授权所选库外目录');$('#external-allow').reportValidity();return;}const sp={id:'space-new-'+(++state.newCounter),name,cwd:ext?'本机授权目录 / workspace-docs':'当前 Vault',external:ext};state.spaces.push(sp);state.current=sp.id;state.tab='terminals';closeModal();render();notify('空间已创建，尚未启动终端。');return;}
    if(a==='space'){state.current=id;state.focus=state.sessions.find(s=>s.space===id)?.id||null;state.target=state.focus;state.tab='terminals';state.scope='space';$('#sheet').close();render();return;}
    if(a==='session'){closeModal();showSession(id);return;}if(a==='target'){selectTarget(id);return;}
    if(a==='new-terminal'){newTerminal();return;}if(a==='confirm-terminal'){const provider=$('#new-provider').value,background=$('#background-start').checked;const s={id:'ses-new-'+(++state.newCounter),name:$('#new-name').value.trim()||provider,provider,space:state.current,status:'idle',visible:!background,log:[]};state.sessions.push(s);closeModal();if(!background)state.focus=s.id;render();notify(background?'已在后台创建终端，当前焦点保留。':'已打开新终端。');return;}
    if(a==='agent'){state.tab='terminals';render();return;}if(a==='web'){state.tab='web';$('#inspector').close();render();return;}
    if(a==='home'){openModal('HUHU 首页', '<p>本原型聚焦终端工作台。首页沿用当前项目，不在此原型中重新设计。</p>');return;}
    if(a==='palette'){palette();return;}
    if(['control','inbox','history'].includes(a)){closeModal();if(a==='history')state.preview=null;tool(a);return;}if(a==='close-tool'){$('#inspector').close();return;}
    if(a==='split'){const list=state.sessions.filter(s=>s.space===state.current);if(list.length<2){notify('需要两个会话才能分屏；可先新建终端。');return;}state.split=!state.split;if(state.split)list.slice(0,2).forEach(s=>s.visible=true);render();return;}
    if(a==='direction'){state.vertical=!state.vertical;render();return;}
    if(a==='focus'){state.focus=id;render();document.getElementById('input-'+id)?.focus();return;}
    if(a==='detach'){getSession(id).visible=false;state.focus=state.sessions.find(s=>s.space===state.current&&s.visible)?.id||null;render();notify('显示面板已关闭；终端仍保留，可从会话列表再次显示。');return;}
    if(a==='locate'||a==='attach-target'){const tid=state.target;if(!tid)return;if(a==='attach-target'&&getTarget().space===state.current&&state.focus!==tid){getTarget().visible=true;state.partner=tid;state.split=true;state.tab='terminals';render();if(matchMedia('(max-width:959px)').matches)$('#inspector').close();notify('目标已分屏显示，当前焦点保持不变。');return;}showSession(tid);if(matchMedia('(max-width:959px)').matches)$('#inspector').close();state.scope='space';render();document.getElementById('input-'+tid)?.focus();notify('已定位同一会话，未重新启动终端。');return;}
    if(a==='send-wait'||a==='send-only'){send(a==='send-wait');return;}
    if(a==='cancel-wait'){operation++;clearTimeout(timer);state.feedback={kind:'cancelled',title:'等待已取消',body:'目标仍在运行；没有停止或重发输入。'};render();return;}
    if(a==='retry-wait'){const retryTarget=getTarget();state.feedback={kind:'waiting',title:'继续等待状态',body:'没有重新发送提示词。'};render();timer=setTimeout(()=>{retryTarget.status='idle';if(state.target===retryTarget.id)state.feedback={kind:'matched',title:'观察到空闲',body:'请读取输出确认结果。'};render();},1000);return;}
    if(a==='read-screen'){state.screen=true;renderInspector();return;}
    if(a==='stop'){openModal('停止目标运行？',`<div class="stack"><p>将停止「${esc(getTarget().name)}」的当前进程。关闭显示面板可以保留运行。</p><div class="callout">目标：${esc(state.spaces.find(s=>s.id===getTarget().space)?.name)} / ${esc(getTarget().id)}<br>会话记录与历史仍然保留。</div></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="outline danger" data-action="confirm-stop">停止运行</button>`);return;}
    if(a==='confirm-stop'){operation++;clearTimeout(timer);getTarget().status='stopped';state.feedback={kind:'stopped',title:'已核实运行结束（模拟）',body:'会话与历史保留。'};closeModal();render();return;}
    if(a==='human-approve'||a==='human-reject'){const s=getSession(id);s.status='idle';s.log.push({kind:'output',text:a==='human-approve'?'用户在原终端允许本次操作；继续当前会话。':'用户在原终端拒绝操作；原会话保留。'});render();notify(a==='human-approve'?'人工确认已提交给原终端。':'已拒绝本次操作。');return;}
    if(a==='read-message'){state.messages.find(m=>m.id===id).read=true;renderInspector();return;}if(a==='ack'){state.messages.find(m=>m.id===id).ack=true;render();return;}
    if(a==='send-message'){const body=$('#mail-body').value.trim();if(!body)return notify('请输入消息正文。');state.messages.push({id:'msg-'+Date.now(),from:getSession(state.focus)?.name||'用户',target:state.target,body,read:false,ack:false});render();notify('消息已进入目标邮箱，没有启动运行。');return;}
    if(a==='preview'){state.preview=id;renderInspector();return;}if(a==='back-history'){state.preview=null;renderInspector();return;}
    if(a==='reload-history'){state.history='loading';renderInspector();setTimeout(()=>{state.history='default';renderInspector();},900);return;}
    if(a==='clear-search'){state.query='';renderInspector();return;}
    if(a==='retry-source'){notify('来源仍不可用；已保留元数据与标注。');return;}
    if(a==='save-note'){state.notes[state.preview]=$('#annotation').value;notify('标注已保存在本页演示状态。');return;}
    if(a==='resume-history'){const r=records.find(r=>r.id===state.preview);openModal('继续原生会话',`<div class="stack"><p>继续「${r.title}」将显式启动原生 Agent；只读预览不会启动。</p><div class="callout">${r.provider} · 系统账号<br>当前 Vault / 终端重构<br>工作目录：项目 / obsidian-huhu</div><p>如果该原生会话已有受管运行，将定位已有终端。</p></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-resume-history">继续会话</button>`);return;}
    if(a==='confirm-resume-history'){const record=records.find(r=>r.id===state.preview),historySessionId='ses-'+record.id;closeModal();let s=getSession(historySessionId);if(s){showSession(s.id);notify('已定位现有受管运行，没有重复启动。');}else{s={id:historySessionId,name:'历史 · '+record.title,provider:record.provider,space:'space-terminal',status:'idle',visible:true,log:[]};state.sessions.push(s);showSession(s.id);notify('已从明确的原生来源继续（模拟）。');}return;}
    if(a==='resume-session'){getSession(id).status='idle';state.restored=false;showSession(id);notify('已显式启动新运行，没有重发历史输入。');return;}
    if(a==='reconnect'){state.scenario='default';state.sessions.forEach(s=>{if(s.status==='unknown')s.status='idle';});render();notify('已重新检查并连接（模拟）。');return;}
    if(a==='enable-agent'){state.agentEnabled=true;state.tab='terminals';render();return;}
    if(a==='settings'){openModal('终端设置与数据',`<div class="stack"><p>沿用 HUHU 现有账号、终端主题、字体与快捷键设置。本次增加控制与后台会话入口。</p><h3>数据与备份</h3><p>导出包含 HUHU 会话信息、标注、通知与来源引用。原生完整对话及系统登录凭证由各自来源管理；导出清单应说明未包含项。</p><p>已有业务数据沿用当前 Vault 的 HUHU 数据根，不为本次终端增强迁移已有账号。</p><h3>快捷键</h3><p>Ctrl / ⌘ K：命令面板<br>Alt 1：空间　Alt 2：终端焦点　Alt 3：控制<br>Escape：关闭当前弹层</p></div>`,`<button class="outline danger" data-action="disable-agent">停用智能体（演示）</button><button class="primary" data-action="close-dialog" data-dialog="modal">完成</button>`);return;}
    if(a==='disable-agent'){closeModal();scenario('disabled');return;}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='target-scope'){state.scope=e.target.value;const opts=state.sessions.filter(s=>state.scope==='vault'||s.space===state.current);if(!opts.some(s=>s.id===state.target))state.target=opts[0]?.id;state.feedback=null;renderInspector();}
    if(e.target.id==='target-session'){state.target=e.target.value;state.feedback=null;state.screen=false;renderInspector();}
    if(e.target.id==='external-allow')e.target.setCustomValidity('');
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='space-name')e.target.setCustomValidity('');
    if(e.target.id==='prompt')state.promptDraft=e.target.value;
    if(e.target.id==='history-search'){state.query=e.target.value;renderInspector();}
    if(e.target.id==='palette-search')$('#palette-results').innerHTML=paletteItems(e.target.value);
    if(e.target.id==='split-ratio'){state.ratio=Number(e.target.value);$('.terminal-grid').style.setProperty('--split',state.ratio/(100-state.ratio)+'fr');}
  });
  document.addEventListener('submit',e=>{if(!e.target.matches('.terminal-input'))return;e.preventDefault();const s=getSession(e.target.dataset.session),input=e.target.querySelector('input');if(!input.value.trim())return;s.log.push({kind:'input',text:input.value.trim()});s.log.push({kind:'output',text:'输入已提交（演示），请核对原生输出。'});state.focus=s.id;render();document.getElementById('input-'+s.id)?.focus();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Tab'){
      const modal=[...document.querySelectorAll('dialog[open]')].filter(d=>d.matches(':modal')).at(-1);
      if(modal){const controls=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(first&&(!modal.contains(document.activeElement)||(!e.shiftKey&&document.activeElement===last)||(e.shiftKey&&document.activeElement===first))){e.preventDefault();(e.shiftKey?last:first).focus();return;}}
    }

    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette();return;}
    if(e.altKey&&e.key==='1'){e.preventDefault();$('[data-action="spaces"]').click();}
    if(e.altKey&&e.key==='2'){e.preventDefault();document.getElementById('input-'+state.focus)?.focus();}
    if(e.altKey&&e.key==='3'){e.preventDefault();tool('control');$('#target-scope')?.focus();}
    if(e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const names=['control','inbox','history'],i=names.indexOf(state.tool);tool(names[(i+(e.key==='ArrowRight'?1:2))%3]);$('#tool-'+state.tool).focus();}
    if(e.key==='Escape'&&!$('#modal').open&&!$('#sheet').open&&$('#inspector').open){$('#inspector').close();$('[data-action="control"]').focus();}
  });
  ['modal','sheet'].forEach(id=>document.getElementById(id).addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}));
  matchMedia('(max-width:959px)').addEventListener('change',()=>{$('#inspector').close();});
  render();if(variant==='a'&&innerWidth>=960)$('#inspector').show();
})();
