const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const startButtonContainer = document.getElementById('startButtonContainer');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreSpan = document.getElementById('finalScore');

// 効果音のロード
const hitSound = new Audio('./sounds/パッ.mp3');
const gameOverSound = new Audio('./sounds/試合終了のゴング.mp3');

// 画像ファイルのパス
const topRowImagePaths = ['images/toprow/10.png', 'images/toprow/11.png', 'images/toprow/12.png', 'images/toprow/13.png'];
const middleRowImagePaths = ['images/middlerow/6.png', 'images/middlerow/7.png', 'images/middlerow/8.png', 'images/middlerow/9.png'];
const bottomRowImagePaths = ['images/bottomrow/2.png', 'images/bottomrow/3.png', 'images/bottomrow/4.png', 'images/bottomrow/5.png'];

// 読み込んだImageオブジェクトを保存する配列
const topRowImages = [];
const middleRowImages = [];
const bottomRowImages = [];

const targets = []; // 的を格納する配列
let score = 0; // スコア
let bullets = 3; // 持ち弾数
let gameRunning = false; // ゲームが実行中かどうか
let timeLeft = 60; // 残り時間（秒）
let gameInterval; // ゲームループのインターバルID
let animationFrameId; // requestAnimationFrame のID

// 画像を事前に読み込む関数
function preloadImages(callback) {
    let loadedImages = 0;
    const allImagePaths = [...topRowImagePaths, ...middleRowImagePaths, ...bottomRowImagePaths];
    const totalImages = allImagePaths.length;

    allImagePaths.forEach(path => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            loadedImages++;
            // パスに応じて適切な配列に格納
            if (topRowImagePaths.includes(path)) {
                topRowImages.push(img);
            } else if (middleRowImagePaths.includes(path)) {
                middleRowImages.push(img);
            } else if (bottomRowImagePaths.includes(path)) {
                bottomRowImages.push(img);
            }

            if (loadedImages === totalImages) {
                callback();
            }
        };
        img.onerror = () => {
            console.error(`画像の読み込みに失敗しました: ${path}`);
            loadedImages++;
             if (loadedImages === totalImages) {
                callback();
            }
        }
    });
}


// 的のクラス
class Target {
    constructor(x, y, radius, image, dx, scoreValue) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.image = image; // 色の代わりに画像を使用
        this.dx = dx; // 横方向の移動速度
        this.scoreValue = scoreValue; // 的を撃った時のスコア
        this.hit = false; // 的が当たったかどうか
    }

    draw() {
        if (!this.hit && this.image) {
            // 画像を描画
            ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        }
    }

    update() {
        if (!this.hit) {
            this.x += this.dx;

            // 左右の壁に当たったら跳ね返る
            if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
                this.dx *= -1;
            }
        }
    }
}

// ゲームの初期設定（ゲーム開始前）
function initGame() {
    score = 0;
    bullets = 3; // 弾数を初期化
    timeLeft = 60;
    gameRunning = false;

    // UIの表示/非表示
    startButtonContainer.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    canvas.style.display = 'block'; // Canvasは常に表示しておく

    // 的を初期化
    targets.length = 0;
    createTargets();

    drawGame(); // 初期画面を描画
}

// 的を生成する関数
function createTargets() {
    // 上の列 (小さい的) - 一番速い
    const smallRadius = 30; // 画像に合わせて調整
    const smallY = 150;
    const smallScore = 300;
    const smallSpeed = 4;
    const topImage1 = topRowImages[Math.floor(Math.random() * topRowImages.length)];
    const topImage2 = topRowImages[Math.floor(Math.random() * topRowImages.length)];
    targets.push(new Target(150, smallY, smallRadius, topImage1, smallSpeed, smallScore));
    targets.push(new Target(450, smallY, smallRadius, topImage2, -smallSpeed, smallScore));

    // 中の列 (中くらいの的) - 普通
    const mediumRadius = 50; // 画像に合わせて調整
    const mediumY = 300;
    const mediumScore = 200;
    const mediumSpeed = 2.5;
    const middleImage1 = middleRowImages[Math.floor(Math.random() * middleRowImages.length)];
    const middleImage2 = middleRowImages[Math.floor(Math.random() * middleRowImages.length)];
    targets.push(new Target(150, mediumY, mediumRadius, middleImage1, mediumSpeed, mediumScore));
    targets.push(new Target(450, mediumY, mediumRadius, middleImage2, -mediumSpeed, mediumScore));

    // 下の列 (大きい的) - ゆっくり
    const largeRadius = 80; // 画像に合わせて調整
    const largeY = 450;
    const largeScore = 100;
    const largeSpeed = 1.5;
    const bottomImage1 = bottomRowImages[Math.floor(Math.random() * bottomRowImages.length)];
    const bottomImage2 = bottomRowImages[Math.floor(Math.random() * bottomRowImages.length)];
    targets.push(new Target(150, largeY, largeRadius, bottomImage1, largeSpeed, largeScore));
    targets.push(new Target(450, largeY, largeRadius, bottomImage2, -largeSpeed, largeScore));
}

// 新しい的を生成する関数
function spawnTarget() {
    const row = Math.floor(Math.random() * 3); // 0:small, 1:medium, 2:large
    let radius, y, scoreValue, speed, image;

    switch (row) {
        case 0: // Small targets (top row)
            radius = 30;
            y = 150;
            scoreValue = 300;
            speed = 4;
            image = topRowImages[Math.floor(Math.random() * topRowImages.length)];
            break;
        case 1: // Medium targets (middle row)
            radius = 50;
            y = 300;
            scoreValue = 200;
            speed = 2.5;
            image = middleRowImages[Math.floor(Math.random() * middleRowImages.length)];
            break;
        case 2: // Large targets (bottom row)
            radius = 80;
            y = 450;
            scoreValue = 100;
            speed = 1.5;
            image = bottomRowImages[Math.floor(Math.random() * bottomRowImages.length)];
            break;
    }

    // ランダムなX座標と方向
    const x = Math.random() * (canvas.width - radius * 2) + radius;
    const dx = (Math.random() < 0.5 ? 1 : -1) * speed;

    targets.push(new Target(x, y, radius, image, dx, scoreValue));
}

// ゲーム開始
function startGame() {
    score = 0;
    bullets = 3; // 弾数を初期化
    timeLeft = 60;
    gameRunning = true;

    // UIの表示/非表示
    startButtonContainer.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // 的をリセット（新しく作成し直す）
    targets.length = 0; // 既存の的をクリア
    createTargets();

    drawGame(); // ゲーム開始時の最初のフレームを描画

    // ゲームループを開始
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    // アニメーションループを開始
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

// ゲーム画面全体を描画する関数
function drawGame() {
    // Canvasをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 的を描画
    targets.forEach(target => {
        target.draw();
    });

    // スコア表示
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`スコア: ${score}`, 10, 30);

    // 残り弾数表示
    ctx.fillText(`弾数: ${bullets}`, 10, 60);

    // 残り時間表示
    ctx.fillText(`残り時間: ${timeLeft}秒`, canvas.width - 200, 30);
}

// ゲームループ
function gameLoop() {
    if (gameRunning) {
        targets.forEach(target => {
            target.update(); // 的の位置を更新
        });
        drawGame(); // ゲーム画面を描画
        animationFrameId = requestAnimationFrame(gameLoop); // 次のフレームを要求
    }
}

// 弾が当たったかどうかの判定
function checkCollision(bulletX, bulletY) {
    targets.forEach(target => {
        if (!target.hit) {
            const distance = Math.sqrt(Math.pow(bulletX - target.x, 2) + Math.pow(bulletY - target.y, 2));
            if (distance < target.radius) {
                target.hit = true;
                score += target.scoreValue; // 的のスコアを加算
                hitSound.play(); // 的が当たった時の効果音
                spawnTarget(); // 新しい的を生成
            }
        }
    });
}

// ゲーム終了処理
function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId);

    // ゲームオーバー画面を表示
    gameOverScreen.classList.remove('hidden');
    finalScoreSpan.textContent = score;
    gameOverSound.play(); // ゲームオーバー時の効果音
}

// イベントリスナー
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

canvas.addEventListener('mousedown', (event) => {
    if (!gameRunning) return; // ゲームが実行中でなければ何もしない

    if (bullets <= 0) {
        return; // 弾がなければ射撃できない
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 衝突判定
    let hit = false;
    // 配列を逆順にループして、手前の的から判定する
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        if (!target.hit) {
            const distance = Math.sqrt(Math.pow(mouseX - target.x, 2) + Math.pow(mouseY - target.y, 2));
            if (distance < target.radius) {
                target.hit = true;
                score += target.scoreValue;
                hitSound.play();
                
                // 0.5秒後に新しい的を生成
                setTimeout(spawnTarget, 500);

                hit = true;
                break; // 一つの弾で一つの的しか撃てないようにする
            }
        }
    }

    if (!hit) {
        bullets--; // 的に外れたら弾を減らす
        if (bullets <= 0) {
            endGame(); // 弾が0になったらゲームオーバー
        }
    }
    drawGame(); // 弾数表示などを更新するため再描画
});

// 初期化処理
function initialize() {
    // ボタンを無効化し、ローディングメッセージを表示
    startButton.disabled = true;
    startButton.textContent = '画像を読み込み中...';

    preloadImages(() => {
        console.log('すべての画像の読み込みが完了しました。');
        // ボタンを有効化し、テキストを戻す
        startButton.disabled = false;
        startButton.textContent = 'ゲームスタート！';
        initGame();
    });
}

initialize();