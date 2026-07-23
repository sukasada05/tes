// audio-pro-system.js - Sistem Audio Professional dengan Efek Lengkap
// Berkas lokal digunakan langsung dari assets/audio/audio-pro-system.js

class AudioProSystem {
    constructor() {
        this.version = '2.0.0';
        this.enabled = true;
        this.volume = 0.4;
        this.soundProfiles = {
            'default': 'material',
            'available': ['material', 'ios', 'game', 'military', 'subtle']
        };
        this.currentProfile = 'material';
        this.audioCache = new Map();
        this.initialized = false;
        this.audioContext = null;
        this.masterGain = null;
        this.analyser = null;
        this.visualizer = null;

        // Statistics
        this.stats = {
            soundsPlayed: 0,
            errors: 0,
            cacheHits: 0,
            lastPlayed: null
        };

        this.init();
    }

    async init() {
        // Load preferences
        this.loadPreferences();

        // Initialize Web Audio API
        this.initAudioContext();

        // Generate all sounds
        await this.generateSounds();

        // Setup event system
        this.setupEventSystem();

        // Setup visual feedback
        this.setupVisualFeedback();

        // Setup performance monitoring
        this.setupPerformanceMonitor();

        this.initialized = true;
        console.log(`🎧 Audio Pro System v${this.version} initialized`);
        console.log(`📊 Profile: ${this.currentProfile}, Volume: ${this.volume}`);
    }

    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('audio_pro_prefs') || '{}');
            this.enabled = prefs.enabled !== undefined ? prefs.enabled : true;
            this.volume = prefs.volume || 0.4;
            this.currentProfile = prefs.profile || 'material';
        } catch (e) {
            console.warn('Failed to load audio preferences, using defaults');
        }
    }

    savePreferences() {
        const prefs = {
            enabled: this.enabled,
            volume: this.volume,
            profile: this.currentProfile,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('audio_pro_prefs', JSON.stringify(prefs));
    }

    initAudioContext() {
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();

                // Create master gain node
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this.volume;
                this.masterGain.connect(this.audioContext.destination);

                // Create analyser for visual effects (optional)
                this.analyser = this.audioContext.createAnalyser();
                this.masterGain.connect(this.analyser);

                // Resume context if suspended (required for Chrome autoplay policy)
                if (this.audioContext.state === 'suspended') {
                    document.addEventListener('click', () => {
                        this.audioContext.resume().then(() => {
                            console.log('AudioContext resumed successfully');
                        });
                    }, { once: true });
                }

                console.log('🎛️ Web Audio API initialized');
            }
        } catch (e) {
            console.warn('Web Audio API not available, using fallback');
        }
    }

    async generateSounds() {
        console.time('Sound Generation');

        // Pre-generate all sounds based on profile
        const soundTypes = [
            'click', 'button', 'select', 'navigation',
            'success', 'error', 'warning', 'notification',
            'pageTransition', 'dataLoad', 'upload', 'download',
            'checkbox', 'radio', 'toggle', 'slider',
            'keyboard', 'swipe', 'drag', 'drop',
            'startup', 'shutdown', 'refresh', 'search'
        ];

        for (const type of soundTypes) {
            try {
                const soundData = this.generateSoundByType(type);
                this.audioCache.set(type, soundData);
            } catch (e) {
                console.warn(`Failed to generate sound: ${type}`, e);
            }
        }

        console.timeEnd('Sound Generation');
        console.log(`🎵 Generated ${this.audioCache.size} sound effects`);
    }

    generateSoundByType(type) {
        const profiles = {
            material: this.generateMaterialSound(type),
            ios: this.generateIosSound(type),
            game: this.generateGameSound(type),
            military: this.generateMilitarySound(type),
            subtle: this.generateSubtleSound(type)
        };

        return profiles[this.currentProfile] || profiles.material;
    }

    // ===== SOUND GENERATORS FOR DIFFERENT PROFILES =====

    generateMaterialSound(type) {
        const now = this.audioContext.currentTime;

        switch (type) {
            case 'click':
                return this.createTone(600, 0.05, 'sine', 0.2);
            case 'button':
                return this.createTone([400, 600], 0.15, 'sine', 0.3);
            case 'select':
                return this.createTone([300, 500, 300], 0.2, 'sine', 0.25);
            case 'success':
                return this.createMelody([523.25, 659.25, 783.99], [0.1, 0.1, 0.2], 0.4);
            case 'error':
                return this.createMelody([783.99, 523.25, 392], [0.1, 0.1, 0.2], 0.35);
            case 'navigation':
                return this.createSwoosh(300, 600, 0.3, 0.25);
            case 'notification':
                return this.createTone([800, 600], 0.25, 'square', 0.3);
            case 'pageTransition':
                return this.createSweep(200, 800, 0.4, 0.2);
            case 'dataLoad':
                return this.createPulse([300, 400, 500], 0.5, 0.2);
            case 'upload':
                return this.createAscendingTones([400, 600, 800], 0.3, 0.3);
            case 'download':
                return this.createDescendingTones([800, 600, 400], 0.3, 0.3);
            default:
                return this.createTone(500, 0.1, 'sine', 0.2);
        }
    }

    generateIosSound(type) {
        switch (type) {
            case 'click': return this.createTone(800, 0.08, 'sine', 0.15);
            case 'button': return this.createTone(600, 0.12, 'sine', 0.2);
            case 'select': return this.createTone(400, 0.1, 'sine', 0.18);
            default: return this.generateMaterialSound(type);
        }
    }

    generateGameSound(type) {
        switch (type) {
            case 'click': return this.createTone(300, 0.05, 'square', 0.3);
            case 'success': return this.createTone([784, 1047], 0.3, 'sawtooth', 0.4);
            case 'error': return this.createNoise(0.2, 0.4);
            default: return this.generateMaterialSound(type);
        }
    }

    generateMilitarySound(type) {
        switch (type) {
            case 'click': return this.createTone(1000, 0.05, 'sine', 0.25);
            case 'success': return this.createMorse('...', 0.4);
            case 'error': return this.createSiren(0.3, 0.4);
            default: return this.generateMaterialSound(type);
        }
    }

    generateSubtleSound(type) {
        switch (type) {
            case 'click': return this.createTone(800, 0.03, 'sine', 0.1);
            case 'button': return this.createTone(600, 0.08, 'sine', 0.15);
            default: return this.generateMaterialSound(type);
        }
    }

    // ===== AUDIO GENERATION UTILITIES =====

    createTone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return this.createFallbackTone(freq, duration);

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.type = type;

        if (Array.isArray(freq)) {
            oscillator.frequency.setValueAtTime(freq[0], this.audioContext.currentTime);
            for (let i = 1; i < freq.length; i++) {
                oscillator.frequency.linearRampToValueAtTime(
                    freq[i],
                    this.audioContext.currentTime + (duration * i / freq.length)
                );
            }
        } else {
            oscillator.frequency.value = freq;
        }

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);

        return { oscillator, gainNode, duration };
    }

    createMelody(frequencies, durations, volume = 0.3) {
        if (!this.audioContext) return null;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        oscillator.type = 'sine';

        let totalDuration = 0;
        frequencies.forEach((freq, i) => {
            const dur = durations[i] || 0.1;
            oscillator.frequency.setValueAtTime(freq, now + totalDuration);
            totalDuration += dur;
        });

        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

        oscillator.start();
        oscillator.stop(now + totalDuration);

        return { oscillator, gainNode, duration: totalDuration };
    }

    createSwoosh(startFreq, endFreq, duration, volume = 0.3) {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        oscillator.type = 'sine';

        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            endFreq,
            this.audioContext.currentTime + duration
        );

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);

        return { oscillator, gainNode, duration };
    }

    createSweep(startFreq, endFreq, duration, volume = 0.3) {
        return this.createSwoosh(startFreq, endFreq, duration, volume);
    }

    createPulse(frequencies, duration, volume = 0.3) {
        if (!this.audioContext) return null;

        const pulses = 3;
        const pulseDuration = duration / pulses;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        oscillator.type = 'sine';

        // Create pulse effect
        const now = this.audioContext.currentTime;
        for (let i = 0; i < pulses; i++) {
            const freq = frequencies[i % frequencies.length];
            oscillator.frequency.setValueAtTime(freq, now + (i * pulseDuration));

            gainNode.gain.setValueAtTime(volume, now + (i * pulseDuration));
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                now + (i * pulseDuration) + (pulseDuration * 0.8)
            );
        }

        oscillator.start();
        oscillator.stop(now + duration);

        return { oscillator, gainNode, duration };
    }

    createNoise(duration, volume = 0.3) {
        if (!this.audioContext) return null;

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + duration
        );

        source.start();
        source.stop(this.audioContext.currentTime + duration);

        return { source, gainNode, duration };
    }

    createMorse(code, volume = 0.3) {
        // Simple morse code beeps
        const dot = 0.1;
        const dash = 0.3;
        const gap = 0.1;

        let totalDuration = 0;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        oscillator.type = 'sine';
        oscillator.frequency.value = 600;

        const now = this.audioContext.currentTime;

        for (const char of code) {
            if (char === '.') {
                gainNode.gain.setValueAtTime(volume, now + totalDuration);
                totalDuration += dot;
                gainNode.gain.setValueAtTime(0.001, now + totalDuration);
            } else if (char === '-') {
                gainNode.gain.setValueAtTime(volume, now + totalDuration);
                totalDuration += dash;
                gainNode.gain.setValueAtTime(0.001, now + totalDuration);
            }
            totalDuration += gap;
        }

        oscillator.start();
        oscillator.stop(now + totalDuration);

        return { oscillator, gainNode, duration: totalDuration };
    }

    createSiren(duration, volume = 0.3) {
        // Alternate between two frequencies
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        lfo.connect(oscillator.frequency);

        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 300;
        lfo.type = 'sine';
        lfo.frequency.value = 2; // 2Hz oscillation
        lfo.connect(oscillator.detune);

        gainNode.gain.value = volume;

        oscillator.start();
        lfo.start();

        setTimeout(() => {
            oscillator.stop();
            lfo.stop();
        }, duration * 1000);

        return { oscillator, gainNode, lfo, duration };
    }

    createAscendingTones(frequencies, duration, volume = 0.3) {
        return this.createMelody(frequencies, Array(frequencies.length).fill(duration / frequencies.length), volume);
    }

    createDescendingTones(frequencies, duration, volume = 0.3) {
        return this.createMelody(frequencies.reverse(), Array(frequencies.length).fill(duration / frequencies.length), volume);
    }

    createFallbackTone(freq, duration) {
        // Simple fallback using HTML5 Audio with base64
        const sampleRate = 44100;
        const frames = Math.floor(sampleRate * duration);

        // Generate simple sine wave as base64
        const data = new Float32Array(frames);
        for (let i = 0; i < frames; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;
        }

        return this.float32ToBase64(data, sampleRate);
    }

    float32ToBase64(float32Array, sampleRate) {
        // Convert to 16-bit PCM
        const pcm16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32767));
        }

        // Create WAV file in base64
        const wavHeader = this.createWavHeader(pcm16.length, sampleRate);
        const wavBytes = new Uint8Array(wavHeader.length + pcm16.length * 2);

        wavBytes.set(wavHeader, 0);
        const dataView = new DataView(wavBytes.buffer, wavHeader.length);
        for (let i = 0; i < pcm16.length; i++) {
            dataView.setInt16(i * 2, pcm16[i], true);
        }

        const base64 = btoa(String.fromCharCode(...wavBytes));
        return `data:audio/wav;base64,${base64}`;
    }

    createWavHeader(numSamples, sampleRate) {
        const blockAlign = 2; // 16-bit mono
        const byteRate = sampleRate * blockAlign;
        const dataSize = numSamples * blockAlign;
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        return new Uint8Array(buffer);
    }

    // ===== PLAYBACK SYSTEM =====

    play(soundType, options = {}) {
        if (!this.enabled || !this.initialized) return null;

        const {
            volume = this.volume,
            speed = 1.0,
            pitch = 1.0,
            pan = 0,
            loop = false,
            onEnd = null
        } = options;

        try {
            this.stats.soundsPlayed++;
            this.stats.lastPlayed = {
                type: soundType,
                time: new Date().toISOString(),
                options
            };

            // Check cache first
            if (this.audioCache.has(soundType)) {
                this.stats.cacheHits++;
                return this.playCachedSound(soundType, volume, onEnd);
            }

            // Generate on-the-fly if not cached
            const sound = this.generateSoundByType(soundType);
            if (sound) {
                return this.playGeneratedSound(sound, volume, onEnd);
            }

            // Fallback to HTML5 Audio
            return this.playFallbackSound(soundType, volume);

        } catch (error) {
            this.stats.errors++;
            console.warn(`Failed to play sound: ${soundType}`, error);
            return null;
        }
    }

    playCachedSound(soundType, volume, onEnd) {
        const sound = this.audioCache.get(soundType);

        if (sound && typeof sound === 'object' && sound.oscillator) {
            // Clone the cached sound nodes
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            Object.assign(oscillator, {
                type: sound.oscillator.type,
                frequency: sound.oscillator.frequency
            });

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            gainNode.gain.value = volume;

            const now = this.audioContext.currentTime;
            oscillator.start(now);
            oscillator.stop(now + (sound.duration || 0.1));

            if (onEnd) {
                setTimeout(onEnd, (sound.duration || 0.1) * 1000);
            }

            return { oscillator, gainNode, stop: () => oscillator.stop() };
        } else if (typeof sound === 'string' && sound.startsWith('data:audio')) {
            // Base64 audio data
            return this.playBase64Audio(sound, volume, onEnd);
        }

        return null;
    }

    playGeneratedSound(sound, volume, onEnd) {
        if (!sound || !this.audioContext) return null;

        // Apply volume adjustment
        if (sound.gainNode) {
            sound.gainNode.gain.value = volume;
        }

        if (onEnd) {
            setTimeout(onEnd, (sound.duration || 0.1) * 1000);
        }

        return sound;
    }

    playBase64Audio(base64Data, volume, onEnd) {
        const audio = new Audio(base64Data);
        audio.volume = volume;

        audio.play().then(() => {
            if (onEnd) {
                audio.addEventListener('ended', onEnd);
            }
        }).catch(error => {
            console.warn('Base64 audio play failed:', error);
        });

        return {
            stop: () => {
                audio.pause();
                audio.currentTime = 0;
            },
            element: audio
        };
    }

    playFallbackSound(soundType, volume) {
        // Ultra simple fallback using oscillator directly
        if (!window.AudioContext) return null;

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = 600;
            osc.type = 'sine';
            gain.gain.value = volume * 0.1;

            const now = ctx.currentTime;
            osc.start(now);
            osc.stop(now + 0.1);

            return { oscillator: osc, gainNode: gain, stop: () => osc.stop() };
        } catch (e) {
            return null;
        }
    }

    // ===== EVENT SYSTEM =====

    setupEventSystem() {
        // Wait for DOM to be fully loaded
        setTimeout(() => {
            this.setupGlobalEventDelegation();
            this.setupCustomEvents();
            this.injectAudioAttributes();
        }, 1500);
    }

    setupGlobalEventDelegation() {
        // Use event delegation for better performance
        document.addEventListener('click', (e) => {
            if (!this.enabled) return;

            const target = e.target;
            const soundType = this.determineSoundType(target);

            if (soundType) {
                this.play(soundType, { volume: this.getVolumeForElement(target) });

                // Add visual feedback
                this.addClickFeedback(target);
            }
        }, true); // Use capturing phase for better reliability

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Play sound for Enter/Space on focused buttons
            if ((e.key === 'Enter' || e.key === ' ') &&
                document.activeElement.tagName === 'BUTTON') {
                this.play('button', { volume: this.volume * 0.8 });
            }
        });

        // Form interactions
        document.addEventListener('change', (e) => {
            if (!this.enabled) return;

            const target = e.target;
            if (target.tagName === 'SELECT') {
                this.play('select');
            } else if (target.type === 'checkbox') {
                this.play('checkbox', { volume: this.volume * 0.6 });
            } else if (target.type === 'radio') {
                this.play('radio', { volume: this.volume * 0.6 });
            }
        });

        // File interactions
        document.addEventListener('change', (e) => {
            if (!this.enabled || e.target.type !== 'file') return;

            const files = e.target.files;
            if (files.length > 0) {
                this.play('upload');

                // Play additional sound based on file count
                if (files.length > 1) {
                    setTimeout(() => {
                        this.play('notification', { volume: this.volume * 0.5 });
                    }, 150);
                }
            }
        });
    }

    determineSoundType(element) {
        // Check for data attributes first
        if (element.dataset.sound) {
            return element.dataset.sound;
        }

        // Check by element type and classes
        const tag = element.tagName.toLowerCase();
        const classes = element.className || '';
        const id = element.id || '';

        // Splash screen buttons
        if (classes.includes('splash-btn')) {
            return 'navigation';
        }

        // Navigation buttons
        if (classes.includes('nav-btn')) {
            return 'navigation';
        }

        // Jadwal buttons
        if (classes.includes('jadwal-btn')) {
            return 'button';
        }

        // Main action buttons
        if (id.includes('submit') || id.includes('download') || id.includes('upload')) {
            return 'button';
        }

        // Reset/clear buttons
        if (id.includes('reset') || id.includes('clear')) {
            return 'button';
        }

        // Attendance/Report buttons
        if (id.includes('attendance') || id.includes('report') || id.includes('refresh')) {
            return 'dataLoad';
        }

        // Toggle buttons
        if (id.includes('toggle') || id.includes('show') || id.includes('hide')) {
            return 'toggle';
        }

        // Default button sound
        if (tag === 'button') {
            return 'click';
        }

        // Links that look like buttons
        if (tag === 'a' && (classes.includes('btn') || classes.includes('button'))) {
            return 'click';
        }

        return null;
    }

    getVolumeForElement(element) {
        // Adjust volume based on element type
        const tag = element.tagName.toLowerCase();
        const classes = element.className || '';

        // Quieter for subtle interactions
        if (classes.includes('toggle') ||
            element.type === 'checkbox' ||
            element.type === 'radio') {
            return this.volume * 0.4;
        }

        // Louder for main actions
        if (element.id === 'submitBtn' ||
            classes.includes('splash-btn') ||
            classes.includes('jadwal-btn')) {
            return this.volume * 0.7;
        }

        // Default volume
        return this.volume * 0.5;
    }

    setupCustomEvents() {
        // Create custom audio events
        window.addEventListener('audio:play', (e) => {
            if (e.detail && e.detail.type) {
                this.play(e.detail.type, e.detail.options);
            }
        });

        window.addEventListener('audio:enable', () => this.enable());
        window.addEventListener('audio:disable', () => this.disable());
        window.addEventListener('audio:toggle', () => this.toggle());
        window.addEventListener('audio:volume:set', (e) => {
            if (e.detail && e.detail.volume !== undefined) {
                this.setVolume(e.detail.volume);
            }
        });

        // Dispatch ready event
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('audio:ready', {
                detail: {
                    version: this.version,
                    profile: this.currentProfile,
                    enabled: this.enabled
                }
            }));
        }, 2000);
    }

    injectAudioAttributes() {
        // Inject data-sound attributes for better control
        setTimeout(() => {
            const selectors = [
                'button',
                '.nav-btn',
                '.splash-btn',
                '.jadwal-btn',
                'select',
                'input[type="file"]',
                'input[type="checkbox"]',
                'input[type="radio"]'
            ];

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    if (!el.dataset.sound) {
                        const soundType = this.determineSoundType(el);
                        if (soundType) {
                            el.dataset.sound = soundType;
                        }
                    }
                });
            });
        }, 2000);
    }

    // ===== VISUAL FEEDBACK =====

    setupVisualFeedback() {
        // Create visual feedback container
        this.visualizer = document.createElement('div');
        this.visualizer.id = 'audio-visual-feedback';
        this.visualizer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(43, 77, 43, 0.9);
            border: 2px solid #4CAF50;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            cursor: pointer;
            z-index: 9998;
            opacity: 0.8;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;

        this.visualizer.innerHTML = '<i class="fas fa-volume-up"></i>';
        document.body.appendChild(this.visualizer);

        // Setup visualizer interactions
        this.setupVisualizerInteractions();
    }

    setupVisualizerInteractions() {
        const viz = this.visualizer;

        viz.addEventListener('click', () => {
            this.toggle();
            this.updateVisualizer();
            this.play('toggle');
        });

        viz.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showAudioSettings();
        });

        viz.addEventListener('mouseenter', () => {
            viz.style.transform = 'scale(1.1)';
            viz.style.opacity = '1';
            viz.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        });

        viz.addEventListener('mouseleave', () => {
            viz.style.transform = 'scale(1)';
            viz.style.opacity = '0.8';
            viz.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        });

        // Add volume wheel control
        viz.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newVolume = Math.max(0, Math.min(1, this.volume + delta));
            this.setVolume(newVolume);
            this.updateVisualizer();
            this.play('slider', { volume: 0.2 });
        });

        this.updateVisualizer();
    }

    updateVisualizer() {
        if (!this.visualizer) return;

        const icon = this.visualizer.querySelector('i');
        if (icon) {
            if (this.enabled) {
                icon.className = `fas fa-volume-${this.volume > 0.6 ? 'up' : this.volume > 0.3 ? 'down' : 'off'}`;
                this.visualizer.style.background = 'rgba(43, 77, 43, 0.9)';
                this.visualizer.style.borderColor = '#4CAF50';
            } else {
                icon.className = 'fas fa-volume-mute';
                this.visualizer.style.background = 'rgba(85, 85, 85, 0.9)';
                this.visualizer.style.borderColor = '#777';
            }
        }

        // Add volume level indicator
        this.visualizer.title = `Audio: ${this.enabled ? 'ON' : 'OFF'}\nVolume: ${Math.round(this.volume * 100)}%\nProfile: ${this.currentProfile}\nRight-click for settings`;
    }

    showAudioSettings() {
        // Create settings overlay
        const overlay = document.createElement('div');
        overlay.id = 'audio-settings-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1d1f1d, #2b4d2b);
            padding: 30px;
            border-radius: 15px;
            max-width: 90%;
            width: 400px;
            border: 3px solid #4CAF50;
            color: white;
        `;

        modal.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #9fd49f;">
                <i class="fas fa-sliders-h"></i> Audio Settings
            </h2>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px;">
                    <input type="checkbox" id="audioEnabled" ${this.enabled ? 'checked' : ''}>
                    Enable Sound Effects
                </label>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px;">
                    Volume: <span id="volumeValue">${Math.round(this.volume * 100)}</span>%
                </label>
                <input type="range" id="volumeSlider" min="0" max="100" value="${Math.round(this.volume * 100)}" 
                       style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px;">Sound Profile:</label>
                <select id="profileSelect" style="width: 100%; padding: 8px; background: #333; color: white; border: none; border-radius: 5px;">
                    ${this.soundProfiles.available.map(profile => `
                        <option value="${profile}" ${profile === this.currentProfile ? 'selected' : ''}>
                            ${profile.charAt(0).toUpperCase() + profile.slice(1)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                <h4 style="margin-bottom: 10px; color: #b2d8b2;">Quick Test:</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="test-btn" data-sound="click">Click</button>
                    <button class="test-btn" data-sound="button">Button</button>
                    <button class="test-btn" data-sound="success">Success</button>
                    <button class="test-btn" data-sound="error">Error</button>
                    <button class="test-btn" data-sound="navigation">Navigation</button>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <button id="audioResetBtn" style="padding: 10px 15px; background: #555; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reset
                </button>
                <button id="audioCloseBtn" style="padding: 10px 25px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #a5a5a5; text-align: center;">
                Audio Pro System v${this.version}
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Setup event listeners for settings
        const enabledCheckbox = overlay.querySelector('#audioEnabled');
        const volumeSlider = overlay.querySelector('#volumeSlider');
        const volumeValue = overlay.querySelector('#volumeValue');
        const profileSelect = overlay.querySelector('#profileSelect');
        const testButtons = overlay.querySelectorAll('.test-btn');
        const resetBtn = overlay.querySelector('#audioResetBtn');
        const closeBtn = overlay.querySelector('#audioCloseBtn');

        enabledCheckbox.addEventListener('change', (e) => {
            this.enabled = e.target.checked;
            this.savePreferences();
            this.updateVisualizer();
            this.play('checkbox');
        });

        volumeSlider.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            volumeValue.textContent = e.target.value;
            this.setVolume(vol);
            this.play('slider', { volume: 0.1 });
        });

        profileSelect.addEventListener('change', (e) => {
            this.currentProfile = e.target.value;
            this.savePreferences();
            this.regenerateSounds();
            this.play('select');
        });

        testButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sound = btn.dataset.sound;
                this.play(sound, { volume: this.volume });
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 100);
            });
        });

        resetBtn.addEventListener('click', () => {
            this.resetToDefaults();
            enabledCheckbox.checked = this.enabled;
            volumeSlider.value = Math.round(this.volume * 100);
            volumeValue.textContent = volumeSlider.value;
            profileSelect.value = this.currentProfile;
            this.play('reset');
        });

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.play('navigation');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        this.play('notification', { volume: 0.3 });
    }

    addClickFeedback(element) {
        if (!element || !this.enabled) return;

        // Add visual feedback class
        element.classList.add('audio-click-feedback');

        // Remove after animation
        setTimeout(() => {
            element.classList.remove('audio-click-feedback');
        }, 300);
    }

    // ===== PERFORMANCE MONITORING =====

    setupPerformanceMonitor() {
        // Monitor and optimize performance
        setInterval(() => {
            this.cleanupCache();
            this.optimizeMemory();
        }, 60000); // Every minute
    }

    cleanupCache() {
        // Keep cache size manageable
        const maxCacheSize = 50;
        if (this.audioCache.size > maxCacheSize) {
            const keys = Array.from(this.audioCache.keys());
            const excess = keys.length - maxCacheSize;

            for (let i = 0; i < excess; i++) {
                this.audioCache.delete(keys[i]);
            }

            console.log(`🧹 Cleaned ${excess} items from audio cache`);
        }
    }

    optimizeMemory() {
        // Clean up disconnected audio nodes
        if (this.audioContext) {
            // Web Audio API automatically garbage collects disconnected nodes
        }
    }

    getPerformanceStats() {
        return {
            ...this.stats,
            cacheSize: this.audioCache.size,
            audioContextState: this.audioContext ? this.audioContext.state : 'unavailable',
            memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'unavailable'
        };
    }

    // ===== PUBLIC API =====

    enable() {
        this.enabled = true;
        this.savePreferences();
        this.updateVisualizer();
        this.play('success', { volume: 0.3 });
        console.log('🔊 Audio enabled');
    }

    disable() {
        this.enabled = false;
        this.savePreferences();
        this.updateVisualizer();
        this.play('error', { volume: 0.2 });
        console.log('🔇 Audio disabled');
    }

    toggle() {
        this.enabled ? this.disable() : this.enable();
        return this.enabled;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));

        // Update master gain if available
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }

        this.savePreferences();
        this.updateVisualizer();
    }

    setProfile(profile) {
        if (this.soundProfiles.available.includes(profile)) {
            this.currentProfile = profile;
            this.savePreferences();
            this.regenerateSounds();
            this.play('notification', { volume: 0.3 });
            return true;
        }
        return false;
    }

    regenerateSounds() {
        console.log(`🔄 Regenerating sounds with ${this.currentProfile} profile`);
        this.audioCache.clear();
        this.generateSounds();
    }

    resetToDefaults() {
        this.enabled = true;
        this.volume = 0.4;
        this.currentProfile = 'material';
        this.savePreferences();
        this.regenerateSounds();
        this.updateVisualizer();
        console.log('🔄 Audio settings reset to defaults');
    }

    // Specialized playback methods
    playNotification(type = 'info', volume = null) {
        const sounds = {
            info: 'notification',
            success: 'success',
            warning: 'warning',
            error: 'error'
        };

        this.play(sounds[type] || 'notification', {
            volume: volume || (type === 'error' ? this.volume * 0.6 : this.volume * 0.4)
        });
    }

    playUiFeedback(action, volume = null) {
        const soundMap = {
            open: 'navigation',
            close: 'navigation',
            expand: 'pageTransition',
            collapse: 'pageTransition',
            refresh: 'refresh',
            search: 'search',
            filter: 'select',
            sort: 'select'
        };

        this.play(soundMap[action] || 'click', { volume: volume || this.volume * 0.5 });
    }

    // ===== DESTRUCTOR =====

    destroy() {
        // Clean up all audio nodes
        if (this.audioContext) {
            this.audioContext.close();
        }

        // Remove visual elements
        if (this.visualizer && this.visualizer.parentNode) {
            this.visualizer.parentNode.removeChild(this.visualizer);
        }

        // Clear cache
        this.audioCache.clear();

        console.log('🧹 Audio Pro System destroyed');
    }
}

// Create global instance with error handling
try {
    window.audioPro = new AudioProSystem();

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AudioProSystem;
    }
} catch (error) {
    console.error('Failed to initialize Audio Pro System:', error);

    // Provide fallback
    window.audioPro = {
        enabled: false,
        play: () => { },
        enable: () => { },
        disable: () => { },
        toggle: () => false
    };
}