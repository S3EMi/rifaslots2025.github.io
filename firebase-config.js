// ========== CONFIGURAÇÃO DO FIREBASE ==========
// ATENÇÃO: Substitua estas configurações pelas suas do Firebase Console

const firebaseConfig = {
    apiKey: "AIzaSyCGmhF6xjwJ-lUSq9BylE8O3tweyz0PtiI",
    authDomain: "rifa-lots-aerodesign.firebaseapp.com",
    projectId: "rifa-lots-aerodesign",
    storageBucket: "rifa-lots-aerodesign.firebasestorage.app",
    messagingSenderId: "122659672881",
    appId: "1:122659672881:web:63dca58425246073185610"
};

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase inicializado com sucesso');
} catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
}

// Exportar para uso em outros arquivos
const db = firebase.firestore();