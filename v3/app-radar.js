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
let usuarioLogado = null;

// --- FUNÇÕES DE INTERFACE ---
window.toggleMenu = () => {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    menu.classList.toggle('active');
    overlay.style.display = menu.classList.contains('active') ? 'block' : 'none';
};
window.toggleBusca = () => document.getElementById('buscaManualBox').classList.toggle('open');
window.fecharMatch = () => document.getElementById('matchPopup').classList.remove('active');
window.fazerLogout = () => { signOut(auth).then(() => window.location.reload()); };

window.limparBusca = () => {
    document.getElementById('buscaMarca').value = "";
    renderizar(todosAnuncios);
    document.getElementById('buscaManualBox').classList.remove('open');
};

window.buscarManual = () => {
    const busca = document.getElementById('buscaMarca').value.toLowerCase();
    const filtrados = todosAnuncios.filter(ad => 
        (ad.marca || '').toLowerCase().includes(busca) || 
        (ad.modelo || '').toLowerCase().includes(busca)
    );
    renderizar(filtrados);
};

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, async (user) => {
    usuarioLogado = user;
    const menuGuest = document.getElementById('menuGuest');
    const menuLogged = document.getElementById('menuLogged');
    const greeting = document.getElementById('greeting');

    if (user) {
        if(menuGuest) menuGuest.style.display = 'none';
        if(menuLogged) menuLogged.style.display = 'flex';
        try {
            const vDoc = await getDoc(doc(db, "vendedores", user.uid));
            if(vDoc.exists() && greeting) greeting.innerText = "OLÁ, " + (vDoc.data().nome?.split(' ')[0].toUpperCase() || 'USUÁRIO');
        } catch(e) {}
    } else {
        if(menuGuest) menuGuest.style.display = 'flex';
        if(menuLogged) menuLogged.style.display = 'none';
    }
});

// --- LOCALIZAÇÃO ---
navigator.geolocation.getCurrentPosition((pos) => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`)
        .then(r => r.json()).then(data => {
            const cidade = data.address.city || data.address.town || data.address.village || "Sua Região";
            document.getElementById('txtLocation').innerHTML = `📍 Ofertas em <strong>${cidade}</strong>`;
            renderizar(todosAnuncios);
        });
}, () => {}, { timeout: 10000 });

// --- CÁLCULO DISTÂNCIA ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

// --- DADOS ---
onSnapshot(collection(db, "anuncios"), (snap) => {
    todosAnuncios = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const ativos = todosAnuncios.filter(ad => (ad.status === "aprovado" || ad.statusAnuncio === "aprovado"));
    renderizar(ativos);
});

function renderizar(lista) {
    const grid = document.getElementById('radarGrid');
    if(!grid) return;
    grid.innerHTML = "";
    
    lista.forEach(ad => {
        const isVendido = ad.statusVenda === "vendido" || ad.statusVenda === "entregue";
        const precoNum = parseFloat(ad.preco) || 0;
        let distHtml = "";
        
        if (userLat && ad.coords?.lat) {
            const d = calcularDistancia(userLat, userLng, ad.coords.lat, ad.coords.lon);
            if (!isNaN(d)) distHtml = ` • ${d}km`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <a href="anuncio.html?id=${ad.id}" style="text-decoration:none; color:inherit;">
                <div class="img-container">
                    ${isVendido ? '<div class="badge-vendido">VENDIDO</div>' : ''}
                    <img src="${ad.fotos?.[0] || ''}" style="filter:${isVendido ? 'grayscale(1)' : 'none'}">
                </div>
                <div class="tags-row">
                    <span class="tag-vendedor ${ad.vendedorTipo === 'lojista' ? 'tag-loj' : 'tag-part'}">${ad.vendedorTipo || 'Particular'}</span>
                </div>
                <h3>${ad.modelo}</h3>
                <div class="location-info">📍 ${ad.cidade || 'Região'} ${distHtml}</div>
                <div class="price-tag" style="background:${isVendido ? '#94a3b8' : ''}">R$ ${precoNum.toLocaleString('pt-br', {minimumFractionDigits:2})}</div>
            </a>`;
        grid.appendChild(card);
    });
}

// --- MATCH ---
window.fazerMatch = () => {
    const mod = document.getElementById('matchModelo').value.toLowerCase();
    const pMax = parseFloat(document.getElementById('matchPreco').value) || Infinity;
    if(!mod) return alert("Digite o modelo!");

    const circle = document.getElementById('mCircle');
    circle.classList.add('searching');
    
    setTimeout(() => {
        const match = todosAnuncios.filter(a => 
            !a.statusVenda && a.modelo.toLowerCase().includes(mod) && parseFloat(a.preco) <= pMax
        ).sort((a,b) => (b.bateria||0) - (a.bateria||0))[0];

        circle.classList.remove('searching');
        if(match) {
            document.getElementById('matchData').innerHTML = `<b>${match.modelo}</b><br>R$ ${match.preco}`;
            document.getElementById('matchLink').href = `anuncio.html?id=${match.id}`;
            document.getElementById('matchPopup').classList.add('active');
        } else {
            alert("Nenhum match encontrado.");
        }
    }, 1000);
};
