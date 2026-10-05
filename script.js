let currentSearchResults = [];
let lastPlayed = JSON.parse(localStorage.getItem('musinyx_lastPlayed')) || [];
let allPlaylists = JSON.parse(localStorage.getItem('musinyx_playlists')) || [];
let likedSongs = JSON.parse(localStorage.getItem('musinyx_liked')) || []; 

let currentlyPlayingSong = null; 
let currentQueue = [];
let currentQueueIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('viewAuth').style.display = 'none'; 
    renderLastPlayed();
    renderFavorites();
    setupAudioPlayer();
    
    // LANGSUNG LOAD BERANDA YOUTUBE MUSIC
    loadHomeData(); 
});

function switchView(viewName) {
    const views = ['viewHome', 'viewSearch', 'viewPlaylists', 'viewFavorites'];
    views.forEach(v => document.getElementById(v).style.display = 'none');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if(viewName === 'home') {
        document.getElementById('viewHome').style.display = 'block';
        document.getElementById('navHome').classList.add('active');
        renderLastPlayed();
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
// PENCARIAN & BERANDA (VIA VERCEL)
// ==========================================
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
                secDiv.innerHTML = `<h3 class="section-title" style="margin-top: 30px;">${section.title}</h3>`;
                
                const list = document.createElement("div");
                list.className = "list-container";
                
                section.contents.forEach((item, idx) => {
                    // Cuma render item yang punya videoId (Lagu)
                    if(!item.videoId) return; 
                    
                    const songObj = {
                        name: item.title || item.name,
                        artists: item.artists ? item.artists.map(a => a.name).join(", ") : "Unknown",
                        cover: item.thumbnails ? item.thumbnails[item.thumbnails.length - 1].url : 'https://via.placeholder.com/150',
                        videoId: item.videoId
                    };

                    const songDiv = document.createElement("div");
                    songDiv.className = "list-item";
                    songDiv.onclick = () => initPlay(songObj, [songObj], 0);
                    songDiv.innerHTML = `
                        <img src="${songObj.cover}" alt="Cover">
                        <div class="info">
                            <div class="title">${songObj.name}</div>
                            <div class="artist">${songObj.artists}</div>
                        </div>
                    `;
                    list.appendChild(songDiv);
                });
                
                secDiv.appendChild(list);
                container.appendChild(secDiv);
            });
        } else {
            container.innerHTML = `<p class="empty-state">No recommendations found.</p>`;
        }
    } catch (error) {
        console.error("Home Error:", error);
        container.innerHTML = `<p class="empty-state">Gagal memuat beranda.</p>`;
    }
}

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

        if (data.status === "success" && data.data && data.data.length > 0) {
            statusText.innerText = "";
            currentSearchResults = data.data.map(item => ({
                name: item.title,
                artists: item.artist,
                cover: item.coverArt,
                albumName: item.album,
                videoId: item.id
            }));
            renderSearchResults();
        } else { 
            statusText.innerText = "No songs found."; 
        }
    } catch (error) { 
        console.error("Search Error:", error);
        statusText.innerText = "Gagal nyari lagu. Cek koneksi Vercel lu."; 
    }
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
        item.innerHTML = `
            <img src="${song.cover}" alt="Cover">
            <div class="info"><div class="title">${song.name}</div><div class="artist">${song.artists}</div></div>
        `;
        container.appendChild(item);
    });
}

function renderLastPlayed() {
    const container = document.getElementById("lastPlayedContainer");
    container.innerHTML = "";
    if (lastPlayed.length === 0) { container.innerHTML = `<p class="empty-state">No recently played songs.</p>`; return; }
    
    lastPlayed.forEach((song, index) => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.onclick = () => initPlay(song, lastPlayed, index);
        item.innerHTML = `
            <img src="${song.cover}" alt="Cover">
            <div class="info"><div class="title">${song.name}</div><div class="artist">${song.artists}</div></div>
        `;
        container.appendChild(item);
    });
}

function renderFavorites() {
    const container = document.getElementById("favoritesContainer");
    container.innerHTML = "";
    if (likedSongs.length === 0) { container.innerHTML = `<p class="empty-state">No favorite songs yet.</p>`; return; }
    
    likedSongs.forEach((song, index) => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.onclick = () => initPlay(song, likedSongs, index);
        item.innerHTML = `
            <img src="${song.cover}" alt="Cover">
            <div class="info"><div class="title">${song.name}</div><div class="artist">${song.artists}</div></div>
        `;
        container.appendChild(item);
    });
}

// ==========================================
// PLAYER AUDIO (Nembak Stream Proxy Vercel)
// ==========================================
function initPlay(song, contextQueue, index) {
    currentQueue = contextQueue;
    currentQueueIndex = index;
    fetchAndPlayAudio(song);
}

async function fetchAndPlayAudio(songObj) {
    try {
        let vidId = songObj.videoId;
        const audioUrl = `/api/musinyx?action=stream&id=${vidId}`;
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
    
    const npImg = document.getElementById("nowPlayingImg");
    if (npImg) npImg.src = songObj.cover;
    
    const npTitle = document.getElementById("nowPlayingTitle");
    if (npTitle) npTitle.innerText = songObj.name;
    
    const npArtist = document.getElementById("nowPlayingArtist");
    if (npArtist) npArtist.innerText = songObj.artists;
    
    const audioPlayer = document.getElementById("audioPlayer");
    if (audioPlayer) {
        audioPlayer.src = audioUrl;
        audioPlayer.play();
    }
    
    const playerContainer = document.getElementById("playerContainer");
    if (playerContainer) playerContainer.classList.add("show");
    
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.className = "fas fa-pause";
}

function togglePlay() {
    const audioPlayer = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playPauseBtn');
    if (audioPlayer.paused && audioPlayer.src) {
        audioPlayer.play();
        playBtn.className = "fas fa-pause";
    } else if (!audioPlayer.paused) {
        audioPlayer.pause();
        playBtn.className = "fas fa-play";
    }
}

function playNext() {
    if(currentQueueIndex < currentQueue.length - 1) {
        currentQueueIndex++;
        fetchAndPlayAudio(currentQueue[currentQueueIndex]);
    }
}

function setupAudioPlayer() {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.addEventListener('ended', () => { playNext(); });
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            const progressEl = document.getElementById('playerProgress');
            if (progressEl) progressEl.style.width = progressPercent + '%';
        }
    });
}
