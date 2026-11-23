'use strict';

const screen = document.querySelector('#screen');
const device = document.querySelector('#device');
const homeButton = document.querySelector('#home-button');
const statusSignals = document.querySelector('.signals');
const apps = {
  talk:'KakaoTalk', photos:'相册', notes:'备忘录', calls:'电话', calendar:'日历',
  map:'NAVER Map', baemin:'배달의민족', coupang:'Coupang', instagram:'Instagram',
  youtube:'YouTube', naver:'NAVER', toss:'Toss', melon:'Melon', taxi:'Kakao T',
  karrot:'당근', weather:'天气', clock:'时钟', reminders:'提醒事项',
  sms:'信息', safari:'Safari', mail:'邮件', files:'文件', calculator:'计算器', wallet:'钱包',
  settings:'设置', camera:'相机', subway:'카카오지하철', papago:'Papago',
  folder:'韩国日常', lock:'锁定'
};
const folders = ['map','taxi','baemin','coupang','toss','karrot'];
const desktopPages = [
  ['calendar','notes','weather','reminders','instagram','youtube','naver','folder','sms','camera','mail','safari','clock','wallet','files','settings'],
  ['taxi','baemin','coupang','toss','karrot','melon','subway','papago','calculator','map','photos','lock']
];
const friendGroups = ['朋友','家人','球友','同事','群聊','日常联系'];
const phoneContacts = Object.keys(people).filter(id => !['self','club','homegroup','work'].includes(id));

function getSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem('found-phone-v2-' + key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem('found-phone-v2-' + key, JSON.stringify(value)); }
  catch { /* State remains available for this session. */ }
}

const drafts = getSaved('messages', {});
const favorites = new Set(getSaved('favorites', [7]));
const readChats = new Set(getSaved('read', []));
const noteEdits = getSaved('notes', {});
const recordFlags = getSaved('records', {});
const followup = '我找到了你的手机，还在延南洞公交站。';
let route = { name:'lock' };
let unlocked = false;
let pin = '';
let pinError = false;
let pinHint = false;
let dial = '';
let desktopPage = 0;
let touchStart;
let renderVersion = 0;

const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);

const button = (label, action, value = '', classes = '') =>
  `<button type="button" class="${classes}" data-act="${action}" data-value="${escape(value)}">${label}</button>`;
const header = (title, subtitle = '', right = '') =>
  `<header class="app-header">${button('‹<span class="sr">返回</span>', 'back', '', 'back')}
    <div><h1>${title}</h1>${subtitle ? `<small>${subtitle}</small>` : ''}</div><div class="header-end">${right}</div></header>`;
const view = (content, classes = '') => `<div class="scroller ${classes}">${content}</div>`;
const avatar = id => {
  const { name, mark, color } = people[id];
  return id === 'self' ? `<img class="avatar" src="media/photo-8.webp" alt="">`
    : `<span class="avatar" style="--avatar:${color}" aria-hidden="true">${mark}</span><span class="sr">${name}</span>`;
};
const photo = (id, extra = '') => `<img src="media/photo-${id}.webp" alt="${photos[id-1][1]}" ${extra}>`;
const tabs = (items, active, action) => `<nav class="tabs">${items.map(([id, label]) =>
  button(label, action, id, id === active ? 'selected' : '')).join('')}</nav>`;
const searchBox = (label, placeholder = label) =>
  `<label class="search"><span class="search-icon" aria-hidden="true"></span><input id="search" type="search" aria-label="${label}" placeholder="${placeholder}"></label>`;
const emptySearch = '<p class="empty" id="search-empty" hidden>没有匹配结果。</p>';
const appTitle = (title, summary = '') =>
  `<section class="app-title"><h2>${title}</h2>${summary ? `<p>${summary}</p>` : ''}</section>`;
const iconImage = id => `<img src="icons/${id}.webp" alt="" draggable="false">`;
function appIcon(id) {
  if (id === 'folder') return `<span class="icon mini-icons" aria-hidden="true">${folders.map(iconImage).join('')}</span>`;
  if (id === 'settings') return '<span class="icon settings-icon" aria-hidden="true">⚙</span>';
  if (id === 'lock') return '<span class="icon lock-icon" aria-hidden="true">◈</span>';
  if (id === 'calendar') return '<span class="icon calendar-icon" aria-hidden="true"><small>Tue</small><strong>24</strong></span>';
  return `<span class="icon app-art" aria-hidden="true">${iconImage(id)}</span>`;
}
const tile = (id, label = true) => button(
  `${appIcon(id)}<span class="${label ? 'app-label' : 'sr'}">${apps[id]}</span>${id === 'talk' && !readChats.has('wendy') ? '<b class="badge">1</b>' : ''}`, 'open', id, 'app-tile'
);

function navigate(name, data = {}, replace = false) {
  if (name === 'lock') {
    unlocked = false;
    pin = '';
    pinHint = false;
    pinError = false;
    desktopPage = 0;
  }
  route = { name, ...data };
  history[replace ? 'replaceState' : 'pushState'](route, '');
  render();
}

function back() {
  if (route.name === 'lock') return;
  if (route.name === 'home') navigate('lock', {}, true);
  else history.back();
}

function showHome() {
  if (!unlocked) {
    if (route.name === 'lock') navigate('pin');
    else back();
    return;
  }
  if (route.name !== 'home') navigate('home', {}, true);
}

function lockView() {
  return `<div class="lock-main">
    <p class="lock-date">11月24日 · 星期二</p><h1>21:47</h1>
    <div class="lock-notifications">
      ${button('<span class="notice-icon"><img src="icons/talk.webp" alt=""></span><span><strong>KakaoTalk · Wendy</strong><br>成灿，你手机丢了吗？</span><small>3 分钟前</small>', 'notice', 'talk', 'notice-card')}
      ${button('<span class="notice-icon"><img src="icons/calls.webp" alt=""></span><span><strong>电话 · Wendy</strong><br>一通未接来电</span><small>7 分钟前</small>', 'notice', 'calls', 'notice-card')}
    </div>
  </div><div class="lock-footer">
    ${button('↑ <span>上滑或轻点解锁</span>', 'open', 'pin', 'unlock')}
    <p>虚构平行世界 · 独立同人互动故事</p>
  </div>`;
}

function pinView() {
  const captions = ['','', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
  const key = n => button(`<span>${n}</span>${captions[n] ? `<small>${captions[n]}</small>` : ''}`, 'digit', n, 'digit');
  return `<div class="pin-main">
    <p class="pin-label">锁屏密码</p><h1>输入四位数字</h1>
    <div class="dots" aria-label="已输入 ${pin.length} 位">${Array.from({ length:4 }, (_, i) => `<i class="${i < pin.length ? 'filled' : ''}"></i>`).join('')}</div>
    <p class="pin-error" role="status">${pinError ? '密码不对，再试一次。' : '&nbsp;'}</p>
    <div class="keypad">${[1,2,3,4,5,6,7,8,9].map(key).join('')}<span></span>${key(0)}${button('⌫<span class="sr">删除数字</span>', 'digit', 'delete', 'delete')}</div>
    <div class="pin-actions">${button('取消', 'back')}${button(pinHint ? '收起提示' : '查看提示', 'hint')}</div>
    <p class="pin-hint">${pinHint ? '他把今天的日期设成了密码。格式 MMDD。' : '&nbsp;'}</p>
  </div>`;
}

function homeView() {
  const widget = desktopPage === 0
    ? button('<span><small>서울 · 연남동</small><strong>延南洞</strong><span>小雨 · 7°</span></span><span class="rain" aria-hidden="true"><svg viewBox="0 0 56 56" fill="none"><path d="M14 35a9 9 0 1 1 3-17 12 12 0 0 1 23 3c9 1 10 14 0 14H14Z" fill="currentColor"/><path d="m20 41-3 6m12-6-3 6m12-6-3 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>', 'open', 'weather', 'home-widget')
    : button('<span><small>11月24日 · 星期二</small><strong>今晚 21:30</strong><span>回家吃晚饭</span></span><span class="widget-calendar" aria-hidden="true">24</span>', 'open', 'calendar', 'home-widget');
  return `<div class="home-layout">
    ${widget}
    <div class="app-grid">${desktopPages[desktopPage].map(id => tile(id)).join('')}</div>
    <nav class="page-dots" aria-label="桌面分页">${desktopPages.map((_, i) =>
      button(`<span aria-hidden="true"></span><span class="sr">第 ${i+1} 页</span>`, 'desktop-page', i, i === desktopPage ? 'current' : '')).join('')}</nav>
    <div class="dock" aria-label="常用应用">${['calls','talk','map','photos'].map(id => tile(id, false)).join('')}</div>
  </div>`;
}

function folderView() {
  return `${header('韩国日常', '出门、吃饭和买东西')}${view(`<div class="app-grid folder-grid">${folders.map(id => tile(id)).join('')}</div>`)}`;
}

function talkView() {
  const tab = route.tab || 'chats';
  const friends = tab === 'friends';
  const ids = [...new Set([...activeChats, ...Object.keys(drafts).filter(id => people[id])])];
  const makeRow = id => {
    const person = people[id];
    const latest = chats[id].at(-1);
    const lastDraft = drafts[id]?.at(-1);
    const summary = friends ? person.bio : lastDraft || latest[3];
    return `<button class="row" data-act="${friends ? 'friend' : 'chat'}" data-value="${id}" data-search="${escape(person.name + ' ' + summary + ' ' + (person.group || '本人'))}">
      ${avatar(id)}<span class="row-main"><strong>${person.name}</strong><small>${escape(summary)}</small></span>
      ${friends ? '<span class="chevron">›</span>' : `<span class="row-side"><small>${lastDraft ? '刚刚' : latest[1]}</small>${id === 'wendy' && !readChats.has(id) ? '<b class="unread">1</b>' : ''}</span>`}
    </button>`;
  };
  const rows = friends ? makeRow('self') + friendGroups.map(group => {
    const matches = Object.keys(people).filter(id => people[id].group === group);
    return `<section class="friend-group"><h2>${group} <small>${matches.length}</small></h2>${matches.map(makeRow).join('')}</section>`;
  }).join('') : ids.map(makeRow).join('');
  return `${header('KakaoTalk')}
    ${view(`${appTitle(friends ? '好友' : '聊天')}${searchBox(friends ? '搜索好友' : '搜索聊天')}
    <div class="rows">${rows}<p class="empty" id="search-empty" hidden>没有匹配结果。</p></div>`)}
    ${tabs([['friends','好友'],['chats','聊天']], tab, 'talk-tab')}`;
}

function friendView() {
  const id = route.id;
  const person = people[id];
  return `${header('好友资料')}${view(`<section class="profile">${avatar(id)}<h2>${person.name}</h2><p>${person.bio}</p>
    ${button('打开聊天', 'chat', id, 'primary')}${phoneContacts.includes(id) ? button('查看通话', 'call', id, 'secondary') : ''}</section>`)}`;
}

function chatView() {
  const id = route.id;
  const rows = [...chats[id], ...(drafts[id] || []).map(text => ['out','刚刚','',text])];
  const reply = id === 'wendy' && (drafts[id] || []).includes(followup);
  if (reply) rows.push(['in','刚刚','고마워. 초록색 우산 쓰고 갈게.','谢谢。我撑绿色那把伞过去，在站台见。']);
  return `${header(people[id].name, 'KakaoTalk', button('资料', 'friend', id))}
    ${view(`<div class="day">2026年11月24日 · 星期二</div>${rows.map(([side,time,ko,cn,media,sender], i) => {
      const newSender = side === 'in' && (i === 0 || rows[i-1][0] !== 'in');
      return `<article class="message ${side} ${newSender ? 'sender' : ''}">
        ${newSender ? avatar(id) : ''}<div class="message-content">${newSender ? `<small class="sender-name">${sender || people[id].name}</small>` : ''}
        <div class="bubble">
        ${media === 'rain' ? '<div class="audio"><small>韩语留言 · 合成语音</small><audio controls preload="metadata" src="media/rain.mp3" aria-label="播放韩语留言"></audio></div>'
          : typeof media === 'number' ? button(photo(media, 'loading="lazy"'), 'photo', media, 'chat-photo') : ''}
        ${ko ? `<span lang="ko">${ko}</span>` : ''}<span class="${ko ? 'translation' : ''}">${escape(cn)}</span>
        </div></div><time>${time}</time></article>`;
    }).join('')}${id === 'wendy' && !reply ? button('回复：' + followup, 'reply', '', 'quick') : ''}`, 'chat-log')}
    <form id="composer" class="composer"><input name="message" maxlength="180" placeholder="输入消息" aria-label="输入消息" autocomplete="off"><button type="submit">发送</button></form>`;
}

function photoIds(album) {
  return album === 'favorite' ? albums.all[1].filter(id => favorites.has(id)) : albums[album][1];
}

function galleryView() {
  const tab = route.tab || 'library';
  const album = route.album || 'all';
  const ids = photoIds(album);
  const gallery = photoList => `<div class="gallery">${photoList.map(id =>
    `<button class="photo-tile" data-act="photo" data-value="${id}" data-search="${escape(photos[id-1].join(' '))}">${photo(id, 'loading="lazy"')}</button>`).join('')}</div>`;
  let content;
  if (tab === 'collections' && !route.album) {
    content = appTitle('精选相集') + `<div class="album-covers">${Object.entries(albums).filter(([id]) => id !== 'all').map(([id,[label]]) => {
      const list = photoIds(id);
      return button(`<span class="album-cover">${list.length ? photo(list[0]) : '<span>♡</span>'}</span><strong>${label}</strong><small>${list.length} 张</small>`, 'album', id, 'album-card');
    }).join('')}</div>`;
  } else {
    content = (tab === 'search' ? searchBox('搜索照片', '试试「伦敦」或「球场」') : appTitle(albums[album][0], `${ids.length} 张照片`))
      + (ids.length ? gallery(ids) : '<p class="empty">查看照片时轻点爱心，即可加入收藏。</p>')
      + (tab === 'search' ? emptySearch : '');
  }
  return header('相册') + view(content) + tabs([['library','图库'],['collections','相集'],['search','搜索']], tab, 'photo-tab');
}

function photoView() {
  const { id, album = 'all' } = route;
  const [date, caption, detail] = photos[id-1];
  const sequence = photoIds(album);
  const index = sequence.indexOf(id);
  return `${header('照片', date, button(`${favorites.has(id) ? '♥' : '♡'}<span class="sr">${favorites.has(id) ? '取消收藏' : '添加收藏'}</span>`, 'favorite', id, 'like'))}
    ${view(`<figure class="photo-detail">${photo(id)}<figcaption><strong>${caption}</strong><p>${detail}</p></figcaption></figure>`, 'photo-scroll')}
    <nav class="photo-nav">${index > 0 ? button('‹ 上一张', 'photo-step', sequence[index-1]) : '<span></span>'}
      <small>${index >= 0 ? `${index+1} / ${sequence.length}` : ''}</small>
      ${index >= 0 && index < sequence.length-1 ? button('下一张 ›', 'photo-step', sequence[index+1]) : '<span></span>'}</nav>`;
}

function notesView() {
  if (route.folders) return header('备忘录') + view(appTitle('文件夹') +
    `<div class="native-list">${button(`<span class="folder-mark" aria-hidden="true"></span><span class="row-main"><strong>备忘录</strong></span><small>${notes.length}</small><span class="chevron">›</span>`, 'notes-list', '', 'row')}</div>`);
  const rows = notes.map(([title,date,body], i) => {
    const text = noteEdits[i] ?? body;
    return `<button class="row" data-act="note" data-value="${i}" data-search="${escape(title + ' ' + text)}"><span class="row-main"><strong>${title}</strong><small>${date} · ${escape(text.split('\n')[0])}</small></span></button>`;
  }).join('');
  return header('备忘录', '', button('文件夹', 'note-folders')) +
    view(appTitle('备忘录', `${notes.length} 条`) + searchBox('搜索备忘录') + `<div class="native-list">${rows}</div>` + emptySearch);
}

function noteView() {
  const id = route.id;
  const [title,date,body] = notes[id];
  return `${header('备忘录', date, button(route.edit ? '保存' : '编辑', route.edit ? 'save-note' : 'edit-note'))}
    ${view(`<article class="note-paper"><h2>${title}</h2>${route.edit ?
      `<textarea id="note-text" aria-label="备忘录正文" maxlength="4000">${escape(noteEdits[id] ?? body)}</textarea>` :
      `<p>${escape(noteEdits[id] ?? body)}</p>`}</article>`)}`;
}

function callsView() {
  const tab = route.tab || 'recent';
  const missed = route.filter === 'missed';
  let content;
  if (tab === 'dial') {
    const letters = ['','', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
    content = `<div class="dialer"><output id="dial-value" aria-label="拨号号码">${escape(dial || '—')}</output><div class="keypad">${'123456789*0#'.split('').map(n =>
      button(`<span>${n}</span>${letters[n] ? `<small>${letters[n]}</small>` : ''}`, 'dial-digit', n, 'digit')).join('')}</div>
    <div class="dial-actions">${button('模拟拨号', 'dial-call', '', 'primary')}${button('⌫<span class="sr">删除号码</span>', 'dial-digit', 'delete')}</div>
    <div class="empty" id="dial-error" role="status"></div></div>`;
  } else if (tab === 'contacts') {
    content = appTitle('通讯录') + searchBox('搜索联系人') + `<div class="native-list">${phoneContacts.map(id =>
      `<button class="row" data-act="call" data-value="${id}" data-search="${escape(people[id].name + ' ' + people[id].bio)}">${avatar(id)}<span class="row-main"><strong>${people[id].name}</strong></span><span class="chevron">›</span></button>`).join('')}</div>` + emptySearch;
  } else {
    const rows = calls.filter(([, ,kind]) => !missed || kind.startsWith('未接'));
    content = appTitle('通话') + `<section class="native-section"><h3>个人收藏</h3><div class="speed-dial">${['wendy','mom','jiho'].map(id =>
      button(`${avatar(id)}<span>${people[id].name}</span>`, 'call', id)).join('')}</div></section>
      <section class="native-section"><div class="section-heading"><h3>最近通话</h3>${button(missed ? '显示全部' : '仅未接', 'call-filter', '', 'pill')}</div>
      <div class="native-list">${rows.map(([id,time,kind]) => button(`${avatar(id)}<span class="row-main"><strong class="${kind.startsWith('未接') ? 'missed' : ''}">${people[id].name}</strong><small>${kind}</small></span><small>${time}</small><span class="chevron">›</span>`, 'call', id, 'row')).join('')}</div></section>
      <section class="native-section"><h3>语音信箱</h3><div class="native-list">${button(`${avatar('wendy')}<span class="row-main"><strong>Wendy</strong><small>21:40 · 查看留言</small></span><span class="chevron">›</span>`, 'start-call', 'wendy', 'row')}</div></section>`;
  }
  return header('电话') + view(content) + tabs([['recent','通话'],['contacts','联系人'],['dial','拨号键盘']], tab, 'call-tab');
}

function callView() {
  const id = route.id;
  const person = people[id];
  return `${header(route.dialing ? '模拟通话' : '通话详情')}${view(`<section class="profile">
    ${person ? avatar(id) : ''}<h2>${person ? person.name : escape(route.number)}</h2>
    ${route.dialing ? `<p>${id === 'wendy' ? '电话响了几声，转进语音信箱。' : '模拟通话已进入语音信箱。'}</p>
      ${id === 'wendy' ? '<blockquote>“我去站台找你了。要是你先到家，糖饼放在厨房台面上。”</blockquote>' : ''}
      ${button('结束通话', 'end-call', '', 'danger')}` :
      `<p>${person.bio}</p><ul class="details">${calls.filter(call => call[0] === id).map(([,time,kind]) => `<li>${kind} · ${time}</li>`).join('') || '<li>暂无通话记录</li>'}</ul>
      ${button('模拟回拨', 'start-call', id, 'primary')}${button('打开聊天', 'chat', id, 'secondary')}`}
    </section>`)}`;
}

function calendarView() {
  const day = route.day || 24;
  return `${header('日历', '', button('今天', 'day', 24, 'pill'))}
  ${view(`<section class="calendar"><div class="month"><strong>11月</strong><small>2026年</small></div>
    <div class="calendar-grid">${'一二三四五六日'.split('').map(d => `<span class="week">${d}</span>`).join('')}
      ${'<span></span>'.repeat(6)}${Array.from({ length:30 }, (_, i) => i+1).map(d =>
        `<button data-act="day" data-value="${d}" aria-label="11月${d}日${events[d] ? '，有日程' : ''}" aria-pressed="${d === day}">${d}${events[d] ? '<i></i>' : ''}</button>`).join('')}</div>
    <h2>11月${day}日</h2>${(events[day] || []).map(([time,title,detail], i) => button(`<time>${time}</time><span><strong>${title}</strong><small>${detail}</small></span><span class="chevron">›</span>`, 'event', i, 'row agenda')).join('') || '<p class="empty">当天没有安排。</p>'}</section>`)}`;
}

function eventView() {
  const [time,title,detail] = events[route.day][route.id];
  const place = { 26:3, 28:2 }[route.day];
  return `${header('日程详情')}${view(`<article class="detail-card"><p>11月${route.day}日 · ${time}</p><h2>${title}</h2><p>${detail}</p>
    ${place !== undefined ? button('查看地点', 'place', place, 'primary') : ''}</article>`)}`;
}

function mapView() {
  return `${header('NAVER Map', '저장 · 已保存地点')}${view(`${searchBox('搜索地点', '搜索地点或地址')}
    <div class="map-sketch" aria-label="延南洞故事地图"><span class="map-park">京义线林路</span><span class="map-line"></span>
      ${places.slice(0,3).map(([name], i) => button(`<span>${name}</span>`, 'place', i, 'map-point point-' + i)).join('')}</div>
    <div class="map-saved">${appTitle('已保存地点', '延南洞与望远洞')}<div class="rows">${places.map(([name,ko,detail], i) =>
      `<button class="row" data-act="place" data-value="${i}" data-search="${escape(name + ' ' + ko)}"><span class="marker">⌖</span><span class="row-main"><strong>${name}</strong><small>${ko} · ${detail}</small></span><span class="chevron">›</span></button>`).join('')}<p class="empty" id="search-empty" hidden>没有匹配的地点。</p></div></div>`)}`;
}

function placeView() {
  const [name,ko,detail,steps,duration] = places[route.id];
  return `${header('NAVER Map', '延南洞 · 故事地图')}${view(`<article class="detail-card"><p lang="ko">${ko}</p><h2>${name}</h2><p>${detail}</p>
    ${button(route.directions ? '收起路线' : '查看步行路线', 'directions', '', 'primary')}
    ${route.directions ? `<div class="route-card"><strong>从发现手机的位置出发 · ${duration}</strong><p>${steps}</p></div>` : ''}</article>`)}`;
}

function ordersView() {
  const id = route.name;
  const delivery = id === 'baemin';
  const filter = route.tab || 'all';
  const list = orders[id].map(([title,status,price,items], i) => {
    const complete = status.includes('已送达');
    if (filter === 'active' && !complete || filter === 'all') {
      return button(`<span class="order-state">${status.split(' · ').at(-1)}</span><small>${status.split(' · ')[0]}</small><strong>${title}</strong><span>${items}</span><b>${price}</b><span class="order-link">查看订单 ›</span>`, 'order', i, 'order-ticket');
    }
    return '';
  }).join('');
  return header(apps[id]) + view(appTitle(delivery ? '外卖订单' : '我的订单') +
    `<div class="order-stack">${list || '<p class="empty">当前没有配送中的订单。</p>'}</div>`) +
    tabs([['all','全部订单'],['active','配送中']], filter, 'order-filter');
}

function orderView() {
  const [title,status,price,items,detail] = orders[route.app][route.id];
  return `${header('订单详情', apps[route.app])}${view(`<article class="detail-card">
    <p>${status}</p><h2>${title}</h2><p>${items}</p><div class="route-card"><p>${detail}</p><strong>实付 ${price}</strong></div></article>`)}`;
}

const related = {
  naver: { 2:['查看书店位置','place',2] },
  toss: { 0:['查看外卖订单','everyday-link','baemin'], 1:['联系道贤','chat','dohyun'] },
  taxi: { 0:['查看下车地点','place',0], 2:['在地图中查看','place',0] },
  karrot: { 0:['查看周六安排','everyday-link','calendar'] },
  youtube: { 0:['打开玄关备忘录','note',0] },
  reminders: { 2:['查看姜茶订单','everyday-link','coupang'] }
};
function flagFor(app, id) {
  return recordFlags[app]?.[id] ?? (app === 'reminders' && everyday[app].records[id][4]);
}
function everydayView() {
  const app = route.name;
  const { title, tabs:labels, records } = everyday[app];
  const tab = route.tab || 0;
  const rows = records.map(([name,meta,detail,imageId,secondary], i) => {
    const belongs = app === 'reminders' ? flagFor(app,i) : secondary;
    if (tab === 1 ? !belongs : (['weather','clock','reminders','youtube','naver','taxi','karrot'].includes(app) && belongs)) return '';
    if (app === 'instagram') return `<article class="social-post">${button(`<span class="social-byline"><strong>${name}</strong><small>${meta}</small></span>${imageId ? photo(imageId, 'loading="lazy"') : ''}<span class="social-caption">${detail}</span>`, 'record', i)}</article>`;
    if (app === 'clock' && i < 2 || app === 'reminders') {
      const clock = app === 'clock';
      const checked = clock ? !flagFor(app,i) : Boolean(belongs);
      return `<article class="control-row ${clock ? 'alarm-row' : ''}">${button(`<strong>${name}</strong><small>${meta}</small>`, 'record', i, 'control-text')}
       <button class="${clock ? 'switch-control' : 'check-control'}" type="button" role="${clock ? 'switch' : 'checkbox'}" aria-checked="${checked}" aria-label="${escape(name)}" data-act="list-toggle" data-value="${i}"></button></article>`;
    }
    const tag = { youtube:'观看记录', naver:'搜索', toss:'₩', melon:'♫', taxi:'行程', karrot:'交易' }[app];
    return button(`${tag ? `<span class="record-mark" aria-hidden="true">${tag}</span>` : ''}<span class="row-main"><strong>${name}</strong><small>${meta}</small></span><span class="chevron">›</span>`, 'record', i, 'row');
  }).join('');
  const weather = app === 'weather' && tab === 0 ? '<div class="forecast-hero"><p>서울 · 연남동</p><strong>7°</strong><p>小雨 · 体感 5°</p></div>' : '';
  return header(apps[app]) + view(appTitle(title) + weather +
    `<div class="${app === 'instagram' ? 'social-feed' : 'native-list'}">${rows || '<p class="empty">这里暂时没有记录。</p>'}</div>`) +
    tabs(labels.map((label,i) => [i,label]), tab, 'everyday-tab');
}
function recordView() {
  const { app, id } = route;
  const [name,meta,detail,imageId] = everyday[app].records[id];
  const link = related[app]?.[id];
  const toggle = app === 'reminders' ? (flagFor(app,id) ? '标为未完成' : '标为完成') :
    app === 'clock' && id < 2 ? (flagFor(app,id) ? '开启闹钟' : '停用闹钟') : '';
  return `${header(apps[app], everyday[app].title)}${view(`<article class="detail-card">
    <p>${meta}</p><h2>${name}</h2><p class="record-detail">${detail}</p>
    ${app === 'instagram' && imageId ? button(photo(imageId), 'photo', imageId, 'record-photo') : ''}
    ${link ? button(...link, 'primary') : ''}${toggle ? button(toggle, 'record-toggle', '', 'primary') : ''}
  </article>`)}`;
}

const renderers = {
  ...extraRenderers,
  lock:lockView, pin:pinView, home:homeView, folder:folderView, talk:talkView, friend:friendView, chat:chatView,
  photos:galleryView, photo:photoView, notes:notesView, note:noteView, calls:callsView, call:callView,
  calendar:calendarView, event:eventView, map:mapView, place:placeView, baemin:ordersView, coupang:ordersView, order:orderView, record:recordView,
  ...Object.fromEntries(Object.keys(everyday).map(app => [app, everydayView]))
};

function render() {
  const version = ++renderVersion;
  device.dataset.page = route.name;
  const phoneSettings = getSaved('phone-settings', {});
  device.classList.toggle('dim-wall', Boolean(phoneSettings.dim));
  device.classList.toggle('hide-battery-number', phoneSettings.battery === false);
  statusSignals.setAttribute('aria-label', phoneSettings.battery === false ? '蜂窝信号 3 格，5G' : '蜂窝信号 3 格，5G，电量 78%');
  device.classList.toggle('wall', ['lock','pin','home','folder'].includes(route.name));
  screen.innerHTML = renderers[route.name]();
  if (route.name === 'chat') requestAnimationFrame(() => {
    if (renderVersion !== version) return;
    const log = screen.querySelector('.chat-log');
    log.scrollTop = log.scrollHeight;
  });
}

function enterDigit(value) {
  pinError = false;
  pin = value === 'delete' ? pin.slice(0,-1) : pin + value;
  if (pin.length < 4) { render(); return; }
  if (pin === '1124') {
    unlocked = true;
    pin = '';
    const destination = route.destination;
    navigate('home', {}, true);
    if (destination) navigate(destination);
  } else {
    pin = '';
    pinError = true;
    render();
  }
}

function sendMessage(text) {
  const id = route.id;
  const value = text.trim();
  if (!value) return;
  (drafts[id] ??= []).push(value);
  save('messages', drafts);
  render();
}

function toggleRecord(app, id) {
  (recordFlags[app] ??= {})[id] = !flagFor(app,id);
  save('records', recordFlags);
  render();
}

const actions = {
  ...extraActions,
  open: value => navigate(value),
  'desktop-page': page => { desktopPage = Number(page); render(); },
  'everyday-tab': tab => navigate(route.name, { tab:Number(tab) }, true),
  'everyday-link': app => navigate(app),
  record: id => navigate('record', { app:route.name, id:Number(id) }),
  'record-toggle': () => toggleRecord(route.app, route.id),
  'list-toggle': id => toggleRecord(route.name, Number(id)),
  'order-filter': tab => navigate(route.name, { tab }, true),
  notice: value => navigate('pin', { destination:value }),
  back, hint: () => { pinHint = !pinHint; render(); },
  digit: enterDigit,
  'talk-tab': tab => navigate('talk', { tab }, true),
  friend: id => navigate('friend', { id }),
  chat: id => { readChats.add(id); save('read', [...readChats]); navigate('chat', { id }); },
  reply: () => sendMessage(followup),
  'photo-tab': tab => navigate('photos', { tab }, true),
  album: album => navigate('photos', { tab:'collections', album }),
  'note-folders': () => navigate('notes', { folders:true }),
  'notes-list': back,
  'call-filter': () => navigate('calls', { filter:route.filter === 'missed' ? '' : 'missed' }, true),
  photo: id => navigate('photo', { id:Number(id), album:route.album || 'all' }),
  'photo-step': id => navigate('photo', { ...route, id:Number(id) }, true),
  favorite: value => {
    const id = Number(value);
    if (!favorites.delete(id)) favorites.add(id);
    save('favorites', [...favorites]);
    render();
  },
  note: id => navigate('note', { id:Number(id) }),
  'edit-note': () => { navigate('note', { ...route, edit:true }, true); screen.querySelector('textarea').focus(); },
  'save-note': () => {
    noteEdits[route.id] = screen.querySelector('#note-text').value;
    save('notes', noteEdits);
    navigate('note', { ...route, edit:false }, true);
  },
  'call-tab': tab => navigate('calls', { tab }, true),
  'dial-digit': value => {
    dial = value === 'delete' ? dial.slice(0,-1) : (dial + value).slice(0,18);
    screen.querySelector('#dial-value').textContent = dial || '—';
    screen.querySelector('#dial-error').textContent = '';
  },
  'dial-call': () => {
    if (dial) navigate('call', { number:dial, dialing:true });
    else screen.querySelector('#dial-error').textContent = '请先输入号码。';
  },
  call: id => navigate('call', { id }),
  'start-call': id => navigate('call', { id, dialing:true }),
  'end-call': back,
  day: day => navigate('calendar', { day:Number(day) }, true),
  event: id => navigate('event', { day:route.day || 24, id:Number(id) }),
  place: id => navigate('place', { id:Number(id) }),
  directions: () => navigate('place', { ...route, directions:!route.directions }, true),
  order: id => navigate('order', { app:route.name, id:Number(id) })
};

screen.addEventListener('click', event => {
  const control = event.target.closest('button[data-act]');
  if (control) actions[control.dataset.act](control.dataset.value);
});
screen.addEventListener('submit', event => {
  if (event.target.id !== 'composer') return;
  event.preventDefault();
  sendMessage(new FormData(event.target).get('message'));
});
screen.addEventListener('input', event => {
  if (event.target.id !== 'search') return;
  const query = event.target.value.trim().toLocaleLowerCase();
  let match = false;
  screen.querySelectorAll('[data-search]').forEach(row => {
    row.hidden = !row.dataset.search.toLocaleLowerCase().includes(query);
    match ||= !row.hidden;
  });
  screen.querySelectorAll('.friend-group').forEach(group => {
    group.hidden = !group.querySelector('.row:not([hidden])');
  });
  screen.querySelector('#search-empty').hidden = match;
});
screen.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  touchStart = { x:touch.clientX, y:touch.clientY, page:route.name };
}, { passive:true });
screen.addEventListener('touchend', event => {
  if (!touchStart || touchStart.page !== route.name) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (route.name === 'lock' && dy < -45 && Math.abs(dy) > Math.abs(dx)) navigate('pin');
  if (route.name === 'home' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    const next = Math.max(0, Math.min(desktopPages.length - 1, desktopPage + (dx < 0 ? 1 : -1)));
    if (next !== desktopPage) actions['desktop-page'](next);
  }
  if (route.name === 'photo' && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
    const control = screen.querySelectorAll('[data-act="photo-step"]');
    [...control].find(b => dx < 0 ? b.textContent.includes('下一张') : b.textContent.includes('上一张'))?.click();
  }
  touchStart = null;
}, { passive:true });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { back(); return; }
  if (route.name !== 'pin') return;
  if (/^\d$/.test(event.key)) enterDigit(event.key);
  if (event.key === 'Backspace') { event.preventDefault(); enterDigit('delete'); }
});
homeButton.addEventListener('click', showHome);
window.addEventListener('popstate', event => {
  route = event.state || { name:'lock' };
  if (!unlocked && !['lock','pin'].includes(route.name)) route = { name:'lock' };
  pin = '';
  pinError = false;
  if (route.name === 'lock') { unlocked = false; pinHint = false; desktopPage = 0; }
  render();
});
const viewport = window.visualViewport;
if (viewport) viewport.addEventListener('resize', () => {
  const editing = document.activeElement?.matches('input, textarea');
  const keyboardOpen = editing && viewport.scale === 1 && window.innerHeight - viewport.height > 100;
  if (keyboardOpen) {
    device.style.setProperty('--keyboard-height', viewport.height + 'px');
    const log = screen.querySelector('.chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  } else device.style.removeProperty('--keyboard-height');
});
history.replaceState(route, '');
render();
