let currentSearchResults = [];
let lastPlayed = JSON.parse(localStorage.getItem('musinyx_lastPlayed')) || [];
let likedSongs = JSON.parse(localStorage.getItem('musinyx_liked')) || []; 

let currentlyPlayingSong = null; 
let currentQueue = [];
let currentQueueIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('viewAuth').style.display = 'none'; 
    renderLastPlayed();
    setupAudioPlayer();
    loadHomeData(); 
});

function switchView(viewName) {
    const views = ['viewHome', 'viewSearch', 'viewPlaylists', 'viewFavorites'];
    views.forEach(v => document.getElementById(v).style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if(viewName === 'home') {
        document.getElementById('viewHome').style.display = 'block';
        document.getElementById('navHome').classList.add('active');
    } else if(viewName === 'search') {
        document.getElementById('viewSearch').style.display = 'block';
    } else if(viewName === 'playlists') {
        document.getElementById('viewPlaylists').style.display = 'block';
        document.getElementById('navPlaylist').classList.add('active');
    } else if(viewName === 'favorites') {
        document.getElementById('viewFavorites').style.display = 'block';
        document.getElementById('navFavorites').classList.add('active');
        renderFavorites();
    }
}

function handleSearchInput() {
    if(document.getElementById("searchInput").value.trim() === "") switchView('home');
}
function handleEnter(event) { if (event.key === "Enter") searchSong(); }

// ==========================================
// PENCARIAN & BERANDA (VIA VERCEL PROXY)
// ==========================================
async function searchSong() {
    const rawQuery = document.getElementById("searchInput").value.trim();
    const statusText = document.getElementById("statusText");
    if (!rawQuery) return;

    switchView('search');
    statusText.innerText = "Searching..";
    document.getElementById("resultsContainer").innerHTML = "";

    try {
        const response = await fetch(`/api/musinyx?action=search&q=${encodeURIComponent(rawQuery)}`);
        const data = await response.json();

        if (data.status === "success" && data.data) {
            statusText.innerText = "";
            currentSearchResults = data.data.map(item => ({
                name: item.title, artists: item.artist, cover: item.coverArt, videoId: item.id
            }));
            renderSearchResults();
        } else { statusText.innerText = "No songs found."; }
    } catch (e) { statusText.innerText = "Error API."; }
}

async function loadHomeData() {
    const container = document.getElementById("homeSectionsContainer");
    container.innerHTML = `<p class="empty-state">Loading recommendations...</p>`;
    
    try {
        const response = await fetch(`/api/musinyx?action=home`);
        const result = await response.json();

        if (result.status === "success" && result.data) {
            container.innerHTML = "";
            result.data.forEach(section => {
                if (!section.contents || section.contents.length === 0) return;
                
                const secDiv = document.createElement("div");
                secDiv.innerHTML = `<h3 class="section-title">${section.title}</h3>`;
                
                const list = document.createElement("div");
                list.className = "horizontal-scroll-container";
                
                const sectionQueue = []; 
                
                section.contents.forEach((item) => {
                    if(!item.videoId) return; 
                    const songObj = {
                        name: item.title || item.name,
                        artists: item.artists ? item.artists.map(a => a.name).join(", ") : "Unknown",
                        cover: item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : 'https://via.placeholder.com/150',
                        videoId: item.videoId
                    };
                    sectionQueue.push(songObj);
                });

                sectionQueue.forEach((songObj, idx) => {
                    const cardDiv = document.createElement("div");
                    cardDiv.className = "card-item";
                    cardDiv.onclick = () => initPlay(songObj, sectionQueue, idx);
                    cardDiv.innerHTML = `
                        <img src="${songObj.cover}" alt="Cover">
                        <div class="title">${songObj.name}</div>
                        <div class="artist">${songObj.artists}</div>
                    `;
                    list.appendChild(cardDiv);
                });
                
                if(sectionQueue.length > 0) {
                    secDiv.appendChild(list);
                    container.appendChild(secDiv);
                }
            });
        }
    } catch (e) { container.innerHTML = `<p class="empty-state">Failed to load Home.</p>`; }
}

// ==========================================
// RENDER UI LISTING
// ==========================================
function renderSearchResults() {
    const container = document.getElementById("resultsContainer");
    container.innerHTML = "";
    currentSearchResults.forEach((song, index) => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.onclick = () => initPlay(song, currentSearchResults, index);
        item.innerHTML = `<img src="${song.cover}"><div class="info"><div class="title">${song.name}</div><div class="artist">${song.artists}</div></div>`;
        container.appendChild(item);
    });
}

function renderLastPlayed() {
    const container = document.getElementById("lastPlayedContainer");
    container.innerHTML = "";
    if (lastPlayed.length === 0) { container.innerHTML = `<p class="empty-state">No history.</p>`; return; }
    
    lastPlayed.forEach((song, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card-item";
        cardDiv.onclick = () => initPlay(song, lastPlayed, index);
        cardDiv.innerHTML = `<img src="${song.cover}"><div class="title">${song.name}</div><div class="artist">${song.artists}</div>`;
        container.appendChild(cardDiv);
    });
}

// ==========================================
// PLAYER AUDIO (LANGSUNG NEMBAK PTERODACTYL)
// ==========================================
function initPlay(song, contextQueue, index) {
    currentQueue = contextQueue;
    currentQueueIndex = index;
    fetchAndPlayAudio(song);
}

async function fetchAndPlayAudio(songObj) {
    try {
        let vidId = songObj.videoId;
        
        // LANGSUNG NEMBAK KE IP VPS PTERODACTYL BIAR GAK ERROR DOMException
        const audioUrl = `http://143.198.214.247:25583/stream/${vidId}`;
        console.log("MEMUTAR URL:", audioUrl);
        
        lastPlayed = lastPlayed.filter(s => s.videoId !== songObj.videoId);
        lastPlayed.unshift(songObj);
        if (lastPlayed.length > 20) lastPlayed.pop();
        localStorage.setItem('musinyx_lastPlayed', JSON.stringify(lastPlayed));
        if (document.getElementById('viewHome').style.display === 'block') renderLastPlayed();

        updatePlayerUI(audioUrl, songObj);
    } catch (error) {
        console.error("DEBUG ERROR:", error);
    }
}

function updatePlayerUI(audioUrl, songObj) {
    currentlyPlayingSong = songObj;
    
    // Update Mini Player
    document.getElementById("nowPlayingImg").src = songObj.cover;
    document.getElementById("nowPlayingTitle").innerText = songObj.name;
    document.getElementById("nowPlayingArtist").innerText = songObj.artists;
    
    // Update Fullscreen Player
    document.getElementById("npCover").src = songObj.cover;
    document.getElementById("npTitle").innerText = songObj.name;
    document.getElementById("npArtist").innerText = songObj.artists;

    const audioPlayer = document.getElementById("audioPlayer");
    if (audioPlayer) {
        // PAUSE DULU BIAR GAK TABRAKAN
        audioPlayer.pause();
        audioPlayer.src = audioUrl;
        
        // KASIH DELAY DIKIT SEBELUM PLAY
        setTimeout(() => {
            audioPlayer.play().catch(e => console.log("Play interrupted:", e));
        }, 50);
    }
    
    document.getElementById("playerContainer").classList.add("show");
    document.getElementById('playPauseBtn').className = "fas fa-pause";
    document.getElementById('npPlayPauseBtn').className = "fas fa-pause";
}

function togglePlay() {
    const audioPlayer = document.getElementById('audioPlayer');
    const isPaused = audioPlayer.paused;
    if (isPaused && audioPlayer.src) {
        audioPlayer.play().catch(e => console.log(e));
    } else if (!isPaused) {
        audioPlayer.pause();
    }
    
    const iconClass = audioPlayer.paused ? "fas fa-play" : "fas fa-pause";
    document.getElementById('playPauseBtn').className = iconClass;
    document.getElementById('npPlayPauseBtn').className = iconClass;
}

function playNext(reverse = false) {
    if(!reverse && currentQueueIndex < currentQueue.length - 1) {
        currentQueueIndex++;
        fetchAndPlayAudio(currentQueue[currentQueueIndex]);
    } else if(reverse && currentQueueIndex > 0) {
        currentQueueIndex--;
        fetchAndPlayAudio(currentQueue[currentQueueIndex]);
    }
}

function setupAudioPlayer() {
    const audioPlayer = document.getElementById('audioPlayer');
    const seekbar = document.getElementById('npSeekbar');
    
    audioPlayer.addEventListener('ended', () => { playNext(); });
    
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            document.getElementById('playerProgress').style.width = progressPercent + '%';
            seekbar.value = progressPercent;
            document.getElementById('npCurrentTime').innerText = formatTime(audioPlayer.currentTime);
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        document.getElementById('npTotalTime').innerText = formatTime(audioPlayer.duration);
    });

    seekbar.addEventListener('input', () => {
        if(audioPlayer.duration) audioPlayer.currentTime = (seekbar.value / 100) * audioPlayer.duration;
    });
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0'+min : min}:${sec < 10 ? '0'+sec : sec}`;
}

// FULLSCREEN PLAYER CONTROLS
function openNowPlaying() { document.getElementById('viewNowPlaying').classList.remove('hidden'); }
function closeNowPlaying() { document.getElementById('viewNowPlaying').classList.add('hidden'); }
