// ============================================================
// DUKOPS COMPLETE - APP.JS (TANPA TELEGRAM)
// TERINTEGRASI DENGAN GOOGLE APPS SCRIPT BACKEND
// VERSION: 3.0 - FULL FIX
// ============================================================

// ================= KONFIGURASI BACKEND =================
const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbwDcIVTJRBpqpuIOsBmFmvMAak8F5PC5Q5xgxd83anR0y5z4RQ8K9tRi4yjR4fcvXMpng/exec";
const TARGET_LAPORAN = 9;
const KORAMIL = "KORAMIL 1609-05/SUKASADA";
const VERSION = "3.0";

// KONFIGURASI GITHUB
const GITHUB_URLS = {
    HANPANGAN: "https://raw.githubusercontent.com/sukasada05/dukops4/main/data/hanpangan.txt",
    PIKET: "https://raw.githubusercontent.com/sukasada05/dukops4/main/data/piket.txt",
    DESA_LIST: "https://raw.githubusercontent.com/sukasada05/dukops4/main/data/desa-list.json",
    COORDINATES: "https://raw.githubusercontent.com/sukasada05/dukops4/main/data/coordinates"
};

// ================= VARIABEL GLOBAL =================
let img = new Image();
let selectedDesa = "";
let kordinatList = [];
let currentKoordinat = "";
let tanggalWaktu = "";
let submissionCount = 0;
let submittedDates = [];
let desaCounter = {};
let attendanceData = [];
let deferredPrompt = null;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Variabel Jadwal Piket
let JadwalData = {
    daftarNama: [],
    daftarHanpangan: [],
    currentHanpangan: ""
};

// Variabel Template AI
let templateData = null;
let activeTab = null;
let categoryKeys = [];
const TEMPLATE_JSON_URL = 'template-narasi.json';

// ============================================================
// FUNGSI BACKEND - KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
// ============================================================
async function sendToBackend(action, data = {}) {
    try {
        const getActions = ['listFiles', 'getConfig', 'test', 'getJadwalData', 
                           'getPetugas', 'getPetugasByDate', 'getJadwalEpoch', 'cekGiliran',
                           'getPersonelList', 'getDesaList', 'status', 'unzipStatus', 
                           'checkTriggers', 'checkLog', 'getFailed'];
        
        if (getActions.includes(action)) {
            let url = `${GOOGLE_APPS_SCRIPT_WEBHOOK}?action=${action}`;

            if (action === 'listFiles') {
                if (data.desaFilter) url += `&desaFilter=${encodeURIComponent(data.desaFilter)}`;
                if (data.monthFilter) url += `&monthFilter=${encodeURIComponent(data.monthFilter)}`;
                if (data.readZips) url += `&readZips=true`;
            } else if (action === 'getJadwalData') {
                if (data.type) url += `&type=${encodeURIComponent(data.type)}`;
            } else if (action === 'getPetugasByDate') {
                if (data.tanggal) url += `&tanggal=${encodeURIComponent(data.tanggal)}`;
            } else if (action === 'getJadwalEpoch') {
                if (data.hari) url += `&hari=${encodeURIComponent(data.hari)}`;
            } else if (action === 'cekGiliran') {
                if (data.nama) url += `&nama=${encodeURIComponent(data.nama)}`;
            }

            const response = await fetch(url);
            return await response.json();
        } else {
            const formData = new FormData();
            formData.append('action', action);

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    if (key === 'fileData' && typeof data[key] === 'string') {
                        formData.append(key, data[key]);
                    } else {
                        formData.append(key, String(data[key]));
                    }
                }
            });

            const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK, {
                method: 'POST',
                body: formData
            });

            return await response.json();
        }
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// FUNGSI UPLOAD KE DRIVE (TANPA TELEGRAM)
// ============================================================
async function uploadToGoogleDrive(zipBlob, zipFileName, desaName, date) {
    try {
        const base64Data = await blobToBase64(zipBlob);
        const desaInfo = normalizeDesaName(desaName);

        const result = await sendToBackend('uploadDrive', {
            fileName: zipFileName,
            fileData: base64Data,
            year: date.getFullYear().toString(),
            month: date.toLocaleDateString('id-ID', { month: 'long' }),
            desa: desaInfo.cleanName,
            mimeType: 'application/zip'
        });

        return result.success === true;
    } catch (error) {
        console.error('Error upload ke Drive:', error);
        return false;
    }
}

async function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// ============================================================
// FUNGSI DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DUKOPS APP STARTING...');
    
    // Load semua data
    loadDesaList();
    resetCanvas();
    setupInstallPrompt();
    loadLastSubmittedDates();
    loadDesaCounter();
    loadTemplatesFromGitHub();
    
    // Set default datetime
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('tanggalWaktu').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    updateDatePreview();

    // Load counter
    const savedCount = localStorage.getItem('dukopsSubmissionCount');
    submissionCount = savedCount ? parseInt(savedCount) : 0;
    document.getElementById('submissionCounter').textContent = submissionCount;

    // Setup AI Template Button
    setupAITemplateButton();
    
    console.log('✅ DUKOPS APP READY');
});

// ============================================================
// FUNGSI MP3 BACKGROUND
// ============================================================
(function() {
    const audio = document.getElementById('backgroundMusic');
    const volumeSlider = document.getElementById('audioVolumeSlider');
    let isPlaying = false;
    let hasUserInteracted = false;

    function playMusic() {
        if (audio && !isPlaying) {
            audio.play().then(() => {
                isPlaying = true;
                console.log('🎵 Musik background diputar');
            }).catch(err => console.log('Gagal memutar musik:', err));
        }
    }

    if (audio) {
        if (!audio.src) {
            audio.src = 'assets/audio/background.mp3';
        }
        audio.volume = 0.3;
        if (volumeSlider) {
            volumeSlider.value = Math.round(audio.volume * 100);
        }
        audio.loop = true;
        audio.load();
    }

    if (volumeSlider) {
        volumeSlider.oninput = function() {
            if (!audio) return;
            const value = parseInt(this.value, 10) / 100;
            audio.volume = value;
            if (value > 0 && !isPlaying && hasUserInteracted) {
                playMusic();
            }
        };
    }

    window.triggerPlayMusic = function() {
        if (!audio) return;
        if (!hasUserInteracted) {
            hasUserInteracted = true;
            playMusic();
        } else if (!isPlaying) {
            playMusic();
        }
    };

    function firstInteraction() {
        if (!hasUserInteracted) {
            hasUserInteracted = true;
            playMusic();
            document.removeEventListener('click', firstInteraction);
            document.removeEventListener('touchstart', firstInteraction);
            document.removeEventListener('scroll', firstInteraction);
        }
    }
    document.addEventListener('click', firstInteraction);
    document.addEventListener('touchstart', firstInteraction);
    document.addEventListener('scroll', firstInteraction);

    setTimeout(() => {
        if (!hasUserInteracted) {
            playMusic();
        }
    }, 3000);
})();

// ============================================================
// FUNGSI PWA INSTALL
// ============================================================
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        setTimeout(() => {
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.style.display = 'flex';
                installButton.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            installButton.style.display = 'none';
                        }
                        deferredPrompt = null;
                    }
                });
            }
        }, 3000);
    });

    window.addEventListener('appinstalled', () => {
        const installButton = document.getElementById('installButton');
        if (installButton) installButton.style.display = 'none';
        deferredPrompt = null;
    });
}

// ============================================================
// FUNGSI DESA & KOORDINAT
// ============================================================
function normalizeDesaName(desaName) {
    if (!desaName) return { original: "", normalized: "", forTelegram: "", cleanName: "" };

    let normalized = desaName;
    normalized = normalized.replace(/^Desa\s+/i, '');
    normalized = normalized.replace(/^Kelurahan\s+/i, '');
    normalized = normalized.replace(/Kel\.\s*/gi, '');
    normalized = normalized.replace(/Kel\s/gi, '');
    normalized = normalized.trim();
    const forTelegram = normalized.replace(/_/g, ' ');

    return {
        original: desaName,
        normalized: normalized,
        forTelegram: forTelegram,
        cleanName: forTelegram.trim()
    };
}

async function loadDesaList() {
    const select = document.getElementById('selectDesa');
    const loading = document.getElementById('loadingDesa');

    if (!select) return;
    loading.style.display = 'block';

    try {
        const response = await fetch(GITHUB_URLS.DESA_LIST + '?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            const desaList = data.desaList || [];

            select.innerHTML = '<option value="">-- Pilih Desa/Kelurahan --</option>';
            desaList.forEach(desa => {
                const option = document.createElement('option');
                option.value = desa;
                option.textContent = desa;
                option.setAttribute('data-raw-name', desa);
                select.appendChild(option);
            });
            console.log('✅ Desa loaded from GitHub:', desaList.length);
        } else {
            throw new Error('GitHub fetch failed');
        }
    } catch (error) {
        const fallbackDesas = [
            "Gitgit", "Panji", "Panji Anom", "Sukasada", "Pancasari", "Wanagiri",
            "Ambengan", "Kayu Putih", "Padang Bulia", "Pegadungan",
            "Pegayaman", "Sambangan", "Selat", "Silangjana", "Tegallinggah"
        ];
        select.innerHTML = '<option value="">-- Pilih Desa/Kelurahan --</option>';
        fallbackDesas.forEach(desa => {
            const option = document.createElement('option');
            option.value = desa;
            option.textContent = desa;
            option.setAttribute('data-raw-name', desa);
            select.appendChild(option);
        });
        console.log('✅ Desa loaded from fallback:', fallbackDesas.length);
    } finally {
        loading.style.display = 'none';
    }
}

function updateDesaProfile(desaName) {
    const imgElement = document.getElementById('desaProfileImgHeader');
    const nameElement = document.getElementById('desaProfileNameHeader');

    if (!desaName || desaName === "") {
        if (imgElement) imgElement.src = 'icons/favicon-96x96.png';
        if (nameElement) { nameElement.textContent = ""; nameElement.style.display = 'none'; }
        return;
    }

    const desaInfo = normalizeDesaName(desaName);
    if (imgElement) {
        const imageUrl = `profile/${desaInfo.normalized}.png`;
        imgElement.src = imageUrl;
        imgElement.onerror = function() {
            this.src = 'icons/favicon-96x96.png';
        };
    }
    if (nameElement) {
        nameElement.textContent = desaInfo.cleanName;
        nameElement.style.display = 'block';
    }
}

// ============================================================
// LOAD KOORDINAT - UTAMAKAN GITHUB, FALLBACK LOKAL
// ============================================================

async function loadSelectedDesa() {
    const select = document.getElementById('selectDesa');
    const selectedOption = select.options[select.selectedIndex];
    selectedDesa = selectedOption.getAttribute('data-raw-name') || selectedOption.text;

    if (!selectedDesa) {
        resetForm();
        return;
    }

    updateDesaProfile(selectedDesa);
    updateAttendanceButtonState();
    updateAttendanceSelectedDesaLabel();

    const desaInfo = normalizeDesaName(selectedDesa);
    const previewDesa = document.getElementById('previewDesa');
    previewDesa.textContent = desaInfo.cleanName;
    previewDesa.style.display = 'block';

    const fotoLabel = document.getElementById('labelFotoKegiatan');
    if (fotoLabel) {
        fotoLabel.innerHTML = `<i class="fas fa-camera"></i> Foto Kegiatan: ${desaInfo.cleanName}`;
    }

    if (typeof window.triggerPlayMusic === 'function') {
        window.triggerPlayMusic();
    }

    // LOAD KOORDINAT
    const loading = document.getElementById('loadingKoordinat');
    loading.style.display = 'block';
    document.getElementById('previewKordinat').textContent = "Memuat koordinat...";

    try {
        // 🔥 1. COBA DARI GITHUB DULU
        const githubUrl = `${GITHUB_URLS.COORDINATES}/${selectedDesa}.json`;
        console.log('📡 Mencoba dari GitHub:', githubUrl);
        
        const response = await fetch(githubUrl + '?t=' + Date.now());

        if (response.ok) {
            const jsonData = await response.json();
            if (jsonData.coordinates && jsonData.coordinates.length > 0) {
                kordinatList = jsonData.coordinates.map(coord =>
                    `${coord.lat},${coord.lon},${coord.elevation || ''}`
                );
                pickRandomKoordinat();
                showNotification(`✅ Koordinat ${desaInfo.cleanName} dari GitHub (${kordinatList.length} titik)`, "success");
                loading.style.display = 'none';
                updatePreview();
                checkInputCompletion();
                return;
            }
        }
        
        // 🔥 2. JIKA GITHUB GAGAL, COBA DARI LOKAL
        console.log('📡 GitHub gagal/offline, mencoba dari lokal...');
        const lokalUrl = `data/coordinates/${selectedDesa}.json`;
        const lokalResponse = await fetch(lokalUrl + '?t=' + Date.now());

        if (lokalResponse.ok) {
            const jsonData = await lokalResponse.json();
            if (jsonData.coordinates && jsonData.coordinates.length > 0) {
                kordinatList = jsonData.coordinates.map(coord =>
                    `${coord.lat},${coord.lon},${coord.elevation || ''}`
                );
                pickRandomKoordinat();
                showNotification(`📁 Koordinat ${desaInfo.cleanName} dari LOKAL (${kordinatList.length} titik)`, "info");
                loading.style.display = 'none';
                updatePreview();
                checkInputCompletion();
                return;
            }
        }

        // 🔥 3. JIKA SEMUA GAGAL, KOORDINAT DEFAULT
        console.warn('⚠️ Koordinat tidak ditemukan di GitHub maupun Lokal, pakai default');
        kordinatList = ["-8.123,115.123,150"];
        pickRandomKoordinat();
        document.getElementById('previewKordinat').textContent = "⚠️ Koordinat default (file tidak ditemukan)";
        showNotification("⚠️ Koordinat tidak tersedia, pakai default", "warning");

    } catch (error) {
        console.error('❌ Error loading coordinates:', error);
        
        // 🔥 FALLBACK: KOORDINAT DEFAULT
        kordinatList = ["-8.123,115.123,150"];
        pickRandomKoordinat();
        document.getElementById('previewKordinat').textContent = "⚠️ Koordinat default (error)";
        showNotification("⚠️ Gagal memuat koordinat, pakai default", "error");

    } finally {
        loading.style.display = 'none';
        updatePreview();
        checkInputCompletion();
    }
}

function pickRandomKoordinat() {
    if (kordinatList.length === 0) {
        document.getElementById('previewKordinat').textContent = "Tidak ada data koordinat";
        return;
    }

    const randomIndex = Math.floor(Math.random() * kordinatList.length);
    currentKoordinat = kordinatList[randomIndex];
    document.getElementById('previewKordinat').innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + currentKoordinat;

    updatePreview();
    checkInputCompletion();
}

// ============================================================
// FUNGSI FORM DUKOPS
// ============================================================
function previewImage() {
    const file = document.getElementById("gambar").files[0];
    const preview = document.getElementById("previewGambar");

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                if (img.height > img.width) {
                    document.getElementById("gambar").value = "";
                    preview.textContent = "";
                    img = new Image();
                    showNotification("Foto portrait tidak diperbolehkan. Gunakan foto landscape.", "warning");
                    checkInputCompletion();
                    return;
                }
                if (kordinatList.length > 0) pickRandomKoordinat();
                preview.textContent = file.name;
                updatePreview();
            };
            img.onerror = function() {
                showNotification("Gagal memuat gambar", "error");
                document.getElementById("gambar").value = "";
                preview.textContent = "";
            };
        };
        reader.readAsDataURL(file);
    } else {
        img = new Image();
        updatePreview();
    }
    checkInputCompletion();
}

function updateDatePreview() {
    const tglInput = document.getElementById("tanggalWaktu").value;
    const tanggalLabelText = document.getElementById('tanggalWaktuLabelText');

    if (tglInput) {
        const date = new Date(tglInput);
        date.setSeconds(Math.floor(Math.random() * 60));
        tanggalWaktu = date.toISOString();

        const options = {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const displayText = date.toLocaleString('id-ID', options).replace(/:/g, '.');
        if (tanggalLabelText) tanggalLabelText.textContent = displayText;
    } else {
        tanggalWaktu = "";
        if (tanggalLabelText) tanggalLabelText.textContent = 'Pilih tanggal & waktu';
    }
    updatePreview();
    checkInputCompletion();
}

function updatePreview() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    if (img.src && img.complete) {
        canvas.width = 800;
        canvas.height = Math.round(canvas.width * (img.height / img.width));
    } else {
        canvas.width = 800;
        canvas.height = Math.round(canvas.width * (9 / 16));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (img.src && img.complete) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (selectedDesa || currentKoordinat || tanggalWaktu) {
        ctx.textAlign = "right";
        ctx.font = "36px Arial";
        const bottomMargin = 20;
        const lineHeight = 40;
        const rightMargin = 10;

        if (selectedDesa) {
            const desaInfo = normalizeDesaName(selectedDesa);
            const displayDesaName = desaInfo.cleanName;
            const watermarkText = (displayDesaName === "Sukasada" || displayDesaName === "SUKASADA")
                ? "Babinsa Kelurahan Sukasada"
                : "Babinsa " + displayDesaName;

            ctx.strokeStyle = "white";
            ctx.lineWidth = 0;
            ctx.strokeText(watermarkText, canvas.width - rightMargin, canvas.height - bottomMargin - (lineHeight * 2));
            ctx.fillStyle = "white";
            ctx.fillText(watermarkText, canvas.width - rightMargin, canvas.height - bottomMargin - (lineHeight * 2));
        }

        if (currentKoordinat) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 0;
            ctx.strokeText(currentKoordinat, canvas.width - rightMargin, canvas.height - bottomMargin - lineHeight);
            ctx.fillStyle = "white";
            ctx.fillText(currentKoordinat, canvas.width - rightMargin, canvas.height - bottomMargin - lineHeight);
        }

        if (tanggalWaktu) {
            const date = new Date(tanggalWaktu);
            const dateText = date.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }) + ", " + date.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

            ctx.strokeStyle = "white";
            ctx.lineWidth = 0;
            ctx.strokeText(dateText, canvas.width - rightMargin, canvas.height - bottomMargin);
            ctx.fillStyle = "white";
            ctx.fillText(dateText, canvas.width - rightMargin, canvas.height - bottomMargin);
        }
    }
}

function checkInputCompletion() {
    const isComplete = selectedDesa && currentKoordinat && tanggalWaktu &&
        img.src && img.complete && document.getElementById("narasi").value.trim();

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.disabled = !isComplete;
    updateAttendanceButtonState();
}

function autoResizeNarasi(target) {
    const textarea = target instanceof HTMLTextAreaElement ? target : document.getElementById('narasi');
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.overflowY = 'hidden';
    const desiredHeight = Math.max(textarea.scrollHeight, textarea.offsetHeight);
    textarea.style.height = `${desiredHeight}px`;
    textarea.style.minHeight = '150px';
}

// ============================================================
// FUNGSI AI TEMPLATE
// ============================================================

function setupAITemplateButton() {
    const openModalBtn = document.getElementById('aiTemplateBtn');
    if (!openModalBtn) {
        console.warn('⚠️ Tombol AI Template tidak ditemukan');
        return;
    }
    
    openModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const modal = document.getElementById('templateModal');
        if (!modal) return;
        
        if (!templateData) {
            const modalBody = document.getElementById('modalBody');
            if (modalBody) {
                modalBody.innerHTML = '<div class="loading-templates" style="color:#889988; text-align:center; padding:40px;"><i class="fas fa-spinner fa-pulse"></i> Memuat template...</div>';
            }
            modal.style.display = 'flex';
            modal.classList.add('show');
            loadTemplatesFromGitHub().then(() => {
                if (templateData) {
                    renderModalTabs();
                    renderModalTemplateList();
                }
            });
        } else {
            renderModalTabs();
            renderModalTemplateList();
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    });

    // Tutup modal
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            const modal = document.getElementById('templateModal');
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        });
    }

    // Klik di luar modal
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('templateModal');
        if (modal && e.target === modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    });
}

async function loadTemplatesFromGitHub() {
    try {
        const response = await fetch(TEMPLATE_JSON_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        templateData = data.templates;
        categoryKeys = Object.keys(templateData);
        if (categoryKeys.length > 0) activeTab = categoryKeys[0];
        console.log("✅ Template AI berhasil dimuat:", categoryKeys.length, "kategori");
        renderModalTabs();
        renderModalTemplateList();
        return true;
    } catch (error) {
        console.error("❌ Gagal memuat template:", error);
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = '<div class="loading-templates" style="color:#f44336; text-align:center; padding:40px;">❌ Gagal memuat template. Cek koneksi internet!</div>';
        }
        return false;
    }
}

function renderModalTabs() {
    const modalTabs = document.getElementById('modalTabs');
    if (!modalTabs) return;
    modalTabs.innerHTML = "";
    if (!categoryKeys.length) {
        modalTabs.innerHTML = '<div style="color:#889988; padding:12px; text-align:center;">Memuat kategori...</div>';
        return;
    }
    const selectWrapper = document.createElement('div');
    selectWrapper.style.cssText = 'width:100%; margin-bottom:8px;';
    const selectElement = document.createElement('select');
    selectElement.id = 'categorySelect';
    selectElement.style.cssText = 'width:100%; padding:10px 14px; border-radius:12px; background:#1a2a1f; color:#e6ffe6; border:1px solid rgba(46,204,113,0.2); font-size:14px; cursor:pointer;';
    categoryKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        if (activeTab === key) option.selected = true;
        selectElement.appendChild(option);
    });
    selectElement.onchange = (e) => {
        activeTab = e.target.value;
        renderModalTemplateList();
    };
    selectWrapper.appendChild(selectElement);
    modalTabs.appendChild(selectWrapper);
}

function renderModalTemplateList() {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    if (!templateData || !templateData[activeTab]) {
        modalBody.innerHTML = '<div class="loading-templates" style="color:#889988; text-align:center; padding:40px;">❌ Template tidak ditemukan</div>';
        return;
    }
    const templates = templateData[activeTab];
    if (templates.length === 0) {
        modalBody.innerHTML = '<div class="loading-templates" style="color:#889988; text-align:center; padding:40px;">📭 Belum ada template</div>';
        return;
    }
    let html = '<div class="modal-template-list">';
    templates.forEach((template, idx) => {
        const escapedTemplate = template.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
        const displayTemplate = template.length > 120 ? template.substring(0, 120) + '...' : template;
        html += `
            <div class="modal-template-item" onclick="window.selectTemplate('${escapedTemplate}')">
                <div style="font-size:0.6rem;color:#2ecc71;margin-bottom:4px;">#${idx + 1}</div>
                <div class="modal-template-text">${displayTemplate}</div>
            </div>
        `;
    });
    html += '</div>';
    modalBody.innerHTML = html;
}

window.selectTemplate = async function(template) {
    console.log("✅ Template dipilih:", template.substring(0, 50) + '...');
    const narasiField = document.getElementById('narasi');
    const namaDesa = getNamaDesaTerpilih();
    let finalTemplate = template;
    if (namaDesa) {
        finalTemplate = injectDesaKeNarasi(template, namaDesa);
        finalTemplate = await injectCoordinatesToNarasi(finalTemplate, namaDesa);
    }
    narasiField.value = finalTemplate;
    const modalEl = document.getElementById('templateModal');
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    const event = new Event('input', { bubbles: true });
    narasiField.dispatchEvent(event);
    if (typeof checkInputCompletion === 'function') {
        checkInputCompletion();
    }
    if (typeof showNotification === 'function') {
        showNotification('✅ Template berhasil diterapkan!', 'success');
    }
};

function getNamaDesaTerpilih() {
    const selectDesa = document.getElementById('selectDesa');
    if (!selectDesa) return "";
    const option = selectDesa.options[selectDesa.selectedIndex];
    return option ? option.text : "";
}

function injectDesaKeNarasi(templateText, namaDesa) {
    if (!namaDesa || namaDesa === "") return templateText;
    let hasil = templateText.replace(/\bdesa\b/gi, `Desa ${namaDesa}`);
    hasil = hasil.replace(/\bkelurahan\b/gi, `Kelurahan ${namaDesa}`);
    return hasil;
}

async function injectCoordinatesToNarasi(templateText, desaName) {
    if (!desaName || desaName === "") return templateText;
    const coordInfo = await getCoordinatesForNarasi(desaName);
    if (!coordInfo) return templateText;
    let hasil = templateText;
    hasil = hasil.replace(/\{jumlah_titik\}/g, coordInfo.total);
    hasil = hasil.replace(/\{lat_pertama\}/g, coordInfo.first.lat);
    hasil = hasil.replace(/\{lon_pertama\}/g, coordInfo.first.lon);
    hasil = hasil.replace(/\{elevasi_pertama\}/g, coordInfo.first.elevation || '');
    hasil = hasil.replace(/\{lat_terakhir\}/g, coordInfo.last.lat);
    hasil = hasil.replace(/\{lon_terakhir\}/g, coordInfo.last.lon);
    return hasil;
}

async function getCoordinatesForNarasi(desaName) {
    try {
        const githubUrl = `${GITHUB_URLS.COORDINATES}/${desaName}.json`;
        const response = await fetch(githubUrl + '?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            if (data && data.coordinates && data.coordinates.length > 0) {
                const first = data.coordinates[0];
                const last = data.coordinates[data.coordinates.length - 1];
                return {
                    total: data.coordinates.length,
                    first: first,
                    last: last,
                    desa: data.desa || desaName
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting coordinates for narasi:', error);
        return null;
    }
}

// ============================================================
// FUNGSI SUBMIT LAPORAN (TANPA TELEGRAM)
// ============================================================
function validateSubmission() {
    if (!selectedDesa) { showNotification("Masukkan nama desa terlebih dahulu", "warning"); return false; }
    if (!currentKoordinat) { showNotification("Koordinat tidak valid", "warning"); return false; }
    if (!tanggalWaktu) { showNotification("Isi tanggal dan waktu", "warning"); return false; }
    if (!img.src || !img.complete) { showNotification("Upload foto kegiatan", "warning"); return false; }
    if (!document.getElementById("narasi").value.trim()) { showNotification("Isi narasi kegiatan", "warning"); return false; }
    return true;
}

function isSameDateMonthSubmission() {
    if (!tanggalWaktu) return false;
    const currentDate = new Date(tanggalWaktu);
    return submittedDates.some(dateStr => {
        const date = new Date(dateStr);
        return date.getDate() === currentDate.getDate() && date.getMonth() === currentDate.getMonth();
    });
}

async function processSubmission() {
    if (!validateSubmission()) return;
    if (isSameDateMonthSubmission()) {
        showNotification("⚠ Sudah ada laporan di tanggal dan bulan yang sama!", "warning");
        return;
    }

    const button = document.getElementById("submitBtn");
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    try {
        const canvas = document.getElementById("canvas");
        const imgData = canvas.toDataURL("image/png");
        const narasi = document.getElementById("narasi").value;
        const date = new Date(tanggalWaktu);

        const day = String(date.getDate()).padStart(2, '0');
        const monthNum = String(date.getMonth() + 1);
        const monthName = date.toLocaleDateString('id-ID', { month: 'long' });
        const year = date.getFullYear();
        const desaInfo = normalizeDesaName(selectedDesa);

        const fileNameInsideZipImage = `${desaInfo.cleanName} ${day} ${monthName} ${year} Dukops.png`;
        const fileNameInsideZipNarasi = `${desaInfo.cleanName} ${day} ${monthName} ${year} Narasi.txt`;
        const zipFileName = `${desaInfo.cleanName} ${day} ${monthNum} ${year}.zip`;

        const formattedDate = date.toLocaleDateString('id-ID', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });
        const narasiContent = `${formattedDate}\tBabinsa ${desaInfo.cleanName} ${narasi}`;

        const zip = new JSZip();
        zip.file(fileNameInsideZipNarasi, narasiContent);
        zip.file(fileNameInsideZipImage, imgData.split("base64,")[1], { base64: true });

        const content = await zip.generateAsync({ type: "blob" });

        // 1. Download lokal
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 2. Upload ke Drive (via backend) - TANPA TELEGRAM
        const driveUploaded = await uploadToGoogleDrive(content, zipFileName, selectedDesa, date);

        // 3. Update counter
        const desaData = updateDesaCounter(selectedDesa, zipFileName);

        // 4. Refresh absensi
        if (document.getElementById('attendancePanel').style.display === 'block') {
            setTimeout(() => loadAttendanceData(), 2000);
        }

        if (driveUploaded) {
            showNotification(`✔ Laporan berhasil disimpan (${desaData.count}/${TARGET_LAPORAN} laporan)`, "success");
        } else {
            showNotification(`⚠ Laporan hanya didownload, gagal simpan ke Drive`, "warning");
        }

        if (desaData.count >= 9) {
            showThankYouPopup(desaInfo.cleanName, desaData.count);
        }

        updateCounter();
        saveSubmittedDate(tanggalWaktu);

    } catch (error) {
        console.error("Error:", error);
        showNotification("❌ Gagal mengirim laporan", "error");
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ============================================================
// FUNGSI COUNTER & STORAGE
// ============================================================
function updateCounter() {
    submissionCount++;
    document.getElementById('submissionCounter').textContent = submissionCount;
    localStorage.setItem('dukopsSubmissionCount', submissionCount.toString());
}

function loadDesaCounter() {
    const savedCounter = localStorage.getItem('dukopsDesaCounter');
    desaCounter = savedCounter ? JSON.parse(savedCounter) : {};
}

function updateDesaCounter(desaName, fileName) {
    const date = new Date(tanggalWaktu);
    const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    if (!desaCounter[desaName]) {
        desaCounter[desaName] = { count: 0, files: [], month: monthYear };
    }

    if (desaCounter[desaName].month !== monthYear) {
        desaCounter[desaName] = { count: 1, files: [fileName], month: monthYear };
    } else {
        desaCounter[desaName].count++;
        desaCounter[desaName].files.push(fileName);
        if (desaCounter[desaName].files.length > TARGET_LAPORAN) {
            desaCounter[desaName].files.shift();
        }
    }

    localStorage.setItem('dukopsDesaCounter', JSON.stringify(desaCounter));
    return desaCounter[desaName];
}

function saveSubmittedDate(dateStr) {
    submittedDates.push(dateStr);
    localStorage.setItem('dukopsSubmittedDates', JSON.stringify(submittedDates));
}

function loadLastSubmittedDates() {
    const savedDates = localStorage.getItem('dukopsSubmittedDates');
    submittedDates = savedDates ? JSON.parse(savedDates) : [];
}

function resetAll() {
    if (confirm("Apakah Anda yakin ingin mereset SEMUA data?")) {
        submissionCount = 0;
        document.getElementById('submissionCounter').textContent = '0';
        localStorage.setItem('dukopsSubmissionCount', '0');
        submittedDates = [];
        localStorage.removeItem('dukopsSubmittedDates');
        desaCounter = {};
        localStorage.removeItem('dukopsDesaCounter');
        resetForm();
        showNotification("Semua data telah direset", "success");
    }
}

function resetForm() {
    selectedDesa = "";
    kordinatList = [];
    currentKoordinat = "";
    document.getElementById('selectDesa').value = "";
    document.getElementById('previewDesa').textContent = "";
    document.getElementById('previewKordinat').textContent = "";
    document.getElementById('narasi').value = "";
    document.getElementById('gambar').value = "";
    document.getElementById('tanggalWaktu').value = "";
    document.getElementById('previewGambar').textContent = "";
    updateDesaProfile("");
    checkInputCompletion();
    updatePreview();
    resetCanvas();
}

function resetCanvas() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = Math.round(canvas.width / (16 / 9));
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ============================================================
// FUNGSI NOTIFIKASI
// ============================================================
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function showThankYouPopup(desaName, count) {
    const modal = document.createElement('div');
    modal.className = 'thankyou-popup';
    modal.innerHTML = `
        <div class="thankyou-content">
            <div style="font-size:80px; color:#4CAF50; margin-bottom:20px;"><i class="fas fa-trophy"></i></div>
            <h2 style="color:#9fd49f; margin-bottom:15px; font-size:28px;">🎉 SELAMAT! 🎉</h2>
            <p style="color:#f5f5f5; font-size:18px; line-height:1.5; margin-bottom:20px;">
                <strong>Babinsa ${desaName}</strong><br>
                Telah menyelesaikan <strong>${count} laporan</strong> untuk bulan ini!
            </p>
            <div style="background:rgba(76,175,80,0.2); border:2px solid #4CAF50; border-radius:10px; padding:15px; margin:20px 0; font-size:16px; color:#b2d8b2;">
                <i class="fas fa-check-circle"></i> Target 9 laporan per bulan TERCAPAI!
            </div>
            <button onclick="this.closest('.thankyou-popup').remove()" 
                style="background:linear-gradient(135deg,#4CAF50,#2b4d2b); color:white; border:none; padding:12px 25px; border-radius:8px; font-size:16px; font-weight:bold; cursor:pointer; width:100%;">
                <i class="fas fa-thumbs-up"></i> TERIMA KASIH
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => { if (modal.parentNode) modal.remove(); }, 10000);
}

// ============================================================
// FUNGSI ATTENDANCE (ABSENSI)
// ============================================================
function updateAttendanceButtonState() {
    const button = document.getElementById('showAttendanceBtn');
    if (button) button.disabled = !selectedDesa;
}

function updateAttendanceSelectedDesaLabel() {
    const label = document.getElementById('attendanceSelectedDesaName');
    if (label) label.textContent = selectedDesa ? normalizeDesaName(selectedDesa).cleanName : 'Silahkan Pilih Desa';
}

function showAttendance() {
    const panel = document.getElementById('attendancePanel');
    const button = document.getElementById('showAttendanceBtn');
    if (panel && button) {
        panel.style.display = 'block';
        button.style.display = 'none';
        const now = new Date();
        document.getElementById('attendanceMonthFilter').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        updateAttendanceSelectedDesaLabel();
        loadAttendanceData();
    }
}

function hideAttendance() {
    const panel = document.getElementById('attendancePanel');
    const button = document.getElementById('showAttendanceBtn');
    if (panel && button) {
        panel.style.display = 'none';
        button.style.display = 'block';
    }
}

async function loadAttendanceData() {
    const loading = document.getElementById('attendanceLoading');
    const list = document.getElementById('attendanceList');
    const summary = document.getElementById('attendanceSummary');

    if (!loading || !list) return;
    loading.style.display = 'block';
    list.innerHTML = '';
    if (summary) summary.style.display = 'none';

    try {
        const result = await sendToBackend('listFiles', {
            desaFilter: selectedDesa ? normalizeDesaName(selectedDesa).cleanName : '',
            monthFilter: document.getElementById('attendanceMonthFilter').value,
            readZips: 'true'
        });

        if (result.success) {
            attendanceData = result.files || [];
            const selectedMonth = document.getElementById('attendanceMonthFilter').value;
            if (selectedMonth) {
                const [year, month] = selectedMonth.split('-');
                attendanceData = attendanceData.filter(file => {
                    const fileMonth = file.month || extractMonthYearFromFileName(file.name);
                    return fileMonth === `${year}-${month}`;
                });
            }
            displayAttendanceList(attendanceData);
            displayAttendanceSummary(attendanceData);
        } else {
            loadAttendanceFromFallback();
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        loadAttendanceFromFallback();
    } finally {
        loading.style.display = 'none';
    }
}

function extractMonthYearFromFileName(filename) {
    const match = filename.match(/(\d{1,2})\s+(\d{4})\.zip$/);
    if (match) {
        return `${match[2]}-${match[1].padStart(2, '0')}`;
    }
    return '';
}

function extractDesaFromFileName(filename) {
    const cleanName = filename.replace(/_/g, ' ').replace(/\.zip$/, '').replace(/\s+\d{1,2}\s+\d{4}$/, '').trim();
    const selectDesa = document.getElementById('selectDesa');
    if (!selectDesa) return cleanName;

    for (let i = 1; i < selectDesa.options.length; i++) {
        const option = selectDesa.options[i];
        const desaInfo = normalizeDesaName(option.getAttribute('data-raw-name') || option.text);
        if (cleanName.toLowerCase().includes(desaInfo.cleanName.toLowerCase()) ||
            desaInfo.cleanName.toLowerCase().includes(cleanName.toLowerCase())) {
            return desaInfo.cleanName;
        }
    }
    return cleanName;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadAttendanceFromFallback() {
    const list = document.getElementById('attendanceList');
    const summary = document.getElementById('attendanceSummary');
    if (!list) return;

    const desaData = [];
    for (const [desaName, data] of Object.entries(desaCounter)) {
        if (data.files && data.files.length > 0) {
            data.files.forEach(fileName => {
                desaData.push({ name: fileName, desa: desaName, count: data.count, month: data.month });
            });
        }
    }

    if (desaData.length > 0) {
        attendanceData = desaData.map(item => ({
            name: item.name,
            desa: item.desa,
            size: 0,
            createdTime: new Date().toISOString(),
            webViewLink: '#',
            zipContents: 'Narasi.txt, Dukops.png',
            month: extractMonthYearFromFileName(item.name)
        }));
        displayAttendanceList(attendanceData);
        displayAttendanceSummary(attendanceData);
    } else {
        list.innerHTML = `<div style="text-align:center; color:#a5a5a5; padding:20px;">
            <i class="fas fa-folder-open"></i><br>Tidak ada data laporan<br><small>Silakan kirim laporan terlebih dahulu</small>
        </div>`;
        if (summary) summary.style.display = 'none';
    }
}

function displayAttendanceList(files) {
    const list = document.getElementById('attendanceList');
    if (!list) return;

    if (!files || files.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#a5a5a5; padding:20px;">
            <i class="fas fa-folder-open"></i><br>Tidak ada data laporan<br><small>Silakan kirim laporan terlebih dahulu</small>
        </div>`;
        return;
    }

    const groupedByMonthYear = {};
    files.forEach(file => {
        const monthYear = file.month || extractMonthYearFromFileName(file.name);
        if (!groupedByMonthYear[monthYear]) {
            groupedByMonthYear[monthYear] = { month: monthYear, files: [], desas: new Set() };
        }
        groupedByMonthYear[monthYear].files.push(file);
        groupedByMonthYear[monthYear].desas.add(file.desa || extractDesaFromFileName(file.name));
    });

    const sortedMonths = Object.keys(groupedByMonthYear).sort((a, b) => new Date(b) - new Date(a));
    let html = '';

    sortedMonths.forEach(monthYear => {
        const group = groupedByMonthYear[monthYear];
        const [year, month] = monthYear.split('-');
        const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const monthName = monthNames[parseInt(month) - 1];

        html += `<div class="desa-card" style="margin-bottom:20px;">
            <div class="desa-header" style="background:#cc5500;">
                <div class="desa-name"><i class="fas fa-folder"></i> ${monthName} ${year}</div>
                <div class="desa-count">${group.files.length} laporan | ${group.desas.size} desa</div>
            </div>
            <div class="desa-files">`;

        const filesByDesa = {};
        group.files.forEach(file => {
            const desaName = file.desa || extractDesaFromFileName(file.name);
            if (!filesByDesa[desaName]) filesByDesa[desaName] = [];
            filesByDesa[desaName].push(file);
        });

        Object.entries(filesByDesa).forEach(([desaName, desaFiles]) => {
            const isComplete = desaFiles.length >= TARGET_LAPORAN;
            html += `<div class="desa-card" style="margin:10px 0; border-left:4px solid ${isComplete ? '#4CAF50' : '#FF9800'};">
                <div class="desa-header" style="padding:8px 12px;">
                    <div class="desa-name" style="font-size:14px;">${desaName}</div>
                    <div class="desa-count" style="font-size:12px; color:${isComplete ? '#4CAF50' : '#FF9800'}">${desaFiles.length}/9 laporan</div>
                </div>
                <div class="desa-files" style="padding:5px 12px;">`;

            desaFiles.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
            desaFiles.forEach((file, index) => {
                const date = new Date(file.createdTime);
                const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                const displayIndex = desaFiles.length - index;
                html += `<div class="file-item" style="padding:6px 0;">
                    <div class="file-info">
                        <div style="flex:1;">
                            <div class="file-name" style="font-size:13px;">${displayIndex}. ${file.name}</div>
                            <div class="file-meta">** ${dateStr} ** ${file.size ? formatFileSize(file.size) : 'Ukuran tidak tersedia'}</div>
                            ${file.zipContents ? `<div class="file-zip">** Isi ZIP: ${file.zipContents}</div>` : ''}
                        </div>
                    </div>
                </div>`;
            });

            html += `</div></div>`;
        });

        html += `</div></div>`;
    });

    list.innerHTML = html;
}

function displayAttendanceSummary(files) {
    const summary = document.getElementById('attendanceSummary');
    const totalReports = document.getElementById('totalReports');
    const totalDesa = document.getElementById('totalDesa');
    const targetStatus = document.getElementById('targetStatus');

    if (!summary || !files || files.length === 0) {
        if (summary) summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    if (totalReports) totalReports.textContent = files.length;

    const uniqueDesas = new Set();
    files.forEach(file => {
        uniqueDesas.add(file.desa || extractDesaFromFileName(file.name));
    });
    if (totalDesa) totalDesa.textContent = uniqueDesas.size;

    const desaCounts = {};
    files.forEach(file => {
        const desaName = file.desa || extractDesaFromFileName(file.name);
        desaCounts[desaName] = (desaCounts[desaName] || 0) + 1;
    });

    let totalAchieved = 0;
    Object.values(desaCounts).forEach(count => {
        totalAchieved += Math.min(count, TARGET_LAPORAN);
    });
    const totalPossible = uniqueDesas.size * TARGET_LAPORAN;
    const achievementPercent = totalPossible > 0 ? (totalAchieved / totalPossible * 100) : 0;

    if (targetStatus) {
        targetStatus.textContent = `${achievementPercent.toFixed(1)}%`;
        targetStatus.style.color = achievementPercent >= 100 ? '#4CAF50' : achievementPercent >= 70 ? '#FF9800' : '#f44336';
    }
}

// ============================================================
// FUNGSI NAVIGASI
// ============================================================
function showDukops() {
    document.getElementById('dukopsContent').style.display = 'block';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.add('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.remove('active');
}

function showJadwalPiketBaru() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'block';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.add('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.remove('active');

    if (!window._jadwalInitialized) {
        window._jadwalInitialized = true;
        initJadwalBaru();
    }
}

function showAbsenTab() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'block';
    document.getElementById('hanpanganContent').style.display = 'none';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.add('active');
    document.getElementById('btnHanpangan').classList.remove('active');
}

function showHanpangan() {
    document.getElementById('dukopsContent').style.display = 'none';
    document.getElementById('jadwalPiketContainerBaru').style.display = 'none';
    document.getElementById('absenContent').style.display = 'none';
    document.getElementById('hanpanganContent').style.display = 'block';
    document.getElementById('btnDukops').classList.remove('active');
    document.getElementById('btnJadwal').classList.remove('active');
    document.getElementById('btnAbsen').classList.remove('active');
    document.getElementById('btnHanpangan').classList.add('active');
    if (typeof window.triggerPlayMusic === 'function') window.triggerPlayMusic();
}

// ============================================================
// FUNGSI JADWAL PIKET (SUPABASE + GITHUB)
// ============================================================
const SUPABASE_URL = 'https://wausfsflcehizpuqdwbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhdXNmc2ZsY2VoaXpwdXFkd2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMTA3ODQsImV4cCI6MjA5ODY4Njc4NH0.2zF7iogzuTwWoQc451-uKxQdNN1C-qkB0O9Jvz1ZoI0';

let supabaseClient = null;
let isSupabaseConnected = false;
let autoSaveTimer = null;
const JADWAL_DROPDOWN_IDS = ['j_nama1a_baru', 'j_nama1b_baru', 'j_nama2a_baru', 'j_nama2b_baru',
    'j_nama3a_baru', 'j_nama3b_baru', 'j_nama3c_baru', 'j_nama3d_baru',
    'j_nama4a_baru', 'j_nama4b_baru', 'j_nama4c_baru', 'j_nama4d_baru'
];

let JadwalData2 = { daftarNama: [], daftarHanpangan: [], currentHanpangan: "" };

function updateIndicator(status, message) {
    const indicator = document.getElementById('supabaseIndicator');
    if (!indicator) return;
    indicator.classList.remove('indicator-online', 'indicator-offline', 'indicator-checking');
    if (status === 'online') {
        indicator.classList.add('indicator-online');
        indicator.title = '🟢 Supabase Terhubung';
    } else if (status === 'offline') {
        indicator.classList.add('indicator-offline');
        indicator.title = '🔴 Supabase Terputus';
    } else {
        indicator.classList.add('indicator-checking');
        indicator.title = '📡 Menghubungkan...';
    }
    const tooltip = indicator.querySelector('.indicator-tooltip');
    if (tooltip) tooltip.textContent = message || (status === 'online' ? 'Terhubung' : 'Terputus');
}

function fetchFromGitHub(url) {
    return new Promise(resolve => {
        fetch(url + '?t=' + new Date().getTime())
            .then(res => res.ok ? res.text() : null)
            .then(data => resolve(data))
            .catch(() => resolve(null));
    });
}

function loadPiketData() {
    return fetchFromGitHub(GITHUB_URLS.PIKET).then(data => {
        if (data) {
            JadwalData2.daftarNama = data.trim().split('\n').filter(l => l.trim()).map(n => n.trim());
            JADWAL_DROPDOWN_IDS.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
                    JadwalData2.daftarNama.forEach(nama => {
                        const opt = document.createElement('option');
                        opt.value = nama;
                        opt.textContent = nama;
                        select.appendChild(opt);
                    });
                    if (currentValue) select.value = currentValue;
                }
            });
            return true;
        }
        return false;
    });
}

function loadHanpanganData() {
    return fetchFromGitHub(GITHUB_URLS.HANPANGAN).then(data => {
        if (data) {
            const lines = data.trim().split('\n').filter(l => l.trim());
            if (lines.length) {
                JadwalData2.daftarHanpangan = lines;
                const today = new Date();
                const epochDays = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
                const referenceDate = new Date(2024, 0, 1);
                const epochDaysRef = Math.floor(referenceDate.getTime() / (24 * 60 * 60 * 1000));
                let offset = (0 - epochDaysRef) % lines.length;
                if (offset < 0) offset += lines.length;
                let index = (epochDays + offset) % lines.length;
                if (index < 0) index += lines.length;
                JadwalData2.currentHanpangan = lines[index];
                updateRunningText();
                return true;
            }
        }
        return false;
    });
}

function updateRunningText() {
    const el = document.getElementById('runningTextJadwalBaru');
    if (el) el.textContent = '🌾 JADWAL HANPANGAN HARI INI: ' + JadwalData2.currentHanpangan + ' 🌾';
}

function formatTanggal(date) {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
}

function formatDateDB(date) {
    return date.toISOString().split('T')[0];
}

function updateTanggalInfo() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const infoEl = document.getElementById('tanggalInfo');
    if (infoEl) {
        infoEl.textContent = '📅 Hari Ini: ' + formatTanggal(now) + ' | Besok: ' + formatTanggal(tomorrow);
    }
}

function updatePreviewJadwal() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const getVal = (id) => document.getElementById(id)?.value || "";

    const sections = [
        { names: [getVal('j_nama1a_baru'), getVal('j_nama1b_baru')], title: formatTanggal(now), suffix: "" },
        { names: [getVal('j_nama2a_baru'), getVal('j_nama2b_baru')], title: formatTanggal(tomorrow), suffix: "" },
        { names: [getVal('j_nama3a_baru'), getVal('j_nama3b_baru')], title: formatTanggal(now), suffix: " (Kediaman)" },
        { names: [getVal('j_nama3c_baru'), getVal('j_nama3d_baru')], title: formatTanggal(tomorrow), suffix: " (Kediaman)" },
        { names: [getVal('j_nama4a_baru'), getVal('j_nama4b_baru')], title: formatTanggal(now), suffix: " (Makodim)" },
        { names: [getVal('j_nama4c_baru'), getVal('j_nama4d_baru')], title: formatTanggal(tomorrow), suffix: " (Makodim)" }
    ];

    let result = "_____________________________\n*KORAMIL 1609-05/SUKASADA*\n    *JADWAL DINAS DALAM*\n_____________________________\n\n";
    let sectionCount = 0;

    for (const s of sections) {
        const valid = s.names.filter(n => n && n.trim());
        if (valid.length) {
            result += String.fromCharCode(65 + sectionCount) + ". " + s.title + s.suffix + "\n";
            valid.forEach((n, i) => result += "   " + (i + 1) + ". " + n + "\n");
            result += "\n";
            sectionCount++;
        }
    }

    if (JadwalData2.currentHanpangan) {
        result += "*🌾Jadwal Hanpangan hari ini :* " + JadwalData2.currentHanpangan + "\n\n";
    }
    result += "*Demikian MMP.*";

    const preview = document.getElementById('j_hasilPesanBaru');
    if (preview) {
        preview.value = result;
        setTimeout(() => {
            preview.style.height = 'auto';
            preview.style.height = preview.scrollHeight + 'px';
        }, 10);
    }
}

function triggerAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    updatePreviewJadwal();
    autoSaveTimer = setTimeout(() => {
        if (isSupabaseConnected) autoSaveToSupabase();
    }, 1500);
}

async function autoSaveToSupabase() {
    if (!supabaseClient || !isSupabaseConnected) return;
    try {
        const getVal = (id) => document.getElementById(id)?.value.trim() || '';
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const todayStr = formatDateDB(now);
        const tomorrowStr = formatDateDB(tomorrow);

        const jadwalList = [
            { tanggal: todayStr, jenis: 'koramil_hari_ini', nama1: getVal('j_nama1a_baru'), nama2: getVal('j_nama1b_baru') },
            { tanggal: tomorrowStr, jenis: 'koramil_besok', nama1: getVal('j_nama2a_baru'), nama2: getVal('j_nama2b_baru') },
            { tanggal: todayStr, jenis: 'kediaman_hari_ini', nama1: getVal('j_nama3a_baru'), nama2: getVal('j_nama3b_baru') },
            { tanggal: tomorrowStr, jenis: 'kediaman_besok', nama1: getVal('j_nama3c_baru'), nama2: getVal('j_nama3d_baru') },
            { tanggal: todayStr, jenis: 'makodim_hari_ini', nama1: getVal('j_nama4a_baru'), nama2: getVal('j_nama4b_baru') },
            { tanggal: tomorrowStr, jenis: 'makodim_besok', nama1: getVal('j_nama4c_baru'), nama2: getVal('j_nama4d_baru') }
        ];

        const validJadwal = jadwalList.filter(j => j.nama1 || j.nama2);
        if (validJadwal.length === 0) return;

        await supabaseClient.from('jadwal_piket').delete()
            .or(`tanggal_jadwal.eq.${todayStr},tanggal_jadwal.eq.${tomorrowStr}`);

        for (const jadwal of validJadwal) {
            await supabaseClient.from('jadwal_piket').insert([{
                tanggal_jadwal: jadwal.tanggal,
                jenis: jadwal.jenis,
                nama1: jadwal.nama1 || null,
                nama2: jadwal.nama2 || null,
                tanggal_input: new Date().toISOString()
            }]);
        }

        document.getElementById('previewInfo').textContent = '✅ Auto-saved ke Supabase';
        document.getElementById('previewInfo').style.color = '#4caf50';
        setTimeout(() => {
            document.getElementById('previewInfo').textContent = '✅ Data dari Supabase';
        }, 2000);
    } catch (error) {
        console.error('❌ Auto-save error:', error);
    }
}

async function loadDataFromSupabase() {
    if (!supabaseClient || !isSupabaseConnected) return;
    try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const todayStr = formatDateDB(now);
        const tomorrowStr = formatDateDB(tomorrow);

        const { data, error } = await supabaseClient
            .from('jadwal_piket')
            .select('*')
            .or(`tanggal_jadwal.eq.${todayStr},tanggal_jadwal.eq.${tomorrowStr}`)
            .order('tanggal_jadwal', { ascending: true });

        if (error) throw error;

        JADWAL_DROPDOWN_IDS.forEach(id => {
            const select = document.getElementById(id);
            if (select) select.value = '';
        });

        if (data && data.length > 0) {
            const mapping = {
                'koramil_hari_ini': ['j_nama1a_baru', 'j_nama1b_baru'],
                'koramil_besok': ['j_nama2a_baru', 'j_nama2b_baru'],
                'kediaman_hari_ini': ['j_nama3a_baru', 'j_nama3b_baru'],
                'kediaman_besok': ['j_nama3c_baru', 'j_nama3d_baru'],
                'makodim_hari_ini': ['j_nama4a_baru', 'j_nama4b_baru'],
                'makodim_besok': ['j_nama4c_baru', 'j_nama4d_baru']
            };

            data.forEach(item => {
                const ids = mapping[item.jenis];
                if (ids) {
                    if (item.nama1) {
                        const select1 = document.getElementById(ids[0]);
                        if (select1 && JadwalData2.daftarNama.includes(item.nama1)) select1.value = item.nama1;
                    }
                    if (item.nama2) {
                        const select2 = document.getElementById(ids[1]);
                        if (select2 && JadwalData2.daftarNama.includes(item.nama2)) select2.value = item.nama2;
                    }
                }
            });

            document.getElementById('previewInfo').textContent = '✅ Data dari Supabase (' + data.length + ' item)';
            document.getElementById('previewInfo').style.color = '#4caf50';
        } else {
            document.getElementById('previewInfo').textContent = '📭 Belum ada data, silakan pilih nama';
            document.getElementById('previewInfo').style.color = '#ff9800';
        }
        updatePreviewJadwal();
    } catch (error) {
        console.error('❌ Error load data:', error);
        document.getElementById('previewInfo').textContent = '❌ Gagal memuat data';
        document.getElementById('previewInfo').style.color = '#f44336';
    }
}

async function initSupabase() {
    updateIndicator('checking', 'Menghubungkan...');
    try {
        if (typeof supabase === 'undefined') {
            updateIndicator('offline', 'SDK tidak ditemukan');
            return false;
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await supabaseClient.from('jadwal_piket').select('id').limit(1);
        if (error) {
            updateIndicator('offline', 'Error: ' + error.message);
            isSupabaseConnected = false;
            return false;
        }
        isSupabaseConnected = true;
        updateIndicator('online', 'Terhubung!');
        await loadDataFromSupabase();
        return true;
    } catch (error) {
        console.error('❌ Error init:', error);
        updateIndicator('offline', 'Gagal konek');
        isSupabaseConnected = false;
        return false;
    }
}

async function initJadwalBaru() {
    console.log('🔍 Inisialisasi Jadwal...');
    updateTanggalInfo();

    JADWAL_DROPDOWN_IDS.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', triggerAutoSave);
    });

    const btn = document.getElementById('whatsappBtnBaru');
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const preview = document.getElementById('j_hasilPesanBaru');
            if (preview && preview.value) {
                window.open("https://wa.me/?text=" + encodeURIComponent(preview.value), "_blank");
            }
        });
    }

    await loadPiketData();
    await loadHanpanganData();
    updatePreviewJadwal();
    await initSupabase();
    console.log('✅ Jadwal siap!');
}

// ============================================================
// FUNGSI TAB ABSEN (HTML2CANVAS)
// ============================================================
window.shareAsPNGAbsen = async function() {
    var btn = document.getElementById('downloadAbsenBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMBUAT PNG...';
    }

    var resultContainer = document.getElementById('absenResultContainer');
    if (!resultContainer || !resultContainer.innerHTML || resultContainer.innerHTML.includes('Pilih tahun')) {
        alert('⚠️ Silakan pilih Tahun dan Bulan terlebih dahulu!');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
        return;
    }

    try {
        var element = document.querySelector('.absen-card');
        if (!element) {
            var cards = document.querySelectorAll('.absen-card');
            if (cards.length > 0) element = cards[0];
        }

        if (!element) {
            alert('⚠️ Tidak ada data absen untuk di-download!');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG'; }
            return;
        }

        var canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            allowTaint: true
        });

        var link = document.createElement('a');
        var fileName = 'Absensi_DUKOPS_' + new Date().toISOString().split('T')[0] + '.png';
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ Download PNG berhasil:', fileName);
    } catch (e) {
        console.error('❌ Gagal screenshot:', e);
        alert('❌ Gagal membuat gambar: ' + e.message);
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD ABSEN PNG';
    }
};

// ============================================================
// INITIALIZE
// ============================================================
console.log('🚀 DUKOPS Complete v3.0 (Tanpa Telegram) loaded');
console.log('📁 Folder ID:', '1fZBe0ICQEmcIx2dIpsiOCZIMmkbZIkVQ');
console.log('🔗 Backend URL:', GOOGLE_APPS_SCRIPT_WEBHOOK);