const puzzleContainer = document.getElementById('puzzle-container');
const timerDisplay = document.getElementById('timer');
const easyButton = document.getElementById('easy');
const mediumButton = document.getElementById('medium');
const hardButton = document.getElementById('hard');
const solveButton = document.getElementById('solve');

let currentLevel = 10;  // Start with the easy level
let puzzleState = [];
let startTime, intervalId;
let completedLevels = new Set();

const levelImages = {
    10: 'images/easy-puzzle.jpg',
    12: 'images/medium-puzzle.jpg',
    16: 'images/hard-puzzle.jpg'
};

window.onload = () => {
    easyButton.addEventListener('click', () => setupPuzzle(10));
    mediumButton.addEventListener('click', () => setupPuzzle(12));
    hardButton.addEventListener('click', () => setupPuzzle(16));
    document.getElementById('reset').addEventListener('click', resetPuzzle);
    solveButton.addEventListener('click', solvePuzzle);

    loadCompletedLevels();
    updateButtonStates();
    
    // Ensure the Easy level puzzle is set up on page load
    setupPuzzle(currentLevel);  // This will render the Easy level puzzle
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
    mediumButton.disabled = !completedLevels.has(10);
    hardButton.disabled = !completedLevels.has(12);
    
    // Hide lock icons if levels are unlocked
    document.querySelector('.lock-icon.medium').style.display = mediumButton.disabled ? 'inline-block' : 'none';
    document.querySelector('.lock-icon.hard').style.display = hardButton.disabled ? 'inline-block' : 'none';
}

function setupPuzzle(level) {
    currentLevel = level;
    createPuzzle(currentLevel);
}

function createPuzzle(level) {
    puzzleContainer.innerHTML = '';

    // Set up grid layout based on the level
    const gridSize = level === 10 ? 10 : (level === 12 ? 12 : 16);
    puzzleContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    puzzleContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    const totalPieces = gridSize * gridSize;  // Total pieces for the grid
    const imageSrc = levelImages[level];

    for (let i = 0; i < totalPieces; i++) {
        const puzzlePiece = document.createElement('div');
        puzzlePiece.classList.add('puzzle-piece');

        puzzlePiece.style.width = "100%";
        puzzlePiece.style.height = "100%";
        puzzlePiece.style.backgroundImage = `url(${imageSrc})`;
        puzzlePiece.style.backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
        puzzlePiece.style.backgroundPosition = `${(i % gridSize) * 100 / (gridSize - 1)}% ${Math.floor(i / gridSize) * 100 / (gridSize - 1)}%`;

        puzzlePiece.dataset.correctPosition = i;

        // Use different event listeners for mobile and desktop
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            // Mobile touch events
            puzzlePiece.addEventListener('touchstart', handlePieceSelection);
        } else {
            // Desktop drag events
            puzzlePiece.setAttribute('draggable', true);
            puzzlePiece.addEventListener('dragstart', dragStart);
            puzzlePiece.addEventListener('dragover', dragOver);
            puzzlePiece.addEventListener('drop', drop);
        }

        puzzleContainer.appendChild(puzzlePiece);
    }

    scramblePieces();
    startTimer();
    savePuzzleState();
}

function scramblePieces() {
    const pieces = Array.from(puzzleContainer.children);
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        puzzleContainer.appendChild(pieces[j]);
    }
}

// Desktop drag-and-drop handlers
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
    checkPuzzleCompletion();
}

// Mobile touch interaction handlers
let selectedPieces = [];

function handlePieceSelection(e) {
    e.preventDefault(); // Prevent default touch behaviors
    const selectedPiece = e.target;

    if (selectedPieces.length === 0) {
        // First piece selection
        selectedPiece.classList.add('selected');
        selectedPieces.push(selectedPiece);
    } else if (selectedPieces.length === 1) {
        // Second piece selection
        if (selectedPiece !== selectedPieces[0]) {
            selectedPieces.push(selectedPiece);
            swapPieces(selectedPieces[0], selectedPieces[1]);
            checkPuzzleCompletion();
            
            // Reset selections
            selectedPieces.forEach(piece => piece.classList.remove('selected'));
            selectedPieces = [];
        } else {
            // Deselect if tapping the same piece
            selectedPiece.classList.remove('selected');
            selectedPieces = [];
        }
    }
}

function swapPieces(piece1, piece2) {
    const tempBackground = piece1.style.backgroundPosition;
    piece1.style.backgroundPosition = piece2.style.backgroundPosition;
    piece2.style.backgroundPosition = tempBackground;
    savePuzzleState();
}

function checkPuzzleCompletion() {
    const pieces = [...puzzleContainer.children];
    let solved = true;

    pieces.forEach((piece, index) => {
        const correctPositionX = (index % currentLevel) * 100 / (currentLevel - 1);
        const correctPositionY = Math.floor(index / currentLevel) * 100 / (currentLevel - 1);
        
        const [pieceX, pieceY] = window.getComputedStyle(piece).backgroundPosition.split(' ').map(val => parseFloat(val));
        
        if (Math.abs(pieceX - correctPositionX) > 0.1 || Math.abs(pieceY - correctPositionY) > 0.1) {
            solved = false;
        }
    });

    if (solved) {
        displayModal();
        completedLevels.add(currentLevel);
        saveCompletedLevels();
        updateButtonStates();
    }
}

function displayModal() {
    clearInterval(intervalId);

    const modal = document.getElementById('congrats-modal');
    const closeButton = document.querySelector('.close-button');
    const nextLevelButton = document.getElementById('next-level');
    const modalMessage = document.getElementById('modal-message');

    modalMessage.textContent = `You've solved the ${getLevelName(currentLevel)} puzzle! The next level has been unlocked.`;

    modal.style.display = 'flex';

    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    nextLevelButton.onclick = () => {
        modal.style.display = 'none';
        if (currentLevel === 10) {
            setupPuzzle(12); // Move to medium
        } else if (currentLevel === 12) {
            setupPuzzle(16); // Move to hard
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
        case 10: return "Easy";
        case 12: return "Medium";
        case 16: return "Hard";
        default: return "Unknown";
    }
}

function savePuzzleState() {
    const pieces = [...puzzleContainer.children].map(piece => window.getComputedStyle(piece).backgroundPosition);
    puzzleState = { level: currentLevel, pieces };
    localStorage.setItem('puzzleState', JSON.stringify(puzzleState));
}

function loadPuzzle(pieces) {
    const puzzlePieces = document.querySelectorAll('.puzzle-piece');
    puzzlePieces.forEach((piece, index) => {
        piece.style.backgroundPosition = pieces[index];
    });
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
    localStorage.removeItem('puzzleState');
    setupPuzzle(currentLevel);
}

function solvePuzzle() {
    const pieces = Array.from(puzzleContainer.children);
    pieces.sort((a, b) => a.dataset.correctPosition - b.dataset.correctPosition);
    pieces.forEach(piece => puzzleContainer.appendChild(piece));
    checkPuzzleCompletion();
}