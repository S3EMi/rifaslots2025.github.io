// ========== CONFIGURAÇÕES DA RIFA ==========
const RIFA_CONFIG = {
    START_NUMBER: 1,
    END_NUMBER: 350,
    PRICE_PER_NUMBER: 1,
    PIX_KEY: "31 9 9658-1509",
    WHATSAPP_NUMBER: "553196581509",
    RESERVATION_EXPIRY_MINUTES: 30,
    RIFA_ID: "lots-aerodesign"
};

// ========== ELEMENTOS DO DOM ==========
const DOM_ELEMENTS = {
    numbersGrid: document.getElementById('numbersGrid'),
    selectedCount: document.getElementById('selectedCount'),
    totalValue: document.getElementById('totalValue'),
    pixValue: document.getElementById('pixValue'),
    clearSelection: document.getElementById('clearSelection'),
    buyButton: document.getElementById('buyButton'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    customerName: document.getElementById('customerName'),
    customerPhone: document.getElementById('customerPhone'),
    connectionStatus: document.getElementById('connectionStatus'),
    loadingElement: document.getElementById('loading'),
    contentElement: document.getElementById('content')
};

// ========== ESTADO DA APLICAÇÃO ==========
let APP_STATE = {
    selectedNumbers: [],
    soldNumbers: [],
    reservedNumbers: [],
    reservationTimestamps: {}
};

// ========== INICIALIZAÇÃO ==========
async function init() {
    try {
        updateConnectionStatus('Conectando ao Firebase...', 'disconnected');
        
        await loadDataFromFirestore();
        setupRealtimeListener();
        
        generateNumbers();
        updateSelectionInfo();
        updateProgressBar();
        
        setupEventListeners();
        
        DOM_ELEMENTS.loadingElement.style.display = 'none';
        DOM_ELEMENTS.contentElement.style.display = 'block';
        
        updateConnectionStatus('Conectado - Dados em tempo real', 'connected');
        setupAdminCommands();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        updateConnectionStatus('Erro ao conectar', 'disconnected');
        DOM_ELEMENTS.loadingElement.innerHTML = '<h3>Erro ao carregar. Recarregue a página.</h3>';
    }
}

// ========== FIREBASE FUNCTIONS ==========
async function loadDataFromFirestore() {
    try {
        const doc = await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).get();
        
        if (doc.exists) {
            const data = doc.data();
            APP_STATE.soldNumbers = data.soldNumbers || [];
            APP_STATE.reservedNumbers = data.reservedNumbers || [];
            APP_STATE.reservationTimestamps = data.reservationTimestamps || {};
        } else {
            await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).set({
                soldNumbers: [],
                reservedNumbers: [],
                reservationTimestamps: {},
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    }
}

function setupRealtimeListener() {
    db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                APP_STATE.soldNumbers = data.soldNumbers || [];
                APP_STATE.reservedNumbers = data.reservedNumbers || [];
                APP_STATE.reservationTimestamps = data.reservationTimestamps || {};
                
                generateNumbers();
                updateProgressBar();
                updateConnectionStatus('Conectado - Dados em tempo real', 'connected');
            }
        }, (error) => {
            console.error('Erro no listener:', error);
            updateConnectionStatus('Erro de conexão', 'disconnected');
        });
}

async function saveDataToFirestore() {
    try {
        await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).update({
            soldNumbers: APP_STATE.soldNumbers,
            reservedNumbers: APP_STATE.reservedNumbers,
            reservationTimestamps: APP_STATE.reservationTimestamps,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        throw error;
    }
}

// ========== FUNÇÕES DA INTERFACE ==========
function updateConnectionStatus(message, status) {
    DOM_ELEMENTS.connectionStatus.textContent = status === 'connected' ? '🟢 ' + message : '🔴 ' + message;
    DOM_ELEMENTS.connectionStatus.className = `connection-status ${status}`;
}

function generateNumbers() {
    DOM_ELEMENTS.numbersGrid.innerHTML = '';
    
    for (let i = RIFA_CONFIG.START_NUMBER; i <= RIFA_CONFIG.END_NUMBER; i++) {
        const numberElement = document.createElement('div');
        numberElement.className = 'number';
        numberElement.textContent = i;
        numberElement.dataset.number = i;
        
        if (APP_STATE.soldNumbers.includes(i)) {
            numberElement.classList.add('sold');
        } else if (APP_STATE.reservedNumbers.includes(i)) {
            numberElement.classList.add('reserved');
        } else {
            numberElement.addEventListener('click', toggleNumberSelection);
        }
        
        DOM_ELEMENTS.numbersGrid.appendChild(numberElement);
    }
}

function toggleNumberSelection(event) {
    const numberElement = event.currentTarget;
    const number = parseInt(numberElement.dataset.number);
    
    if (numberElement.classList.contains('selected')) {
        numberElement.classList.remove('selected');
        APP_STATE.selectedNumbers = APP_STATE.selectedNumbers.filter(n => n !== number);
    } else {
        numberElement.classList.add('selected');
        APP_STATE.selectedNumbers.push(number);
    }
    
    updateSelectionInfo();
    validateForm();
}

function updateSelectionInfo() {
    DOM_ELEMENTS.selectedCount.textContent = APP_STATE.selectedNumbers.length;
    
    const total = APP_STATE.selectedNumbers.length * RIFA_CONFIG.PRICE_PER_NUMBER;
    DOM_ELEMENTS.totalValue.textContent = total.toFixed(2);
    DOM_ELEMENTS.pixValue.textContent = total.toFixed(2);
}

function updateProgressBar() {
    const totalNumbers = RIFA_CONFIG.END_NUMBER - RIFA_CONFIG.START_NUMBER + 1;
    const soldCount = APP_STATE.soldNumbers.length;
    const reservedCount = APP_STATE.reservedNumbers.length;
    const progressPercentage = ((soldCount + reservedCount) / totalNumbers) * 100;
    
    DOM_ELEMENTS.progressBar.style.width = `${progressPercentage}%`;
    DOM_ELEMENTS.progressText.textContent = `${Math.round(progressPercentage)}% dos números já foram vendidos ou reservados!`;
}

function validateForm() {
    const hasSelectedNumbers = APP_STATE.selectedNumbers.length > 0;
    const hasName = DOM_ELEMENTS.customerName.value.trim().length > 0;
    const hasPhone = DOM_ELEMENTS.customerPhone.value.replace(/\D/g, '').length >= 10;
    
    DOM_ELEMENTS.buyButton.disabled = !(hasSelectedNumbers && hasName && hasPhone);
}

function formatPhone() {
    let value = DOM_ELEMENTS.customerPhone.value.replace(/\D/g, '');
    
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    DOM_ELEMENTS.customerPhone.value = value;
}

function clearAllSelection() {
    APP_STATE.selectedNumbers = [];
    
    document.querySelectorAll('.number.selected').forEach(element => {
        element.classList.remove('selected');
    });
    
    updateSelectionInfo();
    validateForm();
}

async function processPurchase() {
    if (APP_STATE.selectedNumbers.length === 0) {
        alert('Por favor, selecione pelo menos um número.');
        return;
    }
    
    if (!DOM_ELEMENTS.customerName.value.trim()) {
        alert('Por favor, informe seu nome completo.');
        DOM_ELEMENTS.customerName.focus();
        return;
    }
    
    if (DOM_ELEMENTS.customerPhone.value.replace(/\D/g, '').length < 10) {
        alert('Por favor, informe um telefone válido.');
        DOM_ELEMENTS.customerPhone.focus();
        return;
    }
    
    const conflictNumbers = APP_STATE.selectedNumbers.filter(num => 
        APP_STATE.soldNumbers.includes(num) || APP_STATE.reservedNumbers.includes(num)
    );
    
    if (conflictNumbers.length > 0) {
        alert(`Os seguintes números já não estão disponíveis: ${conflictNumbers.join(', ')}. Por favor, selecione outros números.`);
        return;
    }
    
    APP_STATE.selectedNumbers.sort((a, b) => a - b);
    
    const message = `Olá! Gostaria de comprar os seguintes números da rifa da L.O.T.S. Aerodesign:\n\n` +
                   `Números: ${APP_STATE.selectedNumbers.join(', ')}\n` +
                   `Quantidade: ${APP_STATE.selectedNumbers.length}\n` +
                   `Valor total: R$ ${(APP_STATE.selectedNumbers.length * RIFA_CONFIG.PRICE_PER_NUMBER).toFixed(2)}\n\n` +
                   `Nome: ${DOM_ELEMENTS.customerName.value.trim()}\n` +
                   `Telefone: ${DOM_ELEMENTS.customerPhone.value}`;
    
    const encodedMessage = encodeURIComponent(message);
    
    await reserveNumbers(APP_STATE.selectedNumbers);
    
    window.open(`https://wa.me/${RIFA_CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    
    clearAllSelection();
    DOM_ELEMENTS.customerName.value = '';
    DOM_ELEMENTS.customerPhone.value = '';
}

async function reserveNumbers(numbers) {
    const now = Date.now();
    
    numbers.forEach(num => {
        if (!APP_STATE.reservedNumbers.includes(num)) {
            APP_STATE.reservedNumbers.push(num);
            APP_STATE.reservationTimestamps[num] = now;
        }
    });
    
    await saveDataToFirestore();
    generateNumbers();
    updateProgressBar();
}

function setupEventListeners() {
    DOM_ELEMENTS.clearSelection.addEventListener('click', clearAllSelection);
    DOM_ELEMENTS.buyButton.addEventListener('click', processPurchase);
    DOM_ELEMENTS.customerName.addEventListener('input', validateForm);
    DOM_ELEMENTS.customerPhone.addEventListener('input', validateForm);
    DOM_ELEMENTS.customerPhone.addEventListener('input', formatPhone);
}

// ========== COMANDOS ADMINISTRATIVOS ==========
function setupAdminCommands() {
    console.log(`=== COMANDOS ADMIN RIFA L.O.T.S. ===`);
    console.log(`markNumbersAsSold([1, 2, 3]) - Marcar números como vendidos`);
    console.log(`markNumbersAsReserved([4, 5, 6]) - Marcar números como reservados`);
    console.log(`freeNumbers([1, 2, 3]) - Liberar números`);
    console.log(`viewAllSold() - Ver números vendidos`);
    console.log(`viewAllReserved() - Ver números reservados`);
    console.log(`viewAllAvailable() - Ver números disponíveis`);
    console.log(`cleanExpiredReservations() - Limpar reservas expiradas`);
    console.log(`resetAllData() - Resetar dados`);
    console.log(`exportData() - Exportar dados`);
    console.log(`==============================`);
}

window.markNumbersAsSold = async function(numbers) {
    if (!Array.isArray(numbers)) {
        console.error('Erro: Forneça um array de números.');
        return;
    }
    
    numbers.forEach(num => {
        APP_STATE.reservedNumbers = APP_STATE.reservedNumbers.filter(n => n !== num);
        delete APP_STATE.reservationTimestamps[num];
        
        if (!APP_STATE.soldNumbers.includes(num)) {
            APP_STATE.soldNumbers.push(num);
        }
    });
    
    await saveDataToFirestore();
    console.log(`Números ${numbers.join(', ')} marcados como VENDIDOS`);
}

window.markNumbersAsReserved = async function(numbers) {
    if (!Array.isArray(numbers)) {
        console.error('Erro: Forneça um array de números.');
        return;
    }
    
    const now = Date.now();
    numbers.forEach(num => {
        if (!APP_STATE.reservedNumbers.includes(num) && !APP_STATE.soldNumbers.includes(num)) {
            APP_STATE.reservedNumbers.push(num);
            APP_STATE.reservationTimestamps[num] = now;
        }
    });
    
    await saveDataToFirestore();
    console.log(`Números ${numbers.join(', ')} marcados como RESERVADOS`);
}

window.freeNumbers = async function(numbers) {
    if (!Array.isArray(numbers)) {
        console.error('Erro: Forneça um array de números.');
        return;
    }
    
    numbers.forEach(num => {
        APP_STATE.soldNumbers = APP_STATE.soldNumbers.filter(n => n !== num);
        APP_STATE.reservedNumbers = APP_STATE.reservedNumbers.filter(n => n !== num);
        delete APP_STATE.reservationTimestamps[num];
    });
    
    await saveDataToFirestore();
    console.log(`Números ${numbers.join(', ')} foram LIBERADOS`);
}

window.viewAllSold = function() {
    console.log('NÚMEROS VENDIDOS:', APP_STATE.soldNumbers.sort((a, b) => a - b));
    console.log(`Total: ${APP_STATE.soldNumbers.length} números`);
}

window.viewAllReserved = function() {
    console.log('NÚMEROS RESERVADOS:', APP_STATE.reservedNumbers.sort((a, b) => a - b));
    console.log(`Total: ${APP_STATE.reservedNumbers.length} números`);
}

window.viewAllAvailable = function() {
    const allNumbers = Array.from({length: RIFA_CONFIG.END_NUMBER - RIFA_CONFIG.START_NUMBER + 1}, (_, i) => RIFA_CONFIG.START_NUMBER + i);
    const availableNumbers = allNumbers.filter(num => 
        !APP_STATE.soldNumbers.includes(num) && !APP_STATE.reservedNumbers.includes(num)
    );
    console.log('NÚMEROS DISPONÍVEIS:', availableNumbers);
    console.log(`Total: ${availableNumbers.length} números`);
}

window.cleanExpiredReservations = async function() {
    const now = Date.now();
    let expiredReservations = [];
    
    for (const number in APP_STATE.reservationTimestamps) {
        const reservationTime = APP_STATE.reservationTimestamps[number];
        const minutesPassed = (now - reservationTime) / (1000 * 60);
        
        if (minutesPassed > RIFA_CONFIG.RESERVATION_EXPIRY_MINUTES) {
            expiredReservations.push(parseInt(number));
            delete APP_STATE.reservationTimestamps[number];
        }
    }
    
    if (expiredReservations.length > 0) {
        APP_STATE.reservedNumbers = APP_STATE.reservedNumbers.filter(num => !expiredReservations.includes(num));
        await saveDataToFirestore();
        console.log(`Reservas expiradas liberadas: ${expiredReservations.join(', ')}`);
    } else {
        console.log('Nenhuma reserva expirada encontrada');
    }
}

window.resetAllData = async function() {
    if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados da rifa. Tem certeza?')) {
        APP_STATE.soldNumbers = [];
        APP_STATE.reservedNumbers = [];
        APP_STATE.reservationTimestamps = {};
        await saveDataToFirestore();
        console.log('Todos os dados foram resetados');
    }
}

window.exportData = function() {
    const data = {
        soldNumbers: APP_STATE.soldNumbers,
        reservedNumbers: APP_STATE.reservedNumbers,
        reservationTimestamps: APP_STATE.reservationTimestamps,
        exportDate: new Date().toISOString()
    };
    const jsonData = JSON.stringify(data, null, 2);
    console.log('DADOS PARA EXPORTAR:');
    console.log(jsonData);
    
    const blob = new Blob([jsonData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rifa_lots_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.importData = async function(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        APP_STATE.soldNumbers = data.soldNumbers || [];
        APP_STATE.reservedNumbers = data.reservedNumbers || [];
        APP_STATE.reservationTimestamps = data.reservationTimestamps || {};
        
        await saveDataToFirestore();
        console.log('Dados importados com sucesso!');
    } catch (error) {
        console.error('Erro ao importar dados:', error);
    }
}

// ========== FUNÇÃO SIMPLES PARA ESCOLHER NÚMEROS ==========
window.escolherQuantNum = function(quantidade) {
    if (!quantidade || quantidade < 1) {
        console.error('❌ Erro: Digite quantos números você quer. Exemplo: escolherQuantNum(50)');
        return;
    }

    // Pegar todos os números disponíveis
    const todosNumeros = Array.from(
        {length: RIFA_CONFIG.END_NUMBER - RIFA_CONFIG.START_NUMBER + 1}, 
        (_, i) => RIFA_CONFIG.START_NUMBER + i
    );
    
    const disponiveis = todosNumeros.filter(num => 
        !APP_STATE.soldNumbers.includes(num) && !APP_STATE.reservedNumbers.includes(num)
    );

    if (disponiveis.length === 0) {
        console.error('❌ Não tem nenhum número disponível!');
        return;
    }

    if (quantidade > disponiveis.length) {
        console.warn(`⚠ Aviso: Você pediu ${quantidade} números, mas só tem ${disponiveis.length} disponíveis.`);
        quantidade = disponiveis.length;
    }

    // Embaralhar e pegar a quantidade pedida
    const embaralhados = [...disponiveis].sort(() => Math.random() - 0.5);
    const escolhidos = embaralhados.slice(0, quantidade).sort((a, b) => a - b);

    console.log(`🎯 ${quantidade} números escolhidos aleatoriamente:`);
    console.log(escolhidos);
    console.log(`💰 Valor total: R$ ${(quantidade * RIFA_CONFIG.PRICE_PER_NUMBER).toFixed(2)}`);
    
    return escolhidos;
}

// Função que já reserva os números automaticamente
window.escolherEReservar = async function(quantidade, nomeCliente = "Cliente") {
    const numeros = escolherQuantNum(quantidade);
    
    if (numeros && numeros.length > 0) {
        await window.markNumbersAsReserved(numeros);
        console.log(`✅ Números reservados para: ${nomeCliente}`);
    }
    
    return numeros;
}

// ========== INICIAR APLICAÇÃO ==========

document.addEventListener('DOMContentLoaded', init);


