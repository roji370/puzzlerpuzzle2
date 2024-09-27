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
    const gridSize = level === 10 ? 5 : (level === 12 ? 7 : 9); // 5x5 for Easy, 7x7 for Medium, and 9x9 for Hard
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

        puzzlePiece.setAttribute('draggable', true);
        puzzlePiece.dataset.correctPosition = i;

        // Event listeners for drag-and-drop
        puzzlePiece.addEventListener('dragstart', dragStart);
        puzzlePiece.addEventListener('dragover', dragOver);
        puzzlePiece.addEventListener('drop', drop);
        puzzlePiece.addEventListener('touchstart', touchStart);
        puzzlePiece.addEventListener('touchmove', touchMove);
        puzzlePiece.addEventListener('touchend', touchEnd);

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

let draggedPiece;

// Drag-and-drop event handlers for desktop
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

// Mobile touch event handlers
let startX, startY, targetPiece;

function touchStart(e) {
    const touch = e.touches[0];
    draggedPiece = e.target;
    startX = touch.clientX;
    startY = touch.clientY;
    e.preventDefault(); // Prevent default touch behaviors
}

function touchMove(e) {
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    draggedPiece.style.transform = `translate(${deltaX}px, ${deltaY}px)`; // Move the piece
}

function touchEnd(e) {
    draggedPiece.style.transform = ''; // Reset position after touch ends
    const touch = e.changedTouches[0];
    targetPiece = document.elementFromPoint(touch.clientX, touch.clientY); // Identify the drop target
    
    // Fallback to bounding rectangle overlap check if targetPiece is invalid or undefined
    if (!targetPiece || !targetPiece.classList.contains('puzzle-piece')) {
        const allPieces = document.querySelectorAll('.puzzle-piece');
        allPieces.forEach(piece => {
            const pieceRect = piece.getBoundingClientRect();
            const touchX = touch.clientX;
            const touchY = touch.clientY;

            if (
                touchX >= pieceRect.left &&
                touchX <= pieceRect.right &&
                touchY >= pieceRect.top &&
                touchY <= pieceRect.bottom &&
                piece !== draggedPiece
            ) {
                targetPiece = piece;
            }
        });
    }

    // Ensure targetPiece is valid and perform the swap
    if (targetPiece && targetPiece !== draggedPiece && targetPiece.classList.contains('puzzle-piece')) {
        swapPieces(draggedPiece, targetPiece);
        checkPuzzleCompletion();
    } else {
        // If no valid targetPiece, reset the dragged piece to its original position
        draggedPiece.style.transform = 'none';
    }
}

function swapPieces(draggedPiece, targetPiece) {
    const draggedStyle = window.getComputedStyle(draggedPiece).backgroundPosition;
    const targetStyle = window.getComputedStyle(targetPiece).backgroundPosition;

    // Swap background positions
    draggedPiece.style.backgroundPosition = targetStyle;
    targetPiece.style.backgroundPosition = draggedStyle;

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
    
        if (currentLevel === 10 && !completedLevels.has(12)) {
            completedLevels.add(12); // Unlock Medium level
            setupPuzzle(12); // Move to Medium level
        } else if (currentLevel === 12 && !completedLevels.has(16)) {
            completedLevels.add(16); // Unlock Hard level
            setupPuzzle(16); // Move to Hard level
        } else {
            modal.style.display = 'none'; // Close modal if no more levels
        }
    
        saveCompletedLevels(); // Save the newly completed levels
        updateButtonStates(); // Update button states after unlocking
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

// Adding an event listener for the submit button
document.getElementById('submit').addEventListener('click', checkPuzzleArrangement);

function checkPuzzleArrangement() {
    const pieces = [...puzzleContainer.children];
    let isCorrect = true;

    pieces.forEach((piece, index) => {
        // Calculate correct positions based on grid size
        const correctPositionX = (index % (currentLevel === 10 ? 5 : currentLevel === 12 ? 7 : 9)) * 100 / ((currentLevel === 10 ? 5 : currentLevel === 12 ? 7 : 9) - 1);
        const correctPositionY = Math.floor(index / (currentLevel === 10 ? 5 : currentLevel === 12 ? 7 : 9)) * 100 / ((currentLevel === 10 ? 5 : currentLevel === 12 ? 7 : 9) - 1);
        
        const [pieceX, pieceY] = window.getComputedStyle(piece).backgroundPosition.split(' ').map(val => parseFloat(val));
        
        // Check if the piece is in the correct position with a small margin of error
        if (Math.abs(pieceX - correctPositionX) > 0.1 || Math.abs(pieceY - correctPositionY) > 0.1) {
            isCorrect = false;
        }
    });

    if (isCorrect) {
        // Display the modal for success
        const modal = document.getElementById('congrats-modal');
        const modalMessage = document.getElementById('modal-message');
        modalMessage.textContent = `Congratulations! You've solved the ${getLevelName(currentLevel)} puzzle!`;
        modal.style.display = 'flex';
    } else {
        // Display the failure message in a simple alert
        alert("The puzzle is not arranged correctly. Please try again.");
    }
}


