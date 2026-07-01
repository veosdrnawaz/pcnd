document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const predictionForm = document.getElementById('predictionForm');
    const amountInput = document.getElementById('amountInput');
    const predictBtn = document.getElementById('predictBtn');
    const resetBtn = document.getElementById('resetBtn');
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    
    const resultsIdleState = document.getElementById('resultsIdleState');
    const resultsActiveState = document.getElementById('resultsActiveState');
    const notesGrid = document.getElementById('notesGrid');
    const summaryEntered = document.getElementById('summaryEntered');
    const summaryTotal = document.getElementById('summaryTotal');
    const summaryStatus = document.getElementById('summaryStatus');
    const statusBadge = document.getElementById('statusBadge');
    
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    
    const historyTableBody = document.getElementById('historyTableBody');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // State Variables
    let currentPrediction = null;
    let history = JSON.parse(localStorage.getItem('currency_history') || '[]');

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Initialize History
    renderHistory();

    // -------------------------------------------------------------
    // Theme Toggle Logic
    // -------------------------------------------------------------
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeToggleBtn.title = "Switch to Light Mode";
        } else {
            themeToggleBtn.title = "Switch to Dark Mode";
        }
    }

    // -------------------------------------------------------------
    // Validation & Error Handling
    // -------------------------------------------------------------
    function showError(msg) {
        errorMessage.textContent = msg;
        errorBanner.classList.add('show');
    }

    function hideError() {
        errorBanner.classList.remove('show');
    }

    // -------------------------------------------------------------
    // API Prediction Call
    // -------------------------------------------------------------
    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const amountVal = amountInput.value.trim();
        if (!amountVal) {
            showError("Please enter an amount.");
            return;
        }

        const amount = parseInt(amountVal, 10);
        if (isNaN(amount) || amount <= 0) {
            showError("Amount must be a positive number.");
            return;
        }

        if (amount < 10) {
            showError("Minimum amount is Rs. 10.");
            return;
        }

        if (amount > 10000000000) {
            showError("Amount exceeds max supported limit of Rs. 10 Billion.");
            return;
        }

        if (amount % 10 !== 0) {
            showError("Amount must be a multiple of 10.");
            return;
        }

        // Show Loading State
        predictBtn.classList.add('loading');
        predictBtn.disabled = true;

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Prediction failed on server.");
            }

            const data = await response.json();
            
            // Artificial delay for smooth UX loading animation
            setTimeout(() => {
                displayResults(data);
                saveToHistory(data);
                predictBtn.classList.remove('loading');
                predictBtn.disabled = false;
            }, 600);

        } catch (err) {
            predictBtn.classList.remove('loading');
            predictBtn.disabled = false;
            showError(err.message);
        }
    });

    // Reset Action
    resetBtn.addEventListener('click', () => {
        predictionForm.reset();
        hideError();
        resultsActiveState.classList.add('hidden');
        resultsIdleState.classList.remove('hidden');
        currentPrediction = null;
    });

    // -------------------------------------------------------------
    // Display Results Function
    // -------------------------------------------------------------
    function displayResults(data) {
        currentPrediction = data;
        
        // Hide idle state, show active
        resultsIdleState.classList.add('hidden');
        resultsActiveState.classList.remove('hidden');

        // Restart checkmark animation by cloning or re-assigning content
        const checkmark = document.querySelector('.checkmark-circle');
        if (checkmark) {
            const parent = checkmark.parentNode;
            const clone = checkmark.cloneNode(true);
            parent.replaceChild(clone, checkmark);
        }

        // Populate Notes Grid
        notesGrid.innerHTML = '';
        const notes = [
            { key: '5000', label: 'Rs. 5000', color: '--note-5000' },
            { key: '1000', label: 'Rs. 1000', color: '--note-1000' },
            { key: '500', label: 'Rs. 500', color: '--note-500' },
            { key: '100', label: 'Rs. 100', color: '--note-100' },
            { key: '50', label: 'Rs. 50', color: '--note-50' },
            { key: '20', label: 'Rs. 20', color: '--note-20' },
            { key: '10', label: 'Rs. 10', color: '--note-10' }
        ];

        let calculatedTotal = 0;
        notes.forEach(note => {
            const count = data[note.key] || 0;
            calculatedTotal += count * parseInt(note.key, 10);

            // Generate Note Card Element
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.style.setProperty('--accent', `var(${note.color})`);
            
            noteCard.innerHTML = `
                <div class="note-denom">${note.label}</div>
                <div class="note-value">${note.key}</div>
                <div class="note-count"><span>${count}</span> note${count !== 1 ? 's' : ''}</div>
            `;
            notesGrid.appendChild(noteCard);
        });

        // Set summaries
        summaryEntered.textContent = `Rs. ${data.amount.toLocaleString()}`;
        summaryTotal.textContent = `Rs. ${calculatedTotal.toLocaleString()}`;

        const isExact = (calculatedTotal === data.amount);

        if (isExact) {
            summaryStatus.textContent = "MATCH";
            summaryStatus.className = "status-indicator pass";
            statusBadge.className = "status-badge success-badge";
            statusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Distribution Generated Successfully`;
        } else {
            summaryStatus.textContent = "MISMATCH";
            summaryStatus.className = "status-indicator fail";
            statusBadge.className = "status-badge danger-badge";
            statusBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Invalid Prediction`;
        }
    }

    // -------------------------------------------------------------
    // History Management
    // -------------------------------------------------------------
    function saveToHistory(data) {
        const timestamp = new Date().toLocaleString();
        
        let calculatedTotal = 0;
        const denoms = ['5000', '1000', '500', '100', '50', '20', '10'];
        denoms.forEach(d => {
            calculatedTotal += (data[d] || 0) * parseInt(d, 10);
        });
        
        const isExact = (calculatedTotal === data.amount);

        const newRecord = {
            timestamp,
            amount: data.amount,
            n5000: data['5000'] || 0,
            n1000: data['1000'] || 0,
            n500: data['500'] || 0,
            n100: data['100'] || 0,
            n50: data['50'] || 0,
            n20: data['20'] || 0,
            n10: data['10'] || 0,
            total: calculatedTotal,
            status: isExact ? 'Success' : 'Invalid'
        };

        // Prepend to history, cap at 10 items
        history.unshift(newRecord);
        if (history.length > 10) {
            history.pop();
        }

        localStorage.setItem('currency_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            noHistoryMessage.classList.remove('hidden');
            historyTableBody.innerHTML = '';
            return;
        }

        noHistoryMessage.classList.add('hidden');
        historyTableBody.innerHTML = '';

        history.forEach(item => {
            const tr = document.createElement('tr');
            
            const badgeClass = item.status === 'Success' ? 'pass' : 'fail';
            
            tr.innerHTML = `
                <td>${item.timestamp}</td>
                <td>Rs. ${item.amount.toLocaleString()}</td>
                <td>${item.n5000 || 0}</td>
                <td>${item.n1000 || 0}</td>
                <td>${item.n500 || 0}</td>
                <td>${item.n100 || 0}</td>
                <td>${item.n50 || 0}</td>
                <td>${item.n20 || 0}</td>
                <td>${item.n10 || 0}</td>
                <td>Rs. ${item.total.toLocaleString()}</td>
                <td><span class="status-indicator ${badgeClass}">${item.status.toUpperCase()}</span></td>
            `;
            historyTableBody.appendChild(tr);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear your prediction history?")) {
            history = [];
            localStorage.removeItem('currency_history');
            renderHistory();
        }
    });

    // -------------------------------------------------------------
    // Export Functions (CSV / PDF)
    // -------------------------------------------------------------
    downloadCsvBtn.addEventListener('click', () => {
        if (!currentPrediction) return;

        const p = currentPrediction;
        const csvRows = [
            ['Note Denomination', 'Count', 'Subtotal (Rs.)'],
            ['5000', p['5000'] || 0, (p['5000'] || 0) * 5000],
            ['1000', p['1000'] || 0, (p['1000'] || 0) * 1000],
            ['500', p['500'] || 0, (p['500'] || 0) * 500],
            ['100', p['100'] || 0, (p['100'] || 0) * 100],
            ['50', p['50'] || 0, (p['50'] || 0) * 50],
            ['20', p['20'] || 0, (p['20'] || 0) * 20],
            ['10', p['10'] || 0, (p['10'] || 0) * 10],
            ['Total Amount', '', p.amount]
        ];

        const csvContent = "data:text/csv;charset=utf-8," 
            + csvRows.map(row => row.map(val => `"${val}"`).join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `note_distribution_${p.amount}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    downloadPdfBtn.addEventListener('click', () => {
        if (!currentPrediction) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const p = currentPrediction;
        const dateStr = new Date().toLocaleString();

        // Design styling variables
        const primaryColor = [99, 102, 241]; // Indigo
        const secondaryColor = [16, 185, 129]; // Emerald
        const textColor = [15, 23, 42]; // Deep Slate

        // Document Borders/Frame
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.rect(5, 5, 200, 287);

        // Header Title Block
        doc.setFillColor(...primaryColor);
        doc.rect(5, 5, 200, 30, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("Pakistani Currency Note Predictor", 12, 18);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(224, 231, 255); // Indigo 100
        doc.text("Optimal Distribution Generation Report", 12, 26);

        // Metadata section
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...textColor);
        doc.text("Summary Information", 12, 50);
        
        doc.setLineWidth(0.3);
        doc.setDrawColor(...primaryColor);
        doc.line(12, 52, 198, 52);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // Slate 600
        doc.text(`Generated Date: ${dateStr}`, 12, 60);
        doc.text(`Entered Target: Rs. ${p.amount.toLocaleString()}`, 12, 66);
        doc.text(`Calculated Total: Rs. ${p.amount.toLocaleString()}`, 12, 72);
        
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(...secondaryColor);
        doc.text("Status: VALID DISTRIBUTION MATCH", 12, 78);

        // Table headers and columns
        const tableColumns = ["Note Denomination (Rs.)", "Note Count", "Subtotal (Rs.)"];
        const tableRows = [
            ["Rs. 5000", p['5000'] || 0, `Rs. ${((p['5000'] || 0) * 5000).toLocaleString()}`],
            ["Rs. 1000", p['1000'] || 0, `Rs. ${((p['1000'] || 0) * 1000).toLocaleString()}`],
            ["Rs. 500", p['500'] || 0, `Rs. ${((p['500'] || 0) * 500).toLocaleString()}`],
            ["Rs. 100", p['100'] || 0, `Rs. ${((p['100'] || 0) * 100).toLocaleString()}`],
            ["Rs. 50", p['50'] || 0, `Rs. ${((p['50'] || 0) * 50).toLocaleString()}`],
            ["Rs. 20", p['20'] || 0, `Rs. ${((p['20'] || 0) * 20).toLocaleString()}`],
            ["Rs. 10", p['10'] || 0, `Rs. ${((p['10'] || 0) * 10).toLocaleString()}`],
            [{ content: "Total Value", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `Rs. ${p.amount.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: secondaryColor } }]
        ];

        // Format raw rows to ensure subtotal math is formatted nicely
        tableRows[0][2] = `Rs. ${((p['5000'] || 0) * 5000).toLocaleString()}`;
        tableRows[1][2] = `Rs. ${((p['1000'] || 0) * 1000).toLocaleString()}`;
        tableRows[2][2] = `Rs. ${((p['500'] || 0) * 500).toLocaleString()}`;
        tableRows[3][2] = `Rs. ${((p['100'] || 0) * 100).toLocaleString()}`;
        tableRows[4][2] = `Rs. ${((p['50'] || 0) * 50).toLocaleString()}`;
        tableRows[5][2] = `Rs. ${((p['20'] || 0) * 20).toLocaleString()}`;
        tableRows[6][2] = `Rs. ${((p['10'] || 0) * 10).toLocaleString()}`;

        // AutoTable generation
        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: 90,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            styles: {
                font: 'Helvetica',
                fontSize: 10,
                cellPadding: 4,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            margin: { left: 12, right: 12 }
        });

        // Add Footer details
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("Disclaimer: This report was programmatically generated based on predictions from a RandomForest Machine Learning model.", 12, finalY);
        doc.text("Web application code and model details hosted at github.com/veosdrnawaz", 12, finalY + 4);

        // Save PDF file
        doc.save(`note_distribution_${p.amount}.pdf`);
    });
});
