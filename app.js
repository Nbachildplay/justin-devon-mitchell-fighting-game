"use strict";

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameRunning = true;
let gameStartTime = Date.now();
let trialTimeLeft = 300; // 5 minutes in seconds
let isPaidUser = false;
let gameAccessLevel = 100;

// Game state
let score = {
    skulls: 0,
    coins: 0,
    level: 1,
    health: 100
};

// Character types with different appearances
const characterTypes = {
    default: { color: '#4CAF50', size: 20 },
    warrior: { color: '#FF5722', size: 22 },
    mage: { color: '#9C27B0', size: 18 },
    ninja: { color: '#212121', size: 19 }
};

let currentCharacter = 'default';

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = characterTypes[currentCharacter].size;
        this.speed = 5;
        this.color = characterTypes[currentCharacter].color;
    }

    draw() {
        // Draw player with current character style
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add character-specific details
        if (currentCharacter === 'warrior') {
            // Draw sword
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x + this.radius + 15, this.y - 10);
            ctx.stroke();
        } else if (currentCharacter === 'mage') {
            // Draw staff
            ctx.strokeStyle = '#8E24AA';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x, this.y - this.radius - 20);
            ctx.stroke();
            // Staff orb
            ctx.fillStyle = '#E1BEE7';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.radius - 20, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (currentCharacter === 'ninja') {
            // Draw ninja mask
            ctx.fillStyle = '#424242';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 5, this.radius - 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 5, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    move(dx, dy) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        // Boundary checks
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    fire(targetX, targetY) {
        return new Fireball(this.x, this.y, targetX, targetY);
    }

    takeDamage(amount) {
        score.health -= amount;
        if (score.health <= 0) {
            score.health = 0;
            gameOver();
        }
    }
}

// Fireball class
class Fireball {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * 10;
        this.dy = Math.sin(angle) * 10;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) {
            this.trail.shift();
        }
        
        this.x += this.dx;
        this.y += this.dy;
    }

    draw() {
        // Draw trail
        this.trail.forEach((point, index) => {
            const alpha = (index + 1) / this.trail.length;
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
        
        // Draw main fireball
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FF6B35');
        gradient.addColorStop(1, '#FF0000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add sparkle effect
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.speed = 1 + Math.random() * 2;
        this.health = 2;
        this.maxHealth = 2;
        this.angle = Math.random() * Math.PI * 2;
        this.type = Math.random() > 0.7 ? 'boss' : 'normal';
        
        if (this.type === 'boss') {
            this.radius = 25;
            this.health = 5;
            this.maxHealth = 5;
            this.speed *= 0.7;
        }
    }

    update() {
        // Move towards player with some randomness
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Check collision with player
        const playerDistance = Math.hypot(this.x - player.x, this.y - player.y);
        if (playerDistance < this.radius + player.radius) {
            player.takeDamage(this.type === 'boss' ? 20 : 10);
            // Push enemy away after collision
            const pushX = (this.x - player.x) / playerDistance * 30;
            const pushY = (this.y - player.y) / playerDistance * 30;
            this.x += pushX;
            this.y += pushY;
        }
    }

    draw() {
        // Draw enemy
        ctx.fillStyle = this.type === 'boss' ? '#8E24AA' : '#F44336';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        const barWidth = this.radius * 2;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 10, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillRect(this.x - barWidth/2, this.y - this.radius - 10, barWidth * healthPercent, barHeight);
        
        // Draw eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 5, this.y - 3, 1, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 3, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    takeDamage() {
        this.health--;
        return this.health <= 0;
    }
}

// Coin class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.angle = 0;
        this.collected = false;
    }

    update() {
        this.angle += 0.1;
        
        // Check collision with player
        const distance = Math.hypot(this.x - player.x, this.y - player.y);
        if (distance < this.radius + player.radius && !this.collected) {
            this.collected = true;
            score.coins++;
            
            // Heal player slightly
            score.health = Math.min(100, score.health + 5);
        }
    }

    draw() {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw coin
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.7, '#FFA000');
        gradient.addColorStop(1, '#FF8F00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw coin symbol
        ctx.fillStyle = '#FF8F00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
        
        ctx.restore();
    }
}

// Game arrays
const fireballs = [];
const enemies = [];
const coins = [];

// Create player
const player = new Player(canvas.width / 2, canvas.height / 2);

// Input handling
const keys = {};
let mousePos = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Space bar for attack
    if (e.key === ' ' && gameRunning) {
        e.preventDefault();
        fireballs.push(player.fire(mousePos.x, mousePos.y));
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse handling
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    if (!gameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    fireballs.push(player.fire(targetX, targetY));
});

// Monetization functions
function updateTrialTimer() {
    if (isPaidUser) return;
    
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    trialTimeLeft = Math.max(0, 300 - elapsed);
    
    const minutes = Math.floor(trialTimeLeft / 60);
    const seconds = trialTimeLeft % 60;
    document.getElementById('timeLeft').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (trialTimeLeft <= 0) {
        gameRunning = false;
        showPaymentModal();
    }
}

function updateAccessControl() {
    const slider = document.getElementById('gameAccess');
    const value = document.getElementById('accessValue');
    
    gameAccessLevel = parseInt(slider.value);
    value.textContent = gameAccessLevel + '%';
    
    // Reduce game performance based on access level
    if (gameAccessLevel < 100) {
        canvas.style.filter = `brightness(${gameAccessLevel}%)`;
    } else {
        canvas.style.filter = 'brightness(100%)';
    }
}

function showPaymentModal() {
    document.getElementById('paymentModal').style.display = 'flex';
}

function hidePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function processPayment(method) {
    // Simulate payment processing
    alert(`Payment processing via ${method}...\nContact: 769-341-8531 for payment completion.`);
    isPaidUser = true;
    hidePaymentModal();
    gameRunning = true;
    document.getElementById('monetizationPanel').style.display = 'none';
    updateGame();
}

// Character selection
function selectCharacter(type) {
    currentCharacter = type;
    player.radius = characterTypes[type].size;
    player.color = characterTypes[type].color;
    
    // Update button states
    document.querySelectorAll('.characterBtn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-character="${type}"]`).classList.add('active');
}

// Game functions
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: // Top
            x = Math.random() * canvas.width;
            y = -20;
            break;
        case 1: // Right
            x = canvas.width + 20;
            y = Math.random() * canvas.height;
            break;
        case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 20;
            break;
        case 3: // Left
            x = -20;
            y = Math.random() * canvas.height;
            break;
    }
    
    enemies.push(new Enemy(x, y));
}

function spawnCoin() {
    const x = Math.random() * (canvas.width - 40) + 20;
    const y = Math.random() * (canvas.height - 40) + 20;
    coins.push(new Coin(x, y));
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score.skulls * 10 + score.coins * 5;
    document.getElementById('gameOverlay').style.display = 'flex';
    
    // Stop audio
    const audio = document.getElementById('gameAudio');
    audio.pause();
}

function resetGame() {
    score = { skulls: 0, coins: 0, level: 1, health: 100 };
    fireballs.length = 0;
    enemies.length = 0;
    coins.length = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    gameRunning = true;
    gameStartTime = Date.now();
    trialTimeLeft = 300;
    
    document.getElementById('gameOverlay').style.display = 'none';
    
    // Start audio
    const audio = document.getElementById('gameAudio');
    audio.play().catch(e => console.log('Audio autoplay prevented'));
    
    updateGame();
}

// Main game loop
function updateGame() {
    if (!gameRunning) return;
    
    try {
        // Update trial timer
        updateTrialTimer();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background elements
        drawBackground();
        
        // Player movement
        let dx = 0, dy = 0;
        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;
        
        if (dx !== 0 || dy !== 0) {
            const length = Math.hypot(dx, dy);
            dx /= length;
            dy /= length;
            player.move(dx, dy);
        }
        
        // Update and draw player
        player.draw();
        
        // Update fireballs
        fireballs.forEach((fireball, index) => {
            fireball.update();
            fireball.draw();
            
            // Remove if out of bounds
            if (fireball.x < -50 || fireball.x > canvas.width + 50 ||
                fireball.y < -50 || fireball.y > canvas.height + 50) {
                fireballs.splice(index, 1);
            }
        });
        
        // Spawn enemies
        if (Math.random() < 0.02 + score.level * 0.005) {
            spawnEnemy();
        }
        
        // Spawn coins
        if (Math.random() < 0.01) {
            spawnCoin();
        }
        
        // Update enemies
        enemies.forEach((enemy, enemyIndex) => {
            enemy.update();
            enemy.draw();
            
            // Check fireball collisions
            fireballs.forEach((fireball, fireIndex) => {
                const dist = Math.hypot(fireball.x - enemy.x, fireball.y - enemy.y);
                if (dist < fireball.radius + enemy.radius) {
                    fireballs.splice(fireIndex, 1);
                    
                    if (enemy.takeDamage()) {
                        enemies.splice(enemyIndex, 1);
                        score.skulls++;
                        
                        // Chance to drop coin
                        if (Math.random() < 0.3) {
                            coins.push(new Coin(enemy.x, enemy.y));
                        }
                    }
                }
            });
        });
        
        // Update coins
        coins.forEach((coin, index) => {
            coin.update();
            coin.draw();
            
            if (coin.collected) {
                coins.splice(index, 1);
            }
        });
        
        // Level progression
        if (score.skulls > 0 && score.skulls % 10 === 0 && score.skulls / 10 > score.level - 1) {
            score.level++;
        }
        
        // Update UI
        updateUI();
        
        // Continue game loop
        requestAnimationFrame(updateGame);
        
    } catch (error) {
        console.error('Game error:', error);
        gameOver();
    }
}

function drawBackground() {
    // Draw water waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const y = canvas.height - 100 + i * 20;
        const time = Date.now() * 0.001;
        
        for (let x = 0; x <= canvas.width; x += 10) {
            const waveY = y + Math.sin((x * 0.01) + time + i) * 10;
            if (x === 0) {
                ctx.moveTo(x, waveY);
            } else {
                ctx.lineTo(x, waveY);
            }
        }
        ctx.stroke();
    }
}

function updateUI() {
    document.getElementById('skulls').textContent = `💀 Skulls: ${score.skulls}`;
    document.getElementById('coins').textContent = `🪙 Coins: ${score.coins}`;
    document.getElementById('level').textContent = `⚡ Level: ${score.level}`;
    document.getElementById('health').textContent = `❤️ Health: ${score.health}`;
}

// Event listeners
document.getElementById('upgradeBtn').addEventListener('click', showPaymentModal);
document.getElementById('upgradeNow').addEventListener('click', showPaymentModal);
document.getElementById('closePayment').addEventListener('click', hidePaymentModal);
document.getElementById('cashAppPay').addEventListener('click', () => processPayment('Cash App'));
document.getElementById('paypalPay').addEventListener('click', () => processPayment('PayPal'));
document.getElementById('playAgain').addEventListener('click', resetGame);

document.getElementById('gameAccess').addEventListener('input', updateAccessControl);

// Character selection
document.querySelectorAll('.characterBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectCharacter(btn.dataset.character);
    });
});

// Initialize game
function initGame() {
    canvas.width = 800;
    canvas.height = 500;
    
    // Start audio
    const audio = document.getElementById('gameAudio');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio autoplay prevented'));
    
    // Set default character
    selectCharacter('default');
    
    updateGame();
}

// Start game when page loads
window.addEventListener('load', initGame);

// Prevent context menu on canvas
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
