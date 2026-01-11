import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyBiN8FqX8UZeyAh1cG2GHZtQWiQH0xPBV4", 
    authDomain: "rephone-a0a80.firebaseapp.com", 
    projectId: "rephone-a0a80", 
    storageBucket: "rephone-a0a80.firebasestorage.app", 
    appId: "1:431497247030:web:a943715e4acc04b8995b97" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let todosAnuncios = [];
let userLat = null, userLng = null;

// --- INTERFACE ---
window.toggleMenu = () => document.getElementById('mobileMenu').classList.toggle('active');
window.toggleBusca = () => document.getElementById('buscaManualBox').classList.toggle('open');
window.fecharMatch = () => document.getElementById('matchPopup').classList.remove('active');
window.fazerLogout = () => signOut(auth).then(() => window.location.reload());

// --- LOGIN & REDIRECIONAMENTO ---
onAuthStateChanged(auth, async (user) => {
    const menuGuest = document.getElementById('menuGuest');
    const menuLogged = document.getElementById('menuLogged');
    if (user) {
        if(menuGuest) menuGuest.style.display = 'none';
        if(menuLogged) menuLogged.style.display = 'flex';
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('goto') === 'compras') window.location.href = 'minhas-compras.html';
        if (params.get('returnId')) window.location.href = 'anuncio.html?id=' + params.get('returnId');
    } else {
        if(menuGuest) menuGuest.style.display = 'flex';
        if(menuLogged) menuLogged.style.display = 'none';
    }
});

// --- LOCALIZAÇÃO ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

navigator.geolocation.getCurrentPosition((pos) => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    renderizar(todosAnuncios);
}, null, { timeout: 5000 });

// --- DADOS ---
onSnapshot(collection(db, "anuncios"), (snap) => {
    todosAnuncios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizar(todosAnuncios.filter(ad => ad.status === "aprovado" || ad.statusAnuncio === "aprovado"));
});

function renderizar(lista) {
    const grid = document.getElementById('radarGrid');
    if(!grid) return;
    grid.innerHTML = "";
    
    lista.forEach(ad => {
        const isVendido = ad.statusVenda === "vendido";
        let distHtml = "";
        let locMetodo = ad.coords?.metodo === "gps" ? "Confirmada" : "Aproximada";
        
        if (userLat && ad.coords?.lat) {
            const d = calcularDistancia(userLat, userLng, ad.coords.lat, ad.coords.lon);
            distHtml = ` • ${d}km`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <a href="anuncio.html?id=${ad.id}" style="text-decoration:none; color:inherit;">
                <div class="img-container">
                    ${isVendido ? '<div class="badge-vendido">VENDIDO</div>' : ''}
                    <img src="${ad.fotos?.[0] || ''}" style="filter:${isVendido ? 'grayscale(1)' : 'none'}">
                </div>
                <h3>${ad.modelo}</h3>
                <div style="font-size:10px; color:#64748b; margin-bottom:5px;">
                    ${ad.capacidade || '--'} • Bateria ${ad.bateria || '--'}% • ${ad.condicao || 'Usado'}
                </div>
                <div style="font-size:10px; color:#16a34a; font-weight:700;">
                    📍 ${ad.cidade || 'Região'} (${locMetodo})${distHtml}
                </div>
                <div class="price-tag">R$ ${parseFloat(ad.preco || 0).toLocaleString('pt-br', {minimumFractionDigits:2})}</div>
            </a>`;
        grid.appendChild(card);
    });
}
