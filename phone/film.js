'use strict';

const film = document.querySelector('#film');
const messages = document.querySelector('#messages');
const search = document.querySelector('#search');
const searchToggle = document.querySelector('#search-toggle');
const announcement = document.querySelector('#announcement');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let audioContext;
let endingBuffer;
let activeVoice = null;
let sceneTimer;

const conversation = [
  '2026년 11월 23일 월요일',
  ['X', '내일 몇 시에 끝나?', '22:06'],
  ['me', '일곱 시쯤? 정류장 앞에서 보자', '22:09'],
  ['X', '응. 오늘 입었던 코트 있잖아', '22:12'],
  ['me', '회색 코트? 왜?', '22:13'],
  ['X', '그냥. 다음에 또 입고 와 ㅋㅋ', '22:14'],
  '2026년 11월 24일 화요일',
  ['X', '오늘 늦게 끝나?', '17:31'],
  ['me', '조금만 더 하면 끝나', '17:34'],
  ['X', { file: 'voice-one', line: '오늘 늦게 끝나? 나 지금 정류장 건너편이야. 천천히 와.' }, '17:35'],
  ['me', '왜 ㅋㅋ 뭐 해?', '17:39'],
  ['X', { file: 'voice-two', line: '아, 아까 네가 좋아한다고 한 빵. 생각나서 하나 사 왔어.' }, '17:40'],
  ['me', '진짜? 고마워. 나 거의 다 왔어', '17:46'],
  ['X', { file: 'voice-three', line: '나 잠깐 편의점 다녀올게. 도착하면 여기서 기다려 줘.' }, '17:47'],
  ['me', '응, 도착하면 연락할게', '17:48'],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function formatTime(seconds) {
  const total = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function voiceMessage({ file, line }) {
  const audio = new Audio('media/' + file + '.mp3');
  audio.preload = 'metadata';
  const button = element('button', 'voice');
  button.type = 'button';
  const play = element('span', 'play', '▶');
  const wave = element('span', 'wave');
  wave.setAttribute('aria-hidden', 'true');
  const bars = [38, 46, 70, 43, 87, 100, 66, 54, 77, 91, 69, 42, 62, 80, 49, 40, 59, 47, 29].map(height => {
    const bar = document.createElement('i');
    bar.style.setProperty('--height', height + '%');
    wave.append(bar);
    return bar;
  });
  const time = element('time', '', '–:––');
  const voice = { audio, button };
  button.append(play, wave, time);

  function update() {
    play.textContent = audio.paused ? '▶' : 'Ⅱ';
    button.setAttribute('aria-label', (audio.paused ? '음성 재생: ' : '일시 정지: ') + line);
    time.textContent = Number.isFinite(audio.duration) ? formatTime(audio.paused && !audio.currentTime ? audio.duration : audio.currentTime) : '–:––';
    const progress = audio.currentTime / audio.duration;
    bars.forEach((bar, index) => bar.classList.toggle('elapsed', (index + 1) / bars.length <= progress));
  }
  for (const event of ['loadedmetadata', 'play', 'pause', 'timeupdate']) audio.addEventListener(event, update);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    if (activeVoice === voice) activeVoice = null;
    update();
  });
  button.addEventListener('click', () => {
    if (film.dataset.scene !== 'chat') return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (activeVoice && activeVoice !== voice) activeVoice.audio.pause();
    activeVoice = voice;
    audio.play().catch(() => { announcement.textContent = '语音暂时无法播放，请再点一次。'; });
  });
  update();
  return button;
}

for (const entry of conversation) {
  if (typeof entry === 'string') {
    messages.append(element('div', 'date', entry));
    continue;
  }
  const [speaker, body, time] = entry;
  const mine = speaker === 'me';
  const row = element('div', mine ? 'row mine' : 'row');
  const content = element('div', 'content');
  if (!mine) {
    const avatar = element('span', 'avatar', 'X');
    avatar.setAttribute('aria-hidden', 'true');
    row.append(avatar);
    content.append(element('div', 'name', 'X'));
  }
  const bubble = element('div', 'bubble');
  if (typeof body === 'string') bubble.textContent = body;
  else bubble.append(voiceMessage(body));
  row.dataset.search = typeof body === 'string' ? body : body.line;
  content.append(bubble);
  row.append(content, element('time', '', time));
  messages.append(row);
}

const pickup = document.querySelector('#pickup');
const continueStory = document.querySelector('#continue-story');
const endingCopy = document.querySelector('.ending-copy');
const ending = document.querySelector('.ending');
const turn = document.querySelector('#turn');
const restart = document.querySelector('#restart');

function setScene(scene) {
  clearTimeout(sceneTimer);
  film.dataset.scene = scene;
  pickup.hidden = scene !== 'opening';
  continueStory.hidden = scene !== 'chat';
  endingCopy.hidden = !['heard', 'turning', 'ending'].includes(scene);
  ending.hidden = !['turning', 'ending'].includes(scene);
  turn.hidden = scene !== 'heard';
  restart.hidden = scene !== 'ending';
  searchToggle.disabled = scene !== 'chat';
  messages.tabIndex = scene === 'chat' ? 0 : -1;
  for (const button of messages.querySelectorAll('button')) button.disabled = scene !== 'chat';
}

function scrollLatest() {
  messages.scrollTop = messages.scrollHeight;
}

function closeSearch() {
  search.reset();
  search.hidden = true;
  searchToggle.setAttribute('aria-expanded', 'false');
  search.querySelector('output').textContent = '';
  messages.querySelectorAll('.match').forEach(row => row.classList.remove('match'));
}

searchToggle.addEventListener('click', () => {
  if (!search.hidden) {
    closeSearch();
    return;
  }
  search.hidden = false;
  searchToggle.setAttribute('aria-expanded', 'true');
  search.querySelector('input').focus();
});
search.addEventListener('submit', event => {
  event.preventDefault();
  const query = search.querySelector('input').value.trim().toLowerCase();
  const matches = Array.from(messages.querySelectorAll('.row')).filter(row => {
    const match = query && row.dataset.search.toLowerCase().includes(query);
    row.classList.toggle('match', Boolean(match));
    return match;
  });
  search.querySelector('output').textContent = query ? matches.length + '건' : '';
  matches.at(-1)?.scrollIntoView({ block: 'center' });
});

const prop = document.querySelector('.prop');
const reachArt = document.querySelector('.reach-art');

function openChat() {
  setScene('chat');
  scrollLatest();
  messages.focus({ preventScroll: true });
}

function liftPhone() {
  setScene('lifting');
  sceneTimer = setTimeout(openChat, 1350);
}

reachArt.addEventListener('animationend', event => {
  if (event.animationName === 'reach' && film.dataset.scene === 'reaching') liftPhone();
});
prop.addEventListener('animationend', event => {
  if (event.target === prop && event.animationName === 'raise-phone' && film.dataset.scene === 'lifting') openChat();
});
pickup.addEventListener('click', () => {
  // Unlock the delayed story cue during the pickup gesture on mobile browsers.
  if (window.AudioContext) {
    audioContext ||= new AudioContext();
    audioContext.resume().catch(() => {});
    endingBuffer ||= fetch('media/voice-ending.mp3')
      .then(response => response.arrayBuffer())
      .then(bytes => audioContext.decodeAudioData(bytes))
      .catch(() => null);
  }
  if (reducedMotion.matches) {
    openChat();
    return;
  }
  setScene('reaching');
  sceneTimer = setTimeout(liftPhone, 700);
});

let outsideTap = null;
let previousScroll = 0;
let lastFlip = -Infinity;
const effects = new Map();

function playEffect(kind) {
  if (audioContext?.state !== 'running') return;
  let buffer = effects.get(kind);
  if (!buffer) {
    const flip = kind === 'flip';
    buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * (flip ? .095 : .045)), audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    let softNoise = 0;
    for (let index = 0; index < samples.length; index++) {
      softNoise = softNoise * .64 + (Math.random() * 2 - 1) * .36;
      const phase = index / samples.length;
      const tone = Math.sin(2 * Math.PI * 330 * index / audioContext.sampleRate);
      samples[index] = (flip ? softNoise * .14 : (tone * .13 + softNoise * .15)) * Math.sin(Math.PI * Math.sqrt(phase)) ** 2;
    }
    effects.set(kind, buffer);
  }
  const sound = audioContext.createBufferSource();
  sound.buffer = buffer;
  sound.connect(audioContext.destination);
  sound.start();
}

film.addEventListener('click', event => {
  if (event.target !== pickup && !event.target.closest('button')) return;
  if (audioContext?.state === 'suspended') {
    audioContext.resume().then(() => playEffect('tap')).catch(() => {});
  } else {
    playEffect('tap');
  }
});

messages.addEventListener('scroll', () => {
  const top = messages.scrollTop;
  const now = performance.now();
  if (film.dataset.scene === 'chat' && top < previousScroll - 1 && now - lastFlip >= 340) {
    playEffect('flip');
    lastFlip = now;
  }
  previousScroll = top;
}, { passive: true });

continueStory.addEventListener('click', event => {
  if (film.dataset.scene !== 'chat') return;
  const now = performance.now();
  const doubleTap = outsideTap !== null && now - outsideTap <= 450;
  outsideTap = doubleTap ? null : now;
  if (doubleTap || event.detail === 0) hearVoice();
});
prop.addEventListener('pointerdown', () => { outsideTap = null; });

async function hearVoice() {
  activeVoice?.audio.pause();
  closeSearch();
  setScene('heard');
  turn.focus({ preventScroll: true });
  const buffer = await endingBuffer;
  if (!buffer || !['heard', 'turning'].includes(film.dataset.scene)) return;
  const cue = audioContext.createBufferSource();
  cue.buffer = buffer;
  cue.connect(audioContext.destination);
  cue.start();
}

turn.addEventListener('click', () => {
  setScene('turning');
  sceneTimer = setTimeout(() => {
    setScene('ending');
    restart.focus({ preventScroll: true });
  }, reducedMotion.matches ? 550 : 2450);
});

restart.addEventListener('click', () => {
  activeVoice = null;
  outsideTap = null;
  setScene('opening');
  scrollLatest();
  pickup.focus({ preventScroll: true });
});

setScene('opening');
scrollLatest();
