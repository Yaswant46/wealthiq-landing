class StockGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Game configuration
        this.gameConfig = {
            jumpForce: -6.5,
            baseGravity: 0.3,
            newsSpeed: 2,
            positiveGravityEffect: 0.15,
            negativeGravityEffect: 0.45,
            effectDuration: 120,
            baseSpeed: 2.5,
            maxSpeed: 5,
            newsInterval: 90  // Reduced from 180 to 90 for more frequent news
        };

        // News events
        this.newsEvents = {
            negative: [
                { text: "+5% Inflation", desc: "Market uncertainty" },
                { text: "+4% Unemployment", desc: "Weak labor market" },
                { text: "+6% Interest Rates", desc: "Higher borrowing costs" },
                { text: "+3% GDP Contraction", desc: "Economic slowdown" },
                { text: "+7% Oil Prices", desc: "Higher costs for businesses" },
                { text: "+10% Corporate Layoffs", desc: "Weak job market" },
                { text: "+8% Trade Deficit", desc: "Weak exports" },
                { text: "+6% Debt-to-GDP Ratio", desc: "Rising government debt" },
                { text: "+5% Consumer Debt", desc: "People struggling financially" },
                { text: "+4% Housing Market Crash", desc: "Property market downturn" }
            ],
            positive: [
                { text: "-6% Inflation", desc: "Easing cost pressures" },
                { text: "-4% Unemployment", desc: "More jobs created" },
                { text: "-5% Interest Rates", desc: "Cheaper borrowing for businesses" },
                { text: "-3% Corporate Taxes", desc: "More profits for companies" },
                { text: "-4% Energy Prices", desc: "Lower costs for industries" },
                { text: "-7% Federal Debt", desc: "Government in control" },
                { text: "-6% Budget Deficit", desc: "Strong fiscal policy" },
                { text: "-3% Mortgage Rates", desc: "Better housing affordability" },
                { text: "-5% Trade Surplus", desc: "Strong exports" },
                { text: "-4% Consumer Confidence Index", desc: "More spending" }
            ]
        };

        // Initialize game state
        this.reset();
        
        // Start game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    spawnNews() {
        // Find the highest point of the market line in the visible area
        let maxMarketY = this.canvas.height * 0.6; // Default max height
        let minMarketY = this.canvas.height * 0.4; // Default min height
        
        for (const point of this.marketLine) {
            if (point.x > 0 && point.x < this.canvas.width) {
                maxMarketY = Math.min(maxMarketY, point.y);
                minMarketY = Math.min(minMarketY, point.y);
            }
        }

        // Ensure alternating positive/negative news
        const positiveCount = this.news.filter(n => n.type === 'positive').length;
        const negativeCount = this.news.filter(n => n.type === 'negative').length;
        
        // Force positive if we have more negative, and vice versa
        let isPositive = positiveCount < negativeCount;
        if (positiveCount === negativeCount) {
            isPositive = Math.random() < 0.5;
        }
        
        const newsArray = isPositive ? this.newsEvents.positive : this.newsEvents.negative;
        const newsItem = newsArray[Math.floor(Math.random() * newsArray.length)];
        
        // Calculate safe zone for news placement
        const minY = 50; // Minimum distance from top
        const maxY = minMarketY - 30; // Stay above the highest point of market line
        const availableHeight = maxY - minY;
        
        // Distribute news across the available height
        const y = minY + (Math.random() * availableHeight);
        
        const news = {
            x: this.canvas.width,
            y: y,
            text: newsItem.text,
            desc: newsItem.desc,
            type: isPositive ? 'positive' : 'negative',
            width: Math.min(200, this.ctx.measureText(newsItem.text).width + 20)
        };
        
        this.news.push(news);
    }

    setupCanvas() {
        // Make canvas fill its container
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Reinitialize trader size and position after resize
        if (this.trader) {
            this.trader.size = Math.min(this.canvas.width, this.canvas.height) * 0.05;
            this.trader.x = this.canvas.width * 0.2;
            this.trader.y = this.canvas.height * 0.3;
        }
        
        // Regenerate market line after resize
        this.generateInitialMarketLine();
    }

    reset() {
        // Clear any existing state
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Initialize game objects
        this.news = [];
        this.marketLine = [];
        this.collectedNews = {
            positive: [],
            negative: []
        };
        
        // Initialize game state
        this.score = 0;
        this.gameTime = 0;
        this.countdown = 5;
        this.gameStarted = false;
        this.gameOver = false;
        this.gameSpeed = this.gameConfig.baseSpeed;
        this.lastNewsTime = -this.gameConfig.newsInterval; // Start news immediately
        
        // Initialize trader
        this.trader = {
            x: this.canvas.width * 0.2,
            y: this.canvas.height * 0.3,
            velocity: 0,
            size: Math.min(this.canvas.width, this.canvas.height) * 0.05,
            baseGravity: this.gameConfig.baseGravity,
            currentGravity: this.gameConfig.baseGravity,
            gravityTimer: 0,
            stopLoss: 3
        };

        // Setup game
        this.setupCanvas();
        this.generateInitialMarketLine();
        this.bindEvents();
        this.startCountdown();
    }

    generateInitialMarketLine() {
        this.marketLine = [];
        const numPoints = Math.ceil(this.canvas.width / 10) + 1;
        const midY = this.canvas.height * 0.6; // Start line lower
        const amplitude = this.canvas.height * 0.1; // Smaller amplitude for smoother line

        // Generate initial points with a slight upward trend
        for (let i = 0; i < numPoints; i++) {
            const x = i * 10;
            const progress = i / numPoints;
            const trendOffset = -progress * amplitude * 2; // Gradual upward trend
            const randomOffset = (Math.random() - 0.5) * amplitude;
            const y = midY + trendOffset + randomOffset;
            this.marketLine.push({ x, y });
        }
    }

    startCountdown() {
        // Spawn first news during countdown
        setTimeout(() => {
            if (!this.gameOver) {
                this.spawnNews();
            }
        }, 1000);

        this.countdownInterval = setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.gameStarted = true;
                // Spawn another news when game starts
                this.spawnNews();
            }
        }, 1000);
    }

    gameLoop() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameStarted && !this.gameOver) {
            this.update();
        }
        
        // Draw game elements
        this.drawMarketLine();
        this.drawNews();
        this.drawTrader();
        this.drawGameState();
        
        if (!this.gameStarted) {
            this.drawCountdown();
        } else if (this.gameOver) {
            this.showGameOver();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    drawMarketLine() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        
        this.marketLine.forEach((point, i) => {
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        
        this.ctx.stroke();
    }

    drawTrader() {
        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath();
        this.ctx.arc(
            this.trader.x,
            this.trader.y,
            this.trader.size / 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.restore();
    }

    drawNews() {
        this.ctx.save();
        this.ctx.font = '14px Space Grotesk';
        
        for (const news of this.news) {
            // Use neutral colors during gameplay
            this.ctx.fillStyle = '#2C3E50';  // Dark blue-grey
            
            // Draw news box with padding
            const padding = 10;
            const boxWidth = Math.min(200, this.ctx.measureText(news.text).width + padding * 2);
            const boxHeight = 30;
            
            this.ctx.fillRect(
                news.x - boxWidth/2,
                news.y - boxHeight/2,
                boxWidth,
                boxHeight
            );
            
            // Draw text in white
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Truncate text if needed
            let displayText = news.text;
            while (this.ctx.measureText(displayText).width > boxWidth - padding * 2) {
                displayText = displayText.slice(0, -1);
            }
            
            this.ctx.fillText(
                displayText,
                news.x,
                news.y
            );
        }
        this.ctx.restore();
    }

    drawGameState() {
        // Draw current market sentiment
        this.ctx.save();
        this.ctx.font = '16px "Space Grotesk"';
        this.ctx.textAlign = 'left';
        
        const sentiment = this.trader.currentGravity < this.trader.baseGravity ? 'BULLISH ' : 
                         this.trader.currentGravity > this.trader.baseGravity ? 'BEARISH ' : 'NEUTRAL ';
        
        this.ctx.fillStyle = this.trader.currentGravity < this.trader.baseGravity ? '#4CAF50' : 
                            this.trader.currentGravity > this.trader.baseGravity ? '#F44336' : '#ffffff';
        
        this.ctx.fillText(`Market: ${sentiment}`, 10, 30);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`Score: ${this.score}`, 10, 60);
        this.ctx.fillText(`Stop Loss: ${this.trader.stopLoss}`, 10, 90);
        
        this.ctx.restore();
    }

    showGameOver() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over text
        const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.08;
        this.ctx.font = `${fontSize}px Space Grotesk`;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Game Over!',
            this.canvas.width / 2,
            fontSize * 2
        );

        // News Summary
        const summaryFontSize = fontSize * 0.4;
        this.ctx.font = `${summaryFontSize}px Space Grotesk`;
        
        // Positive News
        let yPos = fontSize * 3;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillText(
            'Positive News',
            this.canvas.width / 4,
            yPos
        );
        
        yPos += summaryFontSize;
        this.ctx.font = `${summaryFontSize * 0.8}px Space Grotesk`;
        this.collectedNews.positive.forEach((news, i) => {
            if (i < 5) {  // Show only top 5 news
                this.ctx.fillText(
                    news.text,
                    this.canvas.width / 4,
                    yPos + (summaryFontSize * 1.2 * i)
                );
            }
        });

        // Negative News
        yPos = fontSize * 3;
        this.ctx.fillStyle = '#f44336';
        this.ctx.font = `${summaryFontSize}px Space Grotesk`;
        this.ctx.fillText(
            'Negative News',
            (this.canvas.width / 4) * 3,
            yPos
        );
        
        yPos += summaryFontSize;
        this.ctx.font = `${summaryFontSize * 0.8}px Space Grotesk`;
        this.collectedNews.negative.forEach((news, i) => {
            if (i < 5) {  // Show only top 5 news
                this.ctx.fillText(
                    news.text,
                    (this.canvas.width / 4) * 3,
                    yPos + (summaryFontSize * 1.2 * i)
                );
            }
        });

        // Buttons
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 20;
        const totalButtonsWidth = (buttonWidth * 2) + buttonSpacing;
        let startX = (this.canvas.width - totalButtonsWidth) / 2;
        const buttonY = this.canvas.height - buttonHeight - fontSize;

        // Share Button (Primary)
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(startX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.font = `${fontSize * 0.4}px Space Grotesk`;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Share',
            startX + buttonWidth / 2,
            buttonY + buttonHeight / 2 + fontSize * 0.15
        );

        // Play Again Button (Secondary)
        startX += buttonWidth + buttonSpacing;
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(startX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(
            'Play Again',
            startX + buttonWidth / 2,
            buttonY + buttonHeight / 2 + fontSize * 0.15
        );

        this.ctx.restore();

        // Store button positions for click handling
        this.gameOverButtons = {
            share: {
                x: (this.canvas.width - totalButtonsWidth) / 2,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            },
            playAgain: {
                x: (this.canvas.width - totalButtonsWidth) / 2 + buttonWidth + buttonSpacing,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            }
        };
    }

    handleGameOverClick(x, y) {
        if (!this.gameOverButtons) return;

        const shareBtn = this.gameOverButtons.share;
        const playAgainBtn = this.gameOverButtons.playAgain;

        if (x >= shareBtn.x && x <= shareBtn.x + shareBtn.width &&
            y >= shareBtn.y && y <= shareBtn.y + shareBtn.height) {
            // Share button clicked
            this.shareScore();
        } else if (x >= playAgainBtn.x && x <= playAgainBtn.x + playAgainBtn.width &&
                   y >= playAgainBtn.y && y <= playAgainBtn.y + playAgainBtn.height) {
            // Play Again button clicked
            this.reset();
        }
    }

    async shareScore() {
        // Create a blob from the canvas data
        const blob = await new Promise(resolve => this.canvas.toBlob(resolve));
        const file = new File([blob], 'wealthiq-score.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'WealthIQ Stock Market Game Score',
                    text: 'Try out the new app - WealthIQ: https://starfish-app-mvjjp.ondigitalocean.app/'
                });
            } catch (err) {
                console.error('Share failed:', err);
                // Fallback to download
                this.downloadScreenshot(file);
            }
        } else {
            // Fallback to download
            this.downloadScreenshot(file);
        }
    }

    downloadScreenshot(file) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = 'wealthiq-score.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    bindEvents() {
        const jumpHandler = (e) => {
            if (e.type === 'keydown' && e.code !== 'Space') return;
            if (e.type === 'keydown') e.preventDefault(); // Prevent page scroll
            
            if (this.gameOver) {
                this.handleGameOverClick(e.clientX, e.clientY);
            } else if (this.gameStarted) {
                this.jump();
            }
        };

        // Remove any existing listeners
        window.removeEventListener('keydown', jumpHandler);
        this.canvas.removeEventListener('click', jumpHandler);
        this.canvas.removeEventListener('touchstart', jumpHandler);

        // Add fresh listeners
        window.addEventListener('keydown', jumpHandler);
        this.canvas.addEventListener('click', jumpHandler);
        this.canvas.addEventListener('touchstart', jumpHandler);

        // Add scroll wheel handler for game over screen
        this.canvas.addEventListener('wheel', (e) => {
            if (this.gameOver) {
                e.preventDefault();
                this.scrollOffset = Math.max(0, this.scrollOffset + e.deltaY * 0.5);
                this.draw(); // Redraw to update scroll position
            }
        });
    }

    jump() {
        if (!this.gameStarted || this.gameOver) return;
        this.trader.velocity = this.gameConfig.jumpForce;
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;

        // Update game time and score
        this.gameTime++;
        this.score = Math.floor(this.gameTime / 60);

        // Spawn new news periodically
        if (this.gameTime - this.lastNewsTime >= this.gameConfig.newsInterval) {
            this.spawnNews();
            this.lastNewsTime = this.gameTime;
        }

        // Update trader position and velocity
        this.trader.velocity += this.trader.currentGravity;
        this.trader.y += this.trader.velocity;

        // Update gravity effect timer
        if (this.trader.gravityTimer > 0) {
            this.trader.gravityTimer--;
            if (this.trader.gravityTimer === 0) {
                this.trader.currentGravity = this.trader.baseGravity;
            }
        }

        // Move market line and news
        for (let i = 0; i < this.marketLine.length; i++) {
            this.marketLine[i].x -= this.gameSpeed;
        }

        // Update and check news collisions with larger collision area
        for (let i = this.news.length - 1; i >= 0; i--) {
            this.news[i].x -= this.gameSpeed;
            
            // Check for news collection with a larger collision box
            const collisionSize = this.trader.size * 1.5; // Increased collision area
            const dx = Math.abs(this.news[i].x - this.trader.x);
            const dy = Math.abs(this.news[i].y - this.trader.y);
            
            if (dx < collisionSize && dy < collisionSize) {
                // Apply gravity effect
                if (this.news[i].type === 'positive') {
                    this.trader.currentGravity = this.trader.baseGravity - this.gameConfig.positiveGravityEffect;
                    this.collectedNews.positive.push(this.news[i]);
                } else {
                    this.trader.currentGravity = this.trader.baseGravity + this.gameConfig.negativeGravityEffect;
                    this.collectedNews.negative.push(this.news[i]);
                }
                this.trader.gravityTimer = this.gameConfig.effectDuration;
                this.news.splice(i, 1);
                continue;
            }

            // Remove off-screen news
            if (this.news[i].x + this.news[i].width < 0) {
                this.news.splice(i, 1);
            }
        }

        // Remove off-screen market line points and generate new ones
        while (this.marketLine.length > 0 && this.marketLine[0].x + 10 < 0) {
            this.marketLine.shift();
        }

        const midY = this.canvas.height * 0.5;
        const amplitude = this.canvas.height * 0.2;

        while (this.marketLine[this.marketLine.length - 1].x < this.canvas.width) {
            const lastPoint = this.marketLine[this.marketLine.length - 1];
            const newX = lastPoint.x + 10;
            // Keep the line within bounds
            const newY = Math.max(
                midY - amplitude,
                Math.min(
                    midY + amplitude,
                    lastPoint.y + (Math.random() - 0.5) * 20
                )
            );
            this.marketLine.push({ x: newX, y: newY });
        }

        // Check for collisions with market line
        const traderLeft = this.trader.x - this.trader.size / 2;
        const traderRight = this.trader.x + this.trader.size / 2;
        const traderTop = this.trader.y - this.trader.size / 2;
        const traderBottom = this.trader.y + this.trader.size / 2;

        for (let i = 0; i < this.marketLine.length - 1; i++) {
            const line = {
                x1: this.marketLine[i].x,
                y1: this.marketLine[i].y,
                x2: this.marketLine[i + 1].x,
                y2: this.marketLine[i + 1].y
            };

            if (this.lineIntersectsBox(line, traderLeft, traderTop, traderRight, traderBottom)) {
                this.trader.stopLoss--;
                if (this.trader.stopLoss <= 0) {
                    this.gameOver = true;
                } else {
                    // Reset position but continue game
                    this.trader.y = this.canvas.height * 0.3;
                    this.trader.velocity = 0;
                }
                break;
            }
        }

        // Check boundaries with bounce effect
        if (this.trader.y < this.trader.size) {
            this.trader.y = this.trader.size;
            this.trader.velocity = Math.abs(this.trader.velocity) * 0.5; // Soft bounce
        } else if (this.trader.y > this.canvas.height - this.trader.size) {
            this.trader.y = this.canvas.height - this.trader.size;
            this.trader.velocity = -Math.abs(this.trader.velocity) * 0.5; // Soft bounce
        }
    }

    lineIntersectsBox(line, left, top, right, bottom) {
        // Check if line intersects with box
        if (line.x1 > right || line.x2 < left) return false;
        if (line.y1 > bottom || line.y2 < top) return false;

        // Check if line intersects with box edges
        if (this.lineIntersectsLine(line, { x1: left, y1: top, x2: right, y2: top })) return true;
        if (this.lineIntersectsLine(line, { x1: left, y1: bottom, x2: right, y2: bottom })) return true;
        if (this.lineIntersectsLine(line, { x1: left, y1: top, x2: left, y2: bottom })) return true;
        if (this.lineIntersectsLine(line, { x1: right, y1: top, x2: right, y2: bottom })) return true;

        return false;
    }

    lineIntersectsLine(line1, line2) {
        // Calculate denominator
        const denominator = (line1.x1 - line1.x2) * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * (line2.x1 - line2.x2);

        // Check if lines are parallel
        if (denominator === 0) return false;

        // Calculate intersection point
        const t = ((line1.x1 - line2.x1) * (line2.y1 - line2.y2) - (line1.y1 - line2.y1) * (line2.x1 - line2.x2)) / denominator;
        const u = -((line1.x1 - line1.x2) * (line1.y1 - line2.y1) - (line1.y1 - line1.y2) * (line1.x1 - line2.x1)) / denominator;

        // Check if intersection point is within line segments
        return t > 0 && t < 1 && u > 0 && u < 1;
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw market line
        this.drawMarketLine();

        // Draw news items
        this.drawNews();

        // Draw trader
        this.drawTrader();

        // Draw UI
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${Math.max(16, this.canvas.width * 0.02)}px Space Grotesk`;
        this.ctx.fillText(
            `Score: ${this.score}`,
            20,
            30
        );
        this.ctx.fillText(
            `High Score: ${this.highScore}`,
            20,
            60
        );
        
        // Draw stop loss
        this.ctx.fillStyle = this.trader.stopLoss <= 3 ? '#ff0000' : '#ffffff';
        this.ctx.fillText(
            `Stop Loss: ${this.trader.stopLoss}/3`,
            20,
            90
        );

        // Draw current gravity effect
        if (this.trader.gravityTimer > 0) {
            const effect = this.trader.currentGravity < this.trader.baseGravity ? 'BULLISH' : 
                         this.trader.currentGravity > this.trader.baseGravity ? 'BEARISH' : 'NEUTRAL ';
            
            this.ctx.fillStyle = this.trader.currentGravity < this.trader.baseGravity ? '#00ff00' : 
                                this.trader.currentGravity > this.trader.baseGravity ? '#ff0000' : '#ffffff';
            
            this.ctx.fillText(
                `Market: ${effect}`,
                20,
                120
            );
        }
        
        // Draw stock symbol
        this.ctx.fillStyle = '#4F46E5';
        this.ctx.font = `${Math.max(20, this.canvas.width * 0.03)}px Space Grotesk`;
        this.ctx.fillText(
            this.currentSymbol,
            this.canvas.width - 100,
            30
        );

        this.drawGameState();

        if (!this.gameStarted && !this.gameOver) {
            // Draw countdown and instructions
            const fontSize = Math.max(24, this.canvas.width * 0.04);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${fontSize * 1.5}px Space Grotesk`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.countdown.toString(),
                this.canvas.width / 2,
                this.canvas.height / 2 - fontSize
            );

            // Instructions
            this.ctx.font = `${fontSize * 0.6}px Space Grotesk`;
            this.ctx.fillText(
                'Use SPACE or CLICK to make the trader jump',
                this.canvas.width / 2,
                this.canvas.height / 2 + fontSize
            );
            this.ctx.fillText(
                'Collect good news (green) and avoid bad news (red)',
                this.canvas.width / 2,
                this.canvas.height / 2 + fontSize * 2
            );
            this.ctx.fillText(
                'You have 3 stop losses before margin call!',
                this.canvas.width / 2,
                this.canvas.height / 2 + fontSize * 3
            );
            
            this.ctx.textAlign = 'left';
        }

        if (this.gameOver) {
            this.showGameOver();
        }
    }

    start() {
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    restart() {
        this.reset();
    }

    startCountdown() {
        // Spawn first news during countdown
        setTimeout(() => {
            if (!this.gameOver) {
                this.spawnNews();
            }
        }, 1000);

        this.countdownInterval = setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.gameStarted = true;
                // Spawn another news when game starts
                this.spawnNews();
            }
        }, 1000);
    }

    drawCountdown() {
        if (!this.gameStarted && !this.gameOver) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw countdown
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px "Space Grotesk"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.countdown.toString(),
                this.canvas.width / 2,
                this.canvas.height / 2
            );

            // Draw instructions
            this.ctx.font = '24px "Space Grotesk"';
            this.ctx.fillText(
                'Use SPACEBAR or CLICK to control the trader',
                this.canvas.width / 2,
                this.canvas.height / 2 + 50
            );
            this.ctx.fillText(
                'Collect good news (green) and avoid bad news (red)',
                this.canvas.width / 2,
                this.canvas.height / 2 + 90
            );
            
            this.ctx.restore();
        }
    }
}
