'use strict';

const screen = document.querySelector('#screen');
const device = document.querySelector('#device');
const homeButton = document.querySelector('#home-button');
const apps = {
  talk:['KakaoTalk','◉','#edd56f'], photos:['相册','✿','#e6b1ab'], notes:['备忘录','≡','#e8ca91'],
  calls:['电话','☎','#8ec3a5'], calendar:['日历','24','#dfacaa'], folder:['韩国日常','▦','#a1b6bc'],
  map:['NAVER Map','⌖','#92c9ab'], baemin:['배달의민족','밥','#83c5ba'], coupang:['Coupang','C','#f1ba87'],
  lock:['锁定','◈','#b7bdcd']
};

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
const followup = '我找到了你的手机，还在延南洞公交站。';
let route = { name:'lock' };
let unlocked = false;
let pin = '';
let pinError = false;
let pinHint = false;
let dial = '';
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
const tile = (id, label = true) => {
  const [name, sign, color] = apps[id];
  return button(`<span class="icon" style="--icon:${color}" aria-hidden="true">${sign}</span>${label ? `<span>${name}</span>` : `<span class="sr">${name}</span>`}${id === 'talk' && !readChats.has('wendy') ? '<b class="badge">1</b>' : ''}`, 'open', id, 'app-tile');
};

function navigate(name, data = {}, replace = false) {
  if (name === 'lock') {
    unlocked = false;
    pin = '';
    pinHint = false;
    pinError = false;
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
      ${button('<span class="notice-icon">◉</span><span><strong>KakaoTalk · Wendy</strong><br>成灿，你手机丢了吗？</span><small>3 分钟前</small>', 'notice', 'talk', 'notice-card')}
      ${button('<span class="notice-icon mint">☎</span><span><strong>电话 · Wendy</strong><br>一通未接来电</span><small>7 分钟前</small>', 'notice', 'calls', 'notice-card')}
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
  return `<div class="home-layout">
    <div class="home-widget"><div><p>서울 · 연남동</p><strong>延南洞</strong><span>小雨 · 7°</span></div><span class="rain" aria-hidden="true">☂</span></div>
    <div class="app-grid">${['talk','photos','notes','calendar','folder','lock'].map(id => tile(id)).join('')}</div>
    <div class="dock" aria-label="常用应用">${['calls','talk','map','photos'].map(id => tile(id, false)).join('')}</div>
  </div>`;
}

function folderView() {
  return `${header('韩国日常', '出门、吃饭和买东西')}${view(`<div class="app-grid folder-grid">${['map','baemin','coupang'].map(id => tile(id)).join('')}</div>`)}`;
}

function talkView() {
  const tab = route.tab || 'chats';
  const ids = tab === 'friends' ? ['self','wendy','jiho','mom','club'] : ['wendy','jiho','mom','club','self'];
  return `${header('KakaoTalk', tab === 'friends' ? '친구 · 好友' : '채팅 · 聊天')}
    ${view(`<label class="search"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="搜索${tab === 'friends' ? '好友' : '聊天'}" aria-label="搜索${tab === 'friends' ? '好友' : '聊天'}"></label>
    <section class="rows">${ids.map(id => {
      const person = people[id];
      const latest = chats[id].at(-1);
      const lastDraft = drafts[id]?.at(-1);
      const summary = tab === 'friends' ? person.bio : lastDraft || latest[3];
      return `<button class="row" data-act="${tab === 'friends' ? 'friend' : 'chat'}" data-value="${id}" data-search="${escape(person.name + ' ' + summary)}">
        ${avatar(id)}<span class="row-main"><strong>${person.name}</strong><small>${escape(summary)}</small></span>
        ${tab === 'friends' ? '<span class="chevron">›</span>' : `<span class="row-side"><small>${lastDraft ? '刚刚' : latest[1]}</small>${id === 'wendy' && !readChats.has(id) ? '<b class="unread">1</b>' : ''}</span>`}
      </button>`;
    }).join('')}<p class="empty" id="search-empty" hidden>没有匹配结果。</p></section>`)}
    ${tabs([['friends','好友'],['chats','聊天']], tab, 'talk-tab')}`;
}

function friendView() {
  const id = route.id;
  const person = people[id];
  return `${header('好友资料')}${view(`<section class="profile">${avatar(id)}<h2>${person.name}</h2><p>${person.bio}</p>
    ${button('打开聊天', 'chat', id, 'primary')}${['wendy','jiho','mom'].includes(id) ? button('查看通话', 'call', id, 'secondary') : ''}</section>`)}`;
}

function chatView() {
  const id = route.id;
  const rows = [...chats[id], ...(drafts[id] || []).map(text => ['out','刚刚','',text])];
  const reply = id === 'wendy' && (drafts[id] || []).includes(followup);
  if (reply) rows.push(['in','刚刚','고마워. 초록색 우산 쓰고 갈게.','谢谢。我撑绿色那把伞过去，在站台见。']);
  return `${header(people[id].name, 'KakaoTalk', button('资料', 'friend', id))}
    ${view(`<div class="day">2026年11月24日 · 星期二</div>${rows.map(([side,time,ko,cn,media], i) => {
      const newSender = side === 'in' && (i === 0 || rows[i-1][0] !== 'in');
      return `<article class="message ${side} ${newSender ? 'sender' : ''}">
        ${newSender ? avatar(id) : ''}<div class="message-content">${newSender ? `<small class="sender-name">${people[id].name}</small>` : ''}
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
  const album = route.album || 'all';
  const ids = photoIds(album);
  return `${header('相册', `${ids.length} 张照片`)}
    ${tabs(Object.entries(albums).map(([id, [label]]) => [id, label]), album, 'album')}
    ${view(ids.length ? `<div class="gallery">${ids.map(id => button(photo(id, 'loading="lazy"'), 'photo', id, 'photo-tile')).join('')}</div>` : '<p class="empty">查看照片时轻点爱心，即可加入收藏。</p>')}`;
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
  return `${header('备忘录', '最近编辑')}${view(`<div class="rows">${notes.map(([title,date,body], i) =>
    button(`<span class="row-main"><strong>${title}</strong><small>${date} · ${escape((noteEdits[i] ?? body).split('\n')[0])}</small></span><span class="chevron">›</span>`, 'note', i, 'row')).join('')}</div>`)}`;
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
  const content = tab === 'dial' ?
    `<div class="dialer"><output id="dial-value" aria-label="拨号号码">${escape(dial || '—')}</output><div class="keypad">${'123456789*0#'.split('').map(n => button(n, 'dial-digit', n, 'digit')).join('')}</div>
    <div class="dial-actions">${button('模拟拨号', 'dial-call', '', 'primary')}${button('⌫<span class="sr">删除号码</span>', 'dial-digit', 'delete')}</div>
    <div class="empty" id="dial-error" role="status"></div></div>` :
    `<div class="rows">${(tab === 'contacts' ? ['wendy','jiho','mom'].map(id => [id,'',people[id].bio]) : calls.map(([id,time,kind]) => [id,time,kind])).map(([id,time,kind]) =>
      button(`${avatar(id)}<span class="row-main"><strong>${people[id].name}</strong><small class="${kind.startsWith('未接') ? 'missed' : ''}">${kind}</small></span><small>${time}</small><span class="chevron">›</span>`, 'call', id, 'row')).join('')}</div>`;
  return `${header('电话')}${view(content)}${tabs([['recent','最近通话'],['contacts','通讯录'],['dial','拨号']], tab, 'call-tab')}`;
}

function callView() {
  const id = route.id;
  const person = people[id];
  return `${header(route.dialing ? '模拟通话' : '通话详情')}${view(`<section class="profile">
    ${person ? avatar(id) : ''}<h2>${person ? person.name : escape(route.number)}</h2>
    ${route.dialing ? `<p>${id === 'wendy' ? '电话响了几声，转进语音信箱。' : '模拟通话已进入语音信箱。'}</p>
      ${id === 'wendy' ? '<blockquote>“我去站台找你了。要是你先到家，糖饼放在厨房台面上。”</blockquote>' : ''}
      ${button('结束通话', 'end-call', '', 'danger')}` :
      `<p>${person.bio}</p><ul class="details">${calls.filter(call => call[0] === id).map(([,time,kind]) => `<li>${kind} · ${time}</li>`).join('')}</ul>
      ${button('模拟回拨', 'start-call', id, 'primary')}${button('打开聊天', 'chat', id, 'secondary')}`}
    </section>`)}`;
}

function calendarView() {
  const day = route.day || 24;
  return `${header('日历', '2026年11月')}
  ${view(`<section class="calendar"><div class="month"><strong>11月</strong>${button('故事当天', 'day', 24)}</div>
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
  return `${header('NAVER Map', '저장 · 已保存地点')}${view(`<label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="搜索地点" placeholder="搜索已保存地点"></label>
    <div class="map-sketch" aria-label="延南洞故事地图"><span class="map-park">京义线林路</span><span class="map-line"></span>
      ${places.slice(0,3).map(([name], i) => button(`<span>${name}</span>`, 'place', i, 'map-point point-' + i)).join('')}</div>
    <div class="rows">${places.map(([name,ko,detail], i) =>
      `<button class="row" data-act="place" data-value="${i}" data-search="${escape(name + ' ' + ko)}"><span class="marker">⌖</span><span class="row-main"><strong>${name}</strong><small>${ko} · ${detail}</small></span><span class="chevron">›</span></button>`).join('')}<p class="empty" id="search-empty" hidden>没有匹配的地点。</p></div>`)}`;
}

function placeView() {
  const [name,ko,detail,steps,duration] = places[route.id];
  return `${header('NAVER Map', '延南洞 · 故事地图')}${view(`<article class="detail-card"><p lang="ko">${ko}</p><h2>${name}</h2><p>${detail}</p>
    ${button(route.directions ? '收起路线' : '查看步行路线', 'directions', '', 'primary')}
    ${route.directions ? `<div class="route-card"><strong>从发现手机的位置出发 · ${duration}</strong><p>${steps}</p></div>` : ''}</article>`)}`;
}

function ordersView() {
  const id = route.name;
  return `${header(apps[id][0], id === 'baemin' ? '배민 · 外卖订单' : '쿠팡 · 购物订单')}
    ${view(`<div class="rows">${orders[id].map(([title,status,price], i) => button(`<span class="row-main"><strong>${title}</strong><small>${status}</small></span><span>${price}</span><span class="chevron">›</span>`, 'order', i, 'row')).join('')}</div>`)}`;
}

function orderView() {
  const [title,status,price,items,detail] = orders[route.app][route.id];
  return `${header('订单详情', apps[route.app][0])}${view(`<article class="detail-card">
    <p>${status}</p><h2>${title}</h2><p>${items}</p><div class="route-card"><p>${detail}</p><strong>实付 ${price}</strong></div></article>`)}`;
}

const renderers = {
  lock:lockView, pin:pinView, home:homeView, folder:folderView, talk:talkView, friend:friendView, chat:chatView,
  photos:galleryView, photo:photoView, notes:notesView, note:noteView, calls:callsView, call:callView,
  calendar:calendarView, event:eventView, map:mapView, place:placeView, baemin:ordersView, coupang:ordersView, order:orderView
};

function render() {
  const version = ++renderVersion;
  device.dataset.page = route.name;
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

const actions = {
  open: value => navigate(value),
  notice: value => navigate('pin', { destination:value }),
  back, hint: () => { pinHint = !pinHint; render(); },
  digit: enterDigit,
  'talk-tab': tab => navigate('talk', { tab }, true),
  friend: id => navigate('friend', { id }),
  chat: id => { readChats.add(id); save('read', [...readChats]); navigate('chat', { id }); },
  reply: () => sendMessage(followup),
  album: album => navigate('photos', { album }, true),
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
  if (route.name === 'lock') { unlocked = false; pinHint = false; }
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
