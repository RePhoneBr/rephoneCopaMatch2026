import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
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
let usuarioLogado = null;

// --- REDIRECIONAMENTO E AUTH ---
onAuthStateChanged(auth, async (user) => {
    usuarioLogado = user;
    const guest = document.getElementById('menuGuest');
    const logged = document.getElementById('menuLogged');
    const greet = document.getElementById('greeting');

    if (user) {
        if(guest) guest.style.display = 'none';
        if(logged) logged.style.display = 'flex';
        
        // CORREÇÃO DO LOOP: Só redireciona se houver parâmetro na URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('goto') === 'compras') {
            window.location.href = 'minhas-compras.html';
            return;
        }
        if (params.get('returnId')) {
            window.location.href = `anuncio.html?id=${params.get('returnId')}`;
            return;
        }

        try {
            const vDoc = await getDoc(doc(db, "vendedores", user.uid));
            if(vDoc.exists() && greet) greet.innerText = "OLÁ, " + vDoc.data().nome.toUpperCase();
        } catch(e) { if(greet) greet.innerText = "MINHA CONTA"; }
    } else {
        if(guest) guest.style.display = 'flex';
        if(logged) logged.style.display = 'none';
        if(greet) greet.innerText = "MENU REPHONE";
    }
});

// --- LOCALIZAÇÃO (DISTÂNCIA FUNCIONANDO) ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

navigator.geolocation.getCurrentPosition((pos) => {
    userLat = pos.coords.latitude; 
    userLng = pos.coords.longitude;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`)
        .then(r => r.json()).then(data => {
            const cidade = data.address.city || data.address.town || data.address.village || "Sua Região";
            const txtLoc = document.getElementById('txtLocation');
            if(txtLoc) txtLoc.innerHTML = `Ofertas exclusivas em <strong>📍 ${cidade}</strong>`;
            renderizar(todosAnuncios);
        });
}, () => { console.log("GPS negado"); }, { timeout: 10000 });

// --- RENDERIZAR CARDS (CAMPOS COMPLETOS) ---
function renderizar(lista) {
    const grid = document.getElementById('radarGrid');
    if(!grid) return;
    grid.innerHTML = "";
    
    lista.forEach(ad => {
        const isVendido = ad.statusVenda === "vendido" || ad.statusVenda === "entregue";
        const precoNum = parseFloat(ad.preco) || 0;
        
        let distHtml = "";
        // Verifica se o anúncio tem coordenadas (coords.lat ou lat direto)
        const adLat = ad.coords?.lat || ad.lat;
        const adLon = ad.coords?.lon || ad.lng;
        const locMetodo = ad.coords?.metodo === "gps" ? "Confirmada" : "Aproximada";
        
        if (userLat && adLat) {
            const d = calcularDistancia(userLat, userLng, adLat, adLon);
            distHtml = ` • ${d}km ${d <= 5 ? '<span class="badge-near">PERTO</span>' : ''}`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <a href="anuncio.html?id=${ad.id}" style="text-decoration:none; color:inherit;">
                <div class="img-container">
                    ${isVendido ? '<div class="badge-vendido">VENDIDO</div>' : ''}
                    <img src="${ad.fotos?.[0] || ''}" style="filter:${isVendido ? 'grayscale(1)' : 'none'}; object-fit: contain;">
                </div>
                <div class="tags-row" style="display:flex; gap:5px; margin-bottom:5px;">
                    <span class="tag-vendedor ${ad.vendedorTipo === 'lojista' ? 'tag-loj' : 'tag-part'}" style="font-size:9px; padding:2px 5px; border-radius:4px; background:#f1f5f9;">${ad.vendedorTipo || 'Particular'}</span>
                </div>
                <h3 style="font-size:14px; font-weight:800;">${ad.modelo}</h3>
                <div class="details" style="font-size:10px; color:#64748b; margin:4px 0;">
                    ${ad.capacidade || '--'} • Bateria ${ad.bateria || '--'}% • ${ad.condicao || ad.estado || '--'}
                </div>
                <div class="location-info" style="font-size:10px; color:#16a34a; font-weight:700;">
                    📍 ${ad.cidade || 'Região'} <small style="font-weight:400; color:#94a3b8">(${locMetodo})</small>${distHtml}
                </div>
                <div class="price-tag" style="background:${isVendido ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #4ade80)'}; color:white; padding:4px 8px; border-radius:8px; display:inline-block; margin-top:8px; font-weight:900;">
                    R$ ${precoNum.toLocaleString('pt-br', {minimumFractionDigits:2})}
                </div>
            </a>`;
    grid.appendChild(card);
    });
}

// --- SNAPSHOT DE DADOS ---
onSnapshot(query(collection(db, "anuncios"), where("status", "in", ["aprovado", "disponivel"])), (snap) => {
    todosAnuncios = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizar(todosAnuncios);
});

// Funções Globais (Interface)
window.toggleMenu = () => {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    if(menu) menu.classList.toggle('active');
    if(overlay) overlay.style.display = menu.classList.contains('active') ? 'block' : 'none';
};
window.fazerLogout = () => signOut(auth).then(() => window.location.reload());
window.toggleBusca = () => document.getElementById('buscaManualBox').classList.toggle('open');
window.fecharMatch = () => document.getElementById('matchPopup').classList.remove('active');
