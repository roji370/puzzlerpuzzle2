const puzzleContainer = document.getElementById('puzzle-container');
const timerDisplay = document.getElementById('timer');
const easyButton = document.getElementById('easy');
const mediumButton = document.getElementById('medium');
const hardButton = document.getElementById('hard');
const submitButton = document.getElementById('submit-puzzle');

let currentLevel = 25;  // Start with the easy level (5x5)
let puzzleState = [];
let startTime, intervalId;
let completedLevels = new Set();

const levelImages = {
    25: 'images/easy-puzzle.jpg',   // 5x5
    49: 'images/medium-puzzle.jpg',  // 7x7
    100: 'images/hard-puzzle.jpg'    // 10x10
};

window.onload = () => {
    easyButton.addEventListener('click', () => setupPuzzle(25));
    mediumButton.addEventListener('click', () => setupPuzzle(49));
    hardButton.addEventListener('click', () => setupPuzzle(100));
    document.getElementById('reset').addEventListener('click', resetPuzzle);
    submitButton.addEventListener('click', checkPuzzleCompletionOnSubmit);

    loadCompletedLevels();
    updateButtonStates();
    
    // Ensure the Easy level puzzle is set up on page load
    setupPuzzle(25);
};

function loadCompletedLevels() {
    const saved = localStorage.getItem('completedLevels');
    if (saved) {
        completedLevels = new Set(JSON.parse(saved));
    }
}

function saveCompletedLevels() {
    localStorage.setItem('completedLevels', JSON.stringify([...completedLevels]));
}

function updateButtonStates() {
    mediumButton.disabled = !completedLevels.has(25);
    hardButton.disabled = !completedLevels.has(49);
    
    mediumButton.style.display = mediumButton.disabled ? 'none' : 'inline-block'; // Updated visibility logic
    hardButton.style.display = hardButton.disabled ? 'none' : 'inline-block'; // Updated visibility logic
    mediumButton.querySelector('.lock-icon').style.display = mediumButton.disabled ? 'inline-block' : 'none';
    hardButton.querySelector('.lock-icon').style.display = hardButton.disabled ? 'inline-block' : 'none';
}

function setupPuzzle(level) {
    currentLevel = level;
    createPuzzle(currentLevel);
}

function createPuzzle(level) {
    puzzleContainer.innerHTML = '';

    const gridSize = Math.sqrt(level);
    puzzleContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    puzzleContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    const imageSrc = levelImages[level];

    for (let i = 0; i < level; i++) {
        const puzzlePiece = document.createElement('div');
        puzzlePiece.classList.add('puzzle-piece');

        puzzlePiece.style.backgroundImage = `url(${imageSrc})`;
        puzzlePiece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
        puzzlePiece.style.backgroundPosition = `${(i % gridSize) * 100 / (gridSize - 1)}% ${Math.floor(i / gridSize) * 100 / (gridSize - 1)}%`;

        puzzlePiece.dataset.correctPosition = i;

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            puzzlePiece.addEventListener('touchstart', handlePieceSelection);
        } else {
            puzzlePiece.setAttribute('draggable', true);
            puzzlePiece.addEventListener('dragstart', dragStart);
            puzzlePiece.addEventListener('dragover', dragOver);
            puzzlePiece.addEventListener('drop', drop);
        }

        puzzleContainer.appendChild(puzzlePiece);
    }

    scramblePieces();
    startTimer();
}

function scramblePieces() {
    const pieces = Array.from(puzzleContainer.children);
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        puzzleContainer.appendChild(pieces[j]);
    }
}

let draggedPiece;

function dragStart(e) {
    draggedPiece = e.target;
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    const targetPiece = e.target;
    swapPieces(draggedPiece, targetPiece);
}

let selectedPieces = [];

function handlePieceSelection(e) {
    e.preventDefault();
    const selectedPiece = e.target;

    if (selectedPieces.length === 0) {
        selectedPiece.classList.add('selected');
        selectedPiece.style.outline = '2px solid rgba(255, 255, 0, 0.7)'; // Highlight color for mobile
        selectedPieces.push(selectedPiece);
    } else if (selectedPieces.length === 1) {
        if (selectedPiece !== selectedPieces[0]) {
            selectedPieces.push(selectedPiece);
            swapPieces(selectedPieces[0], selectedPieces[1]);
            
            selectedPieces.forEach(piece => {
                piece.classList.remove('selected');
                piece.style.outline = ''; // Remove highlight
            });
            selectedPieces = [];
        } else {
            selectedPiece.classList.remove('selected');
            selectedPiece.style.outline = ''; // Remove highlight
            selectedPieces = [];
        }
    }
}

function swapPieces(piece1, piece2) {
    const tempBackground = piece1.style.backgroundPosition;
    piece1.style.backgroundPosition = piece2.style.backgroundPosition;
    piece2.style.backgroundPosition = tempBackground;
}

function checkPuzzleCompletionOnSubmit() {
    const pieces = [...puzzleContainer.children];
    const isCompleted = pieces.every((piece, index) => {
        const correctPositionX = (index % Math.sqrt(currentLevel)) * 100 / (Math.sqrt(currentLevel) - 1);
        const correctPositionY = Math.floor(index / Math.sqrt(currentLevel)) * 100 / (Math.sqrt(currentLevel) - 1);
        
        const [pieceX, pieceY] = piece.style.backgroundPosition.split(' ').map(val => parseFloat(val));
        
        return Math.abs(pieceX - correctPositionX) <= 0.1 && Math.abs(pieceY - correctPositionY) <= 0.1;
    });

    if (isCompleted) {
        displayModal();
        completedLevels.add(currentLevel);
        saveCompletedLevels();
        updateButtonStates();
    } else {
        alert("The puzzle is not solved correctly. Try again!");
    }
}

function displayModal() {
    clearInterval(intervalId);

    const modal = document.getElementById('congrats-modal');
    const closeButton = document.querySelector('.close-button');
    const nextLevelButton = document.getElementById('next-level');
    const modalMessage = document.querySelector('.modal-content h2');

    modalMessage.textContent = `Congratulations! You've solved the ${getLevelName(currentLevel)} puzzle!`;

    modal.style.display = 'flex';

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    nextLevelButton.onclick = () => {
        modal.style.display = 'none';
        if (currentLevel === 25) {
            setupPuzzle(49);
        } else if (currentLevel === 49) {
            setupPuzzle(100);
        } else {
            alert("You've completed all levels! Great job!");
        }
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function getLevelName(level) {
    switch(level) {
        case 25: return "Easy";
        case 49: return "Medium";
        case 100: return "Hard";
        default: return "Unknown";
    }
}

function startTimer() {
    clearInterval(intervalId);
    startTime = Date.now();
    intervalId = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const seconds = Math.floor((elapsedTime / 1000) % 60);
    const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
    timerDisplay.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function resetPuzzle() {
    setupPuzzle(currentLevel);
}