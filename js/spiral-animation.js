// Spiral Animation
class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    static random(min, max) {
        return min + Math.random() * (max - min);
    }
}

class Vector3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class AnimationController {
    constructor(canvas, ctx, width, height) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.size = Math.max(width, height);
        this.time = 0;
        this.stars = [];
        
        // Constants
        this.changeEventTime = 0.32;
        this.cameraZ = -400;
        this.cameraTravelDistance = 3400;
        this.startDotYOffset = 28;
        this.viewZoom = 100;
        this.numberOfStars = 3000;
        this.trailLength = 60;
        
        this.createStars();
    }
    
    createStars() {
        for (let i = 0; i < this.numberOfStars; i++) {
            this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance));
        }
    }
    
    ease(p, g) {
        if (p < 0.5) 
            return 0.5 * Math.pow(2 * p, g);
        else
            return 1 - 0.5 * Math.pow(2 * (1 - p), g);
    }
    
    easeOutElastic(x) {
        const c4 = (2 * Math.PI) / 4.5;
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1;
    }
    
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    }
    
    constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
    
    spiralPath(p) {
        p = this.constrain(1.2 * p, 0, 1);
        p = this.ease(p, 1.8);
        const numberOfSpiralTurns = 6;
        const theta = 2 * Math.PI * numberOfSpiralTurns * Math.sqrt(p);
        const r = 170 * Math.sqrt(p);
        
        return new Vector2D(
            r * Math.cos(theta),
            r * Math.sin(theta) + this.startDotYOffset
        );
    }
    
    rotate(v1, v2, p, orientation) {
        const middle = new Vector2D(
            (v1.x + v2.x) / 2,
            (v1.y + v2.y) / 2
        );
        
        const dx = v1.x - middle.x;
        const dy = v1.y - middle.y;
        const angle = Math.atan2(dy, dx);
        const o = orientation ? -1 : 1;
        const r = Math.sqrt(dx * dx + dy * dy);
        
        const bounce = Math.sin(p * Math.PI) * 0.05 * (1 - p);
        
        return new Vector2D(
            middle.x + r * (1 + bounce) * Math.cos(angle + o * Math.PI * this.easeOutElastic(p)),
            middle.y + r * (1 + bounce) * Math.sin(angle + o * Math.PI * this.easeOutElastic(p))
        );
    }
    
    showProjectedDot(position, sizeFactor) {
        const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1);
        const newCameraZ = this.cameraZ + this.ease(Math.pow(t2, 1.2), 1.8) * this.cameraTravelDistance;
        
        if (position.z > newCameraZ) {
            const dotDepthFromCamera = position.z - newCameraZ;
            
            const x = this.viewZoom * position.x / dotDepthFromCamera;
            const y = this.viewZoom * position.y / dotDepthFromCamera;
            const sw = 400 * sizeFactor / dotDepthFromCamera;
            
            this.ctx.lineWidth = sw;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawStartDot() {
        if (this.time > this.changeEventTime) {
            const dy = this.cameraZ * this.startDotYOffset / this.viewZoom;
            const position = new Vector3D(0, dy, this.cameraTravelDistance);
            this.showProjectedDot(position, 2.5);
        }
    }
    
    drawTrail(t1) {
        for (let i = 0; i < this.trailLength; i++) {
            const f = this.map(i, 0, this.trailLength, 1.1, 0.1);
            const sw = (1.3 * (1 - t1) + 3.0 * Math.sin(Math.PI * t1)) * f;
            
            this.ctx.fillStyle = '#d4a373';
            this.ctx.lineWidth = sw;
            
            const pathTime = t1 - 0.00015 * i;
            const position = this.spiralPath(pathTime);
            
            const basePos = position;
            const offset = new Vector2D(position.x + 5, position.y + 5);
            const rotated = this.rotate(
                basePos, 
                offset, 
                Math.sin(this.time * Math.PI * 2) * 0.5 + 0.5, 
                i % 2 === 0
            );
            
            this.ctx.beginPath();
            this.ctx.arc(rotated.x, rotated.y, sw / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        
        ctx.fillStyle = '#0a0c0f';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        
        const t1 = this.constrain(this.map(this.time, 0, this.changeEventTime + 0.25, 0, 1), 0, 1);
        const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1);
        
        ctx.rotate(-Math.PI * this.ease(t2, 2.7));
        
        this.drawTrail(t1);
        
        ctx.fillStyle = '#d4a373';
        for (const star of this.stars) {
            star.render(t1, this);
        }
        
        this.drawStartDot();
        
        ctx.restore();
        
        // Update time
        this.time += 0.01;
        if (this.time > 1) this.time = 0;
    }
}

class Star {
    constructor(cameraZ, cameraTravelDistance) {
        this.angle = Math.random() * Math.PI * 2;
        this.distance = 30 * Math.random() + 15;
        this.rotationDirection = Math.random() > 0.5 ? 1 : -1;
        this.expansionRate = 1.2 + Math.random() * 0.8;
        this.finalScale = 0.7 + Math.random() * 0.6;
        
        this.dx = this.distance * Math.cos(this.angle);
        this.dy = this.distance * Math.sin(this.angle);
        
        this.spiralLocation = (1 - Math.pow(1 - Math.random(), 3.0)) / 1.3;
        this.z = Vector2D.random(0.5 * cameraZ, cameraTravelDistance + cameraZ);
        
        const lerp = (start, end, t) => start * (1 - t) + end * t;
        this.z = lerp(this.z, cameraTravelDistance / 2, 0.3 * this.spiralLocation);
        this.strokeWeightFactor = Math.pow(Math.random(), 2.0);
    }
    
    render(p, controller) {
        const spiralPos = controller.spiralPath(this.spiralLocation);
        const q = p - this.spiralLocation;
        
        if (q > 0) {
            const displacementProgress = controller.constrain(4 * q, 0, 1);
            
            const linearEasing = displacementProgress;
            const elasticEasing = controller.easeOutElastic(displacementProgress);
            const powerEasing = Math.pow(displacementProgress, 2);
            
            let easing;
            if (displacementProgress < 0.3) {
                easing = controller.lerp(linearEasing, powerEasing, displacementProgress / 0.3);
            } else if (displacementProgress < 0.7) {
                const t = (displacementProgress - 0.3) / 0.4;
                easing = controller.lerp(powerEasing, elasticEasing, t);
            } else {
                easing = elasticEasing;
            }
            
            let screenX, screenY;
            
            if (displacementProgress < 0.3) {
                screenX = controller.lerp(spiralPos.x, spiralPos.x + this.dx * 0.3, easing / 0.3);
                screenY = controller.lerp(spiralPos.y, spiralPos.y + this.dy * 0.3, easing / 0.3);
            } else if (displacementProgress < 0.7) {
                const midProgress = (displacementProgress - 0.3) / 0.4;
                const curveStrength = Math.sin(midProgress * Math.PI) * this.rotationDirection * 1.5;
                
                const baseX = spiralPos.x + this.dx * 0.3;
                const baseY = spiralPos.y + this.dy * 0.3;
                
                const targetX = spiralPos.x + this.dx * 0.7;
                const targetY = spiralPos.y + this.dy * 0.7;
                
                const perpX = -this.dy * 0.4 * curveStrength;
                const perpY = this.dx * 0.4 * curveStrength;
                
                screenX = controller.lerp(baseX, targetX, midProgress) + perpX * midProgress;
                screenY = controller.lerp(baseY, targetY, midProgress) + perpY * midProgress;
            } else {
                const finalProgress = (displacementProgress - 0.7) / 0.3;
                
                const baseX = spiralPos.x + this.dx * 0.7;
                const baseY = spiralPos.y + this.dy * 0.7;
                
                const targetDistance = this.distance * this.expansionRate * 1.5;
                const spiralTurns = 1.2 * this.rotationDirection;
                const spiralAngle = this.angle + spiralTurns * finalProgress * Math.PI;
                
                const targetX = spiralPos.x + targetDistance * Math.cos(spiralAngle);
                const targetY = spiralPos.y + targetDistance * Math.sin(spiralAngle);
                
                screenX = controller.lerp(baseX, targetX, finalProgress);
                screenY = controller.lerp(baseY, targetY, finalProgress);
            }
            
            const vx = (this.z - controller.cameraZ) * screenX / controller.viewZoom;
            const vy = (this.z - controller.cameraZ) * screenY / controller.viewZoom;
            
            const position = new Vector3D(vx, vy, this.z);
            
            let sizeMultiplier = 1.0;
            if (displacementProgress < 0.6) {
                sizeMultiplier = 1.0 + displacementProgress * 0.2;
            } else {
                const t = (displacementProgress - 0.6) / 0.4;
                sizeMultiplier = 1.2 * (1.0 - t) + this.finalScale * t;
            }
            
            const dotSize = 8.5 * this.strokeWeightFactor * sizeMultiplier;
            
            controller.showProjectedDot(position, dotSize);
        }
    }
}

// ინიციალიზაცია
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('spiral-canvas');
    const spiralContainer = document.getElementById('spiral-container');
    const mainShop = document.getElementById('main-shop');
    const enterButton = document.getElementById('enter-button');
    const enterShopBtn = document.getElementById('enter-shop');
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationController;
    let animationFrame;
    
    // სესიის შემოწმება - უკვე ნანახი აქვს თუ არა ანიმაცია
    const hasSeenAnimation = sessionStorage.getItem('hasSeenAnimation');
    
    if (hasSeenAnimation === 'true') {
        // პირდაპირ მაღაზიის ჩვენება
        spiralContainer.classList.add('hidden');
        mainShop.classList.remove('hidden');
        return;
    }
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        if (animationController) {
            animationController.width = window.innerWidth;
            animationController.height = window.innerHeight;
            animationController.size = Math.max(window.innerWidth, window.innerHeight);
        }
    }
    
    function animate() {
        if (animationController) {
            animationController.render();
            animationFrame = requestAnimationFrame(animate);
        }
    }
    
    // ანიმაციის დაწყება
    resizeCanvas();
    animationController = new AnimationController(canvas, ctx, window.innerWidth, window.innerHeight);
    animate();
    
    window.addEventListener('resize', resizeCanvas);
    
    // 2 წამის შემდეგ გამოჩნდეს Enter ღილაკი
    setTimeout(() => {
        enterButton.classList.remove('hidden');
    }, 2000);
    
    // Enter ღილაკზე დაჭერის ფუნქცია
    function enterShop() {
        spiralContainer.classList.add('fade-out');
        
        setTimeout(() => {
            spiralContainer.classList.add('hidden');
            mainShop.classList.remove('hidden');
            sessionStorage.setItem('hasSeenAnimation', 'true');
            
            // მაღაზიის ინიციალიზაცია
            if (typeof initShop === 'function') {
                initShop();
            }
        }, 1000);
    }
    
    enterShopBtn.addEventListener('click', enterShop);
    
    // Enter ღილაკზე დაჭერა კლავიატურით
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !enterButton.classList.contains('hidden')) {
            enterShop();
        }
    });
    
    // Cleanup
    return () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    };
});