<script type="module">
import { getFirestore, collection, addDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const db = window.db; // usa o Firestore já inicializado

window.registrarContato = async ({ anuncioId, vendedorId, origem }) => {
  const compradorId = localStorage.getItem('anon_id') 
    || crypto.randomUUID();

  localStorage.setItem('anon_id', compradorId);

  const docRef = await addDoc(collection(db, "contatos"), {
    anuncioId,
    vendedorId,
    compradorId,
    origem,
    status: "em_contato",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  window.location.href = `/v3/acompanhar.html?id=${docRef.id}`;
};
</script>
