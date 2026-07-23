// audio-base64.js - Audio Base64 tanpa upload file
// Berkas lokal digunakan langsung dari assets/audio/audio-base64.js

class Base64Audio {
    constructor() {
        this.sounds = {
            click: this.createClickSound(),
            button: this.createButtonSound(),
            select: this.createSelectSound(),
            success: this.createSuccessSound(),
            error: this.createErrorSound(),
            navigation: this.createNavigationSound()
        };
        this.enabled = true;
        this.init();
    }

    init() {
        // Load preferensi
        const pref = localStorage.getItem('audio_enabled');
        if (pref !== null) this.enabled = pref === 'true';

        // Setup event listeners
        this.setupGlobalListeners();
        console.log('🔊 Base64 Audio System Ready');
    }

    // ===== GENERATE AUDIO BASE64 =====

    createClickSound() {
        // Generate tone 800Hz for 0.1s
        return this.generateToneBase64(800, 0.1);
    }

    createButtonSound() {
        // Generate tone 600Hz for 0.15s
        return this.generateToneBase64(600, 0.15);
    }

    createSelectSound() {
        // Generate two tones
        return this.generateToneBase64([400, 600], 0.2);
    }

    createSuccessSound() {
        // Generate ascending tones
        return this.generateToneBase64([523.25, 659.25, 783.99], 0.5);
    }

    createErrorSound() {
        // Generate descending tones
        return this.generateToneBase64([783.99, 523.25, 392], 0.4);
    }

    createNavigationSound() {
        // Generate swoosh-like sound
        return this.generateToneBase64([300, 500, 300], 0.3);
    }

    generateToneBase64(frequencies, duration) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const channels = 1;
            const frames = Math.floor(sampleRate * duration);

            // Create audio buffer
            const buffer = audioContext.createBuffer(channels, frames, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate wave
            const freqArray = Array.isArray(frequencies) ? frequencies : [frequencies];
            const segmentFrames = Math.floor(frames / freqArray.length);

            for (let i = 0; i < frames; i++) {
                const segmentIndex = Math.floor(i / segmentFrames);
                const freq = freqArray[Math.min(segmentIndex, freqArray.length - 1)];
                const t = i / sampleRate;

                // Sine wave with envelope
                const envelope = Math.exp(-5 * t) * (1 - (i / frames));
                data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
            }

            // Convert to WAV base64
            return this.bufferToWaveBase64(buffer);

        } catch (e) {
            // Fallback to simple beep
            return this.simpleBeepBase64();
        }
    }

    simpleBeepBase64() {
        // Very simple beep sound (1kHz, 0.1s)
        const duration = 0.1;
        const sampleRate = 44100;
        const frames = Math.floor(sampleRate * duration);

        // Create WAV header
        const dataLength = frames * 2;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        // Write WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        // Write simple sine wave
        const amplitude = 0.3;
        for (let i = 0; i < frames; i++) {
            const t = i / sampleRate;
            const sample = Math.sin(2 * Math.PI * 1000 * t) * amplitude;
            const index = 44 + i * 2;
            view.setInt16(index, sample * 0x7FFF, true);
        }

        // Convert to base64
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return 'data:audio/wav;base64,' + btoa(binary);
    }

    bufferToWaveBase64(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = buffer.length * numChannels * bytesPerSample;

        const bufferSize = 44 + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        // Write WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        // Convert to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return 'data:audio/wav;base64,' + btoa(binary);
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // ===== PLAY FUNCTIONS =====

    play(soundName, volume = 0.3) {
        if (!this.enabled || !this.sounds[soundName]) return;

        try {
            const audio = new Audio(this.sounds[soundName]);
            audio.volume = volume;
            audio.play().catch(e => {
                // Silent fail for autoplay restrictions
                console.log('Audio play prevented:', e);
            });
        } catch (e) {
            // Fallback to Web Audio API
            this.playFallback(soundName);
        }
    }

    playFallback(soundName) {
        if (!window.AudioContext) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0.1;

            // Set frequency based on sound type
            switch (soundName) {
                case 'click':
                    oscillator.frequency.value = 800;
                    break;
                case 'button':
                    oscillator.frequency.value = 600;
                    break;
                case 'success':
                    oscillator.frequency.value = 800;
                    break;
                case 'error':
                    oscillator.frequency.value = 300;
                    break;
                default:
                    oscillator.frequency.value = 500;
            }

            oscillator.start();
            setTimeout(() => oscillator.stop(), 100);
        } catch (e) {
            // Ultimate silent fail
        }
    }

    // ===== EVENT HANDLERS =====

    setupGlobalListeners() {
        // Delay setup to ensure DOM is ready
        setTimeout(() => {
            // Buttons
            document.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    this.handleButtonClick(e.target);
                }
            });

            // Select dropdowns
            document.addEventListener('change', (e) => {
                if (e.target.tagName === 'SELECT') {
                    this.play('select', 0.2);
                }
            });

            // File inputs
            document.addEventListener('change', (e) => {
                if (e.target.type === 'file') {
                    this.play('select', 0.2);
                }
            });

            // Navigation clicks (specific classes)
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest('.nav-btn') ||
                    target.closest('.splash-btn') ||
                    target.closest('.jadwal-btn')) {
                    this.play('navigation', 0.25);
                }
            });
        }, 1000);
    }

    handleButtonClick(button) {
        const id = button.id;
        const className = button.className;

        if (id === 'submitBtn' || id === 'resetBtn') {
            this.play('button');
        } else if (id.includes('showAttendance') || id.includes('refresh')) {
            this.play('click');
        } else if (className.includes('splash-btn')) {
            this.play('navigation');
        } else {
            this.play('click');
        }
    }

    // ===== PUBLIC METHODS =====

    enable() {
        this.enabled = true;
        localStorage.setItem('audio_enabled', 'true');
    }

    disable() {
        this.enabled = false;
        localStorage.setItem('audio_enabled', 'false');
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('audio_enabled', this.enabled);
        return this.enabled;
    }

    playSuccess() {
        this.play('success', 0.4);
    }

    playError() {
        this.play('error', 0.3);
    }
}

// Create global instance
window.base64Audio = new Base64Audio();