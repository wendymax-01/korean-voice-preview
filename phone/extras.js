'use strict';

const pocket = {
  sms: [
    ['延南照相馆','今天 18:52','[연남사진관] 인화가 완료되었습니다.','冲印完成。周六 10 点后可以领取，报名字 정성찬。','5 × 7 cm · 1 张', ['打开取件备忘录','note',1]],
    ['쿠팡','今天 17:48','[쿠팡] 배송이 시작되었습니다.','姜茶和密封袋已发货，预计 11 月 25 日到。','配送短信',['查看订单','open','coupang']],
    ['望远足球场','昨天 14:20','2번 코트 예약이 확정되었습니다.','11 月 26 日 20:00，2 号场地。请提前 10 分钟到。','预约通知',['球场位置','place',3]]
  ],
  mail: [
    ['연남책방','今天 11:19','您预订的散文集已到店','成灿，你好。店里会留到周六中午。到店报姓名就可以取书。','收件箱 · 发给我',['查看书店位置','place',2]],
    ['工作室','昨天 16:08','周三评审时间调整','上午 10 点，会议室 B。讨论共享文件夹里的第二版。','收件箱 · 发给设计组',['打开工作群','chat','work']]
  ],
  safari: [
    ['延南独立书店','书签','周末营业时间','周六 11:00–20:00，取书请报预订姓名。','书店',['查看地点','place',2]],
    ['望远足球场','浏览历史','2 号场地须知','夜间需自备足球。雨天是否照常开放会在比赛日确认。','场地',['查看地点','place',3]],
    ['延南洞散步','书签','从公交站到西边巷子','走西侧出口，雨天尽量绕开积水的大路。','延南洞',['查看路线','place',1]]
  ],
  files: [
    ['伦敦冲印单.pdf','11月23日 · 纸质照片','冲印订单','威斯敏斯特照片一张，5 × 7 cm。取件时说郑成灿。','PDF',['预览原图','photo',3]],
    ['11月场地预约.txt','11月24日 · 足球','望远足球场','11 月 26 日 20:00，2 号场地。联系人 박도현。','文本',['联系道贤','chat','dohyun']]
  ],
  wallet: [
    ['Tmoney','交通卡','余额 ₩12,500','最近一笔：今天 18:21，公交车，₩1,500。','交通卡'],
    ['望远足球场','预约凭证','周四 20:00 · 2 号场','预约人 박도현。到场后告诉工作人员预约姓名。','凭证',['打开地点','place',3]]
  ],
  subway: [
    ['弘大入口','2 号线 · 京义中央线','2 号线换乘','从 3 号出口可以步行到延南洞公交站。','2 号线',['查看公交站','place',0]],
    ['望远','6 号线','望远站','从 2 号出口步行前往球场。故事地图提供步行提示。','6 号线',['查看球场','place',3]]
  ],
  papago: [
    ['호떡은 반씩 먹자.','韩语 → 简体中文','糖饼我们一人一半吧。','호떡 指韩式糖饼，반씩 指每人一半。','收藏',['查看聊天','chat','wendy']],
    ['책을 찾으러 왔어요.','韩语 → 简体中文','我是来取书的。','取预订的书时可以这样说。','收藏',['打开取书备忘录','note',1]]
  ]
};
const pocketTitles = {sms:'短信',mail:'收件箱',safari:'起始页',files:'浏览',wallet:'卡片与凭证',subway:'已存车站',papago:'翻译收藏'};
const pocketUnread = item => ['sms:0','mail:0'].includes(item) && !getSaved('pocket-read', []).includes(item);
const calculator = { value:'0', memory:null, operator:null, next:false };
let cameraMode = 'photo';
let cameraShot = false;

function pocketView() {
  const app = route.name;
  const items = pocket[app];
  const first = app === 'safari' ? '<p class="pocket-subhead">常用网站和浏览记录</p>' : '';
  const rows = items.map(([name,meta,title,,kind], i) => {
    const marker = pocketUnread(app + ':' + i) ? '<i class="pocket-unread" aria-label="未读"></i>' : '';
    return `<button class="row pocket-row" data-act="pocket-open" data-value="${i}" data-search="${escape([name,meta,title,kind].join(' '))}">
       ${marker}<span class="pocket-mark" aria-hidden="true">${kind.slice(0,4)}</span><span class="row-main"><strong>${name}</strong><small>${meta}</small><small>${title}</small></span><span class="chevron">›</span></button>`;
  }).join('');
  const search = ['sms','mail','safari','files','subway','papago'].includes(app);
  return header(apps[app]) +
    view(appTitle(pocketTitles[app]) + first + (search && app !== 'safari' ? searchBox('搜索' + pocketTitles[app]) : '')
      + `<div class="native-list pocket-list ${app === 'wallet' ? 'pass-list' : ''}">${rows}</div>` + (search ? emptySearch : '')) +
    (app === 'safari' ? '<div class="browser-bar">' + searchBox('搜索书签和历史') + '</div>' : '');
}

function pocketItemView() {
  const [name,meta,title,body,kind,link] = pocket[route.app][route.id];
  if (route.app === 'sms') return header(name,'短信') + view(
    `<div class="day">${meta}</div><article class="message in pocket-message"><div class="message-content"><div class="bubble"><strong lang="ko">${title}</strong><p>${body}</p></div></div></article>
    ${link ? button(...link,'primary') : ''}`, 'chat-log');
  if (route.app === 'papago') return header('Papago') + view(`<div class="translation-pair"><article><small>한국어 · 韩语</small><strong lang="ko">${name}</strong></article><article><small>简体中文</small><strong>${title}</strong><p>${body}</p></article></div>${link ? button(...link,'primary') : ''}`);
  return header(apps[route.app],kind) + view(`<article class="detail-card pocket-detail"><p>${meta} · ${name}</p><h2>${title}</h2><p>${body}</p>
    ${link ? button(...link,'primary') : ''}</article>`);
}

function settingsView() {
  const settings = getSaved('phone-settings', {});
  return header('设置') + view(appTitle('设置') + `<div class="native-list">${[
    ['battery','显示电池百分比', settings.battery !== false],
    ['dim','暗色桌面', Boolean(settings.dim)]
  ].map(([id,label,value]) => `<article class="control-row"><span>${label}</span><button class="switch-control" aria-label="${label}" aria-checked="${value}" role="switch" data-act="phone-setting" data-value="${id}"></button></article>`).join('')}</div>
  <div class="native-list">${button('<span class="row-main"><strong>关于这部手机</strong><small>成灿的手机 · 延南洞</small></span><span class="chevron">›</span>','phone-about','','row')}</div>`);
}

function calculatorView() {
  return header('计算器') + view(`<div class="calc"><output aria-live="polite">${calculator.value}</output>
    <div class="calc-grid">${['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(key =>
       button(key,'calc',key,key === '0' ? 'calc-zero' : '÷×−+='.includes(key) ? 'calc-op' : '')).join('')}</div></div>`);
}

function calculatorPress(key) {
  const c = calculator;
  const number = Number(c.value);
  if (key === 'AC') Object.assign(c,{value:'0',memory:null,operator:null,next:false});
  else if (key === '%') c.value = String(number / 100);
  else if (key === '±') c.value = String(-number);
  else if ('÷×−+='.includes(key)) {
    if (c.operator && !c.next && Number.isFinite(number)) {
      const m = c.memory;
      const result = { '÷':() => m / number, '×':() => m * number, '−':() => m - number, '+':() => m + number }[c.operator]();
      c.value = Number.isFinite(result) ? String(Number(result.toPrecision(11))) : '错误';
    }
    c.memory = Number(c.value);
    c.operator = key === '=' ? null : key;
    c.next = true;
  } else {
    if (c.next || c.value === '错误') c.value = '0';
    if (key === '.' && !c.value.includes('.')) c.value += '.';
    if (key !== '.' && c.value.length < 12) c.value = c.value === '0' ? key : c.value + key;
    c.next = false;
  }
  render();
}

function cameraView() {
  const id = cameraMode === 'photo' ? 2 : 6;
  return header('相机','故事取景') + view(`<div class="viewfinder ${cameraShot ? 'camera-shot' : ''}">${photo(id)}</div>`, 'camera-scroll') +
    tabs([['photo','照片'],['sports','运动']],cameraMode,'camera-mode') +
    `<div class="camera-controls">${button(photo(id),'photo',id,'camera-thumb')}${button('<span class="sr">拍摄模拟照片</span>','camera-shutter','','shutter')}<output aria-live="polite">${cameraShot ? '已预览' : ''}</output></div>`;
}

const extraRenderers = {
  ...Object.fromEntries(Object.keys(pocket).map(app => [app,pocketView])),
  'pocket-item':pocketItemView, settings:settingsView, calculator:calculatorView, camera:cameraView,
  'phone-about':() => header('关于这部手机') + view(appTitle('成灿的手机','延南洞 · 11月24日'))
};
const extraActions = {
  'pocket-open': id => {
    const item = route.name + ':' + id;
    if (pocketUnread(item)) save('pocket-read', [...getSaved('pocket-read', []), item]);
    navigate('pocket-item',{app:route.name,id:Number(id)});
  },
  'phone-setting': id => {
    const state = getSaved('phone-settings', {});
    state[id] = !(state[id] ?? (id === 'battery'));
    save('phone-settings',state);
    render();
  },
  'phone-about': () => navigate('phone-about'),
  'calc': calculatorPress,
  'camera-mode': mode => { cameraMode = mode; cameraShot = false; render(); },
  'camera-shutter': () => { cameraShot = true; render(); }
};
