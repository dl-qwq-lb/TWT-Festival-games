const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0; // 初始得分
let timeLeft = 60; // 60秒

// 游戏状态变量（框子）
const basketWidth = 100; 
const basketHeight = 60; 

// 框子属性
const originalBasketSpeed = 0.01; // 移动速度系数（0~1，值越大移动越快）
let targetBasketX = (canvas.width - basketWidth) / 2; // 目标位置
let basketX = targetBasketX; // 当前实际位置

const basketImage = new Image();
basketImage.src = "assets/images/basket.png";

// 游戏状态变量（时间同步）
let lastTime = 0;   // 上一次更新的时间戳
let accumulatedTime = 0;    // 累积时间差

// 游戏状态变量(秒表)
let gameStartTime = 0;  // 游戏开始的时间戳
let lastwatchTime = 0;   // 上次生成特殊单位的时间
let watchSpawned = 0;    // 已生成的秒表数量

// 游戏状态变量（加速）
let lastcakeTime = 0;   // 上次生成特殊单位的时间
let cakeSpawned = 0;    // 已生成的海棠酥数量
let isSpeedBoostActive = false; // 是否处于加速状态
let speedBoostEndTime = 0;  // 加速结束时间
let basketSpeed = originalBasketSpeed; // 保存原始速度

// 游戏状态变量（暂停）
let isPaused = false; // 是否暂停
let savedGameState = null; // 保存游戏状态
let unitSpawnInterval = null; // 单位生成定时器
let animationFrameId = null; // 用于存储 requestAnimationFrame 的 ID

// 游戏状态变量（生成机制）
let initialSpawnInterval = 1000; // 初始生成间隔（1秒）
let normalSpawnInterval = 500; // 正常生成间隔（0.5秒）
let isInitialPhase = true; // 是否处于初始阶段（前10秒）
let bombSpawnChance = 0; // 炸弹生成概率（初始为0）

let units = []; // 存储所有单位

// 单位类型和得分规则
const unitTypes = [
    { type: "petal", image: "assets/images/petal.png", speed: 1.5, score: 2, effect:""},
    { type: "flower", image: "assets/images/flower.png", speed: 2.5, score: 5, effect:""},
    { type: "bomb", image: "assets/images/bomb.png", speed: 3, score: -10, effect: ""},
    { type: "cake", image: "assets/images/cake.png", speed: 3.5, score: 3, effect: "speed", },
    { type: "watch", image: "assets/images/watch.png", speed: 3.5, score: 0, effect: "time", },
];

// 绘制框子
function drawBasket() {
    if (basketImage.complete) {
        // 加载完成，绘制图片
        ctx.drawImage(
            basketImage,
            basketX,
            canvas.height - basketHeight,
            basketWidth,
            basketHeight
        );
    } else {
        // 加载不成功的纯色替代方案
        ctx.fillStyle = "brown";
        ctx.fillRect(basketX, canvas.height - basketHeight, basketWidth, basketHeight);
    }
}

// 海棠酥——提升移速
function activateSpeedBoost() {
    isSpeedBoostActive = true;
    basketSpeed = originalBasketSpeed * 25; // 移速翻25倍
    speedBoostEndTime = Date.now() + 5000; // 加速持续5秒
}

function createUnit() {
    // 计算游戏已进行的时间
    const currentGameTime = (Date.now() - gameStartTime) / 1000;
    
    // 生成条件：游戏开始时间；生成数量上限；生成间隔至少10秒
    const watchsituation =
        currentGameTime >= 30 && watchSpawned < 3 && 
        (currentGameTime - lastwatchTime) >= 10;  

    const cakesituation =
        currentGameTime >= 15 && cakeSpawned < 6 && // 未达到生成上限
        (currentGameTime - lastcakeTime) >= 7; // 生成间隔至少5秒

    // 动态调整生成间隔
    if (isInitialPhase && currentGameTime >= 10) {
        isInitialPhase = false; // 结束初始阶段
        clearInterval(unitSpawnInterval); // 清除旧定时器
        unitSpawnInterval = setInterval(createUnit, normalSpawnInterval); // 设置新定时器
    }

    // 动态调整炸弹生成概率
    if (currentGameTime >= 15 && currentGameTime < 30) {
        bombSpawnChance = 0.25; // 15-30秒生成概率为1/4
    } else if (currentGameTime >= 30) {
        bombSpawnChance = 1 / 3; // 30秒后生成概率为1/3
    }

    if (watchsituation && Math.random() < 0.1) {
        const unitType = unitTypes.find(u => u.type === "watch");
        const x = Math.random() * (canvas.width - 50);
        const y = 0;
        const unit = {
            type: unitType.type,
            image: new Image(),
            x: x,
            y: y,
            speed: unitType.speed,
            effect: unitType.effect,
            loaded: false,
        };
        unit.image.onload = () => (unit.loaded = true);
        unit.image.src = unitType.image;
        units.push(unit);
        watchSpawned++;
        lastwatchTime = currentGameTime;
        return; // 不在此次生成中再尝试生成其他单位
    }

    if (cakesituation && Math.random() < 0.1) {
        const unitType = unitTypes.find(u => u.type === "cake");
        const x = Math.random() * (canvas.width - 50);
        const y = 0;
        const unit = {
            type: unitType.type,
            image: new Image(),
            x: x,
            y: y,
            speed: unitType.speed,
            effect: unitType.effect,
            loaded: false,
        };
        unit.image.onload = () => (unit.loaded = true);
        unit.image.src = unitType.image;
        units.push(unit);
        cakeSpawned++;
        lastcakeTime = currentGameTime;
        return; // 不在此次生成中再尝试生成其他单位
    }

    // 生成炸弹的逻辑
    if (currentGameTime >= 15 && Math.random() < bombSpawnChance) {
        const unitType = unitTypes.find(u => u.type === "bomb");
        const x = Math.random() * (canvas.width - 50);
        const y = 0;
        const unit = {
            type: unitType.type,
            image: new Image(),
            x: x,
            y: y,
            speed: unitType.speed,
            score: unitType.score,
            loaded: false,
        };
        unit.image.onload = () => (unit.loaded = true);
        unit.image.src = unitType.image;
        units.push(unit);
        return; // 生成炸弹后不再生成其他单位
    }

    // 生成普通单位
    const unitType = unitTypes[Math.floor(Math.random() * (unitTypes.length - 3))];
    const x = Math.random() * (canvas.width - 50);
    const y = 0;
    const unit = {
        type: unitType.type,
        image: new Image(),
        x: x,
        y: y,
        speed: unitType.speed,
        score: unitType.score,
        loaded: false,
    };
    unit.image.onload = () => (unit.loaded = true);
    unit.image.src = unitType.image;
    units.push(unit);
}

// 更新单位状态
function updateUnits() {
    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        if (!unit.loaded) continue;        

        console.log(`Unit type: ${unit.type}, Speed: ${unit.speed}`); // 打印单位类型和速度

        unit.y += unit.speed; // 下落（更新Y）

        // 检测是否被框子接住
        if (
            unit.y + 50 >= canvas.height - basketHeight &&
            unit.x + 50 >= basketX &&
            unit.x <= basketX + basketWidth
        ) {
            if (unit.effect === "time") {
                timeLeft += 5; // 延长5秒
                updateTimer();
            } 
            else if(unit.effect === "speed") {
                score += 3;
                activateSpeedBoost();                
            }

            else {
                score += unit.score;
            }
            units.splice(i, 1);
        }

        // 如果单位超出屏幕，移除它
        if (unit.y > canvas.height) {
            units.splice(i, 1);
        }
    }
}

// 绘制单位
function drawUnits() {
    units.forEach(unit => {
        ctx.drawImage(unit.image, unit.x, unit.y, 50, 50); // 绘制单位
    });
}

// 更新得分
function updateScore() {
    document.getElementById("score").textContent = `得分: ${score}`;
}

// 更新时间
function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("timer").textContent = `时间: ${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 暂停
function pauseGame() {
    isPaused = true;
    clearInterval(unitSpawnInterval); // 清除定时器
    document.getElementById("pauseMenu").style.display = "block"; // 显示暂停菜单
    
    // 停止 requestAnimationFrame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // 保存游戏状态
    savedGameState = {
        score: score,
        timeLeft: timeLeft,
        basketX: basketX,
        units: units.map(unit => ({
            type: unit.type,
            x: unit.x,
            y: unit.y,
            speed: unit.speed,
            effect: unit.effect,
            score: unit.score,
        })), // 仅保存必要属性
        isSpeedBoostActive,
        speedBoostEndTime,
        gameStartTime,
        lastwatchTime,
        watchSpawned,
        lastcakeTime,
        cakeSpawned,
        accumulatedTime, // 保存累积时间
        pauseTime: Date.now(), // 新增：记录暂停时的系统时间
    };

    // 重置 deltaTime
    lastTime = 0;
}

function resumeGame() {
    try {
        if (savedGameState) {
            // 恢复单位图片和其他状态...
            units = savedGameState.units.map(unit => {
                const newUnit = {
                    ...unit,
                    image: new Image(),
                    loaded: false,
                };
                newUnit.image.src = unitTypes.find(u => u.type === unit.type).image;
                newUnit.image.onload = () => (newUnit.loaded = true);
                return newUnit;
            });

            // 恢复其他状态
            score = savedGameState.score;
            timeLeft = savedGameState.timeLeft;
            basketX = savedGameState.basketX;
            isSpeedBoostActive = savedGameState.isSpeedBoostActive;
            speedBoostEndTime = savedGameState.speedBoostEndTime;
            gameStartTime = savedGameState.gameStartTime;
            lastwatchTime = savedGameState.lastwatchTime;
            watchSpawned = savedGameState.watchSpawned;
            lastcakeTime = savedGameState.lastcakeTime;
            cakeSpawned = savedGameState.cakeSpawned;
            accumulatedTime = savedGameState.accumulatedTime;

            // 补偿暂停期间的时间偏移
            const pauseDuration = Date.now() - savedGameState.pauseTime;

            // 更新 accumulatedTime 来反映暂停期间的时间流逝
            accumulatedTime += pauseDuration;
        }

        // 重新启动定时器和游戏循环
        unitSpawnInterval = setInterval(createUnit, normalSpawnInterval);
        isPaused = false;
        document.getElementById("pauseMenu").style.display = "none";
        animationFrameId = requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Error in resumeGame:", error);
    }
}

function quitGame() {
    alert("游戏已退出！");
    window.location.reload(); // 刷新页面重新开始
}

// 游戏循环
function gameLoop(timestamp) {
    if (isPaused) return;

    if (!lastTime) lastTime = timestamp;

    // 计算时间差（毫秒）
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulatedTime += deltaTime;

    // 每累积1000毫秒（1秒）更新一次时间
    if (accumulatedTime >= 1000) {
        timeLeft--;
        accumulatedTime -= 1000; // 重置累积时间
        updateTimer(); // 更新计时器显示
    }

    if (isSpeedBoostActive && Date.now() >= speedBoostEndTime) {
        isSpeedBoostActive = false;
        basketSpeed = originalBasketSpeed; // 恢复原始速度
    }

    // 更新框子位置
    const dx = targetBasketX - basketX;
    basketX += dx * basketSpeed; // 根据速度系数移动

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateUnits();
    drawUnits();
    drawBasket();
    updateScore();

    if (timeLeft <= 0) {
        alert(`游戏结束！得分: ${score}`);
        return;
    }

    animationFrameId = requestAnimationFrame(gameLoop); // 继续调用 gameLoop
}

// 控制框子移动
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    // 计算目标位置（限制在画布范围内）
    targetBasketX = Math.max(0, Math.min(mouseX - basketWidth / 2, canvas.width - basketWidth));
});

 // 页面不可见时自动暂停
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pauseGame();
    }
});

// 绑定按钮事件
document.getElementById("pauseButton").addEventListener("click", pauseGame);
document.getElementById("resumeButton").addEventListener("click", resumeGame);
document.getElementById("quitButton").addEventListener("click", quitGame);


function startGame() {
    gameStartTime = Date.now();
    isInitialPhase = true; // 初始阶段
    bombSpawnChance = 0; // 初始炸弹生成概率
    unitSpawnInterval = setInterval(createUnit, initialSpawnInterval); // 启动单位生成
    requestAnimationFrame(gameLoop);
}

// 初始化游戏
startGame();
